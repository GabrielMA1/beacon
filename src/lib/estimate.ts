/**
 * Monthly cost estimate shared by the server render and the browser,
 * so the first paint and the interactive version always agree.
 */

export interface RateRow {
  id: string;
  name: string;
  provider: string;
  input: number;
  cached: number | null;
  output: number;
}

export interface Workload {
  /** Input tokens per month, in millions */
  inputM: number;
  /** Output tokens per month, in millions */
  outputM: number;
  /** Share of input tokens served from cache, 0–100 */
  cachedPct: number;
}

export interface Estimate {
  lines: { key: 'input' | 'cached' | 'output'; label: string; tokensM: number; rate: number; cost: number; available: boolean }[];
  total: number;
}

export const presets: { id: string; label: string; workload: Workload }[] = [
  { id: 'support', label: 'Support assistant', workload: { inputM: 40, outputM: 8, cachedPct: 50 } },
  { id: 'documents', label: 'Document Q&A', workload: { inputM: 120, outputM: 6, cachedPct: 80 } },
  { id: 'coding', label: 'Coding agent', workload: { inputM: 300, outputM: 30, cachedPct: 85 } },
  { id: 'classify', label: 'Bulk classification', workload: { inputM: 500, outputM: 5, cachedPct: 20 } },
];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 0));

export function estimate(rate: RateRow, w: Workload): Estimate {
  const inputM = clamp(w.inputM, 0, 1e6);
  const outputM = clamp(w.outputM, 0, 1e6);
  // Models without cache pricing bill every input token at the standard rate.
  const pct = rate.cached === null ? 0 : clamp(w.cachedPct, 0, 100) / 100;
  const cachedM = inputM * pct;
  const freshM = inputM - cachedM;

  const lines: Estimate['lines'] = [
    { key: 'input', label: 'Input', tokensM: freshM, rate: rate.input, cost: freshM * rate.input, available: true },
    { key: 'cached', label: 'Cached input', tokensM: cachedM, rate: rate.cached ?? 0, cost: cachedM * (rate.cached ?? 0), available: rate.cached !== null },
    { key: 'output', label: 'Output', tokensM: outputM, rate: rate.output, cost: outputM * rate.output, available: true },
  ];
  return { lines, total: lines.reduce((s, l) => s + l.cost, 0) };
}

const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatUsd = (n: number) => usdFmt.format(n);

export const formatM = (n: number) =>
  `${n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 2 : 1 })}M`;

export const formatRateShort = (n: number) => `$${n.toFixed(Math.round(n * 1000) % 10 !== 0 ? 3 : 2)}`;

export const describeLine = (line: Estimate['lines'][number]) =>
  line.available ? `${formatM(line.tokensM)} × ${formatRateShort(line.rate)}` : 'Not offered for this model';
