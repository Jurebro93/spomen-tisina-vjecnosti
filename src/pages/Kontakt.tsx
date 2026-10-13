import LegalLayout, { H2, L } from '@/components/legal/LegalLayout';
import { LEGAL_VERSIONS } from '@/lib/legal';
import { fullAddress, useBusiness } from '@/lib/business';

const Kontakt = () => {
  const b = useBusiness();
  return (
    <LegalLayout title="Kontakt i podaci o obrtu" path="/kontakt" version={LEGAL_VERSIONS.kontakt}>
      <p>Internetskom stranicom osmrtnica.com.hr upravlja {b.legal_name}, sa sjedištem na adresi {fullAddress(b)}.</p>
      <dl className="grid sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-2 rounded-lg border border-border p-5">
        <dt className="text-muted-foreground">OIB</dt><dd>{b.oib}</dd>
        {b.mbo && <><dt className="text-muted-foreground">Matični broj</dt><dd>{b.mbo}</dd></>}
        {b.founded_year && <><dt className="text-muted-foreground">Godina osnivanja</dt><dd>{b.founded_year}.</dd></>}
        {b.register_info && <><dt className="text-muted-foreground">Registar</dt><dd>{b.register_info}</dd></>}
        <dt className="text-muted-foreground">E-mail</dt><dd><a className="text-primary underline" href={`mailto:${b.email}`}>{b.email}</a></dd>
        {b.phone && <><dt className="text-muted-foreground">Telefon</dt><dd><a className="text-primary underline" href={`tel:${b.phone.replace(/\s/g, '')}`}>{b.phone}</a></dd></>}
        <dt className="text-muted-foreground">Web</dt><dd>{b.website}</dd>
      </dl>
      <p>{b.tax_note}</p>
      <H2>Kako nam se obratiti</H2>
      <p>Za pomoć pri izradi osmrtnice ili memorijala, pitanja o plaćanju, pisane prigovore i zahtjeve povezane s privatnošću možete nam se obratiti e-mailom.</p>
      <p>Kod upita o kupnji navedite broj narudžbe ili e-mail korišten pri kupnji. Nemojte nam slati broj kartice, sigurnosni kod kartice ni lozinku korisničkog računa.</p>
      <p>Za podnošenje pisanog prigovora pogledajte stranicu <L to="/prigovori">Prigovori i reklamacije</L>. Informacije o odustajanju od kupnje nalaze se na stranici <L to="/raskid-i-povrat">Jednostrani raskid i povrat</L>. Sadržaj koji smatrate spornim možete prijaviti putem stranice <L to="/prijava-sadrzaja">Prijava sadržaja</L>.</p>
    </LegalLayout>
  );
};
export default Kontakt;
