/**
 * Every number a visitor sees goes through these functions, so rates,
 * totals and token counts read the same everywhere on the site.
 */

const rateFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const preciseFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

/**
 * A per-million-token rate: at least two decimals, up to four, never rounded
 * to a value that differs from the published rate at that precision.
 * 2 → "$2.00", 0.075 → "$0.075", 0.0005 → "$0.0005". Null → "—".
 */
export function formatRate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return rateFmt.format(value);
}

/**
 * A money amount such as an estimate total. Amounts that are positive but
 * would display as $0.00 are shown as "< $0.01" rather than as free.
 */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value > 0 && value < 0.005) return '< $0.01';
  return usdFmt.format(value);
}

/** Small per-request amounts, shown to four decimals: $0.0269 */
export function formatUsdPrecise(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return preciseFmt.format(value);
}

/** Compact token capacity, e.g. 1M, 1.5M, 262K */
export function formatTokens(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

/** An exact token count: 51,092 */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/** Millions of tokens with sensible precision: 0.5M, 20M, 1,250M */
export function formatMillions(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: value < 10 ? 2 : 1 })}M`;
}
