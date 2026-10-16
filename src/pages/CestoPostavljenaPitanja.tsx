import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  HelpCircle, 
  Clock, 
  CreditCard, 
  Shield, 
  Mail, 
  Phone,
  FileText,
  Camera,
  Users,
  Heart,
  CheckCircle,
  AlertTriangle,
  Search
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useNavigate } from 'react-router-dom';
import { SEOHelmet } from '@/hooks/useSEO';
import NewsletterSignup from '@/components/NewsletterSignup';

const CestoPostavljenaPitanja = () => {
  const navigate = useNavigate();

  const faqCategories = [
    {
      id: "objava-osmrtnica",
      title: "Objava osmrtnica",
      icon: FileText,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30",
      questions: [
        {
          question: "Kako mogu objaviti osmrtnicu?",
          answer: "Objava osmrtnice je jednostavna i besplatna. Idite na stranicu 'Objavi osmrtnicu', ispunite obrazac s potrebnim podacima o pokojniku i pošaljite. Sve osmrtnice prolaze kroz proces provjere prije objave."
        },
        {
          question: "Koliko košta objava osmrtnice?",
          answer: "Osnovna objava osmrtnice je potpuno besplatna. Plaćaju se samo dodatne usluge poput istaknutog prikaza ili duljeg vremena prikazivanja."
        },
        {
          question: "Koliko dugo traje proces odobrenja?",
          answer: "Proces odobrenja traje najviše 24 sata. Naš tim provjerava sve podatke kako bi se osigurala točnost i dostojanstvo sadržaja."
        },
        {
          question: "Što ako napravim grešku u osmrtnici?",
          answer: "Kontaktirajte nas putem email-a odmah nakon slanja. Ako osmrtnica još nije odobrena, možemo je ispraviti. Nakon objave, izmjene su moguće uz dodatnu provjeru."
        },
        {
          question: "Mogu li dodati fotografiju kasnije?",
          answer: "Da, fotografiju možete dodati naknadno. Pošaljite nam email s ID-om osmrtnice i fotografijom. Fotografija mora biti kvalitetna i dostojanstvena."
        }
      ]
    },
    {
      id: "virtualne-svijece",
      title: "Virtualne svijeće",
      icon: Heart,
      color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30",
      questions: [
        {
          question: "Što su virtualne svijeće?",
          answer: "Virtualne svijeće su digitalni način iskazivanja poštovanja i sjećanja na pokojnike. Možete zapaliti virtualnu svijeću s porukom za 7 dana."
        },
        {
          question: "Koliko košta zapaljenje virtualne svijeće?",
          answer: "Zapaljenje virtualne svijeće košta 2 eura za 7 dana prikazivanja. Plaćanje se vrši putem sigurnog Stripe sustava."
        },
        {
          question: "Mogu li ostaviti anonimnu poruku?",
          answer: "Da, možete ostaviti poruku bez navođenja vašeg imena. Trebate unijeti samo ime pokojnika i vašu poruku sjećanja."
        },
        {
          question: "Koliko dugo će moja svijeća biti vidljiva?",
          answer: "Vaša virtualna svijeća će biti vidljiva 7 dana od trenutka odobrenja. Nakon tog vremena, svijeća se automatski gasi."
        }
      ]
    },
    {
      id: "memorijalni-vrt",
      title: "Memorijalni vrt",
      icon: Users,
      color: "bg-green-100 text-green-600 dark:bg-green-900/30",
      questions: [
        {
          question: "Što je memorijalni vrt?",
          answer: "Memorijalni vrt je prostor gdje možete ostaviti trajne poruke sjećanja. Sve poruke prolaze kroz provjeru prije objave kako bi se osiguralo dostojanstvo."
        },
        {
          question: "Je li memorijalni vrt besplatan?",
          answer: "Da, ostavljanje poruka u memorijalnom vrtu je potpuno besplatno. To je naš način podrške obiteljima u teškim trenucima."
        },
        {
          question: "Mogu li urediti svoju poruku nakon objave?",
          answer: "Nakon objave, poruke se ne mogu urediti. Molimo pažljivo provjerite sadržaj prije slanja. U iznimnim slučajevima kontaktirajte našu podršku."
        },
        {
          question: "Zašto moja poruka nije odmah objavljena?",
          answer: "Sve poruke prolaze kroz moderaciju kako bi se osiguralo da su primjerene i dostojanstvene. Proces traje obično 2-24 sata."
        }
      ]
    },
    {
      id: "tehnicki-problemi",
      title: "Tehnički problemi",
      icon: HelpCircle,
      color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30",
      questions: [
        {
          question: "Stranica se ne učitava pravilno",
          answer: "Pokušajte osvježiti stranicu (F5) ili očistiti cache vašeg preglednika. Ako se problem nastavi, kontaktirajte nas s detaljima o vašem pregledniku."
        },
        {
          question: "Ne mogu uploadati fotografiju",
          answer: "Provjerite da je fotografija u JPG, PNG ili WEBP formatu i da nije veća od 5MB. Također provjerite internetsku vezu."
        },
        {
          question: "Plaćanje ne prolazi",
          answer: "Provjerite podatke kartice i internetsku vezu. Ako se problem nastavi, kontaktirajte vašu banku ili našu podršku za pomoć."
        },
        {
          question: "Ne vidim svoju objavu",
          answer: "Sve objave prolaze kroz proces provjere koji traje do 24 sata. Ako je prošlo više vremena, kontaktirajte nas s ID-om vaše objave."
        }
      ]
    },
    {
      id: "pravila-privatnost",
      title: "Pravila i privatnost",
      icon: Shield,
      color: "bg-red-100 text-red-600 dark:bg-red-900/30",
      questions: [
        {
          question: "Kako čuvate moje osobne podatke?",
          answer: "Svi osobni podaci se čuvaju sigurno i koriste se samo za potrebe objave i komunikacije. Ne dijelimo podatke s trećim stranama bez vaše dozvole."
        },
        {
          question: "Mogu li obrisati svoju objavu?",
          answer: "Da, možete zatražiti brisanje vaše objave kontaktiranjem naše podrške. Trebate navesti razlog i potvrditi da ste vi autor objave."
        },
        {
          question: "Što ako netko objavi neprimjerenu osmrtnicu?",
          answer: "Kontaktirajte nas odmah s detaljima. Imamo zero-tolerance politiku za neprimjeren sadržaj i takve objave odmah uklanjamo."
        },
        {
          question: "Tko može vidjeti kontakt podatke?",
          answer: "Kontakt podaci koje unesete nisu javno vidljivi. Koriste se samo za našu internu komunikaciju s vama ako je potrebno."
        }
      ]
    },
    {
      id: "pretraga-navigacija",
      title: "Pretraga i navigacija",
      icon: Search,
      color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30",
      questions: [
        {
          question: "Kako mogu pronaći određenu osmrtnicu?",
          answer: "Koristite funkciju pretrage na vrhu stranice. Možete pretraživati po imenu, prezimenu ili gradu. Također možete pregledavati po gradovima."
        },
        {
          question: "Mogu li filtrirati rezultate pretrage?",
          answer: "Da, možete filtrirati po gradu, datumu smrti ili abecedno. Filtri su dostupni na stranici rezultata pretrage."
        },
        {
          question: "Zašto ne mogu pronaći osmrtnicu?",
          answer: "Osmrtnica možda još nije odobrena, obrisana je na zahtjev obitelji, ili nije pravilno unesena. Kontaktirajte nas za pomoć u pronalaženju."
        },
        {
          question: "Kako funkcionira prikaz po gradovima?",
          answer: "Klikom na određeni grad vidjet ćete sve odobrene osmrtnice za taj grad, sortirane po datumu objave. Također vidite statistike i lokalna groblja."
        }
      ]
    }
  ];

  const [selectedCategory, setSelectedCategory] = useState("objava-osmrtnica");

  const currentCategory = faqCategories.find(cat => cat.id === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet pagePath="/cesto-postavljena-pitanja" />
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
              Često postavljena pitanja
            </h1>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto px-2">
            Ovdje možete pronaći odgovore na najčešće postavljena pitanja o korištenju naše stranice, 
            objavi osmrtnica i drugim uslugama.
          </p>
        </div>

        {/* Sva pitanja i odgovori iz svih kategorija uvijek su prisutni u HTML-u
            kako bi bili dostupni crawlerima i čitačima ekrana bez klika. */}
        <div className="sr-only">
          {faqCategories.map((category) => (
            <section key={`plain-${category.id}`}>
              <h2>{category.title}</h2>
              {category.questions.map((faq) => (
                <div key={faq.question}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-8">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Kategorije</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {faqCategories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "ghost"}
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${category.color}`}>
                        <category.icon className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{category.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {category.questions.length} pitanja
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            {currentCategory && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentCategory.color}`}>
                      <currentCategory.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{currentCategory.title}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {currentCategory.questions.length} pitanja
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {currentCategory.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Contact Section */}
        <Card className="mt-12">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mail className="h-5 w-5" />
              Nije pronašli odgovor?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Ako niste pronašli odgovor na vaše pitanje, slobodno nas kontaktirajte. 
              Trudimo se odgovoriti u roku od 24 sata.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>info@osmrtnica.com.hr</span>
              </div>
              <Button onClick={() => window.location.href = 'mailto:info@osmrtnica.com.hr?subject=Pitanje - Osmrtnica.com.hr'}>
                Kontaktirajte nas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/kako-objaviti-osmrtnicu')}>
            <CardContent className="p-6">
              <FileText className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Kako objaviti osmrtnicu</h3>
              <p className="text-sm text-muted-foreground">
                Detaljne upute za objavu osmrtnice
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/virtualne-svijece')}>
            <CardContent className="p-6">
              <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Virtualne svijeće</h3>
              <p className="text-sm text-muted-foreground">
                Zapalite virtualnu svijeću sjećanja
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/memorijalni-vrt')}>
            <CardContent className="p-6">
              <Users className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Memorijalni vrt</h3>
              <p className="text-sm text-muted-foreground">
                Ostavite poruku sjećanja
              </p>
            </CardContent>
          </Card>
        </div>
        <NewsletterSignup variant="guide" placement="faq" className="mt-10 max-w-4xl mx-auto" />
      </main>
      
      <Footer />
    </div>
  );
};

export default CestoPostavljenaPitanja;