-- Per-recipient id for campaign e-mails, so opens (tracking pixel) and link clicks can be counted per address.
alter table public.email_campaign_sends add column if not exists rid uuid not null default gen_random_uuid();
create unique index if not exists email_campaign_sends_rid_key on public.email_campaign_sends (rid);

-- One row per open or click, written by the email-track function (service role only).
create table if not exists public.email_campaign_events (
  id bigint generated always as identity primary key,
  rid uuid not null,
  kind text not null check (kind in ('open', 'click')),
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists email_campaign_events_rid_idx on public.email_campaign_events (rid);

alter table public.email_campaign_events enable row level security;
