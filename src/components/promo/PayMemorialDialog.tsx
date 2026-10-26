import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MemorialValueSummary from '@/components/promo/MemorialValueSummary';
import PromoCodeField from '@/components/promo/PromoCodeField';
import PurchaseTerms, { EMPTY_CONSENT, consentBody, payButtonLabel, type PurchaseConsent } from '@/components/promo/PurchaseTerms';
import { formatEur, type AppliedPromo } from '@/lib/promo';
import { MEMORIAL_PRICE_EUR, friendlyError } from '@/lib/memorial';
import { NotAuthenticatedError, startMemorialPayment } from '@/lib/memorialActions';
import { useToast } from '@/hooks/use-toast';
import { autoPromoCode } from '@/lib/seasonalPromo';

interface Props {
  memorialId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlreadyPaid?: () => void;
}

/** Checkout step for an unpaid memorial: promo code entry, price summary and payment. */
const PayMemorialDialog = ({ memorialId, open, onOpenChange, onAlreadyPaid }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState<PurchaseConsent>(EMPTY_CONSENT);

  const handlePay = async () => {
    if (!memorialId || busy) return;
    if (!consent.termsAccepted) { toast({ title: 'Prihvatite Uvjete korištenja i kupnje', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const result = await startMemorialPayment(memorialId, promo?.code ?? null, Boolean(promo?.free), consentBody(consent));
      if (result.alreadyPaid) {
        toast({ title: 'Memorijal je već plaćen.' });
        onOpenChange(false);
        onAlreadyPaid?.();
        return;
      }
      if ('free' in result && result.free) {
        const params = new URLSearchParams({ besplatno: '1', memorial: memorialId });
        if (result.slug) params.set('slug', result.slug);
        if (result.promoCode) params.set('kod', result.promoCode);
        onOpenChange(false);
        navigate(`/zahvaljujemo?${params.toString()}`);
        return;
      }
      // Stripe redirect is already under way.
    } catch (error) {
      if (error instanceof NotAuthenticatedError) {
        toast({
          title: 'Prijava je istekla',
          description: 'Ponovno se prijavite pa nastavite s plaćanjem. Memorijal je spremljen kao skica.',
          variant: 'destructive',
        });
        onOpenChange(false);
        navigate(`/prijava?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
        return;
      }
      const detail = (error as { message?: string } | null)?.message;
      toast({
        title: 'Plaćanje nije moguće započeti',
        description: friendlyError(error, detail || 'Pokušajte ponovno za nekoliko trenutaka.'),
        variant: 'destructive',
      });
      setPromo(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Objava memorijala</DialogTitle>
          <DialogDescription>
            Ako imate promo kod, unesite ga prije plaćanja. Prije potvrde provjerite iznos i uvjete.
          </DialogDescription>
        </DialogHeader>
        <MemorialValueSummary compact />
        <PromoCodeField
          productType="memorial"
          productLabel="memorijala"
          basePrice={MEMORIAL_PRICE_EUR}
          applied={promo}
          onApplied={setPromo}
          autoCode={autoPromoCode()}
        />
        <PurchaseTerms value={consent} onChange={setConsent} promo={promo} />
        <Button variant="gold" onClick={handlePay} disabled={busy || !consent.termsAccepted} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
          {payButtonLabel(promo)}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Sigurno plaćanje karticom putem Stripea.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PayMemorialDialog;
