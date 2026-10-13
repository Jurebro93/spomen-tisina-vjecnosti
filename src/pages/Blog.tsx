import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  ArrowRight,
  Calendar
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import CitiesSection from '@/components/CitiesSection';
import MemorialCtaSection from '@/components/MemorialCtaSection';
import { SEOHelmet } from '@/hooks/useSEO';
import { supabase } from '@/integrations/supabase/client';
import { formatBlogDate } from '@/lib/utils';

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
}

const Blog = () => {
  const [postsToShow, setPostsToShow] = useState(21);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching blog posts:', error);
          return;
        }

        setBlogPosts(data || []);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogPosts();
  }, []);

  const categories = [...new Set(blogPosts.map(post => post.category))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 sm:py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Učitavanje...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  const loadMorePosts = () => {
    setPostsToShow(prev => prev + 3);
  };

  const filteredPosts = selectedCategory 
    ? blogPosts.filter(post => post.category === selectedCategory)
    : blogPosts;

  const displayedPosts = filteredPosts.slice(0, postsToShow);
  const hasMorePosts = postsToShow < filteredPosts.length;

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet pagePath="/blog" />
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-memorial-gold" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">Blog</h1>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Najnovije objave, vijesti i razmišljanja o važnim temama
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <Badge 
            variant="outline" 
            className={`cursor-pointer transition-colors ${
              selectedCategory === null 
                ? 'bg-memorial-gold text-white border-memorial-gold' 
                : 'hover:bg-memorial-gold hover:text-white'
            }`}
            onClick={() => {
              setSelectedCategory(null);
              setPostsToShow(21);
            }}
          >
            Sve kategorije
          </Badge>
          {categories.map((category) => (
            <Badge 
              key={category} 
              variant="outline" 
              className={`cursor-pointer transition-colors ${
                selectedCategory === category 
                  ? 'bg-memorial-gold text-white border-memorial-gold' 
                  : 'hover:bg-memorial-gold hover:text-white'
              }`}
              onClick={() => {
                setSelectedCategory(category);
                setPostsToShow(21);
              }}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {displayedPosts.map((post) => (
            <Card key={post.id} className="group overflow-hidden border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-memorial">
              <Link to={`/blog/${post.slug}`} className="block aspect-[16/9] overflow-hidden bg-muted">
                <img src={post.image_url} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" width={720} height={405} loading="lazy" />
              </Link>
              <CardContent className="flex min-h-[280px] flex-col p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <Badge variant="outline" className="border-accent/40 text-accent">{post.category}</Badge>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatBlogDate(post.date || post.created_at)}
                  </span>
                </div>
                <CardTitle className="line-clamp-3 text-xl leading-snug">
                  <Link to={`/blog/${post.slug}`} className="transition-colors group-hover:text-accent">{post.title}</Link>
                </CardTitle>
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                <Link to={`/blog/${post.slug}`} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-accent transition-colors hover:text-accent/80">
                  Pročitaj članak
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More Button */}
        {hasMorePosts && (
          <div className="text-center mt-12">
            <Button 
              onClick={loadMorePosts}
              size="lg"
              className="px-8"
            >
              Učitaj više objava
            </Button>
          </div>
        )}
      </main>
      
      <CitiesSection />
      <MemorialCtaSection />
      <Footer />
    </div>
  );
};

export default Blog;