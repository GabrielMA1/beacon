#!/usr/bin/env node
/**
 * Post-build: add a Content-Security-Policy <meta> to every page in dist/.
 *
 * GitHub Pages cannot send response headers, so the policy travels in the
 * page. Scripts are locked down: same-origin files plus a SHA-256 hash for
 * each inline script on that page (computed here, so they never drift).
 * Inline style attributes are allowed because the syntax highlighter and a
 * few layout values use them; the site renders no user-supplied HTML.
 * frame-ancestors and reporting cannot be set from a meta tag.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

let count = 0;
for (const file of await walk(DIST)) {
  let html = await readFile(file, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;

  const hashes = new Set();
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc=/.test(attrs) || /type="application\/ld\+json"/.test(attrs)) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  }

  const policy = [
    "default-src 'self'",
    `script-src 'self' ${[...hashes].join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  html = html.replace(/<meta charset="utf-8"\s*\/?>/i, (m) => `${m}<meta http-equiv="Content-Security-Policy" content="${policy}">`);
  await writeFile(file, html);
  count++;
}
console.log(`CSP added to ${count} pages.`);
