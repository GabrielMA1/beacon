/**
 * Cost arithmetic shared by the server render and the browser, so the first
 * paint and the interactive version always agree. These are estimates from
 * published rates; actual charges are calculated by the Gabnode platform
 * from the token counts each request reports.
 */
import type { Model, ModelPricing } from './catalog-schema';
import { formatMillions, formatRate } from './format';

export interface RateRow {
  id: string;
  name: string;
  provider: string;
  input: number;
  cached: number | null;
  output: number;
}

export interface Workload {
  /** Input tokens per month, in millions (cached and uncached together) */
  inputM: number;
  /** Output tokens per month, in millions */
  outputM: number;
  /** Share of input tokens served from cache, 0–100 */
  cachedPct: number;
}

export type LineKey = 'input' | 'cached' | 'output';

export interface EstimateLine {
  key: LineKey;
  label: string;
  tokensM: number;
  rate: number | null;
  cost: number;
  /** False for cached input on a model without a cached-input rate */
  available: boolean;
}

export interface Estimate {
  lines: EstimateLine[];
  total: number;
}

/** Upper bound accepted by the estimator: one trillion tokens a month. */
export const MAX_TOKENS_M = 1_000_000;

export const presets: { id: string; label: string; workload: Workload }[] = [
  { id: 'support', label: 'Support assistant', workload: { inputM: 40, outputM: 8, cachedPct: 50 } },
  { id: 'documents', label: 'Document Q&A', workload: { inputM: 120, outputM: 6, cachedPct: 80 } },
  { id: 'coding', label: 'Coding agent', workload: { inputM: 300, outputM: 30, cachedPct: 85 } },
  { id: 'classify', label: 'Bulk classification', workload: { inputM: 500, outputM: 5, cachedPct: 20 } },
];

export function toRateRow(m: Model & { pricing: ModelPricing }): RateRow {
  return {
    id: m.id,
    name: m.name,
    provider: m.provider.name,
    input: m.pricing.input,
    cached: m.pricing.cachedInput,
    output: m.pricing.output,
  };
}

/**
 * Cost of a workload on one model. Expects a validated workload
 * (see readWorkload). On a model without a cached-input rate, all input is
 * billed at the input rate and the cache share is ignored.
 */
export function estimate(rate: RateRow, w: Workload): Estimate {
  const hasCache = rate.cached !== null;
  const cachedM = hasCache ? (w.inputM * w.cachedPct) / 100 : 0;
  const freshM = w.inputM - cachedM;

  const lines: EstimateLine[] = [
    { key: 'input', label: 'Input', tokensM: freshM, rate: rate.input, cost: freshM * rate.input, available: true },
    {
      key: 'cached',
      label: 'Cached input',
      tokensM: cachedM,
      rate: rate.cached,
      cost: hasCache ? cachedM * rate.cached! : 0,
      available: hasCache,
    },
    { key: 'output', label: 'Output', tokensM: w.outputM, rate: rate.output, cost: w.outputM * rate.output, available: true },
  ];
  return { lines, total: lines.reduce((s, l) => s + l.cost, 0) };
}

export function describeLine(line: EstimateLine): string {
  if (!line.available) return 'No cached-input rate. All input is billed at the input rate.';
  return `${formatMillions(line.tokensM)} tokens × ${formatRate(line.rate)} per 1M`;
}

export type WorkloadField = 'input' | 'output' | 'cached';

/**
 * Parse the three form fields. Returns the workload when every field is
 * valid, and a message per invalid field otherwise. Never guesses: a blank,
 * negative or non-numeric value is reported, not silently replaced.
 */
export function readWorkload(fields: Record<WorkloadField, string>): {
  workload: Workload | null;
  errors: Partial<Record<WorkloadField, string>>;
} {
  const errors: Partial<Record<WorkloadField, string>> = {};

  const read = (key: WorkloadField, max: number, unit: string): number => {
    const text = fields[key].trim().replace(/,/g, '');
    if (text === '') {
      errors[key] = 'Enter a number.';
      return NaN;
    }
    const n = Number(text);
    if (!Number.isFinite(n)) errors[key] = 'Enter a number.';
    else if (n < 0) errors[key] = 'Enter 0 or more.';
    else if (n > max) errors[key] = `Enter ${max.toLocaleString('en-US')}${unit} or less.`;
    return n;
  };

  const inputM = read('input', MAX_TOKENS_M, 'M');
  const outputM = read('output', MAX_TOKENS_M, 'M');
  const cachedPct = read('cached', 100, '%');

  return Object.keys(errors).length ? { workload: null, errors } : { workload: { inputM, outputM, cachedPct }, errors };
}
