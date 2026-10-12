import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  ArrowLeft,
  Clock
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CitiesSection from '@/components/CitiesSection';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { breadcrumbJsonLd } from '@/lib/seo';
import { formatBlogDate } from '@/lib/utils';
import BlogSalesSection from '@/components/blog/BlogSalesSection';
import { recordBlogClick, trackBlog } from '@/lib/blogTracking';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  date: string;
  category: string;
  featured: boolean;
  image_url?: string;
  slug?: string;
  created_at?: string;
  updated_at?: string;
  meta_title?: string;
  meta_description?: string;
  sales_heading?: string | null;
  sales_text?: string | null;
  cta_text?: string | null;
  cta_enabled?: boolean | null;
  interactive_type?: string | null;
  interactive_items?: string[] | null;
}

/** Adds one natural in-text link to the memorial page after the 3rd paragraph, if the article has none. */
const withContextLink = (html: string, enabled: boolean) => {
  if (!enabled || /href="[^"]*digitalni-memorijal/.test(html)) return html;
  const link = '<p><em>Uspomene na voljenu osobu možete trajno sačuvati na jednom mjestu – u <a href="/digitalni-memorijal/" data-cta="context_link">digitalnom memorijalu</a> s fotografijama, životnom pričom i porukama bližnjih.</em></p>';
  let c = 0;
  const out = html.replace(/<\/p>/g, (m) => (++c === 3 ? m + link : m));
  return c >= 3 ? out : html + link;
};

const BlogPost = () => {
  const { slug } = useParams();
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogPost = async () => {
      if (!slug) return;
      
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) {
          console.error('Error fetching blog post:', error);
          return;
        }

        setBlogPost(data);

        // Fetch related posts from the same category
        if (data?.category) {
          const { data: related, error: relatedError } = await supabase
            .from('blogs')
            .select('*')
            .eq('category', data.category)
            .neq('id', data.id)
            .limit(2);

          if (!relatedError && related) {
            setRelatedPosts(related);
          }
        }
      } catch (error) {
        console.error('Error fetching blog post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogPost();
  }, [slug]);

  useEffect(() => {
    if (blogPost?.slug) trackBlog('view', blogPost.slug);
  }, [blogPost?.slug]);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || !blogPost?.slug) return;
    const href = a.getAttribute('href') || '';
    if (/digitalni-memorijal|kreiraj-memorijal/.test(href)) {
      recordBlogClick(blogPost.slug, a.getAttribute('data-cta') || 'content_link', 'link_click');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Učitavanje...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!blogPost) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Članak nije pronađen</h1>
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Povratak na blog
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Helmet for blog post */}
      {blogPost && (
        <Helmet>
          <title>{blogPost.meta_title || blogPost.title}</title>
          <meta name="description" content={blogPost.meta_description || blogPost.excerpt} />
          <link rel="canonical" href={`https://osmrtnica.com.hr/blog/${blogPost.slug}`} />
          
          {/* Open Graph tags */}
          <meta property="og:title" content={blogPost.meta_title || blogPost.title} />
          <meta property="og:description" content={blogPost.meta_description || blogPost.excerpt} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={`https://osmrtnica.com.hr/blog/${blogPost.slug}`} />
          {blogPost.image_url && <meta property="og:image" content={blogPost.image_url} />}
          
          {/* Article specific tags */}
          <meta property="article:published_time" content={blogPost.created_at} />
          <meta property="article:modified_time" content={blogPost.updated_at} />
          <meta property="article:section" content={blogPost.category} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={blogPost.meta_title || blogPost.title} />
          <meta name="twitter:description" content={blogPost.meta_description || blogPost.excerpt} />
          {blogPost.image_url && <meta name="twitter:image" content={blogPost.image_url} />}

          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: blogPost.title,
              description: blogPost.meta_description || blogPost.excerpt || undefined,
              datePublished: blogPost.created_at || blogPost.date || undefined,
              dateModified: blogPost.updated_at || blogPost.created_at || undefined,
              image: blogPost.image_url || undefined,
              articleSection: blogPost.category || undefined,
              inLanguage: 'hr-HR',
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `https://osmrtnica.com.hr/blog/${blogPost.slug}`,
              },
              author: { '@type': 'Organization', name: 'Osmrtnica.com.hr' },
              publisher: {
                '@type': 'Organization',
                name: 'Osmrtnica.com.hr',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://osmrtnica.com.hr/logo-osmrtnica.png',
                },
              },
            })}
          </script>
          <script type="application/ld+json">
            {JSON.stringify(
              breadcrumbJsonLd([
                { name: 'Naslovnica', path: '/' },
                { name: 'Blog', path: '/blog' },
                { name: blogPost.title },
              ]),
            )}
          </script>
        </Helmet>
      )}
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-memorial-gold transition-colors">Početna</Link>
          <span>/</span>
          <Link to="/blog" className="hover:text-memorial-gold transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-memorial-gold font-medium">{blogPost.title}</span>
        </div>

        {/* Hero Image */}
        <div className="relative w-full aspect-[16/9] max-h-[560px] rounded-lg overflow-hidden mb-8 shadow-memorial bg-muted">
          <img 
            src={blogPost.image_url || '/placeholder.svg'} 
            alt={blogPost.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/15 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 md:bottom-8 md:left-8 md:right-8">
            <Badge variant="secondary" className="mb-3 bg-accent text-accent-foreground border-accent">
              {blogPost.category}
            </Badge>
            <h1 className="text-2xl md:text-4xl font-semibold text-primary-foreground leading-tight max-w-4xl">
              {blogPost.title}
            </h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto">
          {/* Article Header */}
          <article className="mb-12">
            <header className="mb-8">
              {/* Article Meta */}
              <Card className="border-border bg-card shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-memorial-gold">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">{formatBlogDate(blogPost.date || blogPost.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>5 min čitanja</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    <Link to="/blog">
                      <Button variant="outline" size="sm" className="border-memorial-gold text-memorial-gold hover:bg-memorial-gold hover:text-white">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Povratak na blog
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </header>

            {/* Article Content */}
            <Card className="shadow-lg border-t-4 border-t-memorial-gold">
              <CardContent className="p-8 md:p-12">
                <style dangerouslySetInnerHTML={{
                  __html: `
                    .prose h2 {
                      margin-top: 3rem !important;
                      margin-bottom: 1.5rem !important;
                    }
                    .prose h2:first-of-type {
                      margin-top: 0.5rem !important;
                    }
                    .prose h3 {
                      margin-top: 2.5rem !important;
                      margin-bottom: 1.25rem !important;
                    }
                    .prose p {
                      margin-bottom: 1.5rem !important;
                    }
                    .prose ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
                    .prose ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 1.5rem; }
                    .prose li { margin-bottom: 0.4rem; }
                    .prose figure { margin: 2.5rem 0 !important; }
                    .prose figure img { width: 100%; height: auto; border-radius: 0.75rem; margin: 0 !important; }
                    .prose figcaption { margin-top: 0.75rem; font-size: 0.9rem; text-align: center; opacity: 0.7; }
                    .prose blockquote { border-left: 4px solid hsl(var(--accent)); background: hsl(var(--muted)); padding: 1.25rem 1.5rem; border-radius: 0.5rem; font-style: normal; margin: 1.5rem 0 2rem; }
                    .prose blockquote p { margin-bottom: 0.75rem !important; }
                    .prose blockquote p:last-child { margin-bottom: 0 !important; }
                    .prose a {
                      color: hsl(var(--memorial-gold));
                      font-weight: 500;
                      text-decoration: underline;
                      text-underline-offset: 3px;
                      transition: color 0.2s ease;
                    }
                    .prose a:hover { color: hsl(var(--memorial-gold-muted)); }
                  `
                }} />
                <div 
                  className="prose prose-lg prose-gray dark:prose-invert max-w-none"
                  onClick={handleContentClick}
                  dangerouslySetInnerHTML={{ __html: withContextLink(blogPost.content || '<p>Sadržaj nije dostupan.</p>', blogPost.cta_enabled !== false) }}
                  style={{
                    fontSize: '1.125rem',
                    lineHeight: '1.8',
                  }}
                />
              </CardContent>
            </Card>
          </article>

          {blogPost.slug && <BlogSalesSection blog={{ ...blogPost, slug: blogPost.slug }} />}

          {/* Related Articles */}
          <section className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-primary mb-4">Povezani članci</h2>
              <div className="w-24 h-1 bg-memorial-gold mx-auto rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {relatedPosts.map((relatedPost) => (
                <Card key={relatedPost.id} className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-memorial-gold overflow-hidden">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={relatedPost.image_url || '/placeholder.svg'} 
                      alt={relatedPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Badge 
                      variant="secondary" 
                      className="absolute top-4 left-4 bg-memorial-gold text-white border-memorial-gold"
                    >
                      {relatedPost.category}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-memorial-gold transition-colors">
                      <Link to={`/blog/${relatedPost.slug}`}>
                        {relatedPost.title}
                      </Link>
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {relatedPost.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatBlogDate(relatedPost.date || relatedPost.created_at)}</span>
                      </div>
                      <Link to={`/blog/${relatedPost.slug}`}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-memorial-gold hover:bg-memorial-gold hover:text-white transition-all"
                        >
                          Čitaj više
                          <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
      
      <CitiesSection />
      <Footer />
    </div>
  );
};

export default BlogPost;