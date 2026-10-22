// Generates public/sitemap.xml from the live Supabase data.
// Runs automatically before `vite dev` and `vite build` (predev / prebuild).
// Only indexable, canonical, public URLs are included.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'https://osmrtnica.com.hr';
const SUPABASE_URL = 'https://umpvnepxsqfkxjpclkxc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHZuZXB4c3Fma3hqcGNsa3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzMyMDAsImV4cCI6MjA2ODI0OTIwMH0.iZhnC1FpAMzXujBvAwqTGhXBnNknMk_96TRNsNv77uQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const citySlug = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/ž/g, 'z')
    .replace(/š/g, 's')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/digitalni-memorijal', changefreq: 'weekly', priority: '0.9' },
  { path: '/umrli', changefreq: 'daily', priority: '0.8' },
  { path: '/objavi-osmrtnicu', changefreq: 'monthly', priority: '0.8' },
  { path: '/kako-objaviti-osmrtnicu', changefreq: 'monthly', priority: '0.6' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  { path: '/virtualne-svijece', changefreq: 'daily', priority: '0.7' },
  { path: '/zapali-svijecu', changefreq: 'monthly', priority: '0.7' },
  { path: '/memorijalni-vrt', changefreq: 'weekly', priority: '0.7' },
  { path: '/informacije', changefreq: 'monthly', priority: '0.5' },
  { path: '/besplatni-vodic', changefreq: 'monthly', priority: '0.6' },
  { path: '/besplatni-vodic/obiteljska-mirovina', changefreq: 'monthly', priority: '0.6' },
  { path: '/cesto-postavljena-pitanja', changefreq: 'monthly', priority: '0.5' },
  { path: '/uvjeti-koristenja', changefreq: 'yearly', priority: '0.3' },
  { path: '/politika-privatnosti', changefreq: 'yearly', priority: '0.3' },
  { path: '/kolacici', changefreq: 'yearly', priority: '0.3' },
];

// Paginate past the 1000-row PostgREST limit.
async function fetchAll(table, columns, apply = (q) => q) {
  const rows = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await apply(
      supabase.from(table).select(columns).range(from, from + size - 1),
    );
    if (error) {
      console.warn(`sitemap: skipping ${table} (${error.message})`);
      return rows;
    }
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
}

const isoDay = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0];
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

async function build() {
  const entries = [];
  const seen = new Set();

  const add = (pagePath, meta = {}) => {
    if (!pagePath || seen.has(pagePath)) return;
    seen.add(pagePath);
    entries.push({ loc: `${BASE_URL}${pagePath}`, ...meta });
  };

  STATIC_PAGES.forEach((page) => add(page.path, page));

  // Obituaries (public, active) — canonical URL is /{slug}
  const obituaries = await fetchAll(
    'obituaries',
    'slug, updated_at, mjesto_smrti',
    (q) => q.eq('active', true).not('slug', 'is', null),
  );
  obituaries.forEach((row) => {
    if (row.slug) {
      add(`/${row.slug}`, {
        lastmod: isoDay(row.updated_at),
        changefreq: 'monthly',
        priority: '0.5',
      });
    }
  });

  // City landing pages, only for cities that actually have obituaries
  const cityCounts = new Map();
  obituaries.forEach((row) => {
    const slug = row.mjesto_smrti ? citySlug(row.mjesto_smrti) : '';
    if (slug) cityCounts.set(slug, (cityCounts.get(slug) ?? 0) + 1);
  });
  [...cityCounts.entries()]
    .filter(([, count]) => count >= 3)
    .forEach(([slug]) => {
      add(`/umrli/${slug}`, { changefreq: 'daily', priority: '0.7' });
      add(`/sprovodi/${slug}`, { changefreq: 'daily', priority: '0.6' });
    });
  // Cities we optimise titles for (src/lib/seoCityTest.ts) stay listed while
  // they have any obituary: /umrli/jastrebarsko (2 obituaries) ranked in
  // Google but was missing from the sitemap.
  const testFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'seoCityTest.ts'), 'utf8');
  const testList = testFile.match(/TEST_CITIES = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
  [...testList.matchAll(/'([a-z0-9-]+)'/g)]
    .map((m) => m[1])
    .filter((slug) => (cityCounts.get(slug) ?? 0) >= 1)
    .forEach((slug) => add(`/umrli/${slug}`, { changefreq: 'daily', priority: '0.7' }));

  // Public, published memorials
  const memorials = await fetchAll('memorials', 'slug, updated_at, status, visibility');
  memorials
    .filter((m) => m.slug && m.status === 'published' && m.visibility === 'public')
    .forEach((m) =>
      add(`/memorijal/${m.slug}`, {
        lastmod: isoDay(m.updated_at),
        changefreq: 'weekly',
        priority: '0.7',
      }),
    );

  // Blog posts
  const blogs = await fetchAll('blogs', 'slug, updated_at');
  blogs.forEach((b) => {
    if (b.slug) {
      add(`/blog/${b.slug}`, {
        lastmod: isoDay(b.updated_at),
        changefreq: 'monthly',
        priority: '0.6',
      });
    }
  });

  // Cemeteries — only those with a description (the app only generates a page
  // for those). Slug logic mirrors slugifyCemeteryName in src/lib/cemeteries.ts.
  const cemeterySlug = (name) => {
    let s = citySlug(String(name).replace(/[čćžšđČĆŽŠĐ]/g, (c) => ({ č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'd', Č: 'c', Ć: 'c', Ž: 'z', Š: 's', Đ: 'd' })[c] || c));
    s = s.replace(/-?\b(gradsko|mjesno|novo|staro|centralno|glavno|zupno|katolicko)?-?groblje\b-?/g, '-');
    return s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  };
  const cemeteries = await fetchAll('groblja_i_opisi', '"Naziv groblja", "Grad", "Opis"', (q) =>
    q.order('Naziv groblja', { ascending: true }),
  );
  const usedCemeterySlugs = new Set();
  cemeteries.forEach((row) => {
    const naziv = row['Naziv groblja']?.trim();
    const opis = row.Opis?.trim();
    if (!naziv || !opis) return;
    const base = cemeterySlug(naziv) || 'groblje';
    let slug = base;
    let counter = 1;
    while (usedCemeterySlugs.has(slug)) {
      counter += 1;
      slug = `${base}-${counter}`;
    }
    usedCemeterySlugs.add(slug);
    add(`/groblje/${slug}`, { changefreq: 'monthly', priority: '0.5' });
    if (row.Grad?.trim()) {
      add(`/groblja/${citySlug(row.Grad)}`, { changefreq: 'monthly', priority: '0.5' });
    }
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) =>
      [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
        entry.priority ? `    <priority>${entry.priority}</priority>` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    '</urlset>',
  ].join('\n');

  fs.writeFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), xml);
  console.log(`sitemap.xml written (${entries.length} URLs)`);
}

build().catch((error) => {
  console.error('sitemap generation failed:', error);
  // Never break dev/build because of a sitemap problem.
  process.exit(0);
});
