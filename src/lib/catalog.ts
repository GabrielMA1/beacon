/**
 * Model catalog for the site: loading and labels.
 *
 * Source of truth, decided once at build time:
 *
 * - PUBLIC_MODELS_API_URL unset → the bundled catalog
 *   (src/data/sample-catalog.json). It is treated as SAMPLE data, and every
 *   page that shows models or rates says so, unless the file explicitly sets
 *   "sample": false — a deliberate statement that its rates are confirmed.
 * - PUBLIC_MODELS_API_URL set → the live catalog. If it cannot be fetched or
 *   fails validation, the BUILD FAILS. We never substitute sample prices for
 *   a live catalog that was expected, and a failed build leaves the
 *   previous deployment online.
 */
import sample from '../data/sample-catalog.json';
import { parseCatalog, type Catalog, type FeatureId, type Tier } from './catalog-schema';

export * from './catalog-schema';

export const featureLabels: Record<FeatureId, string> = {
  tools: 'Tool calling',
  reasoning: 'Reasoning',
  vision: 'Image input',
  caching: 'Cached input pricing',
  json: 'Structured output',
};

export const tierLabels: Record<Tier, string> = {
  flagship: 'Most capable',
  balanced: 'Balanced',
  efficient: 'Fast, low cost',
};

const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 2_000_000;

let cached: Promise<Catalog> | undefined;

export function getCatalog(): Promise<Catalog> {
  cached ??= load();
  return cached;
}

async function load(): Promise<Catalog> {
  const url = (import.meta.env.PUBLIC_MODELS_API_URL ?? '').trim();
  if (!url) return fromSample();
  return fromLive(url);
}

function fromSample(): Catalog {
  const confirmed = (sample as { sample?: unknown }).sample === false;
  const { catalog, errors, warnings } = parseCatalog(sample, confirmed ? 'live' : 'sample');
  warnings.forEach((w) => console.warn(`[catalog] sample: ${w}`));
  if (errors.length) throw new Error(`[catalog] The bundled sample catalog is invalid:\n- ${errors.join('\n- ')}`);
  return catalog;
}

async function fromLive(url: string): Promise<Catalog> {
  const fail = (reason: string): never => {
    throw new Error(
      `[catalog] PUBLIC_MODELS_API_URL is set but the live catalog could not be used: ${reason}\n` +
        'The build stops here rather than publishing sample prices as if they were live. ' +
        'Fix the endpoint, or unset PUBLIC_MODELS_API_URL to build the clearly labelled sample catalog.',
    );
  };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return fail(`"${url}" is not a valid URL.`);
  }
  if (parsedUrl.protocol !== 'https:') fail('the URL must use https.');

  let body: unknown;
  try {
    const res = await fetch(parsedUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'error',
    });
    if (!res.ok) fail(`HTTP ${res.status} ${res.statusText}.`);
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('json')) fail(`expected JSON, got "${type || 'no content type'}".`);
    const text = await res.text();
    if (text.length > MAX_BYTES) fail(`response is larger than ${MAX_BYTES} bytes.`);
    body = JSON.parse(text);
  } catch (err) {
    if ((err as Error).message.startsWith('[catalog]')) throw err;
    return fail((err as Error).message);
  }

  const { catalog, errors, warnings } = parseCatalog(body, 'live');
  warnings.forEach((w) => console.warn(`[catalog] live: ${w}`));
  if (errors.length) fail(`validation failed:\n- ${errors.join('\n- ')}`);
  return catalog;
}
