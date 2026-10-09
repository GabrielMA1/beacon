# gabnode.com

The public website for Gabnode: one API and one prepaid balance for leading AI models.

This repository is **public**. It contains only the static marketing site. The API, dashboard,
authentication, billing and every credential live in the private platform repository. Never add
secrets, provider keys, customer data or private infrastructure details here. The browser never
enforces balances, authorization or billing; those belong to the platform.

| Property  | URL                            | Lives in            |
| --------- | ------------------------------ | ------------------- |
| Website   | https://gabnode.com            | this repository     |
| API       | https://api.gabnode.com        | platform repository |
| Docs      | https://docs.gabnode.com       | separate            |
| Dashboard | https://dashboard.gabnode.com  | platform repository |

**Before launch, read [LAUNCH.md](LAUNCH.md)**: blockers, product decisions to confirm, and
the inputs needed for the Terms of Service and Privacy Policy.

## Stack

- [Astro](https://astro.build) with static output; plain CSS with design tokens in `src/styles/global.css`.
- Self-hosted fonts (Schibsted Grotesk, IBM Plex Mono). No cookies, analytics or third-party requests.
- [GSAP](https://gsap.com) for two interactions only (see "Motion"). Loaded lazily, never for reduced-motion visitors.
- `@astrojs/sitemap`. Vitest for unit tests; playwright-core + axe-core for the rendered audit.

## Commands

Node 22 or later.

```sh
npm install
npm run dev          # http://localhost:4321
npm run check        # type-check .astro and .ts
npm test             # unit tests: pricing maths, catalog validation, code samples
npm run build        # static output in dist/, plus the CSP meta tag
npm run check:links  # internal links, anchors and external-host allowlist in dist/
npm run audit        # rendered audit (needs Chromium; see below)
npm run preview      # serve dist/ locally
```

`npm run audit` serves `dist/` like GitHub Pages and checks every page at mobile, tablet and
desktop widths for axe-core violations (WCAG 2.2 A/AA plus best practice), JavaScript errors,
horizontal overflow and layout shift. Add `-- --shots ./shots` to save screenshots. It uses
Playwright's Chromium (`npx playwright install chromium`) or `CHROMIUM_PATH`.

CI (`.github/workflows/ci.yml` on pull requests, `deploy.yml` on `main`) runs check, tests,
build and the link check. Deployment happens only from `main`.

## Structure

```
src/
  config/site.ts            URLs for the API, docs and dashboard; nav; contact address
  data/sample-catalog.json  SAMPLE model catalog (see "Model catalog")
  data/code-samples.ts      integration examples (syntax-checked by tests)
  data/faq.ts               FAQ copy — confirmed or definitional statements only
  lib/catalog-schema.ts     catalog contract, validation, normalisation (pure, tested)
  lib/catalog.ts            loading policy and labels
  lib/format.ts             every displayed rate, amount and token count
  lib/estimate.ts           estimator maths and input validation (tested)
  lib/receipt.ts            the hero's worked example (tested)
  scripts/motion.ts         lazy GSAP loading and number tweens
  components/  pages/       Astro components and routes (/, /models, /pricing, /legal/*, 404)
scripts/                    csp.mjs, check-links.mjs, audit.mjs
tests/                      Vitest unit tests
```

## Model catalog

All models and rates come from one place, `getCatalog()` in `src/lib/catalog.ts`, and every
calculation uses `src/lib/estimate.ts`, `src/lib/receipt.ts` and `src/lib/format.ts`. Nothing else
hard-codes a rate.

### Where the data comes from

| `PUBLIC_MODELS_API_URL` | Source | What visitors see |
| --- | --- | --- |
| unset | `src/data/sample-catalog.json` | "Sample rates" labels on every page with rates; neutral headings with no model counts |
| unset, file has `"sample": false` | the bundled file, treated as confirmed | no sample labelling — set this only for confirmed data |
| set, endpoint healthy | live catalog | rates as published |
| set, endpoint down or invalid | — | **the build fails**; the previous deployment stays online |

The site never falls back to sample prices when a live catalog was expected. Rates are read at
build time, so they are only as fresh as the last build. The platform can trigger a rebuild:

```sh
curl -X POST https://api.github.com/repos/GabrielMA1/beacon/dispatches \
  -H "Authorization: Bearer <token with repo scope>" \
  -d '{"event_type":"catalog-updated"}'
```

That token belongs in the platform's secret store, never in this repository.

**`src/data/sample-catalog.json` is sample data.** Model names, context windows and prices are
placeholders compiled from public third-party sources that disagree with each other. None of it
is a Gabnode price.

### Response contract: `GET /api/models`

The endpoint must be `https`, reachable from GitHub's runners, return `application/json`, and be
under 2 MB. It is read with a 20-second timeout and redirects are refused.

```jsonc
{
  "currency": "USD",                        // only USD is supported
  "providers": [{ "id": "anthropic", "name": "Anthropic" }],
  "data": [
    {
      "id": "claude-sonnet-5-5",            // exactly what the API accepts as `model`
      "name": "Claude Sonnet 5.5",
      "provider": "anthropic",              // a providers[].id, or an inline { "id", "name" }
      "tier": "balanced",                   // optional: flagship | balanced | efficient
      "summary": "One-line description.",   // optional, plain text, ≤ 240 chars shown
      "context_window": 1000000,            // optional positive integer
      "max_output_tokens": 128000,          // optional positive integer
      "input_modalities": ["text", "image"],// optional; "image" implies the vision label
      "features": ["tools", "reasoning", "json"],
      "pricing": {                          // USD per 1M tokens, or null if not yet published
        "input": 2.0,
        "cached_input": 0.2,                // null or absent: the model has no cached-input rate
        "output": 10.0
      }
    }
  ]
}
```

### Validation (`parseCatalog`)

Errors (any error fails a live build):
- not a JSON object, no `data`/`models` array, no valid models, or a currency other than USD;
- a model `id` that is missing, duplicated, or not matching `^[a-z0-9][a-z0-9._:/-]{0,127}$`;
- a missing name, or a provider that is not in `providers` and not given inline;
- `pricing` that is not an object or `null`; `input`/`output` missing, negative, non-numeric,
  non-finite or above 10,000; `cached_input` present but invalid.

Warnings (logged, data still used):
- `pricing: null` — listed as "Rates not yet published", excluded from the estimator, sorted last;
- a cached-input rate higher than the input rate; unknown features or tiers (ignored).

Normalisation: numbers or decimal strings accepted for rates; camelCase keys accepted; text is
trimmed and length-capped and always rendered as text, never HTML. The "Cached input pricing"
capability is derived from the presence of a cached-input rate, so the label can never disagree
with the rate card.

## Motion

- **GSAP** (free standard licence) is used where orchestration earns its weight: re-pricing the hero
  receipt when the model changes (interruptible number tweens and a short sequence), and re-ranking
  the estimator's comparison list (Flip). It is fetched after the page is idle, only on those two
  pages, and never for visitors who prefer reduced motion. Everything renders complete and
  correct before any script runs.
- Simple transitions (hover, bars, accordion icons) are CSS.
- **Lenis was evaluated and not used.** This is a reference site: people scan prices, jump to
  anchors and use the keyboard. Native scrolling does that best; CSS `scroll-behavior` covers
  in-page anchors and is disabled for reduced motion.
- **React Bits and 21st.dev were reviewed for ideas only.** Their components are React-based and
  mostly decorative (WebGL backgrounds, cursor and text effects). The one idea adopted — counting a
  value from old to new, as in React Bits' CountUp — is implemented in `src/scripts/motion.ts`
  without React.

## Security

- Content-Security-Policy is added to every page as a `<meta>` tag by `scripts/csp.mjs`:
  same-origin scripts plus hashes of each inline script; inline style attributes allowed (used by
  the syntax highlighter). GitHub Pages cannot set headers, so `frame-ancestors` is unavailable.
- `.env*` files are git-ignored except `.env.example`. Only `PUBLIC_*` values exist, and they are public.
- Code samples use `YOUR_API_KEY` and an environment variable; tests reject anything key-shaped.
- `npm run check:links` fails on links to unexpected external hosts or `http://` URLs.

## Deployment (GitHub Pages)

One-time setup (repository settings, not code):

1. **Settings → Pages → Source:** GitHub Actions.
2. **Settings → Pages → Custom domain:** `gabnode.com`, then **Enforce HTTPS**. `public/CNAME` contains the domain.
3. DNS at your provider:
   - `A` for `gabnode.com` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` for `www` → `gabrielma1.github.io`
4. Optional: **Settings → Secrets and variables → Actions → Variables:** `PUBLIC_MODELS_API_URL`
   (a variable, not a secret).

Pages are generated as `/models/index.html` etc. and served without rewrites; unknown paths get
`404.html`. Asset URLs are root-relative, so the site must be served from the domain root
(gabnode.com), not from `gabrielma1.github.io/beacon/`.

## Content principles

- Gabnode is presented as an infrastructure provider, not a marketplace.
- No claims of partnership or affiliation with model providers; the footer carries a trademark notice.
- No savings, uptime, latency or capacity claims. Show rates and let customers compare.
- No product or billing policy on the site until the platform confirms it (see LAUNCH.md).
- Sample data is always labelled as sample data.
