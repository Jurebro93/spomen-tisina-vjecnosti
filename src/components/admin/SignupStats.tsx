import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Signup = {
  email: string; at: string; source: 'popup' | 'form';
  newsletter: boolean; active: boolean; promo: string | null;
};
type Preset = '7' | '30' | '90' | 'all';

const TZ = 'Europe/Zagreb';
const dt = (v: string) => new Date(v).toLocaleString('hr-HR', { timeZone: TZ });
const num = (v: number) => new Intl.NumberFormat('hr-HR').format(v);
const PAGE = 1000;

async function fetchAll(table: string, columns: string) {
  const rows: any[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase.from(table as never).select(columns)
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    rows.push(...((data as any[]) ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

// Combines popup discount signups and newsletter subscribers (footer and page forms) into one list per email.
function merge(popup: any[], newsletter: any[]): Signup[] {
  const byEmail = new Map<string, Signup>();
  for (const p of popup) {
    byEmail.set(p.email, { email: p.email, at: p.created_at, source: 'popup', newsletter: !!p.newsletter_opt_in, active: !!p.newsletter_opt_in, promo: p.promo_code });
  }
  for (const n of newsletter) {
    const existing = byEmail.get(n.email);
    if (existing) { existing.newsletter = true; existing.active = !!n.active; continue; }
    byEmail.set(n.email, { email: n.email, at: n.subscribed_at, source: 'form', newsletter: true, active: !!n.active, promo: null });
  }
  return [...byEmail.values()].sort((a, b) => b.at.localeCompare(a.at));
}

const SignupStats = () => {
  const [all, setAll] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>('30');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [popup, newsletter] = await Promise.all([
        fetchAll('discount_signups', 'email, created_at, newsletter_opt_in, promo_code'),
        fetchAll('newsletter_users', 'email, subscribed_at, active').catch(() => null),
      ]);
      setAll(merge(popup, newsletter ?? []));
      if (!newsletter) setErr('Pretplatnike s obrazaca na stranici trenutačno nije moguće učitati; prikazane su samo prijave s pop-upa.');
    } catch (e: any) {
      setErr(e?.message ?? 'Prijave nije moguće učitati.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const inRange = useMemo(() => {
    if (preset === 'all') return all;
    const since = Date.now() - Number(preset) * 86400000;
    return all.filter((s) => new Date(s.at).getTime() >= since);
  }, [all, preset]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? inRange.filter((s) => s.email.includes(needle)) : inRange;
  }, [inRange, q]);

  const totalNewsletter = all.filter((s) => s.newsletter && s.active).length;
  const metrics = [
    { label: 'Sve prijave u razdoblju', v: inRange.length },
    { label: 'Prijave preko pop-upa (kod za popust)', v: inRange.filter((s) => s.source === 'popup').length },
    { label: 'Prijave preko obrasca na stranici', v: inRange.filter((s) => s.source === 'form').length },
    { label: 'Novi pretplatnici newslettera', v: inRange.filter((s) => s.newsletter).length },
  ];

  const exportCsv = () => {
    const esc = (v: any) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [['Datum', 'E-mail', 'Izvor', 'Newsletter', 'Promo kod'],
      ...shown.map((s) => [dt(s.at), s.email, s.source === 'popup' ? 'Pop-up' : 'Obrazac na stranici', s.newsletter ? (s.active ? 'da' : 'odjavljen') : 'ne', s.promo])];
    const body = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `prijave-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Zadnjih 7 dana</SelectItem>
            <SelectItem value="30">Zadnjih 30 dana</SelectItem>
            <SelectItem value="90">Zadnjih 90 dana</SelectItem>
            <SelectItem value="all">Sve vrijeme</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="ml-2">Osvježi</span>
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!shown.length}>
          <Download className="h-4 w-4" /><span className="ml-2">Preuzmi CSV</span>
        </Button>
        <span className="text-sm text-muted-foreground">Ukupno aktivnih pretplatnika newslettera: <strong className="text-foreground">{num(totalNewsletter)}</strong></span>
      </div>

      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-2xl font-semibold">{num(m.v)}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-lg">Popis prijava</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Traži e-mail..." className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Datum</TableHead><TableHead>E-mail</TableHead><TableHead>Izvor</TableHead>
              <TableHead>Newsletter</TableHead><TableHead>Promo kod</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {shown.map((s) => (
                <TableRow key={s.email}>
                  <TableCell className="whitespace-nowrap">{dt(s.at)}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.source === 'popup' ? 'Pop-up' : 'Obrazac na stranici'}</TableCell>
                  <TableCell>{s.newsletter
                    ? <Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Da' : 'Odjavljen'}</Badge>
                    : <Badge variant="outline">Ne</Badge>}</TableCell>
                  <TableCell className="font-mono text-xs">{s.promo ?? '—'}</TableCell>
                </TableRow>
              ))}
              {!shown.length && !loading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nema prijava u odabranom razdoblju.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupStats;
