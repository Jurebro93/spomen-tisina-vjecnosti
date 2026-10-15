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

const lines = [
  ...pageDirs.map((p) => `${p} ${p}/index.html 200!`),
  '/* /index.html 200',
];

fs.writeFileSync(path.join(DIST, '_redirects'), lines.join('\n') + '\n');
console.log(`_redirects written (${pageDirs.length} page rewrites + SPA fallback)`);
