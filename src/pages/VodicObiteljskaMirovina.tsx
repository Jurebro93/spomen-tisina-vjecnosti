// Landing page for the free guide "Obiteljska mirovina korak po korak". Same layout as /besplatni-vodic.
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Calculator, Check, FileText, ListChecks, Scale } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EbookForm } from '@/components/EbookSignup';
import { EBOOKS } from '@/lib/ebook';

const GUIDE = EBOOKS['obiteljska-mirovina'];
const URL = `https://osmrtnica.com.hr${GUIDE.landing}`;
const TITLE = 'Besplatni vodič: Obiteljska mirovina korak po korak | Osmrtnica.com.hr';
const DESCRIPTION = 'Tko ima pravo na obiteljsku mirovinu, koliko iznosi, kada se isplati model od 27 % i kako predati zahtjev HZMO-u na vrijeme. Besplatni PDF od 14 stranica.';

const FACTS = [
  { icon: FileText, label: `${GUIDE.pagesLabel}, PDF` },
  { icon: Scale, label: 'Prema Zakonu o mirovinskom osiguranju (NN 96/25)' },
  { icon: Calculator, label: 'Tri izračunata primjera' },
  { icon: ListChecks, label: 'Kontrolni popis dokumenata za ispis' },
];

const CHAPTERS = [
  { n: 1, title: 'Što je obiteljska mirovina', text: 'Zašto ne ide kroz ostavinu i zašto je rok od 6 mjeseci od smrti važan za iznos koji ćete dobiti unatrag.' },
  { n: 2, title: 'Je li pokojnik ostavio pravo', text: 'Koliko je staža morao imati pokojnik i što vrijedi kad je smrt posljedica ozljede na radu.' },
  { n: 3, title: 'Tko ima pravo i pod kojim uvjetima', text: 'Udovice i udovci, izvanbračni i razvedeni partneri, djeca na školovanju, roditelji i unučad.' },
  { n: 4, title: 'Koliko iznosi', text: 'Faktori 0,77, 0,88, 1,0 i 1,1, kako se mirovina dijeli među članovima obitelji i što ako pokojnik još nije bio u mirovini.' },
  { n: 5, title: 'Vlastita mirovina ili obiteljska? Model od 27 %', text: 'Uvjeti, granica od 1.251,20 € i tri primjera s izračunom koja mogućnost donosi više.' },
  { n: 6, title: 'Kako i gdje predati zahtjev', text: 'Online preko e-Građana, osobno ili poštom, koji obrazac i koje dokumente pripremiti.' },
  { n: 7, title: 'Rad uz obiteljsku mirovinu', text: 'Koliko smijete zaraditi, što se mijenja nakon 65. godine i koje promjene morate prijaviti u 15 dana.' },
  { n: 8, title: 'Česta pitanja i kontrolni popis', text: 'Odgovori na najčešća pitanja obitelji i popis dokumenata koji možete ispisati i odnijeti u HZMO.' },
];

const PREVIEWS = [
  { src: '/vodic/obiteljska-mirovina/iznos.jpg', alt: 'Stranica vodiča: koliko iznosi obiteljska mirovina' },
  { src: '/vodic/obiteljska-mirovina/model-27.jpg', alt: 'Stranica vodiča: vlastita mirovina i dio obiteljske od 27 posto' },
  { src: '/vodic/obiteljska-mirovina/zahtjev.jpg', alt: 'Stranica vodiča: kako i gdje predati zahtjev' },
  { src: '/vodic/obiteljska-mirovina/kontrolni-popis.jpg', alt: 'Stranica vodiča: kontrolni popis dokumenata' },
];

const SOURCES = [
  ['Uvjeti, iznosi i rokovi', 'Zakon o mirovinskom osiguranju, NN 96/25'],
  ['Aktualna vrijednost mirovine', 'HZMO, od 1. srpnja 2026.'],
  ['Dio obiteljske mirovine (27 %)', 'ZOMO čl. 75. i 76.; HZMO'],
  ['Dokumenti za zahtjev', 'HZMO, tiskanica 1.4'],
  ['Online zahtjev', 'e-Građani, e-Usluge HZMO-a'],
  ['Rad uz mirovinu', 'ZOMO čl. 100.; HZMO'],
];

const FAQ = [
  { q: 'Je li vodič stvarno besplatan?', a: 'Da. Ne plaćate ništa i ne preuzimate nikakvu obvezu. Tražimo samo e-mail adresu na koju vam šaljemo poveznicu za preuzimanje.' },
  { q: 'Za koga je vodič?', a: 'Za udovice i udovce, roditelje djece koja su izgubila roditelja i svakoga tko obitelji pomaže oko zahtjeva HZMO-u.' },
  { q: 'Što radite s mojim e-mailom?', a: 'Pošaljemo vam vodič i povremeno praktične savjete o koracima nakon smrti bliske osobe. Adresu ne dijelimo s trećima, a odjaviti se možete u svakom trenutku.' },
  { q: 'Je li ovo pravni savjet?', a: 'Nije. Vodič je informativan. Podatke smo provjerili u listopadu 2026., a iznosi vezani uz aktualnu vrijednost mirovine mijenjaju se 1. siječnja i 1. srpnja, pa ih za svoj slučaj potvrdite u HZMO-u.' },
];

export default function VodicObiteljskaMirovina() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={URL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={URL} />
        <meta property="og:title" content={`Besplatni vodič: ${GUIDE.title}`} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content="https://osmrtnica.com.hr/vodic/obiteljska-mirovina/og.jpg" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Book',
          name: GUIDE.title,
          inLanguage: 'hr',
          numberOfPages: GUIDE.pages,
          bookFormat: 'https://schema.org/EBook',
          isAccessibleForFree: true,
          publisher: { '@type': 'Organization', name: 'Osmrtnica.com.hr', url: 'https://osmrtnica.com.hr/' },
          url: URL,
        })}</script>
      </Helmet>
      <Header />
      <main>
        <section className="border-b border-border bg-memorial-parchment/60 dark:bg-muted/30">
          <div className="container mx-auto grid gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_minmax(240px,340px)] md:items-center md:py-16">
            {/* On phones the form comes right after the headline; the longer copy follows it. */}
            <div className="flex max-w-2xl flex-col">
              <p className="text-sm font-semibold uppercase tracking-wide text-memorial-gold">Besplatni vodič za udovice, udovce i djecu</p>
              <h1 className="order-1 mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl lg:text-5xl">
                Obiteljska mirovina korak po korak
              </h1>
              <p className="order-3 mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Obiteljska mirovina ne dolazi sama od sebe. HZMO je priznaje tek na zahtjev, a tko ga preda kasnije od šest mjeseci nakon smrti,
                može izgubiti dio novca. U vodiču smo jednostavnim jezikom objasnili tko ima pravo, koliko iznosi i kako zahtjev predati na vrijeme.
              </p>
              <p className="order-3 mt-4 text-base leading-relaxed text-foreground sm:text-lg">
                Posebno poglavlje je za umirovljenike od 65 godina: kada se više isplati zadržati vlastitu mirovinu i uz nju primati 27 % obiteljske.
                Podatke smo provjerili u Zakonu o mirovinskom osiguranju i na stranicama HZMO-a. Vodič je <strong>potpuno besplatan</strong>, tražimo samo vaš e-mail.
              </p>
              <ul className="order-3 mt-6 grid gap-2 sm:grid-cols-2">
                {FACTS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-sm text-foreground/80">
                    <Icon className="h-4 w-4 shrink-0 text-memorial-gold" aria-hidden="true" /> {label}
                  </li>
                ))}
              </ul>
              <p className="order-1 mt-3 text-base text-muted-foreground md:hidden">Besplatni PDF od {GUIDE.pagesLabel}, provjeren prema zakonu i HZMO-u.</p>
              <div className="order-2 mt-5 max-w-md rounded-xl md:order-3 md:mt-8 border border-memorial-gold/40 bg-background p-5 shadow-sm">
                <p className="mb-3 font-semibold text-primary">Upišite e-mail i odmah preuzmite vodič</p>
                <EbookForm guide={GUIDE.id} placement="landing_top" buttonLabel="Preuzmite besplatni vodič" />
              </div>
            </div>
            <img
              src={GUIDE.cover}
              alt={`Naslovnica vodiča ${GUIDE.title}`}
              width={800}
              height={1132}
              className="hidden w-full rounded-sm shadow-2xl md:block"
            />
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl font-bold text-primary sm:text-3xl">Što je u vodiču</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">Uz svaku tvrdnju naveden je članak zakona, pa u HZMO-u točno znate na što se pozvati.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CHAPTERS.map((c) => (
              <li key={c.n} className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm font-semibold text-memorial-gold">Poglavlje {c.n}</p>
                <h3 className="mt-1 text-lg font-semibold text-primary">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border bg-secondary/50">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Pogledajte nekoliko stranica</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {PREVIEWS.map((p) => (
                <img key={p.src} src={p.src} alt={p.alt} width={800} height={1132} loading="lazy" className="w-full rounded-sm border border-border shadow-md" />
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 md:py-16">
          <div>
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Odakle su podaci</h2>
            <p className="mt-2 text-muted-foreground">
              Svaki uvjet, iznos i rok provjerili smo u Narodnim novinama i na stranicama HZMO-a. Popis izvora nalazi se na kraju vodiča.
            </p>
            <dl className="mt-6 divide-y divide-border rounded-lg border border-border">
              {SOURCES.map(([topic, source]) => (
                <div key={topic} className="grid gap-1 p-3 text-sm sm:grid-cols-[45%_1fr]">
                  <dt className="font-medium text-foreground">{topic}</dt>
                  <dd className="text-muted-foreground">{source}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Česta pitanja</h2>
            <dl className="mt-6 space-y-5">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <dt className="flex gap-2 font-semibold text-primary"><Check className="mt-1 h-4 w-4 shrink-0 text-memorial-gold" aria-hidden="true" />{f.q}</dt>
                  <dd className="mt-1 pl-6 text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-memorial-parchment/60 dark:bg-muted/30">
          <div className="container mx-auto max-w-xl px-4 py-12 text-center md:py-16">
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Preuzmite vodič</h2>
            <p className="mt-2 text-muted-foreground">Besplatno, {GUIDE.pagesLabel}, PDF koji možete ispisati.</p>
            <div className="mt-6 text-left">
              <EbookForm guide={GUIDE.id} placement="landing_bottom" buttonLabel="Preuzmite besplatni vodič" />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Treba vam cijeli popis koraka nakon smrti? <Link to={EBOOKS['kad-izgubite-voljenu-osobu'].landing} className="underline">Vodič „Kad izgubite voljenu osobu”</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
