import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  DREAMS_HUB,
  fetchDreamPage,
  fetchDreamsBySlugs,
  fetchDreamsInCategory,
  type DreamListItem,
  type DreamPage,
} from '@/lib/clusters';

const SITE = 'https://osmrtnica.com.hr';

const SanjaricaSan = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<DreamPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<DreamListItem[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setPicked(null);
    fetchDreamPage(slug)
      .then(async (p) => {
        if (!alive) return;
        setPage(p);
        setLoading(false);
        if (!p) return;
        const direct = await fetchDreamsBySlugs(p.related);
        const more = direct.length < 6 ? await fetchDreamsInCategory(p.category, p.slug, 8) : [];
        const seen = new Set<string>();
        const all = [...direct, ...more].filter((d) => d.slug !== p.slug && !seen.has(d.slug) && seen.add(d.slug));
        if (alive) setRelated(all.slice(0, 9));
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center text-muted-foreground">Učitavanje...</main>
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
          <h1 className="mb-4 text-2xl font-bold">San nije pronađen</h1>
          <Link to={DREAMS_HUB} className="text-memorial-gold underline">Pogledaj sanjaricu od A do Ž</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const path = `${DREAMS_HUB}/${page.slug}`;
  const title = `${page.title} – značenje sna | Sanjarica`;
  const description = (page.intro || `Što znači ${page.title.toLowerCase()}? Psihološko i narodno tumačenje sna.`).slice(0, 158);

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
              { name: 'Sanjarica', path: DREAMS_HUB },
              { name: page.title },
            ]),
          )}
        </script>
        {page.faq.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            })}
          </script>
        )}
      </Helmet>
      <Header />
      <div className="relative overflow-hidden bg-[radial-gradient(1200px_400px_at_20%_0%,#3b4372,#1d2236)] px-4 py-10 text-white">
        <div className="container mx-auto">
          <nav className="mb-4 text-sm text-slate-300" aria-label="breadcrumb">
            <Link to="/" className="hover:text-memorial-gold">Početna</Link> › <Link to="/blog" className="hover:text-memorial-gold">Blog</Link> ›{' '}
            <Link to={DREAMS_HUB} className="hover:text-memorial-gold">Sanjarica</Link> › <span className="text-memorial-gold">{page.topic}</span>
          </nav>
          <span className="rounded-full bg-[#f6ecd2] px-3 py-0.5 text-xs font-semibold text-[#7a5a00]">Sanjarica · {page.category}</span>
          <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight text-white md:text-4xl">{page.title} – značenje sna</h1>
          {page.intro && <p className="mt-3 max-w-2xl text-slate-200">{page.intro}</p>}
        </div>
      </div>
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <article className="min-w-0">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['Psihološko tumačenje', page.psych, 'bg-[#eef2ff]'],
                ['Narodna sanjarica', page.folk, 'bg-[#fff6e0]'],
                ['Što poručuje osjećaj', page.feeling, 'bg-[#eef8f1]'],
              ]
                .filter(([, t]) => t)
                .map(([h, t, c]) => (
                  <div key={h as string} className={`rounded-xl p-4 text-sm ${c}`}>
                    <b className="mb-1 block text-xs uppercase tracking-wide">{h}</b>
                    {t}
                  </div>
                ))}
            </div>

            {page.sections.map((s, i) => (
              <section key={s.h}>
                <h2 className="mt-8 font-serif text-2xl font-semibold">{s.h}</h2>
                {s.p.split('\n').filter(Boolean).map((p, j) => <p key={j} className="mt-3 leading-relaxed">{p}</p>)}
                {i === 0 && page.tool.length > 0 && (
                  <div className="my-8 rounded-2xl bg-[#1d2236] p-6 text-white">
                    <h3 className="font-serif text-xl font-semibold text-white">Tumač sna: što se događalo u tvom snu?</h3>
                    <p className="text-sm opacity-80">Odaberi ono što najbolje opisuje tvoj san.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {page.tool.map((o, k) => (
                        <button
                          key={o.label}
                          onClick={() => setPicked(k)}
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${picked === k ? 'border-memorial-gold bg-memorial-gold font-semibold text-black' : 'border-[#4a5280] bg-[#2b3150] text-white hover:border-memorial-gold'}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {picked !== null && (
                      <div className="mt-4 rounded-lg bg-white p-4 text-foreground">
                        <b>{page.tool[picked].label}</b>
                        <p className="mt-1">{page.tool[picked].text}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            ))}

            {page.memorial_cta && (
              <section className="my-10 flex items-center gap-5 rounded-2xl bg-gradient-to-br from-[#2a211c] to-[#4a382e] p-6 text-white">
                <img src="/site/candle-flame-large.png" alt="" className="hidden h-20 w-auto sm:block" width={60} height={80} loading="lazy" />
                <div>
                  <h2 className="font-serif text-xl font-semibold text-white">Sanjali ste dragu osobu koje više nema?</h2>
                  <p className="mb-3 mt-1 text-sm opacity-85">Mnogi nakon takvog sna osjete potrebu da nešto učine za nju. Zapalite svijeću ili zapišite uspomene u trajni digitalni memorijal.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="bg-memorial-gold text-white hover:bg-memorial-gold/90"><Link to="/zapali-svijecu">Zapali svijeću</Link></Button>
                    <Button asChild variant="outline" className="border-white bg-transparent text-white hover:bg-white hover:text-black"><Link to="/digitalni-memorijal">Napravi memorijal</Link></Button>
                  </div>
                </div>
              </section>
            )}

            {related.length > 0 && (
              <>
                <h2 className="mt-8 font-serif text-2xl font-semibold">Slični snovi</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {related.map((d) => (
                    <Link key={d.slug} to={`${DREAMS_HUB}/${d.slug}`} className="rounded-lg border border-border bg-white p-3 text-sm hover:border-memorial-gold">
                      Sanjati {d.topic}
                      <small className="block text-xs text-muted-foreground">{d.category}</small>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {page.faq.length > 0 && (
              <section className="mt-10">
                <h2 className="font-serif text-2xl font-semibold">Česta pitanja</h2>
                {page.faq.map((f, i) => (
                  <details key={f.q} open={i === 0} className="border-b border-border py-3">
                    <summary className="cursor-pointer font-semibold">{f.q}</summary>
                    <p className="mt-2">{f.a}</p>
                  </details>
                ))}
              </section>
            )}
            <p className="mt-8 text-xs text-muted-foreground">Tumačenja snova su informativnog karaktera. Nisu predviđanje budućnosti ni medicinski ili psihološki savjet.</p>
          </article>

          <aside className="space-y-5">
            <form
              className="rounded-xl border border-border bg-white p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) navigate(`${DREAMS_HUB}?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              <h3 className="mb-2 font-semibold">Pretraži sanjaricu</h3>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="npr. zmija" className="w-full rounded-md border border-input px-3 py-2" />
            </form>
            <div className="rounded-xl border border-border bg-white p-4">
              <h3 className="mb-2 font-semibold">Ako vam je teško</h3>
              <p className="text-sm text-muted-foreground">
                Pročitajte naš <Link to="/besplatni-vodic" className="text-memorial-gold hover:underline">vodič nakon smrti bliske osobe</Link> ili pogledajte <Link to="/blog" className="text-memorial-gold hover:underline">članke o tugovanju</Link>.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SanjaricaSan;
