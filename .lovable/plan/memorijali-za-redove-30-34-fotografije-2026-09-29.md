# Memorijali za redove 30–34 (fotografije)

## Što sam provjerila

Sljedećih pet osoba iz dokumenta:

| Osoba | Datum smrti | Slobodne fotografije |
| --- | --- | --- |
| Silvije Strahimir Kranjčević | 29. 10. 1908. | 1 (povijesni portret, javno dobro) |
| Mladen Kušec | 2. 11. 2020. | nema |
| Zvonimir Balog | 2. 11. 2014. | nema |
| Krsto Odak | 4. 11. 1965. | nema |
| Nasta Rojc | 6. 11. 1964. | 2 (njezin portret, javno dobro) |

Sve ostalo što se pojavljuje pod njihovim imenima su spomenici, spomen-ploče,
grobovi, poštanske marke, knjige ili njihove vlastite slike drugih ljudi — ne
njihovi portreti.

Dodatno: alat za automatsku provjeru identiteta odbija potvrđivati čije je lice
na slici, pa se identitet može potvrditi samo podacima o izvornoj datoteci
(naslov, autor, licencija) i mojom provjerom.

## Zato predlažem

1. **Kranjčević i Nasta Rojc** — obraditi njihove stvarne portrete po vašim
   pravilima (sačuvano lice, dob i izraz, promijenjena samo pozadina i kadar).
   Jedan izvorni portret daje 1–2 uređene verzije (npr. bliži i širi kadar),
   pa memorijal dobiva 2 fotografije te osobe.
2. **Ostale slike na tim memorijalima** — dopuniti dostojanstvenim
   nefiguralnim slikama (npr. rukopis i pero za Kranjčevića, atelijer i paleta
   za Rojc), bez izmišljanja njihovog lica.
3. **Kušec, Balog, Odak** — memorijali se izrađuju u punom obliku (biografija,
   citat, 6 događaja, 3 sjećanja, svijeće), a slike su nefiguralne i vezane uz
   njihov rad (knjige za pisce, notni zapis za skladatelja). Bez izmišljenih
   portreta.
4. Svi memorijali: vlasnik petra@serprise.agency, sjećanja bez odobrenja,
   svijeće s nasumičnim datumima unazad mjesec dana i gašenjem nakon 7 dana,
   datumi smrti točno prema dokumentu, sve slike u Supabase.

## Alternativa, ako želite prave fotografije

Pošaljite mi fotografije Kušeca, Baloga i Odaka za koje imate dopuštenje —
obradit ću ih istim postupkom i zamijeniti nefiguralne slike.

## Tehnički dio

- Portreti: postojeći postupak (Wikimedia izvor → uređivanje kroz Lovable AI →
  provjera da je izgled sačuvan), spremanje u `obituary-photos/portraits/`
  uz zapis o izvoru i licenciji.
- Nefiguralne slike: generiranje i spremanje u
  `obituary-photos/memorials/<id>/photos/`.
- Zapisi: `obituaries`, `memorials`, `memorial_media`,
  `memorial_life_events`, `memorial_tributes`, `memorial_candles`.
- Gumb „Pogledaj osmrtnicu" ostaje skriven jer za te osobe nema objavljene
  osmrtnice.
