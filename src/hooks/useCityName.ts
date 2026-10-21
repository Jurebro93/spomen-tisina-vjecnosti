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
    const pattern = `^${cityPattern(fallback)}$`;
    (async () => {
      const { data } = await supabase.from('obituaries').select('mjesto_smrti').filter('mjesto_smrti', 'imatch', pattern).limit(1);
      let name = data?.[0]?.mjesto_smrti?.trim();
      // Cities known only from funeral schedules (Čakovec) still get their real spelling.
      if (!name) {
        const { data: scheduled } = await supabase.from('sprovodi').select('grad').filter('grad', 'imatch', pattern).limit(1);
        name = scheduled?.[0]?.grad?.trim();
      }
      if (!cancelled && name) setFound({ slug, name });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, fallback]);

  return found && found.slug === slug ? found.name : fallback;
};
