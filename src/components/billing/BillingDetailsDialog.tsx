import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import PromoCodeField from '@/components/promo/PromoCodeField';
import { formatEur, type AppliedPromo } from '@/lib/promo';
import { MEMORIAL_PRICE_EUR } from '@/lib/memorial';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  BILLING_EVENT, cancelBillingRequest, fetchBillingDetails, resolveBillingRequest, saveBillingDetails,
  type BillingDetailsInput,
} from '@/lib/billing';

const base = {
  full_name: z.string().trim().min(2, 'Unesite ime i prezime').max(120),
  email: z.string().trim().email('Unesite ispravnu e-mail adresu').max(255),
  address: z.string().trim().min(3, 'Unesite adresu').max(160),
  postal_code: z.string().trim().min(3, 'Unesite poštanski broj').max(20),
  city: z.string().trim().min(2, 'Unesite grad').max(80),
  country: z.string().trim().min(2, 'Unesite državu').max(60),
};

const individualSchema = z.object({ ...base, customer_type: z.literal('individual') });
const companySchema = z.object({
  ...base,
  customer_type: z.literal('company'),
  company_name: z.string().trim().min(2, 'Unesite naziv tvrtke').max(160),
  oib: z.string().trim().regex(/^\d{11}$/, 'OIB mora imati 11 brojeva'),
  vat_id: z.string().trim().max(30).optional().or(z.literal('')),
});

const empty = {
  customer_type: 'individual' as 'individual' | 'company',
  full_name: '',
  email: '',
  address: '',
  postal_code: '',
  city: '',
  country: 'Hrvatska',
  company_name: '',
  oib: '',
  vat_id: '',
};

/** Collects billing data before Stripe checkout. Mounted once, driven by requestBillingDetails(). */
const BillingDetailsDialog = () => {
  const { user: accountUser, guestUser, profile } = useAuth();
  // Guests who started a memorial without registering fill in billing too.
  const user = accountUser ?? guestUser;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [memorialId, setMemorialId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [presetPromo, setPresetPromo] = useState<string | null>(null);

  useEffect(() => {
    const handler = async (event: Event) => {
      const detail = (event as CustomEvent<{ memorialId: string; promoCode?: string | null }>).detail;
      const id = detail?.memorialId;
      if (!id) return;
      setPromo(null);
      setPresetPromo(detail?.promoCode ?? null);
      setMemorialId(id);
      const existing = await fetchBillingDetails(id);
      setForm({
        ...empty,
        full_name: (existing?.full_name as string) ?? [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
        email: (existing?.email as string) ?? profile?.email ?? user?.email ?? '',
        customer_type: ((existing?.customer_type as 'individual' | 'company') ?? 'individual'),
        address: (existing?.address as string) ?? '',
        postal_code: (existing?.postal_code as string) ?? '',
        city: (existing?.city as string) ?? '',
        country: (existing?.country as string) ?? 'Hrvatska',
        company_name: (existing?.company_name as string) ?? '',
        oib: (existing?.oib as string) ?? '',
        vat_id: (existing?.vat_id as string) ?? '',
      });
      setOpen(true);
    };
    window.addEventListener(BILLING_EVENT, handler);
    return () => window.removeEventListener(BILLING_EVENT, handler);
  }, [profile, user]);

  const set = (key: keyof typeof empty) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const close = (cancelled: boolean) => {
    setOpen(false);
    if (cancelled) cancelBillingRequest();
  };

  const submit = async () => {
    if (!memorialId || !user) return;
    // 100 % promo code: nothing to invoice, no billing data needed.
    if (promo?.free) {
      setOpen(false);
      resolveBillingRequest(promo.code);
      return;
    }
    const schema = form.customer_type === 'company' ? companySchema : individualSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: 'Provjerite podatke',
        description: Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? 'Nepotpuni podaci.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await saveBillingDetails(memorialId, user.id, parsed.data as unknown as BillingDetailsInput);
      setOpen(false);
      resolveBillingRequest(promo?.code ?? presetPromo);
    } catch (error) {
      toast({ title: 'Podatke nije moguće spremiti', description: String(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close(true))}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Podaci za račun</DialogTitle>
          <DialogDescription>Provjerite podatke za račun i upišite promo kod ako ga imate.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto px-2">
          <div className="pb-2 border-b border-border">
            {/* The code chosen in the previous step is re-validated here, so the button shows the real price. */}
            <PromoCodeField
              productType="memorial"
              productLabel="Digitalni memorijal"
              basePrice={MEMORIAL_PRICE_EUR}
              applied={promo}
              onApplied={(applied) => { setPromo(applied); if (!applied) setPresetPromo(null); }}
              autoCode={presetPromo}
            />
          </div>
          {!promo?.free && (<>
          <div>
            <Label htmlFor="bd-name">Ime i prezime *</Label>
            <Input id="bd-name" value={form.full_name} maxLength={120} onChange={(e) => set('full_name')(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bd-email">E-mail *</Label>
            <Input id="bd-email" type="email" value={form.email} maxLength={255} onChange={(e) => set('email')(e.target.value)} />
          </div>
          <label htmlFor="bd-company-check" className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer">
            <Checkbox
              id="bd-company-check"
              checked={form.customer_type === 'company'}
              onCheckedChange={(v) => set('customer_type')(v === true ? 'company' : 'individual')}
            />
            <span className="text-sm font-medium">Kupujem kao pravna osoba (tvrtka)</span>
          </label>
          {form.customer_type === 'company' && (
            <>
              <div>
                <Label htmlFor="bd-company">Naziv tvrtke *</Label>
                <Input id="bd-company" value={form.company_name} maxLength={160} onChange={(e) => set('company_name')(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bd-oib">OIB *</Label>
                  <Input id="bd-oib" value={form.oib} maxLength={11} onChange={(e) => set('oib')(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div>
                  <Label htmlFor="bd-vat">VAT ID</Label>
                  <Input id="bd-vat" value={form.vat_id} maxLength={30} onChange={(e) => set('vat_id')(e.target.value)} />
                </div>
              </div>
            </>
          )}
          <div>
            <Label htmlFor="bd-address">Adresa *</Label>
            <Input id="bd-address" value={form.address} maxLength={160} onChange={(e) => set('address')(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bd-zip">Poštanski broj *</Label>
              <Input id="bd-zip" value={form.postal_code} maxLength={20} onChange={(e) => set('postal_code')(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bd-city">Grad *</Label>
              <Input id="bd-city" value={form.city} maxLength={80} onChange={(e) => set('city')(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="bd-country">Država *</Label>
            <Input id="bd-country" value={form.country} maxLength={60} onChange={(e) => set('country')(e.target.value)} />
          </div>
          </>)}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(true)} disabled={saving}>Odustani</Button>
          <Button variant="gold" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {promo ? (promo.free ? 'Aktiviraj besplatno' : `Naruči i plati ${formatEur(promo.final_price)}`) : 'Naruči i plati 39,00 €'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BillingDetailsDialog;
