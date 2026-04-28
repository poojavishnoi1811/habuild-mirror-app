# CLAUDE.md — Working Agreement for Claude Code

> Read this file at the start of every session. Then read PROJECT_BRIEF.md and ARCHITECTURE.md. Then summarize back what we're building before writing any code.

## The project in one paragraph

We are building **Mirror**, an AI tool that reflects a user's described day back at them in one of three personalities (Roast / Mirror / Maa ki Salaah), captures their phone number in exchange for the full reading, and triggers a WhatsApp follow-up that bridges to a 14-day morning routine. We're shipping it in 48 hours for a Habuild hackathon scored on lead generation. Brand-hidden — never mention "Habuild" or "yoga" in user-facing surfaces.

## Files you must read before coding

1. **PROJECT_BRIEF.md** — the why and what
2. **ARCHITECTURE.md** — the technical contract (schema, APIs, file structure, rules)
3. **This file** — how we work together

If you have not read all three, do not write code yet. Read them and confirm understanding first.

## Stack (locked)

- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase (Postgres, with Row Level Security)
- OpenRouter (OpenAI-compatible) — default model `google/gemini-2.0-flash-001`. Provider + model are env-driven so we can swap without code changes.
- `@vercel/og` for share card image generation
- WhatsApp Business API (provider configured via env)
- Hosting: Vercel

> **Why OpenRouter + Gemini Flash, not Anthropic Sonnet:** the hackathon-issued $5 OpenRouter key covers ~7000 Gemini Flash calls vs ~200 Sonnet calls — Sonnet is not viable on the available budget. Quality risk on the Maa-Hinglish tone is acknowledged; if we secure an Anthropic key from Habuild, we swap one env var.

## Style guide

### Code

- TypeScript strict mode. No `any` unless commented why.
- Functional components only. No class components.
- React hooks for state. No Redux, Zustand, or other state libraries — `useState` and `useReducer` are enough.
- Server-side code: edge runtime where possible (`export const runtime = 'edge'`), node runtime where required.
- Never put business logic in components. Components render; logic lives in `lib/` or API routes.
- Imports: external packages first, then absolute internal (`@/lib/...`), then relative.

### UI

- **Mobile-first.** All screens designed for ~380px width primary. Test on real devices, not just Chrome DevTools.
- **Aesthetic: Pinterest-style cream-on-cream.** Page bg `#FAF7F0`, primary text `#26211D`, muted `#73685C`, subtle `#A99B89`, cards `#FFFFFF` with soft shadow `0 2px 16px rgba(40,28,16,0.06)`, borders `#E8DFD2`. Generous whitespace, layered paper feel.
- Typography: **Instrument Serif** for display (italic only on the punchy line + `<em>` accents — not on every headline), **Inter** for body and small labels. JetBrains Mono is loaded but reserved for true system labels (timer, char count); avoid it for tone labels.
- Tone-driven palette is **applied as accents only** — buttons, focus borders, label highlights, the share-card background (the screenshot moment). Page backgrounds stay cream regardless of tone.
- Touch targets ≥ 44×44px.
- Inputs use `inputMode` and `type` correctly (`type="tel"` for phone, etc), placeholder color `#A99B89`.
- No generic AI-template aesthetic (no purple gradients, no dark-mode-everywhere).
- Reference points: Pinterest pin layout, editorial fashion magazines, Cardo/Garamond editorial tradition.

### Copy

- Confident, not begging.
- Specific, not generic.
- Human, not branded.
- **Never** use the words "yoga" or "Habuild" in user-facing strings.
- Saurabh Bothra is named in the WhatsApp message only. Frame him as "India's most-followed wellness teacher."
- Maa-tone copy is Hinglish in Roman script. Never Devanagari.

## Behavioural rules — what to do and not do

✅ **DO:**
- Read all three docs at session start
- Ask before adding any new dependency
- Update CLAUDE.md → "Current sprint" section as we progress
- Commit working code in small chunks (one feature per commit)
- When unsure between two options, pick the one that's more screenshot-worthy
- Wrap external SDKs in `lib/` before using them in components or routes
- Use the integration boundaries defined in ARCHITECTURE.md

❌ **DON'T:**
- Don't write tests in this 48-hour window. Speed > coverage.
- Don't refactor working code unless explicitly asked.
- Don't add login, auth, or user accounts. Phone is identity.
- Don't add features not in PROJECT_BRIEF.md without flagging.
- Don't generate stub/placeholder content where real content is needed (e.g. don't write fake AI responses; use real Claude calls).
- Don't make architectural decisions silently. If you're deviating from ARCHITECTURE.md, ask first.
- Don't introduce extra abstraction layers. We have 48 hours. Code should be flat and readable, not "properly structured."
- Don't expose the AI provider API key to the browser, ever.
- Don't use `localStorage` or `sessionStorage` (incompatible with our hosting environment in some paths).

## How we work in a session

When I start a session:
1. Read the three docs.
2. Summarize back: what we're building, the stack, what's currently in the repo, the constraints, and the current sprint.
3. Wait for me to confirm before writing code.

When I give you a task:
1. If the task is clear, plan it briefly (2–4 bullets), then implement.
2. If anything is unclear, ask before coding. Don't guess.
3. After implementing, verify by running tests or describing what to test manually.
4. Commit message format: `[area] short description` (e.g. `[api] /generate route with retry on JSON parse failure`).

When you finish a chunk:
1. Show me what changed (file list).
2. Tell me what I should test manually.
3. Update CLAUDE.md "Current sprint" if relevant.
4. Wait for next instruction. Do not proactively start the next chunk unless I say so.

## Decision-making heuristics

Use these when in doubt.

| Tension | Default to |
|---|---|
| Speed vs polish | Speed |
| Polish vs breadth | Polish (one screen done well > five screens half-done) |
| Custom code vs new dependency | Custom code if <50 lines |
| Server route vs direct browser call | Direct browser call if no secrets needed |
| Verbose error vs silent fail | Verbose error (we need to debug fast) |
| Reliability vs feature | Reliability (lead must save even if delivery fails) |
| Two design options | The one more likely to get screenshotted |

## What "good enough for the hackathon" looks like

- The flow works on iOS Safari, Android Chrome, and a 4-year-old Android phone
- AI returns a quality response 9 out of 10 times across all three tones
- WhatsApp delivery success rate ≥ 95%
- Share card looks beautiful in Instagram story preview, WhatsApp preview, and as a standalone PNG
- Mobile keyboard never covers the active input
- Page loads in <2 seconds on 4G
- No raw error messages shown to users

## Current sprint

> Update this section every standup. Claude Code reads it to know where we are.

**Phase:** Pre-build (planning weekend)

**Owner of current task:** N/A

**Current task:** Pre-flight checklist:
- [x] AI provider key obtained (OpenRouter, $5 budget — Gemini 2.0 Flash as workhorse)
- [x] Supabase project created (ref `hjzgcjegpsqdjhvzitvo`, schema + RLS applied)
- [x] Vercel + GitHub repo connected — live at https://habuild-kkd-mirror.vercel.app/
- [ ] Domain registered
- [x] WhatsApp provider decision — Wati (Habuild's existing account); awaiting API token + template approvals
- [x] System prompts v1 drafted (`lib/prompts.ts`, JSON output, voice ported from POC)
- [ ] 50 test inputs collected for prompt iteration
- [ ] Distribution prep (Person 6) — Reddit drafts, creator DM list, LinkedIn templates

**Blocked on:**
- Wati API token + template approvals (you submit templates in Wati dashboard, Meta approves in 1–24hr)

**Done:**
- Project brief locked
- Architecture documented
- POC artifact built and tested
- Next 14 scaffold + Tailwind v3 + briefs committed at `~/Desktop/hackathon/mirror/`
- Stack swap from Anthropic Sonnet to OpenRouter + Gemini 2.0 Flash documented across all three docs
- `lib/tones.ts` and `lib/prompts.ts` written; tones React-free, prompts emit strict JSON
- `/api/generate` edge route live; smoke-tested roast (2.1s, English) and maa (2.5s, Hinglish) — both return valid JSON first try, brand-hidden compliance confirmed
- UI live: `app/layout.tsx` (Instrument Serif / Inter / JetBrains Mono via next/font) + `app/page.tsx` (6-screen state machine, tone palettes, Tailwind v3, lucide-react icons)
- `lib/supabase.ts` (browser anon + server service-role clients); capture form persists to `leads` via RLS, captures `utm_source/medium/campaign` and `ref` from URL — verified end-to-end with REST smoke insert

---

## How to ask me good questions

When you're uncertain, ask these kinds of questions:
- ✅ "Should `/api/generate` return 4xx or 5xx when the day input is too short?"
- ✅ "I see two ways to wire the Supabase webhook — A or B. A is simpler but has X risk. B handles X but adds Y complexity. Which?"
- ❌ "Should I add a feature for X?" (out of scope; reference PROJECT_BRIEF first)
- ❌ "What color should this button be?" (style guide says: tone accent. Don't ask, apply.)

Good questions are tactical. Bad questions are open-ended.

## When I push back on something you suggest

If I disagree with your approach, I will tell you why. Adjust and move on. Don't capitulate without thinking — if you genuinely believe your approach is right, say so and explain. We're collaborators, not boss/employee. But if I confirm a direction after pushback, that's the direction. Time is short.

## Final reminder

The product wins on three things, in order:
1. **AI output quality** (the prompts in `lib/prompts.ts` — most important file in the repo)
2. **The share card visual** (`/api/og` route)
3. **Reliable WhatsApp delivery** (the moment we deliver value to the user)

If you find yourself working on something that doesn't directly improve one of these three, ask whether it should be cut.
