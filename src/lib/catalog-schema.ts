/**
 * Model catalog contract and validation.
 *
 * Pure functions only (no Astro, no network) so the rules can be unit-tested
 * and shared with any tooling that checks a catalog before publishing it.
 * The contract is documented in README.md under "Model catalog".
 */

export type FeatureId = 'tools' | 'reasoning' | 'caching' | 'json' | 'vision';
export type Tier = 'flagship' | 'balanced' | 'efficient';

export interface Provider {
  id: string;
  name: string;
}

export interface ModelPricing {
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M cached input tokens, or null when the model has no cached-input rate */
  cachedInput: number | null;
  /** USD per 1M output tokens */
  output: number;
}

export interface Model {
  /** Exactly the value customers pass as the `model` parameter */
  id: string;
  name: string;
  provider: Provider;
  tier: Tier | null;
  summary: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputModalities: string[];
  features: FeatureId[];
  /** Null when the model is listed but its rates are not published yet */
  pricing: ModelPricing | null;
}

export type CatalogSource = 'sample' | 'live';

export interface Catalog {
  source: CatalogSource;
  currency: 'USD';
  providers: Provider[];
  models: Model[];
}

export interface ParseResult {
  catalog: Catalog;
  /** Problems that make a model, or the whole catalog, unsafe to publish */
  errors: string[];
  /** Problems worth fixing that do not make the data wrong */
  warnings: string[];
}

export const FEATURES: FeatureId[] = ['tools', 'reasoning', 'vision', 'caching', 'json'];
const TIERS: Tier[] = ['flagship', 'balanced', 'efficient'];

/** Model ids: what an API accepts in `model`. Letters, digits and . _ - : / */
export const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._:/-]{0,127}$/i;
const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const DECIMAL_STRING = /^\d+(\.\d+)?$/;

/** The highest per-1M rate we accept as plausible. Anything above is a data error. */
export const MAX_RATE = 10_000;

const isObject = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);

function readRate(value: unknown): number | null | undefined {
  // undefined: missing. null: explicitly not offered. number: valid rate.
  if (value === undefined) return undefined;
  if (value === null) return null;
  const n = typeof value === 'string' && DECIMAL_STRING.test(value.trim()) ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= MAX_RATE ? n : NaN;
}

function readPositiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/**
 * Validate and normalise a catalog payload.
 *
 * Accepts `data` or `models` as the model array, snake_case or camelCase
 * keys, providers given by id (with a `providers` list) or inline as
 * `{ id, name }`, and rates as numbers or decimal strings.
 */
export function parseCatalog(raw: unknown, source: CatalogSource): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const empty: Catalog = { source, currency: 'USD', providers: [], models: [] };

  if (!isObject(raw)) return { catalog: empty, errors: ['Catalog is not a JSON object.'], warnings };

  const currency = raw.currency ?? 'USD';
  if (currency !== 'USD') errors.push(`Unsupported currency "${String(currency)}". The site displays USD only.`);

  const list = raw.data ?? raw.models;
  if (!Array.isArray(list)) return { catalog: empty, errors: [...errors, 'Catalog has no "data" array of models.'], warnings };

  const providers = new Map<string, Provider>();
  for (const p of Array.isArray(raw.providers) ? raw.providers : []) {
    const id = cleanText(p?.id, 64).toLowerCase();
    const name = cleanText(p?.name, 60);
    if (!PROVIDER_ID_PATTERN.test(id) || !name) {
      errors.push(`Invalid provider entry ${JSON.stringify(p)}.`);
      continue;
    }
    providers.set(id, { id, name });
  }

  const models: Model[] = [];
  const seen = new Set<string>();

  list.forEach((m: unknown, index: number) => {
    const where = `Model #${index + 1}`;
    if (!isObject(m)) {
      errors.push(`${where} is not an object.`);
      return;
    }

    const id = typeof m.id === 'string' ? m.id.trim() : '';
    const label = id ? `Model "${id}"` : where;
    if (!MODEL_ID_PATTERN.test(id)) {
      errors.push(`${label}: id must match ${MODEL_ID_PATTERN}.`);
      return;
    }
    if (seen.has(id)) {
      errors.push(`${label}: duplicate id.`);
      return;
    }
    seen.add(id);

    const name = cleanText(m.name ?? m.display_name, 80);
    if (!name) {
      errors.push(`${label}: missing name.`);
      return;
    }

    // Provider: an id referencing `providers`, or an inline object.
    const rawProvider = m.provider ?? m.owned_by;
    let provider: Provider | undefined;
    if (typeof rawProvider === 'string') {
      provider = providers.get(rawProvider.toLowerCase());
      if (!provider) {
        errors.push(`${label}: provider "${rawProvider}" is not in the providers list.`);
        return;
      }
    } else if (isObject(rawProvider)) {
      const pid = cleanText(rawProvider.id, 64).toLowerCase();
      const pname = cleanText(rawProvider.name, 60);
      if (!PROVIDER_ID_PATTERN.test(pid) || !pname) {
        errors.push(`${label}: invalid inline provider.`);
        return;
      }
      provider = providers.get(pid) ?? { id: pid, name: pname };
      providers.set(pid, provider);
    } else {
      errors.push(`${label}: missing provider.`);
      return;
    }

    // Pricing: a complete object, or null/absent when not yet published.
    let pricing: ModelPricing | null = null;
    const pr = m.pricing;
    if (pr === null || pr === undefined) {
      warnings.push(`${label}: no pricing; it will be listed as "Rates not yet published".`);
    } else if (!isObject(pr)) {
      errors.push(`${label}: pricing must be an object or null.`);
      return;
    } else {
      const input = readRate(pr.input);
      const output = readRate(pr.output);
      const cached = readRate(pr.cached_input ?? pr.cachedInput);
      if (input === undefined || input === null || Number.isNaN(input)) {
        errors.push(`${label}: pricing.input must be a number from 0 to ${MAX_RATE}.`);
        return;
      }
      if (output === undefined || output === null || Number.isNaN(output)) {
        errors.push(`${label}: pricing.output must be a number from 0 to ${MAX_RATE}.`);
        return;
      }
      if (cached !== undefined && cached !== null && Number.isNaN(cached)) {
        errors.push(`${label}: pricing.cached_input must be a number from 0 to ${MAX_RATE}, or null.`);
        return;
      }
      const cachedInput = cached ?? null;
      if (cachedInput !== null && cachedInput > input) {
        warnings.push(`${label}: cached input rate is higher than the input rate.`);
      }
      pricing = { input, output, cachedInput };
    }

    const modalities = Array.isArray(m.input_modalities ?? m.inputModalities)
      ? (m.input_modalities ?? m.inputModalities).filter((x: unknown) => typeof x === 'string').map((x: string) => x.toLowerCase())
      : ['text'];

    const rawFeatures: unknown[] = Array.isArray(m.features) ? m.features : [];
    const features = new Set<FeatureId>();
    for (const f of rawFeatures) {
      if (typeof f === 'string' && (FEATURES as string[]).includes(f)) features.add(f as FeatureId);
      else warnings.push(`${label}: unknown feature ${JSON.stringify(f)} ignored.`);
    }
    if (modalities.includes('image')) features.add('vision');
    // A cached-input rate is the observable fact; the feature flag follows it.
    if (pricing?.cachedInput != null) features.add('caching');
    else features.delete('caching');

    const tier = TIERS.includes(m.tier) ? (m.tier as Tier) : null;
    if (m.tier !== undefined && m.tier !== null && !tier) warnings.push(`${label}: unknown tier "${m.tier}" ignored.`);

    models.push({
      id,
      name,
      provider,
      tier,
      summary: cleanText(m.summary ?? m.description, 240),
      contextWindow: readPositiveInt(m.context_window ?? m.contextWindow),
      maxOutputTokens: readPositiveInt(m.max_output_tokens ?? m.maxOutputTokens),
      inputModalities: modalities.length ? modalities : ['text'],
      features: FEATURES.filter((f) => features.has(f)),
      pricing,
    });
  });

  if (models.length === 0) errors.push('Catalog contains no valid models.');

  // Provider order follows the payload; providers without models are dropped.
  const used = new Set(models.map((m) => m.provider.id));
  const orderedProviders = [...providers.values()].filter((p) => used.has(p.id));
  const order = new Map(orderedProviders.map((p, i) => [p.id, i]));
  models.sort((a, b) => order.get(a.provider.id)! - order.get(b.provider.id)!);

  return { catalog: { source, currency: 'USD', providers: orderedProviders, models }, errors, warnings };
}

export const isPriced = (m: Model): m is Model & { pricing: ModelPricing } => m.pricing !== null;
