import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MemorialCtaBanner from '@/components/MemorialCtaBanner';
import VirtualCandles from '@/components/VirtualCandles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Flame, ChevronDown, FileText, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cityOrFilter, cityPattern, citySlug, isOtherPlace } from '@/lib/cityMatch';
const obituary1 = "/site/sample-obituary-1.jpg";
const obituary2 = "/site/sample-obituary-2.jpg";
import { SEOHelmet } from '@/hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { formatLifespan, formatObituaryDate, formatObituaryLocation, calculateObituaryAge } from '@/lib/utils';
import CemeteriesSection from '@/components/CemeteriesSection';
import ArchiveMonths from '@/components/ArchiveMonths';
import { fetchCemeteriesByCity, type Cemetery } from '@/lib/cemeteries';
import { breadcrumbJsonLd } from '@/lib/seo';
import { trackObituaryEvent } from '@/lib/obituaryTracking';
import NewsletterSignup from '@/components/NewsletterSignup';
import CityObituaryAlert from '@/components/CityObituaryAlert';
import BlogMemorialQuiz, { type QuizTracker } from '@/components/blog/BlogMemorialQuiz';
import { useCityName } from '@/hooks/useCityName';
import { isTestCity, testCityTitle, testCityDescription, testCityH1 } from '@/lib/seoCityTest';
import { ageLabel } from '@/lib/hr';

const MAIN_CITIES = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Dubrovnik', 'Pula', 'Karlovac'];

// Guides for families right after a death, linked from every city page.
const FIRST_STEPS = [
  { to: '/blog/smrtni-list', label: 'Smrtni list: gdje se vadi i što je potrebno' },
  { to: '/blog/kako-napisati-osmrtnicu', label: 'Kako napisati osmrtnicu' },
  { to: '/blog/kako-se-obuci-za-sprovod', label: 'Kako se obući za sprovod' },
  { to: '/blog/ostavinska-rasprava-koji-dokumenti-su-nam-potrebni', label: 'Ostavinska rasprava: koji su dokumenti potrebni' },
];

// The same obituary is sometimes imported twice; show it once.
const dedupeObituaries = <T extends { ime?: string | null; prezime?: string | null; datum_smrti?: string | null }>(rows: T[]) => {
  const seen = new Set<string>();
  return rows.filter((o) => {
    const key = `${(o.ime || '').trim().toLowerCase()}|${(o.prezime || '').trim().toLowerCase()}|${o.datum_smrti || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const localDateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const Umrli = () => {
  const { city } = useParams();
  const cityName = useCityName(city);
  // Title/H1/H2 test group, see src/lib/seoCityTest.ts
  const seoTest = isTestCity(city);
  
  const location = useLocation();
  const navigate = useNavigate();
  const seoPath = location.pathname;
  const [obituaries, setObituaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Only a successful empty result may noindex the page, never a failed request.
  const [fetchFailed, setFetchFailed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const [funeralVisibleCount, setFuneralVisibleCount] = useState(10);
  const [stats, setStats] = useState({
    obituariesThisMonth: 0,
    funeralsThisWeek: 0,
    cemeteriesCount: 0
  });
  const [funeralSchedule, setFuneralSchedule] = useState<any[]>([]);
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  // The page stays mounted when moving between cities; answers that arrive for
  // the previous city must not land on the new one.
  const currentCity = useRef(cityName);
  currentCity.current = cityName;

  // "danas i jučer" only while the newest obituary is that recent; small cities often show older ones.
  const hasFreshObituary = obituaries.some((o) => {
    const day = o.datum_ukopa || o.datum_smrti;
    return day && Date.now() - new Date(String(day).slice(0, 10) + 'T12:00').getTime() < 3 * 24 * 60 * 60 * 1000;
  });
  // Funeral schedules carry no death date; an all-"N/A" column only adds noise.
  const showDeathDate = funeralSchedule.some((f) => f.deathDate && f.deathDate !== 'N/A');

  const fetchObituaries = async () => {
    const forCity = cityName;
    try {
      const { data, error } = await supabase
        .from('obituaries')
        .select('id, ime, prezime, datum_rodenja, datum_smrti, datum_ukopa, mjesto_rodenja, mjesto_smrti, groblje, biografija, fotografija_url, profesija, slug')
        .or(cityOrFilter(cityName, ['mjesto_smrti', 'mjesto_rodenja', 'groblje', 'mjesna_zajednica']))
        .order('datum_ukopa', { ascending: false, nullsFirst: false })
        .limit(300);

      if (currentCity.current !== forCity) return;
      if (error) {
        console.error('Error fetching obituaries:', error);
        setFetchFailed(true);
      } else {
        setObituaries(dedupeObituaries((data || []).filter((row) => !isOtherPlace(row, forCity, ['mjesto_smrti', 'mjesto_rodenja', 'groblje']))));
        setFetchFailed(false);
      }
    } catch (error) {
      console.error('Error fetching obituaries:', error);
      if (currentCity.current === forCity) setFetchFailed(true);
    } finally {
      if (currentCity.current === forCity) setLoading(false);
    }
  };

  const fetchStats = async () => {
    const forCity = cityName;
    try {
      // Get current date boundaries
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
      
      // Fetch obituaries this month - same logic as main obituaries list
      const { data: obituariesData, error: obituariesError } = await supabase
        .from('obituaries')
        .select('id')
        .or(cityOrFilter(cityName, ['mjesto_smrti', 'mjesto_rodenja']))
        .gte('created_at', startOfMonth.toISOString());

      // Fetch funerals this week  
      const { data: funeralsData, error: funeralsError } = await supabase
        .from('obituaries')
        .select('id')
        .or(cityOrFilter(cityName, ['mjesto_smrti', 'groblje', 'mjesna_zajednica']))
        .gte('datum_ukopa', startOfWeek.toISOString().split('T')[0]);

      if (obituariesError) {
        console.error('Error fetching obituaries stats:', obituariesError);
      }
      
      if (funeralsError) {
        console.error('Error fetching funerals stats:', funeralsError);
      }

      if (currentCity.current !== forCity) return;
      // Update stats with fetched data
      setStats(prevStats => ({
        obituariesThisMonth: obituariesData?.length || 0,
        funeralsThisWeek: funeralsData?.length || 0,
        cemeteriesCount: prevStats.cemeteriesCount // Will be updated when cemeteries are fetched
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCemeteries = async () => {
    const forCity = cityName;
    const data = await fetchCemeteriesByCity(cityName);
    if (currentCity.current !== forCity) return;
    setCemeteries(data);
    setStats(prevStats => ({ ...prevStats, cemeteriesCount: data.length }));
  };

  const fetchFuneralSchedule = async () => {
    const forCity = cityName;
    try {
      // Get last 7 days and next 7 days
      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      const from = lastWeek.toISOString().split('T')[0];
      const to = nextWeek.toISOString().split('T')[0];
      const [{ data, error }, { data: scheduled }] = await Promise.all([
        supabase
          .from('obituaries')
          .select(`
            id, ime, prezime, datum_rodenja, datum_smrti, datum_ukopa, 
            groblje, profesija, mjesto_smrti
          `)
          .or(cityOrFilter(cityName, ['mjesto_smrti', 'groblje', 'mjesna_zajednica']))
          .gte('datum_ukopa', from)
          .lte('datum_ukopa', to)
          .order('datum_ukopa', { ascending: false }), // Sort from newest to oldest
        // Funeral schedules published by the city's cemetery company (Zagreb, Rijeka, Karlovac...),
        // so big cities with few obituaries still show their funerals.
        supabase
          .from('sprovodi')
          .select('id, ime, prezime, godina, groblje, datum_sprovoda, vrijeme_sprovoda')
          .filter('grad', 'imatch', `^${cityPattern(cityName)}$`)
          .gte('datum_sprovoda', from)
          .lte('datum_sprovoda', to),
      ]);

      if (currentCity.current !== forCity) return;
      if (error) {
        console.error('Error fetching funeral schedule:', error);
        setFuneralSchedule([]);
      } else {
        // Create a flat array of funerals instead of grouping by cemetery
        const funeralList = (data || []).filter((row) => !isOtherPlace(row, forCity, ['mjesto_smrti', 'groblje'])).map((funeral: any) => {
          const age = funeral.datum_smrti && funeral.datum_rodenja ? 
            new Date(funeral.datum_smrti).getFullYear() - new Date(funeral.datum_rodenja).getFullYear() : 'N/A';
          
          // Midnight means the import had no time for the funeral; show the date alone.
          const hasTime = !!funeral.datum_ukopa && !/T00:00(:00)?/.test(String(funeral.datum_ukopa).replace(' ', 'T'));
          return {
            id: funeral.id,
            rawDate: hasTime ? funeral.datum_ukopa as string : funeral.datum_ukopa ? String(funeral.datum_ukopa).slice(0, 10) : null,
            burialDate: funeral.datum_ukopa ? new Date(String(funeral.datum_ukopa).slice(0, 10) + 'T12:00').toLocaleDateString('hr-HR') : 'N/A',
            // The import stores the local funeral time as if it were UTC; read it as written.
            burialTime: hasTime ? String(funeral.datum_ukopa).replace(' ', 'T').slice(11, 16) : '',
            name: `${funeral.ime || ''} ${funeral.prezime || ''}`.trim(),
            deathDate: formatObituaryDate(funeral.datum_smrti) || 'N/A',
            age: age.toString(),
            cemetery: funeral.groblje || 'Nepoznato',
            place: funeral.mjesto_smrti || 'Nepoznato',
            profession: funeral.profesija || ''
          };
        });
        
        const known = new Set(funeralList.map((f) => f.name.toLowerCase()));
        const fromSchedule = (scheduled || [])
          .filter((row: any) => !known.has(`${row.ime || ''} ${row.prezime || ''}`.trim().toLowerCase()))
          .map((row: any) => {
            const time = row.vrijeme_sprovoda ? String(row.vrijeme_sprovoda).slice(0, 5) : '';
            const rawDate = time ? `${row.datum_sprovoda}T${time}` : row.datum_sprovoda;
            return {
              id: `s-${row.id}`,
              rawDate,
              burialDate: new Date(`${row.datum_sprovoda}T12:00`).toLocaleDateString('hr-HR'),
              burialTime: time,
              name: `${row.ime || ''} ${row.prezime || ''}`.trim(),
              deathDate: 'N/A',
              age: row.godina ? String(row.godina) : 'N/A',
              cemetery: row.groblje || 'Nepoznato',
              place: cityName,
              profession: '',
            };
          });

        setFuneralSchedule([...funeralList, ...fromSchedule].sort((a, b) => String(b.rawDate).localeCompare(String(a.rawDate))));
      }
    } catch (error) {
      console.error('Error fetching funeral schedule:', error);
      if (currentCity.current === forCity) setFuneralSchedule([]);
    }
  };

  // Upcoming funerals (today onwards), earliest first, for the box at the top of the page.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow);
  const upcomingFunerals = funeralSchedule
    .filter((f) => f.rawDate)
    .map((f) => {
      const d = new Date(`${String(f.rawDate).slice(0, 10)}T12:00`);
      const key = localDateKey(d);
      const day = key === todayKey ? 'Danas' : key === tomorrowKey ? 'Sutra' : `${d.getDate()}. ${d.getMonth() + 1}.`;
      return { ...f, day, time: f.burialTime, ts: d.getTime(), order: `${String(f.rawDate).slice(0, 10)} ${f.burialTime || '99'}` };
    })
    .filter((f) => f.ts >= startOfToday.getTime())
    .sort((a, b) => a.order.localeCompare(b.order));

  const quizTracker: QuizTracker = {
    step: (ctaId) => trackObituaryEvent('obituary_memorial_click', null, { placement: 'city_quiz', memorial_action: ctaId }),
    click: (ctaId) => trackObituaryEvent('obituary_memorial_click', null, { placement: 'city_quiz', memorial_action: ctaId }),
  };

  const renderObituaryCard = (obituary: any) => {
    const lifespan = formatLifespan(obituary.datum_rodenja, obituary.datum_smrti);
    // The cemetery says where the funeral is; fall back to the places when it is missing.
    const cemetery = obituary.groblje ? String(obituary.groblje).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const location = cemetery || formatObituaryLocation(obituary.mjesto_rodenja, obituary.mjesto_smrti);
    const age = calculateObituaryAge(obituary.datum_rodenja, obituary.datum_smrti);

    return (
      <Card
        key={obituary.id}
        className="memorial-card group hover:shadow-memorial transition-all duration-300 flex flex-col cursor-pointer"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          navigate(`/${obituary.slug}`);
        }}
      >
        <CardContent className="p-4 sm:p-6 flex flex-col flex-grow">
          <div className="flex flex-col items-center text-center flex-grow w-full">
            {/* Photo */}
            <div className="relative mb-4">
              <img 
                src={obituary.fotografija_url || '/default-obituary-photo.jpg'}
                alt={`${obituary.ime} ${obituary.prezime}`}
                className="w-24 h-30 sm:w-32 sm:h-40 object-cover rounded-lg border-2 border-border mx-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
            </div>

            {/* Content */}
            <div className="w-full">
              <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-3">
                {/* Real link so crawlers can reach each obituary; the card's onClick still handles the rest. */}
                <Link to={`/${obituary.slug}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                  {obituary.ime} {obituary.prezime}
                </Link>
              </h3>
              
              <div className="space-y-2 text-xs sm:text-sm text-muted-foreground mb-3">
                {lifespan && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="text-center">{lifespan}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <MapPin size={14} className="flex-shrink-0" />
                    <span className="text-center break-words">{location}</span>
                  </div>
                )}
              </div>

              {age !== null && (
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full inline-block text-xs font-medium mb-3">
                  {ageLabel(age)}
                </div>
              )}

              {obituary.biografija && (
                <p className="text-xs sm:text-sm text-foreground leading-relaxed mb-4 text-center">
                  {obituary.biografija.length > 80 
                    ? `${obituary.biografija.substring(0, 80)}...` 
                    : obituary.biografija}
                </p>
              )}

              <div className="mt-auto w-full flex flex-col gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    trackObituaryEvent('obituary_memorial_click', obituary, { placement: 'city_card', memorial_action: 'create' });
                    navigate(`/kreiraj-memorijal?deceased_id=${obituary.id}`);
                  }}
                  className="w-full py-3.5 bg-foreground text-memorial-gold border border-foreground/80 flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors duration-300 cursor-pointer"
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
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  useEffect(() => {
    setLoading(true);
    setObituaries([]);
    setFuneralSchedule([]);
    setCemeteries([]);
    setVisibleCount(6);
    fetchObituaries();
    fetchStats();
    fetchFuneralSchedule();
    fetchCemeteries();
  }, [cityName]);



  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{seoTest && city ? testCityTitle(city, cityName) : cityName ? `Umrli ${cityName} | Osmrtnice i spomen pokojnika u ${cityName}` : 'Umrli | Pretraživanje osmrtnica u Hrvatskoj'}</title>
        <meta name="description" content={seoTest
          ? testCityDescription(cityName, stats.obituariesThisMonth, stats.funeralsThisWeek)
          : cityName
          ? `Pretraživanje osmrtnica i pokojnika u ${cityName}. Informacije o sprovodima, grobljima i virtualnim svijećama za naše najmilije.`
          : 'Pretražite osmrtnice u Hrvatskoj. Informacije o sprovodima, grobljima i virtualnim svijećama za naše najmilije.'} />
        <link rel="canonical" href={`https://osmrtnica.com.hr${seoPath}`} />
        {/* Prazne gradske stranice nemaju SEO vrijednost */}
        {!loading && !fetchFailed && city && obituaries.length === 0 && <meta name="robots" content="noindex,follow" />}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://osmrtnica.com.hr${seoPath}`} />
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbJsonLd(
              city
                ? [
                    { name: 'Naslovnica', path: '/' },
                    { name: 'Umrli', path: '/umrli' },
                    { name: `Umrli ${cityName}` },
                  ]
                : [{ name: 'Naslovnica', path: '/' }, { name: 'Umrli' }],
            ),
          )}
        </script>
      </Helmet>
      {/* on_page_seo rows would override the test wording */}
      {!seoTest && <SEOHelmet pagePath={seoPath} />}
      <Header />
      
        <main className="container mx-auto px-4 py-6 sm:py-8 pb-16">
        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
            {seoTest ? testCityH1(cityName) : cityName ? `Umrli - ${cityName}` : 'Umrli'}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto px-2">
            {cityName
              ? `Dostojanstveno sjećanje na naše voljene koji su nas napustili u gradu ${cityName}.`
              : 'Dostojanstveno sjećanje na naše voljene koji su nas napustili.'}{' '}
            Ovdje možete pronaći aktualne osmrtnice i informacije o sprovodima.
          </p>
        </div>


        {/* Upcoming funerals: the first thing people look for on a city page */}
        {cityName && upcomingFunerals.length > 0 && (
          <section aria-labelledby="sprovodi-danas" className="mb-8 sm:mb-10 rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <h2 id="sprovodi-danas" className="text-xl sm:text-2xl font-display font-semibold text-foreground">{seoTest ? `Sprovodi i ukopi – ${cityName}, ovaj tjedan` : 'Nadolazeći sprovodi'}</h2>
              {city && (
                <Link to={`/sprovodi/${city}`} className="text-sm underline text-muted-foreground hover:text-foreground">Cijeli raspored</Link>
              )}
            </div>
            <ul className="divide-y divide-border">
              {upcomingFunerals.slice(0, 6).map((f) => (
                <li key={f.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 py-3">
                  <span className="font-semibold text-foreground">{f.time}</span>
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground truncate">{f.name}</span>
                    <span className="block text-sm text-muted-foreground truncate">{f.cemetery}</span>
                  </span>
                  <span className="rounded-full bg-memorial-gold/15 px-3 py-1 text-xs font-semibold text-foreground">{f.day}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Statistics */}
        <div className="hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">{stats.obituariesThisMonth}</div>
              <div className="text-muted-foreground text-sm sm:text-base">Osmrtnice ovaj mjesec</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">{stats.funeralsThisWeek}</div>
              <div className="text-muted-foreground text-sm sm:text-base">Sprovodi ovaj tjedan</div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">{stats.cemeteriesCount}</div>
              <div className="text-muted-foreground text-sm sm:text-base">Groblja u gradu</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Obituaries */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-display font-semibold mb-4 sm:mb-6 px-2">{seoTest ? `Osmrtnice ${cityName} – ${hasFreshObituary ? 'danas i jučer' : 'najnovije'}` : `Najnovije osmrtnice${cityName ? ` u gradu ${cityName}` : ''}`}</h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-memorial-gold"></div>
            </div>
          ) : obituaries.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-base sm:text-lg px-4">Nema objavljenih osmrtnica{cityName ? ` za grad ${cityName}` : ''}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {obituaries.slice(0, Math.min(3, visibleCount)).map(renderObituaryCard)}
              </div>
              {city && cityName && (
                <CityObituaryAlert city={city} cityName={cityName} className="my-6 sm:my-8" />
              )}
              {visibleCount > 3 && obituaries.length > 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {obituaries.slice(3, visibleCount).map(renderObituaryCard)}
                </div>
              )}
              
              {/* Load More Button */}
              {obituaries.length > visibleCount && (
                <div className="text-center mt-6 sm:mt-8">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border-foreground text-foreground hover:bg-foreground hover:text-background px-6 sm:px-8 py-3 text-base sm:text-lg font-medium"
                    onClick={() => setVisibleCount(prev => Math.min(prev + 9, obituaries.length))}
                  >
                    Učitaj više
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Digital Memorial CTA: quiz on city pages, banner on /umrli */}
        {city ? (
          <div className="max-w-4xl mx-auto mb-12">
            <BlogMemorialQuiz
              slug={`umrli-${city}`}
              heading="Osmrtnica traje nekoliko dana. Životna priča može trajati zauvijek."
              tracker={quizTracker}
            />
          </div>
        ) : (
          <MemorialCtaBanner placement="city_banner" />
        )}

        {/* First steps after a death + guides newsletter */}
        <section aria-labelledby="prvi-koraci" className="max-w-4xl mx-auto mb-12 grid gap-6 md:grid-cols-2 md:items-start">
          <div>
            <h2 id="prvi-koraci" className="text-xl sm:text-2xl font-display font-semibold text-foreground mb-3">
              Netko vam je preminuo? Prvi koraci
            </h2>
            <ol className="list-decimal pl-5 space-y-2 text-foreground">
              {FIRST_STEPS.map((step) => (
                <li key={step.to}>
                  <Link to={step.to} className="underline decoration-memorial-gold/60 underline-offset-4 hover:text-memorial-gold">{step.label}</Link>
                </li>
              ))}
            </ol>
          </div>
          <NewsletterSignup variant="obituary" placement="umrli" />
        </section>

        {/* Funeral Schedule Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground mb-6">
            {seoTest ? `Raspored sprovoda ${cityName}` : 'Raspored sprovoda i ispraćaja'}
          </h2>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-memorial-gold/10 border-b">
              <h3 className="text-lg font-semibold text-foreground">Sprovodi zadnjih 7 dana i idućih 7 dana</h3>
              <p className="text-sm text-muted-foreground mt-1">Podaci o vremenu, mjestu i kontakt informacijama (sortirano od najnovijeg prema starijem)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Datum sprovoda</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Vrijeme</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Ime i prezime</th>
                    {showDeathDate && <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Datum smrti</th>}
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Godine</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Groblje</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Mjesto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {funeralSchedule.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Nema sprovoda u zadnjih 7 dana niti u idućih 7 dana
                      </td>
                    </tr>
                  ) : (
                    funeralSchedule.slice(0, funeralVisibleCount).map((funeral: any, index: number) => (
                      <tr key={`funeral-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {funeral.burialDate}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {funeral.burialTime || '—'}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {funeral.name}
                        </td>
                        {showDeathDate && (
                          <td className="px-4 py-4 text-sm text-gray-700">
                            {funeral.deathDate}
                          </td>
                        )}
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {funeral.age}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {funeral.cemetery}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {funeral.place}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {funeralSchedule.length > funeralVisibleCount && (
              <div className="px-6 py-4 text-center border-t">
                <Button
                  variant="outline"
                  className="border-foreground text-foreground hover:bg-foreground hover:text-background px-6 py-2 text-sm font-medium"
                  onClick={() => setFuneralVisibleCount(prev => Math.min(prev + 10, funeralSchedule.length))}
                >
                  Prikaži više
                </Button>
              </div>
            )}
            <div className="px-6 py-4 bg-gray-50 border-t">
              <p className="text-xs text-gray-600">
                * Za dodatne informacije kontaktirajte navedene kontakt osobe ili pogrebno poduzeće
              </p>
            </div>
          </div>
        </section>

        {/* Cemeteries Section - dynamic from groblja_i_opisi, filtered by city */}
        <CemeteriesSection cemeteries={cemeteries} cityName={cityName} />

        <ArchiveMonths city={city} cityName={city ? cityName : undefined} />

        {/* Cemeteries internal links (cities from main menu) */}
        <section className="mb-12">
          <p className="text-2xl font-display font-bold text-foreground mb-2">
            Groblja po gradovima
          </p>
          <p className="text-muted-foreground mb-6">
            Adrese, kontakti i radno vrijeme groblja — izaberite grad.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link
              to="/groblja"
              className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 hover:border-memorial-gold/60 hover:shadow-sm transition-colors"
            >
              <span className="font-medium text-foreground group-hover:text-memorial-gold transition-colors">Sva groblja</span>
              <MapPin size={16} className="text-memorial-gold flex-shrink-0" />
            </Link>
            {MAIN_CITIES.map((city) => (
              <Link
                key={city}
                to={`/groblja/${citySlug(city)}`}
                className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 hover:border-memorial-gold/60 hover:shadow-sm transition-colors"
              >
                <span className="font-medium text-foreground group-hover:text-memorial-gold transition-colors">Groblja {city}</span>
                <MapPin size={16} className="text-memorial-gold flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        {/* Funerals internal links (cities from main menu) */}
        <section className="mb-12">
          <p className="text-2xl font-display font-bold text-foreground mb-2">
            Sprovodi po gradovima
          </p>
          <p className="text-muted-foreground mb-6">
            Raspored sprovoda i ispraćaja — izaberite grad.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link
              to="/sprovodi"
              className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 hover:border-memorial-gold/60 hover:shadow-sm transition-colors"
            >
              <span className="font-medium text-foreground group-hover:text-memorial-gold transition-colors">Svi sprovodi</span>
              <MapPin size={16} className="text-memorial-gold flex-shrink-0" />
            </Link>
            {MAIN_CITIES.map((city) => (
              <Link
                key={city}
                to={`/sprovodi/${citySlug(city)}`}
                className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 hover:border-memorial-gold/60 hover:shadow-sm transition-colors"
              >
                <span className="font-medium text-foreground group-hover:text-memorial-gold transition-colors">Sprovodi {city}</span>
                <MapPin size={16} className="text-memorial-gold flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        {/* Virtual candles — same section as homepage */}
        <VirtualCandles />

        {/* Information Section — light card with elegant gold border */}
        <section className="mt-12 sm:mt-16">
          <div className="relative group">
            <div className="relative bg-card text-foreground border border-memorial-gold/40 p-8 md:p-12 shadow-lg">
              {/* Heading */}
              <div className="text-center mb-10 md:mb-12">
                <h2 className="font-display text-2xl md:text-3xl text-foreground tracking-wide mb-4">
                  Korisne informacije{cityName ? ` za grad ${cityName}` : ''}
                </h2>
                <div className="h-px w-24 bg-gradient-to-r from-transparent via-memorial-gold to-transparent mx-auto" />
              </div>

              <div className="grid md:grid-cols-2 gap-12 md:gap-16">
                {/* Documents */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <FileText size={20} className="text-memorial-gold flex-shrink-0" />
                    <h3 className="font-display text-lg md:text-xl text-foreground">
                      Potrebni dokumenti
                    </h3>
                  </div>

                  <ul className="space-y-4">
                    {[
                      'Potvrda o smrti (izdaje liječnik)',
                      'Osobna iskaznica pokojnika',
                      'Rodni list ili izvadak iz matice rođenih',
                      'Dozvola za ukop (izdaje nadležno tijelo)',
                    ].map((doc) => (
                      <li key={doc} className="flex items-start gap-4 group/item">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-memorial-gold shrink-0 group-hover/item:scale-125 transition-transform" />
                        <span className="text-muted-foreground text-sm md:text-base leading-relaxed">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contacts */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Phone size={20} className="text-memorial-gold flex-shrink-0" />
                    <h3 className="font-display text-lg md:text-xl text-foreground">
                      Kontakt informacije
                    </h3>
                  </div>

                  <div className="grid gap-3">
                    {[
                      { name: 'Hitna pomoć', number: '194' },
                      { name: 'Policija', number: '192' },
                      { name: 'Vatrogasci', number: '193' },
                    ].map(({ name, number }) => (
                      <a
                        key={number}
                        href={`tel:${number}`}
                        className="flex items-center justify-between p-4 bg-background border border-memorial-gold/25 hover:border-memorial-gold/60 transition-colors"
                      >
                        <span className="text-muted-foreground font-medium tracking-wide uppercase text-xs">
                          {name}
                        </span>
                        <span className="font-display text-2xl font-semibold text-memorial-gold">
                          {number}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Decorative corner elements */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-memorial-gold/50" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-memorial-gold/50" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-memorial-gold/50" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-memorial-gold/50" />
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default Umrli;