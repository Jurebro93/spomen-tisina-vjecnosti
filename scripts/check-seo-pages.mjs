// Live SEO checks for the daily site report: fetches pages from
// osmrtnica.com.hr as Googlebot and checks title, description, canonical,
// robots and the links that decide which page owns a query.
//   node scripts/check-seo-pages.mjs        (exit code 1 when a check fails)
// Added 2026-10-22 with the Zadar title, Jastrebarsko sitemap, Boninovo and
// obituary title changes.

const SITE = 'https://osmrtnica.com.hr';
const SUPABASE_URL = 'https://umpvnepxsqfkxjpclkxc.supabase.co';
// Public anon key, already shipped in the client bundle.
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHZuZXB4c3Fma3hqcGNsa3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzMyMDAsImV4cCI6MjA2ODI0OTIwMH0.iZhnC1FpAMzXujBvAwqTGhXBnNknMk_96TRNsNv77uQ';
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });

async function get(path, redirect = 'follow') {
  const res = await fetch(SITE + path, { headers: { 'user-agent': UA }, redirect });
  const html = redirect === 'follow' ? await res.text() : '';
  const pick = (re) => html.match(re)?.[1] ?? null;
  return {
    status: res.status,
    location: res.headers.get('location'),
    xRobots: res.headers.get('x-robots-tag'),
    html,
    title: pick(/<title>([^<]*)<\/title>/),
    description: pick(/<meta name="description"[^>]*content="([^"]*)"/),
    canonicals: [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]),
    robots: pick(/<meta name="robots" content="([^"]*)"/),
  };
}

const ddmm = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Zagreb' }));
  return `${d.getDate()}.${d.getMonth() + 1}.`;
};

// Indexable: 200, self canonical only, no noindex anywhere.
function indexable(label, path, p) {
  check(`${label}: status 200`, p.status === 200, String(p.status));
  check(`${label}: canonical na sebe`, p.canonicals.length > 0 && p.canonicals.every((c) => c === SITE + path), p.canonicals.join(', '));
  check(`${label}: nema noindex`, !/noindex/i.test(p.robots || '') && !/noindex/i.test(p.xRobots || ''), p.robots || p.xRobots || '');
}

async function run() {
  // 1. Zadar: new title, fresh description with today's date.
  const zadar = await get('/umrli/zadar');
  indexable('Zadar', '/umrli/zadar', zadar);
  check('Zadar: novi title', zadar.title === 'Umrli Zadar danas – osmrtnice i sprovodi u Zadru i okolici', zadar.title);
  check('Zadar: opis s današnjim datumom', zadar.description?.startsWith(`Osmrtnice Zadar, ažurirano ${ddmm()}`), zadar.description);
  check('Zadar: opis ima broj osmrtnica', /\d+ osmrtnic/.test(zadar.description || ''), zadar.description);

  // 2. Jastrebarsko: indexable, in the sitemap, shows obituaries.
  const jaska = await get('/umrli/jastrebarsko');
  indexable('Jastrebarsko', '/umrli/jastrebarsko', jaska);
  const jaskaItems = (jaska.html.match(/<main class="ssr"[\s\S]*?<\/main>/)?.[0].match(/<li><a href="\/[a-z0-9-]+">/g) || []).length;
  check('Jastrebarsko: stranica prikazuje osmrtnice', jaskaItems > 0, `${jaskaItems} osmrtnica`);
  const sitemap = await (await fetch(`${SITE}/sitemap.xml`, { headers: { 'user-agent': UA } })).text();
  check('Jastrebarsko: u sitemapu', sitemap.includes(`<loc>${SITE}/umrli/jastrebarsko</loc>`));
  const slash = await get('/umrli/jastrebarsko/', 'manual');
  check('Jastrebarsko: stari URL s / vodi 301 na novi', slash.status === 301 && /\/umrli\/jastrebarsko$/.test(slash.location || ''), `${slash.status} ${slash.location}`);

  // 3. Boninovo: /umrli/dubrovnik owns "boninovo umrli", the cemetery page links to it.
  const dbk = await get('/umrli/dubrovnik');
  indexable('Dubrovnik', '/umrli/dubrovnik', dbk);
  check('Dubrovnik: title spominje Boninovo', /Boninovo/.test(dbk.title || ''), dbk.title);
  check('Dubrovnik: link na groblje Boninovo', dbk.html.includes('href="/groblje/gradsko-boninovo"'));
  const bon = await get('/groblje/gradsko-boninovo');
  indexable('Groblje Boninovo', '/groblje/gradsko-boninovo', bon);
  check('Groblje Boninovo: title bez "Umrli"', bon.title && !/umrli/i.test(bon.title), bon.title);
  check('Groblje Boninovo: link na /umrli/dubrovnik', bon.html.includes('href="/umrli/dubrovnik"'));

  // 4. Obituary titles: newest obituaries, no ALL CAPS name, no "Osmrtnica | Osmrtnica.com.hr".
  const res = await fetch(`${SUPABASE_URL}/rest/v1/obituaries?select=slug&active=eq.true&slug=not.is.null&order=created_at.desc&limit=3`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  for (const { slug } of await res.json()) {
    const o = await get(`/${slug}`);
    indexable(`Osmrtnica /${slug}`, `/${slug}`, o);
    const name = (o.title || '').split(' (')[0].split(' – ')[0];
    check(`Osmrtnica /${slug}: title u obliku "Ime Prezime (godine) – osmrtnica"`, / – osmrtnica/.test(o.title || '') && name !== name.toUpperCase(), o.title);
    check(`Osmrtnica /${slug}: title do 60 znakova`, (o.title || '').length <= 60, String((o.title || '').length));
  }
}

try {
  await run();
} catch (e) {
  check('Skripta se izvršila', false, String(e));
}
for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} provjera prošlo`);
process.exit(failed ? 1 : 0);
