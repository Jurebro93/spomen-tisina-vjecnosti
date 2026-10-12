# Homepage 3 — digitalni memorijal u prvom planu

## Cilj
Izraditi novu, izoliranu varijantu naslovnice na `/homepage-3/` na kojoj je digitalni memorijal prva poruka i glavna akcija. Postojeća `/` i `/homepage-2/` ostaju nepromijenjene, kao i korisnički računi, Google prijava, Stripe naplata, računi i ostale stranice.

## Što će biti izgrađeno
- Posebno zaglavlje za ovu varijantu s glavnim poveznicama: Digitalni memorijal, Kako funkcionira, Osmrtnice, Blog, Prijava i istaknuti gumb „Izradi memorijal”.
- Sekundarni izbornik za sprovode, groblja, virtualne svijeće, memorijalni vrt i ostale postojeće sadržaje.
- Prvi ekran posvećen digitalnom memorijalu: zadani naslov i tekst, stvarna cijena iz postojećeg izvora, dva jasna gumba i vjeran obiteljski ogledni memorijal označen kao izmišljen.
- Kompaktna pretraga osmrtnica odmah ispod prvog ekrana, povezana s postojećim rutama, s Enter podrškom i bez slanja upisanih podataka u analitiku.
- Sekcija o uspomenama iz prošlosti s tri tražene namjene memorijala.
- Pregled potvrđenih mogućnosti proizvoda: fotografije i priča, poruke i svijeće, dijeljenje te QR kod. Formulacija „verzija za ispis” koristit će se samo ako je potvrđena u postojećem proizvodu.
- Proces u tri koraka usklađen sa stvarnim tijekom: prijava i unos, pregled, plaćanje i objava.
- Najnovije osmrtnice, svi gradovi kroz proširivi popis stvarnih poveznica i tri postojeća objavljena članka iz baze.
- Sažeta završna sekcija s aktualnom cijenom i poveznicama na izradu i detaljnu stranicu memorijala.
- Kompaktni footer koji čuva pristup virtualnim svijećama, memorijalnom vrtu, poznatim memorijalima, pravnim stranicama i kontaktu.

## Dizajn i ponašanje
- Topla, svijetla podloga i postojeći crno-zlatni identitet, bez velikih grobljanskih fotografija, vrtuljaka i agresivnih animacija.
- Jedan dosljedan zlatni stil glavnih akcija; sekundarne akcije ostaju mirnije.
- Mobilni redoslijed: poruka memorijala, cijena i akcije, prikaz memorijala, pa odmah pretraga osmrtnica.
- Stabilne dimenzije slika, najmanje 16 px za glavni tekst, dovoljno velike kontrole, vidljiv fokus, podrška za tipkovnicu i `prefers-reduced-motion`.
- Obavijest o kolačićima neće prekrivati ključne kontrole na ovoj ruti.

## Podaci, SEO i analitika
- Ponovno koristiti postojeće Supabase upite za stvarne osmrtnice, gradove i članke, uz učitavanje, prazno i pogrešno stanje.
- Cijenu uzeti iz zajedničkog izvora `MEMORIAL_PRICE_LABEL`; ne mijenjati Stripe iznos ni checkout.
- Dodati zadani title, description, jedan H1, self-referencing canonical za `/homepage-3/`, Open Graph podatke i WebPage JSON-LD bez mijenjanja SEO-a drugih ruta.
- Koristiti postojeći GA4 mehanizam uz privolu i razlikovati: header create, hero create, primjer, detaljna stranica memorijala i pretraga. Ne slati ime, grad ni druge osobne podatke; ne slati Purchase.

## Završna provjera
- Provjeriti prikaz na 320, 375, 390, 768 i 1440 px bez horizontalnog pomicanja ili preklapanja.
- Provjeriti mobilni izbornik, anchor „Kako funkcionira”, oba načina pretrage, sve CTA poveznice, ogledni memorijal, stvarne podatke, SEO head i konzolu.
- Provjeriti da postojeće rute izrade i naplate i dalje rade bez izvršavanja stvarne kupnje.
- U završnom izvještaju navesti koje tražene teme članaka nisu dostupne među postojećim objavama.
