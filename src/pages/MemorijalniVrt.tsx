import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Heart, Quote, Send, Clock, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SEOHelmet } from '@/hooks/useSEO';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CitiesSection from '@/components/CitiesSection';
import MemorialCtaSection from '@/components/MemorialCtaSection';

const MemorijalniVrt = () => {
  const { toast } = useToast();
  const [newQuote, setNewQuote] = useState({ 
    name: '', 
    text: '', 
    relation: '', 
    email: '' 
  });
  const [visibleQuotes, setVisibleQuotes] = useState(6);
  const [approvedQuotes, setApprovedQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovedQuotes();
  }, []);

  const fetchApprovedQuotes = async () => {
    try {
      console.log('Fetching approved quotes from view...');
      
      const { data, error } = await supabase
        .from('approved_memorial_quotes')
        .select('*')
        .order('approved_at', { ascending: false });

      console.log('Query result:', { data, error });

      if (error) {
        console.error('Error fetching quotes:', error);
      } else {
        console.log('Approved quotes found:', data?.length || 0);
        setApprovedQuotes(data || []);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  const displayedQuotes = approvedQuotes.slice(0, visibleQuotes);
  const hasMoreQuotes = visibleQuotes < approvedQuotes.length;

  const loadMoreQuotes = () => {
    setVisibleQuotes(prev => Math.min(prev + 6, approvedQuotes.length));
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuote.name.trim() || !newQuote.text.trim()) {
      toast({
        title: "Greška",
        description: "Molimo unesite ime i poruku.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('submit-memorial-quote', {
        body: {
          tekst: newQuote.text,
          autor: newQuote.name,
          relacija: newQuote.relation || null,
          email_autora: newQuote.email || null
        }
      });

      if (error) throw error;

      toast({
        title: "Poruka poslana",
        description: "Vaša poruka je poslana na odobrenje. Prikazat će se nakon provjere.",
      });
      
      setNewQuote({ name: '', text: '', relation: '', email: '' });
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Dogodila se greška pri slanju poruke",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet pagePath="/memorijalni-vrt" />
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-memorial-gold" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">Memorijalni Vrt</h1>
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-memorial-gold" />
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Ovdje možete ostaviti poruke sjećanja za svoje najdraže. Svaka poruka 
            prolazi kroz provjeru prije objavljivanja kako bi se osiguralo dostojanstvo i poštovanje.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Add New Quote Form */}
          <div className="xl:col-span-1">
            <Card className="xl:sticky xl:top-8">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Quote className="h-4 w-4 sm:h-5 sm:w-5" />
                  Ostavite poruku sjećanja
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={handleSubmitQuote} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Vaše ime</label>
                    <Input
                      placeholder="Unesite vaše ime..."
                      value={newQuote.name}
                      onChange={(e) => setNewQuote({ ...newQuote, name: e.target.value })}
                      className="text-sm sm:text-base"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Vaš odnos (opcionalno)</label>
                    <Input
                      placeholder="npr. Suprug, Prijatelj, Sin..."
                      value={newQuote.relation}
                      onChange={(e) => setNewQuote({ ...newQuote, relation: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email (opcionalno)</label>
                    <Input
                      type="email"
                      placeholder="vaš@email.com"
                      value={newQuote.email}
                      onChange={(e) => setNewQuote({ ...newQuote, email: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Poruka sjećanja</label>
                    <Textarea
                      placeholder="Napišite vašu poruku sjećanja..."
                      rows={4}
                      value={newQuote.text}
                      onChange={(e) => setNewQuote({ ...newQuote, text: e.target.value })}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={submitting}>
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? 'Šalje se...' : 'Pošaljite poruku'}
                  </Button>
                  
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Vaša poruka će biti pregledana i objavljena nakon odobrenja administratora.
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Approved Quotes */}
          <div className="xl:col-span-2">
            <div className="flex items-center gap-2 mb-4 sm:mb-6 flex-wrap">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <h2 className="text-xl sm:text-2xl font-semibold">Odobrene poruke sjećanja</h2>
              <Badge variant="secondary" className="text-xs sm:text-sm">{approvedQuotes.length}</Badge>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-memorial-gold"></div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {displayedQuotes.map((quote) => (
                  <Card key={quote.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                      <div className="relative">
                        <Quote className="h-5 w-5 sm:h-6 sm:w-6 text-memorial-gold absolute -top-1 sm:-top-2 -left-1 sm:-left-2" />
                        <blockquote className="text-base sm:text-lg italic pl-4 sm:pl-6 mb-3 sm:mb-4 leading-relaxed">
                          "{quote.tekst}"
                        </blockquote>
                      </div>
                      
                      <Separator className="my-3 sm:my-4" />
                      
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground gap-2 sm:gap-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-memorial-gold flex-shrink-0" />
                          <span className="font-medium">{quote.autor}</span>
                          {quote.relacija && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-xs sm:text-sm">{quote.relacija}</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm">{formatDate(quote.approved_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Load More Button */}
            {hasMoreQuotes && (
              <div className="text-center mt-6">
                <Button 
                  onClick={loadMoreQuotes}
                  variant="outline"
                  className="border-memorial-gold text-memorial-gold hover:bg-memorial-gold hover:text-white"
                >
                  Učitaj više poruka
                  <Badge className="ml-2" variant="secondary">
                    {approvedQuotes.length - visibleQuotes}
                  </Badge>
                </Button>
              </div>
            )}
            
            {!loading && approvedQuotes.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Učitavam poruke...</h3>
                  <p className="text-muted-foreground">
                    Molimo pričekajte dok se učitavaju poruke sjećanja.
                  </p>
                  <Button 
                    onClick={fetchApprovedQuotes} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Osvježi poruke
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Information Section */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Pravila memorijalnog vrta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Što možete objaviti:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Poruke sjećanja i podrške</li>
                  <li>• Lijepe uspomene</li>
                  <li>• Izraz sućuti</li>
                  <li>• Zahvale za prijateljstvo</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Napomene:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Sve poruke prolaze provjeru prije objave</li>
                  <li>• Neprimjerene poruke neće biti objavljene</li>
                  <li>• Poštujte dostojanstvo i privatnost</li>
                  <li>• Procjena traje 1-2 radna dana</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* Cities Section */}
      <CitiesSection />
      
      <MemorialCtaSection />
      <Footer />
    </div>
  );
};

export default MemorijalniVrt;