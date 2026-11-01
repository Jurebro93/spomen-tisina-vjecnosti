import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { breadcrumbJsonLd } from '@/lib/seo';
import { DREAMS_HUB, fetchDreamList, firstLetter, sortHr, type DreamListItem } from '@/lib/clusters';

const SITE = 'https://osmrtnica.com.hr';

const SanjaricaHub = () => {
  const [params, setParams] = useSearchParams();
  const [dreams, setDreams] = useState<DreamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [letter, setLetter] = useState('');
  const [cat, setCat] = useState('');
  const q = params.get('q') ?? '';

  useEffect(() => {
    fetchDreamList()
      .then(setDreams)
      .finally(() => setLoading(false));
  }, []);

  const letters = useMemo(() => [...new Set(dreams.map((d) => firstLetter(d.topic)))].sort(sortHr), [dreams]);
  const cats = useMemo(() => [...new Set(dreams.map((d) => d.category))].sort(sortHr), [dreams]);
  const shown = dreams
    .filter((d) => (!letter || firstLetter(d.topic) === letter) && (!cat || d.category === cat) && (!q || d.topic.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sortHr(a.topic, b.topic));

  const title = 'Sanjarica – tumačenje snova od A do Ž';
  const description = 'Sanjarica s psihološkim i narodnim tumačenjem snova: od zmija i zuba do snova o pokojnicima. Upiši što si sanjao.';

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={SITE + DREAMS_HUB} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd([{ name: 'Naslovnica', path: '/' }, { name: 'Blog', path: '/blog' }, { name: 'Sanjarica' }]))}
        </script>
      </Helmet>
      <Header />
      <div className="bg-[radial-gradient(1200px_400px_at_20%_0%,#3b4372,#1d2236)] px-4 py-10 text-white">
        <div className="container mx-auto">
          <nav className="mb-4 text-sm text-slate-300" aria-label="breadcrumb">
            <Link to="/" className="hover:text-memorial-gold">Početna</Link> › <Link to="/blog" className="hover:text-memorial-gold">Blog</Link> › <span className="text-memorial-gold">Sanjarica</span>
          </nav>
          <h1 className="font-serif text-3xl font-semibold text-white md:text-4xl">Sanjarica: tumačenje snova od A do Ž</h1>
          <p className="mt-2 max-w-2xl text-slate-200">{description}</p>
          <input
            value={q}
            onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
            placeholder="npr. zmija, zub, pokojnik, more…"
            className="mt-5 w-full max-w-xl rounded-md border-0 px-4 py-3 text-base text-foreground"
            aria-label="Traži san"
          />
        </div>
      </div>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-3 flex flex-wrap gap-2">
          {['', ...cats].map((c) => (
            <button key={c || 'sve'} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-sm ${cat === c ? 'border-memorial-gold bg-memorial-gold text-white' : 'border-border hover:border-memorial-gold'}`}>{c || 'Sve kategorije'}</button>
          ))}
        </div>
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button onClick={() => setLetter('')} className={`h-9 rounded-md border px-3 text-sm font-semibold ${!letter ? 'border-memorial-gold bg-memorial-gold text-white' : 'border-border'}`}>Sve</button>
          {letters.map((l) => (
            <button key={l} onClick={() => setLetter(l)} className={`h-9 min-w-9 rounded-md border px-2 text-sm font-semibold ${letter === l ? 'border-memorial-gold bg-memorial-gold text-white' : 'border-border hover:border-memorial-gold'}`}>{l}</button>
          ))}
        </div>
        {loading ? (
          <p className="text-muted-foreground">Učitavanje...</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((d) => (
              <Link key={d.slug} to={`${DREAMS_HUB}/${d.slug}`} className="rounded-lg border border-border bg-white p-3 text-sm hover:border-memorial-gold">
                Sanjati {d.topic}
                <small className="block text-xs text-muted-foreground">{d.category}</small>
              </Link>
            ))}
            {shown.length === 0 && <p className="text-muted-foreground">Taj san još nismo opisali.</p>}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SanjaricaHub;
