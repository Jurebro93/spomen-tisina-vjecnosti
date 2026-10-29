import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Download, ExternalLink, Info, Loader2, RefreshCw, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminGuard from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import BlogConversions from '@/components/admin/BlogConversions';
import SignupStats from '@/components/admin/SignupStats';
import GoogleStats from '@/components/admin/GoogleStats';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Report = Record<string, any>;
type Order = Record<string, any>;

const StatTabs = ({ active }: { active: 'prodaja' | 'blogovi' | 'prijave' | 'google' }) => (
  <div className="flex gap-1 border-b border-border mt-4 mb-6" role="tablist">
    <Link to="/admin/statistika" role="tab" aria-selected={active === 'prodaja'}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active === 'prodaja' ? 'border-memorial-gold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Prodaja</Link>
    <Link to="/admin/statistika?tab=blogovi" role="tab" aria-selected={active === 'blogovi'}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active === 'blogovi' ? 'border-memorial-gold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Blogovi i konverzije</Link>
    <Link to="/admin/statistika?tab=prijave" role="tab" aria-selected={active === 'prijave'}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active === 'prijave' ? 'border-memorial-gold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Prijave i newsletter</Link>
    <Link to="/admin/statistika?tab=google" role="tab" aria-selected={active === 'google'}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${active === 'google' ? 'border-memorial-gold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Google i ponašanje</Link>
  </div>
);

const TZ = 'Europe/Zagreb';
const eur = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(Number(v));
const dt = (v?: string | null) => (v ? new Date(v).toLocaleString('hr-HR', { timeZone: TZ }) : '—');
const num = (v: any) => (v == null ? '—' : new Intl.NumberFormat('hr-HR').format(Number(v)));
const hrs = (v: any) => (v == null ? '—' : Number(v) < 48 ? `${Number(v).toFixed(1)} h` : `${(Number(v) / 24).toFixed(1)} dana`);

export const STATUS_HR: Record<string, string> = {
  draft: 'Nacrt bez kupnje',
  checkout_open: 'Checkout otvoren',
  returned_unpaid: 'Vratio se bez potvrđene naplate',
  expired: 'Checkout istekao',
  processing: 'Naplata u obradi',
  requires_action: 'Zahtijeva dodatnu potvrdu',
  failed: 'Neuspješan pokušaj naplate',
  paid: 'Uspješno plaćeno',
  free: 'Besplatno aktivirano (promo kod)',
  partially_refunded: 'Djelomično vraćeno',
  refunded: 'Potpuno vraćeno',
  disputed: 'Otvoren spor',
};
const EVENT_HR: Record<string, string> = {
  checkout_created: 'Otvoren checkout', checkout_returned: 'Povratak s plaćanja bez potvrde', checkout_expired: 'Checkout istekao',
  payment_processing: 'Naplata u obradi', requires_action: 'Potrebna dodatna potvrda', payment_failed: 'Neuspjela naplata',
  payment_succeeded: 'Uspješna naplata', free_activation: 'Besplatna aktivacija', refund_partial: 'Djelomičan povrat',
  refund_full: 'Potpuni povrat', dispute_opened: 'Otvoren spor',
};
const FAILURE_HR: Record<string, string> = {
  card_declined: 'Kartica je odbijena', insufficient_funds: 'Nedovoljno sredstava', expired_card: 'Kartica je istekla',
  incorrect_cvc: 'Pogrešan CVC', incorrect_number: 'Pogrešan broj kartice', processing_error: 'Greška pri obradi',
  authentication_required: 'Potrebna 3D Secure potvrda', payment_intent_authentication_failure: '3D Secure potvrda nije uspjela',
  do_not_honor: 'Banka je odbila', generic_decline: 'Banka je odbila bez razloga', fraudulent: 'Označeno kao sumnjivo',
  async_payment_failed: 'Asinkrona naplata nije uspjela', lost_card: 'Izgubljena kartica', stolen_card: 'Ukradena kartica',
};
const failHr = (c?: string | null) => (c && FAILURE_HR[c]) || 'Razlog nije dostupan';

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'prev_month' | 'custom';
const PRESET_HR: Record<Preset, string> = {
  today: 'Danas', yesterday: 'Jučer', '7d': 'Zadnjih 7 dana', '30d': 'Zadnjih 30 dana', month: 'Ovaj mjesec', prev_month: 'Prošli mjesec', custom: 'Proizvoljno',
};

// Midnight in Zagreb for a given Y-M-D, as a UTC Date.
// The Zagreb wall clock is read as UTC (not browser time), so the offset is the real UTC offset.
const zagrebClock = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
});
function zagrebMidnight(y: number, m: number, d: number) {
  const guess = new Date(Date.UTC(y, m, d));
  const p = Object.fromEntries(zagrebClock.formatToParts(guess).map((x) => [x.type, Number(x.value)]));
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess.getTime();
  return new Date(guess.getTime() - offset);
}
function todayParts() {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const [y, m, d] = s.split('-').map(Number);
  return { y, m: m - 1, d };
}
function rangeFor(p: Preset, from: string, to: string): [Date, Date] {
  const { y, m, d } = todayParts();
  const day = (o: number) => zagrebMidnight(y, m, d + o);
  switch (p) {
    case 'today': return [day(0), day(1)];
    case 'yesterday': return [day(-1), day(0)];
    case '7d': return [day(-6), day(1)];
    case '30d': return [day(-29), day(1)];
    case 'month': return [zagrebMidnight(y, m, 1), day(1)];
    case 'prev_month': return [zagrebMidnight(y, m - 1, 1), zagrebMidnight(y, m, 1)];
    default: {
      const [fy, fm, fd] = (from || '2024-01-01').split('-').map(Number);
      const [ty, tm, td] = (to || new Date().toISOString().slice(0, 10)).split('-').map(Number);
      return [zagrebMidnight(fy, fm - 1, fd), zagrebMidnight(ty, tm - 1, td + 1)];
    }
  }
}

function csv(rows: (string | number | null | undefined)[][], name: string) {
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = '\uFEFF' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
const dec = (v: any) => (v == null ? '' : String(Number(v).toFixed(2)).replace('.', ','));

const stripeUrl = (o: Order) => {
  const base = `https://dashboard.stripe.com/${o.livemode ? '' : 'test/'}`;
  if (o.stripe_payment_intent_id) return `${base}payments/${o.stripe_payment_intent_id}`;
  if (o.stripe_checkout_session_id) return `${base}checkout/sessions/${o.stripe_checkout_session_id}`;
  return null;
};

function Metric({ label, value, hint, prev }: { label: string; value: string; hint: string; prev?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground leading-snug">{label}</p>
          <UiTooltip>
            <TooltipTrigger aria-label={`Kako se računa: ${label}`}><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
          </UiTooltip>
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        {prev !== undefined && <p className="mt-1 text-xs text-muted-foreground">Prethodno razdoblje: {prev}</p>}
      </CardContent>
    </Card>
  );
}

const PAGE = 50;

const Inner = () => {
  const tab = new URLSearchParams(useLocation().search).get('tab');
  const blogTab = tab === 'blogovi';
  const signupTab = tab === 'prijave';
  const googleTab = tab === 'google';
  const [preset, setPreset] = useState<Preset>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [live, setLive] = useState(true);
  const [promo, setPromo] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [source, setSource] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bucket, setBucket] = useState<'day' | 'week' | 'month'>('day');
  const [report, setReport] = useState<Report | null>(null);
  const [prevReport, setPrevReport] = useState<Report | null>(null);
  const [state, setState] = useState<Report | null>(null);
  const [candles, setCandles] = useState<Report | null>(null);
  const [prevCandles, setPrevCandles] = useState<Report | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  const [from, to] = useMemo(() => rangeFor(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const filters = useMemo(() => ({
    _livemode: live, _promo: promo.trim() || null,
    _visibility: visibility === 'all' ? null : visibility, _source: source.trim() || null, _bucket: bucket,
  }), [live, promo, visibility, source, bucket]);

  const loadOrders = useCallback(async () => {
    let q = supabase.from('memorial_orders' as never)
      .select('*, memorials(slug, status, visibility, obituaries(ime, prezime))', { count: 'exact' })
      .gte('created_at', from.toISOString()).lt('created_at', to.toISOString())
      .eq('livemode', live).order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (promo.trim()) q = q.ilike('promo_code', promo.trim());
    if (source.trim()) q = source.trim() === 'Nepoznato' ? q.is('checkout_source', null) : q.eq('checkout_source', source.trim());
    const s = search.trim().replace(/[,()]/g, ' ');
    if (s) q = q.or(`customer_email.ilike.%${s}%,customer_name.ilike.%${s}%,stripe_checkout_session_id.ilike.%${s}%,stripe_payment_intent_id.ilike.%${s}%,promo_code.ilike.%${s}%`);
    const { data, count, error: e } = await q;
    if (e) throw e;
    let rows = (data as Order[]) ?? [];
    if (visibility !== 'all') rows = rows.filter((r) => r.memorials?.visibility === visibility);
    setOrders(rows);
    setOrdersTotal(count ?? 0);
  }, [from, to, live, page, statusFilter, promo, source, search, visibility]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const len = to.getTime() - from.getTime();
      const pFrom = new Date(from.getTime() - len);
      const [r, p, s, c, pc] = await Promise.all([
        supabase.rpc('admin_sales_report' as never, { _from: from.toISOString(), _to: to.toISOString(), ...filters } as never),
        supabase.rpc('admin_sales_report' as never, { _from: pFrom.toISOString(), _to: from.toISOString(), ...filters } as never),
        supabase.rpc('admin_sales_state' as never),
        supabase.rpc('admin_candle_report' as never, { _from: from.toISOString(), _to: to.toISOString(), _livemode: live } as never),
        supabase.rpc('admin_candle_report' as never, { _from: pFrom.toISOString(), _to: from.toISOString(), _livemode: live } as never),
      ]);
      if (r.error) throw r.error;
      setReport(r.data as Report); setPrevReport(p.data as Report); setState(s.data as Report);
      setCandles(c.error ? null : (c.data as Report)); setPrevCandles(pc.error ? null : (pc.data as Report));
      await loadOrders();
    } catch (e: any) {
      setError(e?.message ?? 'Podatke nije bilo moguće učitati.');
    } finally {
      setLoading(false);
    }
  }, [from, to, filters, live, loadOrders]);

  useEffect(() => { void load(); }, [load]);

  const openOrder = async (o: Order) => {
    setSelected(o); setEvents([]);
    const { data } = await supabase.from('payment_events' as never).select('*').eq('order_id', o.id).order('occurred_at');
    setEvents((data as any[]) ?? []);
  };

  const r = report ?? {};
  const pr = prevReport ?? {};
  const conv = (x: Report) => (x.checkouts_started ? `${((x.paid_orders / x.checkouts_started) * 100).toFixed(1)} %` : '—');
  const net = (x: Report) => (x.gross ?? 0) - (x.refunded ?? 0);

  const metrics = [
    { label: 'Jedinstveni kupci s uspješnom naplatom', v: num(r.unique_paying_customers), p: num(pr.unique_paying_customers), hint: 'Broj različitih korisnika (ili e-mailova) s barem jednom potvrđenom Stripe naplatom. Ponovljeni pokušaji i besplatne aktivacije se ne broje.' },
    { label: 'Uspješno plaćene narudžbe', v: num(r.paid_orders), p: num(pr.paid_orders), hint: 'Narudžbe potvrđene Stripe webhookom (uključuje kasnije vraćene). Bez besplatnih aktivacija.' },
    { label: 'Plaćeni memorijali', v: num(r.paid_memorials), p: num(pr.paid_memorials), hint: 'Različiti memorijali s barem jednom uspješnom naplatom u razdoblju.' },
    { label: 'Besplatno aktivirani memorijali', v: num(r.free_activations), p: num(pr.free_activations), hint: 'Aktivacije promo kodom od 100 % — bez Stripe naplate.' },
    { label: 'Započete checkout sesije (svi proizvodi)', v: num((r.checkouts_started ?? 0) + (candles?.checkouts_started ?? 0)), p: num((pr.checkouts_started ?? 0) + (prevCandles?.checkouts_started ?? 0)), hint: 'Sve otvorene Stripe Checkout sesije: digitalni memorijal i svijeće. Jedna osoba može imati više.' },
    { label: 'Započete checkout sesije — memorijal', v: num(r.checkouts_started), p: num(pr.checkouts_started), hint: 'Svaka otvorena Stripe Checkout sesija za digitalni memorijal (jedna osoba može imati više).' },
    { label: 'Sesije koje čekaju dovršetak', v: num(r.checkouts_open), p: num(pr.checkouts_open), hint: 'Sesije koje još nisu istekle i nemaju potvrđenu naplatu (otvorene, u obradi, potrebna potvrda ili povratak bez uplate).' },
    { label: 'Istekle checkout sesije', v: num(r.checkouts_expired), p: num(pr.checkouts_expired), hint: 'Sesije za koje je Stripe javio istek (nakon 24 h) bez naplate. Samo zatvaranje stranice ne računa se kao odustajanje.' },
    { label: 'Sesije s neuspjelim pokušajem', v: num(r.checkouts_failed), p: num(pr.checkouts_failed), hint: 'Sesije s barem jednim neuspjelim pokušajem naplate (i ako su kasnije plaćene).' },
    { label: 'Pokušali kupiti, bez uspješne kupnje', v: num(r.tried_never_bought), p: num(pr.tried_never_bought), hint: 'Različite osobe koje su otvorile checkout u razdoblju, a nemaju nijednu uspješnu kupnju (ni ranije ni kasnije).' },
    { label: 'Uspješno naplaćeno', v: eur(r.gross), p: eur(pr.gross), hint: 'Zbroj stvarno naplaćenih iznosa (nakon popusta) prema Stripeu.' },
    { label: 'Vraćeno', v: eur(r.refunded), p: eur(pr.refunded), hint: 'Zbroj povrata prema Stripeu za narudžbe iz razdoblja.' },
    { label: 'Naplaćeno umanjeno za povrate', v: eur(net(r)), p: eur(net(pr)), hint: 'Naplaćeno − vraćeno. Nije dobit.' },
    { label: 'Prosječna plaćena narudžba', v: eur(r.avg_order), p: eur(pr.avg_order), hint: 'Naplaćeno / broj uspješno plaćenih narudžbi.' },
    { label: 'Konverzija checkouta', v: conv(r), p: conv(pr), hint: 'Memorijal: uspješno plaćene narudžbe / započete checkout sesije za memorijal.' },
  ];

  const candleMetrics = [
    { label: 'Započete checkout sesije — svijeće', v: num(candles?.checkouts_started), p: num(prevCandles?.checkouts_started), hint: `Otvorene Stripe Checkout sesije za svijeće (osmrtnice: ${num(candles?.checkouts_obituary)}, memorijali: ${num(candles?.checkouts_memorial)}). Svijeće se naplaćuju od 28. 10. 2026. Ponovno paljenje postojeće svijeće nije uključeno.` },
    { label: 'Plaćene svijeće', v: num(candles?.paid), p: num(prevCandles?.paid), hint: 'Svijeće čiju je naplatu Stripe potvrdio, prema datumu otvaranja checkouta.' },
    { label: 'Naplaćeno za svijeće', v: eur(candles?.gross), p: eur(prevCandles?.gross), hint: 'Zbroj naplaćenih iznosa za svijeće prema Stripeu.' },
  ];

  const funnel = r.funnel ?? {};
  const steps = funnel.steps ?? {};
  const funnelRows: { label: string; value: number | null; unit: string; note?: string }[] = [
    // "people": one per memorial, user or consented visitor, otherwise one per browser tab; bot bursts are excluded in SQL.
    { label: 'Posjet stranici Digitalni memorijal', value: steps.visit_landing?.people ?? steps.visit_landing?.events ?? null, unit: 'ljudi' },
    { label: 'Početak izrade', value: steps.start_create?.people ?? steps.start_create?.events ?? null, unit: 'ljudi' },
    { label: 'Prijavljen ili gost u izradi', value: steps.auth?.people ?? steps.auth?.events ?? null, unit: 'korisnici' },
    { label: 'Spremljen nacrt', value: steps.draft_saved?.people ?? steps.draft_saved?.events ?? null, unit: 'memorijali' },
    { label: 'Odlazak na plaćanje ili promo aktivaciju', value: funnel.checkout_users ?? null, unit: 'korisnici', note: 'iz narudžbi' },
    { label: 'Uspješna naplata ili besplatna aktivacija', value: funnel.paid_or_free_users ?? null, unit: 'korisnici', note: 'iz narudžbi' },
    { label: 'Objavljen memorijal', value: funnel.published ?? null, unit: 'memorijali', note: 'iz baze' },
  ];
  const trackingSince = funnel.tracking_since ? dt(funnel.tracking_since) : null;
  const consentedShare = (() => {
    const total = Object.values(steps).reduce((a: number, s: any) => a + (s.events ?? 0), 0) as number;
    const c = Object.values(steps).reduce((a: number, s: any) => a + (s.consented ?? 0), 0) as number;
    return total ? Math.round((c / total) * 100) : null;
  })();

  const alerts = state?.alerts ?? {};
  const alertDefs: [string, string][] = [
    ['paid_order_memorial_unpaid', 'Uspješna naplata, a memorijal nije označen kao plaćen'],
    ['paid_not_published', 'Plaćen memorijal koji nije objavljen (možda namjerno — samo provjera)'],
    ['double_paid', 'Moguća dvostruka uspješna naplata istog memorijala'],
    ['long_processing', 'Naplata u obradi dulje od 24 h'],
    ['webhook_failures', 'Neuspjela obrada Stripe webhooka (30 dana)'],
    ['refund_mismatch', 'Povrat nije usklađen s računom'],
    ['stripe_db_mismatch', 'Memorijal plaćen preko Stripea bez zapisa o uspješnoj narudžbi'],
  ];

  const exportOrders = () => csv([
    ['Kreirano', 'Zadnja promjena', 'Kupac', 'E-mail', 'Memorijal', 'ID memorijala', 'Status memorijala', 'Privatnost', 'Status naplate', 'Izvorni iznos', 'Popust', 'Naplaćeno', 'Promo kod', 'Vraćeno', 'Stripe naknada', 'Pokušaji', 'Neuspjeli pokušaji', 'Zadnji razlog neuspjeha', 'Izvor (pri checkoutu)', 'Medij', 'Kampanja', 'Prvi izvor', 'Uređaj', 'Checkout Session', 'PaymentIntent', 'Stvarno/test'],
    ...orders.map((o) => [dt(o.created_at), dt(o.updated_at), o.customer_name, o.customer_email,
      o.memorials?.obituaries ? `${o.memorials.obituaries.ime} ${o.memorials.obituaries.prezime}` : '', o.memorial_id, o.memorials?.status, o.memorials?.visibility,
      STATUS_HR[o.status] ?? o.status, dec(o.original_amount), dec(o.discount_amount), dec(o.amount_paid), o.promo_code, dec(o.amount_refunded), dec(o.stripe_fee),
      o.attempt_count, o.failed_attempt_count, o.last_failure_code ? failHr(o.last_failure_code) : '', o.checkout_source ?? 'Nepoznato', o.checkout_medium ?? 'Nepoznato',
      o.checkout_campaign ?? 'Nepoznato', o.first_source ?? 'Nepoznato', o.device ?? 'Nepoznato', o.stripe_checkout_session_id, o.stripe_payment_intent_id, o.livemode ? 'stvarno' : 'test']),
  ], `narudzbe-${from.toISOString().slice(0, 10)}.csv`);

  const exportSummary = () => csv([
    ['Pokazatelj', 'Odabrano razdoblje', 'Prethodno razdoblje'],
    ...metrics.map((m) => [m.label, m.v, m.p]),
    ...candleMetrics.map((m) => [m.label, m.v, m.p]),
    [], ['Razdoblje', `${dt(from.toISOString())} – ${dt(to.toISOString())}`],
    ['Transakcije', live ? 'stvarne' : 'testne'], ['Osvježeno', dt(state?.refreshed_at)],
  ], `sazetak-${from.toISOString().slice(0, 10)}.csv`);

  if (blogTab || signupTab || googleTab) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-semibold">Statistika i prodaja</h1>
          <StatTabs active={blogTab ? 'blogovi' : googleTab ? 'google' : 'prijave'} />
          {blogTab ? <BlogConversions /> : googleTab ? <GoogleStats /> : <SignupStats />}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-7xl px-4 py-8">
          <StatTabs active="prodaja" />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Statistika i prodaja</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Digitalni memorijali i svijeće · vrijeme Europe/Zagreb · iznosi u eurima · osvježeno {dt(state?.refreshed_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { data, error } = await supabase.functions.invoke('test-meta-capi', { body: {} });
                  window.alert(data?.ok ? 'uspješno poslano' : (data?.error || error?.message || 'Greška'));
                }}
              >
                Test Meta CAPI
              </Button>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Osvježi
              </Button>
              <Button variant="outline" size="sm" onClick={exportSummary}><Download className="h-4 w-4 mr-2" />Sažetak CSV</Button>
              <Button variant="outline" size="sm" onClick={exportOrders}><Download className="h-4 w-4 mr-2" />Narudžbe CSV</Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mt-6">
            <CardContent className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={preset} onValueChange={(v) => { setPreset(v as Preset); setPage(0); }}>
                <SelectTrigger aria-label="Razdoblje"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(PRESET_HR) as Preset[]).map((k) => <SelectItem key={k} value={k}>{PRESET_HR[k]}</SelectItem>)}</SelectContent>
              </Select>
              {preset === 'custom' && (
                <div className="flex gap-2">
                  <Input type="date" aria-label="Od" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  <Input type="date" aria-label="Do" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              )}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger aria-label="Status naplate"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi statusi naplate</SelectItem>
                  {Object.entries(STATUS_HR).filter(([k]) => k !== 'draft').map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger aria-label="Privatnost"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Javni i privatni</SelectItem>
                  <SelectItem value="public">Javni</SelectItem>
                  <SelectItem value="unlisted">Samo s poveznicom</SelectItem>
                  <SelectItem value="private">Privatni</SelectItem>
                </SelectContent>
              </Select>
              <Select value={live ? 'live' : 'test'} onValueChange={(v) => { setLive(v === 'live'); setPage(0); }}>
                <SelectTrigger aria-label="Vrsta transakcija"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="live">Stvarne transakcije</SelectItem><SelectItem value="test">Testne transakcije</SelectItem></SelectContent>
              </Select>
              <Input placeholder="Promo kod" value={promo} onChange={(e) => { setPromo(e.target.value); setPage(0); }} />
              <Input placeholder="Izvor posjeta (npr. google, Nepoznato)" value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} />
            </CardContent>
          </Card>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          {loading && !report ? (
            <div className="py-24 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <p className="mt-6 text-xs text-muted-foreground">
                Razdoblje: {dt(from.toISOString())} – {dt(to.toISOString())}. Usporedba s prethodnim razdobljem jednake duljine.
              </p>
              <section className="mt-3 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {metrics.map((m) => <Metric key={m.label} label={m.label} value={m.v} prev={m.p} hint={m.hint} />)}
              </section>
              <h2 className="mt-6 text-sm font-medium text-muted-foreground">Svijeće</h2>
              <section className="mt-2 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {candleMetrics.map((m) => <Metric key={m.label} label={m.label} value={candles ? m.v : 'Nema podataka'} prev={candles ? m.p : undefined} hint={m.hint} />)}
              </section>
              <p className="mt-2 text-xs text-muted-foreground">
                Naknade Stripea: {r.fees_known_count ? `${eur(r.fees)} (poznato za ${r.fees_known_count} narudžbi) · nakon povrata i naknada ${eur(net(r) - (r.fees ?? 0))}` : 'nisu još dostupne za ovo razdoblje — ne procjenjuju se.'}
                {' '}Popusti odobreni na plaćenim narudžbama: {eur(r.discounts)}. Naknadno dovršene nakon neuspjeha ili povratka: {num(r.recovered_after_failure)}.
              </p>

              {/* Funnel */}
              <Card className="mt-8">
                <CardHeader><CardTitle className="text-lg">Prodajni lijevak</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    {trackingSince ? `Koraci na webu prate se od ${trackingSince}.` : 'Koraci na webu prate se od ove nadogradnje — za ranije razdoblje nema podataka.'}
                    {' '}Izvor i jedinstveni posjetitelj bilježe se samo uz privolu{consentedShare != null ? ` (${consentedShare} % događaja s privolom)` : ''}; bez privole se broji samo korak. Blokirano praćenje znači da dio puta ostaje nepoznat.
                    {funnel.bot_excluded > 0 && ` Izostavljeno ${num(funnel.bot_excluded)} automatskih zapisa (robot).`}
                  </p>
                  <div className="space-y-2">
                    {funnelRows.map((s, i) => {
                      const prevVal = i > 0 ? funnelRows[i - 1].value : null;
                      const max = Math.max(...funnelRows.map((x) => x.value ?? 0), 1);
                      return (
                        <div key={s.label} className="grid grid-cols-[1fr_auto] md:grid-cols-[16rem_1fr_10rem] items-center gap-2">
                          <span className="text-sm">{s.label} <span className="text-xs text-muted-foreground">({s.unit}{s.note ? `, ${s.note}` : ''})</span></span>
                          <div className="hidden md:block h-3 rounded bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${((s.value ?? 0) / max) * 100}%` }} />
                          </div>
                          <span className="text-sm tabular-nums text-right">
                            {s.value == null || (i < 4 && !trackingSince) ? 'Nema podataka' : num(s.value)}
                            {prevVal && s.value != null && i > 0 && trackingSince && (
                              <span className="block text-xs text-muted-foreground">nastavak {Math.min(100, Math.round((s.value / prevVal) * 100))} %</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Koraci se mjere različitim jedinicama (osoba, korisnik, memorijal), pa postotak nastavka služi kao orijentir, a ne kao točno praćenje iste osobe. Detaljniji lijevak izrade je u kartici „Google i ponašanje”.</p>
                </CardContent>
              </Card>

              {/* Charts */}
              <Card className="mt-8">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">Naplata kroz vrijeme</CardTitle>
                  <Select value={bucket} onValueChange={(v) => setBucket(v as typeof bucket)}>
                    <SelectTrigger className="w-32" aria-label="Grupiranje"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="day">Po danu</SelectItem><SelectItem value="week">Po tjednu</SelectItem><SelectItem value="month">Po mjesecu</SelectItem></SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  {(r.timeseries ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nema uspješnih naplata u razdoblju.</p> : (
                    <>
                      <div className="h-64"><ResponsiveContainer><BarChart data={r.timeseries}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="bucket" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => eur(v)} /><Bar dataKey="amount" name="Neto naplaćeno" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></div>
                      <div className="h-64"><ResponsiveContainer><BarChart data={r.timeseries}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="bucket" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="orders" name="Uspješne kupnje" fill="hsl(var(--memorial-gold, var(--primary)))" /></BarChart></ResponsiveContainer></div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Alerts */}
              <Card className="mt-8">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Potrebna provjera</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Trenutačno ukupno stanje. Ništa se ne objavljuje niti mijenja automatski.</p>
                  {alertDefs.map(([k, label]) => {
                    const list: any[] = alerts[k] ?? [];
                    return (
                      <details key={k} className="rounded border p-3">
                        <summary className="cursor-pointer text-sm flex items-center justify-between gap-2">
                          <span>{label}</span><Badge variant={list.length ? 'destructive' : 'secondary'}>{list.length}</Badge>
                        </summary>
                        {list.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs">
                            {list.slice(0, 30).map((a, i) => (
                              <li key={i} className="break-all">
                                {a.slug ? <Link className="underline" to={`/memorijal/${a.slug}`}>{a.slug}</Link> : null}
                                {' '}{a.email ?? ''} {a.status ? `· ${a.status}` : ''} {a.count ? `· ${a.count}×` : ''} {a.type ?? ''} {a.error ? `· ${a.error}` : ''} {a.at || a.since || a.paid_at ? `· ${dt(a.at ?? a.since ?? a.paid_at)}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Orders table */}
              <Card className="mt-8">
                <CardHeader className="gap-3">
                  <CardTitle className="text-lg">Narudžbe i pokušaji kupnje</CardTitle>
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(0); void loadOrders(); }}>
                    <Input placeholder="E-mail, ime, promo kod ili Stripe ID" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <Button type="submit" variant="outline"><Search className="h-4 w-4" /></Button>
                  </form>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Kreirano</TableHead><TableHead>Kupac</TableHead><TableHead>Memorijal</TableHead><TableHead>Status</TableHead>
                      <TableHead className="text-right">Naplaćeno</TableHead><TableHead>Promo</TableHead><TableHead className="text-right">Pokušaji</TableHead><TableHead>Izvor</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {orders.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Nema zapisa za odabrane filtre.</TableCell></TableRow>}
                      {orders.map((o) => (
                        <TableRow key={o.id} className="cursor-pointer" onClick={() => void openOrder(o)}>
                          <TableCell className="whitespace-nowrap text-xs">{dt(o.created_at)}</TableCell>
                          <TableCell className="text-xs"><div>{o.customer_name ?? '—'}</div><div className="text-muted-foreground">{o.customer_email ?? '—'}</div></TableCell>
                          <TableCell className="text-xs">{o.memorials?.obituaries ? `${o.memorials.obituaries.ime} ${o.memorials.obituaries.prezime}` : '—'}<div className="text-muted-foreground">{o.memorials?.visibility ?? ''}</div></TableCell>
                          <TableCell><Badge variant="outline" className="whitespace-nowrap">{STATUS_HR[o.status] ?? o.status}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums text-xs">{eur(o.amount_paid)}{Number(o.amount_refunded) > 0 && <div className="text-destructive">−{eur(o.amount_refunded)}</div>}</TableCell>
                          <TableCell className="text-xs">{o.promo_code ?? '—'}</TableCell>
                          <TableCell className="text-right text-xs">{o.attempt_count}{o.failed_attempt_count > 0 && <span className="text-destructive"> ({o.failed_attempt_count} neusp.)</span>}</TableCell>
                          <TableCell className="text-xs">{o.checkout_source ?? 'Nepoznato'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{num(ordersTotal)} zapisa</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prethodna</Button>
                      <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= ordersTotal} onClick={() => setPage((p) => p + 1)}>Sljedeća</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Memorials & users */}
              <Card className="mt-8">
                <CardHeader><CardTitle className="text-lg">Memorijali i korisnici <span className="text-xs font-normal text-muted-foreground">(trenutačno ukupno stanje)</span></CardTitle></CardHeader>
                <CardContent className="grid gap-3 grid-cols-2 md:grid-cols-4 text-sm">
                  {[
                    ['Ukupno memorijala', num(state?.memorials_total)],
                    ...Object.entries(state?.by_status ?? {}).map(([k, v]) => [`Status: ${k === 'draft' ? 'nacrt' : k === 'published' ? 'objavljen' : k === 'archived' ? 'arhiviran' : k}`, num(v)]),
                    ...Object.entries(state?.by_visibility ?? {}).map(([k, v]) => [`Privatnost: ${k === 'public' ? 'javni' : k === 'private' ? 'privatni' : k === 'unlisted' ? 's poveznicom' : k}`, num(v)]),
                    ['Plaćeni (Stripe)', num(state?.paid_stripe)], ['Besplatno aktivirani', num(state?.paid_free)], ['Aktivirani na drugi način (npr. admin)', num(state?.paid_other)],
                    ['Plaćeni, a neobjavljeni', num(state?.paid_not_published)], ['Registrirani korisnici', num(state?.registered_users)],
                    ['Korisnici s barem jednim memorijalom', num(state?.users_with_memorial)], ['Korisnici s više memorijala', num(state?.users_multi_memorial)],
                    ['Kupci koji su kupili više puta', num(state?.repeat_buyers)],
                  ].map(([k, v]) => <div key={k as string} className="rounded border p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="text-lg font-semibold tabular-nums">{v}</div></div>)}
                </CardContent>
                <CardContent className="pt-0 text-sm grid gap-3 md:grid-cols-2">
                  <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Od izrade nacrta do uspješne kupnje (odabrano razdoblje, n={r.time_to_purchase_hours?.n ?? 0})</div>Prosjek {hrs(r.time_to_purchase_hours?.avg)} · medijan {hrs(r.time_to_purchase_hours?.median)}</div>
                  <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Od uspješne kupnje do objave (odabrano razdoblje, n={r.time_to_publish_hours?.n ?? 0})</div>Prosjek {hrs(r.time_to_publish_hours?.avg)} · medijan {hrs(r.time_to_publish_hours?.median)}</div>
                </CardContent>
              </Card>

              {/* Promo + sources */}
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Promotivni kodovi</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Kod</TableHead><TableHead className="text-right">Korištenja</TableHead><TableHead className="text-right">Besplatno</TableHead><TableHead className="text-right">Popust</TableHead><TableHead className="text-right">Naplaćeno</TableHead><TableHead className="text-right">Korisnici</TableHead><TableHead>Kreirao</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(r.promo ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Nema korištenja u razdoblju.</TableCell></TableRow>}
                        {(r.promo ?? []).map((p: any) => (
                          <TableRow key={p.code}><TableCell>{p.code}</TableCell><TableCell className="text-right">{p.uses}</TableCell><TableCell className="text-right">{p.free}</TableCell><TableCell className="text-right">{eur(p.discount)}</TableCell><TableCell className="text-right">{eur(p.paid)}</TableCell><TableCell className="text-right">{p.users}</TableCell><TableCell className="text-xs">{p.created_by ?? 'Nije dostupno'}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Izvori kupnji</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">Prikazuje se izvor zabilježen pri pokretanju kupnje (ne prvi poznati izvor). Bez podataka: „Nepoznato”. Trošak oglasa i ROAS nisu prikazani jer podaci o trošku nisu povezani.</p>
                    <Table>
                      <TableHeader><TableRow><TableHead>Izvor / medij</TableHead><TableHead>Kampanja</TableHead><TableHead className="text-right">Kupnje</TableHead><TableHead className="text-right">Naplaćeno</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(r.sources ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Nema podataka.</TableCell></TableRow>}
                        {(r.sources ?? []).map((s: any, i: number) => <TableRow key={i}><TableCell className="text-xs">{s.source} / {s.medium}</TableCell><TableCell className="text-xs">{s.campaign}</TableCell><TableCell className="text-right">{s.orders}</TableCell><TableCell className="text-right">{eur(s.amount)}</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                    <div className="flex flex-wrap gap-2">
                      {(r.devices ?? []).map((d: any) => <Badge key={d.device} variant="secondary">{d.device === 'mobile' ? 'Mobitel' : d.device === 'desktop' ? 'Računalo' : d.device === 'tablet' ? 'Tablet' : d.device}: {d.orders} · {eur(d.amount)}</Badge>)}
                    </div>
                    {(r.failure_reasons ?? []).length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Razlozi neuspjelih naplata (prema Stripeu)</p>
                        <ul className="text-xs space-y-0.5">{r.failure_reasons.map((f: any) => <li key={f.code}>{failHr(f.code === 'unknown' ? null : f.code)}: {f.count}</li>)}</ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
        <Footer />

        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {selected && (
              <>
                <SheetHeader><SheetTitle>Detalji narudžbe</SheetTitle></SheetHeader>
                <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                  {[
                    ['Status', STATUS_HR[selected.status] ?? selected.status], ['Kupac', selected.customer_name ?? '—'], ['E-mail', selected.customer_email ?? '—'],
                    ['ID memorijala', selected.memorial_id ?? '—'], ['Memorijal', selected.memorials?.slug ?? '—'], ['Status memorijala', selected.memorials?.status ?? '—'], ['Privatnost', selected.memorials?.visibility ?? '—'],
                    ['Izvorni iznos', eur(selected.original_amount)], ['Popust', eur(selected.discount_amount)], ['Naplaćeno', eur(selected.amount_paid)], ['Vraćeno', eur(selected.amount_refunded)],
                    ['Stripe naknada', selected.stripe_fee == null ? 'Nije dostupno' : eur(selected.stripe_fee)], ['Promo kod', selected.promo_code ?? '—'],
                    ['Pokušaji', `${selected.attempt_count} (neuspjelih ${selected.failed_attempt_count})`], ['Zadnji razlog', selected.last_failure_code ? failHr(selected.last_failure_code) : '—'],
                    ['Izvor pri kupnji', `${selected.checkout_source ?? 'Nepoznato'} / ${selected.checkout_medium ?? 'Nepoznato'} / ${selected.checkout_campaign ?? '—'}`],
                    ['Izvor kupnje', selected.blog_slug ? `Blog – ${selected.blog_slug}${selected.blog_cta ? ` (CTA: ${selected.blog_cta})` : ''}` : 'Nije pripisano blogu'],
                    ['Prvi izvor', `${selected.first_source ?? 'Nepoznato'} / ${selected.first_medium ?? 'Nepoznato'}`], ['Uređaj', selected.device ?? 'Nepoznato'],
                    ['Checkout Session', selected.stripe_checkout_session_id ?? '—'], ['PaymentIntent', selected.stripe_payment_intent_id ?? '—'],
                    ['Vrsta', selected.livemode ? 'Stvarna' : 'Testna'], ['Kreirano', dt(selected.created_at)], ['Zadnja promjena', dt(selected.updated_at)],
                  ].map(([k, v]) => <Fragment key={k as string}><dt className="text-muted-foreground">{k}</dt><dd className="break-all">{v}</dd></Fragment>)}
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stripeUrl(selected) && <Button asChild size="sm" variant="outline"><a href={stripeUrl(selected)!} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Otvori u Stripeu</a></Button>}
                  {selected.stripe_checkout_session_id && <Button asChild size="sm" variant="outline"><Link to={`/admin/invoices?q=${selected.stripe_checkout_session_id}`}>Račun</Link></Button>}
                </div>
                <h3 className="mt-6 font-medium">Povijest događaja</h3>
                {selected.backfilled && <p className="text-xs text-muted-foreground mt-1">Zapis je nadopunjen iz postojeće baze; povijest pokušaja prije nadogradnje nije dostupna.</p>}
                <ol className="mt-2 border-l pl-4 space-y-3">
                  {selected.memorials && <li className="text-xs text-muted-foreground">Memorijal izrađen (prema bazi)</li>}
                  {events.map((e) => (
                    <li key={e.id} className="text-sm">
                      <div className="font-medium">{EVENT_HR[e.event_type] ?? e.event_type}</div>
                      <div className="text-xs text-muted-foreground">{dt(e.occurred_at)}{e.amount != null ? ` · ${eur(e.amount)}` : ''}{e.event_type === 'payment_failed' ? ` · ${failHr(e.failure_code)}` : ''}</div>
                    </li>
                  ))}
                  {events.length === 0 && <li className="text-xs text-muted-foreground">Nema zabilježenih događaja.</li>}
                </ol>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
};

const AdminStatistika = () => <AdminGuard><Inner /></AdminGuard>;
export default AdminStatistika;
