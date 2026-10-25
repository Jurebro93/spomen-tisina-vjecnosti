// Landing page for the free guide "Obiteljska mirovina korak po korak".
import { Calculator, FileText, ListChecks, Scale } from 'lucide-react';
import GuideLanding from '@/components/GuideLanding';
import { EBOOKS } from '@/lib/ebook';

const GUIDE = EBOOKS['obiteljska-mirovina'];
const TITLE = 'Besplatni vodič: Obiteljska mirovina korak po korak | Osmrtnica.com.hr';
const DESCRIPTION = 'Tko ima pravo na obiteljsku mirovinu, koliko iznosi, kada se isplati model od 27 % i kako predati zahtjev HZMO-u na vrijeme. Besplatni PDF od 14 stranica.';

const FACTS = [
  { icon: FileText, label: `${GUIDE.pagesLabel}, PDF` },
  { icon: Scale, label: 'Prema Zakonu o mirovinskom osiguranju (NN 96/25)' },
  { icon: Calculator, label: 'Tri izračunata primjera' },
  { icon: ListChecks, label: 'Kontrolni popis dokumenata za ispis' },
];

const CHAPTERS = [
  { n: 1, title: 'Što je obiteljska mirovina', text: 'Zašto ne ide kroz ostavinu i zašto je rok od 6 mjeseci od smrti važan za iznos koji ćete dobiti unatrag.' },
  { n: 2, title: 'Je li pokojnik ostavio pravo', text: 'Koliko je staža morao imati pokojnik i što vrijedi kad je smrt posljedica ozljede na radu.' },
  { n: 3, title: 'Tko ima pravo i pod kojim uvjetima', text: 'Udovice i udovci, izvanbračni i razvedeni partneri, djeca na školovanju, roditelji i unučad.' },
  { n: 4, title: 'Koliko iznosi', text: 'Faktori 0,77, 0,88, 1,0 i 1,1, kako se mirovina dijeli među članovima obitelji i što ako pokojnik još nije bio u mirovini.' },
  { n: 5, title: 'Vlastita mirovina ili obiteljska? Model od 27 %', text: 'Uvjeti, granica od 1.251,20 € i tri primjera s izračunom koja mogućnost donosi više.' },
  { n: 6, title: 'Kako i gdje predati zahtjev', text: 'Online preko e-Građana, osobno ili poštom, koji obrazac i koje dokumente pripremiti.' },
  { n: 7, title: 'Rad uz obiteljsku mirovinu', text: 'Koliko smijete zaraditi, što se mijenja nakon 65. godine i koje promjene morate prijaviti u 15 dana.' },
  { n: 8, title: 'Česta pitanja i kontrolni popis', text: 'Odgovori na najčešća pitanja obitelji i popis dokumenata koji možete ispisati i odnijeti u HZMO.' },
];

const PREVIEWS = [
  { src: '/vodic/obiteljska-mirovina/iznos.jpg', alt: 'Stranica vodiča: koliko iznosi obiteljska mirovina' },
  { src: '/vodic/obiteljska-mirovina/model-27.jpg', alt: 'Stranica vodiča: vlastita mirovina i dio obiteljske od 27 posto' },
  { src: '/vodic/obiteljska-mirovina/zahtjev.jpg', alt: 'Stranica vodiča: kako i gdje predati zahtjev' },
  { src: '/vodic/obiteljska-mirovina/kontrolni-popis.jpg', alt: 'Stranica vodiča: kontrolni popis dokumenata' },
];

const SOURCES: [string, string][] = [
  ['Uvjeti, iznosi i rokovi', 'Zakon o mirovinskom osiguranju, NN 96/25'],
  ['Aktualna vrijednost mirovine', 'HZMO, od 1. srpnja 2026.'],
  ['Dio obiteljske mirovine (27 %)', 'ZOMO čl. 75. i 76.; HZMO'],
  ['Dokumenti za zahtjev', 'HZMO, tiskanica 1.4'],
  ['Online zahtjev', 'e-Građani, e-Usluge HZMO-a'],
  ['Rad uz mirovinu', 'ZOMO čl. 100.; HZMO'],
];

const FAQ = [
  { q: 'Je li vodič stvarno besplatan?', a: 'Da. Ne plaćate ništa i ne preuzimate nikakvu obvezu. Tražimo samo e-mail adresu na koju vam šaljemo poveznicu za preuzimanje.' },
  { q: 'Za koga je vodič?', a: 'Za udovice i udovce, roditelje djece koja su izgubila roditelja i svakoga tko obitelji pomaže oko zahtjeva HZMO-u.' },
  { q: 'Što radite s mojim e-mailom?', a: 'Pošaljemo vam vodič i povremeno praktične savjete o koracima nakon smrti bliske osobe. Adresu ne dijelimo s trećima, a odjaviti se možete u svakom trenutku.' },
  { q: 'Je li ovo pravni savjet?', a: 'Nije. Vodič je informativan. Podatke smo provjerili u listopadu 2026., a iznosi vezani uz aktualnu vrijednost mirovine mijenjaju se 1. siječnja i 1. srpnja, pa ih za svoj slučaj potvrdite u HZMO-u.' },
];

export default function VodicObiteljskaMirovina() {
  return (
    <GuideLanding
      guide={GUIDE.id}
      title={TITLE}
      description={DESCRIPTION}
      ogImage="/vodic/obiteljska-mirovina/og.jpg"
      eyebrow="Besplatni vodič za udovice, udovce i djecu"
      lead={<>
        Obiteljska mirovina ne dolazi sama od sebe. HZMO je priznaje tek na zahtjev, a tko ga preda kasnije od šest mjeseci nakon smrti,
        može izgubiti dio novca. U vodiču smo jednostavnim jezikom objasnili tko ima pravo, koliko iznosi i kako zahtjev predati na vrijeme.
      </>}
      body={<>
        Posebno poglavlje je za umirovljenike od 65 godina: kada se više isplati zadržati vlastitu mirovinu i uz nju primati 27 % obiteljske.
        Podatke smo provjerili u Zakonu o mirovinskom osiguranju i na stranicama HZMO-a. Vodič je <strong>potpuno besplatan</strong>, tražimo samo vaš e-mail.
      </>}
      mobileLine={`Besplatni PDF od ${GUIDE.pagesLabel}, provjeren prema zakonu i HZMO-u.`}
      facts={FACTS}
      chaptersIntro="Uz svaku tvrdnju naveden je članak zakona, pa u HZMO-u točno znate na što se pozvati."
      chapters={CHAPTERS}
      previews={PREVIEWS}
      sourcesIntro="Svaki uvjet, iznos i rok provjerili smo u Narodnim novinama i na stranicama HZMO-a. Popis izvora nalazi se na kraju vodiča."
      sources={SOURCES}
      faq={FAQ}
      related={{ guide: 'kad-izgubite-voljenu-osobu', text: 'Treba vam cijeli popis koraka nakon smrti?' }}
    />
  );
}
