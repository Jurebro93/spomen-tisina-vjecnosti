// Landing page for the free guide "Digitalna ostavština".
import { FileText, ListChecks, Smartphone, Users } from 'lucide-react';
import GuideLanding from '@/components/GuideLanding';
import { EBOOKS } from '@/lib/ebook';

const GUIDE = EBOOKS['digitalna-ostavstina'];
const TITLE = 'Besplatni vodič: Digitalna ostavština | Osmrtnica.com.hr';
const DESCRIPTION = 'Kako memorijalizirati ili ugasiti Facebook, Instagram i Google račune preminule osobe, sačuvati fotografije i poruke te otkazati pretplate i mobitel. Besplatni PDF.';

const FACTS = [
  { icon: FileText, label: `${GUIDE.pagesLabel}, PDF` },
  { icon: Users, label: 'Facebook, Instagram, Google i Apple' },
  { icon: Smartphone, label: 'Mobitel, operateri i pretplate' },
  { icon: ListChecks, label: 'Obrazac za vlastitu digitalnu ostavštinu' },
];

const CHAPTERS = [
  { n: 1, title: 'Mobitel je ključ', text: 'Zašto ne otkazati broj i ne resetirati mobitel odmah, i kako napraviti popis svih računa i usluga.' },
  { n: 2, title: 'Sačuvajte uspomene prvo', text: 'Fotografije, WhatsApp i Viber razgovori i glasovne poruke, prije nego što išta zatražite obrisati.' },
  { n: 3, title: 'Facebook i Instagram', text: 'Memorijalni profil ili uklanjanje, kontakt za nasljeđe i koji dokaz smrti treba.' },
  { n: 4, title: 'Google i Apple', text: 'Upravitelj neaktivnog računa, Appleov kontakt za nasljeđe i što obitelj može dobiti bez njih.' },
  { n: 5, title: 'Ostale aplikacije', text: 'Microsoft, WhatsApp, Viber, LinkedIn i digitalni novac poput PayPala i kriptovaluta.' },
  { n: 6, title: 'Operateri i pretplate', text: 'Raskid ugovora s operaterom, tri pitanja za HT, A1 ili Telemach i kako zaustaviti Netflix i ostale naplate.' },
  { n: 7, title: 'Što kaže zakon', text: 'Zašto u Hrvatskoj odlučuju uvjeti usluga i što je njemački sud presudio o Facebook računu.' },
  { n: 8, title: 'Uredite svoju ostavštinu', text: 'Korak po korak za Facebook, Google i Apple, i obrazac koji čuvate uz važne papire.' },
];

const PREVIEWS = [
  { src: '/vodic/digitalna-ostavstina/mobitel.jpg', alt: 'Stranica vodiča: mobitel pokojnika je ključ' },
  { src: '/vodic/digitalna-ostavstina/facebook-instagram.jpg', alt: 'Stranica vodiča: Facebook i Instagram' },
  { src: '/vodic/digitalna-ostavstina/apple.jpg', alt: 'Stranica vodiča: Apple iCloud i iPhone' },
  { src: '/vodic/digitalna-ostavstina/obrazac.jpg', alt: 'Stranica vodiča: obrazac za vlastitu digitalnu ostavštinu' },
];

const SOURCES: [string, string][] = [
  ['Facebook i Instagram', 'Meta, centri za pomoć'],
  ['Gmail, Google Fotografije', 'Google, pomoć za račune'],
  ['iCloud i iPhone', 'Apple podrška'],
  ['WhatsApp', 'WhatsApp, česta pitanja'],
  ['Podaci umrlih osoba', 'Opća uredba o zaštiti podataka, uvodna izjava 27.'],
  ['Raskid ugovora s operaterom', 'HAKOM'],
];

const FAQ = [
  { q: 'Je li vodič stvarno besplatan?', a: 'Da. Ne plaćate ništa i ne preuzimate nikakvu obvezu. Tražimo samo e-mail adresu na koju vam šaljemo poveznicu za preuzimanje.' },
  { q: 'Hoću li dobiti lozinku pokojnika?', a: 'Ne. Nijedna velika usluga ne daje lozinke. Vodič objašnjava što obitelj ipak može dobiti i kojim redom tražiti, da se fotografije i poruke ne izgube.' },
  { q: 'Je li vodič samo za obitelj preminulog?', a: 'Ne. Posljednje poglavlje i obrazac su za svakoga tko želi urediti vlastitu digitalnu ostavštinu, da obitelj jednog dana ne mora pogađati.' },
  { q: 'Što radite s mojim e-mailom?', a: 'Pošaljemo vam vodič i povremeno praktične savjete o koracima nakon smrti bliske osobe. Adresu ne dijelimo s trećima, a odjaviti se možete u svakom trenutku.' },
  { q: 'Je li ovo pravni savjet?', a: 'Nije. Vodič je informativan, a usluge mijenjaju postupke. Prije zahtjeva otvorite aktualni obrazac usluge.' },
];

export default function VodicDigitalnaOstavstina() {
  return (
    <GuideLanding
      guide={GUIDE.id}
      title={TITLE}
      description={DESCRIPTION}
      ogImage="/vodic/digitalna-ostavstina/og.jpg"
      eyebrow="Besplatni vodič za obitelji"
      lead={<>
        Iza svakoga danas ostaju profili, e-mail, tisuće fotografija u oblaku i pretplate koje se same naplaćuju.
        Za to ne postoji šalter, a odgovori su raštrkani po stranicama pomoći na engleskom.
      </>}
      body={<>
        U vodiču za svaku veliku uslugu piše što obitelj može, što joj treba i što se ne može napraviti, te kako prvo sačuvati fotografije i poruke.
        Na kraju je obrazac za vlastitu digitalnu ostavštinu. Vodič je <strong>potpuno besplatan</strong>, tražimo samo vaš e-mail.
      </>}
      mobileLine={`Besplatni PDF od ${GUIDE.pagesLabel}: profili, fotografije, mobitel i pretplate.`}
      facts={FACTS}
      chaptersIntro="Za svaku uslugu ista kartica: što možete, što vam treba, što ne možete i gdje je obrazac."
      chapters={CHAPTERS}
      previews={PREVIEWS}
      sourcesIntro="Postupke smo saželi sa službenih stranica pomoći svake usluge u listopadu 2026. Popis izvora s poveznicama nalazi se na kraju vodiča."
      sources={SOURCES}
      faq={FAQ}
      related={{ guide: 'kad-izgubite-voljenu-osobu', text: 'Treba vam cijeli popis koraka nakon smrti?' }}
    />
  );
}
