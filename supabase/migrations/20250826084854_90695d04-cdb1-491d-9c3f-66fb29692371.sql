-- Fix search path for functions to address security warnings
ALTER FUNCTION generate_obituary_slug(text, text, uuid) SET search_path = 'public';
ALTER FUNCTION trigger_generate_obituary_slug() SET search_path = 'public';