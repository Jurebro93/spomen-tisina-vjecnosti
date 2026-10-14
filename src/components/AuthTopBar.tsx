import { Link } from 'react-router-dom';
import { ChevronDown, LogIn, LogOut, User, Heart, FileText, Settings, ShieldCheck, Tag, Images, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, displayName, initials } from '@/hooks/useAuth';
import { useSignOut } from '@/hooks/useSignOut';

const AuthTopBar = () => {
  const { user, profile, loading, isAdmin } = useAuth();
  const { handleSignOut, signingOut } = useSignOut();


  return (
    <div className="bg-primary/95 border-b border-primary-foreground/10 text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="flex h-9 items-center justify-end gap-3 text-xs">
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-primary-foreground/10 transition-colors"
                  aria-label="Korisnički meni"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="h-6 w-6 rounded-full bg-memorial-gold/90 text-primary flex items-center justify-center text-[10px] font-semibold">
                      {initials(profile, user)}
                    </span>
                  )}
                  <span className="max-w-[160px] truncate font-medium">{displayName(profile, user)}</span>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-popover z-[60]">
                <DropdownMenuItem asChild>
                  <Link to="/moji-memorijali" className="cursor-pointer">
                    <Heart size={14} className="mr-2" /> Moji memorijali
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/moj-racun" className="cursor-pointer">
                    <User size={14} className="mr-2" /> Moj račun
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/statistika" className="cursor-pointer">
                        <BarChart3 size={14} className="mr-2" /> Statistika i prodaja
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/invoices" className="cursor-pointer">
                        <FileText size={14} className="mr-2" /> Računi (admin)
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/administratori" className="cursor-pointer">
                        <ShieldCheck size={14} className="mr-2" /> Administratori
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/promo-kodovi" className="cursor-pointer">
                        <Tag size={14} className="mr-2" /> Promo kodovi
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/predmeti" className="cursor-pointer">
                        <Tag size={14} className="mr-2" />Predmeti i poslovni podaci</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/portreti" className="cursor-pointer">
                        <Images size={14} className="mr-2" /> Izrada memorijala poznatih osoba
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/brisanje" className="cursor-pointer">
                        <Settings size={14} className="mr-2" /> Brisanje osmrtnica i memorijala
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/integrations/minimax" className="cursor-pointer">
                        <Settings size={14} className="mr-2" /> Minimax postavke
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  disabled={signingOut}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleSignOut();
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut size={14} className="mr-2" /> Odjava
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/prijava"><LogIn size={14} className="mr-1.5" /> Prijava</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/registracija">Registracija</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthTopBar;
