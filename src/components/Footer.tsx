import { Phone, Mail, MapPin, Heart, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackNewsletterSignup } from '@/lib/newsletterTracking';
import { useToast } from '@/hooks/use-toast';
import { openCookieSettings } from '@/lib/legal';
import { citySlug } from '@/lib/cityMatch';
const logo = "/logo-osmrtnica.png";
const Footer = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Greška",
        description: "Molimo unesite vašu email adresu.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Greška",
        description: "Molimo unesite valjan email.",
        variant: "destructive",
      });
      return;
    }

    setIsSubscribing(true);

    try {
      const { data, error } = await supabase.functions.invoke('subscribe-newsletter', {
        body: { email: email.trim().toLowerCase() }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.error === 'Email already subscribed') {
          toast({
            title: "Email već postoji",
            description: "Ovaj email je već prijavljen na newsletter.",
            variant: "destructive",
          });
        } else {
          throw new Error(data.error);
        }
      } else {
        trackNewsletterSignup('footer');
        toast({
          title: "Hvala vam!",
          description: "Uspješno ste se prijavili na naš newsletter. Obavijestit ćemo vas o novostima.",
        });
        setEmail('');
      }
    } catch (error) {
      console.error('Newsletter signup error:', error);
      toast({
        title: "Greška",
        description: "Dogodila se greška pri prijavi. Molimo pokušajte ponovno.",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const cities = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Slavonski Brod', 'Karlovac', 'Varaždin', 'Šibenik', 'Sisak', 'Dubrovnik'];
  const quickLinks = [{
    name: 'Objavi osmrtnicu',
    href: '/objavi-osmrtnicu'
  }, {
    name: 'Pretraži osmrtnice',
    href: '/umrli'
  }, {
    name: 'Virtualne svijeće',
    href: '/virtualne-svijece'
  }, {
    name: 'Memorijalni vrt',
    href: '/memorijalni-vrt'
  }, {
    name: 'Informacije',
    href: '/informacije'
  }];
  const supportLinks = [{
    name: 'Kako objaviti osmrtnicu',
    href: '/kako-objaviti-osmrtnicu'
  }, {
    name: 'Često postavljena pitanja',
    href: '/cesto-postavljena-pitanja'
  }];
  return (
    <>
      {/* Cities Grid - immediately above footer */}
      <section className="bg-primary text-primary-foreground border-t border-primary-foreground/20">
        <div className="container mx-auto px-4 py-8">
          <h4 className="font-display text-lg font-semibold mb-6 text-center">
            Gradovi koje pokrivamo
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {cities.map(city => (
              <Link key={city} to={`/umrli/${citySlug(city)}`} className="text-center py-2 px-3 text-sm text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/5 rounded transition-colors">
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          {/* Main Footer Content */}
          <div className="py-12 border-t border-primary-foreground/20">
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Company Info */}
              <div className="lg:col-span-1">
                <div className="flex items-center space-x-3 mb-6">
                  <img src={logo} alt="Osmrtnica.com.hr" className="h-10 w-auto" />
                  <div>
                    <h3 className="font-display text-xl font-semibold">Osmrtnica.com.hr</h3>
                    <p className="text-xs text-primary-foreground/80">Dostojanstveno opraštanje</p>
                  </div>
                </div>
                
                <p className="text-primary-foreground/90 leading-relaxed mb-6">Više od 10 godina pružamo podršku obiteljima u najtežim trenucima. Vaš pouzdani partner za objavu osmrtnica.</p>

              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-display text-lg font-semibold mb-6">Brzi linkovi</h4>
                <div className="space-y-3">
                  {quickLinks.map(link => <Link key={link.name} to={link.href} className="block text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      {link.name}
                    </Link>)}
                </div>
              </div>

              {/* Support */}
              <div>
                <h4 className="font-display text-lg font-semibold mb-6">Podrška</h4>
                <div className="space-y-3">
                  {supportLinks.map(link => <Link key={link.name} to={link.href} className="block text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                      {link.name}
                    </Link>)}
                  
                  <div className="mt-4 pt-3 border-t border-primary-foreground/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Mail size={16} className="text-primary-foreground/80" />
                      <a href="mailto:info@osmrtnica.com.hr" className="text-sm hover:text-primary-foreground transition-colors">
                        info@osmrtnica.com.hr
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-primary-foreground/80" />
                      <span className="text-sm">Zagreb, Hrvatska</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Newsletter & Contact */}
              <div>
                <h4 className="font-display text-lg font-semibold mb-6">Ostanite povezani</h4>
                
                <p className="text-sm text-primary-foreground/80 mb-4">
                  Prijavite se za obavijesti o novim funkcionalnostima i korisnim savjetima.
                </p>
                
                <form onSubmit={handleNewsletterSignup} className="flex gap-2 mb-6">
                  <Input 
                    type="email" 
                    placeholder="Vaš email..." 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-primary-foreground text-primary border-primary-foreground/20" 
                    disabled={isSubscribing}
                  />
                  <Button 
                    type="submit" 
                    variant="secondary" 
                    size="sm" 
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? 'Šalje...' : 'Prijavi se'}
                  </Button>
                </form>


                <div className="flex gap-3">
                  <a 
                    href="https://www.facebook.com/osmrtnice.hrvatska" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                      <Facebook size={20} />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Legal links */}
          <nav aria-label="Pravne informacije" className="py-8 border-t border-primary-foreground/20">
            <h4 className="font-display text-lg font-semibold mb-4">Pravne informacije</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
              {[
                ['Kontakt i podaci o obrtu', '/kontakt'],
                ['Uvjeti korištenja i kupnje', '/uvjeti-koristenja'],
                ['Prigovori i reklamacije', '/prigovori'],
                ['Jednostrani raskid i povrat', '/raskid-i-povrat'],
                ['Politika privatnosti', '/politika-privatnosti'],
                ['Kolačići', '/kolacici'],
                ['Pravila objavljivanja', '/pravila-objavljivanja'],
                ['Prijava sadržaja', '/prijava-sadrzaja'],
              ].map(([name, href]) => (
                <li key={href}><Link to={href} className="text-primary-foreground/90 hover:text-primary-foreground hover:underline">{name}</Link></li>
              ))}
              <li><button type="button" onClick={openCookieSettings} className="text-primary-foreground/90 hover:text-primary-foreground hover:underline text-left">Postavke kolačića</button></li>
            </ul>
          </nav>

          {/* Bottom Footer */}
          <div className="py-6 border-t border-primary-foreground/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Heart size={16} className="text-memorial-gold" />
                <span>Izrađeno s poštovanjem za sve obitelji u žalosti</span>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-primary-foreground/80">
                <span>© {new Date().getFullYear()} Osmrtnica.com.hr · TECHNIKO, obrt za propagandu i usluge</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
export default Footer;