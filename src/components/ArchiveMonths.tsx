import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NATIONAL, allMonths, fetchCityMonths, monthLabel } from '@/lib/obituaryArchive';

// Links to the month archives: on a city page the months with obituaries in
// that city, on /umrli every month. See src/lib/obituaryArchive.ts.
const ArchiveMonths = ({ city, cityName }: { city?: string; cityName?: string }) => {
  const [months, setMonths] = useState<Array<{ ym: string; count?: number }>>(() => (city ? [] : allMonths().map((ym) => ({ ym }))));

  useEffect(() => {
    if (!city || !cityName) return;
    let cancelled = false;
    fetchCityMonths(cityName)
      .then((rows) => !cancelled && setMonths(rows))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [city, cityName]);

  if (months.length === 0) return null;
  const base = `/umrli/${city || NATIONAL}`;

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-display font-bold text-foreground mb-2">
        {cityName ? `Arhiva osmrtnica – ${cityName}` : 'Arhiva osmrtnica po mjesecima'}
      </h2>
      <p className="text-muted-foreground mb-4">Sve osmrtnice po mjesecu smrti.</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {months.map(({ ym, count }) => (
          <li key={ym}>
            <Link to={`${base}/${ym.slice(0, 4)}/${ym.slice(5, 7)}`} className="underline hover:text-primary">
              {monthLabel(ym)}
            </Link>
            {count ? <span className="text-muted-foreground"> ({count})</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ArchiveMonths;
