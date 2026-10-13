import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, Info, Loader2, RefreshCw, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = {
  slug: string; title: string | null; views: number; cta_clicks: number; interactions: number; starts: number;
  checkouts: number; purchases: number; free_activations: number; revenue: number; refunded: number;
};
type SortKey = keyof Pick<Row, 'views' | 'cta_clicks' | 'starts' | 'purchases' | 'revenue'> | 'conv';

const eur = (v: number) => new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(Number(v || 0));
const num = (v: number) => new Intl.NumberFormat('hr-HR').format(Number(v || 0));
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace('.', ',')} %` : '—');
const CTA_HR: Record<string, string> = {
  final_cta: 'Završni CTA gumb', context_link: 'Poveznica u tekstu (automatska)', content_link: 'Poveznica u tekstu',
  dedication_save: 'Sačuvaj posvetu', dedication_select: 'Odabir posvete', dedication_copy: 'Kopiranje posvete', dedication_edit: 'Uređivanje posvete',
  song_save: 'Sačuvaj pjesmu', song_select: 'Odabir pjesme', anniversary_name: 'Ime pokojnika → izrada', anniversary_input: 'Unos imena pokojnika',
  '—': 'Nepoznato',
};
const INTERACTIVE_HR: Record<string, string> = {
  none: 'Bez interaktivnog elementa', dedication: 'Odabir posvete', song: 'Odabir pjesme', anniversary: 'Unos imena (godišnjica)', photos: 'Fotografije i uspomene (CTA)',
};

type Preset = '7' | '30' | '90' | 'custom';

const BlogConversions = () => {
  const { toast } = useToast();
  const [preset, setPreset] = useState<Preset>('30');
  const [cFrom, setCFrom] = useState('');
  const [cTo, setCTo] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('revenue');
  const [selected, setSelected] = useState<Row | null>(null);

  const [from, to] = useMemo(() => {
    if (preset === 'custom' && cFrom && cTo) return [new Date(`${cFrom}T00:00:00`), new Date(new Date(`${cTo}T00:00:00`).getTime() + 86400000)];
    const days = preset === 'custom' ? 30 : Number(preset);
    const end = new Date(); end.setHours(24, 0, 0, 0);
    return [new Date(end.getTime() - days * 86400000), end];
  }, [preset, cFrom, cTo]);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const { data: d, error } = await supabase.rpc('admin_blog_report' as never, { _from: from.toISOString(), _to: to.toISOString() } as never);
    if (error) setErr(error.message); else setData(d);
    setLoading(false);
  }, [from, to]);
  useEffect(() => { void load(); }, [load]);

  const t = data?.totals ?? {};
  const rows: Row[] = useMemo(() => {
    const list: Row[] = (data?.blogs ?? []).map((r: any) => ({ ...r, revenue: Number(r.revenue), refunded: Number(r.refunded) }));
    const needle = q.trim().toLowerCase();
    const f = needle ? list.filter((r) => `${r.title ?? ''} ${r.slug}`.toLowerCase().includes(needle)) : list;
    const val = (r: Row) => (sort === 'conv' ? (r.views ? r.purchases / r.views : 0) : Number(r[sort]));
    return [...f].sort((a, b) => val(b) - val(a));
  }, [data, q, sort]);

  const daily = (data?.daily ?? []).map((d: any) => ({ ...d, day: new Date(d.day).toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric' }), revenue: Number(d.revenue) }));
  const top = rows.slice().sort((a, b) => b.revenue - a.revenue || b.purchases - a.purchases || b.cta_clicks - a.cta_clicks).slice(0, 8)
    .map((r) => ({ name: (r.title ?? r.slug).slice(0, 28), prihod: r.revenue, klikovi: r.cta_clicks }));

  const funnel = [
    { label: 'Pregled bloga', v: Number(t.views ?? 0) },
    { label: 'Klik na CTA', v: Number(t.cta_clicks ?? 0) },
    { label: 'Početak izrade memorijala', v: Number(t.starts ?? 0) },
    { label: 'Plaćanje (otvoren checkout)', v: Number(t.checkouts ?? 0) },
    { label: 'Potvrđena kupnja', v: Number(t.purchases ?? 0) },
  ];

  const sortBtn = (k: SortKey, label: string) => (
    <button type="button" onClick={() => setSort(k)} className={`inline-flex items-center gap-1 ${sort === k ? 'text-foreground font-semibold' : ''}`}>
      {label}<ArrowDownUp className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Razdoblje</Label>
          <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Zadnjih 7 dana</SelectItem>
              <SelectItem value="30">Zadnjih 30 dana</SelectItem>
              <SelectItem value="90">Zadnjih 90 dana</SelectItem>
              <SelectItem value="custom">Prilagođeno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {preset === 'custom' && (
          <>
            <div><Label className="text-xs">Od</Label><Input type="date" value={cFrom} onChange={(e) => setCFrom(e.target.value)} /></div>
            <div><Label className="text-xs">Do</Label><Input type="date" value={cTo} onChange={(e) => setCTo(e.target.value)} /></div>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Osvježi
        </Button>
      </div>

      <Card className="border-memorial-gold/50">
        <CardContent className="p-4 text-sm flex gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-memorial-gold" />
          <div className="space-y-1 text-muted-foreground">
            <p>
              Podaci se prikupljaju od {data?.tracking_since ? new Date(data.tracking_since).toLocaleDateString('hr-HR') : 'trenutka uvođenja (još nema zabilježenih događaja)'}.
              Ranija razdoblja nemaju podatke o blogovima.
            </p>
            <p>
              Pravilo pripisivanja: kupnja se pripisuje blogu samo ako je posjetitelj kliknuo CTA ili poveznicu na digitalni memorijal u tom članku najviše 30 dana prije plaćanja (zadnji klik).
              Pripisivanje i jedinstveni posjetitelji bilježe se samo uz pristanak na analitičke kolačiće. Prihod je neto (nakon povrata); besplatne aktivacije promo kodom ne ulaze u prihod ni kupnje.
            </p>
          </div>
        </CardContent>
      </Card>

      {err && <p className="text-destructive text-sm">{err}</p>}
      {loading && !data && <Loader2 className="h-6 w-6 animate-spin" />}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ['Pregledi blogova', num(t.views)],
          ['CTA klikovi', num(t.cta_clicks)],
          ['Započete izrade', num(t.starts)],
          ['Plaćene kupnje', num(t.purchases)],
          ['Prihod iz blogova', eur(t.revenue)],
          ['Konverzija', pct(Number(t.purchases ?? 0), Number(t.views ?? 0))],
        ].map(([l, v]) => (
          <Card key={l}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold mt-1">{v}</p></CardContent></Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Besplatne aktivacije iz blogova: {num(t.free_activations)} · Vraćeno: {eur(t.refunded)} · Korištenje interaktivnih elemenata: {num(t.interactions)}
      </p>

      <Card>
        <CardHeader><CardTitle className="text-lg">Prodajni lijevak</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {funnel.map((s, i) => {
            const max = Math.max(funnel[0].v, 1);
            return (
              <div key={s.label} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 text-sm">
                <span>{s.label}</span>
                <div className="h-6 rounded bg-muted overflow-hidden"><div className="h-full bg-memorial-gold" style={{ width: `${(s.v / max) * 100}%` }} /></div>
                <span className="tabular-nums w-32 text-right">{num(s.v)}{i > 0 && <span className="text-muted-foreground"> · {pct(s.v, funnel[i - 1].v)}</span>}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Pregledi i CTA klikovi kroz vrijeme</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip />
                <Line type="monotone" dataKey="views" name="Pregledi" stroke="hsl(var(--primary))" dot={false} />
                <Line type="monotone" dataKey="cta_clicks" name="CTA klikovi" stroke="hsl(var(--memorial-gold))" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Kupnje i prihod iz blogova</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" fontSize={11} /><YAxis yAxisId="l" allowDecimals={false} fontSize={11} /><YAxis yAxisId="r" orientation="right" fontSize={11} /><Tooltip />
                <Bar yAxisId="l" dataKey="purchases" name="Kupnje" fill="hsl(var(--primary))" />
                <Bar yAxisId="r" dataKey="revenue" name="Prihod (€)" fill="hsl(var(--memorial-gold))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Blogovi s najboljim rezultatima</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ left: 40 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" width={180} fontSize={11} /><Tooltip />
                <Bar dataKey="prihod" name="Prihod (€)" fill="hsl(var(--memorial-gold))" />
                <Bar dataKey="klikovi" name="CTA klikovi" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">Statistika po blogu</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pretraži blogove" className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blog članak</TableHead>
                <TableHead className="text-right">{sortBtn('views', 'Pregledi')}</TableHead>
                <TableHead className="text-right">{sortBtn('cta_clicks', 'CTA klikovi')}</TableHead>
                <TableHead className="text-right">{sortBtn('starts', 'Započete izrade')}</TableHead>
                <TableHead className="text-right">{sortBtn('purchases', 'Kupnje')}</TableHead>
                <TableHead className="text-right">{sortBtn('revenue', 'Prihod')}</TableHead>
                <TableHead className="text-right">{sortBtn('conv', 'Konverzija')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Za odabrano razdoblje još nema podataka.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.slug} className="cursor-pointer" onClick={() => setSelected(r)}>
                  <TableCell className="max-w-xs"><span className="font-medium hover:text-memorial-gold">{r.title ?? r.slug}</span></TableCell>
                  <TableCell className="text-right tabular-nums">{num(r.views)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(r.cta_clicks)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(r.starts)}</TableCell>
                  <TableCell className="text-right tabular-nums">{num(r.purchases)}</TableCell>
                  <TableCell className="text-right tabular-nums">{eur(r.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(r.purchases, r.views)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && <BlogDetail row={selected} data={data} onSaved={() => toast({ title: 'Prodajni elementi spremljeni' })} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const BlogDetail = ({ row, data, onSaved }: { row: Row; data: any; onSaved: () => void }) => {
  const { toast } = useToast();
  const ctas = (data?.ctas ?? []).filter((c: any) => c.blog_slug === row.slug);
  const ctaOrders = (data?.cta_orders ?? []).filter((c: any) => c.blog_slug === row.slug);
  const orders = (data?.orders ?? []).filter((o: any) => o.blog_slug === row.slug);
  const ids = Array.from(new Set([...ctas.map((c: any) => c.cta_id), ...ctaOrders.map((c: any) => c.cta_id)])) as string[];

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void supabase.from('blogs').select('id, sales_heading, sales_text, cta_text, cta_enabled, interactive_type, interactive_items').eq('slug', row.slug).maybeSingle()
      .then(({ data: b }) => setForm(b ? { ...b, items: ((b as any).interactive_items ?? []).join('\n') } : null));
  }, [row.slug]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase.from('blogs').update({
      sales_heading: form.sales_heading?.trim() || null,
      sales_text: form.sales_text?.trim() || null,
      cta_text: form.cta_text?.trim() || null,
      cta_enabled: !!form.cta_enabled,
      interactive_type: form.interactive_type,
      interactive_items: String(form.items ?? '').split('\n').map((s: string) => s.trim()).filter(Boolean).slice(0, 8),
    } as never).eq('id', form.id);
    setSaving(false);
    if (error) toast({ title: 'Spremanje nije uspjelo', description: error.message, variant: 'destructive' });
    else onSaved();
  };

  return (
    <div className="space-y-6">
      <SheetHeader><SheetTitle>{row.title ?? row.slug}</SheetTitle></SheetHeader>
      <a href={`/blog/${row.slug}`} target="_blank" rel="noreferrer" className="text-sm underline text-memorial-gold">Otvori članak</a>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          ['Pregledi', num(row.views)], ['CTA klikovi', num(row.cta_clicks)], ['Interakcije', num(row.interactions)],
          ['Započete izrade', num(row.starts)], ['Otvoreni checkouti', num(row.checkouts)], ['Plaćene kupnje', num(row.purchases)],
          ['Besplatne aktivacije', num(row.free_activations)], ['Prihod (neto)', eur(row.revenue)], ['Vraćeno', eur(row.refunded)],
          ['Konverzija', pct(row.purchases, row.views)],
        ].map(([k, v]) => <div key={k} className="rounded border border-border p-2"><p className="text-xs text-muted-foreground">{k}</p><p className="font-semibold">{v}</p></div>)}
      </div>

      <div>
        <h3 className="font-semibold mb-2">Uspješnost CTA elemenata</h3>
        {ids.length === 0 ? <p className="text-sm text-muted-foreground">Još nema klikova.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Element</TableHead><TableHead className="text-right">Klikovi</TableHead><TableHead className="text-right">Kupnje</TableHead><TableHead className="text-right">Prihod</TableHead></TableRow></TableHeader>
            <TableBody>
              {ids.map((id) => {
                const clicks = ctas.filter((c: any) => c.cta_id === id).reduce((s: number, c: any) => s + Number(c.n), 0);
                const o = ctaOrders.find((c: any) => c.cta_id === id);
                return (
                  <TableRow key={id}><TableCell>{CTA_HR[id] ?? id}</TableCell><TableCell className="text-right">{num(clicks)}</TableCell>
                    <TableCell className="text-right">{num(o?.purchases ?? 0)}</TableCell><TableCell className="text-right">{eur(Number(o?.revenue ?? 0))}</TableCell></TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {orders.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Pripisane narudžbe</h3>
          <ul className="text-sm space-y-1">
            {orders.map((o: any) => (
              <li key={o.id} className="flex justify-between gap-2 border-b border-border py-1">
                <span>{new Date(o.at).toLocaleDateString('hr-HR')} · {o.customer_email ?? '—'}</span>
                <span>{o.is_free ? 'Besplatno' : eur(Number(o.amount_paid) - Number(o.amount_refunded))} · {o.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="font-semibold">Prodajni elementi članka</h3>
        {!form ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <>
            <div className="flex items-center gap-2"><Switch checked={!!form.cta_enabled} onCheckedChange={(v) => setForm({ ...form, cta_enabled: v })} /><Label>Prikaži prodajni odjeljak i CTA</Label></div>
            <div><Label>Naslov odjeljka</Label><Input value={form.sales_heading ?? ''} maxLength={90} onChange={(e) => setForm({ ...form, sales_heading: e.target.value })} /></div>
            <div><Label>Tekst odjeljka</Label><Textarea rows={4} value={form.sales_text ?? ''} maxLength={600} onChange={(e) => setForm({ ...form, sales_text: e.target.value })} /></div>
            <div><Label>Tekst CTA gumba</Label><Input value={form.cta_text ?? ''} maxLength={60} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} /></div>
            <div>
              <Label>Interaktivni element</Label>
              <Select value={form.interactive_type} onValueChange={(v) => setForm({ ...form, interactive_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(INTERACTIVE_HR).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(form.interactive_type === 'dedication' || form.interactive_type === 'song') && (
              <div><Label>{form.interactive_type === 'song' ? 'Pjesme (jedna po retku)' : 'Posvete (jedna po retku)'}</Label>
                <Textarea rows={5} value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} /></div>
            )}
            <Button onClick={save} disabled={saving} className="bg-memorial-gold text-memorial-gold-foreground hover:bg-memorial-gold/90">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Spremi
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BlogConversions;
