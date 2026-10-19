import { useParams, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MemorialCtaSection from '@/components/MemorialCtaSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Star, ExternalLink, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEOHelmet } from '@/hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { breadcrumbJsonLd } from '@/lib/seo';
import CemeteriesSection from '@/components/CemeteriesSection';
import { fetchCemeteriesByCity, type Cemetery } from '@/lib/cemeteries';

type ScheduleRow = {
  id: string;
  ime: string;
  prezime: string;
  groblje: string;
  datum: string;
  vrijeme: string;
  godine: number | null;
  tip: string;
  slug?: string | null;
};

const ZAGREB_CEMETERY_ORDER = [
  'Mirogoj',
  'Miroševac',
  'Krematorij Velika Dvorana',
  'Krematorij Mala Dvorana',
  'Markovo polje',
  'Kraljevec',
  'Lučko',
  'Cerje',
];

const zagrebToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zagreb' }).format(new Date());

type ObituaryFuneral = {
  id: string;
  ime: string;
  prezime: string;
  groblje: string | null;
  datum_ukopa: string | null;
  vrijeme_ukopa: string | null;
  datum_rodenja: string | null;
  slug: string | null;
};

const toScheduleRow = (row: ObituaryFuneral): ScheduleRow[] => {
  if (!row.datum_ukopa) return [];
  return [{
    id: row.id,
    ime: row.ime,
    prezime: row.prezime,
    groblje: row.groblje || 'Nepoznato groblje',
    datum: row.datum_ukopa,
    vrijeme: row.vrijeme_ukopa || '',
    godine: row.datum_rodenja ? new Date().getFullYear() - new Date(row.datum_rodenja).getFullYear() : null,
    tip: 'Sprovod',
    slug: row.slug,
  }];
};

const daysAgo = (days: number) => {
  const d = new Date(`${zagrebToday()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

const Sprovodi = () => {
  const { city } = useParams();
  const cityName = city ? city.charAt(0).toUpperCase() + city.slice(1) : '';
  
  const location = useLocation();
  const seoPath = location.pathname;
  
  const [sprovodi, setSprovodi] = useState<ScheduleRow[]>([]);
  const [funeralServices, setFuneralServices] = useState<any[]>([]);
  const [recentSprovodi, setRecentSprovodi] = useState<ScheduleRow[]>([]);
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [city]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const isZagreb = city?.toLowerCase() === 'zagreb';
      fetchCemeteriesByCity(cityName).then(setCemeteries);
      setRecentSprovodi([]);

      if (isZagreb) {
        const { data, error } = await supabase
          .from('sprovodi')
          .select('id, ime, prezime, godina, groblje, tip_sprovoda, datum_sprovoda, vrijeme_sprovoda')
          .eq('grad', 'Zagreb')
          .eq('izvor', 'gradska-groblja-zagreb')
          .gte('datum_sprovoda', zagrebToday())
          .order('datum_sprovoda', { ascending: true })
          .order('vrijeme_sprovoda', { ascending: true });

        if (error) {
          console.error('Error fetching sprovodi:', error);
          setSprovodi([]);
        } else {
          setSprovodi((data ?? []).map((row) => ({
            id: row.id,
            ime: row.ime,
            prezime: row.prezime,
            groblje: row.groblje,
            datum: row.datum_sprovoda,
            vrijeme: row.vrijeme_sprovoda,
            godine: row.godina,
            tip: row.tip_sprovoda,
          })));
        }
      } else {
        const { data: sprovodiData, error: sprovodiError } = await supabase
          .from('obituaries')
          .select('id, ime, prezime, groblje, datum_ukopa, vrijeme_ukopa, datum_rodenja, slug')
          .or(`mjesto_smrti.ilike.%${cityName}%,groblje.ilike.%${cityName}%,mjesna_zajednica.ilike.%${cityName}%`)
          .gte('datum_ukopa', zagrebToday())
          .order('datum_ukopa', { ascending: true });

        if (sprovodiError) {
          console.error('Error fetching sprovodi:', sprovodiError);
          setSprovodi([]);
        } else {
          setSprovodi((sprovodiData ?? []).flatMap(toScheduleRow));
        }

        // Past two weeks, so a city with nothing scheduled still shows its recent funerals.
        const { data: recentData } = await supabase
          .from('obituaries')
          .select('id, ime, prezime, groblje, datum_ukopa, vrijeme_ukopa, datum_rodenja, slug')
          .or(`mjesto_smrti.ilike.%${cityName}%,groblje.ilike.%${cityName}%,mjesna_zajednica.ilike.%${cityName}%`)
          .lt('datum_ukopa', zagrebToday())
          .gte('datum_ukopa', daysAgo(14))
          .order('datum_ukopa', { ascending: false })
          .limit(40);
        setRecentSprovodi((recentData ?? []).flatMap(toScheduleRow));
      }

      // Fetch funeral services for the city
      const { data: servicesData, error: servicesError } = await supabase
        .from('pogrebna_poduzeca')
        .select('*')
        .eq('grad', city?.toLowerCase() || '')
        .order('ocjena', { ascending: false });

      if (servicesError) {
        console.error('Error fetching funeral services:', servicesError);
      } else {
        setFuneralServices(servicesData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Remove seconds from HH:MM:SS
  };

  // Group sprovodi by location
  const groupedSprovodi = sprovodi.reduce((acc, sprovod) => {
    const key = sprovod.groblje;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(sprovod);
    return acc;
  }, {} as Record<string, ScheduleRow[]>);

  const isZagreb = city?.toLowerCase() === 'zagreb';
  const groupedEntries = Object.entries(groupedSprovodi).sort(([a], [b]) => {
    if (!isZagreb) return 0;
    const left = ZAGREB_CEMETERY_ORDER.indexOf(a);
    const right = ZAGREB_CEMETERY_ORDER.indexOf(b);
    if (left === -1 && right === -1) return a.localeCompare(b, 'hr');
    if (left === -1) return 1;
    if (right === -1) return -1;
    return left - right;
  });



  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet pagePath={seoPath} />
      <Helmet>
        <link rel="canonical" href={`https://osmrtnica.com.hr${seoPath}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://osmrtnica.com.hr${seoPath}`} />
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Naslovnica', path: '/' },
              { name: `Umrli ${cityName}`, path: `/umrli/${city ?? ''}` },
              { name: `Sprovodi ${cityName}` },
            ]),
          )}
        </script>
      </Helmet>
      <Header />
      
        <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
            Sprovodi - {cityName}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto px-2">
            Pronađite pouzdane pogrebne usluge u gradu {cityName}. 
            Nudimo vam pregled najboljih pogrebnih poduzeća i nadolazećih sprovoda.
          </p>
        </div>

        {/* Cemetery Schedules */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-display font-semibold mb-4 sm:mb-6 px-2">Raspored sprovoda u gradu {cityName}</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-memorial-gold"></div>
            </div>
          ) : Object.keys(groupedSprovodi).length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-base sm:text-lg px-4">Nema zakazanih sprovoda za grad {cityName}</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {groupedEntries.map(([lokacija, sprovodiList]) => {
                const tips = new Set(sprovodiList.map((row) => row.tip));
                const timeHeader = tips.size === 1 && tips.has('Ispraćaj') ? 'Ispraćaj u' : 'Sprovod u';
                return (
                <Card key={lokacija}>
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg">{lokacija}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px] table-auto">
                        <thead>
                          <tr className="border-b-2 border-border bg-accent/10">
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-foreground rounded-l-lg min-w-[70px]">
                              {timeHeader}
                            </th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-foreground min-w-[140px]">
                              Ime i prezime
                            </th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-foreground hidden sm:table-cell min-w-[100px]">
                              Datum sprovoda
                            </th>
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-foreground rounded-r-lg min-w-[60px]">
                              Godine
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sprovodiList.map((sprovod, sprovodIndex) => (
                            <tr 
                              key={sprovod.id} 
                              className={`border-b border-border/50 hover:bg-accent/10 transition-colors ${sprovodIndex % 2 === 0 ? 'bg-background' : 'bg-accent/5'}`}
                            >
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-memorial-gold whitespace-nowrap">
                                {sprovod.vrijeme ? formatTime(sprovod.vrijeme) : '—'}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                                {sprovod.slug ? (
                                  <Link to={`/${sprovod.slug}`} className="hover:underline">{sprovod.ime} {sprovod.prezime}</Link>
                                ) : (
                                  <>{sprovod.ime} {sprovod.prezime}</>
                                )}
                              </td>
                              <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                                {formatDate(sprovod.datum)}
                              </td>
                               <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                                 {sprovod.godine ?? ''}
                               </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>

        {recentSprovodi.length > 0 && (
          <section className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-display font-semibold mb-4 px-2">Sprovodi u posljednjih 14 dana</h2>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <ul className="divide-y divide-border/50 text-sm">
                  {recentSprovodi.map((s) => (
                    <li key={s.id} className="py-2 flex flex-wrap gap-x-3">
                      <span className="text-muted-foreground whitespace-nowrap">{formatDate(s.datum)}{s.vrijeme ? ` u ${formatTime(s.vrijeme)}` : ''}</span>
                      {s.slug ? <Link to={`/${s.slug}`} className="font-medium hover:underline">{s.ime} {s.prezime}</Link> : <span className="font-medium">{s.ime} {s.prezime}</span>}
                      <span className="text-muted-foreground">{s.groblje}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        <CemeteriesSection cemeteries={cemeteries} cityName={cityName} />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">{sprovodi.length}</div>
              <div className="text-sm text-muted-foreground">Najavljenih sprovoda</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">{cemeteries.length}</div>
              <div className="text-sm text-muted-foreground">Groblja</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">{funeralServices.length}</div>
              <div className="text-sm text-muted-foreground">Pogrebna poduzeća</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Funeral Services */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-display font-semibold mb-6">Pogrebna poduzeća u gradu {cityName}</h2>
            <div className="space-y-6">
              {funeralServices.map((service) => (
                <Card key={service.id} className={`${!service.dostupno ? 'opacity-60' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          {service.naziv}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{service.ocjena}</span>
                          </div>
                          <span className="text-muted-foreground text-sm">
                            ({service.broj_recenzija} recenzija)
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {service.adresa}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-primary mb-1">
                          {service.cijena}
                        </div>
                        {service.dostupno ? (
                          <Badge className="bg-green-100 text-green-800">Dostupno</Badge>
                        ) : (
                          <Badge variant="secondary">Zauzeto</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {service.usluge?.map((serviceType: string) => (
                        <Badge key={serviceType} variant="outline">
                          {serviceType}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" asChild>
                        <a 
                          href={service.website_url || '#'}
                          target="_blank"
                          rel="nofollow noopener"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Pogledaj detalje
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Upcoming Funerals */}
          <div>
            <h2 className="text-2xl font-display font-semibold mb-6">Nadolazeći sprovodi</h2>
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-memorial-gold"></div>
                </div>
              ) : sprovodi.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-muted-foreground">Nema nadolazećih sprovoda</p>
                  </CardContent>
                </Card>
              ) : (
                sprovodi.slice(0, 5).map((sprovod) => (
                  <Card key={sprovod.id}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{sprovod.ime} {sprovod.prezime}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {formatDate(sprovod.datum)}{sprovod.vrijeme ? ` u ${formatTime(sprovod.vrijeme)}` : ''}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {sprovod.groblje}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Emergency Contact */}
            <Card className="mt-6 border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Hitna služba</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  Za hitne slučajeve i potrebe izvan radnog vremena:
                </p>
                <Button className="w-full bg-destructive hover:bg-destructive/90" asChild>
                  <a href="tel:194">
                    <Phone className="h-4 w-4 mr-2" />
                    Pozovi 194
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Information Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Korisne informacije o sprovodima u gradu {cityName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Potrebni dokumenti</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Potvrda o smrti (izdaje liječnik)</li>
                  <li>• Osobna iskaznica pokojnika</li>
                  <li>• Rodni list ili izvadak iz matice rođenih</li>
                  <li>• Dozvola za ukop (izdaje nadležno tijelo)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Rokovi i procedure</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Ukop najranije 24 sata nakon smrti</li>
                  <li>• Prijava smrti u roku od 3 dana</li>
                  <li>• Rezervacija grobnog mjesta unaprijed</li>
                  <li>• Mogućnost odgode zbog posebnih okolnosti</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <MemorialCtaSection />
      <Footer />
    </div>
  );
};

export default Sprovodi;