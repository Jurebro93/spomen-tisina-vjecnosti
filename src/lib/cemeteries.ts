import { supabase } from '@/integrations/supabase/client';
import { citySlug } from '@/lib/cityMatch';

export type CemeteryRow = {
  Grad: string | null;
  'Naziv groblja': string | null;
  Adresa: string | null;
  'Kontakt broj': string | null;
  'E-mail': string | null;
  'Radno vrijeme': string | null;
  Opis: string | null;
};

export type WorkingHour = {
  datum: string | null;
  vrijeme: string;
};

export type Cemetery = {
  naziv: string;
  displayNaziv: string;
  grad: string | null;
  adresa: string | null;
  telefon: string | null;
  email: string | null;
  radnoVrijeme: string | null;
  radnoVrijemeParts: WorkingHour[];
  opis: string | null;
  slug: string | null; // only set when Opis exists (page is generated)
};

/** Adds "Groblje" prefix unless the name already contains it. */
export const withGrobljePrefix = (naziv: string): string => {
  const normalized = naziv
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/ž/g, 'z')
    .replace(/š/g, 's')
    .replace(/đ/g, 'd');
  return /\bgroblj/.test(normalized) ? naziv : `Groblje ${naziv}`;
};

/** Splits combined working hours into "datum + vrijeme" rows. */
export const parseWorkingHours = (value: string | null): WorkingHour[] => {
  if (!value) return [];
  return value
    .split(/[;\n]|(?:\s{2,})/)
    .map((chunk) => chunk.trim().replace(/^[-–,]\s*/, ''))
    .filter(Boolean)
    .map((chunk) => {
      const match = chunk.match(/((?:\d{1,2}[:.]\d{2}\s*[–\-—]\s*\d{1,2}[:.]\d{2}).*)$/);
      if (match && match.index && match.index > 0) {
        return {
          datum: chunk.slice(0, match.index).trim().replace(/[,–-]\s*$/, ''),
          vrijeme: match[1].trim(),
        };
      }
      return { datum: null, vrijeme: chunk };
    });
};


const DIACRITICS: Record<string, string> = {
  č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'd',
  Č: 'c', Ć: 'c', Ž: 'z', Š: 's', Đ: 'd',
};

export const slugifyCemeteryName = (name: string): string => {
  let s = (name || '').trim().toLowerCase();
  s = s.replace(/[čćžšđ]/g, (c) => DIACRITICS[c] || c);
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // remove generic prefixes like "gradsko groblje", "mjesno groblje", "groblje"
  s = s.replace(/\b(gradsko|mjesno|novo|staro|centralno|glavno|zupno|katolicko)?\s*groblje\b/g, ' ');
  s = s.replace(/[^a-z0-9]+/g, '-');
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s;
};

// Compare as URL slugs so "slavonski-brod" (from the URL) matches "Slavonski Brod".
const normalizeCity = (city: string) => citySlug(decodeURIComponent(city));

/** Fetch all cemeteries with deterministic, de-duplicated slugs. */
export const fetchCemeteries = async (): Promise<Cemetery[]> => {
  const { data, error } = await supabase
    .from('groblja_i_opisi')
    .select('*')
    .order('Naziv groblja', { ascending: true });

  if (error) {
    console.error('Error fetching cemeteries:', error);
    return [];
  }

  const used = new Set<string>();

  return ((data as CemeteryRow[]) || [])
    .filter((row) => !!row['Naziv groblja'])
    .map((row) => {
      const naziv = (row['Naziv groblja'] as string).trim();
      const opis = row.Opis?.trim() || null;
      let slug: string | null = null;

      if (opis) {
        const base = slugifyCemeteryName(naziv) || 'groblje';
        let candidate = base;
        let counter = 1;
        while (used.has(candidate)) {
          counter += 1;
          candidate = `${base}-${counter}`;
        }
        used.add(candidate);
        slug = candidate;
      }

      const radnoVrijeme = row['Radno vrijeme']?.trim() || null;

      return {
        naziv,
        displayNaziv: withGrobljePrefix(naziv),
        grad: row.Grad?.trim() || null,
        adresa: row.Adresa?.trim() || null,
        telefon: row['Kontakt broj']?.trim() || null,
        email: row['E-mail']?.trim() || null,
        radnoVrijeme,
        radnoVrijemeParts: parseWorkingHours(radnoVrijeme),
        opis,
        slug,
      };
    });
};

export const fetchCemeteriesByCity = async (city: string): Promise<Cemetery[]> => {
  const target = normalizeCity(city);
  const all = await fetchCemeteries();
  return all.filter((c) => c.grad && normalizeCity(c.grad) === target);
};

export const fetchCemeteryBySlug = async (slug: string): Promise<Cemetery | null> => {
  const all = await fetchCemeteries();
  return all.find((c) => c.slug === slug) || null;
};
