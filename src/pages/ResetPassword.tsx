import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { runPendingGuestClaim } from '@/lib/guestClaim';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 8) {
      toast({ title: 'Lozinka je prekratka', description: 'Lozinka mora imati najmanje 8 znakova.', variant: 'destructive' });
      return;
    }
    if (password !== repeat) {
      toast({ title: 'Lozinke se ne podudaraju', description: 'Unesite istu lozinku u oba polja.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast({
        title: 'Lozinku nije bilo moguće promijeniti',
        description: 'Poveznica je možda istekla. Zatražite novu poveznicu za promjenu lozinke.',
        variant: 'destructive',
      });
      return;
    }
    // A guest who came here from the checkout step gets their draft moved to this account first.
    await runPendingGuestClaim();
    toast({ title: 'Lozinka je promijenjena', description: 'Prijavljeni ste s novom lozinkom.' });
    navigate('/moji-memorijali', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Nova lozinka | Digitalni memorijal</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <h1 className="font-serif text-3xl text-center mb-8">Postavite novu lozinku</h1>
          <Card className="border-border">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new">Nova lozinka</Label>
                  <Input id="new" type="password" autoComplete="new-password" required value={password} maxLength={72}
                    onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repeat">Ponovite lozinku</Label>
                  <Input id="repeat" type="password" autoComplete="new-password" required value={repeat} maxLength={72}
                    onChange={(e) => setRepeat(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Spremi novu lozinku
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
