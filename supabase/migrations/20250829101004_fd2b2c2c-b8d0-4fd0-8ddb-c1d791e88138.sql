-- Remove osmrtnice-wp/ from blog URLs
BEGIN;

-- Update image URLs to remove osmrtnice-wp/ path
UPDATE public.blogs 
SET image_url = REPLACE(image_url, '/osmrtnice-wp/', '/')
WHERE image_url LIKE '%/osmrtnice-wp/%';

-- Also clean up any remaining localhost references and osmrtnice-wp in content
UPDATE public.blogs 
SET 
  content = REPLACE(REPLACE(content, 'http://localhost/osmrtnice-wp/', 'https://osmrtnica.com.hr/'), '/osmrtnice-wp/', '/'),
  excerpt = REPLACE(REPLACE(excerpt, 'http://localhost/osmrtnice-wp/', 'https://osmrtnica.com.hr/'), '/osmrtnice-wp/', '/')
WHERE 
  content LIKE '%osmrtnice-wp%' OR 
  excerpt LIKE '%osmrtnice-wp%';

COMMIT;