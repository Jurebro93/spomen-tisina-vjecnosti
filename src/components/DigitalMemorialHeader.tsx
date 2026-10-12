import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
const logo = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/logo-osmrtnica.png";
import { Button } from '@/components/ui/button';

const links = [
  { label: 'Primjer', href: '#primjer' },
  { label: 'Kako funkcionira', href: '#kako-funkcionira' },
  { label: 'Cijena', href: '#cijena' },
  { label: 'Pitanja', href: '#pitanja' },
];

const DigitalMemorialHeader = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-memorial-warm/95 backdrop-blur-md">
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-4 px-4 py-2">
        <Link to="/" className="flex min-w-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={logo} alt="Osmrtnica.com.hr" className="h-9 w-auto shrink-0" />
          <span className="hidden font-display text-lg font-semibold text-foreground sm:inline">Osmrtnica</span>
        </Link>

        <nav aria-label="Sadržaj stranice" className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {link.label}
            </a>
          ))}
          <Link to="/pretraga" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Search className="h-4 w-4" aria-hidden="true" /> Pretraži osmrtnice
          </Link>
          <Button asChild variant="gold" className="min-h-11">
            <Link to="/digitalni-memorijal/kreiraj">Započni izradu</Link>
          </Button>
        </nav>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 lg:hidden"
          aria-label={open ? 'Zatvori izbornik' : 'Otvori izbornik'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>

      {open && (
        <nav aria-label="Mobilni izbornik" className="border-t border-border bg-background px-4 py-4 lg:hidden">
          <div className="container mx-auto grid gap-1">
            {links.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-md px-3 text-base text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {link.label}
              </a>
            ))}
            <Link to="/pretraga" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-base text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Search className="h-4 w-4" aria-hidden="true" /> Pretraži osmrtnice
            </Link>
            <Button asChild variant="gold" className="mt-2 min-h-11 w-full">
              <Link to="/digitalni-memorijal/kreiraj" onClick={() => setOpen(false)}>Započni izradu</Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default DigitalMemorialHeader;