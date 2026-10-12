GRANT SELECT ON public.groblja_i_opisi TO anon;
GRANT SELECT ON public.groblja_i_opisi TO authenticated;
GRANT ALL ON public.groblja_i_opisi TO service_role;

ALTER TABLE public.groblja_i_opisi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read groblja_i_opisi" ON public.groblja_i_opisi;
CREATE POLICY "Everyone can read groblja_i_opisi"
ON public.groblja_i_opisi
FOR SELECT
USING (true);