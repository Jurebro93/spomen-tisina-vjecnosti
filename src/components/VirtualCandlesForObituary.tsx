import React, { useState, useEffect } from 'react';
import { Flame, Heart, MessageCircle, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
const candleFlame = "/site/candle-flame-large.png";
import { supabase } from '@/integrations/supabase/client';

interface VirtualCandlesForObituaryProps {
  pokojnikIme: string;
  pokojnikPrezime: string;
}

const VirtualCandlesForObituary: React.FC<VirtualCandlesForObituaryProps> = ({ 
  pokojnikIme, 
  pokojnikPrezime 
}) => {
  const { toast } = useToast();
  const [candles, setCandles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [relightingCandles, setRelightingCandles] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCandlesForPerson();
  }, [pokojnikIme, pokojnikPrezime]);

  const fetchCandlesForPerson = async () => {
    try {
      const { data, error } = await supabase
        .from('virtual_candles_public')
        .select('*')
        .eq('pokojnik_ime', pokojnikIme)
        .eq('pokojnik_prezime', pokojnikPrezime)
        .order('created_at', { ascending: false });

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
        fetchCandlesForPerson();
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

  if (loading) {
    return (
      <Card className="mb-6 sm:mb-8">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Zapaljene svijeće</h2>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-memorial-gold"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 sm:mb-8">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">Zapaljene svijeće</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {candles.length} {candles.length === 1 ? 'svijeća' : 'svijeća'}
            </div>
            <Button 
              variant="gold" 
              size="sm"
              className="text-xs sm:text-sm"
              onClick={() => window.location.href = `/zapali-svijecu?ime=${encodeURIComponent(pokojnikIme)}&prezime=${encodeURIComponent(pokojnikPrezime)}`}
            >
              <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Zapali svijeću
            </Button>
          </div>
        </div>
        
        {candles.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              Još nema zapaljenih svijeća za {pokojnikIme} {pokojnikPrezime}.
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Budite prvi koji će zapaliti svijeću sjećanja.
            </p>
            <Button 
              variant="gold"
              onClick={() => window.location.href = `/zapali-svijecu?ime=${encodeURIComponent(pokojnikIme)}&prezime=${encodeURIComponent(pokojnikPrezime)}`}
            >
              <Flame className="h-4 w-4 mr-2" />
              Zapali prvu svijeću
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {candles.map((candle) => (
              <Card key={candle.id} className="memorial-card hover:shadow-memorial transition-all duration-300 bg-white/90 backdrop-blur-sm">
                 <CardContent className="p-4">
                   <div className="flex items-start gap-3">
                     <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
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
                        <span>Zapalila/o: {candle.zapalio_ime}</span>
                      </div>
                      
                       {candle.poruka && (
                         <p className={`text-sm leading-relaxed mb-3 ${candle.is_burning ? 'text-foreground' : 'text-muted-foreground'}`}>
                           {candle.poruka}
                         </p>
                       )}
                       
                       {!candle.is_burning && (
                         <div className="mt-3">
                           <Button 
                             size="sm" 
                             className="elegant-button bg-candle-flame hover:bg-candle-flame/90 text-white text-xs"
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
            ))}
            
            {candles.length > 3 && (
              <div className="text-center pt-4">
                <Link to={`/virtualne-svijece?search=${encodeURIComponent(`${pokojnikIme} ${pokojnikPrezime}`)}`}>
                  <Button variant="outline" size="sm">
                    Pogledaj sve svijeće
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VirtualCandlesForObituary;