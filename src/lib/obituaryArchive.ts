import { supabase } from '@/integrations/supabase/client';
import { cityOrFilter, isOtherPlace } from '@/lib/cityMatch';

// Month archives: /umrli/:city/:godina/:mjesec lists every obituary whose
// mjesto_smrti is in that city, /umrli/arhiva/:godina/:mjesec every obituary
// of the month. They give each obituary a crawlable link from a page that
// is at most three clicks from the homepage.
// netlify/edge-functions/seo-content.js renders the same pages for crawlers.

export const NATIONAL = 'arhiva';
// Before 2022 there are only a few dozen obituaries; they are reached through
// the "same period" links on the obituary pages.
export const FIRST_MONTH = '2022-01';

export const MONTH_NAMES = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'];

export const monthLabel = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}.`;

const PAGE = 1000;

export type ArchiveRow = {
  id: string;
  ime: string;
  prezime: string;
  slug: string | null;
  datum_rodenja: string | null;
  datum_smrti: string | null;
  mjesto_smrti: string | null;
};

// PostgREST returns at most 1000 rows per request.
const fetchAll = async <T>(build: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
};

export const nextMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

export const prevMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

/** Every month from FIRST_MONTH to the current one, newest first. */
export const allMonths = (): string[] => {
  const now = new Date();
  const last = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const months: string[] = [];
  for (let ym = FIRST_MONTH; ym <= last; ym = nextMonth(ym)) months.push(ym);
  return months.reverse();
};

/** Months with at least one obituary in the city, newest first, with counts. */
export const fetchCityMonths = async (cityName: string): Promise<Array<{ ym: string; count: number }>> => {
  const rows = await fetchAll<{ datum_smrti: string | null; mjesto_smrti: string | null }>((from) =>
    supabase
      .from('obituaries')
      .select('datum_smrti, mjesto_smrti')
      .or(cityOrFilter(cityName, ['mjesto_smrti']))
      .not('datum_smrti', 'is', null)
      .order('datum_smrti', { ascending: false })
      .range(from, from + PAGE - 1),
  );
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.datum_smrti || isOtherPlace(r, cityName, ['mjesto_smrti'])) continue;
    const ym = r.datum_smrti.slice(0, 7);
    counts.set(ym, (counts.get(ym) || 0) + 1);
  }
  return [...counts].map(([ym, count]) => ({ ym, count })).sort((a, b) => b.ym.localeCompare(a.ym));
};

/** Obituaries that died in the month, oldest first; cityName null means all of them. */
export const fetchArchive = async (cityName: string | null, ym: string): Promise<ArchiveRow[]> => {
  const rows = await fetchAll<ArchiveRow>((from) => {
    let q = supabase
      .from('obituaries')
      .select('id, ime, prezime, slug, datum_rodenja, datum_smrti, mjesto_smrti')
      .gte('datum_smrti', `${ym}-01`)
      .lt('datum_smrti', `${nextMonth(ym)}-01`)
      .not('slug', 'is', null);
    if (cityName) q = q.or(cityOrFilter(cityName, ['mjesto_smrti']));
    return q.order('datum_smrti', { ascending: true }).order('id', { ascending: true }).range(from, from + PAGE - 1);
  });
  return cityName ? rows.filter((r) => !isOtherPlace(r, cityName, ['mjesto_smrti'])) : rows;
};

export const isMonthParam = (godina?: string, mjesec?: string) =>
  !!godina && !!mjesec && /^\d{4}$/.test(godina) && /^(0[1-9]|1[0-2])$/.test(mjesec);

