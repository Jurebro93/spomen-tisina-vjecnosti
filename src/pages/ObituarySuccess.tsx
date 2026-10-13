import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, ArrowLeft, Home } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSEO } from '@/hooks/useSEO';
import { Helmet } from 'react-helmet-async';

const ObituarySuccess = () => {
  useSEO('/success');
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [obituary, setObituary] = useState<any>(null);
  const [verificationComplete, setVerificationComplete] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        toast({
          title: "Greška",
          description: "Nedostaje ID sesije",
          variant: "destructive",
        });
        navigate('/objavi-osmrtnicu');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-obituary-payment', {
          body: { session_id: sessionId }
        });

        if (error) throw error;

        if (data.success) {
          setObituary(data.obituary);
          toast({
            title: "Uspješno!",
            description: data.message,
            variant: "default",
          });
        } else {
          throw new Error(data.message || 'Plaćanje nije uspješno');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast({
          title: "Greška",
          description: error instanceof Error ? error.message : "Dogodila se greška pri potvrdi plaćanja",
          variant: "destructive",
        });
      } finally {
        setIsVerifying(false);
        setVerificationComplete(true);
      }
    };

    verifyPayment();
  }, [searchParams, toast, navigate]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-border shadow-memorial">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-memorial-gold"></div>
                  <p className="text-center text-muted-foreground">Potvrđujemo plaćanje...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-border shadow-memorial">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="text-green-500" size={64} />
              </div>
              <CardTitle className="text-2xl font-semibold text-foreground">
                Osmrtnica je uspješno objavljena!
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Vaše plaćanje je uspješno obrađeno i osmrtnica je sada dostupna svima.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {obituary && (
                <div className="bg-memorial-warm/10 rounded-lg p-4 border border-memorial-warm/20">
                  <h3 className="font-semibold text-foreground mb-2">Podaci o objavljenoj osmrtnici:</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Ime:</span> {obituary.ime} {obituary.prezime}</p>
                    <p><span className="font-medium">Rođen:</span> {new Date(obituary.datum_rodenja).toLocaleDateString('hr-HR')}</p>
                    <p><span className="font-medium">Umro:</span> {new Date(obituary.datum_smrti).toLocaleDateString('hr-HR')}</p>
                    <p><span className="font-medium">Kontakt:</span> {obituary.kontakt_osoba_ime}</p>
                  </div>
                </div>
              )}
              
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Osmrtnica će se prikazati na naslovnici među najnovijim objavama.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => navigate('/')}
                    className="bg-memorial-gold hover:bg-memorial-gold/90 text-white"
                  >
                    <Home className="mr-2" size={20} />
                    Idi na naslovnicu
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/objavi-osmrtnicu')}
                    variant="outline"
                    className="border-memorial-gold text-memorial-gold hover:bg-memorial-gold hover:text-white"
                  >
                    <ArrowLeft className="mr-2" size={20} />
                    Objavi drugu osmrtnicu
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ObituarySuccess;