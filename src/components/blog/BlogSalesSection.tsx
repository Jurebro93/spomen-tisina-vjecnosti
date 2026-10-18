import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Heart, Music, ImageIcon, CalendarHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { recordBlogClick, setMemorialPrefill, trackBlog } from '@/lib/blogTracking';
import { MemorialPreview } from '@/components/blog/BlogMemorialQuiz';

export type BlogSales = {
  slug: string;
  sales_heading?: string | null;
  sales_text?: string | null;
  cta_text?: string | null;
  cta_enabled?: boolean | null;
  interactive_type?: string | null;
  interactive_items?: string[] | null;
};

const TARGET = '/digitalni-memorijal/';

const BlogSalesSection = ({ blog }: { blog: BlogSales }) => {
  const navigate = useNavigate();
  const type = blog.interactive_type ?? 'none';
  const items = (blog.interactive_items ?? []).filter(Boolean);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [interacted, setInteracted] = useState(false);

  if (blog.cta_enabled === false) return null;
  const heading = blog.sales_heading || 'Sačuvajte uspomene na voljenu osobu';
  const ctaText = blog.cta_text || 'Izradite digitalni memorijal';

  const markInteraction = (id: string) => {
    if (interacted) return;
    setInteracted(true);
    trackBlog('interactive', blog.slug, id);
  };

  const go = (ctaId: string) => {
    recordBlogClick(blog.slug, ctaId);
    navigate(TARGET);
  };

  const pick = (i: number) => {
    setSelected(i);
    setText(items[i]);
    markInteraction(`${type}_select`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      markInteraction('dedication_copy');
    } catch { /* ignore */ }
  };

  return (
    <section aria-labelledby="blog-sales-heading" className="mb-12 rounded-lg border border-memorial-gold/60 bg-card p-6 md:p-8">
      <div className="flex items-center gap-2 text-memorial-gold mb-2">
        {type === 'song' ? <Music className="h-5 w-5" /> : type === 'photos' ? <ImageIcon className="h-5 w-5" />
          : type === 'anniversary' ? <CalendarHeart className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
        <span className="text-xs uppercase tracking-wider font-semibold">Digitalni memorijal</span>
      </div>
      <h2 id="blog-sales-heading" className="font-serif text-2xl md:text-3xl text-foreground mb-3">{heading}</h2>
      {type === 'quiz' ? (
        <div className="grid gap-6 md:grid-cols-[1fr_16rem] md:items-center mb-5">
          {blog.sales_text && <p className="text-muted-foreground leading-relaxed">{blog.sales_text}</p>}
          <MemorialPreview />
        </div>
      ) : blog.sales_text && <p className="text-muted-foreground leading-relaxed mb-5">{blog.sales_text}</p>}

      {type === 'dedication' && items.length > 0 && (
        <div className="space-y-3 mb-5">
          <p className="text-sm font-medium">Odaberite posvetu, uredite je i sačuvajte u memorijalu:</p>
          <div className="grid gap-2">
            {items.map((it, i) => (
              <button key={i} type="button" onClick={() => pick(i)}
                className={`text-left rounded-md border p-3 text-sm transition-colors ${selected === i ? 'border-memorial-gold bg-muted' : 'border-border hover:border-memorial-gold/60'}`}>
                „{it}”
              </button>
            ))}
          </div>
          {selected !== null && (
            <>
              <Textarea value={text} maxLength={160} onChange={(e) => { setText(e.target.value); markInteraction('dedication_edit'); }}
                aria-label="Uredite posvetu" className="text-base" />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={copy}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}{copied ? 'Kopirano' : 'Kopiraj'}
                </Button>
                <Button type="button" disabled={!text.trim()}
                  onClick={() => { setMemorialPrefill({ quote: text.trim().slice(0, 160) }); go('dedication_save'); }}
                  className="bg-memorial-gold text-memorial-gold-foreground hover:bg-memorial-gold/90">
                  Sačuvaj posvetu u digitalnom memorijalu
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {type === 'song' && items.length > 0 && (
        <div className="space-y-3 mb-5">
          <p className="text-sm font-medium">Je li neka od ovih pjesama bila posebna?</p>
          <div className="flex flex-wrap gap-2">
            {items.map((it, i) => (
              <button key={i} type="button" onClick={() => pick(i)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selected === i ? 'border-memorial-gold bg-muted' : 'border-border hover:border-memorial-gold/60'}`}>
                {it}
              </button>
            ))}
          </div>
          {selected !== null && (
            <Button type="button" onClick={() => { setMemorialPrefill({ song: items[selected] }); go('song_save'); }}
              className="bg-memorial-gold text-memorial-gold-foreground hover:bg-memorial-gold/90">
              Sačuvaj ovu pjesmu kao uspomenu
            </Button>
          )}
        </div>
      )}

      {type === 'anniversary' && (
        <form className="flex flex-col sm:flex-row gap-2 mb-5" onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setMemorialPrefill({ name: name.trim().slice(0, 100) });
          go('anniversary_name');
        }}>
          <Input value={name} maxLength={100} placeholder="Ime i prezime pokojnika" aria-label="Ime i prezime pokojnika"
            onChange={(e) => { setName(e.target.value); markInteraction('anniversary_input'); }} className="h-11 text-base" />
          <Button type="submit" disabled={!name.trim()} className="h-11 bg-memorial-gold text-memorial-gold-foreground hover:bg-memorial-gold/90">
            Stvorite trajnu uspomenu
          </Button>
        </form>
      )}

      <Button type="button" size="lg" variant={type === 'none' || type === 'photos' || type === 'quiz' ? 'default' : 'outline'} onClick={() => go('final_cta')}
        className={type === 'none' || type === 'photos' || type === 'quiz' ? 'bg-memorial-gold text-memorial-gold-foreground hover:bg-memorial-gold/90' : 'border-memorial-gold text-foreground'}>
        {ctaText}
      </Button>
    </section>
  );
};

export default BlogSalesSection;
