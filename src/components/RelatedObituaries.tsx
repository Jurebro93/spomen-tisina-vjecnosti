import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cityOrFilter, citySlug } from '@/lib/cityMatch';
import { fetchCemeteries, slugifyCemeteryName } from '@/lib/cemeteries';
import { obituaryPlace } from '@/lib/obituaryMeta';
import { formatLifespan } from '@/lib/utils';

// Links from an obituary to its city, funeral schedule, cemetery, month
// archive and neighbouring obituaries. Without them most obituaries had no
// internal link at all (Ahrefs: 23,831 orphan pages) and search engines found
// them only through the sitemap. The "same period" list walks all obituaries
// in (datum_smrti, id) order, so following it reaches every one of them.
// netlify/edge-functions/seo-content.js renders the same links for crawlers.

type Row = { id: string; ime: string; prezime: string; slug: string | null; datum_rodenja: string | null; datum_smrti: string | null; mjesto_smrti: string | null };

interface Props {
  id: string;
  datum_smrti?: string | null;
  mjesto_smrti?: string | null;
  groblje?: string | null;
}

const FIELDS = 'id, ime, prezime, slug, datum_rodenja, datum_smrti, mjesto_smrti';

const RelatedObituaries = ({ id, datum_smrti, mjesto_smrti, groblje }: Props) => {
  const place = obituaryPlace(mjesto_smrti);
  const date = datum_smrti?.slice(0, 10) || null;
  const [sameCity, setSameCity] = useState<Row[]>([]);
  const [samePeriod, setSamePeriod] = useState<Row[]>([]);
  const [cemetery, setCemetery] = useState<{ slug: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const cityQuery = (before: boolean) => {
        let q = supabase.from('obituaries').select(FIELDS).or(cityOrFilter(place!, ['mjesto_smrti'])).neq('id', id).not('slug', 'is', null);
        q = before ? q.lte('datum_smrti', date!).order('datum_smrti', { ascending: false }) : q.gt('datum_smrti', date!).order('datum_smrti', { ascending: true });
        return q.limit(before ? 4 : 3);
      };
      const periodQuery = (before: boolean) =>
        supabase
          .from('obituaries')
          .select(FIELDS)
          .or(before ? `datum_smrti.lt.${date},and(datum_smrti.eq.${date},id.lt.${id})` : `datum_smrti.gt.${date},and(datum_smrti.eq.${date},id.gt.${id})`)
          .not('slug', 'is', null)
          .order('datum_smrti', { ascending: !before })
          .order('id', { ascending: !before })
          .limit(3);
      try {
        const [cb, ca, pb, pa] = await Promise.all([
          place && date ? cityQuery(true) : null,
          place && date ? cityQuery(false) : null,
          date ? periodQuery(true) : null,
          date ? periodQuery(false) : null,
        ]);
        if (cancelled) return;
        const city = [...((ca?.data as Row[]) || []).reverse(), ...((cb?.data as Row[]) || [])];
        const cityIds = new Set(city.map((r) => r.id));
        setSameCity(city);
        setSamePeriod([...((pa?.data as Row[]) || []).reverse(), ...((pb?.data as Row[]) || [])].filter((r) => !cityIds.has(r.id)));
      } catch (e) {
        console.error('Related obituaries:', e);
      }
      if (groblje) {
        try {
          const key = slugifyCemeteryName(groblje);
          const match = key ? (await fetchCemeteries()).find((c) => c.slug && slugifyCemeteryName(c.naziv) === key) : null;
          if (!cancelled && match?.slug) setCemetery({ slug: match.slug, name: match.displayNaziv });
        } catch {
          // The cemetery link is optional.
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, date, place, groblje]);

  const slug = place ? citySlug(place) : null;
  const month = date ? { y: date.slice(0, 4), m: date.slice(5, 7) } : null;

  const list = (rows: Row[]) => (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="py-2">
          <Link to={`/${r.slug}`} className="font-medium hover:text-primary underline-offset-4 hover:underline">
            {r.ime} {r.prezime}
          </Link>
          <span className="text-sm text-muted-foreground">
            {[formatLifespan(r.datum_rodenja, r.datum_smrti), r.mjesto_smrti?.trim()].filter(Boolean).map((t) => ` · ${t}`)}
          </span>
        </li>
      ))}
    </ul>
  );

  if (!slug && !month && samePeriod.length === 0) return null;

  return (
    <Card className="mb-6 sm:mb-8">
      <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
        {sameCity.length > 0 && place && (
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3">Ostale osmrtnice iz mjesta {place}</h2>
            {list(sameCity)}
          </section>
        )}
        {samePeriod.length > 0 && (
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3">Osmrtnice iz istog razdoblja</h2>
            {list(samePeriod)}
          </section>
        )}
        <nav aria-label="Povezane stranice" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {slug && (
            <>
              <Link to={`/umrli/${slug}`} className="underline hover:text-primary">Umrli {place}</Link>
              <Link to={`/sprovodi/${slug}`} className="underline hover:text-primary">Sprovodi {place}</Link>
            </>
          )}
          {cemetery && (
            <Link to={`/groblje/${cemetery.slug}`} className="underline hover:text-primary">{cemetery.name}</Link>
          )}
          {month && (
            <Link to={slug ? `/umrli/${slug}/${month.y}/${month.m}` : `/umrli/arhiva/${month.y}/${month.m}`} className="underline hover:text-primary">
              Osmrtnice {slug ? `${place}, ` : ''}{Number(month.m)}/{month.y}
            </Link>
          )}
        </nav>
      </CardContent>
    </Card>
  );
};

export default RelatedObituaries;
