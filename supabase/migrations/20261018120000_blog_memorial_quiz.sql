-- Phase 2 blog CTAs: three high-traffic blogs get the in-article memorial quiz (interactive_type 'quiz').
-- interactive_items[1] is the quiz heading shown after the 3rd paragraph.
UPDATE public.blogs SET
  interactive_type = 'quiz',
  interactive_items = ARRAY['Molite za pokojnika? Sačuvajte i njegovu životnu priču'],
  sales_heading = 'Molitva traje, a uspomene možete sačuvati',
  sales_text = 'Deseticu krunice molimo kako bismo pokojnika preporučili Bogu. Uz molitvu, njegov život možete sačuvati u digitalnom memorijalu: fotografije, životnu priču i datume koje obitelj želi pamtiti. Rodbina i prijatelji mogu zapaliti virtualnu svijeću i ostaviti poruku, gdje god bili.',
  cta_text = 'Kreiraj memorijal'
WHERE slug = 'kako-pravilno-moliti-deseticu-krunice-za-duhovnu-povezanost';

UPDATE public.blogs SET
  interactive_type = 'quiz',
  interactive_items = ARRAY['Što ne stane u osmrtnicu?'],
  sales_heading = 'Od osmrtnice do životne priče',
  sales_text = 'Osmrtnica u nekoliko redaka javlja tužnu vijest. U digitalni memorijal stane sve ostalo: cijela životna priča, fotografije iz obiteljskih albuma i poruke onih koji su pokojnika voljeli. QR kod memorijala možete otisnuti uz osmrtnicu ili poveznicu poslati rodbini.',
  cta_text = 'Kreiraj memorijal'
WHERE slug = 'kako-napisati-osmrtnicu';

UPDATE public.blogs SET
  interactive_type = 'quiz',
  interactive_items = ARRAY['Gdje ćete se sjećati ako nema klasičnog groba?'],
  sales_heading = 'Mjesto sjećanja i nakon kremiranja',
  sales_text = 'Kad se pepeo rasipa ili urna počiva daleko od mjesta gdje obitelj živi, bližnjima često nedostaje mjesto na koje se mogu vratiti. Digitalni memorijal je takvo mjesto na mreži: fotografije, životna priča, svijeće i poruke bližnjih, dostupni svima koje pozovete, na godišnjice i bilo koji drugi dan.',
  cta_text = 'Kreiraj memorijal'
WHERE slug = 'kremiranje-sto-je-to-i-kako-se-obavlja';
