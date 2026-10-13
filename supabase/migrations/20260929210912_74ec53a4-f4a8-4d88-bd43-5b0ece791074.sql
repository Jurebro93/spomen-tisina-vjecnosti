DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'obituaries'
      AND c.relnamespace = 'public'::regnamespace
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.obituaries;
  END IF;
END $$;