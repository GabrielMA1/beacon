#!/usr/bin/env node
/**
 * Rendered-site audit. Run after `npm run build`:
 *
 *   npm run audit                      # checks only
 *   npm run audit -- --shots ./shots   # also save full-page screenshots
 *
 * Serves dist/ on a local port (no dev server), then for every page at
 * mobile, tablet and desktop widths checks: axe-core (WCAG 2.x A/AA and best
 * practice), console and page errors, horizontal overflow, and cumulative
 * layout shift. Exits non-zero if anything fails.
 *
 * Needs a Chromium build. Set CHROMIUM_PATH, or install one with
 * `npx playwright install chromium` and let playwright-core find it.
 */
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

const DIST = new URL('../dist/', import.meta.url).pathname;
const PAGES = ['/', '/models/', '/pricing/', '/legal/terms/', '/legal/privacy/', '/does-not-exist/'];
const WIDTHS = [
  ['mobile', 390, 844],
  ['tablet', 820, 1180],
  ['desktop', 1440, 900],
];
const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

// Mimics GitHub Pages: /path/ → /path/index.html, unknown → 404.html with status 404.
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    res.end(await readFile(join(DIST, '404.html')).catch(() => 'Not found'));
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
if (shotsDir) await mkdir(shotsDir, { recursive: true });

const failures = [];
for (const [device, width, height] of WIDTHS) {
  for (const path of PAGES) {
    // bypassCSP lets the audit inject axe-core; the page's own CSP still applies to its scripts.
    const context = await browser.newContext({ viewport: { width, height }, bypassCSP: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !m.text().includes('404') && errors.push(m.text()));
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const cls = await page.evaluate(() => window.__cls);
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] });
      return r.violations.map((v) => `${v.impact} ${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    });

    const label = `${device.padEnd(7)} ${path}`;
    const problems = [
      ...violations.map((v) => `axe ${v}`),
      ...errors.map((e) => `js ${e}`),
      ...(overflow > 0 ? [`horizontal overflow ${overflow}px`] : []),
      ...(cls > 0.05 ? [`layout shift ${cls.toFixed(3)}`] : []),
    ];
    console.log(problems.length ? `✗ ${label}\n    ${problems.join('\n    ')}` : `✓ ${label}  (CLS ${cls.toFixed(3)})`);
    if (problems.length) failures.push(label);

    if (shotsDir) {
      const name = `${device}-${path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'home'}.png`;
      await page.screenshot({ path: join(shotsDir, name), fullPage: true });
    }
    await context.close();
  }
}

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} page/width combinations failed.` : '\nAll pages passed.');
process.exit(failures.length ? 1 : 0);
