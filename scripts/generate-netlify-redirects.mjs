// Writes dist/_redirects for Netlify after `vite build` (postbuild).
// Every folder with its own index.html (the SEO templates in public/) gets a
// forced rewrite, so /umrli is served directly instead of being 301-redirected
// to /umrli/. Everything else falls through to the React app (index.html).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');

const pageDirs = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (fs.existsSync(path.join(full, 'index.html'))) {
      pageDirs.push('/' + path.relative(DIST, full).split(path.sep).join('/'));
    }
    walk(full);
  }
};

if (!fs.existsSync(DIST)) {
  console.warn('netlify redirects: dist/ not found, skipping');
  process.exit(0);
}

walk(DIST);
pageDirs.sort();

// Obituary photos (fotografija_url) and old logos still live on the previous
// Totohost server under /wp/wp-content/uploads and /wp-content/uploads. Since the
// domain now points to Netlify, proxy those paths to the old server instead of
// letting the SPA fallback answer them with index.html. mail.osmrtnica.com.hr
// still resolves to the Totohost server and is served by the same cPanel vhost.
const OLD_SERVER = 'http://mail.osmrtnica.com.hr';

// Retired URLs that Google still shows, moved to the page that now covers the topic.
const MOVED = [
  ['/groblja/krematorij-mirogoj', '/groblje/gaj-urni-krematorij'],
  // Old sitemap address still registered in Search Console; it rendered the SPA
  // (HTML, not XML), which GSC reports as a sitemap error.
  ['/sitemap_index.xml', '/sitemap.xml'],
];

const lines = [
  ...MOVED.map(([from, to]) => `${from} ${to} 301!`),
  `/wp/* ${OLD_SERVER}/wp/:splat 200!`,
  `/wp-content/* ${OLD_SERVER}/wp-content/:splat 200!`,
  ...pageDirs.map((p) => `${p} ${p}/index.html 200!`),
  '/* /index.html 200',
];

fs.writeFileSync(path.join(DIST, '_redirects'), lines.join('\n') + '\n');
console.log(`_redirects written (${pageDirs.length} page rewrites + SPA fallback)`);
