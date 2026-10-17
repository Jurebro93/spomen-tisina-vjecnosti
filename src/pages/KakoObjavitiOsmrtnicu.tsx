import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Camera, 
  Users, 
  Phone, 
  Mail,
  ArrowRight,
  Info,
  Shield
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SEOHelmet } from '@/hooks/useSEO';
import { useNavigate } from 'react-router-dom';
import NewsletterSignup from '@/components/NewsletterSignup';

const KakoObjavitiOsmrtnicu = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      title: "Pripremite potrebne podatke",
      description: "Prikupite sve važne informacije o pokojniku",
      icon: FileText,
      details: [
        "Ime i prezime pokojnika",
        "Datum rođenja i smrti",
        "Mjesto rođenja i smrti",
        "Biografija ili kratki životopis",
        "Profesija i značajni događaji",
        "Podatke o ukopu (datum, vrijeme, groblje)"
      ]
    },
    {
      number: 2,
      title: "Odaberite fotografiju",
      description: "Priložite dostojanstvenu fotografiju pokojnika",
      icon: Camera,
      details: [
        "Koristite kvalitetnu fotografiju (minimalno 300x300px)",
        "Odaberite dostojanstvenu sliku",
        "Izbegavajte grupne fotografije",
        "Format: JPG, PNG ili WEBP"
      ]
    },
    {
      number: 3,
      title: "Navedite ožalošćene",
      description: "Uključite obitelj i bliske osobe",
      icon: Users,
      details: [
        "Navedite supružnika/cu",
        "Djecu i unuke",
        "Roditelje i braću/sestre",
        "Ostale bliske rođake i prijatelje"
      ]
    },
    {
      number: 4,
      title: "Unesite kontakt podatke",
      description: "Za potrebe potvrde i komunikacije",
      icon: Phone,
      details: [
        "Ime kontakt osobe",
        "Email adresu",
        "Broj telefona (opcionalno)",
        "Ovi podaci neće biti javno prikazani"
      ]
    }
  ];

  const guidelines = [
    {
      title: "Jezik i ton",
      description: "Koristite dostojanstven i poštovan jezik. Izbjegavajte žargon i neformalne izraze.",
      icon: FileText
    },
    {
      title: "Točnost podataka",
      description: "Provjerite sve datume, imena i ostale podatke prije slanja.",
      icon: CheckCircle
    },
    {
      title: "Privatnost",
      description: "Ne uključujte preosobne ili osjetljive informacije koje obitelj ne želi podijeliti.",
      icon: Shield
    },
    {
      title: "Fotografija",
      description: "Koristite samo fotografije za koje imate dozvolu i koje su primjerene.",
      icon: Camera
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet pagePath="/kako-objaviti-osmrtnicu" />
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
              Kako objaviti osmrtnicu
            </h1>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
            Postupak objave osmrtnice je jednostavan i besplatan. Pratite naše upute 
            da biste dostojanstveno objavili osmrtnicu vaših dragih.
          </p>
        </div>

        {/* Important Notice */}
        <Card className="mb-8 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                  Važna napomena o odobrenju
                </h3>
                <p className="text-amber-700 dark:text-amber-300 text-sm leading-relaxed">
                  Sve osmrtnice prolaze kroz proces provjere prije objave kako bi se osigurala 
                  točnost podataka i dostojanstvo sadržaja. <strong>Proces odobrenja traje najviše 24 sata</strong>. 
                  Molimo vas da ne šaljete krive ili zlonamjerne informacije jer će takve osmrtnice biti odbačene.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step by Step Guide */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">Postupak objave - korak po korak</h2>
          <div className="grid gap-6">
            {steps.map((step, index) => (
              <Card key={step.number} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <step.icon className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground mb-4">{step.description}</p>
                      <ul className="space-y-2">
                        {step.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Guidelines */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">Smjernice za kvalitetnu osmrtnicu</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {guidelines.map((guideline, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <guideline.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-2">{guideline.title}</h4>
                      <p className="text-sm text-muted-foreground">{guideline.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* What Happens After Submission */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Što se događa nakon slanja osmrtnice?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Trenutno objavljeno</h4>
                  <p className="text-sm text-muted-foreground">
                    Vaša osmrtnica je poslana i čeka na provjeru našeg tima.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Provjera sadržaja</h4>
                  <p className="text-sm text-muted-foreground">
                    Naš tim provjerava točnost podataka i primjerenost sadržaja (do 24h).
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Objavljena osmrtnica</h4>
                  <p className="text-sm text-muted-foreground">
                    Osmrtnica je odobrena i javno dostupna na našoj stranici.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="text-center">
          <CardContent className="p-8">
            <h3 className="text-xl font-semibold mb-4">Spremni ste za objavu?</h3>
            <p className="text-muted-foreground mb-6">
              Slijedite naše upute i objavite dostojanstvenu osmrtnicu u samo nekoliko koraka.
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate('/objavi-osmrtnicu')}
              className="gap-2"
            >
              Objavite osmrtnicu
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        <NewsletterSignup variant="guide" placement="kako_objaviti" className="mt-10 max-w-4xl mx-auto" />
      </main>
      
      <Footer />
    </div>
  );
};

export default KakoObjavitiOsmrtnicu;