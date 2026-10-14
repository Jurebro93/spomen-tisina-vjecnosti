import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CITIES = ['Zagreb', 'Split', 'Osijek', 'Zadar', 'Rijeka', 'Pula', 'Makarska', 'Imotski', 'Šibenik', 'Trogir', 'Solin', 'Metković'];

const toSlug = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

type Props = { kind: 'sprovodi' | 'groblja' };

const CityIndexPage = ({ kind }: Props) => {
  const isSprovodi = kind === 'sprovodi';
  const title = isSprovodi ? 'Sprovodi po gradovima' : 'Groblja po gradovima';
  const description = isSprovodi
    ? 'Raspored sprovoda i pogrebna poduzeća po gradovima u Hrvatskoj.'
    : 'Popis groblja po gradovima u Hrvatskoj – adrese, kontakt i radno vrijeme.';

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${title} | Osmrtnica.com.hr`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://osmrtnica.com.hr/${kind}`} />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-4xl font-display font-bold mb-3">{title}</h1>
        <p className="text-muted-foreground mb-8">{description} Odaberite grad.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CITIES.map((c) => (
            <Link
              key={c}
              to={`/${kind}/${toSlug(c)}`}
              className="rounded-lg border border-memorial-gold/40 bg-card p-4 font-medium hover:border-memorial-gold hover:text-memorial-gold transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
        <p className="mt-8 text-sm">
          <Link to="/gradovi" className="text-memorial-gold underline">Svi gradovi</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default CityIndexPage;
