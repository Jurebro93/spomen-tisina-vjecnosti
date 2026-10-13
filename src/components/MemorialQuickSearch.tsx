import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserRound, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  slug: string;
  ime: string;
  prezime: string;
  datum_rodenja: string | null;
  datum_smrti: string | null;
}

const formatYear = (date: string | null): string => (date ? `${new Date(date).getFullYear()}.` : '');

const sanitizeQuery = (raw: string): string => raw.replace(/[%_(),*]/g, ' ').replace(/\s+/g, ' ').trim();

const MemorialQuickSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const clean = sanitizeQuery(query);
    if (clean.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc('search_memorial_people', {
        _query: clean,
        _limit: 8,
      });

      setLoading(false);
      setSearched(true);
      if (error || !data) {
        setResults([]);
        return;
      }
      setResults(
        (data as unknown as {
          p_slug: string;
          p_ime: string;
          p_prezime: string;
          p_datum_rodenja: string | null;
          p_datum_smrti: string | null;
        }[]).map((row) => ({
          slug: row.p_slug,
          ime: row.p_ime,
          prezime: row.p_prezime,
          datum_rodenja: row.p_datum_rodenja,
          datum_smrti: row.p_datum_smrti,
        }))
      );
    }, 300);

    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative rounded-2xl border border-border/60 bg-card/80 shadow-elegant px-4 py-4">
        <label htmlFor="memorial-quick-search" className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2.5 text-center">
          Pretraži digitalne memorijale
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="memorial-quick-search"
            type="search"
            autoComplete="off"
            placeholder="Unesite ime ili prezime..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            className="pl-9 bg-background rounded-full"
          />
        </div>
      </div>

      {open && (loading || searched) && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl border border-border bg-card shadow-elegant overflow-hidden">
          {loading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Tražim…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Nema rezultata za „{query.trim()}”.</p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((item) => (
                <li key={item.slug}>
                  <Link
                    to={`/memorijal/${item.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <UserRound className="h-4 w-4 text-accent shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {item.ime} {item.prezime}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatYear(item.datum_rodenja)} – {formatYear(item.datum_smrti)}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default MemorialQuickSearch;
