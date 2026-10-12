import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Search, Settings2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import AdminGuard from '@/components/admin/AdminGuard';

export interface InvoiceRow {
  id: string;
  created_at: string;
  stripe_paid_at: string | null;
  customer_name: string;
  customer_email: string;
  product_name: string;
  amount_gross: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  minimax_invoice_number: string | null;
  minimax_invoice_id: string | null;
  fiscalization_status: string;
  invoice_status: string;
}

const FILTERS = [
  ['all', 'Sve'],
  ['pending', 'Pending'],
  ['issued', 'Issued'],
  ['failed', 'Failed'],
  ['manual_required', 'Manual required'],
  ['refunded', 'Refunded'],
  ['free', 'Besplatno (promo kod)'],
];

export const statusVariant = (status: string) =>
  status === 'issued' ? 'default' : status === 'refunded' || status === 'cancelled' ? 'secondary' : 'destructive';

const AdminInvoicesInner = () => {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Računi | Admin';
    (async () => {
      setLoading(true);
      let query = supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(500);
      if (filter !== 'all') query = query.eq('invoice_status', filter);
      const { data } = await query;
      setRows((data as InvoiceRow[]) ?? []);
      setLoading(false);
    })();
  }, [filter]);

  const needle = term.trim().toLowerCase();
  const visible = needle
    ? rows.filter((r) =>
        [r.customer_name, r.customer_email, r.minimax_invoice_number, r.stripe_payment_intent_id]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(needle))
      )
    : rows;

  const problems = rows.filter((r) => r.invoice_status === 'failed' || r.invoice_status === 'manual_required').length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Računi</h1>
          <Button asChild variant="outline">
            <Link to="/admin/integrations/minimax"><Settings2 className="h-4 w-4 mr-2" /> Minimax integracija</Link>
          </Button>
        </div>

        {problems > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> ⚠ {problems} plaćanje uspješno, ali račun nije izdan.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([value, label]) => (
            <Button key={value} size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>
              {label}
            </Button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Ime, e-mail, broj računa ili Stripe ID" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                {['Datum', 'Kupac', 'Email', 'Proizvod', 'Iznos', 'Stripe payment', 'Broj računa', 'Minimax ID', 'Fiskalizacija', 'Status', 'Akcije'].map((h) => (
                  <th key={h} className="px-3 py-2 whitespace-nowrap font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Učitavanje…</td></tr>}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Nema računa.</td></tr>
              )}
              {visible.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.stripe_paid_at ?? r.created_at).toLocaleDateString('hr-HR')}</td>
                  <td className="px-3 py-2">{r.customer_name || '—'}</td>
                  <td className="px-3 py-2">{r.customer_email || '—'}</td>
                  <td className="px-3 py-2">{r.product_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{Number(r.amount_gross).toFixed(2)} {r.currency}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.stripe_payment_intent_id ?? '—'}</td>
                  <td className="px-3 py-2">{r.minimax_invoice_number ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.minimax_invoice_id ?? '—'}</td>
                  <td className="px-3 py-2">{r.fiscalization_status}</td>
                  <td className="px-3 py-2"><Badge variant={statusVariant(r.invoice_status)}>{r.invoice_status}</Badge></td>
                  <td className="px-3 py-2">
                    <Button asChild size="sm" variant="outline"><Link to={`/admin/invoices/${r.id}`}>Detalji</Link></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const AdminInvoices = () => (
  <AdminGuard><AdminInvoicesInner /></AdminGuard>
);

export default AdminInvoices;
