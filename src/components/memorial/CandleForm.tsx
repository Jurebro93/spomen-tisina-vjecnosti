import React, { useState } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CandleConsent, CandlePlanPicker, useCandleResultToast } from '@/components/candles/CandlePlanPicker';
import { DEFAULT_CANDLE_DAYS, candlePriceLabel, startCandleCheckout, useCandlePaymentReturn, type CandleDays } from '@/lib/candlePlans';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CandleForm = ({ memorialId, personName, onLit }: { memorialId: string; personName: string; onLit?: () => void | Promise<void> }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState<CandleDays>(DEFAULT_CANDLE_DAYS);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lit, setLit] = useState(false);
  const { toast } = useToast();
  const showCandleResult = useCandleResultToast();

  useCandlePaymentReturn(async (result) => {
    showCandleResult(result);
    if (result.status === 'paid') {
      setLit(true);
      await onLit?.();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!EMAIL_RE.test(email.trim())) {
      toast({ title: 'Provjerite e-mail', description: 'Na e-mail šaljemo potvrdu i račun.', variant: 'destructive' });
      return;
    }
    if (!consent) {
      toast({ title: 'Potrebna je potvrda', description: 'Označite da želite da svijeća zasvijetli odmah.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await startCandleCheckout({
        kind: 'memorial',
        days,
        memorialId,
        visitorName: name.trim() || undefined,
        email: email.trim(),
        message: message.trim() || undefined,
      });
    } catch (error) {
      setSubmitting(false);
      toast({ title: 'Nije uspjelo', description: error instanceof Error ? error.message : 'Pokušajte ponovno.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="gold">
          <Flame className={`h-4 w-4 mr-2 ${lit ? 'animate-pulse' : ''}`} />
          {lit ? 'Svijeća je zapaljena' : 'Zapali svijeću'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Zapalite svijeću</DialogTitle>
          <DialogDescription>Zapalite svijeću u znak sjećanja na {personName}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Ime (nije obvezno)</Label>
            <Input id="c-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">E-mail za potvrdu</Label>
            <Input id="c-email" type="email" maxLength={200} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-msg">Kratka poruka (nije obvezno)</Label>
            <Textarea id="c-msg" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Koliko dugo svijeća gori?</Label>
            <CandlePlanPicker value={days} onChange={setDays} />
          </div>
          <CandleConsent id="memorial-candle-consent" checked={consent} onChange={setConsent} />
          <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flame className="h-4 w-4 mr-2" />}
            Plati {candlePriceLabel(days)} i zapali
          </Button>
          <p className="text-xs text-center text-muted-foreground">Plaćanje karticom preko sigurnog Stripe sustava.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CandleForm;
