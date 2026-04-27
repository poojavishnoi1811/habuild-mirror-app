'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Flame,
  Sparkles,
  Heart,
  Send,
  Phone,
  ArrowRight,
  Share2,
  RotateCcw,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import { TONES, TONE_IDS, type IconKey, type ToneId } from '@/lib/tones';
import type { AIResponse } from '@/lib/prompts';
import { browserClient } from '@/lib/supabase';

type Utm = { source?: string; medium?: string; campaign?: string };

const ICONS: Record<IconKey, LucideIcon> = {
  flame: Flame,
  sparkles: Sparkles,
  heart: Heart,
};

type Screen = 'tone' | 'input' | 'loading' | 'tease' | 'capture' | 'result';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: 'India' },
  { code: '+1', flag: '🇺🇸', label: 'United States' },
  { code: '+44', flag: '🇬🇧', label: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', label: 'UAE' },
  { code: '+65', flag: '🇸🇬', label: 'Singapore' },
  { code: '+61', flag: '🇦🇺', label: 'Australia' },
] as const;

const MIN_INPUT = 30;

const splitFix = (reflection: string, fixLine: string) => ({ body: reflection.trim(), fix: fixLine.trim() });

export default function Home() {
  const [screen, setScreen] = useState<Screen>('tone');
  const [tone, setTone] = useState<ToneId | null>(null);
  const [dayInput, setDayInput] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [utm, setUtm] = useState<Utm>({});
  const [referrerLeadId, setReferrerLeadId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const T = tone ? TONES[tone] : null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    setUtm({
      source: sp.get('utm_source') ?? undefined,
      medium: sp.get('utm_medium') ?? undefined,
      campaign: sp.get('utm_campaign') ?? undefined,
    });
    setReferrerLeadId(sp.get('ref'));
  }, []);

  useEffect(() => {
    if (screen !== 'loading' || !T) return;
    const id = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % T.loadingMessages.length);
    }, 1500);
    return () => clearInterval(id);
  }, [screen, T]);

  const callAI = async () => {
    if (!tone) return;
    setScreen('loading');
    setError(null);
    setLoadingMsgIdx(0);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, dayInput: dayInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Something went wrong. Try again.');
        setScreen('input');
        return;
      }
      setAiResponse(data as AIResponse);
      setScreen('tease');
    } catch {
      setError("Couldn't reach the AI. Try again.");
      setScreen('input');
    }
  };

  const handleSubmitInfo = async () => {
    if (!name.trim() || phone.length < 7 || !tone || !aiResponse) {
      setError('Need your name and a real phone number.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const { data, error: dbError } = await browserClient
      .from('leads')
      .insert({
        name: name.trim(),
        phone,
        country_code: countryCode,
        tone,
        day_input: dayInput.trim(),
        ai_response: aiResponse,
        source: 'web',
        utm_source: utm.source ?? null,
        utm_medium: utm.medium ?? null,
        utm_campaign: utm.campaign ?? null,
        referrer_lead_id: referrerLeadId,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      .select('id')
      .single();

    setSubmitting(false);

    if (dbError) {
      console.error('[capture] insert failed:', dbError);
      if (dbError.code === '23505') {
        setError("This number's already in. Check your WhatsApp.");
      } else {
        setError('Something went wrong saving. Try again.');
      }
      return;
    }

    setLeadId(data.id);
    setScreen('result');
  };

  const reset = () => {
    setScreen('tone');
    setTone(null);
    setDayInput('');
    setAiResponse(null);
    setName('');
    setPhone('');
    setError(null);
    setLeadId(null);
    setSubmitting(false);
  };

  const { body, fix } = aiResponse
    ? splitFix(aiResponse.reflection, aiResponse.fix_line)
    : { body: '', fix: '' };

  const punchLine = aiResponse?.punchy_line ?? '';
  const teaseText = body.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');

  return (
    <div
      className="min-h-screen relative overflow-hidden transition-[background] duration-700"
      style={{ background: T ? T.bg : '#0A0A0F' }}
    >
      <div className="grain pointer-events-none fixed inset-0" />

      <div className="max-w-[520px] mx-auto px-5 py-6 pb-12 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-8">
          <div className="font-mono text-[13px] uppercase tracking-[0.1em] text-white/55">Mirror</div>
          {screen !== 'tone' && (
            <button
              onClick={reset}
              className="font-mono text-[11px] text-white/60 border border-white/15 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:text-white hover:border-white/30 transition-colors"
            >
              <RotateCcw size={11} /> restart
            </button>
          )}
        </header>

        {/* SCREEN: TONE */}
        {screen === 'tone' && (
          <div className="fade-up flex-1 flex flex-col">
            <div className="mt-6 mb-10">
              <h1 className="font-serif text-[44px] sm:text-[48px] leading-[1.05] tracking-[-0.02em] m-0 mb-4">
                Tell me about your day.
                <br />
                <em className="text-white/55">I&apos;ll tell you something true.</em>
              </h1>
              <p className="font-sans text-sm text-white/45 leading-relaxed m-0">
                Pick a voice. Type your day. Hear yourself, differently.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {TONE_IDS.map((id, i) => {
                const tn = TONES[id];
                const Icon = ICONS[tn.iconKey];
                return (
                  <button
                    key={tn.id}
                    onClick={() => {
                      setTone(tn.id);
                      setScreen('input');
                    }}
                    className="fade-up bg-white/[0.04] border border-white/10 rounded-2xl p-5 text-left text-white flex items-center gap-4 transition-all hover:bg-white/[0.08] hover:translate-x-1"
                    style={{ animationDelay: `${i * 80}ms`, borderColor: undefined }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tn.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '';
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: tn.accent }}
                    >
                      <Icon size={22} color="#fff" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <div className="font-serif text-2xl leading-tight mb-1">{tn.label}</div>
                      <div className="font-sans text-xs text-white/50">
                        {tn.sub} · ages {tn.age}
                      </div>
                    </div>
                    <ArrowRight size={18} color="rgba(255,255,255,0.3)" />
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-8 font-mono text-[11px] text-white/30">
              30-second read · brutally honest · share-worthy
            </div>
          </div>
        )}

        {/* SCREEN: INPUT */}
        {screen === 'input' && T && (
          <div className="fade-up flex-1 flex flex-col">
            <div className="mb-6">
              <div
                className="font-mono text-[11px] uppercase tracking-[0.1em] mb-3"
                style={{ color: T.accent }}
              >
                — {T.label} mode
              </div>
              <h2 className="font-serif text-[32px] leading-tight m-0 mb-3">Type your day.</h2>
              <p className="font-sans text-[13px] text-white/50 leading-relaxed m-0">
                Wake time, food, work, screens, sleep. The more honest, the sharper the read.
              </p>
            </div>

            <textarea
              value={dayInput}
              onChange={(e) => setDayInput(e.target.value)}
              placeholder={T.placeholder}
              rows={8}
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-[18px] text-white text-[16px] leading-relaxed font-sans resize-none outline-none mb-3 transition-colors focus:border-[var(--tone-accent)]"
              style={{ ['--tone-accent' as never]: T.accent }}
            />

            <div className="font-mono text-[11px] text-white/35 mb-5">
              {dayInput.length} chars ·{' '}
              {dayInput.trim().length < MIN_INPUT ? 'give me more to work with' : 'good'}
            </div>

            {error && (
              <div className="text-[13px] mb-3" style={{ color: T.accent }}>
                {error}
              </div>
            )}

            <button
              onClick={callAI}
              disabled={dayInput.trim().length < MIN_INPUT}
              className="border-0 px-6 py-4 rounded-[14px] text-base font-semibold flex items-center justify-center gap-2.5 transition-all font-sans disabled:cursor-not-allowed"
              style={{
                background: dayInput.trim().length < MIN_INPUT ? 'rgba(255,255,255,0.1)' : T.accent,
                color: dayInput.trim().length < MIN_INPUT ? 'rgba(255,255,255,0.3)' : '#fff',
              }}
            >
              {T.ctaLabel}
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* SCREEN: LOADING */}
        {screen === 'loading' && T && (
          <div className="fade-up flex-1 flex flex-col items-center justify-center text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-8 pulse-soft"
              style={{ background: T.accent }}
            >
              {(() => {
                const Icon = ICONS[T.iconKey];
                return <Icon size={36} color="#fff" />;
              })()}
            </div>
            <div className="font-serif text-[32px] leading-tight mb-3">
              {T.loadingMessages[loadingMsgIdx]}…
            </div>
            <div className="font-mono text-[11px] text-white/40 tracking-[0.1em]">
              this takes about 10 seconds
            </div>
          </div>
        )}

        {/* SCREEN: TEASE */}
        {screen === 'tease' && T && (
          <div className="fade-up flex-1 flex flex-col">
            <div
              className="font-mono text-[11px] uppercase tracking-[0.1em] mb-4"
              style={{ color: T.accent }}
            >
              — {T.label} · partial
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-6 relative">
              <p className="font-serif text-[22px] leading-snug m-0 italic">&ldquo;{teaseText}&rdquo;</p>

              <div
                className="mt-5 pt-5 border-t border-dashed border-white/15 select-none pointer-events-none opacity-50 font-serif"
                style={{ filter: 'blur(6px)' }}
              >
                <p className="text-lg leading-relaxed m-0">
                  ████████ ████ ████████ ██████ ████████ ████████ ██████ ████████ ████ ███████
                  ██████ ████████.
                </p>
                <p className="text-lg leading-relaxed mt-3 mb-0" style={{ color: T.accent }}>
                  ███████ → ████ ███████ ████ ████████.
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-5 mb-5" style={{ background: T.accent }}>
              <div className="font-mono text-[11px] uppercase tracking-[0.1em] opacity-85 mb-2">
                Unlock the rest
              </div>
              <div className="font-serif text-xl leading-snug mb-1">
                See the full read + your 14-day reset plan.
              </div>
              <div className="font-sans text-[13px] opacity-85">Sent to your WhatsApp. No spam, ever.</div>
            </div>

            <button
              onClick={() => setScreen('capture')}
              className="bg-white text-black border-0 px-6 py-4 rounded-[14px] text-base font-semibold flex items-center justify-center gap-2.5 font-sans hover:bg-white/90 transition-colors"
              style={{ color: T.bg }}
            >
              <Phone size={18} /> Unlock my full read
            </button>
          </div>
        )}

        {/* SCREEN: CAPTURE */}
        {screen === 'capture' && T && (
          <div className="fade-up flex-1 flex flex-col">
            <div className="mb-6">
              <div
                className="font-mono text-[11px] uppercase tracking-[0.1em] mb-3"
                style={{ color: T.accent }}
              >
                — One step left
              </div>
              <h2 className="font-serif text-[32px] leading-tight m-0 mb-2">Where do I send this?</h2>
              <p className="font-sans text-[13px] text-white/50 leading-relaxed m-0">
                Your full read + a 14-day reset plan, on WhatsApp.
              </p>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="given-name"
                className="w-full bg-white/[0.04] border border-white/10 rounded-[14px] p-4 text-white text-[16px] font-sans outline-none transition-colors focus:border-[var(--tone-accent)]"
                style={{ ['--tone-accent' as never]: T.accent }}
              />
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-white/[0.04] border border-white/10 rounded-[14px] py-4 px-3 text-white text-[16px] font-sans outline-none min-w-[100px]"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[#1a1a1a]">
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Phone number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-[14px] p-4 text-white text-[16px] font-sans outline-none transition-colors focus:border-[var(--tone-accent)]"
                  style={{ ['--tone-accent' as never]: T.accent }}
                />
              </div>
            </div>

            {error && (
              <div className="text-[13px] mb-3" style={{ color: T.accent }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmitInfo}
              disabled={submitting}
              className="border-0 px-6 py-4 rounded-[14px] text-base font-semibold flex items-center justify-center gap-2.5 font-sans mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: T.accent, color: '#fff' }}
            >
              <Send size={18} /> {submitting ? 'Sending…' : 'Send me my full read'}
            </button>
            <div className="font-mono text-[10px] text-white/35 text-center">
              we&apos;ll never spam · we&apos;ll never share your number
            </div>
          </div>
        )}

        {/* SCREEN: RESULT */}
        {screen === 'result' && T && aiResponse && (
          <div className="fade-up flex-1 flex flex-col">
            <div
              className="font-mono text-[11px] uppercase tracking-[0.1em] mb-4"
              style={{ color: T.accent }}
            >
              — {T.label} · full read
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-4">
              <p className="font-serif text-lg leading-relaxed m-0 whitespace-pre-wrap">{body}</p>
              {fix && (
                <p
                  className="font-serif text-[17px] leading-snug mt-5 pt-5 font-medium"
                  style={{ borderTop: `2px solid ${T.accent}`, color: T.accent }}
                >
                  {fix}
                </p>
              )}
            </div>

            <div className="font-mono text-[11px] text-white/50 uppercase tracking-[0.1em] mb-2">
              ↓ your share card
            </div>
            <div
              ref={cardRef}
              className="rounded-[20px] p-7 mb-6 relative overflow-hidden flex flex-col justify-between"
              style={{ background: T.cardBg, aspectRatio: '1 / 1' }}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />

              <div className="font-mono text-[11px] tracking-[0.15em] opacity-70 uppercase relative z-10">
                Mirror · {T.label}
              </div>

              <div className="relative z-10">
                <p className="font-serif text-2xl leading-snug m-0 italic">&ldquo;{punchLine}&rdquo;</p>
              </div>

              <div className="relative z-10 flex justify-between items-end">
                <div className="font-mono text-[10px] opacity-70 tracking-[0.1em]">— {name || 'anonymous'}</div>
                <div className="font-mono text-[10px] opacity-70 tracking-[0.1em]">mirror.app</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const verb =
                    tone === 'roast'
                      ? 'roasted me'
                      : tone === 'mirror'
                      ? 'saw through me'
                      : 'destroyed me politely (in maa voice)';
                  const origin = window.location.origin;
                  const link = leadId ? `${origin}/r/${leadId}` : origin;
                  const msg = encodeURIComponent(
                    `bro this AI just ${verb} and honestly i think you need this more than i did. try it: ${link}`,
                  );
                  window.open(`https://wa.me/?text=${msg}`, '_blank');
                }}
                className="bg-[#25D366] text-white border-0 px-5 py-3.5 rounded-[14px] text-[15px] font-semibold flex items-center justify-center gap-2.5 font-sans"
              >
                <MessageCircle size={18} /> Send to a friend who needs it more
              </button>
              <button
                onClick={() => {
                  const origin = window.location.origin;
                  const url = leadId ? `${origin}/r/${leadId}` : origin;
                  if (navigator.share) {
                    void navigator.share({ title: 'Mirror', text: punchLine, url });
                    return;
                  }
                  if (navigator.clipboard) {
                    void navigator.clipboard.writeText(`"${punchLine}" — try Mirror: ${url}`);
                  }
                }}
                className="bg-white/[0.08] text-white border border-white/15 px-5 py-3.5 rounded-[14px] text-[15px] font-medium flex items-center justify-center gap-2.5 font-sans"
              >
                <Share2 size={18} /> Share my read
              </button>
            </div>

            <div className="mt-6 p-4 bg-white/[0.04] border border-dashed border-white/15 rounded-xl text-xs text-white/55 leading-relaxed font-sans">
              <strong className="text-white">What happens next:</strong> a WhatsApp message lands on{' '}
              {countryCode} {phone}. Day 1 of your 14-day reset starts tomorrow morning — designed by India&apos;s
              most-followed wellness teacher. No cost, no app to download.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
