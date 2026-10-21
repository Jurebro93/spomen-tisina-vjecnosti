import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MemorialCtaSection from '@/components/MemorialCtaSection';
import CemeteriesSection from '@/components/CemeteriesSection';
import { fetchCemeteriesByCity, type Cemetery } from '@/lib/cemeteries';
import { breadcrumbJsonLd } from '@/lib/seo';
import { citySlug } from '@/lib/cityMatch';
import { useCityName } from '@/hooks/useCityName';


const GrobljaGrad = () => {
  const { city = '' } = useParams();
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [loading, setLoading] = useState(true);

  const lookedUp = useCityName(city);
  // The slug ("slavonski-brod", "sibenik") lacks the city's spelling; the cemeteries carry it.
  const cityName = cemeteries[0]?.grad || lookedUp;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCemeteries([]);
    fetchCemeteriesByCity(decodeURIComponent(city)).then((rows) => {
      if (!active) return;
      setCemeteries(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [city]);

  const title = `Groblja u gradu ${cityName} | Osmrtnica.com.hr`;
  const description = `Popis groblja u gradu ${cityName} – adrese, kontakt podaci i radno vrijeme, uz osmrtnice i raspored sprovoda.`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://osmrtnica.com.hr/groblja/${citySlug(city)}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://osmrtnica.com.hr/groblja/${citySlug(city)}`} />
        {!loading && cemeteries.length === 0 && <meta name="robots" content="noindex,follow" />}
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Naslovnica', path: '/' },
              { name: `Umrli ${cityName}`, path: `/umrli/${citySlug(city)}` },
              { name: `Groblja ${cityName}` },
            ]),
          )}
        </script>
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-4xl font-display font-bold mb-3">Groblja u gradu {cityName}</h1>
        <p className="text-muted-foreground max-w-2xl mb-8">
          Pregled groblja u gradu {cityName} s adresama, kontakt podacima i radnim vremenom. Za groblja s
          detaljnim opisom dostupna je zasebna stranica.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-memorial-gold" />
          </div>
        ) : cemeteries.length ? (
          <CemeteriesSection cemeteries={cemeteries} cityName={cityName} title={`Sva groblja u gradu ${cityName}`} />
        ) : (
          <p className="text-muted-foreground">
            Trenutno nemamo podatke o grobljima za grad {cityName}.
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm">
          <Link to={`/umrli/${citySlug(city)}`} className="text-memorial-gold hover:underline">
            Osmrtnice {cityName}
          </Link>
          <Link to={`/sprovodi/${citySlug(city)}`} className="text-memorial-gold hover:underline">
            Raspored sprovoda {cityName}
          </Link>
        </div>
      </main>

      <MemorialCtaSection />
      <Footer />
    </div>
  );
};

export default GrobljaGrad;
