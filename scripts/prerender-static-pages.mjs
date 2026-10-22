// Prerenders the static pages into dist/ after `vite build` (postbuild).
// The React app renders these pages only in the browser, so crawlers that do
// not run JavaScript (Bing, Ahrefs, AI search bots, and Google before its
// render pass) get an empty <div id="root">. This script opens each page in
// headless Chromium against the built dist/, copies the rendered #root markup
// into dist/<page>/index.html, and leaves everything else in the file as it
// was, including head tags another postbuild step wrote there (so this runs
// after scripts/generate-static-heads.mjs and before the _redirects step).
// React's createRoot replaces #root on load, so visitors see the normal
// app.
//
// Dynamic hubs (/, /umrli, /sprovodi, /groblja, /gradovi, /blog) and memorial
// pages get their HTML from netlify/edge-functions/seo-content.js instead.
//
// If Chromium cannot be started or a page renders too little text, that page
// keeps its current HTML and the build continues.

import fs from 'fs';
import http from 'http';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');

const PAGES = [
  '/digitalni-memorijal',
  '/objavi-osmrtnicu',
  '/kako-objaviti-osmrtnicu',
  '/virtualne-svijece',
  '/zapali-svijecu',
  '/memorijalni-vrt',
  '/informacije',
  '/besplatni-vodic',
  '/besplatni-vodic/obiteljska-mirovina',
  '/cesto-postavljena-pitanja',
  '/uvjeti-koristenja',
  '/politika-privatnosti',
  '/kolacici',
  '/kontakt',
  '/raskid-i-povrat',
  '/prigovori',
  '/pravila-objavljivanja',
  '/prijava-sadrzaja',
];

// Below this many words the render most likely failed (spinner, error page).
const MIN_WORDS = 80;
// Lists are cut to this many items in the snapshot; the app shows the full list.
const MAX_LIST_ITEMS = 60;
const ALLOWED_HOSTS = ['127.0.0.1', 'supabase.co'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml',
};

// Serves dist/ the way Netlify does: a file, a folder's index.html, or the SPA fallback.
const serveDist = () =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const candidates = [path.join(DIST, urlPath), path.join(DIST, urlPath, 'index.html'), path.join(DIST, 'index.html')];
      const file = candidates.find((f) => f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile());
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const launchChromium = async (chromium) => {
  try {
    return await chromium.launch();
  } catch {
    console.log('prerender: installing Chromium for Playwright');
    execSync('npx playwright install chromium', { stdio: 'inherit' });
    return chromium.launch();
  }
};

// Replaces the contents of <div id="root"> (which may already hold static markup).
const replaceRoot = (html, inner) => {
  const open = html.indexOf('<div id="root">');
  if (open < 0) return null;
  const start = open + '<div id="root">'.length;
  const tag = /<\/?div\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 1;
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(0, start) + inner + html.slice(m.index);
  }
  return null;
};

const main = async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.warn('prerender: dist/index.html not found, skipping');
    return;
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.warn('prerender: playwright is not installed, skipping');
    return;
  }

  const server = await serveDist();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await launchChromium(chromium);
  } catch (e) {
    console.warn(`prerender: Chromium could not start, skipping (${e.message.split('\n')[0]})`);
    server.close();
    return;
  }

  const context = await browser.newContext({ locale: 'hr-HR' });
  // A stored "necessary only" choice keeps the cookie banner out of the snapshot.
  await context.addInitScript(() => {
    localStorage.setItem(
      'cookieConsentCategories',
      JSON.stringify({ necessary: true, analytics: false, marketing: false, decidedAt: new Date().toISOString() }),
    );
  });
  // Only the local build and Supabase data; no analytics, ads or pixels.
  await context.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith('.' + h)) ? route.continue() : route.abort();
  });

  let written = 0;
  for (const pagePath of PAGES) {
    const page = await context.newPage();
    try {
      await page.goto(origin + pagePath, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForFunction(() => document.querySelector('#root h1'), null, { timeout: 15000 }).catch(() => {});
      const { inner, words } = await page.evaluate((MAX_LIST_ITEMS) => {
        const root = document.querySelector('#root');
        const copy = root.cloneNode(true);
        copy.querySelectorAll('script, style, noscript, iframe').forEach((el) => el.remove());
        // Long data lists (e.g. every candle ever lit) would make the HTML megabytes big.
        copy.querySelectorAll('*').forEach((el) => {
          while (el.children.length > MAX_LIST_ITEMS) el.lastElementChild.remove();
        });
        return { inner: copy.innerHTML, words: (root.innerText || '').split(/\s+/).filter(Boolean).length };
      }, MAX_LIST_ITEMS);
      if (words < MIN_WORDS) {
        console.warn(`prerender: ${pagePath} rendered only ${words} words, keeping the current HTML`);
        continue;
      }
      const target = path.join(DIST, pagePath.slice(1), 'index.html');
      const base = fs.readFileSync(fs.existsSync(target) ? target : path.join(DIST, 'index.html'), 'utf8');
      const html = replaceRoot(base, inner);
      if (!html) {
        console.warn(`prerender: ${pagePath} has no <div id="root"> to fill, skipping`);
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, html);
      written += 1;
      console.log(`prerender: ${pagePath} (${words} words)`);
    } catch (e) {
      console.warn(`prerender: ${pagePath} failed, keeping the current HTML (${e.message.split('\n')[0]})`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();
  console.log(`prerender: ${written}/${PAGES.length} pages written`);
};

main().catch((e) => {
  console.warn(`prerender: skipped after an unexpected error (${e.message})`);
});
