// Title/H1/H2 test on /umrli/{grad} pages (started 2026-10).
// Cities in TEST_CITIES get the new title, description, H1 and H2 wording;
// every other city keeps the old wording as the control group, so the effect
// can be measured against it in Search Console. Groups are matched pairs by
// impressions (plan: naslovi-h1/plan-naslovi-h1-h2-2026-10-19.md).
// netlify/edge-functions/seo-content.js has a copy of this; keep them in sync.

export const TEST_CITIES = new Set([
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
const TITLE_OVERRIDES: Record<string, string> = {
  osijek: 'Umrli Osijek danas – osmrtnice, ukopi i sprovodi',
  dubrovnik: 'Umrli Dubrovnik danas – osmrtnice, Boninovo i sprovodi',
  metkovic: 'Umrli Metković i okolna mjesta – osmrtnice danas',
};

export const isTestCity = (slug?: string): boolean => !!slug && TEST_CITIES.has(slug);

export const testCityTitle = (slug: string, city: string): string =>
  TITLE_OVERRIDES[slug] ?? `Umrli ${city} danas – osmrtnice i raspored sprovoda`;

const ddmm = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}.`;

// Croatian number agreement: 1 osmrtnica, 3 osmrtnice, 5 osmrtnica.
const plural = (n: number, one: string, few: string, many: string): string => {
  const d = n % 10, h = n % 100;
  if (d === 1 && h !== 11) return `${n} ${one}`;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
};

/** Description with the update date and counts: freshness is why people click "umrli danas". */
export const testCityDescription = (city: string, obituaries: number, funerals: number, today = new Date()): string => {
  const parts = [`Osmrtnice ${city}, ažurirano ${ddmm(today)}`];
  const counts: string[] = [];
  if (obituaries > 0) counts.push(`${plural(obituaries, 'osmrtnica', 'osmrtnice', 'osmrtnica')} ovaj mjesec`);
  if (funerals > 0) counts.push(`${plural(funerals, 'sprovod', 'sprovoda', 'sprovoda')} ovaj tjedan`);
  return `${parts[0]}${counts.length ? `: ${counts.join(', ')}` : ''}. Vrijeme i groblje ukopa, raspored sprovoda i virtualna svijeća.`;
};

export const testCityH1 = (city: string): string => `Umrli ${city} – osmrtnice danas`;
