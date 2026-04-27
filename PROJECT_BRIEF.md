# PROJECT BRIEF — Mirror

## What we are building

**Mirror** is an AI tool where a user describes their typical day in 30 seconds (free text, not multiple choice). The AI reflects their day back at them through one of three personalities they pick at the start:

1. **🔥 Roast** — savage, witty Gen Z tone. Targets ages 18–28.
2. **🪞 Mirror** — honest, slightly therapist-like tone. Targets working professionals & NRIs ages 28–45.
3. **🙏 Maa ki Salaah** — warm, caring, slightly guilt-tripping Indian mother tone. Hinglish in Roman script. Targets parents 45+.

After a teased preview of the result, the user gives **name + phone + country code** to unlock the full reflection plus a "14-day reset plan" delivered via WhatsApp.

## The context (why this exists)

We are participating in a 48-hour hackathon called **"Kuch Karke Dikha" (KKD v1)** hosted by **Habuild** — India's largest online live-yoga company. Habuild's flagship lead-generation product is a 14-day free yoga challenge that converts free users to paid members.

The hackathon's only goal is **lead generation** for Habuild's June yoga challenge. Each lead must include name, phone number, and country code.

**Scoring (out of 100):**
- 60% Virality — raw lead count
- 20% Creativity & storytelling
- 10% Novelty
- 10% User insight

**Lead point values:**
- Indian lead (`+91`) = 1 point
- International lead = 3 points

**Hard rule:** we cannot use Habuild's existing member database. Every lead must be a brand-new acquisition.

## The strategic bet

Most lead-gen products lead with the offer ("sign up for yoga"). Mirror inverts this: we hook the user with **a problem they already feel** (stress, exhaustion, a body keeping score), reflect it back through a culturally specific voice, and frame the 14-day plan as the **answer to their specific result**.

The 14-day reset plan IS Habuild's free yoga challenge — but **we never call it "yoga" or "Habuild" on any user-facing surface**. It is framed as "a 14-day morning routine, designed by Saurabh Bothra (India's most-followed wellness teacher)." Habuild only appears in the WhatsApp message after the lead is captured.

## Why we believe this works

- **People share outputs that say something about *them***, not links to tools. Result must be screenshot-worthy.
- **Free-text input feels personal** in a way quizzes don't. Higher emotional investment → higher conversion at the phone-number ask.
- **Three tones = three audiences = three viral channels** from one engine.
- **Maa ki Salaah is unique to Indian product thinking.** Emotionally devastating in the best way for parents and NRIs (NRI = 3 points, our highest-value segment).
- **Brand-hidden framing** means new users meet the experience first, not the brand. Reduces top-of-funnel resistance.

## Built-in viral mechanics

1. **Auto-generated share card** — beautifully designed PNG with the punchiest line from the user's reflection. Sized for Instagram story and WhatsApp. Designed to be screenshotted and posted.
2. **"Send this to a friend who needs it more than you" button** — pre-fills a WhatsApp message that reads like the user wrote it, not like marketing.
3. **Public result page (`/r/[id]`)** — when someone shares their result, the link opens a page showing their punchy line + share card, with a "Get yours" CTA. Recipients become leads with `referrer_lead_id` populated → measurable k-factor.
4. **Tone comparison** — users can challenge a friend to take the same quiz with a different tone and compare results.

## What we are explicitly NOT building

- A native mobile app (web-only, mobile-first responsive)
- A login or auth system — phone number IS the identity
- A multiple-choice quiz format — free-text input only
- A landing page that mentions yoga, Habuild, or "join our challenge"
- Voice input / Whisper transcription — cut for speed
- A custom sticker library — cut for speed
- Anything that asks for personal info before showing value
- Anything that takes more than 90 seconds before the lead is captured

## Audience segments and language rules

| Segment | Tone | Language | Channel for distribution |
|---|---|---|---|
| Gen Z (18–28) | Roast | English with Indian Gen Z slang | Instagram, Twitter, Reddit |
| Working professionals & NRIs (28–45) | Mirror | English | LinkedIn, Reddit (r/IndiansAbroad, r/ABCDesis) |
| Indian parents (45+) | Maa ki Salaah | Hinglish in Roman script (NEVER Devanagari) | Family WhatsApp seeds, NRI-gifting flow |

## Constraints

- **48-hour build window** (Mon–Tue, 9 AM – 9 PM each day). Speed > polish.
- **Mobile-first.** Must work on a 60-year-old parent's phone in Pune as cleanly as on an iPhone in Toronto.
- **Bilingual support** (English + Hinglish-in-Roman) required for Maa tone.
- **WhatsApp delivery** for post-signup follow-up — using Habuild's existing API if available, AiSensy/Interakt as fallback.
- **Team is dev-strong, content-and-distribution-weak.** AI assistance is critical for copy, prompts, and viral content.

## Tech stack

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Database:** Supabase (Postgres) — direct write from frontend with Row Level Security
- **AI:** OpenRouter (OpenAI-compatible API), default model `google/gemini-2.0-flash-001`. Provider + model are env-driven.
- **Share card:** `@vercel/og` for dynamic image generation
- **WhatsApp:** Habuild's existing Business API (preferred) or AiSensy / Interakt
- **Hosting:** Vercel
- **Domain:** TBD — register Saturday morning

## Tone of voice for the project (how things should feel)

When in doubt about copy, design, or interaction:
- **Confident, not begging.** Mirror knows it's good. It does not plead for engagement.
- **Specific, not generic.** "Your spine is filing for divorce" beats "you have back pain."
- **Earned, not announced.** The result is the reward; we don't tell users "this is amazing!"
- **Human, not branded.** Every share message reads like the user wrote it themselves.
- **Beautiful, not busy.** Heavy typography, restrained motion, distinctive palette per tone.

Reference points for visual aesthetic: **Cred app, Zerodha Varsity, Spotify Wrapped, BeReal.**
Reference points for copy tone: **Cred Twitter, Zomato Twitter, Paperboat ads.**

## Success looks like

- **Quantitative:** 1,500+ leads captured by Tuesday 9 PM, with at least 30% international (the 3x multiplier matters). K-factor ≥ 0.8.
- **Qualitative:** judges remember Mirror. The Maa ki Salaah tone is the moment that wins it.
- **Stretch:** k-factor crosses 1.0 some time Tuesday afternoon, and lead growth becomes self-sustaining without active distribution.

## What this brief does NOT cover

- Distribution playbook (lives separately in `DISTRIBUTION.md`)
- Day-by-day build schedule (lives separately in `RUNBOOK.md`)
- API contracts and database schema (lives in `ARCHITECTURE.md`)
- Working agreements with Claude Code (lives in `CLAUDE.md`)
