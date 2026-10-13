-- Create a function to clean up old memorial quotes (older than 365 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_memorial_quotes()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.memorijalni_citati 
  WHERE approved_at < (NOW() - INTERVAL '365 days')
  AND status = 'approved';
END;
$$;

-- Create a trigger to automatically clean up old quotes when fetching data
CREATE OR REPLACE FUNCTION public.trigger_cleanup_memorial_quotes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Clean up old quotes before any select operation
  PERFORM public.cleanup_old_memorial_quotes();
  RETURN NULL;
END;
$$;

-- Note: We'll handle the cleanup in the application layer for better control