import { Helmet } from 'react-helmet-async';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  ArrowLeft,
  MapPin,
  Clock,
  Heart,
  Sparkles,
  Users,
  Phone,
  Mail,
  Share2,
  Plus
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VirtualCandlesForObituary from '@/components/VirtualCandlesForObituary';
import MemorialCta from '@/components/memorial/MemorialCta';
import { supabase } from '@/integrations/supabase/client';
const defaultObituaryPhoto = "/site/default-obituary-photo.jpg";
import { PersonSEO } from '@/hooks/usePersonSEO';
import { formatObituaryDate, formatObituaryLocation, calculateObituaryAge, isFutureDate } from '@/lib/utils';
import { trackObituaryEvent } from '@/lib/obituaryTracking';
import EbookSignup from '@/components/EbookSignup';
import { ageLabel, mergeMourners } from '@/lib/hr';

const ObituaryPage = () => {
  const { slug } = useParams();
  const [obituary, setObituary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // A failed request is not a missing obituary: only a confirmed miss may tell Google to drop the page.
  const [fetchFailed, setFetchFailed] = useState(false);
  const [showMemoryForm, setShowMemoryForm] = useState(false);
  const [newMemory, setNewMemory] = useState({ author: '', text: '' });
  const [memories, setMemories] = useState<Array<{author: string, text: string}>>([]);

  useEffect(() => {
    if (slug) {
      fetchObituary();
    }
  }, [slug]);

  useEffect(() => {
    if (obituary) trackObituaryEvent('obituary_view', obituary);
  }, [obituary?.id]);

  const fetchObituary = async () => {
    try {
      const { data, error } = await supabase
        .from('obituaries')
        .select('id, ime, prezime, datum_rodenja, datum_smrti, datum_ukopa, vrijeme_ukopa, mjesto_rodenja, mjesto_smrti, biografija, fotografija_url, profesija, groblje, podnaslov, ozalosceni, slug, meta_title, meta_description')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.error('Error fetching obituary:', error);
        setObituary(null);
        setFetchFailed(true);
      } else {
        setObituary(data);
        setFetchFailed(false);
      }
    } catch (error) {
      console.error('Error fetching obituary:', error);
      setObituary(null);
      setFetchFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemory.author.trim() && newMemory.text.trim()) {
      setMemories([...memories, { 
        author: newMemory.author.trim(), 
        text: newMemory.text.trim() 
      }]);
      setNewMemory({ author: '', text: '' });
      setShowMemoryForm(false);
      trackObituaryEvent('obituary_memory_submit', obituary);
    }
  };

  // The import stores the local funeral time as if it were UTC, and midnight
  // when it has no time at all; show the time as written, or the date alone.
  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const iso = String(dateString).replace(' ', 'T');
    const day = new Date(`${iso.slice(0, 10)}T12:00`).toLocaleDateString('hr-HR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const time = iso.slice(11, 16);
    return time && time !== '00:00' ? `${day} u ${time}` : day;
  };

  const birthDate = formatObituaryDate(obituary?.datum_rodenja);
  const deathDate = isFutureDate(obituary?.datum_smrti) ? null : formatObituaryDate(obituary?.datum_smrti);
  const location = formatObituaryLocation(obituary?.mjesto_rodenja, obituary?.mjesto_smrti);
  const age = calculateObituaryAge(obituary?.datum_rodenja, obituary?.datum_smrti);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!obituary) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Osmrtnica nije pronađena | Osmrtnica.com.hr</title>
          {!fetchFailed && <meta name="robots" content="noindex,follow" />}
        </Helmet>
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Osmrtnica nije pronađena</h1>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Povratak na početnu
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {obituary && (
        <PersonSEO 
          ime={obituary.ime}
          prezime={obituary.prezime}
          datum_smrti={obituary.datum_smrti}
          mjesto_smrti={obituary.mjesto_smrti}
          datum_ukopa={obituary.datum_ukopa}
          groblje={obituary.groblje}
          slug={obituary.slug}
          meta_title={obituary.meta_title}
          meta_description={obituary.meta_description}
          fotografija_url={obituary.fotografija_url}
        />
      )}
      <Header />
      
      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 lg:mb-8 overflow-x-auto">
          <Link to="/" className="hover:text-primary transition-colors whitespace-nowrap">Početna</Link>
          <span>/</span>
          <Link to="/" className="hover:text-primary transition-colors whitespace-nowrap">Osmrtnice</Link>
          <span>/</span>
          <span className="text-primary font-medium truncate">{obituary.ime} {obituary.prezime}</span>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <Card className="mb-6 sm:mb-8 overflow-hidden border-t-4 border-t-primary">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-3 gap-0">
                {/* Photo */}
                <div className="relative">
                  <img 
                    src={obituary.fotografija_url || defaultObituaryPhoto} 
                    alt={`${obituary.ime} ${obituary.prezime}`}
                    className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                  />
                </div>
                
                {/* Main Info */}
                <div className="lg:col-span-2 p-4 sm:p-6 lg:p-8">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <Badge variant="secondary" className="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground text-xs sm:text-sm">
                      Osmrtnica
                    </Badge>
                  </div>
                  
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-4 sm:mb-6">
                    {obituary.ime} {obituary.prezime}
                  </h1>
                  
                  {obituary.podnaslov && (
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-3 sm:mb-4">{obituary.podnaslov}</p>
                  )}
                  
                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                    <div>
                      <div className="space-y-2 text-xs sm:text-sm">
                        {birthDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            <span>Datum rođenja: {birthDate}</span>
                          </div>
                        )}
                        {deathDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            <span>Datum smrti: {deathDate}</span>
                          </div>
                        )}
                        {age !== null && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            <span>Dob: {ageLabel(age)}</span>
                          </div>
                        )}
                        {location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            <span className="break-words">{location}</span>
                          </div>
                        )}
                        {obituary.profesija && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                            <span className="break-words">{obituary.profesija}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(obituary.datum_ukopa || obituary.groblje) && (
                      <div>
                        <h3 className="font-semibold text-primary mb-2 sm:mb-3 text-sm sm:text-base">Sprovod</h3>
                        <div className="space-y-2 text-xs sm:text-sm">
                          {obituary.datum_ukopa && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                              <span className="break-words">{formatDateTime(obituary.datum_ukopa)}</span>
                            </div>
                          )}
                          {obituary.groblje && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                              <span className="break-words" dangerouslySetInnerHTML={{__html: obituary.groblje}}></span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Button 
                      variant="gold"
                      className="text-xs sm:text-sm"
                      onClick={() => { trackObituaryEvent('obituary_candle_click', obituary, { placement: 'header' }); window.location.href = `/zapali-svijecu?ime=${encodeURIComponent(obituary.ime)}&prezime=${encodeURIComponent(obituary.prezime)}`; }}
                    >
                      <Heart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Zapali svijeću
                    </Button>
                    <Button
                      variant="gold"
                      className="text-xs sm:text-sm"
                      asChild
                    >
                      <Link
                        to={`/kreiraj-memorijal?deceased_id=${encodeURIComponent(obituary.id)}`}
                        onClick={() => trackObituaryEvent('obituary_memorial_click', obituary, { placement: 'header', memorial_action: 'create' })}
                      >
                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Kreiraj digitalni memorijal
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Biography */}
          {obituary.biografija && (
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Informacije</h2>
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      {obituary.biografija.split('\n\n').map((paragraph: string, index: number) => (
                        <p key={index} className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-700 leading-relaxed">
                          {paragraph.trim()}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Contact Info - Removed for privacy */}
            </div>
          )}

          {/* Mourners */}
          {obituary.ozalosceni && obituary.ozalosceni.length > 0 && (
            <Card className="mb-6 sm:mb-8">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Ožalošćeni</h2>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {mergeMourners(obituary.ozalosceni).map((mourner: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-700 break-words">{mourner}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Digital memorial CTA */}
          <MemorialCta deceasedId={obituary.id} personName={`${obituary.ime} ${obituary.prezime}`} obituary={obituary} />

          {/* Virtual Candles Section */}
          <VirtualCandlesForObituary 
            pokojnikIme={obituary.ime} 
            pokojnikPrezime={obituary.prezime} 
            onRelight={() => trackObituaryEvent('obituary_candle_relight', obituary)}
          />

          {/* Memories */}
          <Card className="mb-6 sm:mb-8">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-primary">Sjećanja i pozdravi</h2>
                <Button 
                  onClick={() => setShowMemoryForm(!showMemoryForm)}
                  variant="outline" 
                  size="sm"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs sm:text-sm w-fit"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Dodaj sjećanje
                </Button>
              </div>
              
              {showMemoryForm && (
                <Card className="mb-6 border-primary/30">
                  <CardContent className="p-6">
                    <form onSubmit={handleMemorySubmit}>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-primary mb-2 block">
                            Vaše ime
                          </label>
                          <Input
                            value={newMemory.author}
                            onChange={(e) => setNewMemory({...newMemory, author: e.target.value})}
                            placeholder="Unesite vaše ime..."
                            className="border-primary/30 focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-primary mb-2 block">
                            Vaše sjećanje
                          </label>
                          <Textarea
                            value={newMemory.text}
                            onChange={(e) => setNewMemory({...newMemory, text: e.target.value})}
                            placeholder="Podijelite vaše sjećanje ili pozdrav..."
                            rows={4}
                            className="border-primary/30 focus:border-primary"
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            type="submit"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Objavi sjećanje
                          </Button>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => setShowMemoryForm(false)}
                          >
                            Odustani
                          </Button>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
              
              {memories.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6">
                  {memories.map((memory, index) => (
                    <div key={index} className="p-4 border-l-4 border-l-primary bg-primary/5 rounded-r-lg">
                      <p className="text-gray-700 mb-3 italic">"{memory.text}"</p>
                      <p className="text-sm text-primary font-medium">— {memory.author}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="text-center space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link to="/">
                <Button variant="outline" size="sm" className="w-full sm:w-auto text-sm">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Povratak na početnu
                </Button>
              </Link>
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto text-sm"
                onClick={() => { trackObituaryEvent('obituary_candle_click', obituary, { placement: 'bottom' }); window.location.href = `/zapali-svijecu?ime=${encodeURIComponent(obituary.ime)}&prezime=${encodeURIComponent(obituary.prezime)}`; }}
              >
                <Heart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Ostavi sjećanje
              </Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 pt-10 pb-8 max-w-3xl">
          <EbookSignup variant="obituary" placement="obituary" />
        </div>
        <div className="container mx-auto px-4 pb-8 text-center">
          <Link to={`/prijava-sadrzaja?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} className="text-xs text-muted-foreground underline hover:text-foreground">Prijavi sadržaj</Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ObituaryPage;
