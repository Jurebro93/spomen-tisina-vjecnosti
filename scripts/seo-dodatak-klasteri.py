"""Dodatak dnevnom izvještaju: klasteri na blogu (indeksiranje, GSC, plan objave) + LLM/backlink eksperiment (GSC ciljnih stranica)."""
import base64, datetime as dt, html, json, os, random, sys, concurrent.futures as cf
from urllib.parse import quote
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

SITE = "https://osmrtnica.com.hr"
PROP = SITE + "/"
info = json.loads(base64.b64decode(os.environ["GOOGLE_SA_KEY_B64"]))
creds = service_account.Credentials.from_service_account_info(info, scopes=["https://www.googleapis.com/auth/webmasters"])
s = AuthorizedSession(creds)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "izlaz")
os.makedirs(OUT, exist_ok=True)
today = dt.date.today()

# Plan objave (tjedne ture od ~200 stranica). Cilj = planirani broj stranica po klasteru.
CLUSTERS = [  # (data mapa na webu, URL prefiks, naziv, cilj, planirani tjedan dovršetka)
    ("sanjarica", "/blog/sanjarica", "Sanjarica (snovi)", 419, "do 22. 11."),
    ("imena", "/blog/znacenje-imena", "Značenje imena i imendani", 1200, "do 20. 12."),
    ("imendani", "/blog/imendani", "Imendani po danima", 365, "do 29. 11."),
    ("sucut", "/blog/sucut", "Sućut i poruke utjehe", 75, "do 15. 11."),
    ("molitve", "/blog/molitve", "Molitve", 200, "do 6. 12."),
    ("sveci", "/blog/sveci", "Sveci i blagdani", 250, "do 3. 1."),
    ("psalmi", "/blog/psalmi", "Psalmi", 150, "do 10. 1."),
    ("andeoski-brojevi", "/blog/andeoski-brojevi", "Anđeoski brojevi", 45, "do 17. 1."),
    ("biblijski-citati", "/blog/biblijski-citati", "Biblijski citati", 75, "do 17. 1."),
]
PLAN_TEXT = ("Plan: svaki tjedan jedna tura od oko 200 stranica (ne sve odjednom, zbog Googlea). "
             "Redoslijed: snovi i imena, sućut, imendani po danima, molitve, sveci, psalmi, anđeoski brojevi i citati. "
             "Sve planirano (oko 2.800 stranica) objavljeno do sredine siječnja 2027.")

# LLM/backlink eksperiment: ciljne stranice linkova s portala (od 20. 10. 2026.)
LLM_START = dt.date(2026, 10, 20)
LLM_TARGETS = ["/", "/groblja", "/blog/postupak-kod-smrtnog-slucaja", "/blog/kako-napisati-osmrtnicu",
               "/blog/kako-pruziti-podrsku-ozaloscenoj-osobi"]


def gsc(body):
    r = s.post(f"https://www.googleapis.com/webmasters/v3/sites/{quote(PROP, safe='')}/searchAnalytics/query", json=body).json()
    if "error" in r:
        print("GSC greška:", r["error"].get("message"), file=sys.stderr)
    return r.get("rows", [])


def norm(u):
    u = u.split("#")[0].split("?")[0]
    return (u.rstrip("/") or u).replace(SITE, "") or "/"


# 1. Klasteri: što je objavljeno (index.json na živom webu)
published = {}
for key, prefix, name, goal, due in CLUSTERS:
    try:
        r = requests.get(f"{SITE}/data/{key}/index.json", timeout=20)
        rows = r.json() if r.ok and "json" in r.headers.get("content-type", "") else []
    except Exception:
        rows = []
    published[key] = [prefix] + [f"{prefix}/{x['slug']}" for x in rows] if rows else []
live = [(c, published[c[0]]) for c in CLUSTERS if published[c[0]]]

# 2. GSC: impresije i klikovi po stranici od objave; prvi dan s impresijom
first_seen, per_page = {}, {}
for (key, prefix, *_), urls in live:
    rows = gsc({"startDate": "2026-11-01", "endDate": today.isoformat(), "dimensions": ["date", "page"],
                "dimensionFilterGroups": [{"filters": [{"dimension": "page", "operator": "contains", "expression": SITE + prefix}]}],
                "rowLimit": 25000, "dataState": "all"})
    for r in rows:
        d, p = r["keys"][0], norm(r["keys"][1])
        o = per_page.setdefault(p, {"clicks": 0, "impressions": 0, "possum": 0, "cluster": key})
        o["clicks"] += r["clicks"]; o["impressions"] += r["impressions"]; o["possum"] += r["position"] * r["impressions"]
        if r["impressions"] > 0 and (p not in first_seen or d < first_seen[p]):
            first_seen[p] = d
qrows = []
for (key, prefix, *_), urls in live:
    qrows += [(key, r) for r in gsc({"startDate": "2026-11-01", "endDate": today.isoformat(), "dimensions": ["query"],
                                     "dimensionFilterGroups": [{"filters": [{"dimension": "page", "operator": "contains", "expression": SITE + prefix}]}],
                                     "rowLimit": 50, "dataState": "all"})]


# 3. URL Inspection: glavne stranice + uzorak (kvota 2.000/dan)
def inspect(path):
    try:
        r = s.post("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
                   json={"inspectionUrl": SITE + path, "siteUrl": PROP}, timeout=60).json()
        st = r.get("inspectionResult", {}).get("indexStatusResult", {})
        return path, st.get("verdict"), st.get("coverageState"), st.get("lastCrawlTime")
    except Exception as e:
        return path, "ERROR", str(e)[:80], None


sample = []
random.seed(today.toordinal())
for (key, prefix, *_), urls in live:
    sample.append(prefix)
    rest = urls[1:]
    sample += random.sample(rest, min(len(rest), 40))
with cf.ThreadPoolExecutor(8) as ex:
    insp = list(ex.map(inspect, sample))

clusters_out = []
for (key, prefix, name, goal, due), urls in live:
    ins = [x for x in insp if x[0] == prefix or x[0].startswith(prefix + "/")]
    idx = [x for x in ins if x[1] == "PASS"]
    crawled = [x for x in ins if x[3]]
    pp = {p: o for p, o in per_page.items() if o["cluster"] == key}
    imp = sum(o["impressions"] for o in pp.values()); clk = sum(o["clicks"] for o in pp.values())
    pos = sum(o["possum"] for o in pp.values()) / imp if imp else None
    first = min((first_seen[p] for p in pp if p in first_seen), default=None)
    clusters_out.append({
        "klaster": name, "objavljeno": len(urls), "cilj": goal, "napredak_pct": round(len(urls) / (goal + 1) * 100),
        "rok": due, "uzorak_provjereno": len(ins), "uzorak_indeksirano": len(idx), "uzorak_googlebot_posjetio": len(crawled),
        "glavna_stranica": next(((x[1], x[2]) for x in ins if x[0] == prefix), None),
        "stranica_s_impresijama": sum(1 for o in pp.values() if o["impressions"] > 0),
        "impresije": imp, "klikovi": clk, "pozicija": round(pos, 1) if pos else None, "prva_impresija": first,
        "top_stranice": sorted([(p, o["impressions"], o["clicks"], round(o["possum"] / o["impressions"], 1)) for p, o in pp.items() if o["impressions"]],
                               key=lambda x: -x[1])[:5],
        "top_upiti": sorted([(r["keys"][0], r["impressions"], r["clicks"], round(r["position"], 1)) for k, r in qrows if k == key],
                            key=lambda x: -x[1])[:5],
        "status_uzorka": sorted({x[2] for x in ins if x[2]}),
    })
not_started = [(name, goal, due) for (key, prefix, name, goal, due) in CLUSTERS if not published[key]]

# 4. LLM/backlink eksperiment: ciljne stranice i brend upiti, isti broj dana prije i poslije 20. 10.
rows = gsc({"startDate": "2026-09-01", "endDate": today.isoformat(), "dimensions": ["date"], "dataState": "all"})
last = max((dt.date.fromisoformat(r["keys"][0]) for r in rows if r["impressions"] > 0), default=today - dt.timedelta(days=3))
n = (last - LLM_START).days + 1
b0, b1, a0, a1 = LLM_START - dt.timedelta(days=n), LLM_START - dt.timedelta(days=1), LLM_START, last


def page_stats(a, b):
    out = {}
    for r in gsc({"startDate": a.isoformat(), "endDate": b.isoformat(), "dimensions": ["page"], "rowLimit": 25000, "dataState": "all"}):
        p = norm(r["keys"][0])
        if p in LLM_TARGETS:
            o = out.setdefault(p, [0, 0, 0]); o[0] += r["clicks"]; o[1] += r["impressions"]; o[2] += r["position"] * r["impressions"]
    return out


def site_total(a, b):
    r = gsc({"startDate": a.isoformat(), "endDate": b.isoformat(), "dataState": "all"})
    return (r[0]["clicks"], r[0]["impressions"]) if r else (0, 0)


def brand(a, b):
    rr = gsc({"startDate": a.isoformat(), "endDate": b.isoformat(), "dimensions": ["query"], "rowLimit": 25000, "dataState": "all",
              "dimensionFilterGroups": [{"filters": [{"dimension": "query", "operator": "includingRegex",
                                                      "expression": "osmrtnica\\s*\\.?\\s*com|osmrtnica\\.hr|osmrtnicacom"}]}]})
    return sum(r["clicks"] for r in rr), sum(r["impressions"] for r in rr)


pb, pa = page_stats(b0, b1), page_stats(a0, a1)
llm = {"razdoblje": f"{b0}..{b1} vs {a0}..{a1} ({n} dana)", "stranice": [], "cijeli_web_prije": site_total(b0, b1),
       "cijeli_web_poslije": site_total(a0, a1), "brend_prije": brand(b0, b1), "brend_poslije": brand(a0, a1)}
for p in LLM_TARGETS:
    x, y = pb.get(p, [0, 0, 0]), pa.get(p, [0, 0, 0])
    llm["stranice"].append({"stranica": p, "klikovi_prije": x[0], "klikovi_poslije": y[0], "impresije_prije": x[1], "impresije_poslije": y[1],
                            "pozicija_prije": round(x[2] / x[1], 1) if x[1] else None, "pozicija_poslije": round(y[2] / y[1], 1) if y[1] else None})

summary = {"datum": today.isoformat(), "gsc_zadnji_dan": last.isoformat(), "klasteri": clusters_out, "jos_nije_objavljeno": not_started,
           "plan": PLAN_TEXT, "ukupno_objavljeno": sum(c["objavljeno"] for c in clusters_out), "ukupno_cilj": sum(c[3] for c in CLUSTERS),
           "llm_eksperiment": llm}
json.dump(summary, open(os.path.join(OUT, f"dodatak-{today}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

E = html.escape
TD = 'style="padding:4px 8px;border-bottom:1px solid #eee;font-size:13px"'
TH = 'style="padding:4px 8px;border-bottom:2px solid #ccc;font-size:12px;text-align:left;color:#555"'
H2 = 'style="font-size:16px;margin:22px 0 4px;color:#222"'


def table(head, rows):
    if not rows:
        return '<p style="color:#888;font-size:13px">Nema podataka još.</p>'
    h = "".join(f"<th {TH}>{E(str(x))}</th>" for x in head)
    b = "".join("<tr>" + "".join(f"<td {TD}>{x if str(x).startswith('<a') else E(str(x))}</td>" for x in r) + "</tr>" for r in rows)
    return f'<table style="border-collapse:collapse;width:100%;margin:6px 0 14px"><tr>{h}</tr>{b}</table>'


def link(p):
    return f'<a href="{E(SITE + p)}" style="color:#1a5fb4">{E(p)}</a>'


def pct(a, b):
    return "novo" if not b and a else ("0" if not b else f"{(a - b) / b * 100:+.0f} %")


parts = [f'<h2 {H2}>6. Novi klasteri na blogu (snovi, imena…)</h2>',
         table(["Klaster", "Objavljeno / cilj", "Indeksirano (uzorak)", "Stranica s impresijama", "Impresije", "Klikovi", "Pozicija", "Prva impresija", "Rok"],
               [[c["klaster"], f'{c["objavljeno"]} / {c["cilj"]} ({c["napredak_pct"]} %)', f'{c["uzorak_indeksirano"]} od {c["uzorak_provjereno"]}',
                 c["stranica_s_impresijama"], c["impresije"], c["klikovi"], c["pozicija"] or "–", c["prva_impresija"] or "još nema", c["rok"]] for c in clusters_out]),
         f'<p style="font-size:13px;margin:4px 0">{E(PLAN_TEXT)} Ukupno objavljeno {summary["ukupno_objavljeno"]} od {summary["ukupno_cilj"]}.</p>']
if not_started:
    parts.append(table(["Još nije objavljeno", "Planirano stranica", "Rok"], [list(x) for x in not_started]))
tops = [[link(p), i, c, ps] for cl in clusters_out for p, i, c, ps in cl["top_stranice"]]
if tops:
    parts += ['<p style="font-size:13px;margin:4px 0"><b>Stranice klastera s najviše impresija</b>:</p>', table(["Stranica", "Impresije", "Klikovi", "Pozicija"], tops)]
tq = [[q, i, c, ps] for cl in clusters_out for q, i, c, ps in cl["top_upiti"]]
if tq:
    parts += ['<p style="font-size:13px;margin:4px 0"><b>Upiti koji već dovode klastere</b>:</p>', table(["Upit", "Impresije", "Klikovi", "Pozicija"], tq)]
parts += [f'<h2 {H2}>7. Eksperiment s backlinkovima i LLM pretraživanjem (od 20. 10.)</h2>',
          f'<p style="font-size:13px;margin:4px 0">Google, isti broj dana prije i poslije prvih linkova ({E(llm["razdoblje"])}):</p>',
          table(["Ciljna stranica", "Klikovi prije → poslije", "Impresije prije → poslije", "Pozicija prije → poslije"],
                [[link(x["stranica"]), f'{x["klikovi_prije"]} → {x["klikovi_poslije"]} ({pct(x["klikovi_poslije"], x["klikovi_prije"])})',
                  f'{x["impresije_prije"]} → {x["impresije_poslije"]} ({pct(x["impresije_poslije"], x["impresije_prije"])})',
                  f'{x["pozicija_prije"] or "–"} → {x["pozicija_poslije"] or "–"}'] for x in llm["stranice"]]
                + [["Cijeli web (za usporedbu)", f'{llm["cijeli_web_prije"][0]} → {llm["cijeli_web_poslije"][0]} ({pct(llm["cijeli_web_poslije"][0], llm["cijeli_web_prije"][0])})',
                    f'{llm["cijeli_web_prije"][1]} → {llm["cijeli_web_poslije"][1]} ({pct(llm["cijeli_web_poslije"][1], llm["cijeli_web_prije"][1])})', ""],
                   ["Traženje brenda (osmrtnica.com.hr)", f'{llm["brend_prije"][0]} → {llm["brend_poslije"][0]} ({pct(llm["brend_poslije"][0], llm["brend_prije"][0])})',
                    f'{llm["brend_prije"][1]} → {llm["brend_poslije"][1]} ({pct(llm["brend_poslije"][1], llm["brend_prije"][1])})', ""]])]
open(os.path.join(OUT, f"dodatak-{today}.html"), "w", encoding="utf-8").write("".join(parts))
print(f"OK: {OUT}/dodatak-{today}.html i dodatak-{today}.json")
