import { describe, expect, it } from 'vitest';
import { estimate, readWorkload, describeLine, MAX_TOKENS_M, type RateRow } from '../src/lib/estimate';

const sonnet: RateRow = { id: 's', name: 'S', provider: 'P', input: 2, cached: 0.2, output: 10 };
const noCache: RateRow = { id: 'n', name: 'N', provider: 'P', input: 0.15, cached: null, output: 0.5 };

describe('estimate', () => {
  it('splits input between fresh and cached tokens', () => {
    const e = estimate(sonnet, { inputM: 40, outputM: 8, cachedPct: 50 });
    const [input, cached, output] = e.lines;
    expect(input.tokensM).toBe(20);
    expect(input.cost).toBeCloseTo(40);
    expect(cached.tokensM).toBe(20);
    expect(cached.cost).toBeCloseTo(4);
    expect(output.cost).toBeCloseTo(80);
    expect(e.total).toBeCloseTo(124);
  });

  it('bills all input at the input rate when a model has no cached-input rate', () => {
    const e = estimate(noCache, { inputM: 100, outputM: 10, cachedPct: 80 });
    expect(e.lines[0].tokensM).toBe(100);
    expect(e.lines[0].cost).toBeCloseTo(15);
    expect(e.lines[1].available).toBe(false);
    expect(e.lines[1].cost).toBe(0);
    expect(e.total).toBeCloseTo(20);
    expect(describeLine(e.lines[1])).toMatch(/No cached-input rate/);
  });

  it('handles zero usage', () => {
    expect(estimate(sonnet, { inputM: 0, outputM: 0, cachedPct: 0 }).total).toBe(0);
  });

  it('handles 0% and 100% cache shares exactly', () => {
    expect(estimate(sonnet, { inputM: 10, outputM: 0, cachedPct: 0 }).total).toBeCloseTo(20);
    expect(estimate(sonnet, { inputM: 10, outputM: 0, cachedPct: 100 }).total).toBeCloseTo(2);
  });

  it('stays finite at the maximum accepted volume', () => {
    const e = estimate(sonnet, { inputM: MAX_TOKENS_M, outputM: MAX_TOKENS_M, cachedPct: 0 });
    expect(Number.isFinite(e.total)).toBe(true);
    expect(e.total).toBeCloseTo(12_000_000);
  });

  it('total always equals the sum of its lines', () => {
    for (const w of [{ inputM: 3.3, outputM: 1.7, cachedPct: 33 }, { inputM: 999, outputM: 0.01, cachedPct: 99 }]) {
      const e = estimate(sonnet, w);
      expect(e.total).toBeCloseTo(e.lines.reduce((s, l) => s + l.cost, 0), 10);
    }
  });
});

describe('readWorkload', () => {
  it('accepts valid numbers, including thousands separators and decimals', () => {
    expect(readWorkload({ input: '1,200', output: '0.5', cached: '50' }).workload).toEqual({ inputM: 1200, outputM: 0.5, cachedPct: 50 });
  });
  it('reports blank, negative, non-numeric and out-of-range values', () => {
    const r = readWorkload({ input: '', output: '-1', cached: '150' });
    expect(r.workload).toBeNull();
    expect(r.errors.input).toBeDefined();
    expect(r.errors.output).toBeDefined();
    expect(r.errors.cached).toBeDefined();
    expect(readWorkload({ input: 'abc', output: '1', cached: '0' }).errors.input).toBeDefined();
    expect(readWorkload({ input: 'Infinity', output: '1', cached: '0' }).errors.input).toBeDefined();
    expect(readWorkload({ input: String(MAX_TOKENS_M + 1), output: '1', cached: '0' }).errors.input).toBeDefined();
  });
});
