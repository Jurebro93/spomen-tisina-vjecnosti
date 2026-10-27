-- One row per address per campaign e-mail, so a campaign is never sent twice to the same person.
create table if not exists public.email_campaign_sends (
  campaign text not null,
  email text not null,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  primary key (campaign, email)
);

alter table public.email_campaign_sends enable row level security;

-- A send is authorised by a one-time token an operator inserts with SQL (the site cannot write here).
create table if not exists public.email_campaign_tokens (
  token text primary key,
  campaign text not null,
  expires_at timestamptz not null default now() + interval '30 minutes'
);

alter table public.email_campaign_tokens enable row level security;
