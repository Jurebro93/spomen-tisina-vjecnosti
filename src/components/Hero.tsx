import { Button } from '@/components/ui/button';
import { Heart, BookOpen, Flame } from 'lucide-react';
const heroMemorialImg = '/site/hero/hero-digitalni-memorijal.jpg';
import { useNavigate } from 'react-router-dom';
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

  return <section className="relative bg-gradient-to-br from-background via-memorial-warm to-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 fade-in">
            <div className="space-y-6">
              <h1 className="memorial-title text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight">
                Osmrtnice
                <span className="text-accent block">Hrvatska</span>
              </h1>
              
              <p className="memorial-subtitle text-lg md:text-xl text-muted-foreground leading-relaxed">
                Pružamo podršku obiteljima u najtežim trenucima. Objavite osmrtnicu, 
                zapalite virtualnu svijeću i sačuvajte uspomene na vaše najmilije.
              </p>
            </div>

            {/* Call to Action Buttons */}
            <div className="flex flex-col gap-4">
              <Button size="lg" onClick={() => navigate('/digitalni-memorijal')} className="elegant-button w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <BookOpen className="mr-2" size={20} />
                Pročitaj više o digitalnom memorijalu
              </Button>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => navigate('/objavi-osmrtnicu')} className="elegant-button flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  Objavi osmrtnicu
                </Button>

                <Button size="lg" variant="outline" onClick={() => navigate('/zapali-svijecu')} className="elegant-button flex-1 border-2 border-memorial-gold text-memorial-gold bg-white hover:bg-memorial-gold hover:text-white">
                  <Flame className="mr-2" size={20} />
                  Zapali svijeću
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary font-display">{formatNumber(obituaryCount)}</div>
                <div className="text-sm text-muted-foreground">Objavljenih osmrtnica</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary font-display">{formatNumber(candleCount)}</div>
                <div className="text-sm text-muted-foreground">Zapaljenih virtualnih svijeća</div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative slide-up hidden md:block">
            <div className="relative rounded-2xl overflow-hidden shadow-memorial">
              <img 
                src={heroMemorialImg} 
                alt="Digitalni memorijal na mobitelu i računalu uz zapaljenu svijeću - Osmrtnica.com.hr" 
                className="w-full h-[500px] object-cover"
                width={1280}
                height={1024}
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
            
            {/* Floating Quote */}
            <div className="absolute -bottom-6 -left-6 bg-card p-6 rounded-xl shadow-elegant border border-border max-w-xs">
              <div className="flex items-start gap-3">
                <Heart className="text-memorial-gold flex-shrink-0 mt-1" size={20} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    "Smrt nije suprotnost života, već njegov dio."
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">- Haruki Murakami</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;