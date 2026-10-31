-- Follow-up e-mails after a free-guide signup (edge function guide-email-sequence).
-- This migration only prepares the data. Nothing is scheduled here: sending starts only when
-- supabase/sql/guide-email-sequence-enable.sql is run after the owner's approval.

-- A signup takes part in the sequence once this is set. It stays NULL (no default) until the
-- sequence is enabled, so signups before that are not mailed unless they are explicitly added.
ALTER TABLE public.ebook_signups ADD COLUMN IF NOT EXISTS sequence_started_at timestamptz;

-- Unsubscribes from the e-mail link are logged next to opens and clicks.
ALTER TABLE public.email_campaign_events DROP CONSTRAINT IF EXISTS email_campaign_events_kind_check;
ALTER TABLE public.email_campaign_events ADD CONSTRAINT email_campaign_events_kind_check
  CHECK (kind = ANY (ARRAY['open'::text, 'click'::text, 'unsubscribe'::text]));

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

CREATE OR REPLACE FUNCTION public.guide_sequence_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'GUIDE_SEQUENCE_SECRET' LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.guide_sequence_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guide_sequence_secret() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'GUIDE_SEQUENCE_SECRET') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'GUIDE_SEQUENCE_SECRET', 'Authorization secret for the guide-email-sequence edge function');
  END IF;
END $$;
