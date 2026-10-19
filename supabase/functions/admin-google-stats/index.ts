// Admin-only report for "Statistika → Google i ponašanje": Search Console + GA4 in one payload.
// Google is queried with the service account on the server; results are cached for CACHE_HOURS
// in admin_google_stats_cache so the page loads fast and Google quotas are not spent on every visit.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, corsHeaders } from "../_shared/invoices.ts";
import { ga4Funnel, ga4Report, gscQuery, type GscRow } from "../_shared/google.ts";

const CACHE_HOURS = 12;
const ALLOWED_DAYS = [7, 28, 90];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

// ---------- page types ----------
const PAGE_TYPES: [string, string, RegExp][] = [
  ["umrli", "Gradske stranice (/umrli)", /^\/umrli(\/|$)/],
  ["osmrtnica", "Osmrtnice (stranica pokojnika)", /^\/osmrtnica\//],
  ["blog", "Blog", /^\/blog(\/|$)/],
  ["memorijal", "Memorijal (prodaja i primjeri)", /^\/(digitalni-memorijal|kreiraj-memorijal|memorijal|memorijali|memorijal-primjer|memorijalni-vrt)(\/|$|-)/],
  ["groblja", "Groblja", /^\/(groblja|groblje)(\/|$)/],
  ["sprovodi", "Sprovodi", /^\/sprovodi(\/|$)/],
  ["svijece", "Svijeće", /^\/(zapali-svijecu|virtualne-svijece)(\/|$)/],
  ["naslovnica", "Naslovnica", /^\/$/],
];
const pathOf = (url: string) => {
  try { return new URL(url, "https://osmrtnica.com.hr").pathname; } catch { return url; }
};
// Single-segment paths that are site pages; any other /{slug} is a person's obituary page (route "/:slug").
const STATIC_PAGES = new Set(["blog", "gradovi", "informacije", "kontakt", "pretraga", "prijava", "registracija", "moj-racun",
  "objavi-osmrtnicu", "kako-objaviti-osmrtnicu", "cesto-postavljena-pitanja", "pravila-objavljivanja", "prigovori",
  "prijava-sadrzaja", "raskid-i-povrat", "uvjeti-koristenja", "politika-privatnosti", "kolacici", "zahvaljujemo",
  "obituary-success", "reset-password", "homepage-2", "homepage-3"]);
const pageType = (url: string) => {
  const p = pathOf(url);
  const hit = PAGE_TYPES.find(([, , re]) => re.test(p))?.[0];
  if (hit) return hit;
  const seg = p.replace(/^\/|\/$/g, "");
  return seg && !seg.includes("/") && !STATIC_PAGES.has(seg) ? "osmrtnica" : "ostalo";
};
const TYPE_LABEL: Record<string, string> = Object.fromEntries([...PAGE_TYPES.map(([k, l]) => [k, l]), ["ostalo", "Ostalo"]]);

// ---------- dates ----------
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

// ---------- helpers ----------
const sum = (rows: GscRow[]) => {
  const clicks = rows.reduce((a, r) => a + r.clicks, 0);
  const impressions = rows.reduce((a, r) => a + r.impressions, 0);
  const position = impressions ? rows.reduce((a, r) => a + r.position * r.impressions, 0) / impressions : null;
  return { clicks, impressions, ctr: impressions ? clicks / impressions : null, position };
};
const pct = (now: number, prev: number) => (prev ? (now - prev) / prev : null);

type Ga4Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
const ga4Rows = (r: { rows?: Ga4Row[] }) =>
  (r.rows ?? []).map((row) => ({ d: (row.dimensionValues ?? []).map((v) => v.value), m: (row.metricValues ?? []).map((v) => Number(v.value)) }));

const errors: string[] = [];
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (e) {
    errors.push(`${label}: ${(e as Error).message ?? e}`);
    console.error(`[admin-google-stats] ${label}`, e);
    return fallback;
  }
}

// ---------- Search Console ----------
async function searchConsole(days: number) {
  // GSC "final" data lags about 3 days.
  const end = addDays(new Date(), -3);
  const start = addDays(end, -(days - 1));
  const pEnd = addDays(start, -1);
  const pStart = addDays(pEnd, -(days - 1));
  const [pages, pagesPrev, pairs] = await Promise.all([
    gscQuery(iso(start), iso(end), ["page"]),
    gscQuery(iso(pStart), iso(pEnd), ["page"]),
    gscQuery(iso(start), iso(end), ["query", "page"]),
  ]);

  const byType = Object.keys(TYPE_LABEL).map((type) => {
    const now = sum(pages.filter((r) => pageType(r.keys[0]) === type));
    const prev = sum(pagesPrev.filter((r) => pageType(r.keys[0]) === type));
    return { type, label: TYPE_LABEL[type], ...now, prev };
  }).filter((t) => t.impressions || t.prev.impressions).sort((a, b) => b.clicks - a.clicks);

  // This site's own CTR for each rounded position, from query-level data (more honest than an industry curve).
  const expected: Record<number, number> = {};
  for (let p = 1; p <= 10; p++) {
    const rows = pairs.filter((r) => Math.round(r.position) === p);
    const imp = rows.reduce((a, r) => a + r.impressions, 0);
    if (imp >= 200) expected[p] = rows.reduce((a, r) => a + r.clicks, 0) / imp;
  }

  const topQuery = new Map<string, GscRow>();
  for (const r of pairs) {
    const cur = topQuery.get(r.keys[1]);
    if (!cur || r.impressions > cur.impressions) topQuery.set(r.keys[1], r);
  }

  const minImp = Math.max(50, days * 3);
  const missed = pages
    .filter((r) => r.position <= 10.5 && r.impressions >= minImp && expected[Math.max(1, Math.round(r.position))] != null)
    .map((r) => {
      const exp = expected[Math.max(1, Math.round(r.position))];
      return {
        page: r.keys[0], type: pageType(r.keys[0]), clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
        expectedCtr: exp, lostClicks: Math.round(r.impressions * exp - r.clicks), topQuery: topQuery.get(r.keys[0])?.keys[0] ?? null,
      };
    })
    .filter((r) => r.ctr < r.expectedCtr * 0.6 && r.lostClicks >= 5)
    .sort((a, b) => b.lostClicks - a.lostClicks).slice(0, 20);

  const nearFirst = pairs
    .filter((r) => r.position > 8 && r.position <= 20 && r.impressions >= Math.max(20, days))
    .sort((a, b) => b.impressions - a.impressions).slice(0, 20)
    .map((r) => ({ query: r.keys[0], page: r.keys[1], clicks: r.clicks, impressions: r.impressions, position: r.position }));

  const prevMap = new Map(pagesPrev.map((r) => [r.keys[0], r]));
  const drops = pages
    .map((r) => ({ r, p: prevMap.get(r.keys[0]) }))
    .filter(({ r, p }) => p && p.impressions >= 30 && r.impressions >= 10 && r.position - p.position >= 3)
    .map(({ r, p }) => ({
      page: r.keys[0], type: pageType(r.keys[0]), position: r.position, prevPosition: p!.position,
      clicks: r.clicks, prevClicks: p!.clicks, impressions: r.impressions,
    }))
    .sort((a, b) => (b.prevClicks - b.clicks) - (a.prevClicks - a.clicks) || b.impressions - a.impressions).slice(0, 15);

  return {
    range: { start: iso(start), end: iso(end), prevStart: iso(pStart), prevEnd: iso(pEnd) },
    totals: { ...sum(pages), prev: sum(pagesPrev) },
    byType, expectedCtr: expected, missed, nearFirst, drops,
  };
}

// ---------- GA4 ----------
const ev = (eventName: string, pageContains?: string) => ({
  funnelEventFilter: {
    eventName,
    ...(pageContains ? {
      funnelParameterFilterExpression: {
        funnelParameterFilter: { eventParameterName: "page_location", stringFilter: { matchType: "CONTAINS", value: pageContains } },
      },
    } : {}),
  },
});
const anyOf = (...e: Record<string, unknown>[]) => (e.length === 1 ? e[0] : { orGroup: { expressions: e } });

const CTA_EVENTS = ["obituary_memorial_click", "digital_memorial_click", "homepage_memorial_action", "cta_click"];

const FUNNELS = [
  {
    id: "osmrtnice",
    title: "Od osmrtnice do memorijala",
    note: "Posjetitelji koji su vidjeli osmrtnicu ili gradsku stranicu i redom prošli sljedeće korake.",
    steps: [
      { name: "Pogled na osmrtnicu ili /umrli", filterExpression: anyOf(ev("obituary_view"), ev("page_view", "/umrli")) },
      { name: "Klik na memorijal", filterExpression: anyOf(...CTA_EVENTS.map((e) => ev(e))) },
      { name: "Početak memorijala", filterExpression: ev("memorial_started") },
      { name: "Početak plaćanja", filterExpression: ev("begin_checkout") },
      { name: "Kupnja ili besplatna aktivacija", filterExpression: anyOf(ev("purchase"), ev("memorial_free_activation")) },
    ],
  },
  {
    id: "memorijal",
    title: "Prodajna stranica memorijala",
    note: "Svi koji su otvorili /digitalni-memorijal ili /kreiraj-memorijal (uključuje promet s oglasa).",
    steps: [
      { name: "Otvorena stranica memorijala", filterExpression: anyOf(ev("page_view", "/digitalni-memorijal"), ev("page_view", "/kreiraj-memorijal")) },
      { name: "Početak memorijala", filterExpression: ev("memorial_started") },
      { name: "Početak plaćanja", filterExpression: ev("begin_checkout") },
      { name: "Kupnja ili besplatna aktivacija", filterExpression: anyOf(ev("purchase"), ev("memorial_free_activation")) },
    ],
  },
];

type FunnelStepOut = { name: string; users: number; completionRate: number | null; abandonments: number | null };

function parseFunnel(r: Record<string, any>) {
  const t = r.funnelTable ?? {};
  const dims: string[] = (t.dimensionHeaders ?? []).map((h: { name: string }) => h.name);
  const mets: string[] = (t.metricHeaders ?? []).map((h: { name: string }) => h.name);
  const stepIdx = dims.indexOf("funnelStepName");
  const otherIdx = dims.findIndex((d, i) => i !== stepIdx);
  const mi = (n: string) => mets.indexOf(n);
  const groups = new Map<string, FunnelStepOut[]>();
  for (const row of ga4Rows(t)) {
    const stepName = row.d[stepIdx] ?? "";
    const n = parseInt(stepName, 10);
    if (!Number.isFinite(n)) continue;
    const key = otherIdx >= 0 ? row.d[otherIdx] : "all";
    if (key === "RESERVED_TOTAL") continue;
    const arr = groups.get(key) ?? [];
    arr[n - 1] = {
      name: stepName.replace(/^\d+\.\s*/, ""),
      users: row.m[mi("activeUsers")] ?? 0,
      completionRate: mi("funnelStepCompletionRate") >= 0 ? row.m[mi("funnelStepCompletionRate")] : null,
      abandonments: mi("funnelStepAbandonments") >= 0 ? row.m[mi("funnelStepAbandonments")] : null,
    };
    groups.set(key, arr);
  }
  return groups;
}

async function funnels(days: number) {
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "yesterday" }];
  return await Promise.all(FUNNELS.map(async (f) => {
    const base = { dateRanges, funnel: { isOpenFunnel: false, steps: f.steps } };
    const total = await safe(`Lijevak „${f.title}”`, () => ga4Funnel(base), null);
    const steps = total ? (parseFunnel(total).get("all") ?? []) : [];
    const breakdown = async (dim: string) => {
      const r = await safe(`Lijevak „${f.title}” po ${dim}`, () => ga4Funnel({ ...base, funnelBreakdown: { breakdownDimension: { name: dim }, limit: 6 } }), null);
      if (!r) return [];
      return [...parseFunnel(r).entries()].map(([value, s]) => ({ value, users: f.steps.map((_, i) => s[i]?.users ?? 0) }))
        .sort((a, b) => b.users[0] - a.users[0]);
    };
    const [device, channel] = await Promise.all([breakdown("deviceCategory"), breakdown("sessionDefaultChannelGroup")]);
    return { id: f.id, title: f.title, note: f.note, steps: f.steps.map((s, i) => steps[i] ?? { name: s.name, users: 0, completionRate: null, abandonments: null }), device, channel };
  }));
}

const KEY_EVENTS = ["memorial_started", "begin_checkout", "purchase", "memorial_free_activation", "newsletter_signup", ...CTA_EVENTS];
const inList = (field: string, values: string[]) => ({ filter: { fieldName: field, inListFilter: { values } } });

async function channels(days: number) {
  const dateRanges = [
    { startDate: `${days}daysAgo`, endDate: "yesterday", name: "now" },
    { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo`, name: "prev" },
  ];
  const report = async (dim: string) => {
    const [sess, events] = await Promise.all([
      ga4Report({ dateRanges, dimensions: [{ name: dim }], metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagementRate" }], limit: 50 }),
      ga4Report({ dateRanges, dimensions: [{ name: dim }, { name: "eventName" }], metrics: [{ name: "totalUsers" }], dimensionFilter: inList("eventName", KEY_EVENTS), limit: 500 }),
    ]);
    // With two date ranges GA4 appends a "dateRange" dimension.
    const out = new Map<string, Record<string, any>>();
    const get = (k: string) => {
      if (!out.has(k)) out.set(k, { value: k, now: { sessions: 0, users: 0, engagementRate: null, events: {} }, prev: { sessions: 0, users: 0, engagementRate: null, events: {} } });
      return out.get(k)!;
    };
    for (const r of ga4Rows(sess)) {
      const slot = get(r.d[0])[r.d[r.d.length - 1] === "prev" ? "prev" : "now"];
      slot.sessions = r.m[0]; slot.users = r.m[1]; slot.engagementRate = r.m[2];
    }
    for (const r of ga4Rows(events)) {
      const slot = get(r.d[0])[r.d[r.d.length - 1] === "prev" ? "prev" : "now"];
      const name = CTA_EVENTS.includes(r.d[1]) ? "cta" : r.d[1];
      slot.events[name] = (slot.events[name] ?? 0) + r.m[0];
    }
    return [...out.values()].sort((a, b) => b.now.sessions - a.now.sessions);
  };
  const [byChannel, byCampaign, byDevice] = await Promise.all([
    safe("Kanali", () => report("sessionDefaultChannelGroup"), []),
    safe("Kampanje", () => report("sessionCampaignName"), []),
    safe("Uređaji", () => report("deviceCategory"), []),
  ]);
  return {
    byChannel,
    byCampaign: byCampaign.filter((c) => c.value && !c.value.startsWith("(")).slice(0, 15),
    byDevice,
  };
}

async function landingPages(days: number) {
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "yesterday" }];
  const [sess, events] = await Promise.all([
    ga4Report({
      dateRanges, dimensions: [{ name: "landingPage" }],
      metrics: [{ name: "sessions" }, { name: "engagementRate" }, { name: "averageSessionDuration" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 300,
    }),
    ga4Report({
      dateRanges, dimensions: [{ name: "landingPage" }, { name: "eventName" }], metrics: [{ name: "eventCount" }],
      dimensionFilter: inList("eventName", [...CTA_EVENTS, "memorial_started", "newsletter_signup", "obituary_candle_click"]), limit: 2000,
    }),
  ]);
  const evMap = new Map<string, Record<string, number>>();
  for (const r of ga4Rows(events)) {
    const m = evMap.get(r.d[0]) ?? {};
    const name = CTA_EVENTS.includes(r.d[1]) ? "cta" : r.d[1];
    m[name] = (m[name] ?? 0) + r.m[0];
    evMap.set(r.d[0], m);
  }
  const rows = ga4Rows(sess).filter((r) => r.d[0] && r.d[0] !== "(not set)").map((r) => {
    const e = evMap.get(r.d[0]) ?? {};
    return {
      page: r.d[0], type: pageType(r.d[0]), sessions: r.m[0], engagementRate: r.m[1], avgDuration: r.m[2],
      cta: e.cta ?? 0, starts: e.memorial_started ?? 0, newsletter: e.newsletter_signup ?? 0, candles: e.obituary_candle_click ?? 0,
    };
  });
  const byType = Object.keys(TYPE_LABEL).map((type) => {
    const t = rows.filter((r) => r.type === type);
    const sessions = t.reduce((a, r) => a + r.sessions, 0);
    return {
      type, label: TYPE_LABEL[type], sessions,
      engagementRate: sessions ? t.reduce((a, r) => a + r.engagementRate * r.sessions, 0) / sessions : null,
      cta: t.reduce((a, r) => a + r.cta, 0), starts: t.reduce((a, r) => a + r.starts, 0),
      newsletter: t.reduce((a, r) => a + r.newsletter, 0), candles: t.reduce((a, r) => a + r.candles, 0),
    };
  }).filter((t) => t.sessions).sort((a, b) => b.sessions - a.sessions);
  return { pages: rows.slice(0, 40), byType };
}

// ---------- "Što se promijenilo" ----------
function changes(gsc: any, ch: any) {
  const out: { text: string; good: boolean; size: number }[] = [];
  const fmt = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)} %`;
  if (gsc?.totals) {
    const c = pct(gsc.totals.clicks, gsc.totals.prev.clicks);
    if (c != null) out.push({ text: `Klikovi s Googlea ukupno: ${fmt(c)} (${gsc.totals.prev.clicks} → ${gsc.totals.clicks})`, good: c >= 0, size: Math.abs(c) + 1 });
    for (const t of gsc.byType ?? []) {
      const d = pct(t.clicks, t.prev.clicks);
      if (d != null && Math.abs(d) >= 0.2 && Math.max(t.clicks, t.prev.clicks) >= 30) {
        out.push({ text: `${t.label} na Googleu: ${fmt(d)} klikova (${t.prev.clicks} → ${t.clicks})`, good: d >= 0, size: Math.abs(d) });
      }
    }
  }
  for (const c of ch?.byChannel ?? []) {
    const d = pct(c.now.sessions, c.prev.sessions);
    if (d != null && Math.abs(d) >= 0.25 && Math.max(c.now.sessions, c.prev.sessions) >= 50) {
      out.push({ text: `Posjeti iz kanala ${c.value}: ${fmt(d)} (${c.prev.sessions} → ${c.now.sessions})`, good: d >= 0, size: Math.abs(d) });
    }
    const s = c.now.events.memorial_started ?? 0, sp = c.prev.events.memorial_started ?? 0;
    if (Math.max(s, sp) >= 5 && s !== sp) {
      out.push({ text: `Započeti memorijali iz kanala ${c.value}: ${sp} → ${s}`, good: s >= sp, size: Math.abs(s - sp) / Math.max(sp, 1) });
    }
  }
  return out.sort((a, b) => b.size - a.size).slice(0, 6).map(({ text, good }) => ({ text, good }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  errors.length = 0;
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ ok: false, error: "Neautorizirano" }, 401);
    const admin = adminClient();
    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const { data: userData, error: userError } = await admin.auth.getUser(token);
      if (userError || !userData.user) return json({ ok: false, error: "Neautorizirano" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
      if (!isAdmin) return json({ ok: false, error: "Samo administratori" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const days = ALLOWED_DAYS.includes(Number(body.days)) ? Number(body.days) : 28;

    if (!body.refresh) {
      const { data: hit } = await admin.from("admin_google_stats_cache").select("payload, fetched_at").eq("days", days).maybeSingle();
      if (hit && Date.now() - new Date(hit.fetched_at).getTime() < CACHE_HOURS * 3600_000) {
        return json({ ok: true, cached: true, ...hit.payload });
      }
    }

    const [gsc, funnel, ch, landing] = await Promise.all([
      safe("Search Console", () => searchConsole(days), null),
      funnels(days),
      channels(days),
      safe("Ulazne stranice", () => landingPages(days), null),
    ]);
    const payload = { days, fetchedAt: new Date().toISOString(), gsc, funnels: funnel, channels: ch, landing, changes: changes(gsc, ch), errors: [...errors] };
    if (gsc || landing) {
      await admin.from("admin_google_stats_cache").upsert({ days, payload, fetched_at: payload.fetchedAt });
    }
    return json({ ok: true, cached: false, ...payload });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500);
  }
});
