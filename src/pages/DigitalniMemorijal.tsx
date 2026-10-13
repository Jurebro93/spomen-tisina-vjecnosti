import { trackFunnel } from '@/lib/funnel';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight, BookOpen, Camera, Check, ChevronLeft, ChevronRight, Feather, Flame, Heart, Images,
  PenLine, QrCode, Share2, ShieldCheck, UserRoundCheck,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MediaMentionsSection from '@/components/MediaMentionsSection';
import { MemorialPublicListing } from '@/components/MemorialPublicListing';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
const marijaPortret = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/marija-kovac-portret.jpg";
const marijaMlada = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/marija-kovac-mlada.jpg";
const marijaKuhinja = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/marija-kovac-kuhinja.jpg";
const marijaVrt = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/marija-kovac-vrt.jpg";
import { MEMORIAL_PRICE_EUR, MEMORIAL_PRICE_LABEL } from '@/lib/memorial';
import { trackEvent } from '@/lib/metaPixel';

const createPath = '/digitalni-memorijal/kreiraj';
const examplePath = '/memorijal-primjer/obiteljske-uspomene';

const audiences = [
  { title: 'Za roditelja', text: 'Fotografije, životna priča i riječi zahvalnosti.', icon: Heart },
  { title: 'Za baku ili djeda', text: 'Obiteljske priče koje želite prenijeti djeci.', icon: BookOpen },
  { title: 'Za partnera, prijatelja ili blisku osobu', text: 'Zajednički trenuci i poruke sjećanja.', icon: UserRoundCheck },
];

const features = [
  { title: 'Životna priča', text: 'Sačuvajte priču o životu, ljudima i trenucima koje želite pamtiti.', icon: BookOpen },
  { title: 'Fotografije', text: 'Dodajte glavnu fotografiju i fotografije iz obiteljskih albuma.', icon: Images },
  { title: 'Pomoć pri pisanju', text: 'Iz unesenih podataka pripremite prijedlog teksta koji možete pregledati i prilagoditi svojim riječima.', icon: Feather },
  { title: 'Poruke i virtualne svijeće', text: 'Obitelj i prijatelji mogu ostaviti poruku sjećanja i zapaliti virtualnu svijeću.', icon: Flame },
  { title: 'Dijeljenje s bližnjima', text: 'Podijelite poveznicu na memorijal putem poruke, e-pošte ili društvenih mreža.', icon: Share2 },
  { title: 'QR kod', text: 'Preuzmite QR kod koji vodi izravno na memorijal.', icon: QrCode },
];

const steps = [
  { title: 'Prijavite se i dodajte podatke', text: 'Prijavite se postojećim računom ili Googleom, unesite ime osobe i odaberite fotografije.', icon: Camera },
  { title: 'Napišite i pregledajte priču', text: 'Dodajte vlastiti tekst ili koristite pomoć pri pisanju. Pregledajte kako će memorijal izgledati.', icon: PenLine },
  { title: 'Dovršite kupnju i podijelite', text: 'Plaćate tek nakon pregleda. Nakon uspješne uplate memorijal se objavljuje i spreman je za dijeljenje.', icon: Share2 },
];

const faq = [
  {
    q: 'Mogu li napraviti memorijal za osobu koja je preminula prije mnogo godina?',
    a: 'Da. Memorijal možete posvetiti osobi koja je preminula nedavno ili prije više desetljeća. Možete ga izraditi za godišnjicu, rođendan ili kada poželite okupiti obiteljske uspomene.',
  },
  {
    q: 'Koja je razlika između osmrtnice i digitalnog memorijala?',
    a: 'Osmrtnica prvenstveno obavještava o smrti i posljednjem ispraćaju. Digitalni memorijal okuplja životnu priču, fotografije i poruke sjećanja. Može se izraditi neovisno o objavi osmrtnice.',
  },
  { q: 'Koliko košta digitalni memorijal?', a: `Digitalni memorijal košta ${MEMORIAL_PRICE_LABEL} jednokratno. Nema mjesečne ni godišnje pretplate, a plaćanje slijedi tek nakon što izradite i pregledate memorijal.` },
  { q: 'Moram li unaprijed imati napisan tekst?', a: 'Ne. Možete napisati vlastiti tekst ili iz unesenih podataka pripremiti prijedlog koji zatim pregledavate i prilagođavate svojim riječima.' },
  { q: 'Koliko fotografija mogu dodati?', a: 'Možete dodati glavnu fotografiju i više fotografija iz obiteljskih albuma. Svaka fotografija može imati do 8 MB i biti u JPG, PNG ili WEBP formatu.' },
  { q: 'Mogu li kasnije uređivati memorijal?', a: 'Da. Vlasnik memorijala može se prijaviti u svoj račun i naknadno uređivati priču, fotografije, vidljivost i druge podatke memorijala.' },
  { q: 'Tko može vidjeti memorijal?', a: 'Pri izradi birate hoće li memorijal biti javan, dostupan samo putem poveznice ili privatan.' },
  { q: 'Kako se memorijal dijeli s obitelji?', a: 'Memorijal možete podijeliti kopiranjem poveznice, putem e-pošte, WhatsAppa, Facebooka ili preuzimanjem QR koda.' },
];

const reviews = [
  {
    name: 'Anica Kiš',
    text: 'Napravila sam memorijal za tatu, ali nisam htjela da drugi ljudi vide fotografije i uspomene pa sam ga stavila na privatno…neke su mi stvari ipak previše osobne. Najteže mi je bilo napisati tekst o njemu, nekoliko puta sam krenula pa odustala. Zasad sam dodala par fotografija i ono što sam htjela sačuvati od zaborava, a ostalo ću pomalo, kad budem imala volje. Dobro je što uvijek mogu izmijenit naknadno podatke i dodat još slika.',
  },
  {
    name: 'Vice Ivanov-Ivić',
    text: 'Prvi put sam vidio ovako nešto i bilo mi je malo čudno raditi ovako nešto za pokojnog nona. Ostavio sam samo nekoliko slika i kratak tekst, nisam htio baš sve dijeliti. Ne otvaram stranicu često, ali nekad mi dođe da pogledam i na kraju mi je drago što sam je napravio.',
  },
  {
    name: 'Stefanija Krknjuš',
    text: 'Napravili smo memorijal za pokojnu baku i poslali rodbini koja živi vani. Bilo im je jako drago vidjeti slike i prisjetit se njezinog života, a onda nam je rodbina poslala još nekoliko njezinih slika koje nismo ni imali pa smo i njih dodali. Trebalo mi je jedino dosta vremena da smislim što napisati jer je teško cijeli život pretvoriti u par odlomaka.',
  },
  {
    name: 'Ljubica Vidović',
    text: 'Napravila san memorijal za tatu jer su nan slike bile razbacane po mobitelima. Sad su bar neke na jednom mistu, uz par riči o njemu. Mater baš ne razumi čemu to služi, ali voli pogledat kad joj otvorin link.',
  },
  {
    name: 'Josip Kraljević',
    text: 'Mislim da ovo ima smisla za klince i unuke, da jednog dana mogu pročitati nekaj o svojima koje nisu stigli upoznati. Nije to za svakoga, ali meni je drago da postoji i ovo... Te se priče lako zaborave ak ih nitko ne zapiše.',
  },
  {
    name: 'Mijo Pilat',
    text: 'Lipo je da uz ime i datume ostane i nešto o čovjeku, kako je živio i po čemu ga pamtimo. Samo, triba sist pa odabrat slike i napisat koju rič, a to nakon gubitka nije baš lako. Ne ide to na brzinu, nekad jednostavno nemaš snage.',
  },
];

const SectionIntro = ({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) => (
  <div className="mx-auto max-w-3xl text-center">
    {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>}
    <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">{title}</h2>
    {text && <p className="mt-5 text-base leading-7 text-muted-foreground md:text-lg">{text}</p>}
  </div>
);

const DigitalniMemorijal = () => {
  const reviewsRef = useRef<HTMLDivElement>(null);
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    void trackFunnel('visit_landing');
    trackEvent('ViewContent', {
      content_name: 'Digitalni memorijal',
      content_type: 'product',
      currency: 'EUR',
      value: MEMORIAL_PRICE_EUR,
    });
  }, []);

  useEffect(() => {
    const hero = heroCtaRef.current;
    const footer = footerRef.current;
    if (!hero || !footer || typeof IntersectionObserver === 'undefined') return;
    const heroObserver = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.1 });
    const footerObserver = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0 });
    heroObserver.observe(hero);
    footerObserver.observe(footer);
    return () => { heroObserver.disconnect(); footerObserver.disconnect(); };
  }, []);

  const showMobileCta = !heroVisible && !footerVisible;

  const scrollReviews = (direction: -1 | 1) => {
    const container = reviewsRef.current;
    if (!container) return;
    const card = container.querySelector<HTMLElement>('[data-review-card]');
    const amount = card ? card.offsetWidth + 24 : container.clientWidth * 0.8;
    container.scrollBy({ left: amount * direction, behavior: 'smooth' });
  };

  const reviewsDrag = useRef<{ startX: number; startLeft: number; moved: boolean } | null>(null);
  const onReviewsPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const container = reviewsRef.current;
    if (!container) return;
    reviewsDrag.current = { startX: e.clientX, startLeft: container.scrollLeft, moved: false };
  };
  const onReviewsPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = reviewsDrag.current;
    const container = reviewsRef.current;
    if (!drag || !container) return;
    const delta = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(delta) < 4) return;
    drag.moved = true;
    container.setPointerCapture(e.pointerId);
    container.scrollLeft = drag.startLeft - delta;
  };
  const endReviewsDrag = () => { reviewsDrag.current = null; };

  return (
    <div className="min-h-screen overflow-x-hidden bg-memorial-warm text-foreground">
      <Helmet>
        <title>Digitalni memorijal – uspomene na voljenu osobu | Osmrtnica</title>
        <meta name="description" content="Sačuvajte fotografije, životnu priču i poruke obitelji. Izradite digitalni memorijal i za osobu preminulu prije mnogo godina. 39 € jednokratno." />
        <link rel="canonical" href="https://osmrtnica.com.hr/digitalni-memorijal" />
        <meta property="og:title" content="Digitalni memorijal – uspomene na voljenu osobu | Osmrtnica" />
        <meta property="og:description" content="Sačuvajte fotografije, životnu priču i poruke obitelji. Izradite digitalni memorijal i za osobu preminulu prije mnogo godina. 39 € jednokratno." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://osmrtnica.com.hr/digitalni-memorijal" />
        <meta property="og:image" content="https://osmrtnica.com.hr/wp-content/uploads/2022/12/Logo-Osmrtnica.com_.hr_-300x300.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
        })}</script>
      </Helmet>

      <Header />



      <main>
        <section className="border-b border-border bg-memorial-warm">
          <div className="container mx-auto grid items-center gap-10 px-4 py-10 md:py-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:py-16">
            <div>
              <p className="inline-flex items-center rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">Mjesto za obiteljske uspomene</p>
              <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl lg:text-6xl">Digitalni memorijal za uspomene koje želite sačuvati</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Fotografije, životna priča i poruke obitelji na jednoj memorijalnoj stranici koju možete podijeliti s bližnjima.</p>
              <div className="mt-6 border-l-2 border-accent pl-4 text-base font-medium leading-7 text-foreground">Memorijal možete izraditi za osobu koja je preminula nedavno ili prije mnogo godina.</div>
              <p className="mt-7 font-display text-3xl font-semibold text-foreground">{MEMORIAL_PRICE_LABEL} <span className="font-body text-base font-normal text-muted-foreground">jednokratno · Bez pretplate</span></p>
              <div ref={heroCtaRef} className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="gold" size="lg" className="min-h-12 px-6 text-base"><Link to={createPath}>Započni izradu memorijala<ArrowRight aria-hidden="true" /></Link></Button>
                <Button asChild variant="outline" size="lg" className="min-h-12 bg-background px-6 text-base"><Link to={examplePath}>Pogledaj memorijal</Link></Button>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />Plaćate nakon što izradite i pregledate memorijal.</p>
            </div>

            <div className="mx-auto w-full max-w-lg" aria-label="Prikaz digitalnog memorijala">
              <div className="rounded-2xl border border-border bg-card p-3 shadow-memorial">
                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  <div className="grid grid-cols-[112px_1fr] gap-5 border-b border-border p-5 sm:grid-cols-[150px_1fr] sm:p-7">
                    <img src={marijaPortret} alt="Portret Marije Kovač iz oglednog memorijala" width="1024" height="1024" className="aspect-square w-full rounded-lg border border-border object-cover" />
                    <div className="self-center">
                      <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Ogledni memorijal</span>
                      <p className="mt-3 font-display text-2xl font-semibold sm:text-3xl">Marija Kovač</p>
                      <p className="mt-1 text-sm text-muted-foreground">1932. – 2004.</p>
                      <p className="mt-4 hidden font-display text-base italic text-accent sm:block">„Priče koje i danas okupljaju obitelj."</p>
                    </div>
                  </div>
                  <div className="p-5 sm:p-7">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-secondary px-3 py-1.5">Priča</span><span className="rounded-full bg-secondary px-3 py-1.5">Fotografije</span><span className="rounded-full bg-secondary px-3 py-1.5">Sjećanja</span></div>
                    <h2 className="mt-6 font-display text-xl font-semibold">Priče koje ostaju</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Marija je voljela nedjeljna okupljanja, miris svježe pečenog kruha i duge razgovore za kuhinjskim stolom.</p>
                    <div className="mt-5 grid grid-cols-3 gap-2"><img src={marijaMlada} alt="Marija Kovač u mladosti" loading="lazy" className="aspect-square w-full rounded-md border border-border object-cover grayscale" /><img src={marijaKuhinja} alt="Marija Kovač u kuhinji" loading="lazy" className="aspect-square w-full rounded-md border border-border object-cover grayscale" /><img src={marijaVrt} alt="Marija Kovač s unukom u vrtu" loading="lazy" className="aspect-square w-full rounded-md border border-border object-cover grayscale" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MediaMentionsSection />
        <section className="bg-background py-16 md:py-20">

          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl border-l-2 border-accent pl-6 md:pl-10">
              <h2 className="font-display text-3xl font-semibold md:text-4xl">Što je digitalni memorijal?</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">Digitalni memorijal je internetska stranica posvećena preminuloj osobi. Na jednom mjestu okuplja životnu priču, fotografije i poruke sjećanja. Obitelj ga može izraditi neposredno nakon smrti ili mnogo godina kasnije te podijeliti s rodbinom i prijateljima.</p>
            </div>
          </div>
        </section>

        <section id="primjer" className="scroll-mt-24 border-y border-border bg-secondary py-16 md:py-20">
          <div className="container mx-auto px-4">
            <SectionIntro title="Pogledajte kako izgleda digitalni memorijal" text="Mjesto za fotografije, životnu priču i male uspomene koje obitelji puno znače." />
            <div className="mx-auto mt-10 grid max-w-5xl items-center gap-8 rounded-lg border border-border bg-card p-5 shadow-elegant md:grid-cols-[.8fr_1.2fr] md:p-8">
              <div className="overflow-hidden rounded-lg border border-border bg-secondary"><img src={marijaPortret} alt="Portret Marije Kovač iz oglednog memorijala" width="1024" height="1024" loading="lazy" className="aspect-square h-full w-full object-cover" /></div>
              <div>
                <span className="inline-flex rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">Ogledni memorijal — izmišljeni podaci</span>
                <h3 className="mt-5 font-display text-3xl font-semibold">Marija Kovač</h3>
                <p className="mt-2 text-muted-foreground">1932. – 2004. · Baka čije priče i danas okupljaju obitelj</p>
                <p className="mt-6 text-base leading-7 text-muted-foreground">Primjer pokazuje naslovnu fotografiju, životnu priču, kronologiju, uspomene i virtualne svijeće u istom prikazu koji koriste objavljeni memorijali.</p>
                <Button asChild variant="gold" size="lg" className="mt-7 min-h-12"><Link to={examplePath}>Pogledaj memorijal<ArrowRight aria-hidden="true" /></Link></Button>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-background"><MemorialPublicListing /></div>

        <section className="bg-memorial-warm py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionIntro title="Uspomene možete sačuvati i mnogo godina kasnije" />
            <div className="mx-auto mt-8 max-w-3xl space-y-4 text-base leading-7 text-muted-foreground md:text-lg">
              <p>Možda imate stare fotografije roditelja, bakinu omiljenu izreku ili priču o djedu koju želite prenijeti svojoj djeci.</p>
              <p>Digitalni memorijal možete napraviti bez obzira na to koliko je vremena prošlo od smrti. Povod može biti godišnjica, rođendan ili želja da obiteljske uspomene okupite na jednom mjestu.</p>
              <p>Za početak odaberite fotografiju i napišite nekoliko rečenica o osobi koje se želite sjećati.</p>
            </div>
            <ul className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
              {audiences.map(({ title, text, icon: Icon }) => <li key={title} className="rounded-lg border border-border bg-card p-6 shadow-sm"><Icon className="h-6 w-6 text-accent" aria-hidden="true" /><h3 className="mt-5 font-display text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-muted-foreground">{text}</p></li>)}
            </ul>
            <div className="mt-10 text-center"><Button asChild variant="gold" size="lg" className="min-h-12"><Link to={createPath}>Započni izradu memorijala<ArrowRight aria-hidden="true" /></Link></Button></div>
          </div>
        </section>

        <section id="kako-funkcionira" className="scroll-mt-24 bg-secondary py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionIntro title="Kako izraditi digitalni memorijal?" text="Jednostavan postupak vodi vas od prve fotografije do objavljene stranice." />
            <ol className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-3">
              {steps.map(({ title, text, icon: Icon }, index) => <li key={title} className="relative rounded-lg border border-border bg-card p-7"><span className="font-display text-5xl text-accent/25" aria-hidden="true">0{index + 1}</span><Icon className="mt-5 h-6 w-6 text-accent" aria-hidden="true" /><h3 className="mt-5 font-display text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-muted-foreground">{text}</p></li>)}
            </ol>
          </div>
        </section>

        <section id="cijena" className="scroll-mt-24 bg-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-border bg-primary text-primary-foreground shadow-memorial">
              <div className="relative">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
                <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/5 blur-3xl" aria-hidden="true" />
                <div className="relative grid gap-12 p-8 md:grid-cols-2 md:p-14 lg:p-16">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-accent">Jedna jasna ponuda</p>
                    <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl lg:text-5xl">Jedan memorijal.<br className="hidden sm:block" /> Jednokratno plaćanje.</h2>
                    <p className="mt-5 max-w-md text-lg leading-8 text-primary-foreground/75">Bez mjesečne ili godišnje pretplate. Plaćate tek nakon što izradite i pregledate memorijal.</p>
                    <p className="mt-8 font-display text-6xl font-semibold text-accent md:text-7xl">{MEMORIAL_PRICE_LABEL}</p>
                    <p className="mt-3 text-sm text-primary-foreground/60">Jednokratno · Bez skrivenih troškova</p>
                  </div>
                  <div className="flex flex-col justify-center">
                    <ul className="space-y-5 text-base">
                      {[
                        'Životna priča i fotografije',
                        'Pomoć pri pisanju teksta',
                        'Poruke i virtualne svijeće',
                        'Dijeljenje poveznice i QR koda',
                        'Naknadno uređivanje memorijala'
                      ].map((item) => (
                        <li key={item} className="flex gap-4">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
                            <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                          </span>
                          <span className="text-primary-foreground/90">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant="gold" size="lg" className="mt-10 min-h-14 w-full text-base">
                      <Link to={createPath}>Započni izradu memorijala<ArrowRight aria-hidden="true" /></Link>
                    </Button>
                    <p className="mt-3 text-center text-xs text-primary-foreground/65">Prijava je potrebna. Plaćate nakon pregleda.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="sadrzaj" className="scroll-mt-24 border-y border-border bg-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionIntro title="Što uključuje vaš digitalni memorijal?" text="Sve najvažnije uspomene na jednom preglednom mjestu, uz kontrolu vlasnika memorijala." />
            <ul className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map(({ title, text, icon: Icon }) => <li key={title} className="rounded-lg border border-border bg-card p-6"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10"><Icon className="h-5 w-5 text-accent" aria-hidden="true" /></div><h3 className="mt-5 font-display text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-muted-foreground">{text}</p></li>)}
            </ul>
          </div>
        </section>

        <section id="pitanja" className="scroll-mt-24 bg-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionIntro title="Često postavljena pitanja" />
            <Accordion type="single" collapsible className="mx-auto mt-10 max-w-3xl">
              {faq.map((item, index) => <AccordionItem key={item.q} value={`faq-${index}`}><AccordionTrigger className="min-h-14 text-left font-display text-base font-semibold sm:text-lg">{item.q}</AccordionTrigger><AccordionContent className="pb-5 text-base leading-7 text-muted-foreground">{item.a}</AccordionContent></AccordionItem>)}
            </Accordion>
          </div>
        </section>

        <section id="recenzije" className="scroll-mt-24 bg-secondary py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionIntro title="Iskustva obitelji" text="Što kažu ljudi koji su izradili digitalni memorijal za svoje najmilije." />

            <div className="mt-10 flex justify-end gap-2">
              <button type="button" onClick={() => scrollReviews(-1)} aria-label="Prethodne recenzije" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-accent hover:text-accent">
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => scrollReviews(1)} aria-label="Sljedeće recenzije" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-accent hover:text-accent">
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div ref={reviewsRef} onPointerDown={onReviewsPointerDown} onPointerMove={onReviewsPointerMove} onPointerUp={endReviewsDrag} onPointerCancel={endReviewsDrag} className="-mx-4 mt-6 flex cursor-grab snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden">
              {reviews.map(({ name, text }) => (
                <blockquote key={name} data-review-card className="flex w-[85vw] shrink-0 snap-start flex-col rounded-lg border border-border bg-card p-7 shadow-sm sm:w-[420px]">
                  <span className="font-display text-5xl leading-none text-accent/30" aria-hidden="true">„</span>
                  <p className="mt-4 flex-1 text-base leading-7 text-foreground">{text}</p>
                  <footer className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="h-px w-8 bg-accent/50" aria-hidden="true" />
                    {name}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

      </main>

      <div ref={footerRef}><Footer /></div>

      <div className={`fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] transition-transform duration-200 md:hidden ${showMobileCta ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`} aria-hidden={!showMobileCta}>
        <Button asChild variant="gold" size="lg" className="min-h-12 w-full shadow-memorial"><Link to={createPath} tabIndex={showMobileCta ? 0 : -1}>Započni izradu · {MEMORIAL_PRICE_LABEL}</Link></Button>
      </div>
    </div>
  );
};

export default DigitalniMemorijal;
