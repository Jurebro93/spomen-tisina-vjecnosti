import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessSettings {
  legal_name: string;
  address: string;
  postal_code: string | null;
  city: string | null;
  country: string;
  oib: string;
  mbo: string | null;
  founded_year: string | null;
  email: string;
  phone: string | null;
  website: string;
  tax_note: string;
  register_info: string | null;
}

/** Confirmed fallback, identical to the seeded database row, so pages never render empty. */
export const BUSINESS_FALLBACK: BusinessSettings = {
  legal_name: 'TECHNIKO, obrt za propagandu i usluge, vl. Nikola Kljajić',
  address: 'Put Drage 25',
  postal_code: null,
  city: 'Žaborić',
  country: 'Hrvatska',
  oib: '05906580483',
  mbo: '98667360',
  founded_year: '2023',
  email: 'info@osmrtnica.com.hr',
  phone: null,
  website: 'https://osmrtnica.com.hr',
  tax_note: 'Obrt nije u sustavu PDV-a.',
  register_info: null,
};

export const fullAddress = (b: BusinessSettings) =>
  [b.address, [b.postal_code, b.city].filter(Boolean).join(' '), b.country].filter(Boolean).join(', ');

export const useBusiness = () => {
  const q = useQuery({
    queryKey: ['business_settings'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('business_settings').select('*').eq('id', 1).maybeSingle();
      return (data as BusinessSettings | null) ?? BUSINESS_FALLBACK;
    },
    staleTime: 10 * 60_000,
  });
  return q.data ?? BUSINESS_FALLBACK;
};

/** Missing data the owner still has to confirm — shown only in admin. */
export const missingBusinessFields = (b: BusinessSettings) => {
  const m: string[] = [];
  if (!b.postal_code) m.push('Poštanski broj sjedišta');
  if (!b.phone) m.push('Telefon');
  if (!b.register_info) m.push('Podaci iz Obrtnog registra (puni registrirani naziv, nadležni ured)');
  return m;
};
