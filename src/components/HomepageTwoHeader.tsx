import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import AuthTopBar from '@/components/AuthTopBar';
import { Button } from '@/components/ui/button';
const logo = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/logo-osmrtnica.png";

const cityLinks = ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar'];

const HomepageTwoHeader = () => {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-primary text-primary-foreground">
      <AuthTopBar />
      <div className="container mx-auto px-4">
        <div className="flex min-h-[68px] items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <img src={logo} alt="Osmrtnica.com.hr" className="h-9 w-auto sm:h-10" width={40} height={40} />
            <div className="min-w-0">
              <span className="block truncate font-display text-lg font-semibold sm:text-xl">Osmrtnica.com.hr</span>
              <span className="hidden text-xs text-primary-foreground/75 sm:block">Dostojanstveno opraštanje</span>
            </div>
          </Link>

          <nav aria-label="Glavna navigacija" className="hidden items-center gap-6 lg:flex">
            <Link to="/umrli" className="text-sm font-medium hover:text-accent">Osmrtnice</Link>
            <Link to="/digitalni-memorijal" className="text-sm font-semibold text-accent hover:text-accent/80">Digitalni memorijal</Link>
            <Link to="/sprovodi/zagreb" className="text-sm font-medium hover:text-accent">Sprovodi</Link>
            <Link to="/groblja/zagreb" className="text-sm font-medium hover:text-accent">Groblja</Link>
            <Link to="/blog" className="text-sm font-medium hover:text-accent">Blog</Link>
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => setServicesOpen((value) => !value)}
                aria-expanded={servicesOpen}
              >
                Više <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
              </Button>
              {servicesOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-elegant">
                  <Link to="/virtualne-svijece" className="block rounded px-3 py-3 text-sm hover:bg-muted">Virtualne svijeće</Link>
                  <Link to="/memorijalni-vrt" className="block rounded px-3 py-3 text-sm hover:bg-muted">Memorijalni vrt</Link>
                </div>
              )}
            </div>
          </nav>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? 'Zatvori izbornik' : 'Otvori izbornik'}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>

        {open && (
          <nav aria-label="Mobilna navigacija" className="border-t border-primary-foreground/15 py-4 lg:hidden">
            <div className="grid gap-1">
              <Link to="/umrli" onClick={() => setOpen(false)} className="min-h-11 rounded px-2 py-3 text-sm font-medium hover:bg-primary-foreground/10">Osmrtnice</Link>
              <Link to="/digitalni-memorijal" onClick={() => setOpen(false)} className="min-h-11 rounded px-2 py-3 text-sm font-semibold text-accent hover:bg-primary-foreground/10">Digitalni memorijal</Link>
              <Link to="/sprovodi/zagreb" onClick={() => setOpen(false)} className="min-h-11 rounded px-2 py-3 text-sm font-medium hover:bg-primary-foreground/10">Sprovodi</Link>
              <Link to="/groblja/zagreb" onClick={() => setOpen(false)} className="min-h-11 rounded px-2 py-3 text-sm font-medium hover:bg-primary-foreground/10">Groblja</Link>
              <Link to="/blog" onClick={() => setOpen(false)} className="min-h-11 rounded px-2 py-3 text-sm font-medium hover:bg-primary-foreground/10">Blog</Link>
              <Link to="/virtualne-svijece" onClick={() => setOpen(false)} className="min-h-11 rounded px-2 py-3 text-sm font-medium hover:bg-primary-foreground/10">Virtualne svijeće</Link>
              <Link to="/memorijalni-vrt" onClick={() => setOpen(false)} className="min-h-11 rounded px-2 py-3 text-sm font-medium hover:bg-primary-foreground/10">Memorijalni vrt</Link>
              <div className="mt-2 border-t border-primary-foreground/15 pt-3">
                <p className="mb-2 px-2 text-xs text-primary-foreground/65">Osmrtnice po gradovima</p>
                <div className="grid grid-cols-2 gap-1">
                  {cityLinks.map((city) => (
                    <Link key={city} to={`/umrli/${city.toLowerCase()}`} onClick={() => setOpen(false)} className="min-h-11 rounded px-2 py-3 text-sm hover:bg-primary-foreground/10">{city}</Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default HomepageTwoHeader;