# gabnode.com

The public website for Gabnode: one API and one prepaid balance for leading AI models.

This repository is **public**. It contains only the static marketing site. The API, dashboard,
authentication, billing and every credential live in the private platform repository. Never add
secrets, provider keys, customer data or private infrastructure details here.

| Property  | URL                            | Lives in            |
| --------- | ------------------------------ | ------------------- |
| Website   | https://gabnode.com            | this repository     |
| API       | https://api.gabnode.com        | platform repository |
| Docs      | https://docs.gabnode.com       | separate            |
| Dashboard | https://dashboard.gabnode.com  | platform repository |

## Stack

- [Astro](https://astro.build) with static output. Pages ship as HTML and CSS, plus small
  scripts for the interactive parts (model switcher, filters, estimator, code tabs).
- Plain CSS with design tokens in `src/styles/global.css`. No CSS framework.
- Self-hosted fonts (Schibsted Grotesk, IBM Plex Mono) from Fontsource, so there are no third-party requests.
- `@astrojs/sitemap` for the sitemap.

## Development

Requires Node 22 or later.

```sh
npm install
npm run dev      # http://localhost:4321
npm run check    # type-check .astro and .ts files
npm run build    # static output in dist/
npm run preview  # serve dist/ locally
```

## Structure

```
src/
  config/site.ts          URLs for the API, docs and dashboard, nav, contact address
  data/models.json        sample model catalog (see "Model data")
  data/faq.ts             FAQ copy for the home and pricing pages
  lib/catalog.ts          catalog types, loading, normalisation, formatting
  lib/estimate.ts         cost estimate maths, shared by server render and browser
  components/             Header, Footer, Logo, RateTable, CodeTabs, RequestReceipt, …
  pages/                  index, models, pricing, 404
public/                   favicon, social image, robots.txt, CNAME
```

## Model data

Every page reads models through `getCatalog()` in `src/lib/catalog.ts`. At build time:

1. If `PUBLIC_MODELS_API_URL` is set and the endpoint responds, the live catalog is used.
2. Otherwise the build falls back to `src/data/models.json` and logs a warning.

**`src/data/models.json` is sample data.** Model names, context windows and prices are realistic
placeholders. Replace them with real data from the platform before launch, either by editing the
file or by pointing `PUBLIC_MODELS_API_URL` at the live endpoint.

The expected response shape (`GET /api/models`):

```jsonc
{
  "currency": "USD",
  "providers": [{ "id": "anthropic", "name": "Anthropic" }],
  "data": [
    {
      "id": "claude-sonnet-5-5",          // the value customers pass as `model`
      "name": "Claude Sonnet 5.5",
      "provider": "anthropic",            // provider id, or an inline { id, name } object
      "tier": "balanced",                 // optional: flagship | balanced | efficient
      "summary": "One-line description.",
      "context_window": 1000000,
      "max_output_tokens": 128000,
      "input_modalities": ["text", "image"],
      "features": ["tools", "reasoning", "caching", "json"],
      "pricing": { "input": 2.0, "cached_input": 0.2, "output": 10.0 }  // USD per 1M tokens
    }
  ]
}
```

`normalizeCatalog()` tolerates camelCase keys, a `models` array instead of `data`, `null` for
`cached_input` (shown as "—"), and providers given inline. It skips any model without input and
output prices, so the site never shows a model without a rate.

The endpoint must be reachable from GitHub's build runners. Because the site is static, rates
update when the site rebuilds. The workflow accepts a `repository_dispatch` event, so the
platform can trigger a rebuild whenever the catalog changes:

```sh
curl -X POST https://api.github.com/repos/GabrielMA1/beacon/dispatches \
  -H "Authorization: Bearer <token with repo scope>" \
  -d '{"event_type":"catalog-updated"}'
```

That token belongs in the platform's secret store, never in this repository.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` type-checks, builds and deploys on every push to `main`.

One-time setup:

1. **Settings → Pages → Build and deployment → Source:** GitHub Actions.
2. **Settings → Pages → Custom domain:** `gabnode.com`, then enable **Enforce HTTPS**.
   `public/CNAME` already contains the domain.
3. DNS for the apex domain, at your DNS provider:
   - `A` records for `gabnode.com` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` records → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` for `www` → `gabrielma1.github.io`
4. Optional: **Settings → Secrets and variables → Actions → Variables:** add
   `PUBLIC_MODELS_API_URL`. Use a *variable*, not a secret; the value is a public URL.

Routes are generated as `/models/index.html` and so on, which GitHub Pages serves without
rewrites. `404.html` is served for unknown paths.

## Configuration

Destinations and contact details are in `src/config/site.ts`:

- `links.signup`: where "Get started" points. Currently the dashboard root. Change it once
  the dashboard has a dedicated sign-up route.
- `links.supportEmail`: currently `support@gabnode.com`. Make sure the mailbox exists.

## Before launch

- [ ] Replace the sample catalog with real models and rates.
- [ ] Add Terms of Service and a Privacy Policy, and link them from the footer. Both are
      needed before taking payments.
- [ ] Confirm that `support@gabnode.com` receives mail.
- [ ] Check that the client list on the home page (`clients` in `src/pages/index.astro`)
      matches clients you have verified against the API.
- [ ] Check that the documentation topics listed on the home page exist at docs.gabnode.com.

## Content principles

- Gabnode is presented as an infrastructure provider, not a marketplace.
- No claims of partnership or affiliation with model providers. Use wording like
  "models available through Gabnode". The footer carries a trademark notice.
- No unverifiable savings claims. Show rates and let customers compare.
