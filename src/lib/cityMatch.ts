// City URLs use ASCII slugs (/umrli/metkovic, /umrli/kastel-stari) while the
// data has diacritics and spaces ("Metković", "Kaštel Stari"). A plain ilike
// on the slug finds nothing, so those pages rendered empty and noindex.
// Match with a case-insensitive regex that accepts either spelling.
// netlify/edge-functions/seo-content.js has a copy of this; keep them in sync.

const FOLD: Record<string, string> = { č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'd' };
const CLASSES: Record<string, string> = { c: '[cčć]', s: '[sš]', z: '[zž]', d: '[dđ]' };

export const cityPattern = (city: string): string =>
  city
    .trim()
    .toLowerCase()
    .replace(/[čćžšđ]/g, (ch) => FOLD[ch])
    .split('')
    .map((ch) => CLASSES[ch] ?? (/[a-z0-9]/.test(ch) ? ch : '[- ]'))
    .join('')
    // "Slivno - Ravno", "Sv. Sustipan, Jesenice": any run of spaces, hyphens,
    // commas or dots between words, else /umrli/slivno-ravno found nothing.
    .replace(/(\[- \])+/g, '[-,. ]+');

// The import often names only the cemetery or the inflected city ("Lovrinac",
// "u Zadru", "Drenova"), so the city's name alone missed most of its
// obituaries (Split: 4 of 64 in a month). Distinctive extra words per city
// slug; generic names such as "Kamen" or "Centralno groblje" are left out on
// purpose because they also appear in other places.
const CITY_ALIASES: Record<string, string[]> = {
  split: ['lovrinac'],
  zadar: ['zadru', 'belafuža'],
  zagreb: ['mirogoj', 'miroševac', 'markovo polje'],
  rijeka: ['rijeci', 'drenova', 'kozala'],
  dubrovnik: ['boninovo'],
  karlovac: ['karlovcu'],
  sisak: ['sisku'],
  'slavonski-brod': ['slavonskom brodu'],
};

/** Regex for the city or any of its aliases. */
const cityAnyPattern = (city: string): string =>
  [city, ...(CITY_ALIASES[citySlug(city)] ?? [])].map(cityPattern).join('|');

// A substring match also finds other places that start with the city's name:
// "Varaždinske Toplice" for Varaždin, the village "Splitska" on Brač for Split.
const CITY_EXCLUDE: Record<string, string[]> = {
  varazdin: ['varaždinsk'],
  split: ['splitsk'],
  imotski: ['imotskim poljic', 'imotska poljic'],
};

/**
 * True when the row matched the city only through one of the CITY_EXCLUDE
 * places, so it belongs to another town. Rows that never mention such a place stay.
 */
export const isOtherPlace = (row: Record<string, unknown>, city: string, columns: string[]): boolean => {
  const excluded = CITY_EXCLUDE[citySlug(city)];
  if (!excluded) return false;
  const exclude = new RegExp(excluded.map(cityPattern).join('|'), 'gi');
  const values = columns.map((col) => String(row[col] ?? ''));
  if (!values.some((v) => new RegExp(exclude.source, 'i').test(v))) return false;
  const match = new RegExp(cityAnyPattern(city), 'i');
  return !values.some((v) => match.test(v.replace(exclude, ' ')));
};

/** Whether a free-text place ("Lovrinac u Splitu", "Grad Zagreb") belongs to the city. */
export const placeInCity = (place: string, city: string): boolean =>
  new RegExp(cityAnyPattern(city), 'i').test(place) && !isOtherPlace({ place }, city, ['place']);

/** PostgREST or() filter: any of the columns contains the city. */
export const cityOrFilter = (city: string, columns: string[]): string => {
  const pattern = `"${cityAnyPattern(city)}"`;
  return columns.map((col) => `${col}.imatch.${pattern}`).join(',');
};

/** URL slug for a city page: "Slavonski Brod" -> "slavonski-brod", "Metković" -> "metkovic". */
export const citySlug = (city: string): string =>
  city
    .trim()
    .toLowerCase()
    .replace(/[čćžšđ]/g, (ch) => FOLD[ch])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Readable fallback from a slug: "slavonski-brod" -> "Slavonski Brod". */
export const cityLabelFromSlug = (slug: string): string =>
  decodeURIComponent(slug)
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
