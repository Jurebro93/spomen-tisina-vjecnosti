import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Flame, User, Mail, MessageCircle, CreditCard, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
const candlesImage = "/site/memorial-candles.jpg";
const candleFlame = "/site/candle-flame-large.png";
const candleNoFlame = "/site/candle-no-flame.png";
import { SEOHelmet } from '@/hooks/useSEO';
import MemorialPrice from '@/components/promo/MemorialPrice';
import { trackObituaryEvent } from '@/lib/obituaryTracking';

const ZapaliSvijecu = () => {
  const [formData, setFormData] = useState({
    pokojnikIme: '',
    pokojnikPrezime: '',
    zapalioIme: '',
    zapalioEmail: '',
    poruka: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentCandles, setRecentCandles] = useState([]);
  const [showAllCandles, setShowAllCandles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Name of the person a candle was just lit for, to offer a lasting memorial.
  const [litFor, setLitFor] = useState<string | null>(null);
  const { toast } = useToast();

  // Extract URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ime = urlParams.get('ime');
    const prezime = urlParams.get('prezime');
    
    if (ime || prezime) {
      setFormData(prev => ({
        ...prev,
        pokojnikIme: ime || '',
        pokojnikPrezime: prezime || ''
      }));
    }
  }, []);

  const fetchCandles = useCallback(async () => {
    try {
      const query = supabase
        .from('virtual_candles_public')
        .select('*')
        .order('created_at', { ascending: false });

      // Add search functionality
      if (searchTerm.trim()) {
        query.or(`pokojnik_ime.ilike.%${searchTerm}%,pokojnik_prezime.ilike.%${searchTerm}%`);
      }

      if (!showAllCandles) {
        query.limit(6);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching candles:', error);
        return;
      }

      setRecentCandles(data || []);
    } catch (error) {
      console.error('Error fetching candles:', error);
    }
  }, [searchTerm, showAllCandles]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  const handleShowAllCandles = () => {
    setShowAllCandles(!showAllCandles);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handlePayment = async () => {
    // Validate form
    if (!formData.pokojnikIme || !formData.pokojnikPrezime || !formData.zapalioIme || !formData.zapalioEmail) {
      toast({
        title: "Greška",
        description: "Molimo unesite sve obavezne podatke.",
        variant: "destructive"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.zapalioEmail)) {
      toast({
        title: "Greška",
        description: "Molimo unesite valjanu email adresu.",
        variant: "destructive"
      });
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-candle', {
        body: {
          pokojnikIme: formData.pokojnikIme,
          pokojnikPrezime: formData.pokojnikPrezime,
          zapalioIme: formData.zapalioIme,
          zapalioEmail: formData.zapalioEmail,
          poruka: formData.poruka
        }
      });
      if (error) {
        throw new Error(error.message || 'Greška pri slanju zahtjeva');
      }
      toast({
        title: 'Svijeća zapaljena!',
        description: 'Vaša svijeća je uspješno zapaljena i odmah je vidljiva.',
      });
      setLitFor(`${formData.pokojnikIme} ${formData.pokojnikPrezime}`.trim());
      // Reset form and refresh candles list
      setFormData({ pokojnikIme: '', pokojnikPrezime: '', zapalioIme: '', zapalioEmail: '', poruka: '' });
      fetchCandles();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: 'Greška',
        description: error.message || 'Dogodila se greška prilikom slanja.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-candle-warm">
      <SEOHelmet pagePath="/zapali-svijecu" />
      <Header />
      {/* Header */}
      <div className="relative">
        <img src={candlesImage} alt="Zapali svijeću" className="w-full h-[200px] sm:h-[250px] md:h-[300px] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-4">
            <div className="flex items-center justify-center mb-4">
              
              <h1 className="memorial-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-zinc-50">
                Zapali svijeću
              </h1>
            </div>
            <p className="memorial-subtitle text-sm sm:text-base md:text-lg max-w-2xl text-gray-300">
              Vječno svjetlo za vječnu uspomenu • Besplatno • Svijetli 7 dana
            </p>
          </div>
        </div>
        
        {/* Back button */}
        <Link to="/" className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/20 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full hover:bg-white/30 transition-colors">
          <ArrowLeft size={16} className="sm:hidden" />
          <ArrowLeft size={20} className="hidden sm:block" />
        </Link>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 lg:py-12">
        <div className="max-w-2xl mx-auto">
          {litFor && (
            <Card className="mb-6 border-memorial-gold bg-memorial-gold/10">
              <CardContent className="p-5 sm:p-6 text-center">
                <p className="font-display text-lg sm:text-xl font-semibold text-foreground mb-2">
                  Svijeća za {litFor} gori 7 dana
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Sačuvajte uspomenu trajno: digitalni memorijal s fotografijama, životnom pričom i porukama obitelji. <MemorialPrice /> jednokratno.
                </p>
                <Link
                  to="/digitalni-memorijal/kreiraj"
                  onClick={() => trackObituaryEvent('obituary_memorial_click', null, { placement: 'candle_success', memorial_action: 'create' })}
                  className="inline-flex items-center justify-center px-6 py-3 bg-foreground text-memorial-gold font-bold uppercase tracking-[0.15em] text-xs hover:bg-foreground/90 transition-colors duration-300"
                >
                  Izradite memorijal
                </Link>
              </CardContent>
            </Card>
          )}
          <Card className="memorial-card bg-white/90 backdrop-blur-sm shadow-memorial">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl text-center text-foreground font-display">
                Unesite podatke za svijeću
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              {/* Pokojnik Info */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <User size={18} className="sm:hidden" />
                  <User size={20} className="hidden sm:block" />
                  Podaci o pokojniku
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="pokojnikIme" className="text-sm">Ime pokojnika *</Label>
                    <Input id="pokojnikIme" value={formData.pokojnikIme} onChange={e => handleInputChange('pokojnikIme', e.target.value)} placeholder="Unesite ime..." className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="pokojnikPrezime" className="text-sm">Prezime pokojnika *</Label>
                    <Input id="pokojnikPrezime" value={formData.pokojnikPrezime} onChange={e => handleInputChange('pokojnikPrezime', e.target.value)} placeholder="Unesite prezime..." className="mt-1" />
                  </div>
                </div>
              </div>

              {/* Zapalio Info */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Mail size={18} className="sm:hidden" />
                  <Mail size={20} className="hidden sm:block" />
                  Vaši podaci
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="zapalioIme" className="text-sm">Vaše ime *</Label>
                    <Input id="zapalioIme" value={formData.zapalioIme} onChange={e => handleInputChange('zapalioIme', e.target.value)} placeholder="Unesite vaše ime..." className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="zapalioEmail" className="text-sm">Vaš email *</Label>
                    <Input id="zapalioEmail" type="email" value={formData.zapalioEmail} onChange={e => handleInputChange('zapalioEmail', e.target.value)} placeholder="vas@email.com" className="mt-1" />
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <MessageCircle size={18} className="sm:hidden" />
                  <MessageCircle size={20} className="hidden sm:block" />
                  Poruka sjećanja
                </h3>
                <div>
                  <Label htmlFor="poruka" className="text-sm">Vaša poruka (opcionalno)</Label>
                  <Textarea id="poruka" value={formData.poruka} onChange={e => handleInputChange('poruka', e.target.value)} placeholder="Napišite poruku sjećanja..." className="mt-1 h-20 sm:h-24 resize-none" />
                </div>
              </div>

              <div className="bg-candle-warm/20 rounded-lg p-4 sm:p-6 border border-candle-flame/20">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                  Besplatna svijeća
                </h3>
                <p className="text-sm text-muted-foreground">
                  Svijeća je besplatna i bit će odmah vidljiva na stranici. Svijetli 7 dana.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4 sm:pt-6">
                <Button onClick={handlePayment} disabled={isProcessing} variant="gold" className="w-full py-4 sm:py-6 text-base sm:text-lg candle-glow">
                  {isProcessing ? <>
                      <div className="animate-spin mr-2 h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full" />
                      <span className="text-sm sm:text-base">Palim svijeću...</span>
                    </> : <>
                      <Flame className="mr-2" size={18} />
                      <span className="text-sm sm:text-base">Zapali svijeću</span>
                    </>}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Svijeća će biti odmah vidljiva nakon paljenja.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mt-6 sm:mt-8">
          <Card className="memorial-card bg-white/90 backdrop-blur-sm shadow-memorial">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl text-center text-foreground font-display">
                Pretraži svijeće
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Unesite ime ili prezime pokojnika..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-2 sm:py-3 text-sm sm:text-base"
                />
              </div>
              {searchTerm && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Pretraživanje: "<span className="font-semibold">{searchTerm}</span>"
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-xs"
                  >
                    Očisti pretragu
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Candles Section */}
        <div className="max-w-6xl mx-auto mt-8 sm:mt-12 lg:mt-16">
            <Card className="memorial-card bg-white/90 backdrop-blur-sm shadow-memorial">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-center text-foreground font-display">
                  {searchTerm ? 'Rezultati pretrage' : 'Nedavno zapaljene svijeće'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {recentCandles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {recentCandles.map((candle: any) => {
                      const candleAge = Math.floor((Date.now() - new Date(candle.created_at).getTime()) / (1000 * 60 * 60 * 24));
                      const isOld = candleAge > 7;
                      
                      return (
                        <div key={candle.id} className={`bg-candle-warm/10 rounded-lg p-4 sm:p-6 border border-candle-flame/20 text-center ${isOld ? 'opacity-70' : ''}`}>
                          <div className="mb-3 sm:mb-4">
                            <img 
                              src={isOld ? candleNoFlame : candleFlame} 
                              alt="Svijeća" 
                              className={`mx-auto ${isOld ? 'w-10 h-10 sm:w-12 sm:h-12 opacity-70' : 'w-10 h-10 sm:w-12 sm:h-12 opacity-80'}`} 
                            />
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                            {candle.pokojnik_ime} {candle.pokojnik_prezime}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                            Zapalio: {candle.zapalio_ime}
                          </p>
                          {candle.poruka && (
                            <p className="text-xs sm:text-sm text-foreground italic mb-2 sm:mb-3 px-2">
                              "{candle.poruka}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mb-2 sm:mb-3">
                            {new Date(candle.created_at).toLocaleDateString('hr-HR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          {isOld && (
                            <div className="mt-4">
                              <p className="text-xs text-muted-foreground mb-2">
                                Svijeća je ugašena (više od 7 dana)
                              </p>
                              <Button 
                                size="sm"
                                className="bg-candle-flame hover:bg-candle-flame/90 text-white text-xs px-3 py-1"
                                onClick={() => {
                                  // Scroll to top of the form
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                  // Pre-fill the form with the same data
                                  setFormData({
                                    pokojnikIme: candle.pokojnik_ime,
                                    pokojnikPrezime: candle.pokojnik_prezime,
                                    zapalioIme: '',
                                    zapalioEmail: '',
                                    poruka: ''
                                  });
                                }}
                              >
                                Upali ponovno
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <img src={candleFlame} alt="Svijeća" className="w-16 h-16 mx-auto opacity-50" />
                    </div>
                    <p className="text-muted-foreground text-lg">
                      Još nema zapaljenih svijeća
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                      Budite prvi koji će zapaliti svijeću sjećanja
                    </p>
                  </div>
                )}
                <div className="text-center mt-8">
                  <Button 
                    onClick={handleShowAllCandles}
                    variant="outline" 
                    className="px-8 py-3 text-lg border-candle-flame text-candle-flame hover:bg-candle-flame hover:text-white"
                  >
                    {showAllCandles ? 'Prikaži manje' : 'Pogledaj sve svijeće'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      
      <Footer />
    </div>
  );
};

export default ZapaliSvijecu;