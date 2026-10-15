import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Camera, Check, Flame, Heart, Images, MapPin, PenLine, QrCode, Search, Share2, UserRoundCheck } from 'lucide-react';
import HomepageThreeHeader from '@/components/HomepageThreeHeader';
import { MemorialArticlesSection, MemorialFinalCtaSection, MemorialHeroSection, trackHomepageAction } from '@/components/HomepageMemorialSections';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { MEMORIAL_PRICE_LABEL } from '@/lib/memorial';
import { formatLifespan } from '@/lib/utils';
const defaultObituaryPhoto = "/site/default-obituary-photo.jpg";
const marijaPhoto = "/site/marija-kovac-memorial.jpg";

type Obituary = { id: string; ime: string; prezime: string; datum_rodenja: string | null; datum_smrti: string | null; datum_ukopa: string | null; vrijeme_ukopa: string | null; mjesto_smrti: string | null; groblje: string | null; fotografija_url: string | null; slug: string | null };
type City = { name: string; count: number };

const CREATE_PATH = '/digitalni-memorijal/kreiraj';
const EXAMPLE_PATH = '/memorijal-primjer/obiteljske-uspomene';
const HOME_URL = 'https://osmrtnica.com.hr/homepage-3/';
const HOME_TITLE = 'Digitalni memorijali i osmrtnice | Osmrtnica.com.hr';
const HOME_DESCRIPTION = 'Sačuvajte fotografije, životnu priču i poruke sjećanja u digitalnom memorijalu. Za nedavne i davne gubitke. Pretražite i osmrtnice po imenu ili gradu.';
const SEARCH_CITIES = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Slavonski Brod', 'Pula', 'Sesvete', 'Karlovac', 'Varaždin', 'Šibenik', 'Sisak', 'Dubrovnik'];
const FEATURED_CITIES = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar'];

const HomepageThree = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [city, setCity] = useState('all');
  const [obituaries, setObituaries] = useState<Obituary[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingObituaries, setLoadingObituaries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);
  const [obituaryError, setObituaryError] = useState(false);
  const [cityError, setCityError] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [obituaryResult, cityResult] = await Promise.all([
        supabase.from('obituaries').select('id, ime, prezime, datum_rodenja, datum_smrti, datum_ukopa, vrijeme_ukopa, mjesto_smrti, groblje, fotografija_url, slug').eq('active', true).order('datum_ukopa', { ascending: false, nullsFirst: false }).limit(6),
        supabase.rpc('obituary_city_counts'),
      ]);
      if (obituaryResult.error) setObituaryError(true); else setObituaries((obituaryResult.data ?? []) as Obituary[]);
      if (cityResult.error) setCityError(true); else setCities((cityResult.data ?? []) as City[]);
      setLoadingObituaries(false); setLoadingCities(false);
    };
    load();
  }, []);

  const orderedCities = useMemo(() => {
    const featured = FEATURED_CITIES.map((featuredCity) => cities.find((item) => item.name.toLocaleLowerCase('hr') === featuredCity.toLocaleLowerCase('hr'))).filter((item): item is City => Boolean(item));
    const names = new Set(featured.map((item) => item.name));
    return [...featured, ...cities.filter((item) => !names.has(item.name)).sort((a, b) => a.name.localeCompare(b.name, 'hr'))];
  }, [cities]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    trackHomepageAction('obituary_search');
    const trimmedName = name.trim();
    if (!trimmedName && city !== 'all') { navigate(`/umrli/${city}`); return; }
    const params = new URLSearchParams();
    if (trimmedName) params.set('q', trimmedName);
    if (city !== 'all') params.set('city', city);
    navigate(params.size ? `/pretraga?${params.toString()}` : '/umrli');
  };

  const primaryLink = (label: string, position: string) => <Button asChild variant="gold" size="lg" className="min-h-12 px-6 text-base"><Link to={CREATE_PATH} onClick={() => trackHomepageAction(position)}>{label}<ArrowRight aria-hidden="true" /></Link></Button>;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Helmet>
        <title>{HOME_TITLE}</title><meta name="robots" content="noindex,follow" /><meta name="description" content={HOME_DESCRIPTION} /><link rel="canonical" href={HOME_URL} />
        <meta property="og:title" content={HOME_TITLE} /><meta property="og:description" content={HOME_DESCRIPTION} /><meta property="og:type" content="website" /><meta property="og:url" content={HOME_URL} /><meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: HOME_TITLE, description: HOME_DESCRIPTION, url: HOME_URL, isPartOf: { '@type': 'WebSite', name: 'Osmrtnica.com.hr', url: 'https://osmrtnica.com.hr/' } })}</script>
      </Helmet>

      <HomepageThreeHeader onTrack={trackHomepageAction} />
      <main>
        <MemorialHeroSection variant="hero" />

        <section id="pretraga-osmrtnica" className="scroll-mt-24 border-b border-border bg-secondary py-10 sm:py-12">
          <div className="container mx-auto px-4"><div className="grid gap-7 lg:grid-cols-[.7fr_1.3fr] lg:items-end"><div><h2 className="text-3xl font-semibold">Tražite osmrtnicu?</h2><p className="mt-3 text-base leading-7 text-muted-foreground">Pronađite osmrtnice i informacije o posljednjem ispraćaju po imenu ili gradu.</p></div>
            <form onSubmit={handleSearch} role="search" className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-2"><Label htmlFor="homepage-three-name" className="text-base">Ime i prezime</Label><div className="relative"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="homepage-three-name" value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 pl-10 text-base" placeholder="Unesite ime i prezime" /></div></div>
              <div className="space-y-2"><Label htmlFor="homepage-three-city" className="text-base">Grad</Label><Select value={city} onValueChange={setCity}><SelectTrigger id="homepage-three-city" className="min-h-12 text-base"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Svi gradovi</SelectItem>{SEARCH_CITIES.map((item) => <SelectItem key={item} value={item.toLowerCase()}>{item}</SelectItem>)}</SelectContent></Select></div>
              <Button type="submit" variant="gold" size="lg" className="min-h-12 text-base"><Search aria-hidden="true" />Pretraži osmrtnice</Button>
            </form></div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold"><Link to="/umrli" className="min-h-11 py-3 underline underline-offset-4">Sve osmrtnice</Link><Link to="/objavi-osmrtnicu" className="min-h-11 py-3 underline underline-offset-4">Objavi osmrtnicu</Link></div>
          </div>
        </section>

        <section className="bg-background py-16 sm:py-20"><div className="container mx-auto px-4"><div className="mx-auto max-w-3xl text-center"><h2>Uspomene možete sačuvati i mnogo godina kasnije</h2><div className="mt-5 space-y-4 text-base leading-7 text-muted-foreground sm:text-lg"><p>Možda imate stare fotografije roditelja, bakinu omiljenu izreku ili priču o djedu koju želite prenijeti svojoj djeci.</p><p>Digitalni memorijal možete napraviti bez obzira na to koliko je vremena prošlo od smrti. Povod može biti godišnjica, rođendan ili jednostavno želja da obiteljske uspomene okupite na jednom mjestu.</p></div></div>
          <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">{[
            ['Za roditelja', 'Fotografije, životna priča i riječi zahvalnosti.', Heart], ['Za baku ili djeda', 'Obiteljske priče koje želite prenijeti djeci.', BookOpen], ['Za partnera, prijatelja ili blisku osobu', 'Zajednički trenuci i poruke sjećanja.', UserRoundCheck]
          ].map(([title, text, Icon]) => <Card key={title as string} className="border-border"><CardContent className="p-6"><Icon className="h-6 w-6 text-accent" aria-hidden="true" /><h3 className="mt-5 text-xl font-semibold">{title as string}</h3><p className="mt-3 text-base leading-7 text-muted-foreground">{text as string}</p></CardContent></Card>)}</div>
          <div className="mt-9 text-center"><Button asChild variant="outline" size="lg" className="min-h-12"><Link to="/digitalni-memorijal" onClick={() => trackHomepageAction('memorial_details_past')}>Pogledaj mogućnosti memorijala<ArrowRight aria-hidden="true" /></Link></Button></div>
        </div></section>

        <section className="border-y border-border bg-secondary py-16 sm:py-20"><div className="container mx-auto grid items-center gap-10 px-4 lg:grid-cols-[1.05fr_.95fr]"><div><p className="text-sm font-semibold uppercase tracking-widest text-accent">Što dobivate</p><h2 className="mt-4">Jedno mjesto za fotografije, priče i sjećanja</h2><ul className="mt-8 grid gap-4 sm:grid-cols-2">{[
          ['Fotografije i životna priča', Images], ['Poruke sjećanja i virtualne svijeće', Flame], ['Poveznica za dijeljenje s bližnjima', Share2], ['QR kod za izravni pristup', QrCode]
        ].map(([item, Icon]) => <li key={item as string} className="flex gap-3 rounded-md border border-border bg-card p-4 text-base font-medium"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10"><Icon className="h-5 w-5 text-accent" aria-hidden="true" /></span>{item as string}</li>)}</ul><Button asChild variant="gold" size="lg" className="mt-8 min-h-12"><Link to={EXAMPLE_PATH} onClick={() => trackHomepageAction('open_example_features')}>Pogledaj memorijal<ArrowRight aria-hidden="true" /></Link></Button></div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-elegant"><div className="flex items-center gap-5"><img src={marijaPhoto} alt="Detalj oglednog memorijala Marije Kovač" className="h-28 w-24 rounded-md object-cover" width={912} height={1104} loading="lazy" /><div><p className="text-xs font-semibold uppercase text-accent">Ogledni memorijal</p><p className="mt-2 font-display text-2xl font-semibold">Marija Kovač</p><p className="mt-1 text-sm text-muted-foreground">1932. – 2004.</p></div></div><div className="mt-6 border-l-2 border-accent pl-4"><p className="font-display text-lg">Bakine priče</p><p className="mt-2 text-base leading-7 text-muted-foreground">Priče koje si nam pričala sada prenosimo svojoj djeci.</p></div><div className="mt-6 grid grid-cols-3 gap-2"><div className="aspect-square rounded-md bg-muted" /><div className="aspect-square rounded-md bg-muted" /><div className="aspect-square rounded-md bg-muted" /></div></div>
        </div></section>

        <section id="kako-funkcionira" className="scroll-mt-24 bg-background py-16 sm:py-20"><div className="container mx-auto px-4"><div className="mx-auto max-w-3xl text-center"><h2>Od fotografije do mjesta sjećanja</h2><p className="mt-4 text-base text-muted-foreground">Prijavite se, pripremite memorijal i platite tek nakon pregleda.</p></div><ol className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">{[
          ['Dodajte podatke i fotografije', 'Prijavite se računom ili Googleom, odaberite fotografije i unesite osnovne podatke o osobi kojoj posvećujete memorijal.', Camera], ['Napišite i pregledajte priču', 'Dodajte vlastite riječi ili koristite dostupnu pomoć pri pisanju te pregledajte memorijal prije plaćanja.', PenLine], ['Objavite i podijelite', 'Dovršite jednokratnu kupnju. Nakon potvrđene uplate memorijal se objavljuje i spreman je za dijeljenje.', Share2]
        ].map(([title, text, Icon], index) => <li key={title as string} className="rounded-lg border border-border bg-card p-7"><span className="font-display text-4xl text-accent/40">0{index + 1}</span><Icon className="mt-5 h-6 w-6 text-accent" aria-hidden="true" /><h3 className="mt-4 text-xl font-semibold">{title as string}</h3><p className="mt-3 text-base leading-7 text-muted-foreground">{text as string}</p></li>)}</ol><div className="mt-9 text-center"><p className="mb-5 text-lg font-semibold">{MEMORIAL_PRICE_LABEL} jednokratno · Bez pretplate</p>{primaryLink('Izradi memorijal', 'create_steps')}</div></div></section>

        <section className="border-y border-border bg-secondary py-16" aria-labelledby="latest-three-heading"><div className="container mx-auto px-4"><div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="latest-three-heading">Najnovije osmrtnice</h2><p className="mt-2 text-base text-muted-foreground">Informacije o preminulima i posljednjem ispraćaju.</p></div><Link to="/umrli" className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">Pogledaj sve osmrtnice<ArrowRight aria-hidden="true" /></Link></div>
          {loadingObituaries ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className={`${index > 3 ? 'hidden md:block' : ''} h-52 rounded-lg`} />)}</div> : obituaryError ? <p role="alert" className="rounded-md border border-destructive/30 p-6">Osmrtnice se trenutačno ne mogu učitati.</p> : obituaries.length === 0 ? <p className="rounded-md border border-border p-6 text-muted-foreground">Trenutačno nema objavljenih osmrtnica.</p> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{obituaries.map((obituary, index) => <Card key={obituary.id} className={`${index > 3 ? 'hidden md:block' : ''} overflow-hidden border-border`}><CardContent className="flex h-full gap-4 p-4"><img src={obituary.fotografija_url || defaultObituaryPhoto} onError={(event) => { event.currentTarget.src = defaultObituaryPhoto; }} alt={`${obituary.ime} ${obituary.prezime}`} className="h-32 w-24 shrink-0 rounded object-cover" width={96} height={128} loading="lazy" /><div className="flex min-w-0 flex-1 flex-col"><h3 className="text-xl font-semibold">{obituary.ime} {obituary.prezime}</h3><p className="mt-1 text-sm text-muted-foreground">{formatLifespan(obituary.datum_rodenja, obituary.datum_smrti) || 'Podaci o godinama nisu navedeni'}</p>{(obituary.groblje || obituary.mjesto_smrti) && <p className="mt-3 flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{obituary.groblje || obituary.mjesto_smrti}</p>}{obituary.datum_ukopa && <p className="mt-2 flex gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />{new Date(obituary.datum_ukopa).toLocaleDateString('hr-HR')}{obituary.vrijeme_ukopa ? ` · ${obituary.vrijeme_ukopa}` : ''}</p>}{obituary.slug && <Link to={`/${obituary.slug}`} className="mt-auto inline-flex min-h-11 items-center pt-3 text-sm font-semibold text-accent hover:underline">Otvori osmrtnicu<ArrowRight aria-hidden="true" /></Link>}</div></CardContent></Card>)}</div>}
        </div></section>

        <section className="bg-background py-14" aria-labelledby="cities-three-heading"><div className="container mx-auto px-4"><h2 id="cities-three-heading">Osmrtnice po gradovima</h2><p className="mt-2 text-base text-muted-foreground">Odaberite mjesto i pregledajte dostupne osmrtnice.</p>{loadingCities ? <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-md" />)}</div> : cityError ? <p role="alert" className="mt-7 rounded-md border border-destructive/30 p-4">Popis gradova trenutačno nije dostupan.</p> : <><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{orderedCities.slice(0, showAllCities ? undefined : 5).map((item) => <Link key={item.name} to={`/umrli/${item.name.toLowerCase()}`} className="flex min-h-14 items-center justify-between rounded-md border border-border bg-card px-4 font-medium hover:border-accent hover:text-accent"><span className="break-words">{item.name}</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>)}</div>{orderedCities.length > 5 && <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={() => setShowAllCities((value) => !value)}>{showAllCities ? 'Prikaži manje' : 'Prikaži sve gradove'}</Button>}</>}</div></section>

        <MemorialArticlesSection />

        <MemorialFinalCtaSection />
      </main>

      <footer className="border-t border-border bg-background"><div className="container mx-auto grid gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4"><div><p className="font-display text-xl font-semibold">Osmrtnica.com.hr</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Digitalni memorijali, osmrtnice i informacije o posljednjem ispraćaju.</p></div><div><p className="font-semibold">Digitalni memorijali</p><div className="mt-3 grid gap-3 text-sm"><Link to="/digitalni-memorijal">Saznaj više</Link><Link to={CREATE_PATH}>Izradi memorijal</Link><Link to={EXAMPLE_PATH}>Ogledni memorijal</Link><Link to="/memorijali">Poznati memorijali</Link></div></div><div><p className="font-semibold">Korisne poveznice</p><div className="mt-3 grid gap-3 text-sm"><Link to="/umrli">Pretraži osmrtnice</Link><Link to="/sprovodi/zagreb">Sprovodi</Link><Link to="/groblja/zagreb">Groblja</Link><Link to="/virtualne-svijece">Virtualne svijeće</Link><Link to="/memorijalni-vrt">Memorijalni vrt</Link></div></div><div><p className="font-semibold">Informacije</p><div className="mt-3 grid gap-3 text-sm"><Link to="/blog">Blog</Link><Link to="/cesto-postavljena-pitanja">Česta pitanja</Link><Link to="/uvjeti-koristenja/">Uvjeti korištenja</Link><Link to="/politika-privatnosti/">Politika privatnosti</Link><a href="mailto:info@osmrtnica.com.hr">info@osmrtnica.com.hr</a></div></div></div><div className="border-t border-border"><div className="container mx-auto px-4 py-5 text-sm text-muted-foreground">© {new Date().getFullYear()} Osmrtnica.com.hr</div></div></footer>
    </div>
  );
};

export default HomepageThree;