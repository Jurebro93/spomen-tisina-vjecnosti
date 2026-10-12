ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS tributes_require_approval boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.memorial_tributes_auto_approved(_memorial_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = _memorial_id AND m.tributes_require_approval = false);
$$;

DROP POLICY IF EXISTS "Anyone can submit pending tribute" ON public.memorial_tributes;
CREATE POLICY "Anyone can submit tribute" ON public.memorial_tributes FOR INSERT
WITH CHECK (
  consent = true AND approved_by IS NULL
  AND public.memorial_allows(memorial_id, 'tributes')
  AND (
    (status = 'pending' AND approved_at IS NULL)
    OR (status = 'approved' AND public.memorial_tributes_auto_approved(memorial_id))
  )
);