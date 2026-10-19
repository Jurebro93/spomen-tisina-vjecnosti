import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = Record<string, any>;

const TZ = 'Europe/Zagreb';
const num = (v: any) => (v == null ? '—' : new Intl.NumberFormat('hr-HR').format(Math.round(Number(v))));
const pct = (v: any, digits = 0) => (v == null || !Number.isFinite(Number(v)) ? '—' : `${(Number(v) * 100).toFixed(digits).replace('.', ',')} %`);
const pos = (v: any) => (v == null ? '—' : Number(v).toFixed(1).replace('.', ','));
const share = (a: number, b: number) => (b ? a / b : null);
const secs = (v: any) => (v == null ? '—' : `${Math.floor(Number(v) / 60)} min ${Math.round(Number(v) % 60)} s`);
const short = (url: string) => {
  try { return decodeURIComponent(new URL(url, 'https://osmrtnica.com.hr').pathname); } catch { return url; }
};
const delta = (now: number, prev: number) => {
  if (!prev) return null;
  const d = (now - prev) / prev;
  return <span className={`text-xs ml-1 ${d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{d >= 0 ? '+' : ''}{Math.round(d * 100)} %</span>;
};
const CHANNEL_HR: Record<string, string> = {
  'Organic Search': 'Google i tražilice', Direct: 'Direktno', 'Paid Social': 'Plaćene društvene mreže', 'Organic Social': 'Društvene mreže',
  Referral: 'Druge stranice', Unassigned: 'Nepoznato', Email: 'E-mail', 'Paid Search': 'Plaćena pretraga', 'Organic Video': 'Video',
};
const DEVICE_HR: Record<string, string> = { mobile: 'Mobitel', desktop: 'Računalo', tablet: 'Tablet', nepoznato: 'Nepoznato' };
const chan = (v: string) => CHANNEL_HR[v] ?? v;
const dev = (v: string) => DEVICE_HR[v] ?? v;

const WIZARD = [
  ['start_create', 'Otvorena izrada (odabir osobe)'],
  ['wizard_1', '1. Osoba'], ['wizard_2', '2. Vaš odnos'], ['wizard_3', '3. Biografija'], ['wizard_4', '4. Životni put'],
  ['wizard_5', '5. Fotografije'], ['wizard_6', '6. Privatnost'], ['wizard_7', '7. Pregled'],
  ['checkout', 'Otvoreno plaćanje'], ['paid', 'Plaćeno ili aktivirano'],
] as const;

const Bars = ({ rows }: { rows: { label: string; value: number }[] }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2">
      {rows.map((s, i) => {
        const prev = i > 0 ? rows[i - 1].value : null;
        const lost = prev != null ? prev - s.value : null;
        return (
          <div key={s.label} className="grid grid-cols-[1fr_auto] md:grid-cols-[16rem_1fr_11rem] items-center gap-2">
            <span className="text-sm">{s.label}</span>
            <div className="hidden md:block h-3 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${(s.value / max) * 100}%` }} />
            </div>
            <span className="text-sm tabular-nums text-right">
              {num(s.value)}
              {prev != null && prev > 0 && (
                <span className={`block text-xs ${lost && lost / prev > 0.5 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                  nastavak {pct(Math.min(1, s.value / prev))} · ispalo {num(Math.max(0, lost ?? 0))}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const Breakdown = ({ title, rows, steps, label }: { title: string; rows: any[]; steps: any[]; label: (v: string) => string }) =>
  rows?.length ? (
    <div className="mt-4 overflow-x-auto">
      <p className="text-sm font-medium mb-1">{title}</p>
      <Table>
        <TableHeader><TableRow>
          <TableHead />
          {steps.map((s: any) => <TableHead key={s.name} className="text-right">{s.name}</TableHead>)}
          <TableHead className="text-right">Ukupna konverzija</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r: any) => (
            <TableRow key={r.value}>
              <TableCell>{label(r.value)}</TableCell>
              {r.users.map((u: number, i: number) => (
                <TableCell key={i} className="text-right tabular-nums">
                  {num(u)}
                  {i > 0 && r.users[i - 1] > 0 && <span className="block text-xs text-muted-foreground">{pct(u / r.users[i - 1])}</span>}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums font-medium">{pct(share(r.users[r.users.length - 1], r.users[0]), 1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ) : null;

const TypeName = ({ t }: { t: string }) => <Badge variant="outline" className="font-normal">{t}</Badge>;

export default function GoogleStats() {
  const [days, setDays] = useState('28');
  const [data, setData] = useState<Data | null>(null);
  const [wizard, setWizard] = useState<{ step: string; device: string; n: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true); setError(null);
    const from = new Date(Date.now() - Number(days) * 86400000);
    const [g, w] = await Promise.all([
      supabase.functions.invoke('admin-google-stats', { body: { days: Number(days), refresh } }),
      supabase.rpc('admin_wizard_steps' as never, { _from: from.toISOString(), _to: new Date().toISOString() } as never),
    ]);
    if (g.error || !g.data?.ok) setError(g.data?.error ?? g.error?.message ?? 'Podaci nisu dostupni');
    else setData(g.data);
    setWizard(w.error ? null : ((w.data as any[]) ?? []).map((r) => ({ ...r, n: Number(r.n) })));
    setLoading(false);
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const gsc = data?.gsc;
  const landing = data?.landing;
  const ch = data?.channels;
  const wizardTotal = (step: string, device?: string) =>
    (wizard ?? []).filter((r) => r.step === step && (!device || r.device === device)).reduce((a, r) => a + r.n, 0);
  const wizardDevices = [...new Set((wizard ?? []).map((r) => r.device))].filter((d) => wizardTotal('start_create', d) > 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Zadnjih 7 dana</SelectItem>
            <SelectItem value="28">Zadnjih 28 dana</SelectItem>
            <SelectItem value="90">Zadnjih 90 dana</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Osvježi s Googlea
        </Button>
        {data?.fetchedAt && (
          <span className="text-xs text-muted-foreground">
            Podaci dohvaćeni {new Date(data.fetchedAt).toLocaleString('hr-HR', { timeZone: TZ })}{data.cached ? ' (spremljeno, osvježava se svakih 12 h)' : ''}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        GA4 broji samo posjetitelje koji su prihvatili analitičke kolačiće, pa su brojevi niži od stvarnih; postoci između koraka i dalje su upotrebljivi.
        Search Console kasni oko 3 dana. Koraci izrade memorijala dolaze iz vlastite baze i broje se i bez privole.
      </p>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {data?.errors?.length > 0 && (
        <div className="mt-4 text-xs text-amber-700 flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Dio podataka nije dohvaćen: {data.errors.join(' · ')}</span>
        </div>
      )}
      {loading && !data && <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}

      {data && (
        <>
          {data.changes?.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="text-lg">Što se promijenilo u odnosu na prethodno razdoblje</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {data.changes.map((c: any) => (
                    <li key={c.text} className="flex items-center gap-2 text-sm">
                      {c.good ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}{c.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* GA4 funnels */}
          {data.funnels?.map((f: any) => (
            <Card key={f.id} className="mt-8">
              <CardHeader><CardTitle className="text-lg">Lijevak: {f.title}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{f.note} Isti korisnik prati se kroz korake redom (GA4).</p>
                <Bars rows={f.steps.map((s: any) => ({ label: s.name, value: s.users }))} />
                <Breakdown title="Po uređaju" rows={f.device} steps={f.steps} label={dev} />
                <Breakdown title="Po izvoru prometa" rows={f.channel} steps={f.steps} label={chan} />
              </CardContent>
            </Card>
          ))}

          {/* Wizard (own data) */}
          <Card className="mt-8">
            <CardHeader><CardTitle className="text-lg">Gdje ljudi odustaju u izradi memorijala</CardTitle></CardHeader>
            <CardContent>
              {wizard == null ? <p className="text-sm text-muted-foreground">Podaci nisu dostupni.</p> : wizardTotal('wizard_1') === 0 ? (
                <p className="text-sm text-muted-foreground">Koraci izrade prate se od ove nadogradnje; podaci će se pojaviti nakon prvih posjeta /kreiraj-memorijal.</p>
              ) : (
                <>
                  <Bars rows={WIZARD.map(([k, l]) => ({ label: l, value: wizardTotal(k) }))} />
                  {wizardDevices.length > 1 && (
                    <div className="mt-4 overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Korak</TableHead>{wizardDevices.map((d) => <TableHead key={d} className="text-right">{dev(d)}</TableHead>)}</TableRow></TableHeader>
                        <TableBody>
                          {WIZARD.map(([k, l]) => (
                            <TableRow key={k}>
                              <TableCell>{l}</TableCell>
                              {wizardDevices.map((d) => (
                                <TableCell key={d} className="text-right tabular-nums">
                                  {num(wizardTotal(k, d))}
                                  <span className="block text-xs text-muted-foreground">{pct(share(wizardTotal(k, d), wizardTotal('start_create', d)))} od početka</span>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Channels */}
          {ch?.byChannel?.length > 0 && (
            <Card className="mt-8">
              <CardHeader><CardTitle className="text-lg">Izvori prometa i što posjetitelji naprave</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <SourceTable rows={ch.byChannel} label={chan} />
                {ch.byCampaign?.length > 0 && (
                  <>
                    <p className="text-sm font-medium mt-6 mb-1">Kampanje (utm_campaign)</p>
                    <SourceTable rows={ch.byCampaign} label={(v) => v} />
                  </>
                )}
                {ch.byDevice?.length > 0 && (
                  <>
                    <p className="text-sm font-medium mt-6 mb-1">Uređaji</p>
                    <SourceTable rows={ch.byDevice} label={dev} />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search Console */}
          {gsc && (
            <>
              <Card className="mt-8">
                <CardHeader><CardTitle className="text-lg">Google pretraga po vrsti stranice</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <p className="text-xs text-muted-foreground mb-3">
                    {gsc.range.start} – {gsc.range.end}, uspoređeno s {gsc.range.prevStart} – {gsc.range.prevEnd}. Ukupno {num(gsc.totals.clicks)} klikova{delta(gsc.totals.clicks, gsc.totals.prev.clicks)} od {num(gsc.totals.impressions)} prikaza.
                  </p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Vrsta stranice</TableHead><TableHead className="text-right">Prikazi</TableHead><TableHead className="text-right">Klikovi</TableHead>
                      <TableHead className="text-right">CTR</TableHead><TableHead className="text-right">Pozicija</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {gsc.byType.map((t: any) => (
                        <TableRow key={t.type}>
                          <TableCell>{t.label}</TableCell>
                          <TableCell className="text-right tabular-nums">{num(t.impressions)}{delta(t.impressions, t.prev.impressions)}</TableCell>
                          <TableCell className="text-right tabular-nums">{num(t.clicks)}{delta(t.clicks, t.prev.clicks)}</TableCell>
                          <TableCell className="text-right tabular-nums">{pct(t.ctr, 1)}</TableCell>
                          <TableCell className="text-right tabular-nums">{pos(t.position)} <span className="text-xs text-muted-foreground">(prije {pos(t.prev.position)})</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="mt-8">
                <CardHeader><CardTitle className="text-lg">Propuštene prilike: vide nas, a ne kliknu</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <p className="text-xs text-muted-foreground mb-3">
                    Stranice na prvih 10 mjesta čiji je CTR znatno niži od prosjeka ovog weba za istu poziciju. Najčešći lijek: jasniji naslov i opis u rezultatima pretrage.
                  </p>
                  {gsc.missed.length === 0 ? <p className="text-sm text-muted-foreground">Nema takvih stranica u ovom razdoblju.</p> : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Stranica</TableHead><TableHead>Glavni upit</TableHead><TableHead className="text-right">Pozicija</TableHead>
                        <TableHead className="text-right">Prikazi</TableHead><TableHead className="text-right">CTR / očekivano</TableHead><TableHead className="text-right">Propušteno klikova</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {gsc.missed.map((r: any) => (
                          <TableRow key={r.page}>
                            <TableCell className="max-w-[18rem] truncate"><a href={r.page} target="_blank" rel="noreferrer" className="hover:underline">{short(r.page)} <ExternalLink className="inline h-3 w-3" /></a></TableCell>
                            <TableCell className="max-w-[14rem] truncate">{r.topQuery ?? '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">{pos(r.position)}</TableCell>
                            <TableCell className="text-right tabular-nums">{num(r.impressions)}</TableCell>
                            <TableCell className="text-right tabular-nums">{pct(r.ctr, 1)} / {pct(r.expectedCtr, 1)}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">~{num(r.lostClicks)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-8 mt-8">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Skoro na prvoj stranici (pozicija 8–20)</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Upit</TableHead><TableHead>Stranica</TableHead><TableHead className="text-right">Prikazi</TableHead><TableHead className="text-right">Pozicija</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {gsc.nearFirst.map((r: any) => (
                          <TableRow key={r.query + r.page}>
                            <TableCell className="max-w-[12rem] truncate">{r.query}</TableCell>
                            <TableCell className="max-w-[12rem] truncate text-xs">{short(r.page)}</TableCell>
                            <TableCell className="text-right tabular-nums">{num(r.impressions)}</TableCell>
                            <TableCell className="text-right tabular-nums">{pos(r.position)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Stranice koje su pale na Googleu</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    {gsc.drops.length === 0 ? <p className="text-sm text-muted-foreground">Nijedna stranica nije pala 3 ili više mjesta.</p> : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Stranica</TableHead><TableHead className="text-right">Pozicija</TableHead><TableHead className="text-right">Klikovi</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {gsc.drops.map((r: any) => (
                            <TableRow key={r.page}>
                              <TableCell className="max-w-[16rem] truncate text-xs">{short(r.page)}</TableCell>
                              <TableCell className="text-right tabular-nums">{pos(r.prevPosition)} → <span className="text-red-600">{pos(r.position)}</span></TableCell>
                              <TableCell className="text-right tabular-nums">{num(r.prevClicks)} → {num(r.clicks)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Landing pages */}
          {landing && (
            <Card className="mt-8">
              <CardHeader><CardTitle className="text-lg">Ulazne stranice: gdje posjetitelji odmah odu</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <p className="text-xs text-muted-foreground mb-3">
                  "Angažirane" su sesije duže od 10 s, s 2+ stranice ili s radnjom. Crveno označene stranice imaju puno posjeta, a gotovo nitko ne klikne na memorijal: tamo je najjeftinije dobiti konverzije (bolji položaj ili tekst gumba).
                </p>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Vrsta</TableHead><TableHead className="text-right">Sesije</TableHead><TableHead className="text-right">Angažirane</TableHead>
                    <TableHead className="text-right">Klik na memorijal</TableHead><TableHead className="text-right">Početak memorijala</TableHead>
                    <TableHead className="text-right">Svijeće</TableHead><TableHead className="text-right">Newsletter</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {landing.byType.map((t: any) => (
                      <TableRow key={t.type}>
                        <TableCell>{t.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(t.sessions)}</TableCell>
                        <TableCell className="text-right tabular-nums">{pct(t.engagementRate)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(t.cta)} <span className="text-xs text-muted-foreground">({pct(share(t.cta, t.sessions), 1)})</span></TableCell>
                        <TableCell className="text-right tabular-nums">{num(t.starts)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(t.candles)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(t.newsletter)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <p className="text-sm font-medium mt-6 mb-1">Najposjećenije ulazne stranice</p>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Stranica</TableHead><TableHead className="text-right">Sesije</TableHead><TableHead className="text-right">Angažirane</TableHead>
                    <TableHead className="text-right">Prosj. trajanje</TableHead><TableHead className="text-right">Klik na memorijal</TableHead><TableHead className="text-right">Početak memorijala</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {landing.pages.map((r: any) => {
                      const weak = r.sessions >= 100 && share(r.cta, r.sessions)! < 0.002;
                      return (
                        <TableRow key={r.page} className={weak ? 'bg-red-50 dark:bg-red-950/30' : ''}>
                          <TableCell className="max-w-[20rem] truncate">
                            <a href={`https://osmrtnica.com.hr${r.page}`} target="_blank" rel="noreferrer" className="hover:underline">{short(r.page)}</a> <TypeName t={r.type} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{num(r.sessions)}</TableCell>
                          <TableCell className="text-right tabular-nums">{pct(r.engagementRate)}</TableCell>
                          <TableCell className="text-right tabular-nums">{secs(r.avgDuration)}</TableCell>
                          <TableCell className="text-right tabular-nums">{num(r.cta)} <span className="text-xs text-muted-foreground">({pct(share(r.cta, r.sessions), 1)})</span></TableCell>
                          <TableCell className="text-right tabular-nums">{num(r.starts)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function SourceTable({ rows, label }: { rows: any[]; label: (v: string) => string }) {
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Izvor</TableHead><TableHead className="text-right">Sesije</TableHead><TableHead className="text-right">Angažirane</TableHead>
        <TableHead className="text-right">Klik na memorijal</TableHead><TableHead className="text-right">Početak memorijala</TableHead>
        <TableHead className="text-right">Plaćanje</TableHead><TableHead className="text-right">Kupnja / aktivacija</TableHead><TableHead className="text-right">Newsletter</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => {
          const e = r.now.events;
          return (
            <TableRow key={r.value}>
              <TableCell>{label(r.value)}</TableCell>
              <TableCell className="text-right tabular-nums">{num(r.now.sessions)}{delta(r.now.sessions, r.prev.sessions)}</TableCell>
              <TableCell className="text-right tabular-nums">{pct(r.now.engagementRate)}</TableCell>
              <TableCell className="text-right tabular-nums">{num(e.cta ?? 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{num(e.memorial_started ?? 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{num(e.begin_checkout ?? 0)}</TableCell>
              <TableCell className="text-right tabular-nums">{num((e.purchase ?? 0) + (e.memorial_free_activation ?? 0))}</TableCell>
              <TableCell className="text-right tabular-nums">{num(e.newsletter_signup ?? 0)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
