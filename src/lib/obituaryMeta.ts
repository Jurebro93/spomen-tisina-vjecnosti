// Meta description for obituary pages, 110–155 characters so search engines
// show it whole. 16,447 rows carry the old import's "Osmrtnica za Ime Prezime"
// (too short) and the earlier template ran to 170–210 characters, said
// "preminuo" for women and "u Bosna i Hercegovina" for a country.
// netlify/edge-functions/seo-content.js has a copy of this; keep them in sync.

export interface ObituaryMetaInput {
  ime: string;
  prezime: string;
  datum_rodenja?: string | null;
  datum_smrti?: string | null;
  mjesto_smrti?: string | null;
  datum_ukopa?: string | null;
  vrijeme_ukopa?: string | null;
  groblje?: string | null;
  meta_description?: string | null;
}

// Every stored description so far came from the old import: "Osmrtnica za Ime
// Prezime" alone, or followed by the notice text cut off mid-word.
const OLD_IMPORT = /^Osmrtnica za /;
const MIN = 110;
const MAX = 155;

// mjesto_smrti sometimes holds only the country.
const COUNTRIES = new Set([
  'bosna i hercegovina', 'bih', 'hrvatska', 'republika hrvatska', 'njemacka', 'austrija', 'srbija',
  'slovenija', 'crna gora', 'svicarska', 'italija', 'francuska', 'sad', 'kanada', 'australija', 'svedska',
]);
const FOLD: Record<string, string> = { č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'd' };
const fold = (s: string) => s.trim().toLowerCase().replace(/[čćžšđ]/g, (c) => FOLD[c]);

/** The place of death when it names a town, not a country or nothing. */
export const obituaryPlace = (place?: string | null): string | null => {
  const p = (place || '').trim();
  return p && !COUNTRIES.has(fold(p)) ? p : null;
};

const year = (iso?: string | null) => (iso && /^\d{4}/.test(iso) ? iso.slice(0, 4) : '');

const funeralDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return y && m && d ? `${d}. ${m}. ${y}.` : '';
};

// The import stores the local time in datum_ukopa when vrijeme_ukopa is empty; midnight means no time.
const funeralTime = (o: ObituaryMetaInput) => {
  const t = (o.vrijeme_ukopa || String(o.datum_ukopa || '').replace(' ', 'T').slice(11, 16) || '').slice(0, 5);
  return t && t !== '00:00' ? t : '';
};

const TAILS = [
  'Pročitajte osmrtnicu, zapalite virtualnu svijeću i ostavite sjećanje na pokojnika.',
  'Zapalite virtualnu svijeću i ostavite sjećanje.',
  'Zapalite svijeću.',
  '',
];

export const obituaryDescription = (o: ObituaryMetaInput): string => {
  const own = o.meta_description?.trim();
  if (own && !OLD_IMPORT.test(own) && own.length >= MIN && own.length <= 160) return own;

  const born = year(o.datum_rodenja);
  const died = year(o.datum_smrti);
  const years = born && died ? ` (${born}. – ${died}.)` : died ? ` († ${died}.)` : '';
  const place = obituaryPlace(o.mjesto_smrti);
  const head = `Osmrtnica: ${`${o.ime} ${o.prezime}`.trim()}${years}${place ? `, ${place}` : ''}.`;

  const date = o.datum_ukopa ? funeralDate(String(o.datum_ukopa)) : '';
  const time = funeralTime(o);
  const cemetery = (o.groblje || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const funerals = date
    ? [
        cemetery ? `Sprovod ${date}${time ? ` u ${time}` : ''}, ${cemetery}.` : '',
        `Sprovod ${date}${time ? ` u ${time}` : ''}.`,
        '',
      ]
    : [cemetery ? `Ukop: ${cemetery}.` : '', ''];

  for (const funeral of funerals) {
    for (const tail of TAILS) {
      const text = [head, funeral, tail].filter(Boolean).join(' ');
      if (text.length <= MAX) return text;
    }
  }
  return head.length <= MAX ? head : `${head.slice(0, MAX - 1).replace(/\s+\S*$/, '')}…`;
};
