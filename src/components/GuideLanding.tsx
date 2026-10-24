// Shared layout for the landing pages of the free guides (/besplatni-vodic/...): hero with the
// e-mail form, chapters, page previews, sources, FAQ and a second form at the bottom.
import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Check, type LucideIcon } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { EbookForm } from '@/components/EbookSignup';
import { EBOOKS, type GuideId } from '@/lib/ebook';

export interface GuideLandingProps {
  guide: GuideId;
  /** <title> and meta description; keep in sync with src/lib/staticHeads.json. */
  title: string;
  description: string;
  ogImage: string;
  eyebrow: string;
  /** Two short paragraphs under the headline: the problem, then what the guide does. */
  lead: ReactNode;
  body: ReactNode;
  /** One line shown under the headline on phones, before the form. */
  mobileLine: string;
  facts: { icon: LucideIcon; label: string }[];
  chaptersIntro: string;
  chapters: { n: number | string; title: string; text: string }[];
  previews: { src: string; alt: string }[];
  sourcesIntro: string;
  sources: [string, string][];
  faq: { q: string; a: string }[];
  related: { guide: GuideId; text: string };
}

export default function GuideLanding(p: GuideLandingProps) {
  const g = EBOOKS[p.guide];
  const url = `https://osmrtnica.com.hr${g.landing}`;
  const rel = EBOOKS[p.related.guide];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{p.title}</title>
        <meta name="description" content={p.description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={`Besplatni vodič: ${g.title}`} />
        <meta property="og:description" content={p.description} />
        <meta property="og:image" content={`https://osmrtnica.com.hr${p.ogImage}`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Book',
          name: g.title,
          inLanguage: 'hr',
          numberOfPages: g.pages,
          bookFormat: 'https://schema.org/EBook',
          isAccessibleForFree: true,
          publisher: { '@type': 'Organization', name: 'Osmrtnica.com.hr', url: 'https://osmrtnica.com.hr/' },
          url,
        })}</script>
      </Helmet>
      <Header />
      <main>
        <section className="border-b border-border bg-memorial-parchment/60 dark:bg-muted/30">
          <div className="container mx-auto grid gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_minmax(240px,340px)] md:items-center md:py-16">
            {/* On phones the form comes right after the headline; the longer copy follows it. */}
            <div className="flex max-w-2xl flex-col">
              <p className="text-sm font-semibold uppercase tracking-wide text-memorial-gold">{p.eyebrow}</p>
              <h1 className="order-1 mt-3 text-3xl font-bold leading-tight text-primary sm:text-4xl lg:text-5xl">{g.title}</h1>
              <p className="order-3 mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{p.lead}</p>
              <p className="order-3 mt-4 text-base leading-relaxed text-foreground sm:text-lg">{p.body}</p>
              <ul className="order-3 mt-6 grid gap-2 sm:grid-cols-2">
                {p.facts.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-sm text-foreground/80">
                    <Icon className="h-4 w-4 shrink-0 text-memorial-gold" aria-hidden="true" /> {label}
                  </li>
                ))}
              </ul>
              <p className="order-1 mt-3 text-base text-muted-foreground md:hidden">{p.mobileLine}</p>
              <div className="order-2 mt-5 max-w-md rounded-xl md:order-3 md:mt-8 border border-memorial-gold/40 bg-background p-5 shadow-sm">
                <p className="mb-3 font-semibold text-primary">Upišite e-mail i odmah preuzmite vodič</p>
                <EbookForm guide={g.id} placement="landing_top" buttonLabel="Preuzmite besplatni vodič" />
              </div>
            </div>
            <img
              src={g.cover}
              alt={`Naslovnica vodiča ${g.title}`}
              width={800}
              height={1132}
              className="hidden w-full rounded-sm shadow-2xl md:block"
            />
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl font-bold text-primary sm:text-3xl">Što je u vodiču</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{p.chaptersIntro}</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {p.chapters.map((c) => (
              <li key={c.title} className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm font-semibold text-memorial-gold">{typeof c.n === 'number' ? `Poglavlje ${c.n}` : c.n}</p>
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
              {p.previews.map((im) => (
                <img key={im.src} src={im.src} alt={im.alt} width={800} height={1132} loading="lazy" className="w-full rounded-sm border border-border shadow-md" />
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 md:py-16">
          <div>
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Odakle su podaci</h2>
            <p className="mt-2 text-muted-foreground">{p.sourcesIntro}</p>
            <dl className="mt-6 divide-y divide-border rounded-lg border border-border">
              {p.sources.map(([topic, source]) => (
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
              {p.faq.map((f) => (
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
            <p className="mt-2 text-muted-foreground">Besplatno, {g.pagesLabel}, PDF koji možete ispisati.</p>
            <div className="mt-6 text-left">
              <EbookForm guide={g.id} placement="landing_bottom" buttonLabel="Preuzmite besplatni vodič" />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {p.related.text} <Link to={rel.landing} className="underline">Vodič „{rel.title}”</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
