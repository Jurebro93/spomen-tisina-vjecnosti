import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

/** After checkout, a guest links an e-mail so the memorial stays theirs on any device. */
const GuestAccountClaim = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setState('error'); return; }
    setState('sending');
    const { error } = await supabase.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: `${window.location.origin}/moji-memorijali` },
    );
    setState(error ? 'error' : 'sent');
  };

  if (state === 'sent') {
    return (
      <div className="text-left border border-border rounded-lg p-4 mb-8 text-sm">
        Poslali smo poveznicu na <strong>{email.trim()}</strong>. Kliknite je i memorijal će biti spremljen na vaš račun.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-left border border-border rounded-lg p-4 mb-8">
      <p className="font-semibold mb-1">Spremite pristup memorijalu</p>
      <p className="text-sm text-muted-foreground mb-3">
        Memorijal ste izradili bez računa. Upišite e-mail kako biste ga mogli uređivati i s drugog uređaja.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.hr" maxLength={255} />
        <Button type="submit" variant="gold" disabled={state === 'sending'}>Spremi pristup</Button>
      </div>
      {state === 'error' && <p className="text-sm text-destructive mt-2">Provjerite e-mail adresu i pokušajte ponovno.</p>}
    </form>
  );
};

export default GuestAccountClaim;
