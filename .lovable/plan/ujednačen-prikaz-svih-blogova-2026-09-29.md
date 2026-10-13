# Ujednačen prikaz svih blogova

## Cilj
Svi blogovi dobit će ujednačen datum `d/m/gggg`, naslovnu sliku spremljenu u Supabaseu te moderniji prikaz na `/blog/` i pojedinačnim stranicama članaka.

## Što ću promijeniti
- Uvesti jednu zajedničku funkciju za prikaz datuma kao `25/6/2025`, neovisno o tome je li datum u bazi spremljen kao puni datum i vrijeme ili tekst.
- Na svim pojedinačnim blogovima ukloniti stavke „Pregleda” i „Osmrtnica.hr”; zadržati samo datum i vrijeme čitanja.
- Redizajnirati `/blog/` u preglednu mrežu slikovnih kartica: slika omjera 16:9, kategorija, naslov, kratki opis i jasan ulaz u članak.
- Na pojedinačnom članku zadržati veliku naslovnu sliku iznad naslova, uz uredniji i čitljiviji raspored.
- Isti format datuma i slike primijeniti i na povezane članke te ostala mjesta na kojima se prikazuju blogovi.

## Naslovne slike i baza
- Napraviti javni Supabase spremnik samo za blog slike i sigurna pravila za njihov prikaz.
- Postojeće slike preuzeti i prenijeti u Supabase kako blog više ne bi ovisio o vanjskim adresama.
- Za 60 članaka bez slike pronaći tematski prikladne fotografije dopuštene za ponovnu uporabu, vizualno ih prilagoditi u dosljedan, dostojanstven stil i spremiti u Supabase.
- U svakom zapisu bloga postaviti trajnu Supabase adresu slike u postojeće polje `image_url`.
- Ne mijenjati tekst članaka, naslove, URL-ove ni SEO podatke; slike će se automatski koristiti i za Open Graph prikaz.

## Provjera
- Potvrditi da svih 138 blogova ima dostupnu sliku iz Supabasea.
- Provjeriti nekoliko članaka s različitim izvornim formatima datuma.
- Provjeriti `/blog/` i pojedinačni članak na računalu i mobitelu, uključujući povezane članke i neispravne slike.
