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
    .join('');

/** PostgREST or() filter: any of the columns contains the city. */
export const cityOrFilter = (city: string, columns: string[]): string => {
  const pattern = `"${cityPattern(city)}"`;
  return columns.map((col) => `${col}.imatch.${pattern}`).join(',');
};
