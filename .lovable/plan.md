# Pouzdan Purchase na Meta CAPI — najprije samo za admin račun 7130af4e-7633-4381-8503-429850f6d1cc

## Trenutno stanje (utvrđeno iz koda)
- `stripe-webhook` šalje Purchase **samo unutar** uvjeta „memorijal još nije plaćen". Ako `verify-memorial-payment` (stranica zahvale) stigne prvi i označi memorijal plaćenim, webhook Purchase **ne šalje**.
- Slanje na Metu nije zapisano nigdje: nema statusa, nema ponavljanja; greška se samo ispiše u log.
- `meta-capi-purchase` (poziva ga stranica zahvale na osmrtnica.com.hr) šalje isti Purchase s istim `event_id` — za istu kupnju mogu otići dva server zahtjeva (Meta ih spaja, ali to nije kontrolirano).
- Aktivacija memorijala i računi već su idempotentni: `paid` se postavlja samo ako nije, račun ide preko `upsertInvoiceForSession` (po Stripe sesiji), webhook log po Stripe event ID-u.
- Webhook do danas nije zabilježio nijedan događaj — prije testa treba provjeriti adresu i tajnu webhooka u Stripeu.

## Odgovori na pitanja
1. **Webhook i provjera plaćanja**: Da — nova logika bit će izvan uvjeta „nije plaćen", pa se Purchase šalje bez obzira tko je prvi označio plaćanje. Bit će potpuno odvojena (zaseban korak nakon aktivacije i računa, vlastiti try/catch; njezina greška nikad ne utječe na aktivaciju, račun ni odgovor Stripeu). Duplikati narudžbi/računa/aktivacija već su spriječeni postojećim provjerama; to ne mijenjamo.
2. **Deduplikacija**: nova tablica s jedinstvenim ključem na Stripe sesiji → točno jedan zapis po sesiji. `event_id = purchase_<session_id>`, nikad se ne mijenja. Istodobna izvođenja: zapis se „preuzima" atomarnim UPDATE-om (`pending/failed → processing` uz uvjet); tko ne uspije preuzeti, ne šalje. `sent` se nikad ponovno ne šalje.
3. **Neuspjesi**: neuspjeh = mrežna greška ili HTTP ≠ 200 ili nema `events_received`. Zapisuje se status `failed`, broj pokušaja, zadnja greška, Metin odgovor i `next_attempt_at`. Ponavljanje najviše 5 puta: 1 min, 5 min, 30 min, 2 h, 12 h (unutar Metinog roka od 7 dana; `event_time` ostaje stvarno vrijeme plaćanja). Prekinuti `processing` stariji od 10 min vraća se u `failed`. Ponavljanja pokreće zakazani posao svakih 5 minuta. `skipped_no_consent` se nikad ne ponavlja.
4. **Postojeće praćenje**: Pixel Purchase u pregledniku ostaje isti (`purchase_<session_id>`, isti kao server). Za admin račun `meta-capi-purchase` ne šalje ništa (vraća „preuzima webhook"), a stari blok u webhooku se preskače — šalje samo nova logika. Za sve ostale korisnike sve ostaje točno kao sada.
5. **Pristanak**: zadržava se `marketing_consent` iz metapodataka Stripe sesije. Plaćanje, narudžba i račun bilježe se uvijek; bez pristanka zapis dobiva `skipped_no_consent` i ništa ne ide Meti.
6. **Uključivanje za sve**: jedna provjera „je li korisnik na popisu" (`session.metadata.user_id`) na jednom mjestu; kasnije se samo ukloni uvjet i ugasi stari blok — bez gradnje novog sustava.

## Izmjene
**Baza (jedna migracija)**
- Tablica `meta_capi_deliveries`: `stripe_session_id` (jedinstveno), `event_id`, `order_id`, `memorial_id`, `user_id`, `status` (pending/processing/sent/failed/skipped_no_consent), `attempts`, `next_attempt_at`, `locked_at`, `last_error`, `meta_status`, `meta_body`, `event_time`, `value`, `currency`, `sent_at`, vremena. Pristup samo poslužitelj (service_role) i čitanje za admina.
- Zakazani posao (pg_cron) svakih 5 min poziva funkciju za ponavljanja.

**Kod**
- `supabase/functions/_shared/metaCapi.ts`: nova funkcija `deliverPurchase(sessionId)` — upis/preuzimanje zapisa, slanje (hashirani em/fn/ln/ph kupca iz Stripea, IP/agent ako su spremljeni, nikad podaci pokojnika), zapis rezultata.
- `supabase/functions/stripe-webhook/index.ts`: za admin korisnika poziva `deliverPurchase` nakon aktivacije i računa, neovisno o „već plaćeno"; stari blok se za njega preskače.
- `supabase/functions/meta-capi-purchase/index.ts`: za admin korisnika ne šalje.
- Nova `supabase/functions/meta-capi-retry/index.ts` (zaštićena tajnim ključem) za ponavljanja i oporavak prekinutih.
- Test: pravila statusa i rasporeda ponavljanja (`_shared/metaCapi_test.ts`).
- Bez izmjena izgleda, toka plaćanja, `verify-memorial-payment` i preglednog Pixela.

## Provjera
1. Jedna prava kupnja admin računom → 1 plaćena narudžba, 1 račun, 1 zapis `sent` s `events_received: 1`.
2. Osvježavanje stranice zahvale → broj zapisa i pokušaja nepromijenjen.
3. „Resend" istog događaja iz Stripea → zapis ostaje `sent`, nema novog slanja.
4. Namjerno pogrešan token na probnom zapisu → `failed`, zatim uspješno ponavljanje s istim `event_id`.
5. Kupnja drugog korisnika → stari tok, nema zapisa u novoj tablici.
6. Events Manager: jedan Purchase (preglednik + server spojeni).

## Preduvjet
Provjeriti u Stripeu adresu webhooka i tajnu (webhook dosad nije primio nijedan događaj).
