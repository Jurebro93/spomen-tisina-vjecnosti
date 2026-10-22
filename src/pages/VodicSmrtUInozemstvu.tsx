// Landing page for the free guide "Smrt u inozemstvu".
import { FileText, Globe, ListChecks, Plane } from 'lucide-react';
import GuideLanding from '@/components/GuideLanding';
import { EBOOKS } from '@/lib/ebook';

const GUIDE = EBOOKS['smrt-u-inozemstvu'];
const TITLE = 'Besplatni vodič: Smrt u inozemstvu | Osmrtnica.com.hr';
const DESCRIPTION = 'Što napraviti kad bližnji umre u Njemačkoj, Austriji, Švicarskoj ili Irskoj: prijava smrti, sprovodnica, prijevoz tijela ili urne, mirovine i ostavina. Besplatni PDF.';

const FACTS = [
  { icon: FileText, label: `${GUIDE.pagesLabel}, PDF` },
  { icon: Globe, label: 'Njemačka, Austrija, Švicarska i Irska' },
  { icon: Plane, label: 'Prijevoz tijela i urne u Hrvatsku' },
  { icon: ListChecks, label: 'Kontrolni popis dokumenata za ispis' },
];

const CHAPTERS = [
  { n: 1, title: 'Prva tri sata', text: 'Koga nazvati odmah, zašto prvo osiguranje pa tek pogrebnik i što ne potpisivati prije pisane ponude.' },
  { n: 2, title: 'Prijava smrti vani', text: 'Rokovi i posebnosti za Njemačku, Austriju, Švicarsku i Irsku, i zašto tražiti višejezični izvadak.' },
  { n: 3, title: 'Pokop vani, tijelo ili urna', text: 'Usporedba triju mogućnosti: papiri, trošak, trajanje i što kaže vjera.' },
  { n: 4, title: 'Prijevoz tijela u Hrvatsku', text: 'Kako izabrati pogrebnika, sprovodnica u konzulatu, dokumenti i redoslijed koraka.' },
  { n: 5, title: 'Kremacija i urna', text: 'Potvrda o kremaciji, njemačka obveza pokopa, urna u zrakoplovu i polaganje u obiteljski grob.' },
  { n: 6, title: 'Troškovi', text: 'Što se plaća, tko može platiti, zašto europska kartica zdravstvenog osiguranja ne pomaže i tablica za usporedbu ponuda.' },
  { n: 7, title: 'Papiri i mirovine', text: 'Upis u hrvatsku maticu umrlih, jedan zahtjev za obiteljsku mirovinu iz više država, njemačka i austrijska pravila.' },
  { n: 8, title: 'Ostavina i obrnuti smjer', text: 'Koja država vodi ostavinu, europska potvrda o nasljeđivanju i što kad roditelj umre u Hrvatskoj, a vi živite vani.' },
];

const PREVIEWS = [
  { src: '/vodic/smrt-u-inozemstvu/drzave.jpg', alt: 'Stranica vodiča: rokovi za prijavu smrti po državama' },
  { src: '/vodic/smrt-u-inozemstvu/odluka.jpg', alt: 'Stranica vodiča: pokop vani, prijevoz tijela ili urna' },
  { src: '/vodic/smrt-u-inozemstvu/sprovodnica.jpg', alt: 'Stranica vodiča: sprovodnica i dokumenti' },
  { src: '/vodic/smrt-u-inozemstvu/kontrolni-popis.jpg', alt: 'Stranica vodiča: kontrolni popis dokumenata' },
];

const SOURCES: [string, string][] = [
  ['Prijevoz umrlih osoba', 'Pravilnik, NN 116/2018'],
  ['Sprovodnica i urna', 'gov.hr; Ministarstvo vanjskih i europskih poslova'],
  ['Upis u maticu umrlih', 'Ministarstvo pravosuđa i uprave'],
  ['Mirovine iz više država', 'HZMO; Deutsche Rentenversicherung; oesterreich.gv.at'],
  ['Prijava smrti vani', 'Službene stranice Njemačke, Austrije i švicarskih kantona'],
  ['Ostavina', 'Uredba (EU) 650/2012'],
];

const FAQ = [
  { q: 'Je li vodič stvarno besplatan?', a: 'Da. Ne plaćate ništa i ne preuzimate nikakvu obvezu. Tražimo samo e-mail adresu na koju vam šaljemo poveznicu za preuzimanje.' },
  { q: 'Za koga je vodič?', a: 'Za obitelji čiji je član umro u inozemstvu i za iseljene Hrvate kojima je roditelj umro u Hrvatskoj. Najviše koraka vrijedi za cijelu Europsku uniju.' },
  { q: 'Piše li koliko košta prijevoz?', a: 'Ne navodimo cijene jer se jako razlikuju po državi i pogrebniku. Umjesto toga objašnjavamo od čega se račun sastoji i dajemo tablicu za usporedbu ponuda.' },
  { q: 'Što radite s mojim e-mailom?', a: 'Pošaljemo vam vodič i povremeno praktične savjete o koracima nakon smrti bliske osobe. Adresu ne dijelimo s trećima, a odjaviti se možete u svakom trenutku.' },
  { q: 'Je li ovo pravni savjet?', a: 'Nije. Vodič je informativan. Pravila stranih država razlikuju se po saveznim zemljama i kantonima, pa ih za svoj slučaj potvrdite u konzulatu ili kod pogrebnika.' },
];

export default function VodicSmrtUInozemstvu() {
  return (
    <GuideLanding
      guide={GUIDE.id}
      title={TITLE}
      description={DESCRIPTION}
      ogImage="/vodic/smrt-u-inozemstvu/og.jpg"
      eyebrow="Besplatni vodič za iseljene obitelji"
      lead={<>
        Kad netko umre daleko od kuće, uz tugu dolaze strani jezik, strani uredi i pitanja na koja nitko ne zna odgovor:
        tko prijavljuje smrt, kako dovesti tijelo ili urnu kući i što poslije riješiti u Hrvatskoj.
      </>}
      body={<>
        U vodiču su koraci složeni redom kojim će vam trebati, s posebnim pravilima za Njemačku, Austriju, Švicarsku i Irsku.
        Obuhvaća i obrnuti smjer, kad roditelj umre u Hrvatskoj, a vi živite vani. Vodič je <strong>potpuno besplatan</strong>, tražimo samo vaš e-mail.
      </>}
      mobileLine={`Besplatni PDF od ${GUIDE.pagesLabel}: prijava smrti, prijevoz kući, mirovine i ostavina.`}
      facts={FACTS}
      chaptersIntro="Od prvog poziva do upisa u hrvatsku maticu umrlih, s kontrolnim popisom i tablicom za vaše kontakte."
      chapters={CHAPTERS}
      previews={PREVIEWS}
      sourcesIntro="Hrvatske propise i stranice HZMO-a provjerili smo u izvornom tekstu, a pravila stranih država saželi sa službenih stranica tih država. Popis izvora nalazi se na kraju vodiča."
      sources={SOURCES}
      faq={FAQ}
      related={{ guide: 'kad-izgubite-voljenu-osobu', text: 'Treba vam cijeli popis koraka nakon smrti?' }}
    />
  );
}
