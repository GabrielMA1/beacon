import { describe, expect, it } from 'vitest';
import sample from '../src/data/sample-catalog.json';
import { parseCatalog } from '../src/lib/catalog-schema';
import { priceExample, pickExampleModels, EXAMPLE_USAGE, EXAMPLE_BALANCE } from '../src/lib/receipt';

const { catalog } = parseCatalog(sample, 'sample');
const byId = (id: string) => catalog.models.find((m) => m.id === id)!;

describe('hero receipt example', () => {
  it('prices each line from catalog rates', () => {
    const row = priceExample(byId('claude-sonnet-5-5'));
    const u = EXAMPLE_USAGE;
    expect(row.lines[0].cost).toBeCloseTo((u.input * 2) / 1e6, 10);
    expect(row.lines[1].cost).toBeCloseTo((u.cached * 0.2) / 1e6, 10);
    expect(row.lines[2].cost).toBeCloseTo((u.output * 10) / 1e6, 10);
    expect(row.total).toBeCloseTo(row.lines.reduce((s, l) => s + l.cost, 0), 12);
    expect(row.balanceBefore).toBe('$250.00');
    expect(row.balanceAfter).toBe(`$${(EXAMPLE_BALANCE - row.total).toFixed(2)}`);
  });

  it('bills the cacheable part as input on models without a cached-input rate', () => {
    const row = priceExample(byId('glm-5.3-flash'));
    const u = EXAMPLE_USAGE;
    expect(row.lines[0].cost).toBeCloseTo(((u.input + u.cached) * 0.15) / 1e6, 10);
    expect(row.lines[1].cost).toBe(0);
    expect(row.lines[1].detail).toMatch(/No cached-input rate/);
  });

  it('picks distinct providers and only priced models', () => {
    const picks = pickExampleModels(catalog.models);
    expect(picks).toHaveLength(4);
    expect(new Set(picks.map((m) => m.provider.id)).size).toBe(4);
    picks.forEach((m) => expect(m.pricing).not.toBeNull());
  });
});
