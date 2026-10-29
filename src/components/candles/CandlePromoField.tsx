import { useEffect, useRef, useState } from 'react';
import { Loader2, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { applyPromoCode, formatEur, type AppliedPromo } from '@/lib/promo';
import { CANDLE_PLANS, type CandleDays } from '@/lib/candlePlans';

interface Props {
  days: CandleDays;
  applied: AppliedPromo | null;
  onApplied: (applied: AppliedPromo | null) => void;
  id?: string;
}

/** Optional promo code for a paid candle. The server checks it again at checkout. */
const CandlePromoField = ({ days, applied, onApplied, id = 'candle-promo' }: Props) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastDays = useRef(days);

  const check = async (value: string, forDays: CandleDays) => {
    setBusy(true);
    setError(null);
    const result = await applyPromoCode(value, 'candle', forDays);
    setBusy(false);
    if (!result.valid || !result.applied) {
      setError(result.message);
      onApplied(null);
      return;
    }
    onApplied(result.applied);
  };

  // The discount depends on the plan price, so a different plan is priced again.
  useEffect(() => {
    if (lastDays.current === days) return;
    lastDays.current = days;
    if (applied) void check(applied.code, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const remove = () => {
    onApplied(null);
    setCode('');
    setError(null);
  };

  if (!open && !applied) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
        <Tag className="h-3.5 w-3.5" /> Imate promo kod?
      </button>
    );
  }

  const planPrice = CANDLE_PLANS.find((p) => p.days === days)?.price ?? 0;

  return (
    <div className="space-y-2">
      {applied ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/60 px-3 py-2 text-sm">
          <span>
            Promo kod <strong>{applied.code}</strong>: <s className="text-muted-foreground">{formatEur(planPrice)}</s>{' '}
            <strong>{applied.free ? 'besplatno' : formatEur(applied.final_price)}</strong>
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={remove}>
            <X className="h-4 w-4 mr-1" /> Ukloni
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input id={id} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Promo kod" className="uppercase"
            aria-label="Promo kod"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (code.trim() && !busy) void check(code.trim(), days);
              }
            }} />
          <Button type="button" variant="outline" disabled={busy || !code.trim()} onClick={() => void check(code.trim(), days)}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Primijeni
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default CandlePromoField;
