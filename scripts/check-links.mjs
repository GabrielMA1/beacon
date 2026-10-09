#!/usr/bin/env node
/**
 * Static link check over dist/ (run after `npm run build`; also runs in CI).
 *
 * - Every internal href/src resolves to a file in dist/.
 * - Every #fragment link points at an id that exists on the target page.
 * - External links only go to an allowlist of hosts we intend to link to.
 * - No page links to http:// (insecure) URLs.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const ALLOWED_HOSTS = new Set(['gabnode.com', 'api.gabnode.com', 'docs.gabnode.com', 'dashboard.gabnode.com']);
const SITE = 'https://gabnode.com';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

const exists = async (p) => stat(p).then(() => true, () => false);
async function resolve(urlPath) {
  const p = join(DIST, decodeURIComponent(urlPath));
  if (urlPath.endsWith('/')) return (await exists(join(p, 'index.html'))) ? join(p, 'index.html') : null;
  if (await exists(p)) return (await stat(p)).isDirectory() ? ((await exists(join(p, 'index.html'))) ? join(p, 'index.html') : null) : p;
  return null;
}

const pages = await walk(DIST);
const idsByFile = new Map();
const idsOf = async (file) => {
  if (!idsByFile.has(file)) {
    const html = await readFile(file, 'utf8');
    idsByFile.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsByFile.get(file);
};

const problems = [];
let checked = 0;
for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const pageUrl = '/' + relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');
  for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const value = raw.replace(/&amp;/g, '&');
    if (!value || value.startsWith('data:') || value.startsWith('mailto:')) continue;
    checked++;
    let url;
    try {
      url = new URL(value, SITE + pageUrl);
    } catch {
      problems.push(`${pageUrl}: unparseable ${attr} "${value}"`);
      continue;
    }
    if (url.protocol === 'http:') problems.push(`${pageUrl}: insecure link ${value}`);
    if (url.hostname !== 'gabnode.com') {
      if (!ALLOWED_HOSTS.has(url.hostname)) problems.push(`${pageUrl}: external host not in allowlist: ${value}`);
      continue;
    }
    const target = await resolve(url.pathname);
    if (!target) {
      problems.push(`${pageUrl}: broken ${attr} ${value}`);
      continue;
    }
    if (url.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!(await idsOf(target)).has(id)) problems.push(`${pageUrl}: missing anchor ${value}`);
    }
  }
}

console.log(`Checked ${checked} links on ${pages.length} pages.`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('No broken or unexpected links.');
