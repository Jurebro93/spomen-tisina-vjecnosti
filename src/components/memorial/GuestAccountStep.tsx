import { useState } from 'react';
import { Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { ensureAuthToken } from '@/lib/memorialActions';
import { rememberGuestForClaim } from '@/lib/guestClaim';
import { trackFunnel } from '@/lib/funnel';
import { trackGuestRegistered } from '@/lib/metaPixel';

type Mode = 'create' | 'login';

/**
 * A guest who started a memorial without registering sets an e-mail and password before checkout.
 * The guest session becomes a real account (or moves into the existing one), so the draft stays
 * theirs and they can log in later to edit the memorial. The e-mail left for the draft is filled in.
 */
const GuestAccountStep = ({ initialEmail = '' }: { initialEmail?: string }) => {
  const [mode, setMode] = useState<Mode>('create');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Google-only accounts have no password: the reset e-mail sets one, and the draft follows the account.
  const sendPasswordLink = async () => {
    setError('');
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError('Upišite e-mail adresu svog računa.'); return; }
    setBusy(true);
    try {
      await rememberGuestForClaim();
      const { error: fnError } = await supabase.functions.invoke('send-password-reset', {
        body: { email: cleanEmail, redirectTo: `${window.location.origin}/reset-password` },
      });
      if (fnError) throw fnError;
      setResetSent(true);
    } catch {
      setError('Poveznicu nije bilo moguće poslati. Pokušajte ponovno ili nas kontaktirajte.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError('Upišite ispravnu e-mail adresu.'); return; }
    if (password.length < 8) { setError('Lozinka mora imati najmanje 8 znakova.'); return; }
    setBusy(true);
    try {
      const token = await ensureAuthToken();
      if (!token) throw new Error('no token');
      const { data, error: fnError } = await supabase.functions.invoke('convert-guest-account', {
        body: { mode, email: cleanEmail, password },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (fnError) throw fnError;
      if (data?.code === 'already_exists') {
        setMode('login');
        setPassword('');
        setError('Račun s ovim e-mailom već postoji. Upišite lozinku tog računa i memorijal će se spremiti na njega.');
        return;
      }
      if (data?.code === 'google_only') {
        setError('Ovaj račun ste otvorili preko Googlea pa još nema lozinku. Kliknite "Pošalji poveznicu za lozinku" ispod.');
        return;
      }
      if (data?.code === 'wrong_password') { setError('Lozinka nije točna.'); return; }
      if (!data?.ok) throw new Error('not ok');
      // Signing in swaps the guest session for the account; the page then continues as a signed-in user.
      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (signInError) throw signInError;
      if (mode === 'create' && signedIn.user) {
        void trackFunnel('guest_account', { userId: signedIn.user.id });
        trackGuestRegistered(signedIn.user.id);
      }
    } catch {
      setError('Račun nije bilo moguće spremiti. Pokušajte ponovno ili nas kontaktirajte.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-accent/60 bg-secondary/40 p-5 space-y-4">
      <div>
        <p className="font-semibold flex items-center gap-2"><UserCheck className="h-5 w-5 text-accent" />
          {mode === 'create' ? 'Napravite račun prije plaćanja' : 'Prijavite se na svoj račun'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === 'create'
            ? 'S ovim e-mailom i lozinkom kasnije se prijavljujete i uređujete memorijal, s bilo kojeg uređaja. Sve što ste upisali ostaje spremljeno.'
            : 'Memorijal i sve što ste upisali spremit ćemo na vaš postojeći račun.'}
        </p>
        {mode === 'login' && (
          <p className="text-sm mt-2 rounded-md border border-border bg-background p-3">
            <strong>Prijavljujete se preko Googlea?</strong> Takav račun nema lozinku. Upišite svoj Gmail i kliknite
            {' '}<strong>"Pošalji poveznicu za lozinku"</strong>. Na mail ćete dobiti poveznicu, postavite lozinku i memorijal
            će se sam spremiti na vaš račun. Nakon toga ga nastavljate iz "Moji memorijali".
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ga-email">E-mail</Label>
          <Input id="ga-email" type="email" autoComplete="email" value={email} maxLength={255}
            onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.hr" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ga-password">{mode === 'create' ? 'Lozinka (najmanje 8 znakova)' : 'Lozinka'}</Label>
          <Input id="ga-password" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            value={password} maxLength={72} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {resetSent && (
        <p className="text-sm rounded-md border border-accent/60 bg-background p-3">
          Poslali smo poveznicu na <strong>{email.trim()}</strong>. Otvorite je <strong>u ovom pregledniku</strong>,
          postavite lozinku i memorijal će se spremiti na vaš račun.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="gold" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === 'create' ? 'Spremi račun i nastavi' : 'Prijavi se i nastavi'}
        </Button>
        {mode === 'login' ? (
          <>
            <button type="button" className="text-sm text-accent hover:underline" onClick={() => { setMode('create'); setError(''); }}>
              Upotrijebi drugi e-mail
            </button>
            <button type="button" className="text-sm text-accent hover:underline" onClick={sendPasswordLink} disabled={busy}>
              Pošalji poveznicu za lozinku (Google račun ili zaboravljena lozinka)
            </button>
          </>
        ) : (
          <button type="button" className="text-sm text-accent hover:underline" onClick={() => { setMode('login'); setError(''); }}>
            Već imate račun? Prijavite se
          </button>
        )}
      </div>
    </form>
  );
};

export default GuestAccountStep;
