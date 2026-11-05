import { Button } from '@/components/ui/button';
import { Flame, MapPin, ArrowRight } from 'lucide-react';
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

  return <section className="border-b border-border bg-memorial-warm py-10 md:py-16">
      <div className="container mx-auto max-w-4xl px-4 md:text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">Osmrtnice · Sprovodi · Groblja</p>
        <h1 className="memorial-title mt-3 text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
          Osmrtnice iz cijele Hrvatske
        </h1>
        <p className="memorial-subtitle mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Svaki dan objavljujemo nove osmrtnice i termine sprovoda. Pronađite osmrtnicu, zapalite svijeću ili objavite osmrtnicu za svoju obitelj.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 md:justify-center" aria-label="Osmrtnice po gradovima">
          {cities.map((city) => (
            <Link key={city.slug} to={`/umrli/${city.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:border-accent hover:text-accent">
              <MapPin className="mr-1.5 h-4 w-4 text-accent" aria-hidden="true" />{city.name}
            </Link>
          ))}
          <Link to="/umrli" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-accent hover:underline">
            Svi gradovi<ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row md:justify-center">
          <Button size="lg" onClick={() => navigate('/objavi-osmrtnicu')} className="elegant-button min-h-12 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
            Objavi osmrtnicu
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/zapali-svijecu')} className="elegant-button min-h-12 border-2 border-memorial-gold bg-white px-8 text-memorial-gold hover:bg-memorial-gold hover:text-white">
            <Flame className="mr-2" size={20} />
            Zapali svijeću
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{formatNumber(obituaryCount)}</span> objavljenih osmrtnica · <span className="font-semibold text-foreground">{formatNumber(candleCount)}</span> zapaljenih svijeća
        </p>
      </div>
    </section>;
};
export default Hero;