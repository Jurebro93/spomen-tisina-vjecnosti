import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MailCheck } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleButton from '@/components/auth/GoogleButton';
import { supabase } from '@/integrations/supabase/client';
import { safeRedirect, useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/metaPixel';

const Registracija = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const redirect = safeRedirect(params.get('redirect'));

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirect, { replace: true });
  }, [user, loading, redirect, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!accepted) {
      toast({ title: 'Potrebna je privola', description: 'Molimo prihvatite Uvjete korištenja i Politiku privatnosti.', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Lozinka je prekratka', description: 'Lozinka mora imati najmanje 8 znakova.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('send-signup-confirmation', {
      body: {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        redirectTo: `${window.location.origin}${redirect}`,
      },
    });
    setSubmitting(false);
    if (data?.code === 'already_exists') {
      toast({
        title: 'Registracija nije uspjela',
        description: 'Račun s ovom e-mail adresom već postoji. Pokušajte se prijaviti.',
        variant: 'destructive',
      });
      return;
    }
    if (error || !data?.ok) {
      toast({
        title: 'Registracija nije uspjela',
        description: 'Pokušajte ponovno za nekoliko trenutaka.',
        variant: 'destructive',
      });
      return;
    }
    trackEvent('CompleteRegistration', { content_name: 'Korisnički račun', status: true });
    setCheckEmail(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Registracija | Digitalni memorijal</title>
        <meta name="description" content="Otvorite besplatan račun i kreirajte digitalni memorijal svoje voljene osobe." />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          {checkEmail ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center space-y-4">
                <MailCheck className="h-10 w-10 mx-auto text-accent" />
                <h1 className="font-serif text-2xl">Potvrdite e-mail adresu</h1>
                <p className="text-muted-foreground">
                  Poslali smo poruku na <strong>{email}</strong>. Kliknite poveznicu u e-mailu kako biste dovršili registraciju
                  i nastavili tamo gdje ste stali.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <h1 className="font-serif text-3xl md:text-4xl text-center mb-2">Registrirajte se</h1>
              <p className="text-center text-muted-foreground mb-8">
                Najlakše je jednim klikom putem Google računa.
              </p>
              <Card className="border-border">
                <CardContent className="p-6 space-y-6">
                  <GoogleButton redirect={redirect} />
                  <div className="relative text-center">
                    <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden="true" />
                    <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">ili</span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first">Ime</Label>
                        <Input id="first" required value={firstName} maxLength={60} onChange={(e) => setFirstName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last">Prezime</Label>
                        <Input id="last" required value={lastName} maxLength={60} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" autoComplete="email" required value={email} maxLength={255}
                        onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Lozinka</Label>
                      <Input id="password" type="password" autoComplete="new-password" required value={password} maxLength={72}
                        onChange={(e) => setPassword(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Najmanje 8 znakova.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox id="terms" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
                      <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
                        Prihvaćam{' '}
                        <Link to="/uvjeti-koristenja" className="text-accent hover:underline">Uvjete korištenja i kupnje</Link>{' '}
                        i{' '}
                        <Link to="/politika-privatnosti" className="text-accent hover:underline">Politiku privatnosti</Link>.
                      </Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Registriraj se
                    </Button>
                  </form>

                  <p className="text-sm text-center text-muted-foreground">
                    Već imate račun?{' '}
                    <Link className="text-accent hover:underline" to={`/prijava?redirect=${encodeURIComponent(redirect)}`}>
                      Prijavite se
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Registracija;
