/**
 * Model catalog: types, loading and formatting.
 *
 * The site is built from a catalog shaped like the planned `GET /api/models`
 * response. At build time we use the live endpoint when PUBLIC_MODELS_API_URL
 * is set and reachable, otherwise the bundled sample in src/data/models.json.
 * Every page and component reads models through `getCatalog()`, so swapping
 * the source never touches markup.
 */
import sample from '../data/models.json';

export type FeatureId = 'tools' | 'reasoning' | 'caching' | 'json' | 'vision';
export type Tier = 'flagship' | 'balanced' | 'efficient';

export interface Provider {
  id: string;
  name: string;
}

export interface ModelPricing {
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M cached input tokens, or null when the model has no cache pricing */
  cachedInput: number | null;
  /** USD per 1M output tokens */
  output: number;
}

export interface Model {
  id: string;
  name: string;
  provider: Provider;
  tier: Tier | null;
  summary: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  features: FeatureId[];
  pricing: ModelPricing;
}

export interface Catalog {
  currency: string;
  providers: Provider[];
  models: Model[];
  /** True when built from the bundled sample rather than the live API. */
  isSample: boolean;
}

export const featureLabels: Record<FeatureId, string> = {
  tools: 'Tool calling',
  reasoning: 'Reasoning',
  caching: 'Prompt caching',
  json: 'Structured output',
  vision: 'Image input',
};

export const tierLabels: Record<Tier, string> = {
  flagship: 'Most capable',
  balanced: 'Balanced',
  efficient: 'Fast, low cost',
};

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

type Raw = Record<string, any>;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Accepts the sample file or an API payload. Tolerates snake_case or
 * camelCase keys, `data` or `models` arrays, and providers given either as
 * ids (with a separate `providers` list) or as inline objects.
 */
export function normalizeCatalog(raw: Raw, isSample = false): Catalog {
  const list: Raw[] = raw.data ?? raw.models ?? [];
  const providerIndex = new Map<string, Provider>();

  for (const p of raw.providers ?? []) {
    if (p?.id) providerIndex.set(p.id, { id: String(p.id), name: String(p.name ?? p.id) });
  }

  const models: Model[] = [];
  for (const m of list) {
    if (!m?.id) continue;
    const p = m.provider ?? m.owned_by ?? 'other';
    const providerId = typeof p === 'string' ? p : String(p.id ?? p.name ?? 'other');
    let provider = providerIndex.get(providerId) ?? providerIndex.get(slug(providerId));
    if (!provider) {
      provider = { id: slug(providerId), name: typeof p === 'object' && p.name ? String(p.name) : providerId };
      providerIndex.set(provider.id, provider);
    }

    const pr = m.pricing ?? {};
    const input = num(pr.input ?? pr.prompt);
    const output = num(pr.output ?? pr.completion);
    if (input === null || output === null) continue; // never show a model without a rate

    const modalities: string[] = m.input_modalities ?? m.inputModalities ?? ['text'];
    const features = new Set<FeatureId>((m.features ?? []).filter((f: string) => f in featureLabels));
    if (modalities.includes('image')) features.add('vision');

    models.push({
      id: String(m.id),
      name: String(m.name ?? m.display_name ?? m.id),
      provider,
      tier: (['flagship', 'balanced', 'efficient'] as const).includes(m.tier) ? m.tier : null,
      summary: String(m.summary ?? m.description ?? ''),
      contextWindow: num(m.context_window ?? m.contextWindow),
      maxOutputTokens: num(m.max_output_tokens ?? m.maxOutputTokens),
      inputModalities: modalities,
      features: [...features],
      pricing: {
        input,
        output,
        cachedInput: num(pr.cached_input ?? pr.cachedInput ?? pr.cache_read),
      },
    });
  }

  // Keep provider order from the payload; drop providers with no models.
  const used = new Set(models.map((m) => m.provider.id));
  const providers = [...providerIndex.values()].filter((p) => used.has(p.id));
  const order = new Map(providers.map((p, i) => [p.id, i]));
  models.sort((a, b) => order.get(a.provider.id)! - order.get(b.provider.id)!);

  return { currency: String(raw.currency ?? 'USD'), providers, models, isSample };
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

let cached: Promise<Catalog> | undefined;

export function getCatalog(): Promise<Catalog> {
  cached ??= load();
  return cached;
}

async function load(): Promise<Catalog> {
  const url = import.meta.env.PUBLIC_MODELS_API_URL as string | undefined;
  if (url) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const catalog = normalizeCatalog(await res.json(), false);
      if (catalog.models.length === 0) throw new Error('empty catalog');
      return catalog;
    } catch (err) {
      console.warn(`[catalog] Could not load ${url} (${(err as Error).message}); using bundled sample data.`);
    }
  }
  return normalizeCatalog(sample as Raw, true);
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const needsThirdDecimal = (v: number) => Math.round(v * 1000) % 10 !== 0;

/** Price per 1M tokens, e.g. $2.00, $0.075 */
export function formatRate(value: number | null): string {
  if (value === null) return '—';
  return `$${value.toFixed(needsThirdDecimal(value) ? 3 : 2)}`;
}

/** Compact token count, e.g. 1M, 262K */
export function formatTokens(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function cheapestInput(models: Model[]): number {
  return Math.min(...models.map((m) => m.pricing.input));
}
