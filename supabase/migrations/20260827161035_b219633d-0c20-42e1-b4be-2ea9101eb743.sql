GRANT INSERT ON public.obituaries TO authenticated;

CREATE POLICY "Authenticated can add memorial-only person records"
ON public.obituaries FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND coalesce(active, false) = false
  AND coalesce(paid, false) = false
);

CREATE POLICY "Person data of viewable memorials is readable"
ON public.obituaries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memorials m
    WHERE m.deceased_id = obituaries.id
      AND public.memorial_is_viewable(m.id)
  )
);