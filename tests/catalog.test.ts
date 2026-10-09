import { afterEach, describe, expect, it, vi } from 'vitest';
import sample from '../src/data/sample-catalog.json';
import { parseCatalog, MODEL_ID_PATTERN } from '../src/lib/catalog-schema';

const base = () => ({
  currency: 'USD',
  providers: [{ id: 'acme', name: 'Acme' }],
  data: [{ id: 'acme-1', name: 'Acme One', provider: 'acme', pricing: { input: 1, output: 2, cached_input: 0.1 } }],
});

describe('sample catalog', () => {
  const { catalog, errors } = parseCatalog(sample, 'sample');

  it('is valid and flagged as sample data', () => {
    expect(errors).toEqual([]);
    expect((sample as any).sample).toBe(true);
    expect(catalog.source).toBe('sample');
    expect(catalog.models.length).toBeGreaterThan(0);
  });

  it('uses unique ids that are valid model parameters', () => {
    const ids = catalog.models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(MODEL_ID_PATTERN));
  });

  it('only marks caching on models that have a cached-input rate', () => {
    for (const m of catalog.models) {
      expect(m.features.includes('caching')).toBe(m.pricing?.cachedInput != null);
    }
  });

  it('has no summaries that claim partnership or affiliation', () => {
    const text = JSON.stringify(sample).toLowerCase();
    for (const word of ['partner', 'official', 'affiliat', 'endorse', 'certified']) expect(text).not.toContain(word);
  });
});

describe('parseCatalog validation', () => {
  it('accepts a minimal valid catalog', () => {
    const r = parseCatalog(base(), 'live');
    expect(r.errors).toEqual([]);
    expect(r.catalog.models[0].pricing).toEqual({ input: 1, output: 2, cachedInput: 0.1 });
  });

  it('accepts decimal strings, camelCase keys and inline providers', () => {
    const r = parseCatalog(
      { models: [{ id: 'x/y-1', displayName: 'n', name: 'X', provider: { id: 'xco', name: 'X Co' }, pricing: { input: '0.075', output: '0.3', cachedInput: null } }] },
      'live',
    );
    expect(r.errors).toEqual([]);
    expect(r.catalog.models[0].pricing).toEqual({ input: 0.075, output: 0.3, cachedInput: null });
    expect(r.catalog.providers).toEqual([{ id: 'xco', name: 'X Co' }]);
  });

  it('lists models with null pricing as unpriced rather than inventing rates', () => {
    const c = base();
    (c.data[0] as any).pricing = null;
    const r = parseCatalog(c, 'live');
    expect(r.errors).toEqual([]);
    expect(r.catalog.models[0].pricing).toBeNull();
    expect(r.warnings.join()).toMatch(/no pricing/);
  });

  it.each([
    ['negative rate', { input: -1, output: 2 }],
    ['missing output', { input: 1 }],
    ['non-numeric', { input: 'cheap', output: 2 }],
    ['infinite', { input: Infinity, output: 2 }],
    ['absurd rate', { input: 1, output: 1e9 }],
    ['bad cached', { input: 1, output: 2, cached_input: 'n/a' }],
  ])('rejects pricing with %s', (_label, pricing) => {
    const c = base();
    (c.data[0] as any).pricing = pricing;
    const r = parseCatalog(c, 'live');
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.catalog.models).toHaveLength(0);
  });

  it('rejects duplicate ids, invalid ids and unknown providers', () => {
    const c = base();
    c.data.push({ ...c.data[0] });
    c.data.push({ ...c.data[0], id: 'has space' });
    c.data.push({ ...c.data[0], id: 'other', provider: 'nobody' });
    const r = parseCatalog(c, 'live');
    expect(r.errors.some((e) => e.includes('duplicate'))).toBe(true);
    expect(r.errors.some((e) => e.includes('id must match'))).toBe(true);
    expect(r.errors.some((e) => e.includes('not in the providers list'))).toBe(true);
    expect(r.catalog.models).toHaveLength(1);
  });

  it('rejects non-objects, empty catalogs and other currencies', () => {
    expect(parseCatalog(null, 'live').errors.length).toBeGreaterThan(0);
    expect(parseCatalog('[]', 'live').errors.length).toBeGreaterThan(0);
    expect(parseCatalog({ data: [] }, 'live').errors).toContain('Catalog contains no valid models.');
    expect(parseCatalog({ ...base(), currency: 'EUR' }, 'live').errors.join()).toMatch(/currency/);
  });

  it('treats markup in text fields as text and caps lengths', () => {
    const c = base();
    (c.data[0] as any).summary = '<img src=x onerror=alert(1)>' + 'a'.repeat(1000);
    const m = parseCatalog(c, 'live').catalog.models[0];
    expect(m.summary.length).toBeLessThanOrEqual(240);
    // Rendering escapes text; the parser must not try to "sanitise" it into HTML.
    expect(m.summary.startsWith('<img')).toBe(true);
  });
});

describe('getCatalog loading policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const load = async () => (await import('../src/lib/catalog')).getCatalog();

  it('uses the labelled sample when no endpoint is configured', async () => {
    vi.stubEnv('PUBLIC_MODELS_API_URL', '');
    expect((await load()).source).toBe('sample');
  });

  it('treats the bundled file as confirmed only when it says "sample": false', async () => {
    vi.stubEnv('PUBLIC_MODELS_API_URL', '');
    vi.doMock('../src/data/sample-catalog.json', () => ({ default: { ...base(), sample: false } }));
    expect((await load()).source).toBe('live');
    vi.doUnmock('../src/data/sample-catalog.json');
    vi.resetModules();
    vi.doMock('../src/data/sample-catalog.json', () => ({ default: { ...base() } }));
    expect((await load()).source).toBe('sample');
    vi.doUnmock('../src/data/sample-catalog.json');
  });

  it('uses live data when the endpoint returns a valid catalog', async () => {
    vi.stubEnv('PUBLIC_MODELS_API_URL', 'https://api.example.test/api/models');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(base()), { headers: { 'content-type': 'application/json' } })));
    const c = await load();
    expect(c.source).toBe('live');
    expect(c.models[0].id).toBe('acme-1');
  });

  it('fails instead of falling back to sample prices when the endpoint errors', async () => {
    vi.stubEnv('PUBLIC_MODELS_API_URL', 'https://api.example.test/api/models');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    await expect(load()).rejects.toThrow(/could not be used: HTTP 503/);
  });

  it('fails on malformed or invalid live data', async () => {
    vi.stubEnv('PUBLIC_MODELS_API_URL', 'https://api.example.test/api/models');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"data":[{"id":"x"}]}', { headers: { 'content-type': 'application/json' } })));
    await expect(load()).rejects.toThrow(/validation failed/);
  });

  it('fails on network errors and non-https URLs', async () => {
    vi.stubEnv('PUBLIC_MODELS_API_URL', 'https://api.example.test/api/models');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    await expect(load()).rejects.toThrow(/fetch failed/);
    vi.resetModules();
    vi.stubEnv('PUBLIC_MODELS_API_URL', 'http://api.example.test/api/models');
    await expect(load()).rejects.toThrow(/https/);
  });
});
