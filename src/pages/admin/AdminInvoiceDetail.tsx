import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Download, Mail, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminGuard from '@/components/admin/AdminGuard';
import { statusVariant } from './AdminInvoices';

interface LogRow {
  id: string;
  event: string;
  status: string | null;
  message: string | null;
  external_id: string | null;
  created_at: string;
}

const AdminInvoiceDetailInner = () => {
  const { id = '' } = useParams();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Record<string, any> | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: inv }, { data: log }] = await Promise.all([
      supabase.from('invoices').select('*').eq('id', id).maybeSingle(),
      supabase.from('invoice_logs').select('*').eq('invoice_id', id).order('created_at', { ascending: false }),
    ]);
    setInvoice(inv ?? null);
    setLogs((log as LogRow[]) ?? []);
  };

  useEffect(() => {
    document.title = 'Detalji računa | Admin';
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const call = async (action: string, label: string) => {
    setBusy(action);
    const { data, error } = await supabase.functions.invoke('minimax-admin', { body: { action, invoice_id: id } });
    setBusy(null);
    if (error || data?.error) {
      toast({ title: `${label} nije uspjelo`, description: error?.message ?? data?.error, variant: 'destructive' });
    } else {
      toast({ title: `${label} završeno`, description: data?.reason ?? undefined });
    }
    await load();
  };

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center text-muted-foreground">Učitavanje…</main>
        <Footer />
      </div>
    );
  }

  const row = (label: string, value: unknown) => (
    <div className="flex justify-between gap-4 py-1.5 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-all">{value ? String(value) : '—'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-4xl space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/invoices"><ArrowLeft className="h-4 w-4 mr-2" /> Svi računi</Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Račun {invoice.minimax_invoice_number ?? invoice.id.slice(0, 8)}</h1>
          <Badge variant={statusVariant(invoice.invoice_status)}>{invoice.invoice_status}</Badge>
          <Badge variant="outline">{invoice.stripe_livemode ? 'Stripe LIVE' : 'Stripe TEST'}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => call('retry', 'Retry Minimax')} disabled={busy === 'retry'}>
            <RefreshCw className={`h-4 w-4 mr-2 ${busy === 'retry' ? 'animate-spin' : ''}`} /> Retry Minimax
          </Button>
          <Button variant="outline" onClick={() => call('resend_email', 'Ponovno slanje računa')} disabled={busy === 'resend_email'}>
            <Mail className="h-4 w-4 mr-2" /> Send invoice again
          </Button>
          {invoice.minimax_pdf_url && (
            <Button asChild variant="outline">
              <a href={invoice.minimax_pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" /> Download invoice
              </a>
            </Button>
          )}
          {invoice.minimax_invoice_id && (
            <Button asChild variant="outline">
              <a href="https://moj.minimax.hr" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Open in Minimax
              </a>
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Kupac</CardTitle></CardHeader>
            <CardContent>
              {row('Vrsta', invoice.customer_type)}
              {row('Ime', invoice.customer_name)}
              {row('Tvrtka', invoice.customer_company)}
              {row('OIB', invoice.customer_oib)}
              {row('VAT ID', invoice.customer_vat_id)}
              {row('E-mail', invoice.customer_email)}
              {row('Adresa', invoice.customer_address)}
              {row('Poštanski broj', invoice.customer_postal_code)}
              {row('Grad', invoice.customer_city)}
              {row('Država', invoice.customer_country)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Kupnja i Stripe</CardTitle></CardHeader>
            <CardContent>
              {row('Proizvod', invoice.product_name)}
              {row('Neto', invoice.amount_net)}
              {row('PDV', `${invoice.tax_rate ?? 0}% (${invoice.tax_amount ?? 0})`)}
              {row('Ukupno', `${Number(invoice.amount_gross).toFixed(2)} ${invoice.currency}`)}
              {row('Način plaćanja', invoice.payment_method)}
              {row('Datum uplate', invoice.stripe_paid_at && new Date(invoice.stripe_paid_at).toLocaleString('hr-HR'))}
              {row('Checkout session', invoice.stripe_checkout_session_id)}
              {row('Payment intent', invoice.stripe_payment_intent_id)}
              {row('Refund ID', invoice.stripe_refund_id)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Minimax</CardTitle></CardHeader>
            <CardContent>
              {row('Minimax invoice ID', invoice.minimax_invoice_id)}
              {row('Broj računa', invoice.minimax_invoice_number)}
              {row('Document ID', invoice.minimax_document_id)}
              {row('JIR', invoice.jir)}
              {row('ZKI', invoice.zki)}
              {row('Fiskalizacija', invoice.fiscalization_status)}
              {row('Pokušaji', invoice.retry_count)}
              {row('Sljedeći pokušaj', invoice.next_retry_at && new Date(invoice.next_retry_at).toLocaleString('hr-HR'))}
              {row('E-mail poslan', invoice.email_sent_at && new Date(invoice.email_sent_at).toLocaleString('hr-HR'))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Error log</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {invoice.error_message && (
                <p className="text-sm text-destructive break-words">{invoice.error_message}</p>
              )}
              <div className="max-h-72 overflow-y-auto space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="text-xs border rounded p-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{l.event}</span>
                      <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString('hr-HR')}</span>
                    </div>
                    <p className="text-muted-foreground">{l.status}{l.message ? ` · ${l.message}` : ''}</p>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-sm text-muted-foreground">Nema zapisa.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const AdminInvoiceDetail = () => (
  <AdminGuard><AdminInvoiceDetailInner /></AdminGuard>
);

export default AdminInvoiceDetail;
