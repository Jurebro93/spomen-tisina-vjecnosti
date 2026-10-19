// Landing page for the free guide "Kad izgubite voljenu osobu" (Meta traffic campaign target).
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BookOpen, Check, FileText, Globe, ListChecks } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EbookForm } from '@/components/EbookSignup';
import { EBOOK } from '@/lib/ebook';

const URL = 'https://osmrtnica.com.hr/besplatni-vodic';
const TITLE = 'Besplatni vodič: Kad izgubite voljenu osobu | Osmrtnica.com.hr';
const DESCRIPTION = 'Što učiniti nakon smrti bliske osobe, od prvog dana do šest mjeseci kasnije: sprovod, dokumenti, mirovina i ostavina. Besplatni PDF od 24 stranice.';

const FACTS = [
  { icon: FileText, label: `${EBOOK.pages} stranice, PDF` },
  { icon: BookOpen, label: '9 poglavlja, kronološkim redom' },
  { icon: ListChecks, label: 'Kontrolne liste za ispis' },
  { icon: Globe, label: 'Za Hrvatsku i obitelji u inozemstvu' },
];

const CHAPTERS = [
  { n: 1, title: 'Prva 24 sata', text: 'Što učiniti ako je smrt nastupila kod kuće, u bolnici ili u inozemstvu, koga zvati i koje dokumente pripremiti.' },
  { n: 2, title: 'Sprovod: odluke prvih dana', text: 'Pokop ili kremacija, grobno mjesto, ispraćaj, okvirni troškovi i tko može pomoći s njima.' },
  { n: 3, title: 'Obavijest o smrti i osmrtnica', text: 'Što osmrtnica mora sadržavati, pet predložaka teksta i kako sastaviti kratak oproštajni govor.' },
  { n: 4, title: 'Matični ured i dokumenti', text: 'Prijava smrti u roku od 3 dana, smrtni list i koji papir od koga dobivate.' },
  { n: 5, title: 'Mirovina i prava obitelji', text: 'Posljednja mirovina i obiteljska mirovina: tko ima pravo, koliki je udio i rok od 6 mjeseci.' },
  { n: 6, title: 'Banke, imovina i ostavina', text: 'Kako teče ostavinski postupak, što pripremiti za raspravu i kada se plaća porez na nasljedstvo.' },
  { n: 7, title: 'Odjave i digitalni tragovi', text: 'Režije, pretplate, osiguranja te profili na Facebooku, Instagramu i Googleu.' },
  { n: 8, title: 'Kad smrt nastupi u inozemstvu', text: 'Prijava u zemlji smrti, upis u hrvatsku maticu, prijevoz tijela ili urne i uloga konzulata.' },
  { n: 9, title: 'Tuga i podrška', text: 'Kako razgovarati s djecom i gdje potražiti besplatnu stručnu pomoć.' },
];

const PREVIEWS = [
  { src: '/vodic/pregled.jpg', alt: 'Stranica vodiča: pregled od prvih 24 sata do šest mjeseci' },
  { src: '/vodic/prva-24-sata.jpg', alt: 'Stranica vodiča: prva 24 sata kod kuće, u bolnici ili u inozemstvu' },
  { src: '/vodic/mirovina.jpg', alt: 'Stranica vodiča: mirovina i prava obitelji' },
  { src: '/vodic/kontrolne-liste.jpg', alt: 'Stranica vodiča: kontrolne liste za ispis' },
];

const SOURCES = [
  ['Postupak kod smrtnog slučaja', 'gov.hr'],
  ['Mrtvozornik, potvrda o smrti, rok pokopa', 'Pravilnik o načinu pregleda umrlih (Narodne novine)'],
  ['Prijevoz i pogrebne usluge', 'Zakon o pogrebničkoj djelatnosti; NN 116/2018'],
  ['Obiteljska mirovina i rokovi', 'HZMO; Ministarstvo rada i mirovinskog sustava'],
  ['Ostavinski postupak', 'gov.hr; Uredba o Tarifi sudskih pristojbi (NN 50/2026)'],
  ['Porez na nasljedstvo', 'Porezna uprava'],
  ['Pomoć za pogrebne troškove', 'Zakon o socijalnoj skrbi; Grad Zagreb'],
  ['Smrt u inozemstvu', 'MVEP; Središnji državni ured za Hrvate izvan RH'],
  ['Dopunsko osiguranje', 'HZZO'],
  ['Psihološka podrška', 'HZJZ; Psihološki centar TESA'],
];

const FAQ = [
  { q: 'Je li vodič stvarno besplatan?', a: 'Da. Ne plaćate ništa i ne preuzimate nikakvu obvezu. Tražimo samo e-mail adresu na koju vam šaljemo poveznicu za preuzimanje.' },
  { q: 'Što radite s mojim e-mailom?', a: 'Pošaljemo vam vodič i povremeno praktične savjete o koracima nakon smrti bliske osobe. Adresu ne dijelimo s trećima, a odjaviti se možete u svakom trenutku.' },
  { q: 'Mogu li vodič proslijediti obitelji?', a: 'Možete. Vodič smijete slobodno dijeliti i ispisivati. Često najviše pomaže kad ga dobije netko tko obitelji pomaže s pozivima i papirima.' },
  { q: 'Je li ovo pravni savjet?', a: 'Nije. Vodič je informativan. Podatke smo provjerili u listopadu 2026., no rokovi i iznosi mogu se promijeniti, pa ih za svoj slučaj potvrdite kod nadležne službe.' },
];

export default function BesplatniVodic() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={URL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={URL} />
        <meta property="og:title" content="Besplatni vodič: Kad izgubite voljenu osobu" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content="https://osmrtnica.com.hr/vodic/og.jpg" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Book',
          name: EBOOK.title,
          inLanguage: 'hr',
          numberOfPages: EBOOK.pages,
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
              <p className="text-sm font-semibold uppercase tracking-wide text-memorial-gold">Besplatni vodič za obitelji</p>
              <h1 className="order-1 mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl lg:text-5xl">
                Kad izgubite voljenu osobu: što učiniti korak po korak
              </h1>
              <p className="order-3 mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Kad netko umre, obitelj u nekoliko dana mora donijeti desetke odluka. Ovaj vodič smo istražili i napisali da vam olakša taj dio:
                od prvog poziva do obiteljske mirovine i ostavine, redom kojim stvari dolaze i bez pravnog žargona.
              </p>
              <p className="order-3 mt-4 text-base leading-relaxed text-foreground sm:text-lg">
                Svaki rok i iznos provjerili smo u listopadu 2026. prema službenim izvorima, od gov.hr i HZMO-a do Porezne uprave i Narodnih novina.
                Dajemo ga <strong>potpuno besplatno</strong>, tražimo samo vaš e-mail.
              </p>
              <ul className="order-3 mt-6 grid gap-2 sm:grid-cols-2">
                {FACTS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-sm text-foreground/80">
                    <Icon className="h-4 w-4 shrink-0 text-memorial-gold" aria-hidden="true" /> {label}
                  </li>
                ))}
              </ul>
              <p className="order-1 mt-3 text-base text-muted-foreground md:hidden">Besplatni PDF od {EBOOK.pages} stranice, provjeren prema službenim izvorima.</p>
              <div className="order-2 mt-5 max-w-md rounded-xl md:order-3 md:mt-8 border border-memorial-gold/40 bg-background p-5 shadow-sm">
                <p className="mb-3 font-semibold text-primary">Upišite e-mail i odmah preuzmite vodič</p>
                <EbookForm placement="landing_top" buttonLabel="Preuzmite besplatni vodič" />
              </div>
            </div>
            <img
              src={EBOOK.cover}
              alt="Naslovnica vodiča Kad izgubite voljenu osobu"
              width={800}
              height={1132}
              className="hidden w-full rounded-sm shadow-2xl md:block"
            />
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl font-bold text-primary sm:text-3xl">Što je u vodiču</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">Vodič je kronološki. Svako poglavlje završava kratkim popisom onoga što stvarno ne može čekati.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              Vodič nismo složili napamet. Za svako poglavlje pročitali smo propise i upute nadležnih službi, a popis izvora nalazi se na kraju vodiča.
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
            <p className="mt-2 text-muted-foreground">Besplatno, {EBOOK.pages} stranice, PDF koji možete ispisati.</p>
            <div className="mt-6 text-left">
              <EbookForm placement="landing_bottom" buttonLabel="Preuzmite besplatni vodič" />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Treba vam objaviti osmrtnicu? <Link to="/objavi-osmrtnicu" className="underline">Objavite je ovdje</Link>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
