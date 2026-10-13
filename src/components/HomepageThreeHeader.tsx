import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { displayName, useAuth } from '@/hooks/useAuth';
import { useSignOut } from '@/hooks/useSignOut';
const logo = "https://umpvnepxsqfkxjpclkxc.supabase.co/storage/v1/object/public/obituary-photos/site/logo-osmrtnica.png";

type HomepageThreeHeaderProps = {
  onTrack: (position: string) => void;
};

const HomepageThreeHeader = ({ onTrack }: HomepageThreeHeaderProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, loading } = useAuth();
  const { handleSignOut, signingOut } = useSignOut();

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="container mx-auto flex min-h-[72px] items-center gap-4 px-4">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={logo} alt="Osmrtnica.com.hr" className="h-10 w-auto" width={40} height={40} />
          <span className="hidden font-display text-xl font-semibold sm:block">Osmrtnica.com.hr</span>
        </Link>

        <nav aria-label="Glavna navigacija" className="ml-auto hidden items-center gap-5 xl:flex">
          <Link to="/digitalni-memorijal" onClick={() => onTrack('memorial_details_header')} className="text-sm font-semibold hover:text-accent">Digitalni memorijal</Link>
          <a href="#kako-funkcionira" className="text-sm font-medium hover:text-accent">Kako funkcionira</a>
          <Link to="/umrli" className="text-sm font-medium hover:text-accent">Osmrtnice</Link>
          <Link to="/blog" className="text-sm font-medium hover:text-accent">Blog</Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="min-h-11">Više <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild><Link to="/sprovodi/zagreb">Sprovodi</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/groblja/zagreb">Groblja</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/virtualne-svijece">Virtualne svijeće</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/memorijalni-vrt">Memorijalni vrt</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/memorijali">Poznati memorijali</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!loading && (user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="min-h-11"><User aria-hidden="true" />{displayName(profile, user)}</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild><Link to="/moji-memorijali">Moji memorijali</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/moj-racun">Moj račun</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={signingOut} onSelect={(event) => { event.preventDefault(); handleSignOut(); }} className="text-destructive focus:text-destructive"><LogOut aria-hidden="true" />Odjava</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : <Link to="/prijava" className="text-sm font-medium hover:text-accent">Prijava</Link>)}
          <Button asChild variant="gold" size="lg" className="min-h-11 px-5"><Link to="/digitalni-memorijal/kreiraj" onClick={() => onTrack('create_header')}>Izradi memorijal</Link></Button>
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:hidden">
          <Button asChild variant="gold" size="sm" className="min-h-11 px-3 sm:px-4"><Link to="/digitalni-memorijal/kreiraj" onClick={() => onTrack('create_header')}>Izradi memorijal</Link></Button>
          <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Zatvori izbornik' : 'Otvori izbornik'}>{mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</Button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobilna navigacija" className="border-t border-border bg-background px-4 py-4 xl:hidden">
          <div className="container mx-auto grid gap-1">
            <Link to="/digitalni-memorijal" onClick={() => { closeMobile(); onTrack('memorial_details_header'); }} className="min-h-11 rounded px-3 py-3 font-semibold text-accent hover:bg-secondary">Digitalni memorijal</Link>
            <a href="#kako-funkcionira" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Kako funkcionira</a>
            <Link to="/umrli" onClick={closeMobile} className="min-h-11 rounded bg-secondary px-3 py-3 font-semibold">Pretraži osmrtnice</Link>
            <Link to="/blog" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Blog</Link>
            <div className="my-2 border-t border-border" />
            <Link to="/sprovodi/zagreb" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Sprovodi</Link>
            <Link to="/groblja/zagreb" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Groblja</Link>
            <Link to="/virtualne-svijece" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Virtualne svijeće</Link>
            <Link to="/memorijalni-vrt" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Memorijalni vrt</Link>
            <Link to="/memorijali" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Poznati memorijali</Link>
            {!loading && (user ? <><Link to="/moji-memorijali" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Moji memorijali</Link><Link to="/moj-racun" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Moj račun</Link><Button type="button" variant="ghost" className="min-h-11 justify-start px-3 text-destructive" disabled={signingOut} onClick={() => { closeMobile(); handleSignOut(); }}><LogOut aria-hidden="true" />Odjava</Button></> : <Link to="/prijava" onClick={closeMobile} className="min-h-11 rounded px-3 py-3 hover:bg-secondary">Prijava</Link>)}
          </div>
        </nav>
      )}
    </header>
  );
};

export default HomepageThreeHeader;