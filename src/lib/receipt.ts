/**
 * The worked example behind the hero illustration: one request, priced on
 * several models from catalog rates. Token counts are held constant across
 * models so the comparison isolates price; real counts vary by tokenizer.
 */
import { isPriced, type Model } from './catalog-schema';
import { formatCount, formatRate, formatUsd, formatUsdPrecise } from './format';

/** A long cacheable document (system prompt) plus a short question. */
export const EXAMPLE_USAGE = { cached: 48_200, input: 2_310, output: 1_180 } as const;
/** Example opening balance shown on the receipt. */
export const EXAMPLE_BALANCE = 250;

const PREFERRED = ['claude-sonnet-5-5', 'gpt-6.1-sol', 'gemini-3.8-flash', 'deepseek-v4.1-flash'];

export interface ReceiptLine {
  key: 'input' | 'cached' | 'output';
  label: string;
  detail: string;
  cost: number;
  costText: string;
}

export interface ReceiptRow {
  id: string;
  provider: string;
  lines: ReceiptLine[];
  total: number;
  totalText: string;
  balanceBefore: string;
  balanceAfter: string;
}

/** One model per provider, preferring the ids above; only priced models. */
export function pickExampleModels(models: Model[], count = 4): Model[] {
  const priced: Model[] = models.filter(isPriced);
  const chosen: Model[] = [];
  for (const id of PREFERRED) {
    const m = priced.find((x) => x.id === id);
    if (m) chosen.push(m);
  }
  for (const m of priced) {
    if (chosen.length >= count) break;
    if (!chosen.some((c) => c.provider.id === m.provider.id)) chosen.push(m);
  }
  return chosen.slice(0, count);
}

export function priceExample(m: Model): ReceiptRow {
  if (!isPriced(m)) throw new Error(`Model ${m.id} has no pricing`);
  const { input, cachedInput, output } = m.pricing;
  const u = EXAMPLE_USAGE;

  // Without a cached-input rate, the cacheable part is billed as normal input.
  const lines: Omit<ReceiptLine, 'costText'>[] =
    cachedInput === null
      ? [
          { key: 'input', label: 'Input', detail: `${formatCount(u.input + u.cached)} tokens × ${formatRate(input)} / 1M`, cost: ((u.input + u.cached) * input) / 1e6 },
          { key: 'cached', label: 'Cached input', detail: 'No cached-input rate for this model', cost: 0 },
          { key: 'output', label: 'Output', detail: `${formatCount(u.output)} tokens × ${formatRate(output)} / 1M`, cost: (u.output * output) / 1e6 },
        ]
      : [
          { key: 'input', label: 'Input', detail: `${formatCount(u.input)} tokens × ${formatRate(input)} / 1M`, cost: (u.input * input) / 1e6 },
          { key: 'cached', label: 'Cached input', detail: `${formatCount(u.cached)} tokens × ${formatRate(cachedInput)} / 1M`, cost: (u.cached * cachedInput) / 1e6 },
          { key: 'output', label: 'Output', detail: `${formatCount(u.output)} tokens × ${formatRate(output)} / 1M`, cost: (u.output * output) / 1e6 },
        ];

  const total = lines.reduce((s, l) => s + l.cost, 0);
  return {
    id: m.id,
    provider: m.provider.name,
    lines: lines.map((l) => ({ ...l, costText: formatUsdPrecise(l.cost) })),
    total,
    totalText: formatUsdPrecise(total),
    balanceBefore: formatUsd(EXAMPLE_BALANCE),
    balanceAfter: formatUsd(EXAMPLE_BALANCE - total),
  };
}
