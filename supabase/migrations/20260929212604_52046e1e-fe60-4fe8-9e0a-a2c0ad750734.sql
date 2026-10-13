CREATE TABLE public.famous_portrait_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  status text NOT NULL DEFAULT 'searching',
  found_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  missing_count integer NOT NULL DEFAULT 4,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.famous_portrait_jobs TO authenticated;
GRANT ALL ON public.famous_portrait_jobs TO service_role;

ALTER TABLE public.famous_portrait_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administrators manage portrait jobs"
ON public.famous_portrait_jobs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.famous_portrait_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.famous_portrait_jobs(id) ON DELETE CASCADE,
  memorial_id uuid REFERENCES public.memorials(id) ON DELETE SET NULL,
  source_page_url text NOT NULL,
  source_file_url text NOT NULL,
  source_title text NOT NULL,
  author text,
  license_name text NOT NULL,
  license_url text,
  attribution_text text,
  source_storage_path text,
  edited_storage_path text,
  mime_type text,
  source_width integer,
  source_height integer,
  identity_verified boolean NOT NULL DEFAULT false,
  identity_confidence numeric(5,4),
  identity_reason text,
  status text NOT NULL DEFAULT 'candidate',
  error_message text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, source_file_url)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.famous_portrait_photos TO authenticated;
GRANT ALL ON public.famous_portrait_photos TO service_role;

ALTER TABLE public.famous_portrait_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administrators manage portrait photos"
ON public.famous_portrait_photos
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX famous_portrait_photos_job_id_idx ON public.famous_portrait_photos(job_id, sort_order);
CREATE INDEX famous_portrait_photos_memorial_id_idx ON public.famous_portrait_photos(memorial_id) WHERE memorial_id IS NOT NULL;

CREATE TRIGGER update_famous_portrait_jobs_updated_at
BEFORE UPDATE ON public.famous_portrait_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_famous_portrait_photos_updated_at
BEFORE UPDATE ON public.famous_portrait_photos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();