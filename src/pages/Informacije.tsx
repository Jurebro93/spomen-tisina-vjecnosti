import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Clock, 
  Phone, 
  MapPin, 
  Heart, 
  Info,
  AlertCircle,
  CheckCircle,
  Calendar,
  Users,
  Banknote
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CitiesSection from '@/components/CitiesSection';
import MemorialCtaSection from '@/components/MemorialCtaSection';
import { SEOHelmet } from '@/hooks/useSEO';
import NewsletterSignup from '@/components/NewsletterSignup';

const Informacije = () => {
  
  const documents = [
    { name: "Izvod iz matične knjige rođenih", required: true },
    { name: "Izvod iz matične knjige umrlih", required: true },
    { name: "Liječnička potvrda o smrti", required: true },
    { name: "Osobna iskaznica pokojnika", required: true },
    { name: "Bračna potvrda (za udane/oženjene)", required: false },
    { name: "Potvrda o državljanstvu", required: false },
    { name: "Radna knjižica ili potvrda s posla", required: false }
  ];

  const procedures = [
    {
      step: 1,
      title: "Prijava smrti",
      description: "Smrt se mora prijaviti u roku od 24 sata nadležnom matičnom uredu",
      timeframe: "Do 24 sata",
      icon: AlertCircle
    },
    {
      step: 2,
      title: "Prikupljanje dokumenata",
      description: "Pribavite sve potrebne dokumente za organizaciju pogreba",
      timeframe: "1-2 dana",
      icon: FileText
    },
    {
      step: 3,
      title: "Odabir pogrebnog poduzeća",
      description: "Kontaktirajte pogrebno poduzeće za organizaciju sprovoda",
      timeframe: "Odmah",
      icon: Users
    },
    {
      step: 4,
      title: "Organizacija sprovoda",
      description: "Dogovorite detalje ceremonije i sahrane",
      timeframe: "2-7 dana",
      icon: Calendar
    }
  ];

  const costs = [
    { item: "Osnovni paket sahrane", price: "1.000 - 2.000 €" },
    { item: "Lijes (jednostavan)", price: "250 - 650 €" },
    { item: "Lijes (luksuzni)", price: "650 - 2.500 €" },
    { item: "Kremacija", price: "200 - 400 €" },
    { item: "Grobno mjesto (kupnja)", price: "1.300 - 6.500 €" },
    { item: "Grobno mjesto (najam 10 god.)", price: "400 - 1.000 €" },
    { item: "Kamenoklesarski radovi", price: "650 - 3.300 €" },
    { item: "Cvijeće i vijenci", price: "65 - 400 €" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet pagePath="/informacije" />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Info className="h-6 w-6 sm:h-8 sm:w-8 text-memorial-gold" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">Informacije</h1>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Sve što trebate znati o procedurama, dokumentima i organizaciji pogreba
          </p>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Card className="text-center">
            <CardContent className="pt-4 sm:pt-6 px-4">
              <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-memorial-gold mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Kompletne informacije</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Sve potrebne informacije o procedurama i dokumentima
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-4 sm:pt-6 px-4">
              <Heart className="h-8 w-8 sm:h-12 sm:w-12 text-memorial-gold mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Korak po korak</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Detaljni vodiči kroz sve potrebne korake i procedure
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-4 sm:pt-6 px-4">
              <MapPin className="h-8 w-8 sm:h-12 sm:w-12 text-memorial-gold mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Svi gradovi</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Pokrivamo sve veće gradove u Hrvatskoj
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Procedures Section */}
        <Card className="mb-8 sm:mb-12">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              Postupak organizacije pogreba
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6">
              {procedures.map((procedure) => {
                const Icon = procedure.icon;
                return (
                  <div key={procedure.step} className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-memorial-gold text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
                      {procedure.step}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-memorial-gold" />
                          <h4 className="text-base sm:text-lg font-semibold">{procedure.title}</h4>
                        </div>
                        <Badge variant="outline" className="text-xs w-fit">{procedure.timeframe}</Badge>
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground">{procedure.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card className="mb-8 sm:mb-12">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Potrebni dokumenti
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`h-3 w-3 rounded-full flex-shrink-0 ${doc.required ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <span className="flex-1 text-sm sm:text-base">{doc.name}</span>
                  <Badge variant={doc.required ? "destructive" : "secondary"} className="text-xs">
                    {doc.required ? "Obavezno" : "Opcionalno"}
                  </Badge>
                </div>
              ))}
            </div>
            
            <Separator className="my-6" />
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Važne napomene
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Svi dokumenti moraju biti originali ili ovjerene kopije</li>
                <li>• Za strance su potrebni dodatni dokumenti o boravištu</li>
                <li>• Dokumenti na stranom jeziku moraju biti prevedeni i ovjereni</li>
                <li>• Za djecu mladju od 18 godina potrebni su dodatni dokumenti</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Costs Section */}
        <Card className="mb-8 sm:mb-12">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Banknote className="h-4 w-4 sm:h-5 sm:w-5" />
              Orijentacijski troškovi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {costs.map((cost, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm sm:text-base pr-2">{cost.item}</span>
                  <Badge variant="outline" className="text-xs sm:text-sm whitespace-nowrap">{cost.price}</Badge>
                </div>
              ))}
            </div>
            
            <Separator className="my-6" />
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Napomena o cijenama
              </h4>
              <p className="text-sm text-muted-foreground">
                Cijene su orijentacijske i mogu varirati ovisno o gradu, pogrebnom poduzeću i 
                specifičnim zahtjevima. Za točne cijene kontaktirajte lokalna pogrebna poduzeća.
              </p>
            </div>
          </CardContent>
        </Card>


        {/* Emergency Contact */}
        <Card className="mb-8 sm:mb-12 border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300 text-lg sm:text-xl">
              <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
              Hitni kontakt
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-center">
              <p className="text-base sm:text-lg font-semibold text-red-700 dark:text-red-300 mb-3 sm:mb-2">
                U slučaju smrti pozovite:
              </p>
              <div className="space-y-2">
                <div className="text-xl sm:text-2xl font-bold text-red-800 dark:text-red-200">
                  112 (Hitna pomoć)
                </div>
                <div className="text-base sm:text-lg text-red-700 dark:text-red-300">
                  192 (Policija)
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 px-2">
                Nakon dolaska hitne pomoći, kontaktirajte pogrebno poduzeće za daljnje korake
              </p>
            </div>
          </CardContent>
        </Card>
        <NewsletterSignup variant="guide" placement="informacije" className="mt-10 max-w-4xl mx-auto" />
      </main>
      
      <CitiesSection />
      <MemorialCtaSection />
      <Footer />
    </div>
  );
};

export default Informacije;