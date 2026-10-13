import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flower2, Loader2, Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  DECEASED_FIELDS, fullName, lifeYears, mediaPublicUrl, type Deceased, type Memorial,
} from '@/lib/memorial';

interface Item {
  slug: string;
  name: string;
  years: string;
  cover: string | null;
  quote: string | null;
}

export const MemorialPublicListing = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);

  const PAGE_SIZE = 6;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('memorials')
        .select('id, slug, quote, deceased_id')
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('published_at', { ascending: false })
        .limit(60);
      const rows = (data ?? []) as Pick<Memorial, 'id' | 'slug' | 'quote' | 'deceased_id'>[];
      if (!rows.length) { if (active) { setItems([]); setLoading(false); } return; }

      const [dec, media] = await Promise.all([
        supabase.from('obituaries').select(DECEASED_FIELDS).in('id', rows.map((r) => r.deceased_id)),
        supabase.from('memorial_media').select('memorial_id, storage_path, is_cover, sort_order').in('memorial_id', rows.map((r) => r.id)),
      ]);
      if (!active) return;
      const decMap = new Map((((dec.data as Deceased[]) ?? [])).map((d) => [d.id, d]));
      setItems(rows.map((r) => {
        const d = decMap.get(r.deceased_id) ?? null;
        const mine = (media.data ?? []).filter((m) => m.memorial_id === r.id);
        const cover = mine.find((m) => m.is_cover) ?? mine.sort((a, b) => a.sort_order - b.sort_order)[0];
        return {
          slug: r.slug,
          name: fullName(d),
          years: lifeYears(d?.datum_rodenja, d?.datum_smrti),
          cover: mediaPublicUrl(cover?.storage_path) ?? d?.fotografija_url ?? null,
          quote: r.quote,
        };
      }));
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const canLoadMore = visibleCount < filtered.length;

  return (
    <section className="container mx-auto px-4 py-14">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-foreground">Javni digitalni memorijali</h2>
        <p className="memorial-subtitle mt-4">
          Pregledajte memorijale koje su obitelji stvorile za svoje voljene osobe. Ostavite uspomenu ili zapalite virtualnu svijeću.
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Pretražite po imenu i prezimenu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Pretraži memorijale"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="mt-8"><CardContent className="p-10 text-center text-muted-foreground">
          Nema javno objavljenih memorijala koji odgovaraju pretrazi.
        </CardContent></Card>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleItems.map((i) => (
              <Link key={i.slug} to={`/memorijal/${i.slug}`} className="group">
                <Card className="overflow-hidden h-full transition-shadow hover:shadow-md">
                  <div className="aspect-[4/3] bg-secondary overflow-hidden">
                    {i.cover ? (
                      <img src={i.cover} alt={`Memorijal — ${i.name}`} loading="lazy"
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Flower2 className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <h2 className="font-serif text-xl">{i.name}</h2>
                    <p className="text-sm text-muted-foreground">{i.years}</p>
                    {i.quote && <p className="text-sm italic text-muted-foreground mt-3 line-clamp-2">„{i.quote}”</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {canLoadMore && (
            <div className="mt-10 flex justify-center">
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                <ChevronDown className="h-4 w-4" />
                Prikaži još
              </Button>
            </div>
          )}

        </>
      )}
    </section>
  );
};
