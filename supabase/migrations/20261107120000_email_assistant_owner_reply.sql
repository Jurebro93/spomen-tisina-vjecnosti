-- The owner answers a forwarded mail with "Reply" in his own mail app: the copy he got has Reply-To info@ and a
-- Message-ID with a random token, so his answer comes back to info@ and the assistant sends it to the customer
-- from info@ (the customer never sees the owner's private address).
ALTER TABLE public.email_assistant_messages ADD COLUMN IF NOT EXISTS copy_token text;
CREATE UNIQUE INDEX IF NOT EXISTS email_assistant_messages_copy_token_idx ON public.email_assistant_messages (copy_token);
ALTER TABLE public.email_assistant_messages DROP CONSTRAINT IF EXISTS email_assistant_messages_decision_check;
ALTER TABLE public.email_assistant_messages ADD CONSTRAINT email_assistant_messages_decision_check
  CHECK (decision IN ('reply', 'forward', 'skipped', 'error', 'owner_reply'));
