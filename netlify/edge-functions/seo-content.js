// Server-side content for the SPA. The React app renders everything in the
// browser, so crawlers that do not run JavaScript (and Google before its
// render pass) see an empty <div id="root">. This edge function fetches the
// same Supabase data the page uses and writes the title, description,
// canonical, JSON-LD and a plain HTML version of the page content into the
// HTML. React's createRoot replaces #root on load, so visitors end up with
// the normal app and see the same data.
//
// Covered: /umrli/:grad, /sprovodi/:grad, /groblja/:grad, /groblje/:slug,
// /blog/:slug and obituary pages /:slug. Anything else, any non-200 response
// and any Supabase error fall through unchanged.

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

const stripTags = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const hrDate = (iso) => {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}.`;
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
const cityOr = (city, cols) => {
  const v = encodeURIComponent(`"${cityPattern(city)}"`);
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
    const rows = await sb(`obituaries?select=mjesto_smrti&mjesto_smrti=imatch.${encodeURIComponent(`^${cityPattern(label)}$`)}&limit=1`);
    return rows[0]?.mjesto_smrti?.trim() || label;
  } catch {
    return label;
  }
}

const obituaryItem = (o) => {
  const a = age(o.datum_rodenja, o.datum_smrti);
  const bits = [
    o.datum_smrti ? `preminuo/la ${hrDate(o.datum_smrti)}` : '',
    a !== null ? `${a} godina` : '',
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

const page = (body) => `<main class="container mx-auto px-4 py-8" data-ssr="1">${body}</main>`;

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
]);

// Titles written for the main queries of a city; others use the template.
const TITLE_OVERRIDES = {
  osijek: 'Umrli Osijek danas – osmrtnice, ukopi i sprovodi',
  dubrovnik: 'Umrli Dubrovnik danas – osmrtnice, Boninovo i sprovodi',
  metkovic: 'Umrli Metković i okolna mjesta – osmrtnice danas',
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

// ---------- page builders: each returns { title, description, canonical, body, jsonld[], noindex } ----------

async function umrliCity(param) {
  let city = await cityName(param);
  const path = `/umrli/${param}`;
  const [obits, cems] = await Promise.all([
    sb(
      `obituaries?select=ime,prezime,datum_rodenja,datum_smrti,datum_ukopa,vrijeme_ukopa,mjesto_smrti,groblje,slug&${cityOr(city, [
        'mjesto_smrti', 'mjesto_rodenja', 'groblje', 'mjesna_zajednica',
      ])}&order=datum_ukopa.desc.nullslast&limit=80`,
    ),
    fetchCemeteries(),
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
<h2>${esc(test ? `Osmrtnice ${city} – danas i jučer` : `Najnovije osmrtnice – ${city}`)}</h2>
${list.length ? `<ul>${list.map(obituaryItem).join('')}</ul>` : '<p>Trenutno nema objavljenih osmrtnica za ovaj grad.</p>'}
<p><a href="/sprovodi/${esc(param)}">Raspored sprovoda ${esc(city)}</a> · <a href="/groblja/${esc(param)}">Groblja ${esc(city)}</a></p>
${cityCems.length ? `<h2>Groblja u gradu ${esc(city)}</h2><ul>${cityCems.map(cemeteryItem).join('')}</ul>` : ''}
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
    : sb(`obituaries?select=ime,prezime,groblje,datum_ukopa,vrijeme_ukopa,datum_rodenja,datum_smrti,slug&${cityOr(city, ['mjesto_smrti', 'groblje', 'mjesna_zajednica'])}&datum_ukopa=gte.${today}&order=datum_ukopa.asc&limit=150`);
  const recentQ = isZagreb
    ? Promise.resolve([])
    : sb(`obituaries?select=ime,prezime,groblje,datum_ukopa,vrijeme_ukopa,datum_rodenja,datum_smrti,slug&${cityOr(city, ['mjesto_smrti', 'groblje', 'mjesna_zajednica'])}&datum_ukopa=lt.${today}&datum_ukopa=gte.${shiftDays(today, -14)}&order=datum_ukopa.desc&limit=40`);
  const [funerals, recent, cems, services] = await Promise.all([
    funeralsQ,
    recentQ,
    fetchCemeteries(),
    sb(`pogrebna_poduzeca?select=naziv,adresa,telefon,website_url&grad=eq.${encodeURIComponent(city.toLowerCase())}&order=ocjena.desc`),
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
  const description = `Raspored sprovoda i ispraćaja u gradu ${city}: datum, vrijeme i groblje, popis groblja s adresama i radnim vremenom te pogrebna poduzeća.`;
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/sprovodi">Sprovodi</a> / ${esc(city)}</nav>
<h1>Sprovodi ${esc(city)}: raspored sprovoda i ispraćaja</h1>
<h2>Nadolazeći sprovodi – ${esc(city)}</h2>
${funerals.length ? `<ul>${funerals.map(row).join('')}</ul>` : `<p>Trenutno nema najavljenih sprovoda za ${esc(city)}.</p>`}
${recent.length ? `<h2>Sprovodi u posljednjih 14 dana</h2><ul>${recent.map(row).join('')}</ul>` : ''}
${cityCems.length ? `<h2>Groblja u gradu ${esc(city)}</h2><ul>${cityCems.map(cemeteryItem).join('')}</ul>` : ''}
${services.length ? `<h2>Pogrebna poduzeća u gradu ${esc(city)}</h2><ul>${services.map((s) => `<li>${esc(s.naziv)}${s.adresa ? ' – ' + esc(s.adresa) : ''}${s.telefon ? ', tel. ' + esc(s.telefon) : ''}</li>`).join('')}</ul>` : ''}
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

async function grobljeSlug(slug) {
  const c = (await fetchCemeteries()).find((x) => x.slug === slug);
  if (!c) return null;
  const path = `/groblje/${slug}`;
  const title = `${c.displayNaziv}${c.grad ? ` - ${c.grad}` : ''}`.slice(0, 60);
  const description = (c.opis || '').slice(0, 155);
  const paragraphs = (c.opis || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/groblja">Groblja</a>${c.grad ? ` / <a href="/groblja/${esc(fold(c.grad).replace(/[^a-z0-9]+/g, '-'))}">${esc(c.grad)}</a>` : ''} / ${esc(c.displayNaziv)}</nav>
<h1>${esc(c.displayNaziv)}${c.grad ? ` – ${esc(c.grad)}` : ''}</h1>
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

async function obituarySlug(slug) {
  const rows = await sb(`obituaries?select=ime,prezime,datum_rodenja,datum_smrti,datum_ukopa,vrijeme_ukopa,mjesto_rodenja,mjesto_smrti,biografija,fotografija_url,groblje,podnaslov,slug,meta_title,meta_description&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const o = rows[0];
  if (!o) return null;
  const name = `${o.ime} ${o.prezime}`;
  const path = `/${slug}`;
  let description = o.meta_description;
  if (!description) {
    description = `Osmrtnica za ${name}`;
    if (o.datum_smrti) description += `, preminuo ${hrDate(o.datum_smrti)}`;
    if (o.mjesto_smrti) description += ` u ${o.mjesto_smrti}`;
    if (o.datum_ukopa) description += `. Sprovod ${hrDate(o.datum_ukopa)}${o.groblje ? ` na ${o.groblje}` : ''}`;
    else if (o.groblje) description += `. Sprovod na ${o.groblje}`;
    description += '. Zapali svijeću i ostavi sjećanje.';
  }
  const a = age(o.datum_rodenja, o.datum_smrti);
  const facts = [
    o.datum_rodenja && `Rođen/a: ${hrDate(o.datum_rodenja)}${o.mjesto_rodenja ? `, ${esc(o.mjesto_rodenja)}` : ''}`,
    o.datum_smrti && `Preminuo/la: ${hrDate(o.datum_smrti)}${o.mjesto_smrti ? `, ${esc(o.mjesto_smrti)}` : ''}${a !== null ? ` (${a} godina)` : ''}`,
    (o.datum_ukopa || o.groblje) && `Sprovod: ${o.datum_ukopa ? hrDate(o.datum_ukopa) : ''}${o.vrijeme_ukopa ? ' u ' + hhmm(o.vrijeme_ukopa) : ''}${o.groblje ? `, ${esc(o.groblje)}` : ''}`,
  ].filter(Boolean);
  const body = page(`
<nav aria-label="breadcrumb"><a href="/">Početna</a> / <a href="/umrli">Osmrtnice</a> / ${esc(name)}</nav>
<h1>${esc(name)}</h1>
${o.podnaslov ? `<p>${esc(o.podnaslov)}</p>` : ''}
<ul>${facts.map((f) => `<li>${f}</li>`).join('')}</ul>
${o.biografija ? `<h2>O pokojniku</h2><p>${esc(stripTags(o.biografija))}</p>` : ''}
<p><a href="/zapali-svijecu?ime=${encodeURIComponent(o.ime)}&amp;prezime=${encodeURIComponent(o.prezime)}">Zapali virtualnu svijeću</a> · <a href="/digitalni-memorijal">Napravi digitalni memorijal</a></p>`);
  return {
    title: o.meta_title || `${name} - Osmrtnica | Osmrtnica.com.hr`, description, canonical: SITE + path, body, noindex: false, image: o.fotografija_url,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'Person', name,
      ...(o.datum_rodenja ? { birthDate: o.datum_rodenja } : {}),
      ...(o.datum_smrti ? { deathDate: o.datum_smrti } : {}),
      ...(o.mjesto_smrti ? { deathPlace: { '@type': 'Place', name: o.mjesto_smrti } } : {}),
      ...(o.fotografija_url ? { image: o.fotografija_url } : {}),
      url: SITE + path,
    }],
  };
}

function route(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2) {
    const [section, param] = parts;
    if (section === 'umrli') return () => umrliCity(param);
    if (section === 'sprovodi') return () => sprovodiCity(param);
    if (section === 'groblja') return () => grobljaCity(param);
    if (section === 'groblje') return () => grobljeSlug(decodeURIComponent(param));
    if (section === 'blog') return () => blogSlug(decodeURIComponent(param));
  }
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
  // the title test, whose head must match the test wording.
  if (html.includes(GENERIC_TITLE) || d.forceHead) html = withHead(html, d, t, desc);
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
