import { Link, useLocation } from 'react-router-dom';
import { formatEur } from '@/lib/promo';
import { MEMORIAL_PRICE_EUR } from '@/lib/memorial';
import { activeSeasonalPromo, seasonalPrice } from '@/lib/seasonalPromo';
import { CANDLE_PRICES_TEXT } from '@/lib/candlePlans';
import { isCandlePath, isCandleVisitor } from '@/lib/candleVisitor';

/** Paths where the bar would get in the way (admin, payment, sign-in). */
const isHiddenPath = (p: string) =>
  p.startsWith('/admin') ||
  p.startsWith('/digitalni-memorijal/placanje') ||
  p.startsWith('/zahvaljujemo') ||
  p.startsWith('/auth') ||
  p.startsWith('/prijava') ||
  p.startsWith('/registracija') ||
  /^\/memorijal\/[^/]+\/uredi/.test(p);

/** Candle prices for visitors from candle ads and on candle pages; a memorial discount would only distract them. */
const CandleBar = ({ pathname }: { pathname: string }) => (
  <div className="bg-accent text-accent-foreground text-sm">
    <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
      <span>
        Zapalite virtualnu svijeću za svoje drage: <strong>{CANDLE_PRICES_TEXT}</strong>
      </span>
      {!pathname.startsWith('/zapali-svijecu') && (
        <Link to="/zapali-svijecu" className="font-semibold underline underline-offset-2 whitespace-nowrap">
          Zapalite svijeću
        </Link>
      )}
    </div>
  </div>
);

/** Thin notice above the header: candle prices for candle visitors, else the seasonal memorial discount. */
const SeasonalPromoBar = () => {
  const { pathname } = useLocation();
  if (isHiddenPath(pathname)) return null;
  if (isCandleVisitor() || isCandlePath(pathname)) return <CandleBar pathname={pathname} />;
  const promo = activeSeasonalPromo();
  if (!promo) return null;
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
