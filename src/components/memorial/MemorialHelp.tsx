import { useState } from 'react';
import { Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

const PHONE_DISPLAY = '+385 95 817 3172';
const PHONE_LINK = 'tel:+385958173172';

/**
 * Bottom of every memorial-creation step: a phone number, or leave an e-mail / phone and we call back.
 * The request goes to the info@ inbox (edge function request-memorial-help).
 */
const MemorialHelp = ({ step, memorialId, person }: { step: string; memorialId?: string | null; person?: string }) => {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    const { data, error: fnError } = await supabase.functions.invoke('request-memorial-help', {
      body: { contact: contact.trim(), step, memorial_id: memorialId ?? null, person: person ?? '', website },
    });
    setBusy(false);
    if (!fnError && data?.ok) { setSent(true); return; }
    setError(data?.code === 'invalid_contact' || /400/.test(String(fnError?.message))
      ? 'Upišite ispravan e-mail ili broj telefona.'
      : `Zahtjev nije poslan. Nazovite nas na ${PHONE_DISPLAY}.`);
  };

  return (
    <aside className="mt-10 border-t border-border pt-5 text-sm text-muted-foreground space-y-3" aria-label="Pomoć s izradom memorijala">
      <p>
        Trebate pomoć s izradom memorijala? Nazovite{' '}
        <a href={PHONE_LINK} className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4">
          <Phone className="h-3.5 w-3.5" />{PHONE_DISPLAY}
        </a>
        {!open && !sent && (
          <> ili{' '}
            <button type="button" onClick={() => setOpen(true)} className="font-medium text-foreground underline underline-offset-4">
              zatražite da vas mi nazovemo
            </button>.
          </>
        )}
      </p>
      {sent ? (
        <p className="text-foreground">Hvala, javit ćemo vam se čim prije.</p>
      ) : open && (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Vaš e-mail ili broj telefona"
            aria-label="Vaš e-mail ili broj telefona" maxLength={255} autoComplete="email" />
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"
            aria-hidden="true" className="hidden" name="website" />
          <Button type="submit" variant="outline" disabled={busy || contact.trim().length < 6}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Javite mi se
          </Button>
        </form>
      )}
      {error && <p className="text-destructive">{error}</p>}
    </aside>
  );
};

export default MemorialHelp;
