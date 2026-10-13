import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, initials } from '@/hooks/useAuth';
import { useSignOut } from '@/hooks/useSignOut';

import { useToast } from '@/hooks/use-toast';

const MojRacun = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { handleSignOut, signingOut } = useSignOut();

  const navigate = useNavigate();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/prijava?redirect=%2Fmoj-racun', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  const isGoogle = Boolean(user?.identities?.some((i) => i.provider === 'google'));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null, email: user.email });
    setSaving(false);
    if (error) {
      toast({ title: 'Nije spremljeno', description: 'Promjene nije bilo moguće spremiti. Pokušajte ponovno.', variant: 'destructive' });
      return;
    }
    await refreshProfile();
    toast({ title: 'Spremljeno', description: 'Podaci vašeg računa su ažurirani.' });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Moj račun | Digitalni memorijal</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 md:py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center font-medium text-lg">
                {initials(profile, user)}
              </div>
            )}
            <div>
              <h1 className="font-serif text-2xl md:text-3xl">Moj račun</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>

          <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first">Ime</Label>
                    <Input id="first" value={firstName} maxLength={60} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last">Prezime</Label>
                    <Input id="last" value={lastName} maxLength={60} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon (nije obvezno)</Label>
                  <Input id="phone" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail">E-mail</Label>
                  <Input id="mail" value={user.email ?? ''} readOnly disabled />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Spremi promjene
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" />
                {isGoogle ? 'Povezano s Google računom' : 'Prijava e-mailom i lozinkom'}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to="/moji-memorijali">Moji memorijali</Link>
                </Button>
                <Button variant="secondary" disabled={signingOut} onClick={() => handleSignOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Odjava
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MojRacun;
