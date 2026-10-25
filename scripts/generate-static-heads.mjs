// Writes dist/<path>/index.html for the pages in src/lib/staticHeads.json
// (after `vite build`, before the _redirects step picks the folders up), so the
// HTML crawlers get has the page's own title, description and canonical instead
// of the generic SPA shell. The React app loads on top as usual.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://osmrtnica.com.hr';

const heads = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/staticHeads.json'), 'utf8'));
const shellPath = path.join(DIST, 'index.html');
if (!fs.existsSync(shellPath)) {
  console.warn('static heads: dist/index.html not found, skipping');
  process.exit(0);
}
const shell = fs.readFileSync(shellPath, 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Replace a tag when the shell has it, otherwise add it before </head>.
const setTag = (html, re, tag) => (re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`));

let count = 0;
for (const [route, { title, description, image }] of Object.entries(heads)) {
  const t = esc(title);
  const d = esc(description);
  const url = SITE + route;
  let html = shell;
  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" data-rh="true" content="${d}" />`);
  html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
  html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
  html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${t}" />`);
  html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${d}" />`);
  if (image) {
    html = setTag(html, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${SITE + image}" />`);
    html = setTag(html, /<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${SITE + image}" />`);
  }
  const dir = path.join(DIST, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  count++;
}
console.log(`static heads written for ${count} pages`);
