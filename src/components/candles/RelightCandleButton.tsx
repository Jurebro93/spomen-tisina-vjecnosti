import { useState } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_CANDLE_DAYS, candlePayLabel, startCandleCheckout, type CandleDays } from '@/lib/candlePlans';
import type { AppliedPromo } from '@/lib/promo';
import { CandleConsent, CandlePlanPicker } from './CandlePlanPicker';
import CandlePromoField from './CandlePromoField';

/** "Zapali ponovno" for an extinguished obituary candle: pick 7/14/30 days and pay. */
const RelightCandleButton = ({ candleId, personName, className }: { candleId: string; personName: string; className?: string }) => {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<CandleDays>(DEFAULT_CANDLE_DAYS);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const { toast } = useToast();

  const pay = async () => {
    if (!consent) {
      toast({ title: 'Potrebna je potvrda', description: 'Označite da želite da svijeća zasvijetli odmah.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await startCandleCheckout({ kind: 'obituary', days, relightCandleId: candleId, promoCode: promo?.code });
    } catch (e) {
      setBusy(false);
      toast({ title: 'Greška', description: e instanceof Error ? e.message : 'Pokušajte ponovno.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={className ?? 'elegant-button bg-candle-flame hover:bg-candle-flame/90 text-white text-xs'}>
          Zapali ponovno
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Zapalite svijeću ponovno</DialogTitle>
          <DialogDescription>Odaberite koliko dugo će svijeća za {personName} gorjeti.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <CandlePlanPicker value={days} onChange={setDays} />
          <CandlePromoField id={`relight-promo-${candleId}`} days={days} applied={promo} onApplied={setPromo} />
          <CandleConsent id={`relight-consent-${candleId}`} checked={consent} onChange={setConsent} />
          <Button type="button" variant="gold" className="w-full" disabled={busy} onClick={pay}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flame className="h-4 w-4 mr-2" />}
            {candlePayLabel(days, promo)}
          </Button>
          <p className="text-xs text-center text-muted-foreground">Plaćanje karticom preko sigurnog Stripe sustava.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RelightCandleButton;
