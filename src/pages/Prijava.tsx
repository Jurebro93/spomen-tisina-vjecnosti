import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleButton from '@/components/auth/GoogleButton';
import { supabase } from '@/integrations/supabase/client';
import { safeRedirect, useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Prijava = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const redirect = safeRedirect(params.get('redirect'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirect, { replace: true });
  }, [user, loading, redirect, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (error) {
      const notConfirmed = error.message.toLowerCase().includes('not confirmed');
      toast({
        title: 'Prijava nije uspjela',
        description: notConfirmed
          ? 'Vaša e-mail adresa još nije potvrđena. Provjerite poštu ili nas kontaktirajte.'
          : 'Provjerite e-mail adresu i lozinku pa pokušajte ponovno.',
        variant: 'destructive',
      });
      return;
    }
    navigate(redirect, { replace: true });
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const { error } = await supabase.functions.invoke('send-password-reset', {
      body: {
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Nije uspjelo', description: 'Poveznicu nije bilo moguće poslati. Pokušajte ponovno.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Provjerite e-mail', description: 'Poslali smo vam poveznicu za postavljanje nove lozinke.' });
    setResetMode(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Prijava | Digitalni memorijal</title>
        <meta name="description" content="Prijavite se kako biste kreirali ili uređivali digitalni memorijal svoje voljene osobe." />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl text-center mb-2">
            {resetMode ? 'Zaboravljena lozinka' : 'Prijavite se'}
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {resetMode
              ? 'Unesite e-mail adresu i poslat ćemo vam poveznicu za novu lozinku.'
              : 'Nastavite s Google računom ili se prijavite e-mailom.'}
          </p>

          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              {!resetMode && (
                <>
                  <GoogleButton redirect={redirect} />
                  <div className="relative text-center">
                    <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden="true" />
                    <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">ili</span>
                  </div>
                </>
              )}

              <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" autoComplete="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} maxLength={255} />
                </div>

                {!resetMode && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Lozinka</Label>
                    <Input id="password" type="password" autoComplete="current-password" required
                      value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {resetMode ? 'Pošalji poveznicu' : 'Prijavi se'}
                </Button>
              </form>

              <div className="space-y-2 text-sm text-center">
                <button type="button" className="text-accent hover:underline" onClick={() => setResetMode(!resetMode)}>
                  {resetMode ? 'Natrag na prijavu' : 'Zaboravili ste lozinku?'}
                </button>
                <p className="text-muted-foreground">
                  Nemate račun?{' '}
                  <Link className="text-accent hover:underline" to={`/registracija?redirect=${encodeURIComponent(redirect)}`}>
                    Registrirajte se
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Prijava;
