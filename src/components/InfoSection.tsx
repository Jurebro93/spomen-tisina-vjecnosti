import { BookOpen, Clock, ArrowRight, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackNewsletterSignup } from '@/lib/newsletterTracking';
import { useToast } from '@/hooks/use-toast';
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
const InfoSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) {
          console.error('Error fetching blog posts:', error);
          return;
        }

        setBlogPosts(data || []);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      }
    };

    fetchBlogPosts();
  }, []);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Greška",
        description: "Molimo unesite vašu email adresu.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('subscribe-newsletter', {
        body: { email: email.trim().toLowerCase() }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      trackNewsletterSignup('info_section');
      toast({
        title: "Uspješno!",
        description: "Uspješno ste se pretplatili na naše obavijesti.",
      });
      
      setEmail('');
    } catch (error: any) {
      toast({
        title: "Greška",
        description: "Dogodila se greška. Pokušajte ponovo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const articles = [{
    id: 1,
    title: 'Kako se nositi s gubitkom voljene osobe',
    excerpt: 'Praktični savjeti za prevladavanje tuge i početak procesa iscjeljenja nakon gubitka.',
    author: 'Dr. Marija Petrović',
    date: '15. siječnja 2024',
    readTime: '8 min',
    category: 'Podrška',
    featured: true
  }, {
    id: 2,
    title: 'Organizacija sprovoda: korak po korak',
    excerpt: 'Detaljni vodič kroz sve potrebne korake za organizaciju dostojanstvenog sprovoda.',
    author: 'Pogrebno poduzeće Zagreb',
    date: '12. siječnja 2024',
    readTime: '12 min',
    category: 'Praktično'
  }, {
    id: 3,
    title: 'Vjerski običaji u Hrvatskoj tradiciji',
    excerpt: 'Pregled vjerskih običaja i tradicija vezanih uz pokop u hrvatskom katoličkom kontekstu.',
    author: 'Fra Tomislav Matić',
    date: '10. siječnja 2024',
    readTime: '6 min',
    category: 'Tradicija'
  }, {
    id: 4,
    title: 'Podrška djeci u procesu žalovanja',
    excerpt: 'Kako pomoći djeci razumjeti i nositi se sa smrću člana obitelji.',
    author: 'Psiholog Ana Jurić',
    date: '8. siječnja 2024',
    readTime: '10 min',
    category: 'Podrška'
  }, {
    id: 5,
    title: 'Memorijalni servisi i komemoracije',
    excerpt: 'Ideje za organizaciju posebnih memorijalni servisa i godišnjih komemoracija.',
    author: 'Event planner Petra Novak',
    date: '5. siječnja 2024',
    readTime: '7 min',
    category: 'Organizacija'
  }, {
    id: 6,
    title: 'Pravne obveze nakon smrti',
    excerpt: 'Što trebate znati o pravnim postupcima i obvezama nakon smrti člana obitelji.',
    author: 'Odvjetnik Ivo Kovač',
    date: '3. siječnja 2024',
    readTime: '15 min',
    category: 'Pravno'
  }];
  const categories = [{
    name: 'Podrška',
    count: 12,
    color: 'bg-blue-100 text-blue-800'
  }, {
    name: 'Praktično',
    count: 8,
    color: 'bg-green-100 text-green-800'
  }, {
    name: 'Tradicija',
    count: 6,
    color: 'bg-purple-100 text-purple-800'
  }, {
    name: 'Organizacija',
    count: 5,
    color: 'bg-orange-100 text-orange-800'
  }, {
    name: 'Pravno',
    count: 4,
    color: 'bg-red-100 text-red-800'
  }];
  return <section className="py-16 bg-memorial-warm" id="informacije">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="memorial-title mb-4">Informacije i podrška</h2>
          <p className="memorial-subtitle max-w-2xl mx-auto">
            Korisni članci, savjeti i informacije za lakše nošenje s gubitkom
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8 mb-12">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Featured Article */}
            {blogPosts.filter(post => post.featured).slice(0, 1).map(post => (
              <Card key={post.id} className="memorial-card mb-8 hover:shadow-memorial transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs bg-accent text-accent-foreground px-3 py-1 rounded-full font-medium">
                      IZDVOJENO
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                      {post.category}
                    </span>
                  </div>
                  
                  <h3 className="memorial-title text-2xl md:text-3xl mb-4">
                    {post.title}
                  </h3>
                  
                  <p className="memorial-body text-muted-foreground mb-6">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>5 min</span>
                      </div>
                      <span>{formatBlogDate(post.date || post.created_at)}</span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                      onClick={() => navigate(`/blog/${post.slug}`)}
                    >
                      Pročitaj više
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Other Articles */}
            <div className="grid md:grid-cols-2 gap-6">
              {blogPosts.filter(post => !post.featured).slice(0, 2).map(post => (
                <Card key={post.id} className="memorial-card hover:shadow-memorial transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        {post.category}
                      </span>
                    </div>
                    
                    <h4 className="font-display text-lg font-semibold text-foreground mb-3 leading-tight">
                      {post.title}
                    </h4>
                    
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>{formatBlogDate(post.date || post.created_at)}</span>
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        <span>5 min</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">5 min čitanja</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-accent hover:text-accent/80"
                        onClick={() => navigate(`/blog/${post.slug}`)}
                      >
                        Čitaj
                        <ArrowRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Categories */}
              <div className="memorial-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                  Kategorije
                </h3>
                <div className="space-y-2">
                  {categories.map(category => (
                    <div 
                      key={category.name} 
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/50 transition-colors duration-200"
                      onClick={() => navigate(`/blog?category=${encodeURIComponent(category.name)}`)}
                    >
                      <span className="text-sm text-foreground">{category.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${category.color}`}>
                        {category.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Newsletter */}
              <div className="memorial-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                  Obavijesti
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Budite obaviješteni o novim člancima i važnim informacijama.
                </p>
                <form onSubmit={handleNewsletterSubscribe} className="space-y-3">
                  <Input
                    type="email"
                    placeholder="Vaša email adresa"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {loading ? 'Pretplaćujem...' : 'Pretplatite se'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg" 
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => navigate('/blog')}
          >
            Svi članci
          </Button>
        </div>
      </div>
    </section>;
};
export default InfoSection;