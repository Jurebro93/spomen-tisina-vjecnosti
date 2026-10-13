import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const FAQS = [
  {
    question: 'Čemu služi osmrtnica, a čemu digitalni memorijal?',
    answer: 'Osmrtnica služi za brzo i jasno obavještavanje o smrti i sprovodu. Digitalni memorijal služi za trajno čuvanje priče o pokojniku na jednom mjestu koje obitelj može njegovati i dijeliti godinama poslije.',
  },
  {
    question: 'Kada odabrati osmrtnicu, a kada digitalni memorijal?',
    answer: 'Odaberite osmrtnicu kada želite javno objaviti vijest o smrti i pozvati bliske na sprovod. Odaberite digitalni memorijal kada želite sačuvati bogatiju priču o osobi — pogodno je i za one koji su preminuli nedavno, ali i za roditelje, bake, djedove, partnere ili prijatelje koji su otišli prije mnogo godina.',
  },
  {
    question: 'Kako objaviti osmrtnicu?',
    answer: 'Jednostavno ispunite obrazac na stranici „Objavi osmrtnicu" s osnovnim podacima o pokojniku i kontakt osobi. Nakon provjere, osmrtnica se objavljuje na stranici i dostupna je za pretragu po imenu ili gradu.',
  },
  {
    question: 'Što napisati u poruci sućuti?',
    answer: 'Najbolja poruka je kratka, iskrena i osobna. Možete izraziti sućut obitelji, podsjetiti se na lijepu uspomenu s pokojnikom ili jednostavno napisati: „Iskreno suosjećam s vašom gubitkom. Moje misli su s vama u ovim teškim trenucima."',
  },
  {
    question: 'Što je potrebno napraviti nakon smrti člana obitelji?',
    answer: 'Najvažnije je prijaviti smrt liječniku i nadležnom uredu kako biste dobili odluku o uzroku smrti. Zatim slijedi prijava u matični ured, organizacija sprovoda, objava osmrtnice i obavještavanje bližnjih. Mnoge obitelji ujedno žele napraviti i digitalni memorijal kao trajno mjesto sjećanja.',
  },
  {
    question: 'Koliko košta sprovod u Hrvatskoj?',
    answer: 'Cijena sprovoda u Hrvatskoj ovisi o odabranim uslugama i gradu, a u prosjeku se kreće od nekoliko tisuća do preko 10.000 eura. U cijenu ulaze prijenos pokojnika, pripremanje, lijes, cvijeće, obavijesti, grobno mjesto i sprovodna svečanost. Preporučujemo da zatražite detaljnu ponudu od odabranog pogrebnog poduzeća.',
  },
  {
    question: 'Jesu li virtualne svijeće besplatne i koliko traju?',
    answer: 'Da, zapaliti virtualnu svijeću je potpuno besplatno. Svaka svijeća gori 7 dana, a nakon toga se automatski ugasi. Novu svijeću možete zapaliti bilo kada.',
  },
];

export const HomepageFaqSection = () => {
  return (
    <section className="bg-background py-16" aria-labelledby="homepage-faq-heading">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="h-6 w-6 text-memorial-gold" />
              <h2 id="homepage-faq-heading" className="text-3xl font-bold text-primary">
                Često postavljena pitanja
              </h2>
            </div>
            <p className="text-muted-foreground">
              Odgovori na najčešća pitanja o osmrtnicama, digitalnom memorijalu i našim uslugama.
            </p>
          </div>

          {/* Pitanja i odgovori uvijek u HTML-u, dostupni crawlerima i čitačima
              ekrana i kada je accordion zatvoren. */}
          <div className="sr-only">
            {FAQS.map((faq) => (
              <div key={`plain-${faq.question}`}>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>

          <Accordion type="single" collapsible className="w-full" aria-hidden="false">
            {FAQS.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`} className="border-b border-border last:border-b-0">
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-4 font-body">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
