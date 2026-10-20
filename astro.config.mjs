// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';

// The canonical origin comes from the environment (an Actions secret in CI,
// a git-ignored .env locally) so the domain is not stored in this repository.
const { SITE_URL } = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), ''), ...process.env };
if (!SITE_URL) throw new Error('SITE_URL is not set. See README.');

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
});
