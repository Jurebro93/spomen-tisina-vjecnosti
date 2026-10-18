-- Infographics (public/images/blog/infografike) inserted into three blog articles, right after the given anchor.
-- Guarded so re-running does not insert twice.
UPDATE public.blogs SET content = replace(content, '<h2>Kako moliti deseticu krunice – redoslijed</h2>', '<h2>Kako moliti deseticu krunice – redoslijed</h2>
<figure><img src="/images/blog/infografike/krunica-koraci.webp" alt="Infografika: šest koraka moljenja desetice krunice, od križnog znaka do Fatimske molitve" width="1100" height="2508" loading="lazy" /><figcaption>Cijela desetica u jednoj slici. Spremite je na mobitel za molitvu na groblju.</figcaption></figure>
')
WHERE slug = 'kako-pravilno-moliti-deseticu-krunice-za-duhovnu-povezanost' AND content NOT LIKE '%infografike/krunica-koraci.webp%';

UPDATE public.blogs SET content = replace(content, 'Svaka skupina moli se određenim danima u tjednu.</p>', 'Svaka skupina moli se određenim danima u tjednu.</p>
<figure><img src="/images/blog/infografike/krunica-otajstva.webp" alt="Infografika: raspored radosnih, žalosnih, slavnih i svjetla otajstava po danima u tjednu" width="1100" height="2003" loading="lazy" /><figcaption>Radosna, žalosna, slavna i svjetla otajstva po danima u tjednu.</figcaption></figure>
')
WHERE slug = 'kako-pravilno-moliti-deseticu-krunice-za-duhovnu-povezanost' AND content NOT LIKE '%infografike/krunica-otajstva.webp%';

UPDATE public.blogs SET content = replace(content, '<h2>Nužni podatci na osmrtnici</h2>', '<h2>Nužni podatci na osmrtnici</h2>
<figure><img src="/images/blog/infografike/osmrtnica-anatomija.webp" alt="Infografika: dijelovi osmrtnice redom, s oznakom koji su podatci nužni, a koji neobavezni" width="1100" height="2808" loading="lazy" /><figcaption>Anatomija osmrtnice: nužni dijelovi označeni su zlatnom bojom.</figcaption></figure>
')
WHERE slug = 'kako-napisati-osmrtnicu' AND content NOT LIKE '%infografike/osmrtnica-anatomija.webp%';

UPDATE public.blogs SET content = replace(content, '<h2>Osmrtnica ili digitalni memorijal?</h2>', '<h2>Osmrtnica ili digitalni memorijal?</h2>
<figure><a href="/digitalni-memorijal" data-cta="infografika_osmrtnica_memorijal"><img src="/images/blog/infografike/osmrtnica-memorijal.webp" alt="Infografika: usporedba osmrtnice i digitalnog memorijala" width="1100" height="2045" loading="lazy" /></a><figcaption>Osmrtnica javlja vijest, a digitalni memorijal čuva sjećanje.</figcaption></figure>
')
WHERE slug = 'kako-napisati-osmrtnicu' AND content NOT LIKE '%infografike/osmrtnica-memorijal.webp%';

UPDATE public.blogs SET content = replace(content, '<h2>Kako se obavlja kremiranje?</h2>', '<h2>Kako se obavlja kremiranje?</h2>
<figure><img src="/images/blog/infografike/kremiranje-tijek.webp" alt="Infografika: tijek kremiranja u pet koraka, od dogovora s pogrebnim poduzećem do polaganja urne" width="1100" height="2690" loading="lazy" /><figcaption>Tijek kremiranja u pet koraka.</figcaption></figure>
')
WHERE slug = 'kremiranje-sto-je-to-i-kako-se-obavlja' AND content NOT LIKE '%infografike/kremiranje-tijek.webp%';

UPDATE public.blogs SET content = replace(content, '<h2>Zašto odabrati kremiranje?</h2>', '<h2>Zašto odabrati kremiranje?</h2>
<figure><a href="/digitalni-memorijal" data-cta="infografika_kremiranje_memorijal"><img src="/images/blog/infografike/kremiranje-ukop.webp" alt="Infografika: usporedba kremiranja i klasičnog ukopa po trošku, grobnom mjestu, održavanju i mjestu sjećanja" width="1100" height="2495" loading="lazy" /></a><figcaption>Kremiranje i ukop: glavne razlike na jednom mjestu.</figcaption></figure>
')
WHERE slug = 'kremiranje-sto-je-to-i-kako-se-obavlja' AND content NOT LIKE '%infografike/kremiranje-ukop.webp%';
