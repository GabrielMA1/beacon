import { describe, expect, it } from 'vitest';
import { formatCount, formatMillions, formatRate, formatTokens, formatUsd, formatUsdPrecise } from '../src/lib/format';

describe('formatRate', () => {
  it('shows two decimals for whole-cent rates', () => {
    expect(formatRate(2)).toBe('$2.00');
    expect(formatRate(0.1)).toBe('$0.10');
    expect(formatRate(15)).toBe('$15.00');
  });
  it('keeps sub-cent precision instead of rounding it away', () => {
    expect(formatRate(0.075)).toBe('$0.075');
    expect(formatRate(0.145)).toBe('$0.145');
    expect(formatRate(0.0005)).toBe('$0.0005');
    expect(formatRate(1.745)).toBe('$1.745');
  });
  it('groups thousands and handles zero', () => {
    expect(formatRate(1250)).toBe('$1,250.00');
    expect(formatRate(0)).toBe('$0.00');
  });
  it('renders missing or invalid rates as a dash', () => {
    expect(formatRate(null)).toBe('—');
    expect(formatRate(NaN)).toBe('—');
  });
});

describe('formatUsd', () => {
  it('formats totals to cents', () => {
    expect(formatUsd(124)).toBe('$124.00');
    expect(formatUsd(1234567.891)).toBe('$1,234,567.89');
    expect(formatUsd(0)).toBe('$0.00');
  });
  it('never shows a positive amount as free', () => {
    expect(formatUsd(0.004)).toBe('< $0.01');
    expect(formatUsd(0.005)).toBe('$0.01');
  });
  it('precise amounts use four decimals', () => {
    expect(formatUsdPrecise(0.026853)).toBe('$0.0269');
  });
});

describe('token formatting', () => {
  it('compacts capacities', () => {
    expect(formatTokens(1_048_576)).toBe('1M');
    expect(formatTokens(1_500_000)).toBe('1.5M');
    expect(formatTokens(262_144)).toBe('262K');
    expect(formatTokens(null)).toBe('—');
  });
  it('formats exact counts and millions', () => {
    expect(formatCount(51092)).toBe('51,092');
    expect(formatMillions(0.5)).toBe('0.5M');
    expect(formatMillions(1250)).toBe('1,250M');
  });
});
