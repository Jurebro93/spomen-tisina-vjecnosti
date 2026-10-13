import { FormEvent, useEffect, useMemo, useState } from 'react';
import { hasConsent } from '@/lib/consent';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Flame,
  Heart,
  Image as ImageIcon,
  Leaf,
  Mail,
  MapPin,
  Search,
  Share2,
} from 'lucide-react';
import HomepageTwoHeader from '@/components/HomepageTwoHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { MEMORIAL_PRICE_LABEL } from '@/lib/memorial';
import { formatLifespan } from '@/lib/utils';
const defaultObituaryPhoto = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/default-obituary-photo.jpg";

type Obituary = {
  id: string;
  ime: string;
  prezime: string;
  datum_rodenja: string | null;
  datum_smrti: string | null;
  datum_ukopa: string | null;
  vrijeme_ukopa: string | null;
  mjesto_smrti: string | null;
  groblje: string | null;
  fotografija_url: string | null;
  slug: string | null;
};

type City = { name: string; count: number };
type BlogPost = { id: string; title: string; excerpt: string | null; image_url: string | null; slug: string | null };

const SEARCH_CITIES = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Slavonski Brod', 'Pula', 'Sesvete', 'Karlovac', 'Varaždin', 'Šibenik', 'Sisak', 'Dubrovnik'];
const FEATURED_CITIES = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar'];
const ARTICLE_SLUGS = ['kako-napisati-osmrtnicu', 'kako-preboljeti-gubitak-supruga', 'kako-se-obuci-za-sprovod'];
const HOME_TITLE = 'Osmrtnice Hrvatska i digitalni memorijali | Osmrtnica.com.hr';
const HOME_DESCRIPTION = 'Pretražite osmrtnice po imenu i gradu ili objavite osmrtnicu. Upoznajte digitalne memorijale za čuvanje fotografija, životnih priča i uspomena.';
const HOME_URL = 'https://spomen-tisina-vjecnosti.lovable.app/homepage-2/';

const trackMemorialClick = (position: 'hero_card' | 'main_section' | 'example') => {
  if (typeof window === 'undefined') return;
  try {
    if (!hasConsent('analytics')) return;
    const analyticsWindow = window as Window & { dataLayer?: unknown[] };
    analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.dataLayer.push({ event: 'digital_memorial_click', position });
  } catch {
    // Analytics must never interrupt navigation.
  }
};

const HomepageTwo = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [city, setCity] = useState('all');
  const [obituaries, setObituaries] = useState<Obituary[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [loadingObituaries, setLoadingObituaries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [obituaryError, setObituaryError] = useState(false);
  const [cityError, setCityError] = useState(false);
  const [articleError, setArticleError] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    const load = async () => {
      const [obituaryResult, cityResult, articleResult] = await Promise.all([
        supabase
          .from('obituaries')
          .select('id, ime, prezime, datum_rodenja, datum_smrti, datum_ukopa, vrijeme_ukopa, mjesto_smrti, groblje, fotografija_url, slug')
          .eq('active', true)
          .order('datum_ukopa', { ascending: false, nullsFirst: false })
          .limit(6),
        supabase.rpc('obituary_city_counts'),
        supabase
          .from('blogs')
          .select('id, title, excerpt, image_url, slug')
          .in('slug', ARTICLE_SLUGS),
      ]);

      if (obituaryResult.error) setObituaryError(true);
      else setObituaries((obituaryResult.data ?? []) as Obituary[]);
      setLoadingObituaries(false);

      if (cityResult.error) setCityError(true);
      else setCities((cityResult.data ?? []) as City[]);
      setLoadingCities(false);

      if (articleResult.error) setArticleError(true);
      else {
        const rows = (articleResult.data ?? []) as BlogPost[];
        setArticles(ARTICLE_SLUGS.map((slug) => rows.find((row) => row.slug === slug)).filter((row): row is BlogPost => Boolean(row)));
      }
      setLoadingArticles(false);
    };

    load();
  }, []);

  const orderedCities = useMemo(() => {
    const featured = FEATURED_CITIES.map((featuredCity) => cities.find((item) => item.name.toLocaleLowerCase('hr') === featuredCity.toLocaleLowerCase('hr'))).filter((item): item is City => Boolean(item));
    const featuredNames = new Set(featured.map((item) => item.name));
    return [...featured, ...cities.filter((item) => !featuredNames.has(item.name)).sort((a, b) => a.name.localeCompare(b.name, 'hr'))];
  }, [cities]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName && city !== 'all') {
      navigate(`/umrli/${city}`);
      return;
    }
    const params = new URLSearchParams();
    if (trimmedName) params.set('q', trimmedName);
    if (city !== 'all') params.set('city', city);
    navigate(params.size ? `/pretraga?${params.toString()}` : '/umrli');
  };

  const handleNewsletter = async (event: FormEvent) => {
    event.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterState('sending');
    const { data, error } = await supabase.functions.invoke('subscribe-newsletter', { body: { email: newsletterEmail.trim().toLowerCase() } });
    if (error || data?.error) {
      setNewsletterState('error');
      return;
    }
    setNewsletterEmail('');
    setNewsletterState('success');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Helmet>
        <title>{HOME_TITLE}</title>
        <meta name="robots" content="noindex,follow" />
        <meta name="description" content={HOME_DESCRIPTION} />
        <link rel="canonical" href={HOME_URL} />
        <meta property="og:title" content={HOME_TITLE} />
        <meta property="og:description" content={HOME_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={HOME_URL} />
        <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: HOME_TITLE, description: HOME_DESCRIPTION, url: HOME_URL, isPartOf: { '@type': 'WebSite', name: 'Osmrtnica.com.hr', url: 'https://spomen-tisina-vjecnosti.lovable.app/' } })}</script>
      </Helmet>

      <HomepageTwoHeader />
      <main>
        <section className="border-b border-border bg-secondary">
          <div className="container mx-auto grid gap-8 px-4 py-10 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)] lg:items-stretch lg:py-14">
            <div className="flex flex-col justify-center">
              <p className="mb-3 text-sm font-semibold uppercase text-accent">Osmrtnica.com.hr</p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Osmrtnice Hrvatska</h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">Pronađite osmrtnicu po imenu ili gradu, pogledajte informacije o posljednjem ispraćaju i ostavite poruku sjećanja.</p>

              <form onSubmit={handleSearch} className="mt-8 rounded-lg border border-border bg-card p-4 shadow-elegant sm:p-5" role="search">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="homepage-name" className="text-base">Ime i prezime</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input id="homepage-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Unesite ime i prezime" className="min-h-12 pl-10 text-base" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homepage-city" className="text-base">Grad</Label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger id="homepage-city" className="min-h-12 text-base"><SelectValue placeholder="Odaberite grad" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Svi gradovi</SelectItem>
                        {SEARCH_CITIES.map((item) => <SelectItem key={item} value={item.toLowerCase()}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" size="lg" className="mt-4 min-h-12 w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto">
                  <Search className="mr-2 h-5 w-5" aria-hidden="true" /> Pretraži osmrtnice
                </Button>
                <p className="mt-4 text-sm text-muted-foreground">Želite objaviti osmrtnicu? <Link to="/objavi-osmrtnicu" className="font-semibold text-foreground underline underline-offset-4">Objavi osmrtnicu</Link></p>
              </form>
            </div>

            <Card className="overflow-hidden border-border bg-primary text-primary-foreground shadow-memorial">
              <CardContent className="flex h-full flex-col p-0">
                <div className="grid min-h-[180px] grid-cols-[110px_1fr] border-b border-primary-foreground/15 sm:grid-cols-[150px_1fr]">
                  <div className="bg-primary-foreground/5 p-3">
                    <img src={defaultObituaryPhoto} alt="Ogledni prikaz digitalnog memorijala" className="h-full min-h-[150px] w-full rounded object-cover" width={150} height={180} />
                  </div>
                  <div className="flex flex-col justify-center p-5">
                    <span className="text-xs uppercase text-accent">Ogledni prikaz</span>
                    <p className="mt-2 font-display text-xl font-semibold">Marija Kovač</p>
                    <p className="mt-1 text-sm text-primary-foreground/70">1932. – 2004.</p>
                    <div className="mt-4 space-y-2 text-xs text-primary-foreground/80">
                      <p className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-accent" /> Fotografije i životna priča</p>
                      <p className="flex items-center gap-2"><Heart className="h-4 w-4 text-accent" /> Poruke sjećanja</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <span className="text-xs font-semibold uppercase text-accent">Digitalni memorijal</span>
                  <h2 className="mt-3 text-2xl font-medium sm:text-3xl">Sačuvajte uspomene na dragu osobu</h2>
                  <p className="mt-4 text-base leading-relaxed text-primary-foreground/75">Fotografije, životna priča i poruke obitelji na jednom mjestu — i za osobu koja je preminula prije mnogo godina.</p>
                  <p className="mt-5 text-base font-semibold">{MEMORIAL_PRICE_LABEL} jednokratno · Bez pretplate</p>
                  <Button asChild size="lg" className="mt-5 min-h-12 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link to="/digitalni-memorijal" onClick={() => trackMemorialClick('hero_card')}>Pogledaj kako izgleda <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-12 sm:py-16" aria-labelledby="latest-heading">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 id="latest-heading">Najnovije osmrtnice</h2><p className="mt-2 text-base text-muted-foreground">Informacije o preminulima i posljednjem ispraćaju.</p></div>
              <Link to="/umrli" className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">Pogledaj sve osmrtnice <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </div>
            {loadingObituaries ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className={`${index > 3 ? 'hidden md:block' : ''} h-52 rounded-lg`} />)}</div>
            ) : obituaryError ? (
              <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"><p>Osmrtnice se trenutačno ne mogu učitati. Pokušajte ponovno kasnije.</p></div>
            ) : obituaries.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted p-6 text-center text-muted-foreground">Trenutačno nema objavljenih osmrtnica.</div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {obituaries.map((obituary, index) => (
                  <Card key={obituary.id} className={`${index > 3 ? 'hidden md:block' : ''} overflow-hidden border-border shadow-elegant`}>
                    <CardContent className="flex h-full gap-4 p-4">
                      <img src={obituary.fotografija_url || defaultObituaryPhoto} onError={(event) => { event.currentTarget.src = defaultObituaryPhoto; }} alt={`${obituary.ime} ${obituary.prezime}`} className="h-32 w-24 shrink-0 rounded object-cover" width={96} height={128} loading="lazy" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="text-xl font-semibold">{obituary.ime} {obituary.prezime}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{formatLifespan(obituary.datum_rodenja, obituary.datum_smrti) || 'Podaci o godinama nisu navedeni'}</p>
                        {(obituary.groblje || obituary.mjesto_smrti) && <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{obituary.groblje || obituary.mjesto_smrti}</p>}
                        {obituary.datum_ukopa && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 shrink-0" />{new Date(obituary.datum_ukopa).toLocaleDateString('hr-HR')}{obituary.vrijeme_ukopa ? ` · ${obituary.vrijeme_ukopa}` : ''}</p>}
                        {obituary.slug && <Link to={`/${obituary.slug}`} className="mt-auto inline-flex min-h-11 items-center pt-3 text-sm font-semibold text-accent hover:underline">Otvori osmrtnicu <ArrowRight className="ml-1 h-4 w-4" /></Link>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-y border-border bg-secondary py-12 sm:py-16" aria-labelledby="cities-heading">
          <div className="container mx-auto px-4">
            <h2 id="cities-heading">Pronađite osmrtnice po gradovima</h2>
            <p className="mt-2 text-base text-muted-foreground">Odaberite mjesto i pregledajte dostupne osmrtnice.</p>
            {loadingCities ? <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-md" />)}</div> : cityError ? <p role="alert" className="mt-8 rounded-md border border-destructive/30 p-4">Popis gradova trenutačno nije dostupan.</p> : (
              <>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {orderedCities.slice(0, showAllCities ? undefined : 5).map((item) => (
                    <Link key={item.name} to={`/umrli/${item.name.toLowerCase()}`} className="flex min-h-14 items-center justify-between rounded-md border border-border bg-card px-4 font-medium shadow-sm hover:border-accent hover:text-accent">
                      <span className="break-words">{item.name}</span><ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                    </Link>
                  ))}
                </div>
                {orderedCities.length > 5 && <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={() => setShowAllCities((value) => !value)}>{showAllCities ? 'Prikaži manje' : 'Prikaži ostale gradove'} <ChevronDown className={`ml-2 h-4 w-4 ${showAllCities ? 'rotate-180' : ''}`} /></Button>}
              </>
            )}
          </div>
        </section>

        <section className="py-12 sm:py-20" aria-labelledby="memorial-heading">
          <div className="container mx-auto grid items-center gap-10 px-4 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase text-accent">Digitalni memorijal</p>
              <h2 id="memorial-heading">Obiteljske priče vrijedi sačuvati</h2>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                <p>Možda imate stare fotografije roditelja, bakinu omiljenu izreku ili priču o djedu koju želite prenijeti svojoj djeci.</p>
                <p>Digitalni memorijal okuplja fotografije, životnu priču i poruke sjećanja na jednoj stranici koju možete podijeliti s bližnjima. Možete ga izraditi za osobu koja je preminula nedavno ili prije više desetljeća.</p>
              </div>
              <ul className="mt-6 space-y-3">
                {['Fotografije i životna priča', 'Poruke obitelji i prijatelja', 'Jednostavno dijeljenje s bližnjima'].map((benefit) => <li key={benefit} className="flex items-center gap-3 text-base"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Check className="h-4 w-4" /></span>{benefit}</li>)}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="min-h-12 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/digitalni-memorijal" onClick={() => trackMemorialClick('main_section')}>Saznaj više o digitalnom memorijalu</Link></Button>
                <Button asChild size="lg" variant="outline" className="min-h-12"><Link to="/memorijal-primjer/obiteljske-uspomene" onClick={() => trackMemorialClick('example')}>Pogledaj memorijal</Link></Button>
              </div>
            </div>
            <Card className="overflow-hidden border-border shadow-memorial">
              <div className="border-b border-border bg-primary px-5 py-3 text-sm text-primary-foreground"><strong>Ogledni memorijal</strong> — izmišljeni podaci</div>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-5">
                  <img src={defaultObituaryPhoto} alt="Neutralni prikaz oglednog memorijala Marije Kovač" className="h-32 w-28 rounded object-cover" width={112} height={128} loading="lazy" />
                  <div><p className="font-display text-2xl font-semibold">Marija Kovač</p><p className="mt-1 text-muted-foreground">1932. – 2004.</p><p className="mt-3 text-sm text-muted-foreground">Baka čije priče i danas okupljaju obitelj</p></div>
                </div>
                <blockquote className="mt-6 border-l-2 border-accent pl-4 font-display text-lg">„Najvažnije je da se obitelj uvijek ima gdje vratiti.”</blockquote>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
                  <div className="rounded-md bg-muted p-3"><ImageIcon className="mx-auto mb-2 h-5 w-5 text-accent" />Fotografije</div>
                  <div className="rounded-md bg-muted p-3"><BookOpen className="mx-auto mb-2 h-5 w-5 text-accent" />Priče</div>
                  <div className="rounded-md bg-muted p-3"><Share2 className="mx-auto mb-2 h-5 w-5 text-accent" />Dijeljenje</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y border-border bg-secondary py-12 sm:py-16" aria-labelledby="articles-heading">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="articles-heading">Savjeti za čuvanje uspomena i riječi sjećanja</h2><p className="mt-2 text-base text-muted-foreground">Odabrani članci iz postojeće baze sadržaja.</p></div><Link to="/blog" className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">Pogledaj sve članke <ArrowRight className="ml-2 h-4 w-4" /></Link></div>
            {loadingArticles ? <div className="grid gap-5 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-lg" />)}</div> : articleError ? <p role="alert" className="rounded-md border border-destructive/30 p-4">Članci se trenutačno ne mogu učitati.</p> : articles.length === 0 ? <p className="rounded-md border border-border p-4 text-muted-foreground">Trenutačno nema dostupnih članaka.</p> : (
              <div className="grid gap-5 md:grid-cols-3">
                {articles.map((article) => <Card key={article.id} className="overflow-hidden border-border shadow-elegant"><div className="aspect-[16/9] bg-muted">{article.image_url ? <img src={article.image_url} alt="" className="h-full w-full object-cover" width={640} height={360} loading="lazy" /> : <div className="flex h-full items-center justify-center"><BookOpen className="h-10 w-10 text-muted-foreground" /></div>}</div><CardContent className="flex min-h-[220px] flex-col p-5"><h3 className="text-xl font-semibold leading-snug">{article.title}</h3><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{article.excerpt}</p>{article.slug && <Link to={`/blog/${article.slug}`} className="mt-auto inline-flex min-h-11 items-center pt-4 font-semibold text-accent hover:underline">Pročitaj članak <ArrowRight className="ml-2 h-4 w-4" /></Link>}</CardContent></Card>)}
              </div>
            )}
          </div>
        </section>

        <section className="py-12 sm:py-16" aria-labelledby="services-heading">
          <div className="container mx-auto px-4"><h2 id="services-heading" className="mb-8">Još načina za znak sjećanja</h2><div className="grid gap-5 md:grid-cols-2">
            <Card className="border-border shadow-elegant"><CardContent className="flex h-full items-start gap-4 p-6"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"><Flame /></span><div><h3 className="text-2xl font-semibold">Zapalite virtualnu svijeću</h3><p className="mt-2 text-base text-muted-foreground">Ostavite znak sjećanja na osobu koja vam nedostaje.</p><Button asChild variant="link" className="mt-3 min-h-11 p-0 text-accent"><Link to="/virtualne-svijece">Otvori virtualne svijeće <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></CardContent></Card>
            <Card className="border-border shadow-elegant"><CardContent className="flex h-full items-start gap-4 p-6"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"><Leaf /></span><div><h3 className="text-2xl font-semibold">Memorijalni vrt</h3><p className="mt-2 text-base text-muted-foreground">Pronađite riječi sjećanja i ostavite svoju poruku.</p><Button asChild variant="link" className="mt-3 min-h-11 p-0 text-accent"><Link to="/memorijalni-vrt">Posjeti memorijalni vrt <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></CardContent></Card>
          </div></div>
        </section>
      </main>

      <footer className="border-t border-primary-foreground/15 bg-primary text-primary-foreground">
        <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
          <div><p className="font-display text-xl font-semibold">Osmrtnica.com.hr</p><p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">Osmrtnice, informacije o posljednjem ispraćaju i digitalni memorijali na jednom mjestu.</p><a href="mailto:info@osmrtnica.com.hr" className="mt-4 inline-flex min-h-11 items-center text-sm hover:text-accent"><Mail className="mr-2 h-4 w-4" />info@osmrtnica.com.hr</a></div>
          <div><p className="font-semibold">Usluge</p><div className="mt-3 grid gap-3 text-sm text-primary-foreground/75"><Link to="/umrli" className="hover:text-accent">Pretraži osmrtnice</Link><Link to="/objavi-osmrtnicu" className="hover:text-accent">Objavi osmrtnicu</Link><Link to="/digitalni-memorijal" className="font-semibold text-accent">Digitalni memorijal</Link><Link to="/virtualne-svijece" className="hover:text-accent">Virtualne svijeće</Link><Link to="/memorijalni-vrt" className="hover:text-accent">Memorijalni vrt</Link></div></div>
          <div><p className="font-semibold">Informacije</p><div className="mt-3 grid gap-3 text-sm text-primary-foreground/75"><Link to="/blog" className="hover:text-accent">Blog</Link><Link to="/kako-objaviti-osmrtnicu" className="hover:text-accent">Kako objaviti osmrtnicu</Link><Link to="/cesto-postavljena-pitanja" className="hover:text-accent">Često postavljena pitanja</Link><Link to="/uvjeti-koristenja/" className="hover:text-accent">Uvjeti korištenja</Link><Link to="/politika-privatnosti/" className="hover:text-accent">Politika privatnosti</Link><Link to="/kolacici/" className="hover:text-accent">Postavke kolačića</Link></div></div>
          <div><p className="font-semibold">Obavijesti</p><p className="mt-3 text-sm text-primary-foreground/75">Primajte obavijesti o novim funkcionalnostima i korisnim člancima.</p><form onSubmit={handleNewsletter} className="mt-4 space-y-3"><Label htmlFor="homepage-newsletter" className="text-sm">E-mail adresa</Label><Input id="homepage-newsletter" type="email" required value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} className="min-h-11 bg-primary-foreground text-primary" placeholder="ime@primjer.hr" /><Button type="submit" variant="secondary" className="min-h-11 w-full" disabled={newsletterState === 'sending'}>{newsletterState === 'sending' ? 'Prijava...' : 'Prijavi se'}</Button>{newsletterState === 'success' && <p role="status" className="text-sm text-primary-foreground/80">Uspješno ste se prijavili.</p>}{newsletterState === 'error' && <p role="alert" className="text-sm text-primary-foreground/80">Prijava trenutačno nije uspjela.</p>}</form></div>
        </div>
        <div className="border-t border-primary-foreground/15"><div className="container mx-auto px-4 py-5 text-sm text-primary-foreground/65">© {new Date().getFullYear()} Osmrtnica.com.hr</div></div>
      </footer>
    </div>
  );
};

export default HomepageTwo;