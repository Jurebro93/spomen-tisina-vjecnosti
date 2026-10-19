import { useEffect, useRef, useState } from 'react';
import { Search, Menu, X, ChevronDown, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, useNavigate } from 'react-router-dom';
const logo = "/logo-osmrtnica.png";
import { useAuth } from '@/hooks/useAuth';
import AuthTopBar from '@/components/AuthTopBar';
import { useSignOut } from '@/hooks/useSignOut';
import { citySlug } from '@/lib/cityMatch';


interface NavDropdownItem {
  to: string;
  title: string;
  description: string;
}

const NavDropdown = ({ label, to, items }: { label: string; to: string; items: NavDropdownItem[] }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearCloseTimeout = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeout.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      clearCloseTimeout();
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        clearCloseTimeout();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          clearCloseTimeout();
          setOpen(false);
          navigate(to);
        }}
        className="flex items-center gap-1 text-sm font-medium text-primary-foreground hover:text-primary-foreground/80 transition-colors"
      >
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 pt-2">
          <div className="grid w-52 gap-1 rounded-md border border-border bg-primary-foreground p-2 shadow-lg">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block select-none space-y-1 rounded-md p-2.5 leading-none no-underline outline-none transition-colors text-primary hover:bg-memorial-gold/10 hover:text-memorial-gold focus:bg-memorial-gold/10 focus:text-memorial-gold"
              >
                <div className="text-sm font-medium leading-none">{item.title}</div>
                <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleSignOut, signingOut } = useSignOut();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUmrliOpen, setIsUmrliOpen] = useState(false);
  const [isProvodiOpen, setIsProvodiOpen] = useState(false);
  const [isGrobljaOpen, setIsGrobljaOpen] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [searchName, setSearchName] = useState('');

  const handleSearch = () => {
    // If only city is selected (no name entered), navigate to city page
    if (searchCity && searchCity !== 'all' && !searchName.trim()) {
      navigate(`/umrli/${citySlug(searchCity)}`);
    } else if (searchName.trim()) {
      // Navigate to search results page with query parameters
      const searchParams = new URLSearchParams();
      searchParams.set('q', searchName.trim());
      if (searchCity && searchCity !== 'all') {
        searchParams.set('city', searchCity);
      }
      navigate(`/pretraga?${searchParams.toString()}`);
    } else if (searchCity && searchCity !== 'all') {
      // Navigate to city page if only city is selected
      navigate(`/umrli/${citySlug(searchCity)}`);
    }
  };

  const cities = [
    'Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Slavonski Brod', 
    'Pula', 'Sesvete', 'Karlovac', 'Varaždin', 'Šibenik', 'Sisak', 'Dubrovnik'
  ];

  const mainCities = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Dubrovnik', 'Pula', 'Karlovac'];

  const navigationItems = [
    { name: 'Početna', href: '/' },
    { name: 'Digitalni memorijal', href: '/digitalni-memorijal' },
    { name: 'Virtualne svijeće', href: '/virtualne-svijece' },
    { name: 'Blog', href: '/blog' }
  ];

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50 border-b border-border">
      <AuthTopBar />
      <div className="container mx-auto px-4">

        {/* Top bar with logo and main navigation */}
        <div className="flex items-center justify-between py-3 sm:py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
            <img src={logo} alt="Osmrtnica.com.hr" className="h-8 sm:h-10 w-auto" />
            <div>
              <div className="font-display text-lg sm:text-xl font-semibold">Osmrtnice</div>
              <p className="text-xs text-primary-foreground/80">Dostojanstveno opraštanje</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            <Link to="/" className="text-sm font-medium hover:text-primary-foreground/80 transition-colors">
              Početna
            </Link>

            <Link to="/digitalni-memorijal" className="text-sm font-medium hover:text-primary-foreground/80 transition-colors">
              Digitalni memorijal
            </Link>

            <NavDropdown
              label="Umrli"
              to="/umrli"
              items={mainCities.map((city) => ({
                to: `/umrli/${citySlug(city)}`,
                title: `Umrli ${city}`,
                description: `Osmrtnice za grad ${city}`,
              }))}
            />

            <NavDropdown
              label="Sprovodi"
              to="/sprovodi"
              items={mainCities.map((city) => ({
                to: `/sprovodi/${citySlug(city)}`,
                title: `Sprovodi ${city}`,
                description: `Pogrebne usluge u gradu ${city}`,
              }))}
            />

            <NavDropdown
              label="Groblja"
              to="/groblja"
              items={mainCities.map((city) => ({
                to: `/groblja/${citySlug(city)}`,
                title: `Groblja ${city}`,
                description: `Groblja u gradu ${city}`,
              }))}
            />

            {navigationItems.slice(2).map((item) => (
              <Link key={item.name} to={item.href} className="text-sm font-medium hover:text-primary-foreground/80 transition-colors">
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden text-primary-foreground hover:bg-primary-foreground/10"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="pb-2 sm:pb-4 border-t border-primary-foreground/20 pt-2 sm:pt-4">
          <div className="flex flex-row gap-1 sm:gap-3 max-w-4xl lg:mx-0 mx-auto w-full items-center">
            <div className="flex-1 min-w-0">
              <Select value={searchCity} onValueChange={setSearchCity}>
                <SelectTrigger className="bg-primary-foreground text-primary border-primary-foreground/20 h-8 sm:h-10 text-base sm:text-sm">
                  <SelectValue placeholder="Grad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi gradovi</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city.toLowerCase()}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={14} />
                <Input
                  type="text"
                  placeholder="Ime i prezime..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="pl-7 sm:pl-10 bg-primary-foreground text-primary border-primary-foreground/20 h-8 sm:h-10 text-base sm:text-sm"
                />
              </div>
            </div>
            
            <div className="flex gap-1 sm:gap-2">
              <Button 
                variant="outline" 
                className="border-memorial-gold bg-primary text-memorial-gold hover:bg-memorial-gold hover:text-white h-8 sm:h-10 text-xs px-2 sm:px-4"
                onClick={handleSearch}
              >
                <span className="hidden sm:inline">Pretraži</span>
                <Search className="sm:hidden" size={14} />
              </Button>

              <Button 
                className="hidden sm:flex bg-memorial-gold text-memorial-gold-foreground hover:bg-memorial-gold/90 h-8 sm:h-10 text-xs px-2 sm:px-4 shadow-sm"
                onClick={() => navigate('/digitalni-memorijal')}
              >
                <Sparkles className="mr-0 sm:mr-1.5" size={14} />
                <span className="hidden sm:inline">Kreiraj digitalni memorijal</span>
              </Button>

              <Button 
                variant="outline" 
                className="hidden sm:flex border-primary-foreground bg-primary text-primary-foreground hover:bg-primary-foreground hover:text-primary h-8 sm:h-10 text-xs px-2 sm:px-4"
                onClick={() => navigate('/objavi-osmrtnicu')}
              >
                <span className="hidden sm:inline">Objavi osmrtnicu</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-primary-foreground/20 pt-3 sm:pt-4 pb-3 sm:pb-4">
            <nav className="flex flex-col space-y-3 sm:space-y-4">
              {/* Početna */}
              <Link
                to="/"
                className="text-sm font-medium hover:text-primary-foreground/80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Početna
              </Link>

              {/* Digitalni memorijal */}
              <Link
                to="/digitalni-memorijal"
                className="text-sm font-medium hover:text-primary-foreground/80 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Digitalni memorijal
              </Link>
              
              {/* Umrli dropdown for mobile */}
              <div>
                <button 
                  onClick={() => setIsUmrliOpen(!isUmrliOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-primary-foreground mb-2"
                >
                  Umrli
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${isUmrliOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isUmrliOpen && (
                  <div className="pl-4 space-y-2">
                    {mainCities.map((city) => (
                      <Link
                        key={city}
                        to={`/umrli/${citySlug(city)}`}
                        className="block text-sm text-primary-foreground/80 hover:text-memorial-gold transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {city}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Sprovodi dropdown for mobile */}
              <div>
                <button 
                  onClick={() => setIsProvodiOpen(!isProvodiOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-primary-foreground mb-2"
                >
                  Sprovodi
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${isProvodiOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isProvodiOpen && (
                  <div className="pl-4 space-y-2">
                    {mainCities.map((city) => (
                      <Link
                        key={city}
                        to={`/sprovodi/${citySlug(city)}`}
                        className="block text-sm text-primary-foreground/80 hover:text-memorial-gold transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {city}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Groblja dropdown for mobile */}
              <div>
                <button
                  onClick={() => setIsGrobljaOpen(!isGrobljaOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-primary-foreground mb-2"
                >
                  Groblja
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${isGrobljaOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isGrobljaOpen && (
                  <div className="pl-4 space-y-2">
                    {mainCities.map((city) => (
                      <Link
                        key={city}
                        to={`/groblja/${citySlug(city)}`}
                        className="block text-sm text-primary-foreground/80 hover:text-memorial-gold transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {city}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Rest of navigation items */}
              {navigationItems.slice(2).map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-sm font-medium hover:text-primary-foreground/80 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;