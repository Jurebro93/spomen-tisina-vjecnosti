import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapPin, Users, Search } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ObituariesGallery from '@/components/ObituariesGallery';
import { MemorialPublicListing } from '@/components/MemorialPublicListing';
import MemorialCtaSection from '@/components/MemorialCtaSection';
import VirtualCandles from '@/components/VirtualCandles';

import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { classifyCityRegion, CityRegion, isLikelyCityName } from '@/lib/cityRegions';
import { citySlug } from '@/lib/cityMatch';

type City = { name: string; count: number };

const REGION_ORDER: CityRegion[] = ['croatia', 'bih', 'abroad'];

const REGION_META: Record<CityRegion, { title: string; subtitle: string }> = {
  croatia: {
    title: 'Hrvatska',
    subtitle: 'Osmrtnice, memorijali i groblja u hrvatskim gradovima i mjestima',
  },
  bih: {
    title: 'Bosna i Hercegovina',
    subtitle: 'Osmrtnice i memorijali iz gradova i mjesta BiH',
  },
  abroad: {
    title: 'Inozemstvo',
    subtitle: 'Osmrtnice Hrvata i iseljenih obitelji po svijetu',
  },
};

const MAIN_CROATIAN_CITIES = [
  'Zagreb',
  'Split',
  'Osijek',
  'Zadar',
  'Rijeka',
  'Pula',
  'Makarska',
  'Imotski',
  'Šibenik',
  'Trogir',
  'Solin',
  'Metković',
];

const Gradovi = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    supabase.rpc('obituary_city_counts').then(({ data }) => {
      const list = ((data as City[]) || [])
        .filter((c) => isLikelyCityName(c.name))
        .sort((a, b) => a.name.localeCompare(b.name, 'hr'));
      setCities(list);
      setLoading(false);
    });
  }, []);

  const groupedByRegion = useMemo(() => {
    const norm = q.trim().toLowerCase();
    const filtered = cities.filter((c) => !norm || c.name.toLowerCase().includes(norm));

    const byRegion = new Map<CityRegion, City[]>([
      ['croatia', []],
      ['bih', []],
      ['abroad', []],
    ]);
    filtered.forEach((c) => {
      byRegion.get(classifyCityRegion(c.name))!.push(c);
    });

    // Glavni hrvatski gradovi — istaknuta kartica iznad abecednog popisa
    const matchedDbNames = new Set<string>();
    const mainCities = MAIN_CROATIAN_CITIES
      .map((name) => {
        const norm = name.toLowerCase();
        const db = byRegion.get('croatia')!.find((c) => c.name.toLowerCase() === norm || c.name.toLowerCase().startsWith(`${norm}-`));
        if (!db) return null;
        matchedDbNames.add(db.name);
        const matches = !norm || name.toLowerCase().includes(norm) || db.name.toLowerCase().includes(norm);
        return matches ? { ...db, name } : null;
      })
      .filter((c): c is City => Boolean(c));
    const croatiaRest = byRegion.get('croatia')!.filter((c) => !matchedDbNames.has(c.name));

    // Unutar svake regije grupiraj po prvom slovu (abecedno)
    return REGION_ORDER.map((region) => {
      const list = region === 'croatia' ? croatiaRest : byRegion.get(region)!;
      const map = new Map<string, City[]>();
      list.forEach((c) => {
        const letter = c.name.charAt(0).toUpperCase();
        if (!map.has(letter)) map.set(letter, []);
        map.get(letter)!.push(c);
      });
      const total = (region === 'croatia'
        ? croatiaRest.reduce((s, c) => s + c.count, 0) + mainCities.reduce((s, c) => s + c.count, 0)
        : list.reduce((s, c) => s + c.count, 0));
      return { region, letters: Array.from(map.entries()), total, mainCities: region === 'croatia' ? mainCities : [] };
    }).filter((g) => g.letters.length > 0 || g.mainCities.length > 0);
  }, [cities, q]);

  const anyResults = groupedByRegion.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Umrli po gradovima | Hrvatska i BiH | Osmrtnica.com.hr</title>
        <meta name="description" content="Popis svih gradova i mjesta u Hrvatskoj i Bosni i Hercegovini s osmrtnicama, poredan abecedno. Pronađite osmrtnice, memorijale, svijeće i groblja u svom gradu." />
        <link rel="canonical" href="https://osmrtnica.com.hr/gradovi" />
      </Helmet>
      <Header />
      <section className="bg-gradient-to-b from-memorial-gold/5 to-background py-14">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <MapPin className="h-8 w-8 text-memorial-gold" />
              <h1 className="text-3xl md:text-4xl font-bold text-primary">Umrli po gradovima</h1>
            </div>
            <p className="text-lg text-muted-foreground">Svi gradovi i mjesta s osmrtnicama, poredani abecedno</p>
            <div className="w-24 h-1 bg-memorial-gold mx-auto rounded-full mt-5" />
          </div>
          <div className="relative max-w-md mx-auto mb-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pretraži grad..." className="pl-9" />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Učitava gradove...</p>
          ) : !anyResults ? (
            <p className="text-center text-muted-foreground">Nema gradova za taj upit.</p>
          ) : (
            <div className="space-y-14">
              {groupedByRegion.map(({ region, letters, total, mainCities }) => (
                <div key={region} id={region}>
                  <div className="flex items-baseline justify-between border-b-2 border-memorial-gold/40 pb-2 mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-primary">{REGION_META[region].title}</h2>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                      <Users className="h-4 w-4 text-memorial-gold" />
                      {total.toLocaleString('hr-HR')} osmrtnica
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-5 -mt-4">{REGION_META[region].subtitle}</p>
                  {mainCities.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Glavni gradovi</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {mainCities.map((c) => (
                          <Link key={c.name} to={`/umrli/${citySlug(c.name)}`}
                            className="flex items-center justify-between rounded-lg border border-memorial-gold/40 bg-memorial-gold/5 px-4 py-3 transition-colors hover:border-memorial-gold hover:bg-memorial-gold/15 group">
                            <span className="font-semibold text-primary group-hover:text-memorial-gold">{c.name}</span>
                            <span className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5 text-memorial-gold" />{c.count}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-8">
                    {letters.map(([letter, list]) => (
                      <div key={letter}>
                        <h3 className="text-xl font-semibold text-memorial-gold border-b border-memorial-gold/30 pb-1 mb-3">{letter}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                          {list.map((c) => (
                            <Link key={c.name} to={`/umrli/${citySlug(c.name)}`}
                              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-memorial-gold/10 transition-colors group">
                              <span className="font-medium text-primary group-hover:text-memorial-gold">{c.name}</span>
                              <span className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-3 w-3" />{c.count}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <ObituariesGallery />
      <MemorialCtaSection />
      <MemorialPublicListing />
      <VirtualCandles />
      <section className="py-12"><div className="container mx-auto px-4 max-w-5xl text-center">
        <h2 className="text-2xl font-bold text-primary mb-6">Groblja po gradovima</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Zagreb','Split','Rijeka','Osijek','Zadar','Pula','Varaždin','Dubrovnik'].map((g) => (
            <Link key={g} to={`/groblja/${citySlug(g)}`} className="rounded-lg border border-memorial-gold/30 p-3 font-medium text-primary hover:bg-memorial-gold/10">Groblja {g}</Link>
          ))}
        </div>
      </div></section>
      <Footer />
    </div>
  );
};

export default Gradovi;
