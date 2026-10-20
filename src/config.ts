/**
 * Site identity, injected at build time so that it never appears in this
 * repository. Set these as GitHub Actions secrets (see README) and, for local
 * work, in a git-ignored .env file:
 *
 *   PUBLIC_BRAND_NAME     display name
 *   SITE_URL              canonical origin, e.g. https://example.com
 *   PUBLIC_CONTACT_EMAIL  optional contact address
 */
const name = (import.meta.env.PUBLIC_BRAND_NAME ?? '').trim();
const url = import.meta.env.SITE;
const email = (import.meta.env.PUBLIC_CONTACT_EMAIL ?? '').trim();

if (!name) throw new Error('PUBLIC_BRAND_NAME is not set. See README.');
if (!url) throw new Error('SITE_URL is not set. See README.');

export const brand = {
  name,
  url: url.replace(/\/$/, ''),
  email: email || null,
  tagline: 'Your go-to place for tokens.',
  promise: 'Same intelligent AI models. Cheaper API.',
};
