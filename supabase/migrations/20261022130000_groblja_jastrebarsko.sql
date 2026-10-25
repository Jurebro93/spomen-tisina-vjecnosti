-- Cemeteries of Jastrebarsko, from groblja-jastrebarsko.hr (Česta pitanja,
-- Kontakti, news on the town cemetery). /umrli/jastrebarsko had no cemeteries
-- and only two obituaries; the funeral schedule comes from sync-gradovi-sprovodi
-- (izvor groblja-jastrebarsko). Only the town cemetery gets a description (and
-- a /groblje page); the twelve local cemeteries are listed with the contacts.
insert into public.groblja_i_opisi ("Grad", "Naziv groblja", "Adresa", "Kontakt broj", "E-mail", "Radno vrijeme", "Opis")
select v.grad, v.naziv, v.adresa, v.kontakt, v.email, v.radno, v.opis
from (values
  ('Jastrebarsko', 'Gradsko groblje Jastrebarsko', null,
   '01 6271 614 (uprava); 091 6283 159 i 091 6283 158 (koordinator ukopa)', 'info@groblja-jastrebarsko.hr',
   'Uprava: ponedjeljak–petak 07:00–15:00; pogrebna služba: svaki dan 08:00–22:00',
   'Gradsko groblje Jastrebarsko glavno je groblje Grada Jastrebarskog. Na području grada ima ukupno 13 groblja: gradsko groblje u Jastrebarskom i dvanaest mjesnih groblja (Cvetković, Domagović, Dragovanšćak, Gorica Svetojanska, Gornja Kupčina, Gornji Desinec, Pavlovčani, Petrovina, Plešivica, Slavetić, Stankovo i Volavje). Vlasnik groblja je Grad Jastrebarsko, a njima upravlja tvrtka Groblja Jastrebarsko d.o.o., koja od 2011. održava groblja i mrtvačnice te pruža pogrebne usluge.
Ukop se ugovara u Upravi groblja u Ulici Antuna Mihanovića 14, radnim danom od 7 do 15 sati. Potrebni su osobni dokumenti, dokumenti preminule osobe i podaci o grobnom mjestu. Pogrebna služba za prihvat u mjesne mrtvačnice i ugovaranje termina ukopa radi svaki dan od 8 do 22 sata. Raspored ukopa objavljuje se samo za pokojnike čije su obitelji na to pristale.
Na gradskom groblju 2021. i 2022. uređena je krajobrazna arhitektura: izgrađene su nove staze i posađeno je više od 1650 stabala, grmova i živica, među njima i japanske trešnje. U rujnu 2024. zamijenjeno je krovište mrtvačnice; radove vrijedne više od 52 tisuće eura financirao je Grad Jastrebarsko.'),
  ('Jastrebarsko', 'Groblje Cvetković', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Domagović', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Dragovanšćak', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Gorica Svetojanska', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Gornja Kupčina', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Desinec Gornji', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Pavlovčani', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Petrovina', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Plešivica', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Slavetić', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Stankovo', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null),
  ('Jastrebarsko', 'Groblje Volavje', null, '01 6271 614', 'info@groblja-jastrebarsko.hr', null, null)
) as v(grad, naziv, adresa, kontakt, email, radno, opis)
where not exists (
  select 1 from public.groblja_i_opisi g where g."Grad" = v.grad and g."Naziv groblja" = v.naziv
);
