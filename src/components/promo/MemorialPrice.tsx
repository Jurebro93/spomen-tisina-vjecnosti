import { MEMORIAL_PRICE_LABEL } from '@/lib/memorial';
import { formatEur } from '@/lib/promo';
import { activeSeasonalPromo, seasonalPrice } from '@/lib/seasonalPromo';

/** Memorial price for display; during a seasonal promo the reduced price with the regular one struck through. */
const MemorialPrice = () => {
  const promo = activeSeasonalPromo();
  if (!promo) return <>{MEMORIAL_PRICE_LABEL}</>;
  return (
    <>
      {formatEur(seasonalPrice(promo))}{' '}
      <span className="line-through font-normal opacity-60 text-[0.6em] align-middle">{MEMORIAL_PRICE_LABEL}</span>
    </>
  );
};

export default MemorialPrice;
