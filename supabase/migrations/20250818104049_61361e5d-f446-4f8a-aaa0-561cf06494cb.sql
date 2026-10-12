-- Update SEO metadata for Sprovodi pages to use "sprovoda" instead of "sahrana"
UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Zagrebu. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/zagreb';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Splitu. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/split';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Rijeci. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/rijeka';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Osijeku. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/osijek';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Zadru. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/zadar';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Puli. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/pula';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Dubrovniku. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/dubrovnik';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Karlovcu. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/karlovac';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Varaždinu. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/varazdin';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Sisku. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/sisak';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Slavonskom Brodu. Informacije o vremenu, mjestu i grobljima za oprošaj.'
WHERE page_path = '/sprovodi/slavonski-brod';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Koprivnici. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/koprivnica';

UPDATE public.on_page_seo 
SET meta_description = 'Aktualni raspored sprovoda i ispraćaja u Čakovcu. Informacije o vremenu, mjestu i grobljima za dostojanstven oprošaj.'
WHERE page_path = '/sprovodi/cakovec';

-- Also update the meta titles to use "sprovoda" instead of "sahrana"
UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Zagreb | Raspored sprovoda i ispraćaja u Zagrebu'
WHERE page_path = '/sprovodi/zagreb';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Split | Raspored sprovoda i ispraćaja u Splitu'
WHERE page_path = '/sprovodi/split';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Rijeka | Raspored sprovoda i ispraćaja u Rijeci'
WHERE page_path = '/sprovodi/rijeka';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Osijek | Raspored sprovoda i ispraćaja u Osijeku'
WHERE page_path = '/sprovodi/osijek';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Zadar | Raspored sprovoda i ispraćaja u Zadru'
WHERE page_path = '/sprovodi/zadar';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Pula | Raspored sprovoda i ispraćaja u Puli'
WHERE page_path = '/sprovodi/pula';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Dubrovnik | Raspored sprovoda i ispraćaja u Dubrovniku'
WHERE page_path = '/sprovodi/dubrovnik';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Karlovac | Raspored sprovoda i ispraćaja u Karlovcu'
WHERE page_path = '/sprovodi/karlovac';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Varaždin | Raspored sprovoda i ispraćaja u Varaždinu'
WHERE page_path = '/sprovodi/varazdin';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Sisak | Raspored sprovoda i ispraćaja u Sisku'
WHERE page_path = '/sprovodi/sisak';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Slavonski Brod | Raspored sprovoda i ispraćaja'
WHERE page_path = '/sprovodi/slavonski-brod';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Koprivnica | Raspored sprovoda i ispraćaja u Koprivnici'
WHERE page_path = '/sprovodi/koprivnica';

UPDATE public.on_page_seo 
SET meta_title = 'Sprovodi Čakovec | Raspored sprovoda i ispraćaja u Čakovcu'
WHERE page_path = '/sprovodi/cakovec';