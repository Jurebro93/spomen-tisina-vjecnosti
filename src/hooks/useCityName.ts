import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cityLabelFromSlug, cityPattern } from '@/lib/cityMatch';

/**
 * City name as written in the data ("Metković", "Slavonski Brod") for an
 * ASCII URL slug. Starts with a readable guess from the slug, then uses the
 * spelling found in obituaries.mjesto_smrti.
 */
export const useCityName = (slug?: string): string => {
  const fallback = slug ? cityLabelFromSlug(slug) : '';
  const [name, setName] = useState(fallback);

  useEffect(() => {
    setName(fallback);
    if (!slug) return;
    let cancelled = false;
    supabase
      .from('obituaries')
      .select('mjesto_smrti')
      .filter('mjesto_smrti', 'imatch', `^${cityPattern(fallback)}$`)
      .limit(1)
      .then(({ data }) => {
        const found = data?.[0]?.mjesto_smrti?.trim();
        if (!cancelled && found) setName(found);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, fallback]);

  return name;
};
