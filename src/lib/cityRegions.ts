// Podjela gradova s osmrtnicama po regijama: Hrvatska, Bosna i Hercegovina, inozemstvo.
// Podaci u bazi su slobodni unos pa se nazivi često pišu kao "Lovrinac u Splitu"
// ili "Strupnić - Livno" — zato pretražujemo cijeli naziv po poznatim mjestima.

export type CityRegion = 'croatia' | 'bih' | 'abroad';

export const normalizePlace = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .replace(/[đ]/g, 'dj')
    .replace(/dž/g, 'dz')
    .replace(/\s+/g, ' ')
    .trim();

const BIH_PLACES = [
  // Federacija BiH — županije i općine
  'bihac', 'bosanska krupa', 'bosanski petrovac', 'buzim', 'cazin', 'kljuc',
  'sanski most', 'velika kladusa', 'domaljevac-samac', 'domaljevac', 'odzak', 'orasje',
  'banovici', 'celic', 'doboj-istok', 'gradacac', 'gracanica', 'kalesija',
  'kladanj', 'lukavac', 'sapna', 'srebrenik', 'teocak', 'tuzla', 'zivinice',
  'breza', 'doboj', 'doboj jug', 'doboj-istok', 'kakanj', 'maglaj', 'olovo', 'tesanj',
  'vares', 'visoko', 'zavidovici', 'zenica', 'zenici', 'zepce', 'usora', 'ilijas',
  'vitez', 'busovaca', 'fojnica', 'gornji vakuf-uskoplje', 'gornji vakuf', 'uskoplje',
  'jajce', 'donji vakuf', 'travnik', 'novi travnik', 'kresevo', 'kiseljak', 'dobretici',
  'bugojno', 'prozor-rama', 'prozor', 'jablanica', 'konjic', 'mostar', 'mostaru',
  'neum', 'stolac', 'capljina', 'citluk', 'ravno', 'siroki brijeg', 'sirokama',
  'grude', 'ljubuski', 'posusje',
  // Kanton Sarajevo i područje Goražda
  'hadzici', 'ilidza', 'novo sarajevo', 'vogosca', 'sarajevo',
  'istocno sarajevo', 'istocni stari grad', 'istocni mostar', 'istocni drvar',
  'foca-ustikolina', 'foca', 'pale-praca', 'pale', 'gorazde', 'trnovo',
  // Kanton 10
  'tomislavgrad', 'livno', 'kupres', 'glamoc', 'drvar', 'bosansko grahovo',
  // Republika Srpska
  'banja luka', 'bijeljina', 'prijedor', 'sokolac', 'rogatica', 'visegrad',
  'gacko', 'kalinovik', 'nevesinje', 'bileca', 'ljubinje', 'berkovici',
  'han pijesak', 'milici', 'srebrenica', 'bratunac', 'zvornik',
  'sekovici', 'ugljevik', 'lopare', 'rudo', 'cajnice', 'novo gorazde',
  'mrkonjic grad', 'ribnik', 'sipovo', 'kotor varos', 'kotor varoš', 'knezevo',
  'teslic', 'derventa', 'bosanski samac', 'bosanski brod', 'modrica', 'pelagicevo',
  'donji zabar', 'vukosavlje', 'petrovo', 'ostra luka', 'novi grad', 'kozarska dubica',
  'gradiska', 'bosanska gradiska', 'laktasi', 'srbac', 'prnjavor', 'celinac',
  'petrovac', 'krupa na uni', 'kostajnica', 'stanari', 'trebinje',
  // Brčko
  'brcko',
  // Sela/župe koje se često navode uz matične općine
  'drinovci', 'sujica', 'strupnic', 'mišima', 'misima', 'vrzerale',
  'privalj', 'seonica', 'kula-busovaca', 'gornji mamici',
  // Opće oznake
  'bih', 'bosna i hercegovina', 'bosansko-podrinjska', 'hercegovina',
];

// Inozemstvo — države i gradovi izvan Hrvatske i BiH
const ABROAD_PATTERNS = [
  'beograd', 'srbij', 'podgorica', 'cetinje', 'niksic', 'kolasin', 'pluzine',
  'danilovgrad', 'bijelo polje', 'kotor', 'kijev', 'bar crna', 'crna gora',
  'montenegro', 'berlin', 'hamburg', 'munich', 'munchen', 'dortmund', 'malmo',
  'chicago', 'melbourne', 'adelaide', 'sydney', 'perth', 'houston', 'miami',
  'phoenix', 'toronto', 'oakville', 'liverpool', 'bec ', 'bec,', 'wien',
  'dusseldorf', 'düsseldorf', 'frankfurt', 'stuttgart', 'hannover', 'koln',
  'huntingdon', 'bissingen', 'karlsruh', 'handen', 'friedhof', 'rotterdam',
  'austri', 'australij', 'italij', 'slovack', 'slovenij', 'svedsk', 'svedskoj',
  'nizozemsk', 'njemack', 'nemack', 'kanad', 'englesk', 'francus', 'ameri',
  'sjedinjen', 'skotsk', 'irlansk',
];

const stripPrefixes = (n: string): string =>
  n
    .replace(/^(grad|opcina|općina|mjesto|naselje)\s+/g, '')
    .replace(/^(opcina|općina)\s+/g, '')
    .trim();

const tokens = (n: string): string[] =>
  n
    .split(/\s*(?:[-–/]|,\s*|\bu\b)\s*/g)
    .map((t) => t.trim())
    .filter(Boolean);

export const classifyCityRegion = (name: string): CityRegion => {
  const n = normalizePlace(name);
  if (!n) return 'croatia';

  const stripped = stripPrefixes(n);
  const parts = [stripped, ...tokens(stripped)];

  // 1) BiH — cijeli naziv ili bilo koji dio naziva
  if (parts.some((p) => p === 'bih' || p === 'bosna i hercegovina')) return 'bih';
  if (n.includes('bosna i hercegovina') || n.includes('bosansko-podrinjska')) return 'bih';
  for (const place of BIH_PLACES) {
    if (parts.some((p) => p === place)) return 'bih';
  }
  // Npr. "Grad Travnik", "općina Tomislavgrad" — nakon uklanjanja prefiksa
  if (stripped !== n && BIH_PLACES.includes(stripped)) return 'bih';

  // 2) Inozemstvo
  if (ABROAD_PATTERNS.some((p) => n.includes(p))) return 'abroad';

  return 'croatia';
};

export const REGION_LABELS: Record<CityRegion, string> = {
  croatia: 'Hrvatska',
  bih: 'Bosna i Hercegovina',
  abroad: 'Inozemstvo',
};

// Nazivi koji NISU gradovi/mjesta: regije, crkve, groblja i slobodni opisi
// (npr. "Lovrinac", "Gospe od Andjela u Imotski", "Primorskom Docu").
const NON_CITY_MARKERS = [
  'dalmacija', 'hrvatska', 'bosna i hercegovina', 'crna gora', 'zupanija', 'hercegovina',
  'test', 'lovrinac', 'sustipan', 'kvanj', 'dicm', 'dikl',
  'crkv', 'gosp', 'svih svetih', 'svi sveti', 'presvetog', 'kapel', 'zup',
  'obitelji', 'duhovn', 'krug obitelji',
  // slobodni opisi umjesto mjesta: "a nakon sprovoda sluzit ce se sveta misa zadusnica"
  'sprovod', 'sveta misa', 'zadusnic', 'sluzit', 'ukop',
  // drzave/regije umjesto gradova
  'australi', 'austri', 'srbij', 'njemack', 'nemack', 'italij', 'svedsk', 'kanad',
  'englesk', 'francus', 'nizozemsk', 'sjedinjen',
  // dani u tjednu i krace slobodne oznake
  'ponedjeljak', 'utorak', 'srijed', 'cetvrtak', 'petak', 'subota', 'nedjelj',
  // groblja, crkveni nazivi i opisi lokacija
  'groblj', 'friedhof', 'uznesenja', 'blažene djevice', 'blazene djevice',
  'pbdm', 'kraj sinja', 'kraj marine', 'kraj šibenika', 'kraj sibenika',
];

// Razdvojne rijeci koje same po sebi nisu naziv mjesta
const DIRECTION_ONLY = new Set([
  'donji', 'gornji', 'zapadni', 'istocni', 'sjeverni', 'juzni',
  'stari', 'novi', 'veliki', 'mali', 'bih',
]);

// Nazivi s predlogom "na"/lokativom koji su ipak stvarna mjesta
const REAL_PLACE_WHITELIST = new Set([
  'biograd na moru', 'blato na cetini', 'sveti martin na muri',
  'prozor-rama', 'segetu donji', 'okrugu gornji',
]);

// "Grad Zagreb" / "opcina Sinj" -> cisti naziv mjesta
export const normalizeCityName = (raw: string): string =>
  (raw || '')
    .trim()
    .replace(/^(grad|opcina|općina|mjesto|naselje)\s+/i, '')
    .trim();

export const isLikelyCityName = (raw: string): boolean => {
  const name = normalizePlace(raw);
  if (!name || name.length < 3) return false;
  if (REAL_PLACE_WHITELIST.has(name)) return true;
  if (DIRECTION_ONLY.has(name)) return false;
  if (NON_CITY_MARKERS.some((m) => name.includes(m))) return false;
  if (/\btest\b/.test(name)) return false;
  // lokativni opisi s predlogom: "Lovrinac u Splitu", "Gospe na Hladi u ..."
  if (/\s(u|na)\s/.test(name)) return false;
  // naziv zavrsava predlogom: "Hrvacama u", "Nereziscima u", "Selcima o"
  if (/\s(u|na|o|s)$/.test(name)) return false;
  // "Korculi s pocetkom", "Dubrava kod Sibenika", "Pozorac kod Marine"
  if (/\s(s|kod)\s/.test(name)) return false;
  // "otok Brac", "Stari Grad otok Hvar" — opis otoka, ne mjesto
  if (/(^|\s)otok\s/.test(name)) return false;
  // crticom vezani lokaliteti: "Badnj - Drnis", "Gorac - Vrsine"
  if (/\s[-–]\s/.test(name)) return false;
  // lokativni pridjevi: "Primorskom Docu", "Baskoj Vodi", "Velikom Brdu"
  if (/\b[a-z]+(om|oj|em)\s[a-z]/.test(name)) return false;
  // mnozinski lokativ: "Konjevratima", "Rupama", "Mravincima"
  if (/(ima|ama|cima)$/.test(name)) return false;
  // jedninskni lokativ: "Danilu Gornji", "Krkovicu", "Docu" (izuzeci: Bol, Kula)
  if (/\b[a-z]+u\b/.test(name) && !['bolu', 'kula'].includes(name)) return false;
  // skraceni opis: "Prolozac D"
  if (/\b[b-df-hj-np-tv-z]\b$/.test(name)) return false;
  return true;
};
