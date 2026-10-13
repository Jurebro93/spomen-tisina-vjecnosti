-- Remove meta fields from newsletter_users table as they're not needed
ALTER TABLE public.newsletter_users 
DROP COLUMN IF EXISTS meta_title,
DROP COLUMN IF EXISTS meta_description;