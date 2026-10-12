# Statistika i prodaja — administratorski izvještaj

Nova zaštićena stranica `/admin/statistika` koja prikazuje stvarne podatke o memorijalima, kupnjama, naplati i odustajanju, bez diranja postojeće kupnje i objave.

## Što će korisnik dobiti
- Stavka „Statistika i prodaja” u administratorskom izborniku (samo admini; provjera i na serveru).
- Filtri: danas, jučer, 7/30 dana, ovaj/prošli mjesec, proizvoljno; status naplate; javno/privatno; promo kod; izvor posjeta; stvarne (zadano) ili testne transakcije. Usporedba s prethodnim razdobljem. Datumi po Europe/Zagreb, iznosi u eurima.
- Kartice pokazatelja (jedinstveni kupci, plaćene narudžbe, plaćeni/besplatni memorijali, checkout sesije: započete/aktivne/istekle/neuspjele, pokušali bez kupnje, naplaćeno, vraćeno, neto, prosjek, konverzija) — svaka s kratkim objašnjenjem izračuna.
- Prodajni lijevak (posjet → početak izrade → prijava → nacrt → plaćanje → uplata/besplatno → objava), s oznakom „prati se od DATUMA” za korake koji se dosad nisu bilježili.
- Tablica narudžbi i pokušaja s pretragom (e-mail, memorijal, Stripe ID), detaljima i kronologijom događaja; poveznice na Stripe.
- Statistika memorijala i korisnika (statusi, javno/privatno, plaćeno a neobjavljeno, višestruki kupci, prosjek i medijan vremena do kupnje i do objave).
- Grafikoni prihoda po danu/tjednu/mjesecu; tablica promo kodova; izvori (UTM, medij, uređaj) — „Nepoznato” kad nema podataka.
- Odjeljak „Potrebna provjera” (uplata bez plaćenog memorijala, plaćeno a neobjavljeno, dvostruka uplata, duga obrada, greške webhooka, nesklad povrata).
- CSV izvoz (UTF-8 s BOM, točka-zarez, za Excel) i vrijeme zadnjeg osvježavanja.

## Tehnički dio
1. **Baza (migracija)**
   - `memorial_orders` (user, memorial, promo, iznosi, status, livemode, first/checkout UTM, uređaj).
   - `payment_events` (orderId, Stripe event id UNIQUE → idempotentnost, tip, status, razlog neuspjeha, iznos, vrijeme događaja Stripea).
   - `stripe_webhook_log` (event id, tip, uspjeh/greška obrade).
   - `funnel_events` (anon/session id, user, korak, izvor, uređaj, vrijeme) — insert dozvoljen svima uz validaciju, čitanje samo adminima.
   - RLS: čitanje svega samo `has_role(auth.uid(),'admin')`; pisanje narudžbi/događaja samo service role.
   - SQL funkcije za agregate (zbog limita 1000 redaka): `admin_sales_summary`, `admin_sales_funnel`, `admin_sales_timeseries`, `admin_promo_stats`, `admin_sales_alerts` — svaka provjerava admin ulogu.
2. **Stripe**
   - `create-memorial-payment` i besplatni put: kreiraju/ažuriraju `memorial_orders` uz UTM/uređaj iz klijenta.
   - `stripe-webhook`: dodati `checkout.session.expired`, `payment_intent.payment_failed`, `payment_intent.processing`, `payment_intent.requires_action`, `charge.refunded` (djelomično/potpuno), `charge.dispute.created`; idempotentno po event id, tolerira krivi redoslijed (status se određuje iz najjačeg poznatog stanja, ne iz zadnjeg stiglog). Stripe naknade iz balance transaction ako su dostupne.
   - Razlozi neuspjeha (`decline_code`/`code`) prevedeni na hrvatski; inače „Razlog nije dostupan”.
   - Jednokratna backfill funkcija: postojeći plaćeni memorijali, računi i promo korištenja → narudžbe; Stripe sesije dohvatiti gdje postoji `stripe_session_id`.
3. **Praćenje lijevka** — mali klijentski helper koji šalje korake samo uz analitičku privolu (postojeći sustav privola); bez privole se bilježi samo anonimni brojač koraka bez izvora, i izvještaj to označava.
4. **Frontend** — `src/pages/AdminStatistika.tsx` + komponente (kartice, lijevak, tablica s ladicom detalja, grafikoni Recharts, upozorenja, CSV), ruta i stavka izbornika.
5. **Provjera** — Deno testovi za webhook scenarije (uspjeh, neuspjeh pa uspjeh, istek, async, besplatno, djelomični/potpuni povrat, dupla dostava, više kupnji iste osobe) i Playwright test zabrane pristupa neadminu.

## Ograničenja koja će biti jasno navedena
- Posjeti, izvori i koraci lijevka postoje tek od ove nadogradnje; povijest se ne izmišlja.
- Neuspjeli pokušaji i istekle sesije iz prošlosti dostupni su samo koliko ih Stripe još vraća.
- Novi webhook događaji moraju se uključiti u Stripe nadzornoj ploči (dat ću točan popis).
- Trošak oglasa/ROAS samo uz ručni unos — nije u ovom opsegu osim polja za unos ako želite.
