import React, { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { throttle } from '@/lib/memorial';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const REASONS = [
  { value: 'neprimjeren_sadrzaj', label: 'Neprimjeren sadržaj' },
  { value: 'netocne_informacije', label: 'Netočne informacije' },
  { value: 'krsenje_privatnosti', label: 'Kršenje privatnosti' },
  { value: 'ostalo', label: 'Ostalo' },
];

const ReportDialog = ({ memorialId }: { memorialId: string }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].value);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!throttle(`report:${memorialId}`, 120_000)) {
      toast({ title: 'Malo pričekajte', description: 'Prijavu ste nedavno poslali.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('memorial_content_reports').insert({
      memorial_id: memorialId,
      entity_type: 'memorial',
      entity_id: memorialId,
      reason,
      description: description.trim() || null,
      reporter_user_id: user?.id ?? null,
      reporter_email: (user?.email || email.trim()) || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Nije poslano', description: 'Prijavu nije bilo moguće poslati. Pokušajte ponovno.', variant: 'destructive' });
      return;
    }
    setOpen(false);
    toast({ title: 'Prijava je poslana', description: 'Hvala vam, pregledat ćemo prijavljeni sadržaj.' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
          <Flag className="h-4 w-4 mr-2" /> Prijavi sadržaj
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Prijavi sadržaj</DialogTitle>
          <DialogDescription>Recite nam što nije u redu i pregledat ćemo memorijal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="r-reason">Razlog</Label>
            <select id="r-reason" value={reason} onChange={(e) => setReason(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-desc">Opis</Label>
            <Textarea id="r-desc" rows={4} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="r-email">Vaš e-mail (nije obvezno)</Label>
              <Input id="r-email" type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Pošalji prijavu
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
