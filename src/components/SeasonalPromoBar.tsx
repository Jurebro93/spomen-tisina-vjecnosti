import { Link, useLocation } from 'react-router-dom';
import { formatEur } from '@/lib/promo';
import { MEMORIAL_PRICE_EUR } from '@/lib/memorial';
import { activeSeasonalPromo, seasonalPrice } from '@/lib/seasonalPromo';

/** Paths where the bar would get in the way (admin, payment, sign-in). */
const isHiddenPath = (p: string) =>
  p.startsWith('/admin') ||
  p.startsWith('/digitalni-memorijal/placanje') ||
  p.startsWith('/zahvaljujemo') ||
  // Candle ads land here; a memorial discount would only distract from lighting a candle.
  p.startsWith('/zapali-svijecu') ||
  p.startsWith('/auth') ||
  p.startsWith('/prijava') ||
  p.startsWith('/registracija') ||
  /^\/memorijal\/[^/]+\/uredi/.test(p);

/** Thin notice above the header while a seasonal memorial discount runs. */
const SeasonalPromoBar = () => {
  const { pathname } = useLocation();
  const promo = activeSeasonalPromo();
  if (!promo || isHiddenPath(pathname)) return null;
  const inCreator = pathname.startsWith('/kreiraj-memorijal') || pathname.startsWith('/digitalni-memorijal/kreiraj');

  return (
    <div className="bg-accent text-accent-foreground text-sm">
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span>
          {promo.occasion}: memorijal <strong>{formatEur(seasonalPrice(promo))}</strong> umjesto{' '}
          <span className="line-through">{formatEur(MEMORIAL_PRICE_EUR)}</span> do {promo.untilLabel}
        </span>
        {!inCreator && (
          <Link to="/kreiraj-memorijal" className="font-semibold underline underline-offset-2 whitespace-nowrap">
            Izradite memorijal
          </Link>
        )}
      </div>
    </div>
  );
};

export default SeasonalPromoBar;
