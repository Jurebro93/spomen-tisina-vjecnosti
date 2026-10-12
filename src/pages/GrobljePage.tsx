import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MemorialCtaSection from '@/components/MemorialCtaSection';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock, CalendarDays, ArrowRight } from 'lucide-react';
import CemeteriesSection from '@/components/CemeteriesSection';
import { fetchCemeteries, type Cemetery } from '@/lib/cemeteries';
import CemeteryFuneralSchedule from '@/components/CemeteryFuneralSchedule';
import { breadcrumbJsonLd } from '@/lib/seo';


const normalizeCityKey = (city: string) =>
  city
    .trim()
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/ž/g, 'z')
    .replace(/š/g, 's')
    .replace(/đ/g, 'd');

const GrobljePage = () => {
  const { slug } = useParams();
  const [cemetery, setCemetery] = useState<Cemetery | null>(null);
  const [others, setOthers] = useState<Cemetery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCemeteries().then((all) => {
      if (!active) return;
      const current = all.find((c) => c.slug === slug) || null;
      setCemetery(current);
      setOthers(
        current?.grad
          ? all.filter(
              (c) =>
                c.naziv !== current.naziv &&
                c.grad &&
                normalizeCityKey(c.grad) === normalizeCityKey(current.grad as string)
            )
          : []
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-memorial-gold" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!cemetery) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Groblje nije pronađeno | Osmrtnica.com.hr</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl sm:text-3xl font-display font-bold mb-4">Groblje nije pronađeno</h1>
          <p className="text-muted-foreground">Traženo groblje ne postoji ili još nema objavljen opis.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const normalize = (v: string) =>
    v
      .toLowerCase()
      .replace(/[čć]/g, 'c')
      .replace(/ž/g, 'z')
      .replace(/š/g, 's')
      .replace(/đ/g, 'd');

  const cityPath = cemetery.grad
    ? normalize(cemetery.grad.trim())
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    : null;

  const normalizedName = normalize(cemetery.naziv);
  const scheduleKeys: Record<string, string> = {
    mirosevac: 'Miroševac',
    mirogoj: 'Mirogoj',
    krematorij: 'Krematorij',
    'markovo polje': 'Markovo polje',
  };
  const scheduleKey = Object.keys(scheduleKeys).find((key) => normalizedName.includes(key));


  const title = `${cemetery.displayNaziv}${cemetery.grad ? ` - ${cemetery.grad}` : ''}`;
  const description = (cemetery.opis || '').slice(0, 155);

  // Split description into readable blocks: respect existing line breaks,
  // then chunk long blocks into paragraphs of ~3 sentences.
  const rawBlocks = (cemetery.opis || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  rawBlocks.forEach((block) => {
    const sentences = block.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [block];
    for (let i = 0; i < sentences.length; i += 3) {
      const chunk = sentences.slice(i, i + 3).join(' ').trim();
      if (chunk) paragraphs.push(chunk);
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title.slice(0, 60)}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://osmrtnica.com.hr/groblje/${cemetery.slug}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://osmrtnica.com.hr/groblje/${cemetery.slug}`} />
        <meta name="twitter:card" content="summary" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Cemetery',
            name: cemetery.displayNaziv,
            url: `https://osmrtnica.com.hr/groblje/${cemetery.slug}`,
            ...(cemetery.opis ? { description: cemetery.opis.slice(0, 500) } : {}),
            ...(cemetery.adresa || cemetery.grad
              ? {
                  address: {
                    '@type': 'PostalAddress',
                    ...(cemetery.adresa ? { streetAddress: cemetery.adresa } : {}),
                    ...(cemetery.grad ? { addressLocality: cemetery.grad } : {}),
                    addressCountry: 'HR',
                  },
                }
              : {}),
            ...(cemetery.telefon ? { telephone: cemetery.telefon } : {}),
            ...(cemetery.email ? { email: cemetery.email } : {}),
            ...(cemetery.radnoVrijeme ? { openingHours: cemetery.radnoVrijeme } : {}),
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Naslovnica', path: '/' },
              ...(cityPath
                ? [{ name: `Umrli ${cemetery.grad}`, path: `/umrli/${cityPath}` }]
                : []),
              { name: cemetery.displayNaziv },
            ]),
          )}
        </script>
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-6 sm:py-10 pb-16 max-w-4xl">
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Navigacija">
          <Link to="/" className="hover:text-foreground">Naslovnica</Link>
          {cityPath && (
            <>
              <span className="mx-2">/</span>
              <Link to={`/umrli/${cityPath}`} className="hover:text-foreground">Umrli {cemetery.grad}</Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-foreground">{cemetery.displayNaziv}</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-3">
          {cemetery.displayNaziv}
        </h1>
        {cemetery.grad && (
          <p className="text-muted-foreground mb-6 sm:mb-8">Groblje u gradu {cemetery.grad}</p>
        )}

        {scheduleKey && (
          <CemeteryFuneralSchedule
            matchKey={scheduleKeys[scheduleKey]}
            cemeteryName={cemetery.displayNaziv}
            city={cemetery.grad}
          />
        )}

        <section>
          <h2 className="text-xl sm:text-2xl font-display font-semibold text-foreground mb-4">
            O groblju {cemetery.naziv}
          </h2>
          <div className="h-px w-16 bg-memorial-gold/70 mb-6" />

          {(cemetery.adresa || cemetery.telefon || cemetery.email || cemetery.radnoVrijemeParts.length > 0) && (
            <Card className="mb-8 sm:mb-10 border border-border/70">
              <CardContent className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm text-muted-foreground">
                {cemetery.adresa && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0 text-memorial-gold" />
                    <span className="break-words">{cemetery.adresa}</span>
                  </div>
                )}
                {cemetery.telefon && (
                  <div className="flex items-start gap-2">
                    <Phone size={16} className="mt-0.5 flex-shrink-0 text-memorial-gold" />
                    <a href={`tel:${cemetery.telefon.replace(/\s+/g, '')}`} className="hover:text-foreground break-words">
                      {cemetery.telefon}
                    </a>
                  </div>
                )}
                {cemetery.email && (
                  <div className="flex items-start gap-2">
                    <Mail size={16} className="mt-0.5 flex-shrink-0 text-memorial-gold" />
                    <a href={`mailto:${cemetery.email}`} className="hover:text-foreground break-all">
                      {cemetery.email}
                    </a>
                  </div>
                )}
                {cemetery.radnoVrijemeParts.length > 0 && (
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <Clock size={16} className="mt-0.5 flex-shrink-0 text-memorial-gold" />
                    <div className="w-full">
                      <p className="text-foreground font-medium mb-1">Radno vrijeme</p>
                      <ul className="space-y-1">
                        {cemetery.radnoVrijemeParts.map((item, i) => (
                          <li key={i} className="break-words flex flex-col sm:flex-row sm:gap-2">
                            {item.datum && <span className="text-foreground font-medium">{item.datum}</span>}
                            <span>{item.vrijeme}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <article className="max-w-none space-y-4 sm:space-y-5">
            {paragraphs.map((paragraph, i) => (
              <div key={i}>
                {i === 1 && paragraphs.length > 2 && (
                  <h3 className="text-lg sm:text-xl font-display font-semibold text-foreground mt-6 mb-3">
                    Povijest i obilježja
                  </h3>
                )}
                {i === 3 && paragraphs.length > 4 && (
                  <h3 className="text-lg sm:text-xl font-display font-semibold text-foreground mt-6 mb-3">
                    Dobro je znati
                  </h3>
                )}
                <p
                  className={
                    i === 0
                      ? 'text-base sm:text-lg text-foreground leading-8 sm:leading-9 border-l-2 border-memorial-gold/60 pl-4'
                      : 'text-sm sm:text-base text-foreground/90 leading-7 sm:leading-8'
                  }
                >
                  {paragraph}
                </p>
              </div>
            ))}
          </article>
        </section>

        {others.length > 0 && cemetery.grad && (
          <div className="mt-12">
            <CemeteriesSection
              cemeteries={others}
              cityName={cemetery.grad}
              title={`Ostala groblja u gradu ${cemetery.grad}`}
            />
          </div>
        )}


        {cityPath && (
          <div className="mt-10 pt-6 border-t border-border/60">
            <Link
              to={`/umrli/${cityPath}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-memorial-gold hover:underline"
            >
              Sve osmrtnice i groblja u gradu {cemetery.grad}
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </main>

      <MemorialCtaSection />
      <Footer />
    </div>
  );
};

export default GrobljePage;

