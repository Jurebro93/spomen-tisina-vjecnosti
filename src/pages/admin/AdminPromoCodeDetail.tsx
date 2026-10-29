import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import AdminGuard from '@/components/admin/AdminGuard';
import {
  DISCOUNT_TYPE_LABELS, PRODUCT_TYPE_LABELS, PROMO_STATUS_LABELS, discountValueLabel, formatEur,
  promoStatus, type PromoCode, type PromoProductType, type PromoUsage,
} from '@/lib/promo';

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('hr-HR') : '—';

const AdminPromoCodeDetailInner = () => {
  const { id } = useParams();
  const [code, setCode] = useState<PromoCode | null>(null);
  const [usage, setUsage] = useState<PromoUsage[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [creator, setCreator] = useState<string>('—');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    document.title = 'Promo kod | Admin';
    (async () => {
      setLoading(true);
      const [{ data: codeRow }, { data: usageRows }] = await Promise.all([
        supabase.from('promo_codes').select('*').eq('id', id).maybeSingle(),
        supabase.from('promo_code_usage').select('*').eq('promo_code_id', id).order('used_at', { ascending: false }),
      ]);
      setCode((codeRow as PromoCode) ?? null);
      const rows = (usageRows as PromoUsage[]) ?? [];
      setUsage(rows);

      if (codeRow?.created_by_admin_id) {
        const { data: admin } = await supabase.from('admin_users').select('name, email').eq('id', codeRow.created_by_admin_id).maybeSingle();
        if (admin) setCreator(admin.name || admin.email);
      }

      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
      if (userIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, email, first_name, last_name').in('id', userIds);
        const map: Record<string, string> = {};
        (profiles ?? []).forEach((p: { id: string; email: string | null; first_name: string | null; last_name: string | null }) => {
          map[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id;
        });
        setEmails(map);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>
        <Footer />
      </div>
    );
  }

  if (!code) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Promo kod nije pronađen.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/admin/promo-kodovi">Natrag na promo kodove</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const status = promoStatus(code);
  const discountTotal = usage.reduce((sum, u) => sum + Number(u.discount_amount ?? 0), 0);

  const details: Array<[string, string]> = [
    ['Vrsta', DISCOUNT_TYPE_LABELS[code.discount_type]],
    ['Vrijednost popusta', discountValueLabel(code)],
    ['Vrijedi za', PRODUCT_TYPE_LABELS[code.product_type]],
    ['Kreirao', creator],
    ['Datum kreiranja', formatDateTime(code.created_at)],
    ['Datum isteka', code.expires_at ? formatDateTime(code.expires_at) : 'Ne istječe'],
    ['Limit korištenja', code.max_uses === null ? 'Neograničeno' : String(code.max_uses)],
    ['Limit po korisniku', String(code.max_uses_per_user)],
    ['Trenutačni broj korištenja', String(usage.length)],
    ['Ukupan iznos popusta', formatEur(discountTotal)],
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/admin/promo-kodovi"><ArrowLeft className="h-4 w-4 mr-2" />Promo kodovi</Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="font-serif text-2xl md:text-3xl">{code.code}</h1>
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>{PROMO_STATUS_LABELS[status]}</Badge>
        </div>

        <Card className="border-border mb-8">
          <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-border/60 pb-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <h2 className="font-serif text-xl mb-3">Povijest korištenja</h2>
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Korisnik</TableHead>
                <TableHead>Proizvod</TableHead>
                <TableHead className="text-right">Originalna cijena</TableHead>
                <TableHead className="text-right">Popust</TableHead>
                <TableHead className="text-right">Konačna cijena</TableHead>
                <TableHead>Datum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.user_id ? emails[row.user_id] ?? row.user_id : 'Gost'}</TableCell>
                  <TableCell>{PRODUCT_TYPE_LABELS[row.product_type as PromoProductType] ?? row.product_type}</TableCell>
                  <TableCell className="text-right">{formatEur(Number(row.original_price))}</TableCell>
                  <TableCell className="text-right">-{formatEur(Number(row.discount_amount))}</TableCell>
                  <TableCell className="text-right">{formatEur(Number(row.final_price))}</TableCell>
                  <TableCell>{formatDateTime(row.used_at)}</TableCell>
                </TableRow>
              ))}
              {!usage.length && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Kod još nije korišten.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const AdminPromoCodeDetail = () => (
  <AdminGuard><AdminPromoCodeDetailInner /></AdminGuard>
);

export default AdminPromoCodeDetail;
