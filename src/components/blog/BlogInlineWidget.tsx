import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EBOOKS, type GuideId } from '@/lib/ebook';
import { recordBlogClick, trackBlog } from '@/lib/blogTracking';

/**
 * A small card inside the article text, placed by the editor with an HTML comment:
 *   <!--widget:guide-->                                   the post's free guide (BLOG_GUIDES)
 *   <!--widget:memorial|Heading|One sentence|Button-->    digital memorial, copy per post
 */
export const WIDGET_RE = /<!--widget:(guide|memorial)((?:\|[^|>]*)*)-->/g;

type Props = { slug: string; kind: string; args: string[]; guide?: GuideId };

const BlogInlineWidget = ({ slug, kind, args, guide }: Props) => {
  if (kind === 'guide' && guide) {
    const g = EBOOKS[guide];
    return (
      <aside className="not-prose my-10 flex items-center gap-4 rounded-xl border border-memorial-gold/40 bg-memorial-parchment/60 p-4 sm:gap-6 sm:p-6 dark:bg-muted/40">
        <Link to={g.landing} onClick={() => trackBlog('cta_click', slug, 'inline_guide')} className="block w-16 shrink-0 sm:w-20" aria-label={`Vodič ${g.title}`}>
          <img src={g.cover} alt="" width={800} height={1132} loading="lazy" className="w-full rounded-sm shadow-md" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-memorial-gold">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[0.7rem] font-semibold uppercase tracking-wide">Besplatni vodič · {g.pagesLabel}</span>
          </div>
          <p className="mt-1 font-display text-lg font-bold leading-snug text-primary">{g.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{g.tagline}</p>
          <Link
            to={g.landing}
            onClick={() => trackBlog('cta_click', slug, 'inline_guide')}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4"
          >
            Preuzmite besplatno <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    );
  }

  if (kind === 'memorial') {
    const [heading = 'Sačuvajte uspomene na jednom mjestu', text = 'Fotografije, životna priča i poruke bližnjih u digitalnom memorijalu.', cta = 'Izradite digitalni memorijal'] = args;
    return (
      <aside className="not-prose my-10 rounded-xl border-l-4 border-memorial-gold bg-memorial-parchment/60 p-5 sm:p-6 dark:bg-muted/40">
        <div className="flex items-center gap-1.5 text-memorial-gold">
          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-wide">Digitalni memorijal</span>
        </div>
        <p className="mt-1 font-display text-lg font-bold leading-snug text-primary">{heading}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">{text}</p>
        <Button asChild size="sm" className="mt-3 bg-memorial-gold text-white hover:bg-memorial-gold/90">
          <Link to="/digitalni-memorijal" onClick={() => recordBlogClick(slug, 'inline_memorial')}>{cta}</Link>
        </Button>
      </aside>
    );
  }

  return null;
};

export default BlogInlineWidget;
