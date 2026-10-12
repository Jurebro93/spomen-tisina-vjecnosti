import { useState, useEffect } from 'react';
import { MapPin, Flame, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { calculateObituaryAge } from '@/lib/utils';
const defaultObituaryPhoto = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/default-obituary-photo.jpg";

const ObituariesGallery = () => {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(6);
  const [obituaries, setObituaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObituaries();
  }, []);

  const fetchObituaries = async () => {
    try {
    const { data, error } = await supabase
      .from('obituaries')
      .select('id, ime, prezime, datum_rodenja, datum_smrti, datum_ukopa, mjesto_rodenja, mjesto_smrti, biografija, fotografija_url, profesija, slug')
      .order('datum_ukopa', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching obituaries:', error);
      } else {
        setObituaries(data || []);
      }
    } catch (error) {
      console.error('Error fetching obituaries:', error);
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

  const renderLocation = (birthPlace?: string, deathPlace?: string) => {
    const parts = [birthPlace, deathPlace].filter(Boolean);
    if (parts.length === 0) return null;
    return (
      <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <MapPin size={14} className="shrink-0" />
        <span>{parts.join(' – ')}</span>
      </div>
    );
  };

  return (
    <section className="py-16 bg-memorial-warm">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="memorial-title mb-4">Najnovije osmrtnice</h2>
          <p className="memorial-subtitle max-w-2xl mx-auto">
            Odajte počast i sačuvajte uspomene na vaše najmilije
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-memorial-gold"></div>
          </div>
        ) : obituaries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Nema objavljenih osmrtnica</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {obituaries.slice(0, visibleCount).map((obituary) => (
              <Card
                key={obituary.id}
                className="memorial-card group hover:shadow-memorial transition-all duration-300 flex flex-col cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  navigate(`/${obituary.slug}`);
                }}
              >
                <CardContent className="p-6 flex flex-col flex-grow">
                  <div className="flex flex-col items-center text-center flex-grow">
                    {/* Photo */}
                    <div className="relative mb-4">
                      <img 
                        src={obituary.fotografija_url || defaultObituaryPhoto}
                        alt={`${obituary.ime} ${obituary.prezime}`}
                        className="w-32 h-40 object-cover rounded-lg border-2 border-border mx-auto"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
                    </div>

                    {/* Content */}
                    <div className="w-full">
                      <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                        {obituary.ime} {obituary.prezime}
                      </h3>
                      
                      <div className="space-y-2 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center justify-center gap-2">
                          <span>
                            {formatDate(obituary.datum_rodenja)} - {formatDate(obituary.datum_smrti)}
                          </span>
                        </div>
                        {renderLocation(obituary.mjesto_rodenja, obituary.mjesto_smrti)}
                      </div>

                      {obituary.datum_rodenja && obituary.datum_smrti && (
                        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full inline-block text-xs font-medium mb-3">
                          {calculateObituaryAge(obituary.datum_rodenja, obituary.datum_smrti)} godina
                        </div>
                      )}

                      {obituary.biografija && (
                        <p className="text-sm text-foreground leading-relaxed mb-6">
                          {obituary.biografija.length > 100 
                            ? `${obituary.biografija.substring(0, 100)}...` 
                            : obituary.biografija}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions - refined black & gold footer */}
                  <div className="mt-auto flex flex-col gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/kreiraj-memorijal?deceased_id=${obituary.id}`); }}
                      className="w-full py-3.5 bg-foreground text-memorial-gold border border-foreground/80 flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors duration-300 group/memorial cursor-pointer"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Kreiraj memorijal</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/zapali-svijecu?ime=${encodeURIComponent(obituary.ime)}&prezime=${encodeURIComponent(obituary.prezime)}`); }}
                      className="w-full py-3.5 bg-transparent border border-memorial-gold text-foreground flex items-center justify-center gap-2 hover:bg-memorial-gold/5 transition-colors duration-300 group/candle cursor-pointer"
                    >
                      <Flame className="w-4 h-4 opacity-80 group-hover/candle:opacity-100 transition-opacity" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Zapali svijeću</span>
                    </button>

                    <div className="mt-2 pt-3 border-t border-border/60 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/${obituary.slug}`); }}
                        className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] hover:text-foreground transition-colors cursor-pointer"
                      >
                        Pročitaj više
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && obituaries.length > 0 && visibleCount < obituaries.length && (
          <div className="text-center mt-12">
            <Button
              variant="outline"
              size="lg"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background px-8 py-3 text-lg font-medium"
              onClick={() => setVisibleCount(prev => Math.min(prev + 9, obituaries.length))}
            >
              Učitaj više
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ObituariesGallery;
