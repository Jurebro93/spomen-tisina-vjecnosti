import { useState, useEffect, useCallback } from 'react';
import { Flame, Heart, MessageCircle, User, ArrowLeft, Filter, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
const candlesImage = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/memorial-candles.jpg";
const candleFlame = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/candle-flame-large.png";
import { SEOHelmet } from '@/hooks/useSEO';
import MemorialCtaSection from '@/components/MemorialCtaSection';

const VirtualneSvijece = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [candles, setCandles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [relightingCandles, setRelightingCandles] = useState<Set<string>>(new Set());

  const fetchCandles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('virtual_candles_public')
        .select('*')
        .order('created_at', { ascending: false }); // Najnovije na vrhu

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
  }, []);

  useEffect(() => {
    fetchCandles();
    
    // Osvježavanje svakih 30 sekundi
    const interval = setInterval(fetchCandles, 30000);
    
    return () => clearInterval(interval);
  }, [fetchCandles]);

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

  const filteredCandles = candles.filter(candle => {
    const candleName = `${candle.pokojnik_ime || ''} ${candle.pokojnik_prezime || ''}`;
    const matchesSearch = candleName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (candle.zapalio_ime || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterBy === 'all') return matchesSearch;
    
    const candleDate = new Date(candle.created_at);
    const now = new Date();
    const diffInMs = now.getTime() - candleDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (filterBy === 'today') return diffInHours < 24 && matchesSearch;
    if (filterBy === 'week') return diffInDays < 7 && matchesSearch;
    if (filterBy === 'month') return diffInDays < 30 && matchesSearch;
    return matchesSearch;
  });

  const handleRelightCandle = async (candleId: string) => {
    setRelightingCandles(prev => new Set([...prev, candleId]));
    
    try {
      const { data, error } = await supabase.functions.invoke('relight-candle', {
        body: { candleId }
      });

      if (error) {
        console.error('Error relighting candle:', error);
        toast({
          title: "Greška",
          description: "Dogodila se greška prilikom ponovnog paljenja svijeće.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Uspjeh",
          description: "Svijeća je uspješno ponovno zapaljena!",
        });
        // Refresh the candles list
        fetchCandles();
      }
    } catch (error) {
      console.error('Error relighting candle:', error);
      toast({
        title: "Greška",
        description: "Dogodila se greška prilikom ponovnog paljenja svijeće.",
        variant: "destructive",
      });
    } finally {
      setRelightingCandles(prev => {
        const newSet = new Set(prev);
        newSet.delete(candleId);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-candle-warm">
      <SEOHelmet pagePath="/virtualne-svijece" />
      <Header />
      {/* Header */}
      <div className="relative">
        <img src={candlesImage} alt="Virtualne svijeće" className="w-full h-[250px] sm:h-[300px] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <h1 className="memorial-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-4 text-zinc-50">
              Virtualne svijeće
            </h1>
            <p className="memorial-subtitle text-base sm:text-lg max-w-2xl text-gray-300 mb-6">
              Vječno svjetlo za vječnu uspomenu
            </p>
            <Link to="/zapali-svijecu">
              <Button size="lg" className="elegant-button bg-candle-flame hover:bg-candle-flame/90 text-white text-sm sm:text-base">
                Zapali novu svijeću
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Back button */}
        <Link to="/" className="absolute top-4 sm:top-6 left-4 sm:left-6 bg-white/20 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full hover:bg-white/30 transition-colors">
          <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
        </Link>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Stats */}
        <div className="hidden bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 shadow-memorial">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-candle-flame font-display">
                {candles.filter(c => formatTimeAgo(c.created_at).includes('sat')).length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Danas</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-candle-flame font-display">
                {candles.filter(c => {
                  const timeAgo = formatTimeAgo(c.created_at);
                  return timeAgo.includes('sat') || timeAgo.includes('dan');
                }).length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Ovaj tjedan</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-candle-flame font-display">
                {candles.length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Ovaj mjesec</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-candle-flame font-display">{candles.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Ukupno</div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-memorial">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
              <Input 
                placeholder="Pretraži po imenu pokojnika ili osobi koja je zapalila svijeću..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-10 text-sm sm:text-base" 
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground flex-shrink-0" />
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtriraj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sve svijeće</SelectItem>
                  <SelectItem value="today">Danas</SelectItem>
                  <SelectItem value="week">Ovaj tjedan</SelectItem>
                  <SelectItem value="month">Ovaj mjesec</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Candles Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-memorial-gold"></div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {filteredCandles.map(candle => 
              <Card key={candle.id} className="memorial-card hover:shadow-memorial transition-all duration-300 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                      <img 
                        src={candle.is_burning ? candleFlame : 'https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/candle-no-flame.png'} 
                        alt={candle.is_burning ? "Goreća svijeća" : "Ugašena svijeća"} 
                        className={`w-16 h-16 sm:w-20 sm:h-20 object-contain ${candle.is_burning ? 'animate-flicker' : 'opacity-50 grayscale'}`} 
                      />
                    </div>
                   
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <span className={`font-display font-semibold text-base sm:text-lg ${candle.is_burning ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {candle.pokojnik_ime} {candle.pokojnik_prezime}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          • {formatTimeAgo(candle.created_at)}
                        </span>
                        {!candle.is_burning && (
                          <span className="text-xs text-red-500 font-medium">• Ugašeno</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-muted-foreground mb-3">
                        <User size={12} className="sm:w-3.5 sm:h-3.5" />
                        <span>Zapalila/o: {candle.zapalio_ime}</span>
                      </div>
                      
                      {candle.poruka && (
                        <p className={`leading-relaxed mb-4 text-sm sm:text-base ${candle.is_burning ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {candle.poruka}
                        </p>
                      )}
                      
                      {!candle.is_burning && (
                        <div className="flex justify-center sm:justify-start">
                          <Button 
                            size="sm" 
                            className="elegant-button bg-candle-flame hover:bg-candle-flame/90 text-white"
                            onClick={() => handleRelightCandle(candle.id)}
                            disabled={relightingCandles.has(candle.id)}
                          >
                            {relightingCandles.has(candle.id) ? 'Pali se...' : 'Zapali ponovno'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {filteredCandles.length === 0 && 
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4 text-sm sm:text-base px-4">
              Nema svijeća koje odgovaraju vašoj pretrazi.
            </div>
            <Button onClick={() => {
              setSearchTerm('');
              setFilterBy('all');
            }} variant="outline" className="text-sm sm:text-base">
              Resetiraj filtre
            </Button>
          </div>
        }

      </div>
      
      <MemorialCtaSection />
      <Footer />
    </div>
  );
};
export default VirtualneSvijece;