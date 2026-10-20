import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { ensureAuthToken } from '@/lib/memorialActions';

type Mode = 'create' | 'login';

/**
 * A guest who started a memorial without registering sets an e-mail and password before checkout.
 * The guest session becomes a real account (or moves into the existing one), so the draft stays
 * theirs and they can log in later to edit the memorial.
 */
const GuestAccountStep = () => {
  const [mode, setMode] = useState<Mode>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
      if (data?.code === 'wrong_password') { setError('Lozinka nije točna.'); return; }
      if (!data?.ok) throw new Error('not ok');
      // Signing in swaps the guest session for the account; the page then continues as a signed-in user.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (signInError) throw signInError;
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
            <Link to="/prijava" target="_blank" className="text-sm text-accent hover:underline">Zaboravili ste lozinku?</Link>
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
