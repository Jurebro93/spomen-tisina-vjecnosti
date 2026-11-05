import { Button } from '@/components/ui/button';
import { Flame, MapPin, ArrowRight, BookHeart } from 'lucide-react';
import MemorialPrice from '@/components/promo/MemorialPrice';
import { trackHomepageAction } from '@/components/HomepageMemorialSections';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Hero = () => {
  const navigate = useNavigate();
  const [obituaryCount, setObituaryCount] = useState<number | null>(null);
  const [candleCount, setCandleCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [{ count: obitCount, error: obitError }, { data: candles, error: candleError }] = await Promise.all([
          supabase.from('obituaries').select('id', { count: 'exact', head: true }),
          supabase.rpc('virtual_candle_counts')
        ]);

        if (obitError) {
          console.error('Error fetching obituary count:', obitError);
        } else {
          setObituaryCount(obitCount ?? 0);
        }

        if (candleError) {
          console.error('Error fetching candle count:', candleError);
        } else {
          const candleStats = Array.isArray(candles) ? candles[0] : candles;
          setCandleCount(Number(candleStats?.total) || 0);
        }
      } catch (error) {
        console.error('Error fetching hero stats:', error);
      }
    };

    fetchStats();

    const channel = supabase
      .channel('hero-obituary-counts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'obituaries' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'virtual_candles' }, fetchStats)
      .subscribe();

    const interval = window.setInterval(fetchStats, 60000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, []);

  const formatNumber = (n: number | null) =>
    n === null ? '…' : n.toLocaleString('hr-HR');

  const cities = [
    { name: 'Zagreb', slug: 'zagreb' },
    { name: 'Split', slug: 'split' },
    { name: 'Rijeka', slug: 'rijeka' },
    { name: 'Osijek', slug: 'osijek' },
    { name: 'Zadar', slug: 'zadar' },
    { name: 'Pula', slug: 'pula' },
  ];

  const cemeteries = [
    { name: 'Mirogoj', place: 'Zagreb', to: '/groblje/mirogoj' },
    { name: 'Krematorij (Gaj urni)', place: 'Zagreb', to: '/groblje/gaj-urni-krematorij' },
    { name: 'Markovo polje', place: 'Zagreb', to: '/groblje/markovo-polje' },
    { name: 'Drenova', place: 'Rijeka', to: '/groblje/centralno-drenova' },
    { name: 'Monte Ghiro', place: 'Pula', to: '/groblje/monte-ghiro' },
    { name: 'Boninovo', place: 'Dubrovnik', to: '/groblje/gradsko-boninovo' },
  ];

  const chip = 'inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:border-accent hover:text-accent';

  return <section className="border-b border-border bg-memorial-warm py-6 md:py-14">
      <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Osmrtnice · Sprovodi · Groblja</p>
          <h1 className="memorial-title mt-2 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Osmrtnice iz cijele Hrvatske
          </h1>
          <p className="memorial-subtitle mt-3 max-w-2xl text-base md:text-lg leading-relaxed text-muted-foreground">
            Nove osmrtnice i termini sprovoda svaki dan. Zapalite svijeću uz osmrtnicu ili trajno sačuvajte uspomenu u digitalnom memorijalu.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="flex flex-col rounded-lg border border-memorial-gold/40 bg-background p-4 shadow-sm sm:p-5">
              <Flame className="h-7 w-7 text-memorial-gold" aria-hidden="true" />
              <h2 className="mt-3 font-display text-xl font-semibold">Zapalite svijeću</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Svijeća s vašom porukom gori uz osmrtnicu 7, 14 ili 30 dana. Već od 3,99 €.</p>
              <Button size="lg" variant="gold" onClick={() => { trackHomepageAction('hero_candle'); navigate('/zapali-svijecu'); }} className="mt-4 min-h-12 w-full">
                <Flame className="mr-2" size={18} />Zapali svijeću
              </Button>
            </div>
            <div className="flex flex-col rounded-lg bg-primary p-4 text-primary-foreground shadow-sm sm:p-5">
              <BookHeart className="h-7 w-7 text-memorial-gold" aria-hidden="true" />
              <h2 className="mt-3 font-display text-xl font-semibold text-primary-foreground">Digitalni memorijal</h2>
              <p className="mt-1 text-sm leading-6 text-primary-foreground/75">Trajna stranica s pričom, fotografijama i porukama obitelji. <span className="font-semibold text-primary-foreground"><MemorialPrice /> jednokratno</span>, plaćate tek kad vidite gotov memorijal.</p>
              <Button asChild size="lg" variant="gold" className="mt-4 min-h-12 w-full">
                <Link to="/digitalni-memorijal/kreiraj" onClick={() => trackHomepageAction('hero_create')}>Izradi memorijal<ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>
              </Button>
              <a href="#digitalni-memorijal" onClick={() => trackHomepageAction('hero_what_is')} className="mt-3 inline-flex min-h-11 items-center justify-center text-sm font-medium text-primary-foreground/80 underline underline-offset-4">Što je digitalni memorijal?</a>
            </div>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{formatNumber(obituaryCount)}</span> objavljenih osmrtnica · <span className="font-semibold text-foreground">{formatNumber(candleCount)}</span> zapaljenih svijeća · <Link to="/objavi-osmrtnicu" className="font-semibold text-accent underline underline-offset-4">Objavi osmrtnicu</Link>
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background p-5 md:p-6">
          <h2 className="font-display text-xl font-semibold">Osmrtnice po gradovima</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {cities.map((city) => (
              <Link key={city.slug} to={`/umrli/${city.slug}`} className={chip}>
                <MapPin className="mr-1.5 h-4 w-4 text-accent" aria-hidden="true" />{city.name}
              </Link>
            ))}
            <Link to="/umrli" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent hover:underline">Svi gradovi<ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>
          </div>

          <h2 className="mt-6 font-display text-xl font-semibold">Groblja</h2>
          <p className="mt-1 text-sm text-muted-foreground">Adrese, radno vrijeme i informacije o grobljima.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {cemeteries.map((c) => (
              <li key={c.to}>
                <Link to={c.to} className="flex min-h-11 items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:border-accent">
                  <span><span className="font-semibold text-foreground">{c.name}</span> <span className="text-muted-foreground">· {c.place}</span></span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/groblja" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">Sva groblja po gradovima<ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </section>;
};
export default Hero;