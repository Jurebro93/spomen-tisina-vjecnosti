import { useEffect, useRef, useState } from 'react';
import { Loader2, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { applyPromoCode, formatEur, type AppliedPromo } from '@/lib/promo';

interface Props {
  productType: 'memorial' | 'obituary';
  productLabel: string;
  basePrice: number;
  applied: AppliedPromo | null;
  onApplied: (applied: AppliedPromo | null) => void;
  /** Applied once on mount (code from the link or a running seasonal promo); a failure stays silent. */
  autoCode?: string | null;
}

/** Promo code entry + server-verified price summary. Nothing is applied while typing. */
const PromoCodeField = ({ productType, productLabel, basePrice, applied, onApplied, autoCode }: Props) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const autoTried = useRef(false);

  useEffect(() => {
    if (autoTried.current || applied || !autoCode) return;
    autoTried.current = true;
    let cancelled = false;
    void applyPromoCode(autoCode, productType).then((result) => {
      if (cancelled || !result.valid || !result.applied) return;
      setCode(result.applied.code);
      setSuccess('Popust je već primijenjen.');
      onApplied(result.applied);
    });
    return () => { cancelled = true; };
  }, [autoCode, applied, productType, onApplied]);

  const handleApply = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await applyPromoCode(code.trim(), productType);
    if (!result.valid || !result.applied) {
      setError(result.message);
      onApplied(null);
    } else {
      setSuccess(result.message);
      onApplied(result.applied);
    }
    setBusy(false);
  };

  const handleRemove = () => {
    onApplied(null);
    setCode('');
    setError(null);
    setSuccess(null);
  };

  const finalPrice = applied ? applied.final_price : basePrice;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="promo-code" className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-accent" /> Promo kod
        </Label>
        {applied ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium">{applied.code}</span>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <X className="h-4 w-4 mr-1" /> Ukloni kod
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Unesite promo kod"
              className="uppercase"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApply();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handleApply} disabled={busy || !code.trim()}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Primijeni
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && applied && <p className="text-sm text-accent">{success}</p>}
      </div>

      <div className="space-y-1.5 text-sm border-t border-border pt-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cijena {productLabel}:</span>
          <span>{formatEur(applied ? applied.original_price : basePrice)}</span>
        </div>
        {applied && (
          <div className="flex justify-between text-accent">
            <span>Promo kod {applied.code}:</span>
            <span>-{formatEur(applied.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-base pt-1">
          <span>Za platiti:</span>
          <span>{formatEur(finalPrice)}</span>
        </div>
      </div>
    </div>
  );
};

export default PromoCodeField;
