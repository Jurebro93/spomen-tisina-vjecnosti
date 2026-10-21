import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cityLabelFromSlug, cityPattern } from '@/lib/cityMatch';

/**
 * City name as written in the data ("Metković", "Slavonski Brod") for an
 * ASCII URL slug. Starts with a readable guess from the slug, then uses the
 * spelling found in obituaries.mjesto_smrti.
 *
 * The name always belongs to the current slug: moving from /umrli/zagreb to
 * /umrli/split keeps the same page mounted, and returning the previous city's
 * name for even one render made the page load Zagreb's obituaries under Split.
 */
export const useCityName = (slug?: string): string => {
  const fallback = slug ? cityLabelFromSlug(slug) : '';
  const [found, setFound] = useState<{ slug?: string; name: string } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    supabase
      .from('obituaries')
      .select('mjesto_smrti')
      .filter('mjesto_smrti', 'imatch', `^${cityPattern(fallback)}$`)
      .limit(1)
      .then(({ data }) => {
        const name = data?.[0]?.mjesto_smrti?.trim();
        if (!cancelled && name) setFound({ slug, name });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, fallback]);

  return found && found.slug === slug ? found.name : fallback;
};
