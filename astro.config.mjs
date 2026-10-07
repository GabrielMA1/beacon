// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gabnode.com',
  trailingSlash: 'ignore',
  build: {
    // /models/ → /models/index.html, which GitHub Pages serves without rewrites
    format: 'directory',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
