import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { formatEur, type AppliedPromo } from '@/lib/promo';
import { MEMORIAL_PRICE_EUR } from '@/lib/memorial';
import { activeSeasonalPromo, currentMemorialPrice } from '@/lib/seasonalPromo';
import { TERMS_VERSION } from '@/lib/legal';
import { hasConsent } from '@/lib/consent';

export interface PurchaseConsent { termsAccepted: boolean; immediateStart: boolean }
export const EMPTY_CONSENT: PurchaseConsent = { termsAccepted: false, immediateStart: false };

/** Fields the server needs to record the accepted terms and the service start choice. */
export const consentBody = (c: PurchaseConsent) => ({
  terms_accepted: c.termsAccepted,
  terms_version: TERMS_VERSION,
  immediate_start: c.immediateStart,
  marketing_consent: hasConsent('marketing'),
});

const startDate = () => {
  const d = new Date(Date.now() + 14 * 86400_000);
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric', year: 'numeric' });
};

export const payButtonLabel = (promo: AppliedPromo | null) =>
  promo?.free ? 'Aktiviraj besplatno' : `Naruči i plati ${formatEur(promo ? promo.final_price : currentMemorialPrice())}`;

const PurchaseTerms = ({ value, onChange, promo }: { value: PurchaseConsent; onChange: (v: PurchaseConsent) => void; promo: AppliedPromo | null }) => (
  <div className="space-y-3 text-sm">
    <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1">
      <p className="font-semibold">Digitalni memorijal, jednokratno. Bez pretplate i naknade za obnovu.</p>
      {promo && promo.discount_amount > 0 && <p>Cijena: <span className="line-through">{formatEur(MEMORIAL_PRICE_EUR)}</span> · popust ({promo.code}): −{formatEur(promo.discount_amount)}</p>}
      <p>Konačni iznos: <strong>{formatEur(promo ? promo.final_price : currentMemorialPrice())}</strong></p>
      <p className="text-muted-foreground">Uključuje fotografije, videozapise, tekstove i naknadno uređivanje. Memorijal se čuva trajno, bez roka isteka. Fotografije u formatu JPG, PNG ili WEBP do 8 MB po datoteci; videozapisi se dodaju kao poveznica (npr. YouTube).</p>
    </div>
    <label className="flex items-start gap-3">
      <Checkbox checked={value.termsAccepted} onCheckedChange={(v) => onChange({ ...value, termsAccepted: v === true })} className="mt-0.5" aria-required="true" />
      <span>Prihvaćam <Link to="/uvjeti-koristenja" target="_blank" className="text-primary underline">Uvjete korištenja i kupnje</Link>. *</span>
    </label>
    <label className="flex items-start gap-3">
      <Checkbox checked={value.immediateStart} onCheckedChange={(v) => onChange({ ...value, immediateStart: v === true })} className="mt-0.5" />
      <span><strong>Objavite memorijal odmah nakon plaćanja.</strong> Tražim da usluga započne prije isteka roka od 14 dana za jednostrani raskid.</span>
    </label>
    <p className="text-muted-foreground pl-7">Pravo na odustajanje u roku od 14 dana ostaje dostupno prema našim uvjetima.</p>
    {/* The box may not be pre-ticked (consumer law), so the later date is spelled out plainly. */}
    {value.immediateStart ? (
      <p className="rounded-md bg-accent/20 p-2">Memorijal će biti vidljiv odmah nakon plaćanja.</p>
    ) : (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2">
        <strong>Pažnja:</strong> bez kvačice iznad memorijal će biti vidljiv tek <strong>{startDate()}</strong>, nakon isteka roka od 14 dana.
        {activeSeasonalPromo() && ` Ako ga želite imati za blagdan ${activeSeasonalPromo()!.occasion}, označite kvačicu.`}
      </p>
    )}
    <p className="text-xs text-muted-foreground">Obrada podataka opisana je u <Link to="/politika-privatnosti" target="_blank" className="underline">Politici privatnosti</Link>.</p>
  </div>
);
export default PurchaseTerms;
