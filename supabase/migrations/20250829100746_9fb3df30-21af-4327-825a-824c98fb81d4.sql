-- Fix blog URLs and HTML entities
BEGIN;

-- Update localhost URLs to correct domain
UPDATE public.blogs 
SET image_url = REPLACE(image_url, 'http://localhost', 'https://osmrtnica.com.hr')
WHERE image_url LIKE '%http://localhost%';

-- Fix HTML entities in titles, excerpts, and content
UPDATE public.blogs 
SET 
  title = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    title,
    '&#8220;', '"'),
    '&#8221;', '"'),
    '&#8216;', ''''),
    '&#8217;', ''''),
    '&#8211;', '–'),
    '&#8212;', '—'),
    '&#8230;', '…'),
    '&amp;', '&'),
  excerpt = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    excerpt,
    '&#8220;', '"'),
    '&#8221;', '"'),
    '&#8216;', ''''),
    '&#8217;', ''''),
    '&#8211;', '–'),
    '&#8212;', '—'),
    '&#8230;', '…'),
    '&amp;', '&'),
  content = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    content,
    '&#8220;', '"'),
    '&#8221;', '"'),
    '&#8216;', ''''),
    '&#8217;', ''''),
    '&#8211;', '–'),
    '&#8212;', '—'),
    '&#8230;', '…'),
    '&amp;', '&'),
  meta_title = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    meta_title,
    '&#8220;', '"'),
    '&#8221;', '"'),
    '&#8216;', ''''),
    '&#8217;', ''''),
    '&#8211;', '–'),
    '&#8212;', '—'),
    '&#8230;', '…'),
    '&amp;', '&'),
  meta_description = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    meta_description,
    '&#8220;', '"'),
    '&#8221;', '"'),
    '&#8216;', ''''),
    '&#8217;', ''''),
    '&#8211;', '–'),
    '&#8212;', '—'),
    '&#8230;', '…'),
    '&amp;', '&')
WHERE 
  title LIKE '%&#%' OR 
  excerpt LIKE '%&#%' OR 
  content LIKE '%&#%' OR 
  meta_title LIKE '%&#%' OR 
  meta_description LIKE '%&#%' OR
  image_url LIKE '%http://localhost%';

COMMIT;