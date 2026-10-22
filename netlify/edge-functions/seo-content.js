// Server-side content for the SPA. The React app renders everything in the
// browser, so crawlers that do not run JavaScript (and Google before its
// render pass) see an empty <div id="root">. This edge function fetches the
// same Supabase data the page uses and writes the title, description,
// canonical, JSON-LD and a plain HTML version of the page content into the
// HTML. React's createRoot replaces #root on load, so visitors end up with
// the normal app and see the same data.
//
// Covered: the homepage, the hubs /umrli, /sprovodi, /groblja, /gradovi and
// /blog, /umrli/:grad, /sprovodi/:grad, /groblja/:grad, /groblje/:slug,
// /blog/:slug, /memorijal/:slug, the month archives /umrli/:grad/:godina/:mjesec
// and obituary pages /:slug. Anything else, any
// non-200 response and any Supabase error fall through unchanged.

const SUPABASE_URL = 'https://umpvnepxsqfkxjpclkxc.supabase.co';
// Public anon key, already shipped in the client bundle.
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHZuZXB4c3Fma3hqcGNsa3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzMyMDAsImV4cCI6MjA2ODI0OTIwMH0.iZhnC1FpAMzXujBvAwqTGhXBnNknMk_96TRNsNv77uQ';
const SITE = 'https://osmrtnica.com.hr';
const FETCH_TIMEOUT_MS = 2500;

// Single-segment paths that are app pages, not obituary slugs.
const APP_PAGES = new Set([
  'umrli', 'gradovi', 'sprovodi', 'groblja', 'memorijalni-vrt', 'digitalni-memorijal', 'memorijali',
  'kreiraj-memorijal', 'zahvaljujemo', 'moji-memorijali', 'prijava', 'registracija', 'reset-password',
  'moj-racun', 'informacije', 'blog', 'virtualne-svijece', 'zapali-svijecu', 'objavi-osmrtnicu',
  'obituary-success', 'pretraga', 'kako-objaviti-osmrtnicu', 'cesto-postavljena-pitanja',
  'uvjeti-koristenja', 'politika-privatnosti', 'kolacici', 'kontakt', 'raskid-i-povrat', 'prigovori',
  'pravila-objavljivanja', 'prijava-sadrzaja', 'homepage-2', 'homepage-3', 'admin', 'auth',
  'sitemap_index.xml', 'osmrtnica', 'memorijal', 'memorijal-primjer',
]);

const MONTHS = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca'];

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Some imported text is stored HTML-escaped (Gradsko groblje &quot;VLAKOVO&quot;), sometimes twice.
const ENTITIES = { amp: '&', quot: '"', apos: "'", '#39': "'", '#039': "'", nbsp: ' ' };
const decode = (v) => {
  let out = String(v ?? '');
  for (let i = 0; i < 3 && /&(amp|quot|apos|#0?39|nbsp);/.test(out); i += 1) out = out.replace(/&(amp|quot|apos|#0?39|nbsp);/g, (_, e) => ENTITIES[e]);
  return out;
};

const stripTags = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const hrDate = (iso) => {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}.`;
};

// Birth and death dates: the import stores a year it has no day for as 1 January,
// so show those as the year alone (same rule as formatObituaryDate in src/lib/utils.ts).
const lifeDate = (iso) => {
  if (!iso) return '';
  const raw = String(iso).slice(0, 10);
  if (/^\d{4}-01-01$/.test(raw)) return `${raw.slice(0, 4)}.`;
  return hrDate(raw);
};

const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

const age = (born, died) => {
  if (!born || !died) return null;
  const b = new Date(born);
  const d = new Date(died);
  if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) return null;
  let a = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a -= 1;
  return a >= 0 && a < 130 ? a : null;
};

const DIACRITICS = { č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'd' };
const fold = (s) => String(s || '').trim().toLowerCase().replace(/[čćžšđ]/g, (c) => DIACRITICS[c] || c);

// Mirrors src/lib/cemeteries.ts so /groblje/:slug resolves to the same row.
const slugifyCemeteryName = (name) => {
  let s = fold(name);
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/\b(gradsko|mjesno|novo|staro|centralno|glavno|zupno|katolicko)?\s*groblje\b/g, ' ');
  return s.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
};
const withGrobljePrefix = (naziv) => (/\bgroblj/.test(fold(naziv)) ? naziv : `Groblje ${naziv}`);

const todayZagreb = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const shiftDays = (ymd, days) => {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function sb(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Same as src/lib/cityMatch.ts: ASCII slugs (/umrli/metkovic) must match
// "Metković", hyphens must match spaces.
const CLASSES = { c: '[cčć]', s: '[sš]', z: '[zž]', d: '[dđ]' };
const cityPattern = (city) =>
  fold(city)
    .split('')
    .map((ch) => CLASSES[ch] ?? (/[a-z0-9]/.test(ch) ? ch : '[- ]'))
    .join('');
// Same list as CITY_ALIASES in src/lib/cityMatch.ts; keep them in sync.
const CITY_ALIASES = {
  split: ['lovrinac'],
  zadar: ['zadru', 'belafuža'],
  zagreb: ['mirogoj', 'miroševac', 'markovo polje'],
  rijeka: ['rijeci', 'drenova', 'kozala'],
  dubrovnik: ['boninovo'],
  karlovac: ['karlovcu'],
  sisak: ['sisku'],
  'slavonski-brod': ['slavonskom brodu'],
};
const cityOr = (city, cols) => {
  const slug = fold(city).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pattern = [city, ...(CITY_ALIASES[slug] ?? [])].map(cityPattern).join('|');
  const v = encodeURIComponent(`"${pattern}"`);
  return `or=(${cols.map((c) => `${c}.imatch.${v}`).join(',')})`;
};

const dedupe = (rows) => {
  const seen = new Set();
  return rows.filter((o) => {
    const k = `${fold(o.ime)}|${fold(o.prezime)}|${o.datum_smrti || ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// Same as CITY_EXCLUDE / isOtherPlace in src/lib/cityMatch.ts; keep them in sync.
const CITY_EXCLUDE = { varazdin: ['varaždinsk'], split: ['splitsk'], imotski: ['imotskim poljic', 'imotska poljic'] };
const isOtherPlace = (place, city) => {
  const excluded = CITY_EXCLUDE[fold(city).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')];
  if (!excluded || !place) return false;
  const exclude = new RegExp(excluded.map(cityPattern).join('|'), 'gi');
  if (!new RegExp(exclude.source, 'i').test(place)) return false;
  const slug = fold(city).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return !new RegExp([city, ...(CITY_ALIASES[slug] ?? [])].map(cityPattern).join('|'), 'i').test(place.replace(exclude, ' '));
};

// PostgREST returns at most 1000 rows per request.
async function sbAll(path) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await sb(`${path}&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

// ---------- obituary meta description: copy of src/lib/obituaryMeta.ts, keep them in sync ----------
const COUNTRIES = new Set([
  'bosna i hercegovina', 'bih', 'hrvatska', 'republika hrvatska', 'njemacka', 'austrija', 'srbija',
  'slovenija', 'crna gora', 'svicarska', 'italija', 'francuska', 'sad', 'kanada', 'australija', 'svedska',
]);
const obituaryPlace = (place) => {
  const p = String(place || '').trim();
  return p && !COUNTRIES.has(fold(p)) ? p : null;
};
// Every stored description so far came from the old import: "Osmrtnica za Ime
// Prezime" alone, or followed by the notice text cut off mid-word.
const OLD_IMPORT = /^Osmrtnica za /;
const DESC_TAILS = [
  'Pročitajte osmrtnicu, zapalite virtualnu svijeću i ostavite sjećanje na pokojnika.',
  'Zapalite virtualnu svijeću i ostavite sjećanje.',
  'Zapalite svijeću.',
  '',
];
const obituaryDescription = (o) => {
  const own = o.meta_description?.trim();
  if (own && !OLD_IMPORT.test(own) && own.length >= 110 && own.length <= 160) return own;
  const year = (iso) => (iso && /^\d{4}/.test(iso) ? String(iso).slice(0, 4) : '');
  const born = year(o.datum_rodenja);
  const died = year(o.datum_smrti);
  const years = born && died ? ` (${born}. – ${died}.)` : died ? ` († ${died}.)` : '';
  const place = obituaryPlace(o.mjesto_smrti);
  const head = `Osmrtnica: ${nameCase(`${o.ime} ${o.prezime}`)}${years}${place ? `, ${place}` : ''}.`;
  const [y, m, d] = String(o.datum_ukopa || '').slice(0, 10).split('-').map(Number);
  const date = o.datum_ukopa && y && m && d ? `${d}. ${m}. ${y}.` : '';
  let time = (o.vrijeme_ukopa || String(o.datum_ukopa || '').replace(' ', 'T').slice(11, 16) || '').slice(0, 5);
  if (time === '00:00') time = '';
  const cemetery = decode(stripTags(o.groblje));
  const funerals = date
    ? [cemetery ? `Sprovod ${date}${time ? ` u ${time}` : ''}, ${cemetery}.` : '', `Sprovod ${date}${time ? ` u ${time}` : ''}.`, '']
    : [cemetery ? `Ukop: ${cemetery}.` : '', ''];
  for (const funeral of funerals) {
    for (const tail of DESC_TAILS) {
      const text = [head, funeral, tail].filter(Boolean).join(' ');
      if (text.length <= 155) return text;
    }
  }
  return head.length <= 155 ? head : `${head.slice(0, 154).replace(/\s+\S*$/, '')}…`;
};

// Same as obituaryTitle / nameCase in src/lib/obituaryMeta.ts; keep them in sync.
function nameCase(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  if (n !== n.toUpperCase()) return n;
  return n.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}
const OLD_IMPORT_TITLE = / - Osmrtnica$/;
const obituaryTitle = (o) => {
  const own = o.meta_title?.trim();
  if (own && !OLD_IMPORT_TITLE.test(own) && own.length <= 70) return own;
  const year = (iso) => (iso && /^\d{4}/.test(iso) ? String(iso).slice(0, 4) : '');
  const born = year(o.datum_rodenja);
  const died = year(o.datum_smrti);
  const years = born && died ? ` (${born}. – ${died}.)` : died ? ` († ${died}.)` : '';
  const name = nameCase(`${o.ime} ${o.prezime}`);
  for (const text of [`${name}${years} – osmrtnica i sprovod`, `${name}${years} – osmrtnica`, `${name} – osmrtnica`]) {
    if (text.length <= 60) return text;
  }
  return name;
};

// ---------- month archives: same as src/lib/obituaryArchive.ts ----------
const NATIONAL = 'arhiva';
const FIRST_MONTH = '2022-01';
const MONTH_NAMES = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'];
const monthLabel = (ym) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}.`;
const nextMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};
const prevMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};
const currentMonth = () => todayZagreb().slice(0, 7);
const allMonths = () => {
  const months = [];
  for (let ym = FIRST_MONTH; ym <= currentMonth(); ym = nextMonth(ym)) months.push(ym);
  return months.reverse();
};
const monthLinks = (base, months) =>
  `<ul>${months
    .map(({ ym, count }) => `<li><a href="${base}/${ym.slice(0, 4)}/${ym.slice(5, 7)}">${monthLabel(ym)}</a>${count ? ` (${count})` : ''}</li>`)
    .join('')}</ul>`;

async function cityMonths(city) {
  const rows = await sbAll(`obituaries?select=datum_smrti,mjesto_smrti&${cityOr(city, ['mjesto_smrti'])}&datum_smrti=not.is.null&order=datum_smrti.desc`);
  const counts = new Map();
  for (const r of rows) {
    if (isOtherPlace(r.mjesto_smrti, city)) continue;
    const ym = String(r.datum_smrti).slice(0, 7);
    counts.set(ym, (counts.get(ym) || 0) + 1);
  }
  return [...counts].map(([ym, count]) => ({ ym, count })).sort((a, b) => b.ym.localeCompare(a.ym));
}

async function fetchCemeteries() {
  const rows = await sb('groblja_i_opisi?select=*&order=%22Naziv%20groblja%22.asc');
  const used = new Set();
  return rows
    .filter((r) => r['Naziv groblja'])
    .map((r) => {
      const naziv = String(r['Naziv groblja']).trim();
      const opis = r.Opis?.trim() || null;
      let slug = null;
      if (opis) {
        const base = slugifyCemeteryName(naziv) || 'groblje';
        let candidate = base;
        let n = 1;
        while (used.has(candidate)) {
          n += 1;
          candidate = `${base}-${n}`;
        }
        used.add(candidate);
        slug = candidate;
      }
      return {
        naziv,
        displayNaziv: withGrobljePrefix(naziv),
        grad: r.Grad?.trim() || null,
        adresa: r.Adresa?.trim() || null,
        telefon: r['Kontakt broj']?.trim() || null,
        radnoVrijeme: r['Radno vrijeme']?.trim() || null,
        opis,
        slug,
      };
    });
}

const slugify = (v) =>
  fold(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cemeteriesInCity = (all, city) => all.filter((c) => c.grad && slugify(c.grad) === slugify(city));

// "metkovic" -> "Metković" as written in the data, else "Slavonski Brod" from the slug.
async function cityName(param) {
  const label = decodeURIComponent(param)
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  try {
    const pattern = encodeURIComponent(`^${cityPattern(label)}$`);
    const rows = await sb(`obituaries?select=mjesto_smrti&mjesto_smrti=imatch.${pattern}&limit=1`);
    if (rows[0]?.mjesto_smrti?.trim()) return rows[0].mjesto_smrti.trim();
    // Cities known only from funeral schedules (Čakovec) still get their real spelling.
    const scheduled = await sb(`sprovodi?select=grad&grad=imatch.${pattern}&limit=1`);
    return scheduled[0]?.grad?.trim() || label;
  } catch {
    return label;
  }
}

// 1 godina, 2–4 godine, 5+ godina (but 12–14 godina); same rule as src/lib/hr.ts.
const godine = (n) => {
  const last = n % 10, lastTwo = n % 100;
  return `${n} ${last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'godine' : 'godina'}`;
};

const obituaryItem = (o) => {
  const a = age(o.datum_rodenja, o.datum_smrti);
  const bits = [
    o.datum_rodenja && o.datum_smrti ? `${lifeDate(o.datum_rodenja)} – ${lifeDate(o.datum_smrti)}` : o.datum_smrti ? `preminuo/la ${lifeDate(o.datum_smrti)}` : '',
    a !== null ? godine(a) : '',
    o.mjesto_smrti ? esc(o.mjesto_smrti) : '',
    o.datum_ukopa ? `sprovod ${hrDate(o.datum_ukopa)}${o.vrijeme_ukopa ? ' u ' + hhmm(o.vrijeme_ukopa) : ''}${o.groblje ? ', ' + esc(o.groblje) : ''}` : '',
  ].filter(Boolean);
  const name = `${esc(o.ime)} ${esc(o.prezime)}`;
  const link = o.slug ? `<a href="/${esc(o.slug)}">${name}</a>` : name;
  return `<li>${link}${bits.length ? ' – ' + bits.join(', ') : ''}</li>`;
};

const cemeteryItem = (c) => {
  const name = c.slug ? `<a href="/groblje/${esc(c.slug)}">${esc(c.displayNaziv)}</a>` : esc(c.displayNaziv);
  const bits = [c.adresa, c.telefon ? `tel. ${c.telefon}` : '', c.radnoVrijeme ? `radno vrijeme: ${c.radnoVrijeme}` : '']
    .filter(Boolean)
    .map(esc);
  return `<li>${name}${bits.length ? ' – ' + bits.join(', ') : ''}</li>`;
};

const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
});

// This HTML is for crawlers that do not run JavaScript. Visitors' browsers run
// the app, so for them the plain list is hidden (it flashed in the background
// while the page loaded) and a quiet loading view shows until React replaces
// #root. If the app has not started after 8 seconds the list is shown after
// all, so a failed script never leaves an empty page.
const SSR_STYLE = `<style>
.ssr-js .ssr{display:none}
.ssr-wait{display:none}
.ssr-js .ssr-wait{display:flex;justify-content:center;padding:6rem 1rem}
.ssr-wait span{width:2.5rem;height:2.5rem;border-radius:50%;border:3px solid #eee;border-top-color:#d4a72c;animation:ssr-spin 1s linear infinite}
@keyframes ssr-spin{to{transform:rotate(360deg)}}
.ssr-head{background:#000}
.ssr-head a{display:inline-block;padding:1rem;color:#fff;text-decoration:none;font:600 1.25rem 'Playfair Display',Georgia,serif}
.ssr{max-width:56rem;margin:0 auto;padding:1.5rem 1rem 3rem;color:#222;font:16px/1.6 Inter,system-ui,sans-serif}
.ssr h1{font:600 2rem/1.2 'Playfair Display',Georgia,serif;margin:.5rem 0 1rem;color:#000}
.ssr h2{font:600 1.4rem/1.3 'Playfair Display',Georgia,serif;margin:2rem 0 .75rem;color:#000}
.ssr p{margin:0 0 1rem}
.ssr ul{list-style:none;margin:0 0 1rem;padding:0}
.ssr li{padding:.6rem 0;border-bottom:1px solid #eee;color:#555}
.ssr li a{font-weight:600}
.ssr a{color:#000;text-decoration:underline;text-decoration-color:#d4a72c;text-underline-offset:3px}
.ssr nav{font-size:.875rem;color:#666;margin-bottom:.5rem}
.ssr img{max-width:100%;height:auto}
.ssr footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:.875rem}
</style>`;

const SSR_JS =
  '<script>(function(){var h=document.documentElement;h.classList.add("ssr-js");' +
  'setTimeout(function(){if(document.querySelector("[data-ssr]"))h.classList.remove("ssr-js")},8000)})()</script>';

// The app's menu and footer, so pages link to the main sections before JavaScript runs.
const SSR_NAV = [
  ['/umrli', 'Umrli'], ['/sprovodi', 'Sprovodi'], ['/groblja', 'Groblja'], ['/gradovi', 'Gradovi'], ['/blog', 'Blog'],
  ['/objavi-osmrtnicu', 'Objavi osmrtnicu'], ['/digitalni-memorijal', 'Digitalni memorijal'], ['/virtualne-svijece', 'Virtualne svijeće'],
];
const SSR_FOOTER = [
  ['/umrli/zagreb', 'Umrli Zagreb'], ['/umrli/split', 'Umrli Split'], ['/umrli/rijeka', 'Umrli Rijeka'], ['/umrli/osijek', 'Umrli Osijek'],
  ['/umrli/zadar', 'Umrli Zadar'],
  ['/kako-objaviti-osmrtnicu', 'Kako objaviti osmrtnicu'], ['/cesto-postavljena-pitanja', 'Česta pitanja'], ['/informacije', 'Informacije'],
  ['/kontakt', 'Kontakt'], ['/uvjeti-koristenja', 'Uvjeti korištenja'], ['/politika-privatnosti', 'Politika privatnosti'],
];
const navLinks = (items) => items.map(([href, label]) => `<a href="${href}">${label}</a>`).join(' · ');

const page = (body) =>
  `${SSR_STYLE}${SSR_JS}<header class="ssr-head"><a href="/">Osmrtnica.com.hr</a></header>` +
  `<div class="ssr-wait" aria-hidden="true"><span></span></div>` +
  `<main class="ssr" data-ssr="1"><nav aria-label="Glavni izbornik">${navLinks(SSR_NAV)}</nav>${body}` +
  `<footer><p>${navLinks(SSR_FOOTER)}</p></footer></main>`;

// ---------- title/H1/H2 test: copy of src/lib/seoCityTest.ts, keep them in sync ----------
const TEST_CITIES = new Set([
  // Test 1: cities that had the generic "Umrli | Pretraživanje osmrtnica" title
  'biograd-na-moru', 'blato', 'boruce-kastel-luksic', 'busovaca', 'buzet', 'distrikt-brcko', 'drnis',
  'durdevac', 'erdut', 'fojnica', 'groblje-bartulusa-drinovci', 'hvar', 'imotski', 'jastrebarsko',
  'kastela', 'kiseljak', 'metkovic', 'nasice', 'novi-travnik', 'odzak', 'otocac', 'otok', 'pag', 'pazin',
  'popovaca', 'prijedor', 'prijepolje', 'primosten', 'privlaka', 'rovinj-rovigno', 'sinj', 'slatinama',
  'solin', 'supetr', 'sv', 'sveta-nedjelja', 'sveti-ivan-zelina', 'varazdinske-toplice', 'velika-gorica',
  'vinkovci', 'vir', 'vitez', 'vrpolje', 'zmijavci',
  // Test 2: large cities that already had their own title
  'dubrovnik', 'osijek', 'pula', 'rijeka', 'sisak', 'split',
  // Moved out of the control group on 2026-10-22: 37,966 impressions at
  // position 4.4 with 0.8 % CTR. Leave Zadar out of the test comparison.
  'zadar',
]);

// Titles written for the main queries of a city; others use the template.
const TITLE_OVERRIDES = {
  osijek: 'Umrli Osijek danas – osmrtnice, ukopi i sprovodi',
  dubrovnik: 'Umrli Dubrovnik danas – osmrtnice, Boninovo i sprovodi',
  metkovic: 'Umrli Metković i okolna mjesta – osmrtnice danas',
  // Top query is "umrli u zadru"; "okolica" covers "umrli zadarska županija".
  zadar: 'Umrli Zadar danas – osmrtnice i sprovodi u Zadru i okolici',
};

const isTestCity = (slug) => !!slug && TEST_CITIES.has(slug);

const testCityTitle = (slug, city) =>
  TITLE_OVERRIDES[slug] ?? `Umrli ${city} danas – osmrtnice i raspored sprovoda`;

const ddmm = (d) => `${d.getDate()}.${d.getMonth() + 1}.`;

// Croatian number agreement: 1 osmrtnica, 3 osmrtnice, 5 osmrtnica.
const plural = (n, one, few, many) => {
  const d = n % 10, h = n % 100;
  if (d === 1 && h !== 11) return `${n} ${one}`;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
};

/** Description with the update date and counts: freshness is why people click "umrli danas". */
const testCityDescription = (city, obituaries, funerals, today = new Date()) => {
  const parts = [`Osmrtnice ${city}, ažurirano ${ddmm(today)}`];
  const counts = [];
  if (obituaries > 0) counts.push(`${plural(obituaries, 'osmrtnica', 'osmrtnice', 'osmrtnica')} ovaj mjesec`);
  if (funerals > 0) counts.push(`${plural(funerals, 'sprovod', 'sprovoda', 'sprovoda')} ovaj tjedan`);
  // ddmm ends with a dot, so no extra full stop after the date.
  return `${parts[0]}${counts.length ? `: ${counts.join(', ')}.` : ''} Vrijeme i groblje ukopa, raspored sprovoda i virtualna svijeća.`;
};

const testCityH1 = (city) => `Umrli ${city} – osmrtnice danas`;

const CITY_INTROS = {
  dubrovnik: {
    text: 'Umrli i raspored sprovoda na Boninovu i ostalim dubrovačkim grobljima, osvježeno svaki dan.',
    href: '/groblje/gradsko-boninovo',
    label: 'Groblje Boninovo – adresa i radno vrijeme',
  },
};

// ---------- page builders: each returns { title, description, canonical, body, jsonld[], noindex } ----------

async function umrliCity(param) {
  let city = await cityName(param);
  const path = `/umrli/${param}`;
  const [obits, cems, months] = await Promise.all([
    sb(
      `obituaries?select=ime,prezime,datum_rodenja,datum_smrti,datum_ukopa,vrijeme_ukopa,mjesto_smrti,groblje,slug&${cityOr(city, [
        'mjesto_smrti', 'mjesto_rodenja', 'groblje', 'mjesna_zajednica',
      ])}&order=datum_ukopa.desc.nullslast&limit=80`,
    ),
    fetchCemeteries(),
    cityMonths(city).catch(() => []),
  ]);
  const list = dedupe(obits).slice(0, 60);
  const cityCems = cemeteriesInCity(cems, city);
  if (cityCems[0]?.grad) city = cityCems[0].grad;
  const test = isTestCity(param);
  let title = `Umrli ${city} | Osmrtnice i spomen pokojnika u ${city}`;
  let description = `Osmrtnice i umrli u gradu ${city}: najnovije osmrtnice, raspored sprovoda i groblja. Zapalite virtualnu svijeću i sačuvajte uspomenu na pokojnika.`;
  if (test) {
    // Same counts as the page: deaths this month, funerals since Monday.
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const mondayKey = monday.toISOString().slice(0, 10);
    const thisMonth = list.filter((o) => (o.datum_smrti || '').startsWith(monthKey)).length;
    const thisWeek = list.filter((o) => (o.datum_ukopa || '') >= mondayKey).length;
    title = testCityTitle(param, city);
    description = testCityDescription(city, thisMonth, thisWeek, now);
  }
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/umrli">Umrli</a> / ${esc(city)}</nav>
<h1>${esc(test ? testCityH1(city) : `Umrli ${city}: osmrtnice`)}</h1>
<p>Najnovije osmrtnice i obavijesti o smrti za ${esc(city)} i okolicu, s datumom i mjestom sprovoda.</p>
${CITY_INTROS[param] ? `<p>${esc(CITY_INTROS[param].text)} <a href="${CITY_INTROS[param].href}">${esc(CITY_INTROS[param].label)}</a></p>` : ''}
<h2>${esc(test ? `Osmrtnice ${city} – danas i jučer` : `Najnovije osmrtnice – ${city}`)}</h2>
${list.length ? `<ul>${list.map(obituaryItem).join('')}</ul>` : '<p>Trenutno nema objavljenih osmrtnica za ovaj grad.</p>'}
<p><a href="/sprovodi/${esc(param)}">Raspored sprovoda ${esc(city)}</a> · <a href="/groblja/${esc(param)}">Groblja ${esc(city)}</a></p>
${cityCems.length ? `<h2>Groblja u gradu ${esc(city)}</h2><ul>${cityCems.map(cemeteryItem).join('')}</ul>` : ''}
${months.length ? `<h2>Arhiva osmrtnica – ${esc(city)}</h2>${monthLinks(`/umrli/${esc(param)}`, months)}` : ''}
<p><a href="/digitalni-memorijal">Digitalni memorijal</a>: trajna spomen-stranica s pričom, fotografijama i sjećanjima obitelji.</p>`);
  return {
    title, description, canonical: SITE + path, body, noindex: list.length === 0, forceHead: test,
    jsonld: [breadcrumbLd([['Početna', '/'], ['Umrli', '/umrli'], [city, path]])],
  };
}

async function sprovodiCity(param) {
  let city = await cityName(param);
  const path = `/sprovodi/${param}`;
  const today = todayZagreb();
  const isZagreb = fold(city) === 'zagreb';
  const funeralsQ = isZagreb
    ? sb(`sprovodi?select=ime,prezime,godina,groblje,tip_sprovoda,datum_sprovoda,vrijeme_sprovoda&grad=eq.Zagreb&izvor=eq.gradska-groblja-zagreb&datum_sprovoda=gte.${today}&order=datum_sprovoda.asc,vrijeme_sprovoda.asc&limit=150`)
    : Promise.all([
      sb(`obituaries?select=ime,prezime,groblje,datum_ukopa,vrijeme_ukopa,datum_rodenja,datum_smrti,slug&${cityOr(city, ['mjesto_smrti', 'groblje', 'mjesna_zajednica'])}&datum_ukopa=gte.${today}&order=datum_ukopa.asc&limit=150`),
      // Schedules scraped from the city's cemetery company (sync-gradovi-sprovodi).
      sb(`sprovodi?select=ime,prezime,godina,groblje,tip_sprovoda,datum_sprovoda,vrijeme_sprovoda&grad=imatch.${encodeURIComponent(`^${cityPattern(city)}$`)}&izvor=not.is.null&datum_sprovoda=gte.${today}&limit=150`),
    ]).then(([obits, scheduled]) =>
      [...obits, ...scheduled].sort((a, b) =>
        `${a.datum_sprovoda || a.datum_ukopa} ${a.vrijeme_sprovoda || a.vrijeme_ukopa || ''}`.localeCompare(`${b.datum_sprovoda || b.datum_ukopa} ${b.vrijeme_sprovoda || b.vrijeme_ukopa || ''}`)));
  const recentQ = isZagreb
    ? Promise.resolve([])
    : sb(`obituaries?select=ime,prezime,groblje,datum_ukopa,vrijeme_ukopa,datum_rodenja,datum_smrti,slug&${cityOr(city, ['mjesto_smrti', 'groblje', 'mjesna_zajednica'])}&datum_ukopa=lt.${today}&datum_ukopa=gte.${shiftDays(today, -14)}&order=datum_ukopa.desc&limit=40`);
  // pogrebna_poduzeca holds invented sample companies, so it is not shown.
  const [funerals, recent, cems] = await Promise.all([
    funeralsQ,
    recentQ,
    fetchCemeteries(),
  ]);
  const cityCems = cemeteriesInCity(cems, city);
  if (cityCems[0]?.grad) city = cityCems[0].grad;
  const row = (f) => {
    const date = f.datum_sprovoda || f.datum_ukopa;
    const time = hhmm(f.vrijeme_sprovoda || f.vrijeme_ukopa);
    const name = `${esc(f.ime)} ${esc(f.prezime)}`;
    const link = f.slug ? `<a href="/${esc(f.slug)}">${name}</a>` : name;
    const a = f.godina ?? age(f.datum_rodenja, f.datum_smrti);
    return `<li>${hrDate(date)}${time ? ' u ' + time : ''} – ${link}${a ? ` (${a})` : ''}${f.groblje ? ', ' + esc(f.groblje) : ''}</li>`;
  };
  const title = `Sprovodi ${city} | Raspored sprovoda i ispraćaja u ${city}`;
  const description = `Raspored sprovoda i ispraćaja u gradu ${city}: datum, vrijeme i groblje, te popis groblja s adresama i radnim vremenom.`;
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/sprovodi">Sprovodi</a> / ${esc(city)}</nav>
<h1>Sprovodi ${esc(city)}: raspored sprovoda i ispraćaja</h1>
<h2>Nadolazeći sprovodi – ${esc(city)}</h2>
${funerals.length ? `<ul>${funerals.map(row).join('')}</ul>` : `<p>Trenutno nema najavljenih sprovoda za ${esc(city)}.</p>`}
${recent.length ? `<h2>Sprovodi u posljednjih 14 dana</h2><ul>${recent.map(row).join('')}</ul>` : ''}
${cityCems.length ? `<h2>Groblja u gradu ${esc(city)}</h2><ul>${cityCems.map(cemeteryItem).join('')}</ul>` : ''}
<p><a href="/umrli/${esc(param)}">Osmrtnice ${esc(city)}</a></p>`);
  return {
    title, description, canonical: SITE + path, body, noindex: false,
    jsonld: [breadcrumbLd([['Početna', '/'], ['Sprovodi', '/sprovodi'], [city, path]])],
  };
}

async function grobljaCity(param) {
  const path = `/groblja/${param}`;
  const cityCems = cemeteriesInCity(await fetchCemeteries(), decodeURIComponent(param));
  if (!cityCems.length) return null;
  const city = cityCems[0].grad;
  const title = `Groblja ${city} | Adrese, radno vrijeme i kontakti`;
  const description = `Popis groblja u gradu ${city} s adresama, kontaktima i radnim vremenom, uz raspored sprovoda i osmrtnice.`;
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/groblja">Groblja</a> / ${esc(city)}</nav>
<h1>Groblja u gradu ${esc(city)}</h1>
<ul>${cityCems.map(cemeteryItem).join('')}</ul>
<p><a href="/umrli/${esc(param)}">Osmrtnice ${esc(city)}</a> · <a href="/sprovodi/${esc(param)}">Raspored sprovoda ${esc(city)}</a></p>`);
  return {
    title, description, canonical: SITE + path, body, noindex: false,
    jsonld: [breadcrumbLd([['Početna', '/'], ['Groblja', '/groblja'], [city, path]])],
  };
}

// Same as CEMETERY_HEADS in src/lib/cemeteries.ts; keep them in sync.
const CEMETERY_HEADS = {
  'gradsko-boninovo': {
    title: 'Groblje Boninovo Dubrovnik – adresa, radno vrijeme, kontakt',
    description:
      'Groblje Boninovo u Dubrovniku: adresa, radno vrijeme i kontakt uprave te povijest groblja. Popis umrlih i raspored sprovoda je na stranici Umrli Dubrovnik.',
  },
};

async function grobljeSlug(slug) {
  const c = (await fetchCemeteries()).find((x) => x.slug === slug);
  if (!c) return null;
  const path = `/groblje/${slug}`;
  const title = CEMETERY_HEADS[slug]?.title || `${c.displayNaziv}${c.grad ? ` - ${c.grad}` : ''}`.slice(0, 60);
  const opis = (c.opis || '').replace(/\s+/g, ' ').trim();
  const description = CEMETERY_HEADS[slug]?.description || (opis.length <= 155 ? opis : `${opis.slice(0, 154).replace(/\s+\S*$/, '')}…`);
  const cityPath = c.grad ? fold(c.grad).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
  const paragraphs = (c.opis || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/groblja">Groblja</a>${c.grad ? ` / <a href="/groblja/${esc(fold(c.grad).replace(/[^a-z0-9]+/g, '-'))}">${esc(c.grad)}</a>` : ''} / ${esc(c.displayNaziv)}</nav>
<h1>${esc(c.displayNaziv)}${c.grad ? ` – ${esc(c.grad)}` : ''}</h1>
${cityPath ? `<p>Tražite tko je preminuo ili kada je sprovod? <a href="/umrli/${esc(cityPath)}">Umrli ${esc(c.grad)} – osmrtnice i raspored sprovoda</a></p>` : ''}
<ul>${[c.adresa && `Adresa: ${esc(c.adresa)}`, c.telefon && `Telefon: ${esc(c.telefon)}`, c.radnoVrijeme && `Radno vrijeme: ${esc(c.radnoVrijeme)}`].filter(Boolean).map((x) => `<li>${x}</li>`).join('')}</ul>
${paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}`);
  return {
    title, description, canonical: SITE + path, body, noindex: false,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'Cemetery', name: c.displayNaziv, description,
      ...(c.adresa ? { address: { '@type': 'PostalAddress', streetAddress: c.adresa, addressLocality: c.grad || undefined, addressCountry: 'HR' } } : {}),
      ...(c.telefon ? { telephone: c.telefon } : {}),
    }],
  };
}

async function blogSlug(slug) {
  const rows = await sb(`blogs?select=title,slug,content,excerpt,meta_title,meta_description,image_url,created_at,updated_at,category&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const b = rows[0];
  if (!b) return null;
  const path = `/blog/${slug}`;
  const description = b.meta_description || b.excerpt || stripTags(b.content).slice(0, 155);
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/blog">Blog</a> / ${esc(b.title)}</nav>
<article class="prose max-w-none">
<h1>${esc(b.title)}</h1>
${b.content || ''}
</article>`);
  return {
    title: b.meta_title || b.title, description, canonical: SITE + path, body, noindex: false, image: b.image_url,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'Article', headline: b.title, description,
      datePublished: b.created_at, dateModified: b.updated_at || b.created_at,
      mainEntityOfPage: SITE + path, ...(b.image_url ? { image: b.image_url } : {}),
      publisher: { '@type': 'Organization', name: 'Osmrtnica.com.hr', url: SITE },
    }],
  };
}

// Links from an obituary to its city, funeral schedule, cemetery, month archive
// and neighbouring obituaries, same as src/components/RelatedObituaries.tsx.
// Without them most obituaries had no internal link at all (Ahrefs: 23,831
// orphan pages). The "same period" list walks all obituaries in
// (datum_smrti, id) order, so following it reaches every one of them.
const RELATED_FIELDS = 'id,ime,prezime,slug,datum_rodenja,datum_smrti,mjesto_smrti';
async function relatedLinks(o) {
  const place = obituaryPlace(o.mjesto_smrti);
  const date = o.datum_smrti ? String(o.datum_smrti).slice(0, 10) : null;
  const slugged = 'slug=not.is.null';
  const near = (filter, order, limit) => sb(`obituaries?select=${RELATED_FIELDS}&${filter}&${slugged}&order=${order}&limit=${limit}`).catch(() => []);
  const [cb, ca, pb, pa, cems] = await Promise.all([
    place && date ? near(`${cityOr(place, ['mjesto_smrti'])}&id=neq.${o.id}&datum_smrti=lte.${date}`, 'datum_smrti.desc', 4) : [],
    place && date ? near(`${cityOr(place, ['mjesto_smrti'])}&datum_smrti=gt.${date}`, 'datum_smrti.asc', 3) : [],
    date ? near(`or=(datum_smrti.lt.${date},and(datum_smrti.eq.${date},id.lt.${o.id}))`, 'datum_smrti.desc,id.desc', 3) : [],
    date ? near(`or=(datum_smrti.gt.${date},and(datum_smrti.eq.${date},id.gt.${o.id}))`, 'datum_smrti.asc,id.asc', 3) : [],
    o.groblje ? fetchCemeteries().catch(() => []) : [],
  ]);
  const sameCity = [...ca.reverse(), ...cb];
  const cityIds = new Set(sameCity.map((r) => r.id));
  const samePeriod = [...pa.reverse(), ...pb].filter((r) => !cityIds.has(r.id));
  const key = o.groblje ? slugifyCemeteryName(o.groblje) : '';
  const cemetery = key ? cems.find((c) => c.slug && slugifyCemeteryName(c.naziv) === key) : null;
  const slug = place ? slugify(place) : null;
  const item = (r) =>
    `<li><a href="/${esc(r.slug)}">${esc(r.ime)} ${esc(r.prezime)}</a>${[
      r.datum_rodenja && r.datum_smrti ? `${lifeDate(r.datum_rodenja)} – ${lifeDate(r.datum_smrti)}` : lifeDate(r.datum_smrti),
      r.mjesto_smrti ? esc(String(r.mjesto_smrti).trim()) : '',
    ].filter(Boolean).map((t) => ` · ${t}`).join('')}</li>`;
  const links = [
    slug && `<a href="/umrli/${esc(slug)}">Umrli ${esc(place)}</a>`,
    slug && `<a href="/sprovodi/${esc(slug)}">Sprovodi ${esc(place)}</a>`,
    cemetery && `<a href="/groblje/${esc(cemetery.slug)}">${esc(cemetery.displayNaziv)}</a>`,
    date && `<a href="/umrli/${slug ? esc(slug) : NATIONAL}/${date.slice(0, 4)}/${date.slice(5, 7)}">Osmrtnice ${slug ? `${esc(place)}, ` : ''}${Number(date.slice(5, 7))}/${date.slice(0, 4)}</a>`,
  ].filter(Boolean);
  return [
    sameCity.length ? `<h2>Ostale osmrtnice iz mjesta ${esc(place)}</h2><ul>${sameCity.map(item).join('')}</ul>` : '',
    samePeriod.length ? `<h2>Osmrtnice iz istog razdoblja</h2><ul>${samePeriod.map(item).join('')}</ul>` : '',
    links.length ? `<p>${links.join(' · ')}</p>` : '',
  ].join('\n');
}

async function umrliArchive(param, godina, mjesec) {
  if (!/^\d{4}$/.test(godina) || !/^(0[1-9]|1[0-2])$/.test(mjesec)) return null;
  const national = param === NATIONAL;
  const city = national ? null : await cityName(param);
  const ym = `${godina}-${mjesec}`;
  const base = `/umrli/${param}`;
  const path = `${base}/${godina}/${mjesec}`;
  const rows = (
    await sbAll(
      `obituaries?select=${RELATED_FIELDS}&datum_smrti=gte.${ym}-01&datum_smrti=lt.${nextMonth(ym)}-01&slug=not.is.null${
        city ? `&${cityOr(city, ['mjesto_smrti'])}` : ''
      }&order=datum_smrti.asc,id.asc`,
    )
  ).filter((r) => !city || !isOtherPlace(r.mjesto_smrti, city));
  const label = monthLabel(ym);
  const plain = label.replace(/\.$/, '');
  const title = national ? `Osmrtnice – ${label} | Osmrtnica.com.hr` : `Umrli ${city} – ${label} | Osmrtnice`;
  const description = national
    ? `Sve osmrtnice objavljene za ${plain}: ime, godine života i mjesto. Zapalite virtualnu svijeću i ostavite sjećanje.`
    : `Osmrtnice za ${city}, ${plain}: popis pokojnika s godinama života. Zapalite virtualnu svijeću i ostavite sjećanje.`;
  const prev = prevMonth(ym);
  const next = nextMonth(ym);
  const monthUrl = (m) => `${base}/${m.slice(0, 4)}/${m.slice(5, 7)}`;
  const item = (r) =>
    `<li><a href="/${esc(r.slug)}">${esc(r.ime)} ${esc(r.prezime)}</a>${[
      r.datum_rodenja && r.datum_smrti ? `${lifeDate(r.datum_rodenja)} – ${lifeDate(r.datum_smrti)}` : lifeDate(r.datum_smrti),
      national && r.mjesto_smrti ? esc(String(r.mjesto_smrti).trim()) : '',
    ].filter(Boolean).map((t) => ` · ${t}`).join('')}</li>`;
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/umrli">Umrli</a>${national ? '' : ` / <a href="${esc(base)}">${esc(city)}</a>`} / ${label}</nav>
<h1>${esc(national ? `Osmrtnice – ${label}` : `Umrli ${city} – ${label}`)}</h1>
<p>${plural(rows.length, 'osmrtnica', 'osmrtnice', 'osmrtnica')}, poredano po datumu smrti.</p>
${rows.length ? `<ul>${rows.map(item).join('')}</ul>` : '<p>Za ovaj mjesec nema objavljenih osmrtnica.</p>'}
<p>${prev >= FIRST_MONTH ? `<a href="${esc(monthUrl(prev))}">← ${monthLabel(prev)}</a> · ` : ''}<a href="${national ? '/umrli' : esc(base)}">${esc(national ? 'Sve osmrtnice' : `Umrli ${city}`)}</a>${
    next <= currentMonth() ? ` · <a href="${esc(monthUrl(next))}">${monthLabel(next)} →</a>` : ''
  }</p>`);
  return {
    title, description, canonical: SITE + path, body, noindex: rows.length === 0, forceHead: true,
    jsonld: [breadcrumbLd([['Početna', '/'], ['Umrli', '/umrli'], ...(national ? [] : [[city, base]]), [label, path]])],
  };
}

async function obituarySlug(slug) {
  const rows = await sb(`obituaries?select=id,ime,prezime,datum_rodenja,datum_smrti,datum_ukopa,vrijeme_ukopa,mjesto_rodenja,mjesto_smrti,biografija,fotografija_url,groblje,podnaslov,slug,meta_title,meta_description&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const o = rows[0];
  if (!o) return null;
  const name = `${o.ime} ${o.prezime}`;
  const path = `/${slug}`;
  const description = obituaryDescription(o);
  const related = await relatedLinks(o);
  const a = age(o.datum_rodenja, o.datum_smrti);
  const facts = [
    o.datum_rodenja && `Rođen/a: ${lifeDate(o.datum_rodenja)}${o.mjesto_rodenja ? `, ${esc(o.mjesto_rodenja)}` : ''}`,
    o.datum_smrti && `Preminuo/la: ${lifeDate(o.datum_smrti)}${o.mjesto_smrti ? `, ${esc(o.mjesto_smrti)}` : ''}${a !== null ? ` (${godine(a)})` : ''}`,
    (o.datum_ukopa || o.groblje) && `Sprovod: ${o.datum_ukopa ? hrDate(o.datum_ukopa) : ''}${o.vrijeme_ukopa ? ' u ' + hhmm(o.vrijeme_ukopa) : ''}${o.groblje ? `, ${esc(decode(stripTags(o.groblje)))}` : ''}`,
  ].filter(Boolean);
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/umrli">Osmrtnice</a> / ${esc(name)}</nav>
<h1>${esc(name)}</h1>
${o.podnaslov ? `<p>${esc(o.podnaslov)}</p>` : ''}
<ul>${facts.map((f) => `<li>${f}</li>`).join('')}</ul>
${o.biografija ? `<h2>O pokojniku</h2><p>${esc(stripTags(o.biografija))}</p>` : ''}
<p><a href="/zapali-svijecu?ime=${encodeURIComponent(o.ime)}&amp;prezime=${encodeURIComponent(o.prezime)}">Zapali virtualnu svijeću</a> · <a href="/digitalni-memorijal">Napravi digitalni memorijal</a></p>
${related}`);
  return {
    title: obituaryTitle(o), description, canonical: SITE + path, body, noindex: false, image: o.fotografija_url,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'Person', name,
      ...(o.datum_rodenja ? { birthDate: o.datum_rodenja } : {}),
      ...(o.mjesto_rodenja ? { birthPlace: { '@type': 'Place', name: o.mjesto_rodenja } } : {}),
      ...(o.datum_smrti ? { deathDate: o.datum_smrti } : {}),
      ...(o.mjesto_smrti ? { deathPlace: { '@type': 'Place', name: o.mjesto_smrti } } : {}),
      ...(o.fotografija_url ? { image: o.fotografija_url } : {}),
      url: SITE + path,
    }],
  };
}

// ---------- homepage and hubs ----------

// obituary_city_counts mixes towns with parishes, regions and countries; keep
// names that look like a place and have enough obituaries to fill a page.
const NOT_CITIES = new Set(['bosna i hercegovina', 'hrvatska', 'dalmacija', 'lovrinac', 'sv', 'njemacka', 'austrija', 'srbija']);
async function topCities(min = 10, max = 80) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/obituary_city_counts`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: '{}',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    const rows = await res.json();
    return rows
      .filter((c) => c.name && c.count >= min)
      .filter((c) => !NOT_CITIES.has(fold(c.name)) && !/\s(u|na|kod|s|o)(\s|$)|\s-\s|groblje|župa|zupa|\d/i.test(c.name))
      .sort((a, b) => b.count - a.count)
      .slice(0, max)
      .map((c) => ({ name: c.name.trim(), slug: slugify(c.name) }));
  } finally {
    clearTimeout(timer);
  }
}

const cityLinks = (cities, section) =>
  `<ul>${cities.map((c) => `<li><a href="/${section}/${esc(c.slug)}">${esc(c.name)}</a></li>`).join('')}</ul>`;

const OBIT_FIELDS = 'ime,prezime,datum_rodenja,datum_smrti,datum_ukopa,vrijeme_ukopa,mjesto_smrti,groblje,slug';

async function homePage() {
  const [obits, cities, seo] = await Promise.all([
    sb(`obituaries?select=${OBIT_FIELDS}&order=datum_ukopa.desc.nullslast&limit=40`),
    topCities(),
    sb('on_page_seo?select=meta_title,meta_description&page_path=eq.%2F&limit=1'),
  ]);
  const body = page(`
<h1>Osmrtnice Hrvatska</h1>
<p>Osmrtnice, raspored sprovoda, groblja i virtualne svijeće za Hrvatsku i BiH. Obitelji ovdje objavljuju osmrtnice i čuvaju uspomenu na pokojnike u digitalnom memorijalu.</p>
<h2>Najnovije osmrtnice</h2>
<ul>${dedupe(obits).slice(0, 30).map(obituaryItem).join('')}</ul>
<p><a href="/umrli">Sve osmrtnice</a> · <a href="/sprovodi">Raspored sprovoda</a> · <a href="/groblja">Groblja</a> · <a href="/blog">Blog</a></p>
<h2>Umrli po gradovima</h2>
${cityLinks(cities.slice(0, 40), 'umrli')}
<h2>Digitalni memorijal</h2>
<p><a href="/digitalni-memorijal">Digitalni memorijal</a> je trajna spomen-stranica s pričom o životu, fotografijama, sjećanjima obitelji i virtualnim svijećama.</p>`);
  return {
    title: seo[0]?.meta_title || null, description: seo[0]?.meta_description || '', canonical: SITE + '/', body, noindex: false,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Osmrtnica.com.hr', url: SITE + '/' }],
  };
}

async function umrliHub() {
  const [obits, cities] = await Promise.all([
    sb(`obituaries?select=${OBIT_FIELDS}&order=datum_ukopa.desc.nullslast&limit=80`),
    topCities(),
  ]);
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / Umrli</nav>
<h1>Umrli</h1>
<p>Aktualne osmrtnice i informacije o sprovodima. Pretražite umrle po gradu ili otvorite osmrtnicu za datum i mjesto sprovoda.</p>
<h2>Najnovije osmrtnice</h2>
<ul>${dedupe(obits).slice(0, 60).map(obituaryItem).join('')}</ul>
<h2>Umrli po gradovima</h2>
${cityLinks(cities, 'umrli')}
<p><a href="/gradovi">Svi gradovi</a> · <a href="/sprovodi">Raspored sprovoda</a></p>
<h2>Arhiva osmrtnica po mjesecima</h2>
${monthLinks(`/umrli/${NATIONAL}`, allMonths().map((ym) => ({ ym })))}`);
  return {
    title: null, canonical: SITE + '/umrli', body, noindex: false,
    jsonld: [breadcrumbLd([['Početna', '/'], ['Umrli', '/umrli']])],
  };
}

async function sprovodiHub() {
  const today = todayZagreb();
  const [obits, scheduled, cities] = await Promise.all([
    sb(`obituaries?select=${OBIT_FIELDS}&datum_ukopa=gte.${today}&order=datum_ukopa.asc,vrijeme_ukopa.asc&limit=80`),
    sb(`sprovodi?select=ime,prezime,godina,groblje,grad,datum_sprovoda,vrijeme_sprovoda&izvor=not.is.null&datum_sprovoda=gte.${today}&order=datum_sprovoda.asc,vrijeme_sprovoda.asc&limit=120`),
    topCities(),
  ]);
  const rows = [
    ...dedupe(obits).map((o) => ({ ...o, date: o.datum_ukopa, time: o.vrijeme_ukopa, place: o.mjesto_smrti })),
    ...scheduled.map((f) => ({ ...f, date: f.datum_sprovoda, time: f.vrijeme_sprovoda, place: f.grad })),
  ].sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
  const row = (f) => {
    const name = `${esc(f.ime)} ${esc(f.prezime)}`;
    const link = f.slug ? `<a href="/${esc(f.slug)}">${name}</a>` : name;
    return `<li>${hrDate(f.date)}${f.time ? ' u ' + hhmm(f.time) : ''} – ${link}${f.groblje ? ', ' + esc(f.groblje) : ''}${f.place ? ` (${esc(f.place)})` : ''}</li>`;
  };
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / Sprovodi</nav>
<h1>Sprovodi u Hrvatskoj</h1>
<p>Raspored sprovoda i ispraćaja po gradovima i grobljima u Hrvatskoj: datum, vrijeme i groblje.</p>
<h2>Nadolazeći sprovodi</h2>
${rows.length ? `<ul>${rows.slice(0, 120).map(row).join('')}</ul>` : '<p>Trenutno nema najavljenih sprovoda.</p>'}
<h2>Sprovodi po gradovima</h2>
${cityLinks(cities, 'sprovodi')}`);
  return {
    title: null, canonical: SITE + '/sprovodi', body, noindex: false,
    jsonld: [breadcrumbLd([['Početna', '/'], ['Sprovodi', '/sprovodi']])],
  };
}

async function grobljaHub() {
  const cems = await fetchCemeteries();
  const byCity = new Map();
  for (const c of cems) {
    if (!c.grad) continue;
    const slug = slugify(c.grad);
    if (!byCity.has(slug)) byCity.set(slug, { name: c.grad, slug, n: 0 });
    byCity.get(slug).n += 1;
  }
  const cities = [...byCity.values()].sort((a, b) => a.name.localeCompare(b.name, 'hr'));
  const described = cems.filter((c) => c.slug);
  const title = 'Groblja u Hrvatskoj – popis po gradovima';
  const description = 'Popis svih groblja u Hrvatskoj po gradovima – adrese, kontakti, radno vrijeme i raspored sprovoda.';
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / Groblja</nav>
<h1>Groblja u Hrvatskoj</h1>
<p>${esc(description)}</p>
<h2>Groblja po gradovima</h2>
<ul>${cities.map((c) => `<li><a href="/groblja/${esc(c.slug)}">${esc(c.name)}</a> (${c.n})</li>`).join('')}</ul>
${described.length ? `<h2>Opisi groblja</h2><ul>${described.map(cemeteryItem).join('')}</ul>` : ''}`);
  return {
    title: `${title} | Osmrtnica.com.hr`, description, canonical: SITE + '/groblja', body, noindex: false,
    jsonld: [breadcrumbLd([['Početna', '/'], ['Groblja', '/groblja']])],
  };
}

async function gradoviHub() {
  const cities = (await topCities(10, 400)).sort((a, b) => a.name.localeCompare(b.name, 'hr'));
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / Gradovi</nav>
<h1>Umrli po gradovima</h1>
<p>Popis gradova i mjesta u Hrvatskoj i Bosni i Hercegovini s osmrtnicama. Odaberite grad za osmrtnice, raspored sprovoda i groblja.</p>
${cityLinks(cities, 'umrli')}`);
  return {
    title: 'Umrli po gradovima | Hrvatska i BiH | Osmrtnica.com.hr',
    description: 'Popis svih gradova i mjesta u Hrvatskoj i Bosni i Hercegovini s osmrtnicama, poredan abecedno. Pronađite osmrtnice, memorijale, svijeće i groblja u svom gradu.',
    canonical: SITE + '/gradovi', body, noindex: false,
    jsonld: [breadcrumbLd([['Početna', '/'], ['Gradovi', '/gradovi']])],
  };
}

async function blogHub() {
  const posts = await sb('blogs?select=title,slug,excerpt,created_at&order=created_at.desc');
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / Blog</nav>
<h1>Blog</h1>
<p>Članci i savjeti za obitelji: organizacija sprovoda, osmrtnice, žalovanje i čuvanje uspomene.</p>
<ul>${posts.filter((b) => b.slug).map((b) => `<li><a href="/blog/${esc(b.slug)}">${esc(b.title)}</a>${b.excerpt ? ` – ${esc(stripTags(b.excerpt).slice(0, 200))}` : ''}</li>`).join('')}</ul>`);
  return {
    title: null, canonical: SITE + '/blog', body, noindex: false,
    jsonld: [breadcrumbLd([['Početna', '/'], ['Blog', '/blog']])],
  };
}

// Mirrors the head of src/pages/MemorijalStranica.tsx. Private or unpublished
// memorials fall through: the page shows a request-access screen, not content.
const yearOf = (iso) => (iso ? String(iso).slice(0, 4) : '');
const lifeYears = (b, d) => {
  const by = yearOf(b), dy = yearOf(d);
  if (by && dy) return `${by}. – ${dy}.`;
  if (dy) return `† ${dy}.`;
  if (by) return `${by}. –`;
  return '';
};
const richTextBlocks = (html) =>
  String(html || '')
    .split(/<\/(?:p|h[1-6]|li|blockquote|div)>|<br\s*\/?>/i)
    .map(stripTags)
    .filter(Boolean);

async function memorijalSlug(slug) {
  const rows = await sb(`memorials?select=deceased_id,slug,quote,life_story,visibility,status&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const m = rows[0];
  if (!m || m.status !== 'published' || m.visibility === 'private') return null;
  const deceased = (await sb(`obituaries?select=ime,prezime,datum_rodenja,datum_smrti,mjesto_rodenja,mjesto_smrti,fotografija_url&id=eq.${encodeURIComponent(m.deceased_id)}&limit=1`))[0];
  if (!deceased) return null;
  const name = `${deceased.ime ?? ''} ${deceased.prezime ?? ''}`.trim();
  const years = lifeYears(deceased.datum_rodenja, deceased.datum_smrti);
  const path = `/memorijal/${slug}`;
  const description = (m.quote
    ? `${name} (${years}) — ${m.quote}`
    : `Digitalni memorijal i mjesto sjećanja na ${name} (${years}). Podijelite uspomene, zapalite svijeću i pogledajte fotografije.`).slice(0, 155);
  const facts = [
    deceased.datum_rodenja && `Rođen/a: ${lifeDate(deceased.datum_rodenja)}${deceased.mjesto_rodenja ? `, ${esc(deceased.mjesto_rodenja)}` : ''}`,
    deceased.datum_smrti && `Preminuo/la: ${lifeDate(deceased.datum_smrti)}${deceased.mjesto_smrti ? `, ${esc(deceased.mjesto_smrti)}` : ''}`,
  ].filter(Boolean);
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/memorijali">Memorijali</a> / ${esc(name)}</nav>
<article>
<h1>${esc(name)}</h1>
${years ? `<p>${esc(years)}</p>` : ''}
${m.quote ? `<blockquote>${esc(m.quote)}</blockquote>` : ''}
${facts.length ? `<ul>${facts.map((f) => `<li>${f}</li>`).join('')}</ul>` : ''}
${richTextBlocks(m.life_story).map((p) => `<p>${esc(p)}</p>`).join('')}
</article>
<p><a href="/digitalni-memorijal">Napravi digitalni memorijal</a> za svoju voljenu osobu.</p>`);
  const noindex = m.visibility !== 'public';
  return {
    title: `${name} (${years}) — memorijal i sjećanja`.slice(0, 60), description, canonical: SITE + path, body, noindex,
    image: deceased.fotografija_url,
    jsonld: noindex ? [] : [
      breadcrumbLd([['Naslovnica', '/'], ['Memorijali', '/memorijali'], [name, path]]),
      {
        '@context': 'https://schema.org', '@type': 'Person', name,
        ...(deceased.datum_rodenja ? { birthDate: deceased.datum_rodenja } : {}),
        ...(deceased.datum_smrti ? { deathDate: deceased.datum_smrti } : {}),
        ...(deceased.fotografija_url ? { image: deceased.fotografija_url } : {}),
        url: SITE + path,
      },
    ],
  };
}

function route(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return homePage;
  if (parts.length === 1) {
    const hub = { umrli: umrliHub, sprovodi: sprovodiHub, groblja: grobljaHub, gradovi: gradoviHub, blog: blogHub }[parts[0]];
    if (hub) return hub;
  }
  if (parts.length === 2) {
    const [section, param] = parts;
    if (section === 'umrli') return () => umrliCity(param);
    if (section === 'sprovodi') return () => sprovodiCity(param);
    if (section === 'groblja') return () => grobljaCity(param);
    if (section === 'groblje') return () => grobljeSlug(decodeURIComponent(param));
    if (section === 'blog') return () => blogSlug(decodeURIComponent(param));
    if (section === 'memorijal') return () => memorijalSlug(decodeURIComponent(param));
  }
  if (parts.length === 4 && parts[0] === 'umrli') return () => umrliArchive(parts[1], parts[2], parts[3]);
  if (parts.length === 1 && !APP_PAGES.has(parts[0]) && !parts[0].includes('.')) {
    return () => obituarySlug(decodeURIComponent(parts[0]));
  }
  return null;
}

const setTag = (html, re, tag) => (re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`));

const GENERIC_TITLE = '<title>Osmrtnica.com.hr - Dostojanstveno opraštanje</title>';

function inject(html, d) {
  const t = esc(d.title);
  const desc = esc(d.description);
  // Hand-written templates in public/ (e.g. /umrli/zadar) already carry a
  // better head; only the generic SPA shell gets these tags, except pages in
  // the title test, whose head must match the test wording. A page without a
  // title of its own (no on_page_seo row) keeps the shell's head.
  if (d.title && (html.includes(GENERIC_TITLE) || d.forceHead)) html = withHead(html, d, t, desc);
  if (d.noindex) html = html.replace('</head>', '    <meta name="robots" content="noindex,follow" />\n  </head>');
  const ld = (d.jsonld || [])
    .map((j) => `<script type="application/ld+json" data-ssr="1">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`)
    .join('');
  html = html.replace('</head>', `    ${ld}\n  </head>`);
  return html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${d.body}</div>`);
}

function withHead(html, d, t, desc) {
  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" data-rh="true" content="${desc}" />`);
  html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(d.canonical)}" />`);
  html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(d.canonical)}" />`);
  html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${t}" />`);
  html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}" />`);
  if (d.image) html = setTag(html, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(d.image)}" />`);
  return html;
}

export default async (request, context) => {
  if (request.method !== 'GET') return context.next();
  const url = new URL(request.url);
  const build = route(url.pathname);
  if (!build) return context.next();

  const res = await context.next();
  const type = res.headers.get('content-type') || '';
  if (res.status !== 200 || !type.includes('text/html')) return res;

  let data;
  try {
    data = await build();
  } catch (e) {
    console.error('seo-content', url.pathname, String(e));
    return res;
  }
  if (!data) return res;

  const html = inject(await res.text(), data);
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('etag');
  // Browsers revalidate; Netlify's CDN keeps the rendered page for 10 minutes.
  headers.set('Netlify-CDN-Cache-Control', 'public, durable, s-maxage=600, stale-while-revalidate=3600');
  return new Response(html, { status: 200, headers });
};

export const config = {
  path: '/*',
  excludedPath: [
    '/assets/*', '/site/*', '/wp/*', '/wp-content/*', '/admin/*', '/auth/*',
    '/*.js', '/*.css', '/*.png', '/*.jpg', '/*.jpeg', '/*.webp', '/*.gif', '/*.svg', '/*.ico',
    '/*.xml', '/*.txt', '/*.json', '/*.woff', '/*.woff2', '/*.pdf', '/*.mp4',
  ],
  cache: 'manual',
};
