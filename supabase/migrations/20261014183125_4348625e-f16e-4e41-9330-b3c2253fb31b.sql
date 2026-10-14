CREATE TABLE public.meta_capi_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL UNIQUE,
  event_id text NOT NULL,
  event_name text NOT NULL DEFAULT 'Purchase',
  order_id uuid, memorial_id uuid, user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  locked_at timestamptz,
  claim_token uuid,
  last_error text, meta_status integer, meta_body jsonb,
  event_time bigint NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  client_ip text, client_user_agent text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.meta_capi_deliveries TO authenticated;
GRANT ALL ON public.meta_capi_deliveries TO service_role;
ALTER TABLE public.meta_capi_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read capi deliveries" ON public.meta_capi_deliveries FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.validate_capi_delivery() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending','processing','sent','failed','skipped_no_consent') THEN RAISE EXCEPTION 'invalid status %', NEW.status; END IF;
  -- A sent or no-consent row is final.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('sent','skipped_no_consent') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'final status % cannot change', OLD.status;
  END IF;
  -- Never keep network identifiers without consent or after the outcome is final.
  IF NEW.status IN ('sent','skipped_no_consent') THEN NEW.client_ip := NULL; NEW.client_user_agent := NULL; NEW.claim_token := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER meta_capi_deliveries_validate BEFORE INSERT OR UPDATE ON public.meta_capi_deliveries FOR EACH ROW EXECUTE FUNCTION public.validate_capi_delivery();
CREATE TRIGGER update_meta_capi_deliveries_updated_at BEFORE UPDATE ON public.meta_capi_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX meta_capi_deliveries_retry_idx ON public.meta_capi_deliveries (status, next_attempt_at);

-- Atomic claim with a fresh token; only the holder of the token may record the result.
CREATE OR REPLACE FUNCTION public.claim_capi_delivery(_session_id text) RETURNS SETOF public.meta_capi_deliveries
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.meta_capi_deliveries SET status='processing', locked_at=now(), attempts=attempts+1, claim_token=gen_random_uuid()
  WHERE stripe_session_id=_session_id
    AND attempts < 6
    AND (status='pending'
         OR (status='failed' AND (next_attempt_at IS NULL OR next_attempt_at <= now()))
         OR (status='processing' AND locked_at < now() - interval '10 minutes'))
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.finish_capi_delivery(_id uuid, _token uuid, _status text, _meta_status integer, _meta_body jsonb, _error text, _next_attempt_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  IF _status NOT IN ('sent','failed') THEN RAISE EXCEPTION 'invalid finish status'; END IF;
  UPDATE public.meta_capi_deliveries
     SET status=_status, meta_status=_meta_status, meta_body=_meta_body, last_error=_error,
         next_attempt_at=CASE WHEN _status='failed' THEN _next_attempt_at END,
         sent_at=CASE WHEN _status='sent' THEN now() END, locked_at=NULL, claim_token=NULL
   WHERE id=_id AND status='processing' AND claim_token=_token;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END $$;

-- Retention: drop network identifiers from rows that can no longer be retried (Meta accepts events up to 7 days old).
CREATE OR REPLACE FUNCTION public.purge_capi_identifiers() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  UPDATE public.meta_capi_deliveries SET client_ip=NULL, client_user_agent=NULL
   WHERE (client_ip IS NOT NULL OR client_user_agent IS NOT NULL)
     AND (attempts >= 6 OR created_at < now() - interval '7 days');
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.claim_capi_delivery(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_capi_delivery(uuid,uuid,text,integer,jsonb,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_capi_identifiers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_capi_delivery(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_capi_delivery(uuid,uuid,text,integer,jsonb,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_capi_identifiers() TO service_role;