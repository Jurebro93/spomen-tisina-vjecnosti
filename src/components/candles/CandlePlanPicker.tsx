import { Checkbox } from '@/components/ui/checkbox';
import { CANDLE_PLANS, type CandleDays, type CandlePaymentResult } from '@/lib/candlePlans';
import { formatEur } from '@/lib/promo';
import { useToast } from '@/hooks/use-toast';

/** Choice of how long the candle burns: 7, 14 or 30 days. */
export const CandlePlanPicker = ({ value, onChange }: { value: CandleDays; onChange: (days: CandleDays) => void }) => (
  <div role="radiogroup" aria-label="Koliko dugo svijeća gori" className="grid grid-cols-3 gap-2 sm:gap-3">
    {CANDLE_PLANS.map((plan) => {
      const selected = plan.days === value;
      return (
        <button
          key={plan.days}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(plan.days)}
          className={`rounded-lg border-2 px-2 py-3 text-center transition-colors ${
            selected ? 'border-memorial-gold bg-memorial-gold/10' : 'border-border bg-background hover:border-memorial-gold/50'
          }`}
        >
          <span className="block whitespace-nowrap font-display text-sm sm:text-lg font-semibold text-foreground">{plan.days} dana</span>
          <span className="block text-sm text-muted-foreground">{formatEur(plan.price)}</span>
        </button>
      );
    })}
  </div>
);

/** Consumer law: the visitor asks for the candle to start now and accepts losing the 14-day withdrawal right. */
export const CandleConsent = ({ checked, onChange, id = 'candle-consent' }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) => (
  <label htmlFor={id} className="flex items-start gap-3 text-xs sm:text-sm text-muted-foreground cursor-pointer">
    <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
    <span>
      Želim da svijeća zasvijetli odmah nakon plaćanja i razumijem da time gubim pravo na jednostrani raskid ugovora.
      Prihvaćam <a href="/uvjeti-koristenja" target="_blank" rel="noopener" className="underline">uvjete korištenja</a>.
    </span>
  </label>
);

/** Toast for the visitor coming back from Stripe. */
export const useCandleResultToast = () => {
  const { toast } = useToast();
  return (result: CandlePaymentResult) => {
    if (result.status === 'paid') {
      toast({ title: 'Svijeća je zapaljena', description: `Hvala vam. Svijeća gori ${result.days ?? ''} dana. Potvrdu smo poslali na vaš e-mail.` });
    } else if (result.status === 'pending') {
      toast({ title: 'Plaćanje se još obrađuje', description: 'Svijeća će zasvijetliti čim banka potvrdi plaćanje. Osvježite stranicu za minutu.' });
    } else if (result.status === 'cancelled') {
      toast({ title: 'Plaćanje je otkazano', description: 'Svijeća nije zapaljena i ništa nije naplaćeno.' });
    } else {
      toast({ title: 'Provjera plaćanja nije uspjela', description: 'Ako je iznos naplaćen, svijeća će se pojaviti za nekoliko minuta. Pišite nam na info@osmrtnica.com.hr ako se ne pojavi.', variant: 'destructive' });
    }
  };
};
