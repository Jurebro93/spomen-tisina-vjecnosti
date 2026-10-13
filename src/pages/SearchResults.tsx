import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, User } from 'lucide-react';
import { SEOHelmet } from '@/hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatLifespan, formatObituaryLocation } from '@/lib/utils';

interface Obituary {
  id: string;
  ime: string;
  prezime: string;
  datum_rodenja: string;
  datum_smrti: string;
  mjesto_smrti: string;
  mjesto_rodenja: string;
  fotografija_url?: string;
  profesija?: string;
  biografija?: string;
  slug?: string;
}

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const [obituaries, setObituaries] = useState<Obituary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';

  useEffect(() => {
    const searchObituaries = async () => {
      try {
        setLoading(true);
        setError(null);

        let supabaseQuery = supabase
          .from('obituaries')
          .select('id, ime, prezime, datum_rodenja, datum_smrti, datum_ukopa, mjesto_rodenja, mjesto_smrti, biografija, fotografija_url, profesija, slug');

        // Search by name if provided
        if (query) {
          const searchTerms = query.trim().split(/\s+/);
          if (searchTerms.length === 1) {
            // Single term - search in both ime and prezime
            supabaseQuery = supabaseQuery.or(
              `ime.ilike.%${query}%,prezime.ilike.%${query}%`
            );
          } else {
            // Multiple terms - exact matching for full names
            const [firstName, ...lastNameParts] = searchTerms;
            const lastName = lastNameParts.join(' ');
            supabaseQuery = supabaseQuery.or(
              `and(ime.ilike.${firstName},prezime.ilike.${lastName}),and(ime.ilike.${lastName},prezime.ilike.${firstName})`
            );
          }
        }

        // Filter by city if provided and not 'all'
        if (city && city !== 'all') {
          supabaseQuery = supabaseQuery.ilike('mjesto_smrti', `%${city}%`);
        }

        const { data, error: supabaseError } = await supabaseQuery
          .order('datum_ukopa', { ascending: false, nullsFirst: false })
          .limit(50);

        if (supabaseError) {
          throw supabaseError;
        }

        setObituaries(data || []);
      } catch (err) {
        console.error('Error searching obituaries:', err);
        setError('Greška pri pretraživanju osmrtnica');
      } finally {
        setLoading(false);
      }
    };

    searchObituaries();
  }, [query, city]);

  const getSearchTitle = () => {
    if (query && city && city !== 'all') {
      return `Rezultati pretrage za "${query}" u gradu ${city}`;
    } else if (query) {
      return `Rezultati pretrage za "${query}"`;
    } else if (city && city !== 'all') {
      return `Osmrtnice za grad ${city}`;
    }
    return 'Rezultati pretrage';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-memorial-gold mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Pretraživanje...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet pagePath="/pretraga" />
      <Helmet>
        {/* Interne pretrage nemaju zasebnu SEO vrijednost */}
        <title>Rezultati pretrage osmrtnica | Osmrtnica.com.hr</title>
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <Header />
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary mb-2">
            {getSearchTitle()}
          </h1>
          {obituaries.length > 0 && (
            <p className="text-muted-foreground">
              Pronađeno {obituaries.length} {obituaries.length === 1 ? 'osmrtnica' : 'osmrtnica'}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {obituaries.length === 0 && !error ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nema rezultata</h3>
            <p className="text-muted-foreground mb-6">
              Pokušajte s drugim pojmovima za pretraživanje.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Povratak na početnu
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {obituaries.map((obituary) => (
              <Card key={obituary.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    {obituary.fotografija_url ? (
                      <img
                        src={obituary.fotografija_url}
                        alt={`${obituary.ime} ${obituary.prezime}`}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <img
                        src="/default-obituary-photo.jpg"
                        alt={`${obituary.ime} ${obituary.prezime}`}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl leading-tight">
                        {obituary.ime} {obituary.prezime}
                      </CardTitle>
                      {obituary.profesija && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {obituary.profesija}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {formatLifespan(obituary.datum_rodenja, obituary.datum_smrti) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatLifespan(obituary.datum_rodenja, obituary.datum_smrti)}</span>
                      </div>
                    )}
                    
                    {formatObituaryLocation(obituary.mjesto_rodenja, obituary.mjesto_smrti) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{formatObituaryLocation(obituary.mjesto_rodenja, obituary.mjesto_smrti)}</span>
                      </div>
                    )}
                  </div>
                  
                  {obituary.biografija && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {obituary.biografija}
                    </p>
                  )}
                  
                  <Link
                    to={`/${obituary.slug}`}
                    className="inline-flex items-center mt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Pogledaj osmrtnicu →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default SearchResults;