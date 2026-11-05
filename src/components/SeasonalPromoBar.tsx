import { Link, useLocation } from 'react-router-dom';
import { formatEur } from '@/lib/promo';
import { MEMORIAL_PRICE_EUR } from '@/lib/memorial';
import { activeSeasonalPromo, seasonalPrice } from '@/lib/seasonalPromo';
import { CANDLE_PRICES_TEXT } from '@/lib/candlePlans';
import { isCandlePath, isCandleVisitor } from '@/lib/candleVisitor';
import { hasConsent } from '@/lib/consent';

/** Click on the top bar, for GA4 via GTM (only with analytics consent). */
const trackBarClick = (bar: 'candle' | 'memorial', pathname: string) => {
  if (typeof window === 'undefined' || !hasConsent('analytics')) return;
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event: 'top_bar_click', bar, page_path: pathname });
};

/** Pages where visitors look for a deceased person: lighting a candle is the natural next step. */
const isMourningPath = (p: string) =>
  p.startsWith('/osmrtnica/') || p.startsWith('/umrli') || p.startsWith('/sprovodi') || p.startsWith('/groblj');

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
        <Link to="/zapali-svijecu" onClick={() => trackBarClick('candle', pathname)} className="font-semibold underline underline-offset-2 whitespace-nowrap">
          Zapalite svijeću
        </Link>
      )}
    </div>
  </div>
);

/** Regular memorial offer (no discount) for everyone else. */
const MemorialBar = ({ pathname }: { pathname: string }) => (
  <div className="bg-accent text-accent-foreground text-sm">
    <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
      <span>
        Digitalni memorijal: <strong>jednokratno {formatEur(MEMORIAL_PRICE_EUR)}</strong>, plaćate tek kad vidite gotov memorijal
      </span>
      <Link to="/kreiraj-memorijal" onClick={() => trackBarClick('memorial', pathname)} className="font-semibold underline underline-offset-2 whitespace-nowrap">
        Izradite memorijal
      </Link>
    </div>
  </div>
);

/** Thin notice above the header: candle prices for candle visitors and on mourning pages (obituaries, city lists,
 *  funerals, cemeteries); the seasonal memorial discount while one runs; otherwise the regular memorial offer. */
const SeasonalPromoBar = () => {
  const { pathname } = useLocation();
  if (isHiddenPath(pathname)) return null;
  if (isCandleVisitor() || isCandlePath(pathname)) return <CandleBar pathname={pathname} />;
  const promo = activeSeasonalPromo();
  const inCreator = pathname.startsWith('/kreiraj-memorijal') || pathname.startsWith('/digitalni-memorijal/kreiraj');
  if (!promo) {
    if (isMourningPath(pathname)) return <CandleBar pathname={pathname} />;
    if (inCreator) return null;
    return <MemorialBar pathname={pathname} />;
  }

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
