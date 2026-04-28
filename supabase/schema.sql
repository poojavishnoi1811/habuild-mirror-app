-- Mirror — full schema. Paste into Supabase SQL Editor and run once.
-- Source of truth: ARCHITECTURE.md §2.

-- =========================================================================
-- Tables
-- =========================================================================

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  -- Core lead data (the qualifying fields)
  name text not null,
  phone text not null,
  country_code text not null,
  full_phone text generated always as (country_code || phone) stored,

  -- Quiz response
  tone text not null check (tone in ('roast', 'mirror', 'maa')),
  day_input text not null,
  ai_response jsonb not null,    -- {reflection, fix_line, punchy_line}

  -- Delivery state
  whatsapp_status text default 'pending' check (
    whatsapp_status in ('pending', 'sent', 'delivered', 'failed', 'skipped')
  ),
  whatsapp_sent_at timestamptz,
  whatsapp_error text,

  -- Attribution
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_lead_id uuid references leads(id),

  -- Engagement
  share_count int default 0,
  result_viewed_at timestamptz,
  claim_clicked_at timestamptz,

  -- Spam / dedup
  ip_hash text,
  user_agent text
);

create index if not exists idx_leads_created on leads(created_at desc);
create index if not exists idx_leads_tone on leads(tone);
create index if not exists idx_leads_country on leads(country_code);
create index if not exists idx_leads_source on leads(source);
create index if not exists idx_leads_full_phone on leads(full_phone);

create table if not exists share_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id) not null,
  channel text not null,
  user_agent text
);

create index if not exists idx_share_events_lead on share_events(lead_id);
create index if not exists idx_share_events_created on share_events(created_at desc);

create table if not exists message_deliveries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id) not null,
  message_type text not null,
  provider text not null,
  provider_message_id text,
  status text not null,
  error_payload jsonb,
  attempt int default 1
);

create index if not exists idx_message_deliveries_lead on message_deliveries(lead_id);
create index if not exists idx_message_deliveries_status on message_deliveries(status);

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table leads enable row level security;
alter table share_events enable row level security;
alter table message_deliveries enable row level security;

-- Anonymous users (browser-side) can INSERT leads.
drop policy if exists "anon_insert_leads" on leads;
create policy "anon_insert_leads"
  on leads for insert
  to anon
  with check (true);

-- Anonymous users can SELECT leads (public share page reads by id; punchy_line is non-sensitive).
drop policy if exists "anon_select_own_lead" on leads;
create policy "anon_select_own_lead"
  on leads for select
  to anon
  using (true);

-- Anonymous users can insert share events.
drop policy if exists "anon_insert_share_events" on share_events;
create policy "anon_insert_share_events"
  on share_events for insert
  to anon
  with check (true);

-- message_deliveries: no anon policy → blocks browser access. Service role bypasses RLS.
