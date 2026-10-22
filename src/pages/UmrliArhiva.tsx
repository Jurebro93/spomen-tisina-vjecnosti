import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NotFound from '@/pages/NotFound';
import { useCityName } from '@/hooks/useCityName';
import { breadcrumbJsonLd } from '@/lib/seo';
import { formatLifespan } from '@/lib/utils';
import { hrPlural } from '@/lib/hr';
import { NATIONAL, fetchArchive, isMonthParam, monthLabel, nextMonth, prevMonth, FIRST_MONTH, type ArchiveRow } from '@/lib/obituaryArchive';

// /umrli/:city/:godina/:mjesec and /umrli/arhiva/:godina/:mjesec, see src/lib/obituaryArchive.ts.
const UmrliArhiva = () => {
  const { city, godina, mjesec } = useParams();
  const national = city === NATIONAL;
  const cityName = useCityName(national ? undefined : city);
  const ym = `${godina}-${mjesec}`;
  const [rows, setRows] = useState<ArchiveRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const valid = isMonthParam(godina, mjesec);

  useEffect(() => {
    if (!valid || (!national && !cityName)) return;
    let cancelled = false;
    setRows(null);
    setFailed(false);
    fetchArchive(national ? null : cityName, ym)
      .then((data) => !cancelled && setRows(data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [valid, national, cityName, ym]);

  if (!valid) return <NotFound />;

  const base = `/umrli/${city}`;
  const path = `${base}/${godina}/${mjesec}`;
  const label = monthLabel(ym);
  const title = national ? `Osmrtnice – ${label} | Osmrtnica.com.hr` : `Umrli ${cityName} – ${label} | Osmrtnice`;
  const h1 = national ? `Osmrtnice – ${label}` : `Umrli ${cityName} – ${label}`;
  const description = national
    ? `Sve osmrtnice objavljene za ${label.replace(/\.$/, '')}: ime, godine života i mjesto. Zapalite virtualnu svijeću i ostavite sjećanje.`
    : `Osmrtnice za ${cityName}, ${label.replace(/\.$/, '')}: popis pokojnika s godinama života. Zapalite virtualnu svijeću i ostavite sjećanje.`;
  const prev = prevMonth(ym);
  const next = nextMonth(ym);
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLink = (m: string) => `${base}/${m.slice(0, 4)}/${m.slice(5, 7)}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://osmrtnica.com.hr${path}`} />
        {rows && rows.length === 0 && !failed && <meta name="robots" content="noindex,follow" />}
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Početna', path: '/' },
              { name: 'Umrli', path: '/umrli' },
              ...(national ? [] : [{ name: cityName, path: base }]),
              { name: label },
            ]),
          )}
        </script>
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <nav aria-label="breadcrumb" className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Početna</Link> / <Link to="/umrli" className="hover:text-primary">Umrli</Link>
          {!national && (
            <>
              {' '}/ <Link to={base} className="hover:text-primary">{cityName}</Link>
            </>
          )}{' '}
          / {label}
        </nav>
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">{h1}</h1>
        <p className="text-muted-foreground mb-6">
          {rows ? `${rows.length} ${hrPlural(rows.length, 'osmrtnica', 'osmrtnice', 'osmrtnica')}, poredano po datumu smrti.` : 'Učitavanje…'}
        </p>
        {failed && <p className="text-muted-foreground">Popis se trenutno ne može učitati. Pokušajte ponovno.</p>}
        {rows && rows.length === 0 && !failed && <p className="text-muted-foreground">Za ovaj mjesec nema objavljenih osmrtnica.</p>}
        {rows && rows.length > 0 && (
          <ul className="divide-y divide-border mb-8">
            {rows.map((r) => (
              <li key={r.id} className="py-2">
                <Link to={`/${r.slug}`} className="font-medium hover:text-primary hover:underline underline-offset-4">
                  {r.ime} {r.prezime}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {[formatLifespan(r.datum_rodenja, r.datum_smrti), national ? r.mjesto_smrti?.trim() : ''].filter(Boolean).map((t) => ` · ${t}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <nav aria-label="Mjeseci" className="flex flex-wrap justify-between gap-4 text-sm">
          {prev >= FIRST_MONTH ? <Link to={monthLink(prev)} className="underline">← {monthLabel(prev)}</Link> : <span />}
          <Link to={national ? '/umrli' : base} className="underline">{national ? 'Sve osmrtnice' : `Umrli ${cityName}`}</Link>
          {next <= current ? <Link to={monthLink(next)} className="underline">{monthLabel(next)} →</Link> : <span />}
        </nav>
      </main>
      <Footer />
    </div>
  );
};

export default UmrliArhiva;
