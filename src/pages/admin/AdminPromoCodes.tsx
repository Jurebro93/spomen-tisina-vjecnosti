import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, ShieldCheck, Sparkles, Tag, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AdminGuard from '@/components/admin/AdminGuard';
import {
  DISCOUNT_TYPE_LABELS, PRODUCT_TYPE_LABELS, PROMO_STATUS_LABELS, discountValueLabel, formatEur,
  generatePromoCode, promoStatus, type PromoCode, type PromoDiscountType, type PromoProductType, type PromoUsage,
} from '@/lib/promo';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('hr-HR') : '—');

const AdminPromoCodesInner = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [usage, setUsage] = useState<PromoUsage[]>([]);
  const [admins, setAdmins] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage' as PromoDiscountType,
    discount_value: '20',
    product_type: 'memorial' as PromoProductType,
    expires_at: '',
    max_uses: '',
    max_uses_per_user: '1',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: codeRows }, { data: usageRows }, { data: adminRows }] = await Promise.all([
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('promo_code_usage').select('*'),
      supabase.from('admin_users').select('id, name, email'),
    ]);
    setCodes((codeRows as PromoCode[]) ?? []);
    setUsage((usageRows as PromoUsage[]) ?? []);
    const map: Record<string, string> = {};
    (adminRows ?? []).forEach((a: { id: string; name: string | null; email: string }) => {
      map[a.id] = a.name || a.email;
    });
    setAdmins(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    document.title = 'Promo kodovi | Admin';
    load();
  }, [load]);

  const stats = useMemo(() => {
    const active = codes.filter((c) => promoStatus(c) === 'active').length;
    const freeUses = usage.filter((u) => Number(u.final_price) <= 0).length;
    const discountTotal = usage.reduce((sum, u) => sum + Number(u.discount_amount ?? 0), 0);
    return { active, uses: usage.length, freeUses, discountTotal };
  }, [codes, usage]);

  const usesFor = (id: string) => usage.filter((u) => u.promo_code_id === id).length;

  const createCode = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) {
      toast({ title: 'Unesite ili generirajte promo kod.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data: me } = await supabase.from('admin_users').select('id').eq('user_id', user?.id ?? '').maybeSingle();
    const { error } = await supabase.from('promo_codes').insert({
      code,
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'free' ? 100 : Number(form.discount_value || 0),
      product_type: form.product_type,
      expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null,
      max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
      max_uses_per_user: Number(form.max_uses_per_user || 1),
      created_by_admin_id: me?.id ?? null,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast({
        title: 'Promo kod nije kreiran',
        description: error.message.includes('duplicate') || error.code === '23505'
          ? 'Promo kod s tim nazivom već postoji.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Promo kod je kreiran' });
    setForm({ ...form, code: '' });
    setOpen(false);
    load();
  };

  const toggleActive = async (code: PromoCode) => {
    const { error } = await supabase.from('promo_codes').update({ active: !code.active }).eq('id', code.id);
    if (error) {
      toast({ title: 'Promjena nije uspjela', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const deleteCode = async (code: PromoCode) => {
    if (usesFor(code.id) > 0) return;
    if (!window.confirm(`Obrisati promo kod ${code.code}?`)) return;
    const { error } = await supabase.from('promo_codes').delete().eq('id', code.id);
    if (error) {
      toast({ title: 'Brisanje nije uspjelo', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Promo kod je obrisan' });
    load();
  };

  const statCards = [
    ['Aktivni promo kodovi', String(stats.active)],
    ['Ukupno iskorištenja', String(stats.uses)],
    ['Besplatni memorijali/osmrtnice', String(stats.freeUses)],
    ['Ukupan iznos popusta', formatEur(stats.discountTotal)],
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="font-serif text-2xl md:text-3xl flex items-center gap-2">
            <Tag className="h-6 w-6 text-accent" /> Promo kodovi
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/admin/administratori"><ShieldCheck className="h-4 w-4 mr-2" />Administratori</Link></Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Kreiraj promo kod</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Kreiraj promo kod</DialogTitle>
                  <DialogDescription>Kodovi ne razlikuju velika i mala slova.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="code">Kod *</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input id="code" value={form.code} className="uppercase"
                        placeholder="npr. PARTNER20"
                        onChange={(e) => setForm({ ...form, code: e.target.value })} />
                      <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: generatePromoCode() })}>
                        <Sparkles className="h-4 w-4 mr-2" />Generiraj kod
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Vrsta pogodnosti *</Label>
                      <Select value={form.discount_type}
                        onValueChange={(v) => setForm({ ...form, discount_type: v as PromoDiscountType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="value">
                        {form.discount_type === 'percentage' ? 'Popust u % *' : form.discount_type === 'fixed' ? 'Popust u € *' : 'Vrijednost'}
                      </Label>
                      <Input id="value" type="number" min="0" value={form.discount_type === 'free' ? '100' : form.discount_value}
                        disabled={form.discount_type === 'free'}
                        onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Vrijedi za *</Label>
                    <Select value={form.product_type}
                      onValueChange={(v) => setForm({ ...form, product_type: v as PromoProductType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="expires">Vrijedi do</Label>
                      <Input id="expires" type="date" value={form.expires_at}
                        onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="max">Maks. korištenja</Label>
                      <Input id="max" type="number" min="1" placeholder="Neograničeno" value={form.max_uses}
                        onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="maxuser">Po korisniku</Label>
                      <Input id="maxuser" type="number" min="1" value={form.max_uses_per_user}
                        onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createCode} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Kreiraj
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {statCards.map(([label, value]) => (
            <Card key={label} className="border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Vrsta</TableHead>
                  <TableHead>Vrijednost</TableHead>
                  <TableHead>Vrijedi za</TableHead>
                  <TableHead className="text-right">Korištenja</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead>Vrijedi do</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kreirao</TableHead>
                  <TableHead>Kreiran</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const status = promoStatus(code);
                  const uses = usesFor(code.id);
                  return (
                    <TableRow key={code.id}>
                      <TableCell className="font-medium">
                        <Link to={`/admin/promo-kodovi/${code.id}`} className="hover:underline">{code.code}</Link>
                      </TableCell>
                      <TableCell>{DISCOUNT_TYPE_LABELS[code.discount_type]}</TableCell>
                      <TableCell>{discountValueLabel(code)}</TableCell>
                      <TableCell>{PRODUCT_TYPE_LABELS[code.product_type]}</TableCell>
                      <TableCell className="text-right">{uses}</TableCell>
                      <TableCell className="text-right">{code.max_uses ?? '∞'}</TableCell>
                      <TableCell>{formatDate(code.expires_at)}</TableCell>
                      <TableCell>
                        <Badge variant={status === 'active' ? 'default' : 'secondary'}>{PROMO_STATUS_LABELS[status]}</Badge>
                      </TableCell>
                      <TableCell>{code.created_by_admin_id ? admins[code.created_by_admin_id] ?? '—' : '—'}</TableCell>
                      <TableCell>{formatDate(code.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button asChild size="sm" variant="ghost"><Link to={`/admin/promo-kodovi/${code.id}`}>Pogledaj</Link></Button>
                          <Button size="sm" variant="outline" onClick={() => toggleActive(code)}>
                            {code.active ? 'Deaktiviraj' : 'Aktiviraj'}
                          </Button>
                          {uses === 0 && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCode(code)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!codes.length && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Još nema promo kodova.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const AdminPromoCodes = () => (
  <AdminGuard><AdminPromoCodesInner /></AdminGuard>
);

export default AdminPromoCodes;
