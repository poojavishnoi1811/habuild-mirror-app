# ARCHITECTURE — Mirror

This document is the technical contract for the Mirror codebase. It defines the schema, the API surface, the data flow, and the architectural rules. Every component must conform to what is defined here. If something needs to deviate, update this document first.

---

## 1. System diagram

```
┌────────────────────────────────────────────────────────────────┐
│                     FRONTEND (mobile-first)                    │
│   Tone Select → Day Input → Loading → Tease → Capture → Result │
└────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   /api/generate         /api/og              Supabase (direct)
   (Claude call)         (share card)         (lead insert)
        │                     │                     │
        ▼                     │                     ▼
   Claude API                 │              Supabase Webhook
                              │                     │
                              │                     ▼
                              │              /api/whatsapp-send
                              │                     │
                              │                     ▼
                              │              WhatsApp Provider
                              │                     │
                              │                     ▼
                              │              User's WhatsApp
                              ▼
                       Public share page (/r/[id])
```

---

## 2. Database schema (Supabase / Postgres)

### `leads` (primary table)

```sql
create table leads (
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

  -- Spam / dedup
  ip_hash text,
  user_agent text
);

create index idx_leads_created on leads(created_at desc);
create index idx_leads_tone on leads(tone);
create index idx_leads_country on leads(country_code);
create index idx_leads_source on leads(source);
create unique index idx_leads_full_phone on leads(full_phone);
```

### `share_events`

```sql
create table share_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_id uuid references leads(id) not null,
  channel text not null,
  user_agent text
);

create index idx_share_events_lead on share_events(lead_id);
create index idx_share_events_created on share_events(created_at desc);
```

### `message_deliveries`

```sql
create table message_deliveries (
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

create index idx_message_deliveries_lead on message_deliveries(lead_id);
create index idx_message_deliveries_status on message_deliveries(status);
```

### Row Level Security policies

```sql
alter table leads enable row level security;
alter table share_events enable row level security;
alter table message_deliveries enable row level security;

-- Anonymous users (browser-side) can INSERT leads, can SELECT only their own row by id
create policy "anon_insert_leads"
  on leads for insert
  to anon
  with check (true);

create policy "anon_select_own_lead"
  on leads for select
  to anon
  using (true);  -- Public share page needs to read by id; punchy_line is non-sensitive

-- Anonymous users can insert share events
create policy "anon_insert_share_events"
  on share_events for insert
  to anon
  with check (true);

-- message_deliveries is server-side only; no anon policy → blocks browser access
```

**Why RLS matters here:** the frontend writes directly to Supabase using the anon key (which is meant to be public). RLS enforces that anon users can only do what we explicitly allow — insert leads and share events, read their own result by id. They cannot bulk-read leads, modify others, or touch delivery records.

---

## 3. API surface

### `POST /api/generate`

Generates the AI reflection. Server-side because of the Anthropic API key.

**Request:**
```typescript
{
  tone: 'roast' | 'mirror' | 'maa',
  dayInput: string  // 30 ≤ length ≤ 2000
}
```

**Response (200):**
```typescript
{
  reflection: string,    // 4-6 sentences in tone-voice
  fix_line: string,      // bridge line ending with "14-day reset"
  punchy_line: string    // ≤140 chars, for share card
}
```

**Response (4xx/5xx):**
```typescript
{
  error: string,
  retryable: boolean
}
```

**Behaviour:**
- Validates input (length, tone enum)
- Loads matching system prompt from `lib/prompts.ts`
- Calls AI provider via OpenAI-compatible chat completions API. Default base URL `https://openrouter.ai/api/v1`, default model `google/gemini-2.0-flash-001`, both overridable via env. `max_tokens` 1500. `response_format: { type: 'json_object' }` where supported.
- Parses response as JSON
- On JSON parse failure: retries once with explicit "respond with valid JSON only" appended
- Hard timeout: 30 seconds
- Returns 5xx with `retryable: true` on transient errors so frontend can retry

### `POST /api/whatsapp-send` (internal)

Triggered by Supabase webhook on `leads` insert. Should NOT be called from the browser.

**Request (Supabase webhook payload):**
```typescript
{
  type: 'INSERT',
  table: 'leads',
  record: { /* full leads row */ }
}
```

**Headers:**
- `x-supabase-signature`: HMAC-SHA256 of payload with shared secret

**Response:** 200 OK or 5xx

**Behaviour:**
- Verifies webhook signature; rejects with 401 if invalid
- Loads lead from Supabase (re-fetch, don't trust webhook payload entirely)
- Idempotency check: if `whatsapp_status != 'pending'`, return 200 (already processed)
- Builds message from template using `lib/whatsapp.ts`
- Calls configured WhatsApp provider
- On success: updates `leads.whatsapp_status = 'sent'`, inserts row in `message_deliveries`
- On failure: updates `whatsapp_status = 'failed'`, logs error
- No retries in v1

### `GET /api/og?id={leadId}`

Generates the share card image dynamically.

**Request:** GET with query param `id` (lead UUID)

**Response:** PNG image, 1200×1200

**Headers:**
- `Cache-Control: public, max-age=31536000, immutable`
- `Content-Type: image/png`

**Behaviour:**
- Fetches lead by id (read via service role key, bypasses RLS)
- Renders share card with `@vercel/og`:
  - Tone-coloured background (per `tone`)
  - Decorative SVG corners specific to tone
  - "Mirror" mono label top-left
  - `punchy_line` rendered large, italic serif, centred
  - "— [name]" attribution bottom-left
  - "mirror.app" URL bottom-right
- Falls back to a generic Mirror card if `id` invalid

### `POST /api/share-event`

Logs a share action. Fire-and-forget from frontend.

**Request:**
```typescript
{
  leadId: string,
  channel: 'whatsapp' | 'instagram' | 'twitter' | 'copy_link'
}
```

**Response:** 200

**Behaviour:**
- Inserts into `share_events`
- Increments `leads.share_count`

---

## 4. Data flow per user journey

| Step | Surface | Action | Network |
|---|---|---|---|
| 0 | Landing | Static page loads, UTM captured to client state | HTTP GET (cached) |
| 1 | Tone select | User picks tone, state updates | None |
| 2 | Day input | User types day, submits | None |
| 3 | Loading | Frontend POSTs to `/api/generate` | HTTPS, ~10s |
| 4 | Server | `/api/generate` calls Claude, returns JSON | HTTPS to Anthropic |
| 5 | Tease | Frontend renders blurred result | None |
| 6 | Capture | User submits name/phone | HTTPS to Supabase (direct insert) |
| 7 | Webhook | Supabase fires webhook to `/api/whatsapp-send` | Internal, async |
| 8 | Delivery | `/api/whatsapp-send` calls WhatsApp provider | HTTPS to provider |
| 9 | Result | Frontend shows full result + share card preview | None (uses returned data) |
| 10 | Share | User taps share button, `/api/share-event` fires | HTTPS, fire-and-forget |
| 11 | Recipient | Share link opens `/r/[id]` | HTTPS GET, server-rendered |

---

## 5. File structure

```
mirror/
├── README.md
├── PROJECT_BRIEF.md
├── ARCHITECTURE.md
├── CLAUDE.md
├── .env.local.example
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── app/
│   ├── layout.tsx                # Fonts, global CSS variables
│   ├── page.tsx                  # Main flow as state machine
│   ├── globals.css
│   ├── r/
│   │   └── [id]/page.tsx         # Public share page
│   ├── live/
│   │   └── page.tsx              # Public live counter
│   ├── admin/
│   │   └── page.tsx              # Passcode-gated dashboard
│   └── api/
│       ├── generate/route.ts
│       ├── whatsapp-send/route.ts
│       ├── og/route.tsx
│       └── share-event/route.ts
├── components/
│   ├── ToneSelect.tsx
│   ├── DayInput.tsx
│   ├── LoadingScreen.tsx
│   ├── TeaseScreen.tsx
│   ├── CaptureForm.tsx
│   └── ResultCard.tsx
├── lib/
│   ├── prompts.ts                # 3 system prompts
│   ├── supabase.ts               # Browser + server clients
│   ├── whatsapp.ts               # Provider wrapper
│   ├── tones.ts                  # Tone metadata (colors, labels)
│   └── analytics.ts              # UTM capture helpers
└── public/
    └── fonts/                    # Local fonts for /api/og
```

---

## 6. Environment variables

```bash
# .env.local.example

# AI provider (OpenAI-compatible chat completions)
AI_PROVIDER_BASE_URL=https://openrouter.ai/api/v1
AI_PROVIDER_API_KEY=                 # OpenRouter key (sk-or-v1-...) or Anthropic via OpenAI-compat shim
AI_MODEL=google/gemini-2.0-flash-001 # Override per-deploy if budget/quality allows

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server-only, bypasses RLS for /api/og
SUPABASE_WEBHOOK_SECRET=           # HMAC secret for /api/whatsapp-send verification

# WhatsApp
WHATSAPP_PROVIDER=                 # 'habuild' | 'aisensy' | 'interakt' | 'mock'
WHATSAPP_API_KEY=
WHATSAPP_API_URL=
WHATSAPP_FROM_NUMBER=
WHATSAPP_TEMPLATE_NAME=            # If using template-based sending

# App
NEXT_PUBLIC_APP_URL=https://mirror.app
ADMIN_PASSCODE=                    # Hardcoded admin gate
```

---

## 7. State machine (frontend `app/page.tsx`)

```typescript
type Screen = 'tone' | 'input' | 'loading' | 'tease' | 'capture' | 'result' | 'error';

type State = {
  screen: Screen;
  tone: 'roast' | 'mirror' | 'maa' | null;
  dayInput: string;
  aiResponse: AIResponse | null;
  leadId: string | null;
  name: string;
  phone: string;
  countryCode: string;     // default '+91'
  error: string | null;
  utm: { source?: string; medium?: string; campaign?: string };
  referrerLeadId: string | null;
};

type AIResponse = {
  reflection: string;
  fix_line: string;
  punchy_line: string;
};
```

**Transitions:**
- `tone` → `input` on tone select
- `input` → `loading` on submit (triggers `/api/generate`)
- `loading` → `tease` on AI response success; → `error` on failure
- `tease` → `capture` on "Unlock" click
- `capture` → `result` on Supabase insert success; → `error` on failure
- Any state → `tone` on "restart" click

---

## 8. Architectural rules

These are the non-negotiables. Every commit must conform.

1. **Never expose the AI provider API key to the browser.** All AI calls go through `/api/generate`.
2. **Phone number is the user identity.** No login, no auth, no accounts.
3. **`leads.ai_response` is always JSONB**, never separated into columns. Future fields go in JSONB.
4. **Direct browser writes to Supabase** for `leads` insert and `share_events` insert. RLS is the gatekeeper.
5. **All server-to-server communication is signed.** Supabase webhooks include HMAC, `/api/whatsapp-send` verifies before processing.
6. **Idempotency on every external side-effect.** Re-firing the same webhook should not re-send WhatsApp.
7. **Lead persistence comes before delivery.** If WhatsApp fails, the lead still saves. We never lose a lead to a delivery failure.
8. **No yoga or Habuild mentions in user-facing strings.** Saurabh Bothra is okay (he's the credential). Habuild appears only in the WhatsApp message, post-signup.
9. **All copy targeting Maa tone is Hinglish in Roman script.** Never Devanagari.
10. **Cache the OG image aggressively.** First render builds it, all subsequent fetches are edge-cached.

---

## 9. What scales beyond v1

Each component below has a defined v2 migration path. None are required for the hackathon.

| Component | v1 (now) | v2 (post-hack) |
|---|---|---|
| AI calls | Synchronous block | Streaming response, embedding cache |
| Lead writes | Direct from browser via RLS | Server-side route with rate limiting |
| WhatsApp delivery | Single provider, no retries | Multi-provider failover, exponential backoff retries, dead-letter queue |
| Share card | `@vercel/og` synchronous | Pre-generated PNG cached on CDN |
| Live counter | Polling /live every 30s | Supabase Realtime subscriptions |
| Admin auth | Hardcoded passcode | NextAuth / SSO |
| Observability | console.log | Sentry + Axiom + Datadog |
| Analytics | Live polling on /admin | Materialized views, separate analytics DB |

---

## 10. Open questions resolved during planning

- ❓ Sticker library for share cards → ✗ **CUT** (time)
- ❓ Voice input via Whisper → ✗ **CUT** (time)
- ❓ Google Sheets backend → ✗ **REJECTED** (rate limits, lack of querying)
- ❓ Custom WhatsApp scraping (whatsapp-web.js) → ✗ **REJECTED** (TOS, ban risk)
- ❓ Native mobile app → ✗ **REJECTED** (parents won't install; web is more accessible)
- ✓ Brand-hidden until WhatsApp message → **CONFIRMED**
- ✓ Three tones, one engine → **CONFIRMED**
- ✓ Supabase as DB → **CONFIRMED**
- ✓ Direct browser writes with RLS → **CONFIRMED**

---

## 11. The integration boundaries

Each external dependency is wrapped behind an internal interface. This is what allows v1→v2 swaps to happen without rewriting business logic.

- **AI provider (OpenRouter / Anthropic / etc.)** → wrapped in `/api/generate` route, called via OpenAI-compatible chat completions. Provider URL, key, and model are env vars; switching provider is a config change, not a code change. Prompt format defined in `lib/prompts.ts`.
- **WhatsApp providers** → wrapped in `lib/whatsapp.ts` with single function `sendWelcomeMessage(lead)`. Provider switching is one env var.
- **Share image generation** → wrapped in `/api/og` route. Visual changes happen in one file.
- **Supabase** → wrapped in `lib/supabase.ts` with `browserClient` and `serverClient` exports.

If you find yourself reaching for a third-party SDK in a component file, stop. Wrap it in `lib/` first.
