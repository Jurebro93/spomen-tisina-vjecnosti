-- E-mail alerts for new obituaries in one city (signup box on /umrli/:city).
-- Written only by the subscribe-newsletter edge function (service role); no public access.
CREATE TABLE IF NOT EXISTS public.obituary_city_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  city text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, city)
);

ALTER TABLE public.obituary_city_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to obituary_city_alerts"
  ON public.obituary_city_alerts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
