import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { RELATIONSHIPS } from '@/lib/memorial';
import { displayName, useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Props {
  memorialId: string;
  redirectPath: string;
  autoOpen?: boolean;
  variant?: 'default' | 'outline';
  label?: string;
}

const RequestAccessDialog = ({ memorialId, redirectPath, autoOpen, variant = 'outline', label = 'Zatražite pristup' }: Props) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [relationship, setRelationship] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpen && user) setOpen(true);
  }, [autoOpen, user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('memorial_access_requests')
      .select('status')
      .eq('memorial_id', memorialId)
      .eq('requester_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setExisting(data?.status ?? null));
  }, [user, memorialId]);

  const handleClick = () => {
    if (!user) {
      navigate(`/prijava?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from('memorial_access_requests').insert({
      memorial_id: memorialId,
      requester_user_id: user.id,
      relationship: relationship || null,
      message: message.trim() || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Nije poslano', description: 'Zahtjev nije bilo moguće poslati. Pokušajte ponovno.', variant: 'destructive' });
      return;
    }
    setExisting('pending');
    setOpen(false);
    toast({ title: 'Zahtjev je poslan', description: 'Obitelj će pregledati vaš zahtjev za pristup uređivanju.' });
  };

  if (existing === 'pending') {
    return <p className="text-sm text-muted-foreground">Vaš zahtjev za pristup je poslan i čeka odobrenje.</p>;
  }
  if (existing === 'approved') {
    return (
      <Button variant="outline" onClick={() => navigate('/moji-memorijali')}>Uredi memorijal</Button>
    );
  }

  return (
    <>
      <Button type="button" variant={variant} onClick={handleClick} className="max-w-full h-auto min-h-10 whitespace-normal text-center">
        <UserPlus className="h-4 w-4 mr-2 shrink-0" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Zatražite pristup uređivanju</DialogTitle>
            <DialogDescription>Obitelj koja vodi memorijal odlučuje o odobrenju pristupa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ra-name">Ime i prezime</Label>
              <Input id="ra-name" value={displayName(profile, user)} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ra-email">E-mail</Label>
              <Input id="ra-email" value={user?.email ?? ''} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ra-rel">Odnos s pokojnikom</Label>
              <select id="ra-rel" value={relationship} onChange={(e) => setRelationship(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Odaberite…</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ra-msg">Kratka poruka</Label>
              <Textarea id="ra-msg" rows={4} maxLength={800} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Pošalji zahtjev
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestAccessDialog;
