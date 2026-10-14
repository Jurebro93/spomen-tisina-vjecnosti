import { useState, useEffect } from 'react';
import { Flame, Heart, MessageCircle, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
const candlesImage = "/site/memorial-candles.jpg";
const candleFlame = "/site/candle-flame-large.png";
import { supabase } from '@/integrations/supabase/client';

const VirtualCandles = () => {
  const [candles, setCandles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyCount, setDailyCount] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchCounts = async () => {
    const { data, error } = await supabase.rpc('virtual_candle_counts');
    if (error) {
      console.error('Error fetching candle counts:', error);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setDailyCount(Number(row.today) || 0);
      setWeeklyCount(Number(row.this_week) || 0);
      setTotalCount(Number(row.total) || 0);
    }
  };

  useEffect(() => {
    fetchCandles();
    fetchCounts();

    const channel = supabase
      .channel('virtual-candles-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'virtual_candles' }, () => {
        fetchCounts();
        fetchCandles();
      })
      .subscribe();

    const interval = window.setInterval(fetchCounts, 60000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, []);


  const fetchCandles = async () => {
    try {
      const { data, error } = await supabase
        .from('virtual_candles_public')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching candles:', error);
      } else {
        setCandles(data || []);
      }
    } catch (error) {
      console.error('Error fetching candles:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'prije manje od sata';
    if (diffInHours < 24) return `prije ${diffInHours} ${diffInHours === 1 ? 'sat' : 'sati'}`;
    if (diffInDays === 1) return 'prije 1 dan';
    if (diffInDays < 7) return `prije ${diffInDays} dana`;
    return `prije ${Math.floor(diffInDays / 7)} ${Math.floor(diffInDays / 7) === 1 ? 'tjedan' : 'tjedana'}`;
  };

  return (
    <section className="py-16 bg-gradient-to-br from-background to-candle-warm" id="virtualne-svijece">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="memorial-title mb-4">Virtualne svijeće</h2>
          <p className="memorial-subtitle max-w-2xl mx-auto">
            Zapalite virtualnu svijeću za vaše najmilije i ostavite poruku sjećanja
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
          {/* Light a Candle Section */}
          <div className="space-y-8">
            <div className="relative">
              <img 
                src={candlesImage} 
                alt="Zapaljene svijeće" 
                className="w-full h-[300px] object-cover rounded-2xl shadow-memorial"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-2xl" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="memorial-title text-white text-2xl mb-2">
                  Zapali svijeću sjećanja
                </h3>
                <p className="text-white/90 text-sm">
                  Vječno svjetlo za vječnu uspomenu
                </p>
              </div>
            </div>

            <div className="bg-candle-warm/50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-candle-flame font-display">{dailyCount.toLocaleString('hr-HR')}</div>
                  <div className="text-sm text-muted-foreground">Danas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-candle-flame font-display">{weeklyCount.toLocaleString('hr-HR')}</div>
                  <div className="text-sm text-muted-foreground">Zadnjih 7 dana</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-candle-flame font-display">{totalCount.toLocaleString('hr-HR')}</div>
                  <div className="text-sm text-muted-foreground">Ukupno</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link to="/zapali-svijecu">
                <Button 
                  size="lg" 
                  variant="gold"
                  className="elegant-button candle-glow"
                >
                  <Flame className="mr-2" size={20} />
                  Zapali svijeću
                </Button>
              </Link>
            </div>
          </div>

          {/* Recent Candles */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h3 className="memorial-title text-2xl mb-4">Nedavno zapaljene svijeće</h3>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-memorial-gold"></div>
                </div>
              ) : candles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nema zapaljenih svijeća</p>
                </div>
              ) : (
                candles.map((candle) => (
                  <Card key={candle.id} className="memorial-card hover:shadow-memorial transition-all duration-300">
                     <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 flex items-center justify-center">
                            <img 
                              src={candle.is_burning ? candleFlame : "/site/candle-no-flame.png"} 
                              alt={candle.is_burning ? "Goreća svijeća" : "Ugašena svijeća"} 
                              className={`w-14 h-14 object-contain ${candle.is_burning ? 'animate-flicker' : 'opacity-50 grayscale'}`}
                            />
                          </div>
                         
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <span className={`font-display font-semibold ${candle.is_burning ? 'text-foreground' : 'text-muted-foreground'}`}>
                               {candle.pokojnik_ime} {candle.pokojnik_prezime}
                             </span>
                             <span className="text-xs text-muted-foreground">
                               • {formatTimeAgo(candle.created_at)}
                             </span>
                             {!candle.is_burning && (
                               <span className="text-xs text-red-500 font-medium">• Ugašeno</span>
                             )}
                           </div>
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <User size={12} />
                            <span>{candle.zapalio_ime}</span>
                          </div>
                          
                           {candle.poruka && (
                             <p className="text-sm text-foreground leading-relaxed">
                               {candle.poruka}
                             </p>
                           )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link to="/virtualne-svijece">
            <Button 
              variant="outline" 
              size="lg"
              className="border-candle-flame text-candle-flame hover:bg-candle-flame hover:text-white"
            >
              Pogledaj sve svijeće
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default VirtualCandles;