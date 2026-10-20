import type { APIRoute } from 'astro';
import { brand } from '../config';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: brand.name,
      short_name: brand.name,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: '#f3f1ea',
      background_color: '#f3f1ea',
      display: 'browser',
    }),
    { headers: { 'content-type': 'application/manifest+json' } },
  );
