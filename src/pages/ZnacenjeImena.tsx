import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  NAMES_HUB,
  fetchNamePage,
  fetchNamesBySlugs,
  fetchNamesOnDay,
  formatImendan,
  nameDayWishes,
  nextOccurrence,
  type NameListItem,
  type NamePage,
} from '@/lib/clusters';

const SITE = 'https://osmrtnica.com.hr';

const slugOf = (s: string) =>
  s.toLowerCase().replace(/[čć]/g, 'c').replace(/ž/g, 'z').replace(/š/g, 's').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function Countdown({ md }: { md: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const target = nextOccurrence(md, now);
  const s = Math.max(0, (target.getTime() - now.getTime()) / 1000);
  const days = Math.floor(s / 86400);
  const isToday = target.getMonth() === now.getMonth() && target.getDate() === now.getDate();
  if (isToday) return <p className="mt-3 text-lg font-semibold text-memorial-gold">Imendan je danas! 🎉</p>;
  return (
    <div className="mt-3 flex gap-3">
      {[
        [days, 'dana'],
        [Math.floor((s % 86400) / 3600), 'sati'],
        [Math.floor((s % 3600) / 60), 'minuta'],
      ].map(([n, l]) => (
        <div key={l as string} className="min-w-[72px] rounded-lg bg-[hsl(var(--memorial-earth))] px-3 py-2 text-center text-white">
          <b className="block font-serif text-2xl">{n}</b>
          <span className="text-xs opacity-80">{l}</span>
        </div>
      ))}
    </div>
  );
}

function Wish({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      setState('err');
    }
    setTimeout(() => setState('idle'), 1800);
  };
  return (
    <div className="my-2 flex items-start justify-between gap-3 rounded-lg border border-border bg-white p-3 text-[15px]">
      <span>{text}</span>
      <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
        {state === 'ok' ? 'Kopirano ✓' : state === 'err' ? 'Označi tekst' : 'Kopiraj'}
      </Button>
    </div>
  );
}

const ZnacenjeImena = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<NamePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [related, setRelated] = useState<NameListItem[]>([]);
  const [sameDay, setSameDay] = useState<NameListItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    fetchNamePage(slug)
      .then(async (p) => {
        if (!alive) return;
        setPage(p);
        setLoading(false);
        if (!p) return;
        const variantSlugs = [...p.variants, p.opposite_form ?? ''].filter(Boolean).map(slugOf);
        fetchNamesBySlugs(variantSlugs).then((r) => alive && setRelated(r));
        if (p.imendani[0]) fetchNamesOnDay(p.imendani[0].d, p.slug).then((r) => alive && setSameDay(r));
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const wishes = useMemo(() => (page ? nameDayWishes(page.name, page.vocative, page.gender) : []), [page]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center text-muted-foreground">Učitavanje...</main>
        <Footer />
      </div>
    );
  }

  if (failed) {
    // A network error is not a missing page: no noindex here.
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4">Stranica se nije učitala.</p>
          <button type="button" onClick={() => window.location.reload()} className="text-memorial-gold underline">Pokušaj ponovno</button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Header />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="mb-4 text-2xl font-bold">Ime nije pronađeno</h1>
          <Link to={NAMES_HUB} className="text-memorial-gold underline">Pogledaj sva imena</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const path = `${NAMES_HUB}/${page.slug}`;
  const firstDay = page.imendani[0];
  const title = `${page.name} – značenje imena, imendan i čestitke`;
  const description = `Što znači ime ${page.name}? ${page.meaning ? `${page.meaning}. ` : ''}${firstDay ? `Imendan: ${formatImendan(firstDay.d)}. ` : ''}Podrijetlo, izvedenice i čestitke za imendan.`.slice(0, 158);
  const female = page.gender === 'žensko';
  const stats = page.stats;
  const maxDecade = stats ? Math.max(1, ...stats.decades.map((d) => d.c)) : 1;
  const faq = [
    page.meaning && { q: `Što znači ime ${page.name}?`, a: `${page.origin ? `Ime je ${page.origin} podrijetla i znači: ` : 'Ime znači: '}${page.meaning}.` },
    firstDay && {
      q: `Kada je imendan ${page.name}?`,
      a: `${page.imendani.map((i) => `${formatImendan(i.d)}${i.s ? ` (${i.s})` : ''}`).join(', ')}.`,
    },
    ...page.faq,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={SITE + path} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={SITE + path} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Naslovnica', path: '/' },
              { name: 'Blog', path: '/blog' },
              { name: 'Značenje imena', path: NAMES_HUB },
              { name: page.name },
            ]),
          )}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          })}
        </script>
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <nav className="mb-6 text-sm text-muted-foreground" aria-label="breadcrumb">
          <Link to="/" className="hover:text-memorial-gold">Početna</Link> › <Link to="/blog" className="hover:text-memorial-gold">Blog</Link> ›{' '}
          <Link to={NAMES_HUB} className="hover:text-memorial-gold">Značenje imena</Link> › <span className="text-memorial-gold">{page.name}</span>
        </nav>
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <article className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-[hsl(var(--memorial-gold)/0.15)] px-3 py-0.5 text-xs font-semibold text-[hsl(40_60%_30%)]">{female ? 'Žensko ime' : 'Muško ime'}</span>
              {page.origin && <span className="rounded-full bg-[hsl(var(--memorial-gold)/0.15)] px-3 py-0.5 text-xs font-semibold text-[hsl(40_60%_30%)]">Podrijetlo: {page.origin}</span>}
              {firstDay && <span className="rounded-full bg-[hsl(var(--memorial-gold)/0.15)] px-3 py-0.5 text-xs font-semibold text-[hsl(40_60%_30%)]">Imendan {formatImendan(firstDay.d)}</span>}
            </div>
            <h1 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">{title}</h1>

            <section className="my-6 rounded-xl border border-[hsl(var(--memorial-parchment-border))] bg-[hsl(var(--memorial-parchment-card))] p-5">
              <h2 className="mb-2 font-serif text-xl font-semibold">Što znači ime {page.name}?</h2>
              {page.intro && <p className="mb-3">{page.intro}</p>}
              <table className="w-full text-[15px]">
                <tbody>
                  {[
                    ['Podrijetlo', page.origin],
                    ['Značenje', page.meaning],
                    ['Imendan', page.imendani.length ? page.imendani.map((i) => `${formatImendan(i.d)}${i.s ? ` (${i.s})` : ''}`).join(', ') : 'nema katoličkog imendana'],
                    ['Izvedenice i slična imena', page.variants.join(', ')],
                    [female ? 'Muški oblik' : 'Ženski oblik', page.opposite_form],
                    ['Na drugim jezicima', page.foreign_forms],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <tr key={k} className="border-b border-[hsl(var(--memorial-parchment-border))] last:border-0">
                        <td className="w-[40%] py-2 pr-3 align-top text-muted-foreground">{k}</td>
                        <td className="py-2">{v}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>

            {page.history && (
              <>
                <h2 className="mt-8 font-serif text-2xl font-semibold">Podrijetlo i povijest imena</h2>
                {page.history.split('\n').filter(Boolean).map((p, i) => <p key={i} className="mt-3 leading-relaxed">{p}</p>)}
              </>
            )}
            {page.character && (
              <>
                <h2 className="mt-8 font-serif text-2xl font-semibold">Osobine koje se pripisuju imenu</h2>
                <p className="mt-3 leading-relaxed">{page.character}</p>
              </>
            )}

            {firstDay && (
              <section className="my-8 rounded-xl border border-[hsl(var(--memorial-parchment-border))] bg-[hsl(var(--memorial-parchment-card))] p-5">
                <h2 className="font-serif text-xl font-semibold">Kada je imendan {page.name}?</h2>
                <p className="mt-1">
                  {page.name} slavi imendan <b>{formatImendan(firstDay.d)}</b>{firstDay.s ? `, na spomendan: ${firstDay.s}` : ''}.
                  {page.imendani.length > 1 && ` Neki slave i ${page.imendani.slice(1).map((i) => `${formatImendan(i.d)}${i.s ? ` (${i.s})` : ''}`).join(', ')}.`} Do sljedećeg imendana ostalo je:
                </p>
                <Countdown md={firstDay.d} />
                {sameDay.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Isti dan imendan slave i:{' '}
                    {sameDay.map((n, i) => (
                      <span key={n.slug}>
                        {i > 0 && ', '}
                        <Link to={`${NAMES_HUB}/${n.slug}`} className="text-memorial-gold hover:underline">{n.name}</Link>
                      </span>
                    ))}
                  </p>
                )}
              </section>
            )}

            <section className="my-8 rounded-xl border border-[hsl(var(--memorial-parchment-border))] bg-[hsl(var(--memorial-parchment-card))] p-5">
              <h2 className="font-serif text-xl font-semibold">Čestitke za imendan {page.name}</h2>
              <p className="text-sm text-muted-foreground">Odaberi čestitku, kopiraj je i pošalji porukom.</p>
              {(showAll ? wishes : wishes.slice(0, 4)).map((w) => <Wish key={w} text={w} />)}
              {!showAll && (
                <button className="mt-2 text-sm font-semibold text-memorial-gold hover:underline" onClick={() => setShowAll(true)}>
                  Prikaži još čestitki ↓
                </button>
              )}
            </section>

            {stats && (
              <section className="my-8 rounded-xl border border-[hsl(var(--memorial-parchment-border))] bg-[hsl(var(--memorial-parchment))] p-5">
                <h2 className="font-serif text-xl font-semibold">Ime {page.name} u brojkama</h2>
                <p className="text-sm text-muted-foreground">Prema osmrtnicama objavljenim na osmrtnica.com.hr</p>
                <div className="my-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    [stats.count, `osmrtnica osoba imena ${page.name}`],
                    [stats.avg_age, 'godina, prosječna životna dob'],
                    [stats.max_age, 'godina, najdulji život'],
                  ]
                    .filter(([n]) => n)
                    .map(([n, l]) => (
                      <div key={l as string} className="rounded-lg border border-[hsl(var(--memorial-parchment-border))] bg-white p-3 text-center">
                        <b className="block font-serif text-2xl text-[hsl(var(--memorial-earth))]">{n}</b>
                        <span className="text-xs text-muted-foreground">{l}</span>
                      </div>
                    ))}
                </div>
                {stats.decades.length > 2 && (
                  <>
                    <p className="mt-2 text-sm font-semibold">Desetljeće rođenja</p>
                    <div className="mt-6 flex h-28 items-end gap-1.5">
                      {stats.decades.map((d) => (
                        <div key={d.decade} className="relative flex-1 rounded-t bg-memorial-gold/85" style={{ height: `${(d.c / maxDecade) * 100}%` }}>
                          <i className="absolute -top-5 left-0 right-0 text-center text-[11px] not-italic text-muted-foreground">{d.c}</i>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5 text-[11px] text-muted-foreground">
                      {stats.decades.map((d) => <span key={d.decade} className="flex-1 text-center">{String(d.decade).slice(2)}-e</span>)}
                    </div>
                  </>
                )}
                {stats.cities.length > 0 && <p className="mt-3 text-sm">Najviše osmrtnica iz mjesta: {stats.cities.join(', ')}.</p>}
                <p className="mt-2 text-sm">
                  <Link to={`/pretraga?q=${encodeURIComponent(page.name)}`} className="text-memorial-gold hover:underline">Pretraži osmrtnice osoba imena {page.name} →</Link>
                </p>
              </section>
            )}

            {page.famous.length > 0 && (
              <>
                <h2 className="mt-8 font-serif text-2xl font-semibold">Poznate osobe imena {page.name}</h2>
                <ul className="mt-3 list-disc pl-6">{page.famous.map((f) => <li key={f}>{f}</li>)}</ul>
              </>
            )}

            {related.length > 0 && (
              <>
                <h2 className="mt-8 font-serif text-2xl font-semibold">Slična imena</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {related.map((n) => (
                    <Link key={n.slug} to={`${NAMES_HUB}/${n.slug}`} className="rounded-lg border border-border bg-white p-3 text-sm hover:border-memorial-gold">
                      {n.name}
                      <small className="block text-xs text-muted-foreground">{n.imendani[0] ? `imendan ${formatImendan(n.imendani[0].d)}` : n.gender === 'žensko' ? 'žensko ime' : 'muško ime'}</small>
                    </Link>
                  ))}
                </div>
              </>
            )}

            <section className="my-10 flex items-center gap-5 rounded-2xl bg-gradient-to-br from-[#2a211c] to-[#4a382e] p-6 text-white">
              <img src="/site/candle-flame-large.png" alt="" className="hidden h-20 w-auto sm:block" width={60} height={80} loading="lazy" />
              <div>
                <h2 className="font-serif text-xl font-semibold text-white">Izgubili ste {female ? 'dragu osobu' : 'dragu osobu'} imena {page.name}?</h2>
                <p className="mb-3 mt-1 text-sm opacity-85">Zapalite virtualnu svijeću ili napravite trajni digitalni memorijal sa slikama i uspomenama.</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="bg-memorial-gold text-white hover:bg-memorial-gold/90"><Link to="/zapali-svijecu">Zapali svijeću</Link></Button>
                  <Button asChild variant="outline" className="border-white bg-transparent text-white hover:bg-white hover:text-black"><Link to="/digitalni-memorijal">Digitalni memorijal</Link></Button>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-2xl font-semibold">Česta pitanja</h2>
              {faq.map((f, i) => (
                <details key={f.q} open={i === 0} className="border-b border-border py-3">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2">{f.a}</p>
                </details>
              ))}
            </section>
          </article>

          <aside className="space-y-5">
            <form
              className="rounded-xl border border-border bg-white p-4"
              onSubmit={(e) => {
                e.preventDefault();
                const s = slugOf(q);
                if (s) navigate(`${NAMES_HUB}?q=${encodeURIComponent(q)}`);
              }}
            >
              <h3 className="mb-2 font-semibold">Pronađi drugo ime</h3>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="npr. Ana" className="w-full rounded-md border border-input px-3 py-2" />
            </form>
            <div className="rounded-xl border border-border bg-white p-4">
              <h3 className="mb-2 font-semibold">Sanjarica</h3>
              <p className="text-sm text-muted-foreground">Što znači san koji ne izlazi iz glave? <Link to="/blog/sanjarica" className="text-memorial-gold hover:underline">Tumačenje snova od A do Ž →</Link></p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ZnacenjeImena;
