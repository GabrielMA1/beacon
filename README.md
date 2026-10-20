# Website

Static "coming soon" page, built with Astro and deployed to GitHub Pages.

The site's name, domain and contact address are not stored in this repository. They are
supplied at build time:

| Build variable          | GitHub Actions secret | Purpose                                 |
| ----------------------- | --------------------- | --------------------------------------- |
| `PUBLIC_BRAND_NAME`     | `BRAND_NAME`          | Display name (required)                 |
| `SITE_URL`              | `SITE_URL`            | Canonical origin, `https://…` (required)|
| `PUBLIC_CONTACT_EMAIL`  | `CONTACT_EMAIL`       | Optional contact address shown on page  |

They are stored as Actions *secrets* so they are also masked in the public workflow logs.
For local work, copy `.env.example` to `.env` (git-ignored) and fill it in.

## Commands

Node 22 or later.

```sh
npm install
npm run dev      # local preview
npm run check    # type-check
npm run build    # static output in dist/, plus a Content-Security-Policy meta tag
```

## Deployment

Pushes to `main` build and deploy via `.github/workflows/deploy.yml`. The custom domain is
configured in **Settings → Pages** (a `CNAME` file is not needed for Actions deployments).

## Structure

```
src/config.ts                  identity read from the build environment
src/components/ComingSoon.astro the page content (also used for 404)
src/components/Logo.astro       wordmark (outlined SVG)
src/layouts/Base.astro          metadata, icons, social preview
src/pages/                      index, 404, robots.txt, site.webmanifest
scripts/csp.mjs                 adds the CSP meta tag after the build
```
