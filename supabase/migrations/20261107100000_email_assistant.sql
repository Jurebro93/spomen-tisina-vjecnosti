-- E-mail assistant for info@ (edge function email-assistant). Everything starts switched off:
-- enabled = false (does not run), send_to_customers = false (test mode: only the owner gets copies),
-- apply_changes = false (no changes on the site).

CREATE TABLE IF NOT EXISTS public.email_assistant_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  send_to_customers boolean NOT NULL DEFAULT false,
  apply_changes boolean NOT NULL DEFAULT false,
  notify_email text NOT NULL DEFAULT 'galaxy.rozi.3@gmail.com',
  model text NOT NULL DEFAULT 'claude-opus-5-5',
  uidvalidity bigint,
  last_uid bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.email_assistant_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.email_assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid bigint,
  uidvalidity bigint,
  message_id text UNIQUE,
  from_email text,
  from_name text,
  subject text,
  body_text text,
  received_at timestamptz,
  sender_verified boolean NOT NULL DEFAULT false,
  decision text NOT NULL CHECK (decision IN ('reply', 'forward', 'skipped', 'error')),
  reply_text text,
  forward_reason text,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_to_customer boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_assistant_messages_from_idx ON public.email_assistant_messages (from_email, created_at DESC);

ALTER TABLE public.email_assistant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_assistant_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_assistant_settings' AND policyname = 'Admins read email assistant settings') THEN
    CREATE POLICY "Admins read email assistant settings" ON public.email_assistant_settings
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_assistant_messages' AND policyname = 'Admins read email assistant messages') THEN
    CREATE POLICY "Admins read email assistant messages" ON public.email_assistant_messages
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Shared secret between pg_cron and the function, kept in Vault only.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'EMAIL_ASSISTANT_SECRET') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'EMAIL_ASSISTANT_SECRET');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.email_assistant_check_secret(_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(_secret, '') <> '' AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'EMAIL_ASSISTANT_SECRET' AND decrypted_secret = _secret
  );
$$;
REVOKE ALL ON FUNCTION public.email_assistant_check_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_assistant_check_secret(text) TO service_role;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-assistant') THEN
    PERFORM cron.unschedule('email-assistant');
  END IF;
END $$;

-- Every 5 minutes. While enabled = false the function returns at once without touching the inbox.
SELECT cron.schedule('email-assistant', '*/5 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/email-assistant',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-assistant-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'EMAIL_ASSISTANT_SECRET')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
$cron$);
