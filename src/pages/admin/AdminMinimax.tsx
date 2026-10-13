import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, PlugZap, RefreshCw, Save } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminGuard from '@/components/admin/AdminGuard';

interface Settings {
  id: string;
  minimax_organisation_id: string | null;
  default_customer_type: string;
  default_item_name: string;
  default_item_code: string | null;
  default_vat_rate: number;
  vat_exempt: boolean;
  default_currency: string;
  default_payment_method: string;
  document_numbering: string | null;
  auto_issue: boolean;
  send_email_to_customer: boolean;
}

const SECRETS = [
  ['MINIMAX_CLIENT_ID', 'Minimax → Postavke → API / razvojni pristup (Client ID aplikacije)'],
  ['MINIMAX_CLIENT_SECRET', 'Isto mjesto kao Client ID — vidljiv samo pri kreiranju aplikacije'],
  ['MINIMAX_USERNAME', 'Minimax → Moj profil → Uredi osnovne podatke → Lozinke za pristup vanjskim aplikacijama. Korisničko ime koje ste sami zadali za API, ne e-mail za prijavu.'],
  ['MINIMAX_PASSWORD', 'Lozinka te API aplikacije, ne lozinka za prijavu u Minimax.'],
  ['MINIMAX_ORGANIZATION_ID', 'Minimax → Organizacija (ID organizacije, vidljiv i preko API-ja)'],
  ['MINIMAX_API_BASE_URL', 'https://moj.minimax.hr/HR/API'],
];

const AdminMinimaxInner = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<'loading' | 'connected' | 'not_configured' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadStatus = async () => {
    setStatus('loading');
    const { data, error } = await supabase.functions.invoke('minimax-admin', { body: { action: 'status' } });
    if (error) { setStatus('error'); setStatusMessage(error.message); return; }
    setStatus(data.status);
    setStatusMessage(data.message ?? null);
  };

  useEffect(() => {
    document.title = 'Minimax integracija | Admin';
    (async () => {
      const { data } = await supabase.from('invoice_settings').select('*').limit(1).maybeSingle();
      setSettings((data as Settings) ?? null);
      await loadStatus();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!settings) return;
    setBusy('save');
    const { id, ...rest } = settings;
    const { error } = await supabase.from('invoice_settings').update(rest).eq('id', id);
    setBusy(null);
    toast(error
      ? { title: 'Spremanje nije uspjelo', description: error.message, variant: 'destructive' }
      : { title: 'Postavke su spremljene.' });
  };

  const call = async (action: string, label: string) => {
    setBusy(action);
    const { data, error } = await supabase.functions.invoke('minimax-admin', { body: { action } });
    setBusy(null);
    if (error) { toast({ title: `${label} nije uspjelo`, description: error.message, variant: 'destructive' }); return; }
    if (action === 'test_connection') {
      toast(data.ok
        ? { title: '✓ Minimax connection successful' }
        : { title: 'Minimax connection failed', description: data.message, variant: 'destructive' });
      await loadStatus();
      return;
    }
    if (action === 'process_pending') {
      toast({ title: `Processed: ${data.processed}`, description: `Issued: ${data.issued} · Failed: ${data.failed}` });
    }
  };

  const badge = {
    loading: { text: 'Provjeravam…', className: 'text-muted-foreground', Icon: Loader2 },
    connected: { text: 'Connected', className: 'text-emerald-600', Icon: CheckCircle2 },
    not_configured: { text: 'Not configured', className: 'text-amber-600', Icon: AlertCircle },
    error: { text: 'Connection error', className: 'text-destructive', Icon: AlertCircle },
  }[status];

  const field = (key: keyof Settings, label: string, type = 'text') => (
    <div>
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={(settings?.[key] as string | number | null) ?? ''}
        onChange={(e) =>
          setSettings((prev) => prev && { ...prev, [key]: type === 'number' ? Number(e.target.value) : e.target.value })
        }
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">MINIMAX</h1>
          <p className={`mt-2 flex items-center gap-2 text-sm ${badge.className}`}>
            <badge.Icon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} /> ● {badge.text}
          </p>
          {statusMessage && <p className="text-xs text-muted-foreground mt-1 break-words">{statusMessage}</p>}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => call('test_connection', 'Test connection')} disabled={busy === 'test_connection'}>
            <PlugZap className="h-4 w-4 mr-2" /> TEST CONNECTION
          </Button>
          <Button variant="outline" onClick={() => call('process_pending', 'Obrada računa')} disabled={busy === 'process_pending'}>
            <RefreshCw className={`h-4 w-4 mr-2 ${busy === 'process_pending' ? 'animate-spin' : ''}`} /> PROCESS PENDING INVOICES
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Minimax configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {settings ? (
              <>
                {field('minimax_organisation_id', 'Organization ID')}
                {field('default_customer_type', 'Default customer type (individual / company)')}
                {field('default_item_name', 'Default item / service')}
                {field('default_vat_rate', 'Default VAT rate (%)', 'number')}
                {field('default_currency', 'Default currency')}
                {field('default_payment_method', 'Default payment method')}
                {field('document_numbering', 'Invoice numbering / business unit')}
                <div className="flex items-center justify-between border-t pt-4">
                  <Label htmlFor="vat_exempt">VAT exempt / nisam u sustavu PDV-a</Label>
                  <Switch id="vat_exempt" checked={settings.vat_exempt}
                    onCheckedChange={(v) => setSettings({ ...settings, vat_exempt: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto_issue">Automatsko izdavanje nakon uplate</Label>
                  <Switch id="auto_issue" checked={settings.auto_issue}
                    onCheckedChange={(v) => setSettings({ ...settings, auto_issue: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="send_email">Pošalji račun kupcu e-mailom</Label>
                  <Switch id="send_email" checked={settings.send_email_to_customer}
                    onCheckedChange={(v) => setSettings({ ...settings, send_email_to_customer: v })} />
                </div>
                <Button variant="gold" onClick={save} disabled={busy === 'save'}>
                  <Save className="h-4 w-4 mr-2" /> Spremi postavke
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Postavke se učitavaju…</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tajni podaci (Supabase Secrets)</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Add these values to Supabase Secrets. Nikada se ne prikazuju u aplikaciji nakon spremanja.
            </p>
            <ul className="space-y-2">
              {SECRETS.map(([name, where]) => (
                <li key={name} className="border rounded-md p-3">
                  <code className="font-mono text-xs">{name}</code>
                  <p className="text-muted-foreground text-xs mt-1">{where}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

const AdminMinimax = () => (
  <AdminGuard>
    <AdminMinimaxInner />
  </AdminGuard>
);

export default AdminMinimax;
