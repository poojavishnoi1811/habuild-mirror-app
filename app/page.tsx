'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Flame,
  Sparkles,
  Heart,
  Phone,
  ArrowRight,
  ArrowLeft,
  Share2,
  RotateCcw,
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

const splitFix = (reflection: string, fixLine: string) => ({
  body: reflection.trim(),
  fix: fixLine.trim(),
});

// Soft Pinterest-style elevation. Used on every card and key input.
const CARD_SHADOW = '0 2px 16px rgba(40,28,16,0.06)';

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
      setError('Something went wrong saving. Try again.');
      return;
    }

    setLeadId(data.id);
    setScreen('result');
  };

  const trackShare = (channel: 'whatsapp' | 'native_share' | 'copy_link') => {
    if (!leadId) return;
    void fetch('/api/share-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, channel }),
    }).catch(() => {});
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

  const goBack = () => {
    setError(null);
    if (screen === 'input') setScreen('tone');
    else if (screen === 'tease') setScreen('input');
    else if (screen === 'capture') setScreen('tease');
  };

  const canGoBack = screen === 'input' || screen === 'tease' || screen === 'capture';
  const showRestart = screen !== 'tone';

  const { body, fix } = aiResponse
    ? splitFix(aiResponse.reflection, aiResponse.fix_line)
    : { body: '', fix: '' };

  const punchLine = aiResponse?.punchy_line ?? '';
  const teaseText = body.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26211D]">
      <div className="max-w-[520px] mx-auto px-5 py-6 pb-12 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-10">
          {canGoBack ? (
            <button
              onClick={goBack}
              aria-label="Go back"
              className="text-[12px] text-[#73685C] border border-[#E8DFD2] rounded-full pl-2.5 pr-3 py-1.5 flex items-center gap-1.5 hover:bg-[#F2EBDD] transition-colors font-sans"
            >
              <ArrowLeft size={14} /> back
            </button>
          ) : (
            <div className="font-serif text-[20px] tracking-tight text-[#26211D]">Mirror</div>
          )}
          {showRestart ? (
            <button
              onClick={reset}
              className="text-[12px] text-[#73685C] border border-[#E8DFD2] rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-[#F2EBDD] transition-colors font-sans"
            >
              <RotateCcw size={11} /> restart
            </button>
          ) : (
            <div />
          )}
        </header>

        {/* SCREEN: TONE */}
        {screen === 'tone' && (
          <div className="fade-up flex-1 flex flex-col">
            <div className="mt-2 mb-10">
              <h1 className="font-sans font-medium text-[42px] sm:text-[52px] leading-[1.06] tracking-[-0.025em] m-0 mb-5 text-[#26211D]">
                Tell me about your day.
              </h1>
              <p className="font-serif italic text-[20px] sm:text-[22px] text-[#73685C] leading-snug m-0 mb-3">
                I&apos;ll tell you something true.
              </p>
              <p className="font-sans text-[14px] text-[#A99B89] m-0">
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
                    className="fade-up bg-white border border-transparent rounded-3xl p-5 text-left text-[#26211D] flex items-center gap-4 transition-all hover:-translate-y-0.5 font-sans"
                    style={{ animationDelay: `${i * 80}ms`, boxShadow: CARD_SHADOW }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tn.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: tn.accent }}
                    >
                      <Icon size={22} color="#fff" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <div
                        className="text-[26px] leading-tight mb-1 text-[#26211D] tracking-tight"
                        style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
                      >
                        {tn.label}
                      </div>
                      <div className="text-[13px] text-[#73685C]">
                        {tn.sub} · ages {tn.age}
                      </div>
                    </div>
                    <ArrowRight size={18} color="#A99B89" />
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-10 text-[12px] text-[#A99B89]">
              30-second read · brutally honest · share-worthy
            </div>
          </div>
        )}

        {/* SCREEN: INPUT */}
        {screen === 'input' && T && (
          <div className="fade-up flex-1 flex flex-col">
            <div className="mb-6">
              <div className="text-[12px] mb-3 font-sans" style={{ color: T.accent }}>
                — {T.label.toLowerCase()}
              </div>
              <h2 className="font-sans font-medium text-[30px] leading-[1.12] tracking-tight m-0 mb-3 text-[#26211D]">
                Type your day.
              </h2>{/* spacer */}
              <p className="font-sans text-[14px] text-[#73685C] leading-relaxed m-0">
                Wake time, food, work, screens, sleep. The more honest, the sharper the read.
              </p>
            </div>

            <textarea
              value={dayInput}
              onChange={(e) => setDayInput(e.target.value)}
              placeholder={T.placeholder}
              rows={8}
              className="w-full bg-white border border-[#E8DFD2] rounded-2xl p-[18px] text-[#26211D] placeholder:text-[#A99B89] text-[16px] leading-relaxed font-sans resize-none outline-none mb-3 transition-colors focus:border-[var(--tone-accent)]"
              style={{ ['--tone-accent' as never]: T.accent, boxShadow: CARD_SHADOW }}
            />

            <div className="text-[12px] text-[#A99B89] mb-5 font-sans">
              {dayInput.length} chars ·{' '}
              {dayInput.trim().length < MIN_INPUT ? 'give me more to work with' : 'good'}
            </div>

            {error && (
              <div className="text-[13px] mb-3 font-sans" style={{ color: T.accent }}>
                {error}
              </div>
            )}

            <button
              onClick={callAI}
              disabled={dayInput.trim().length < MIN_INPUT}
              className="border-0 px-6 py-4 rounded-full text-base font-semibold flex items-center justify-center gap-2.5 transition-all font-sans disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: T.accent, color: '#fff' }}
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
            <div className="font-sans font-medium text-[26px] leading-tight mb-3 text-[#26211D] tracking-tight">
              {T.loadingMessages[loadingMsgIdx]}…
            </div>
            <div className="text-[12px] text-[#A99B89] font-sans">this takes about 10 seconds</div>
          </div>
        )}

        {/* SCREEN: TEASE */}
        {screen === 'tease' && T && (
          <div className="fade-up flex-1 flex flex-col">
            <div className="text-[12px] mb-4 font-sans" style={{ color: T.accent }}>
              — {T.label.toLowerCase()} · partial
            </div>

            <div
              className="bg-white border border-[#E8DFD2] rounded-2xl p-6 mb-6 relative"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <p className="font-serif text-[22px] leading-snug m-0 italic text-[#26211D]">
                &ldquo;{teaseText}&rdquo;
              </p>

              <div
                className="mt-5 pt-5 border-t border-dashed border-[#E8DFD2] select-none pointer-events-none opacity-60 font-serif text-[#A99B89]"
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

            <div
              className="rounded-2xl p-5 mb-5 text-white"
              style={{ background: T.accent, boxShadow: CARD_SHADOW }}
            >
              <div className="text-[12px] opacity-90 mb-2 font-sans uppercase tracking-wider">Unlock the rest</div>
              <div className="font-sans font-medium text-[20px] leading-snug">
                See your full read + claim your gift.
              </div>
            </div>

            <button
              onClick={() => setScreen('capture')}
              className="bg-[#26211D] text-white border-0 px-6 py-4 rounded-full text-base font-semibold flex items-center justify-center gap-2.5 font-sans hover:bg-black transition-colors"
            >
              <Phone size={18} /> Unlock my full read
            </button>
          </div>
        )}

        {/* SCREEN: CAPTURE */}
        {screen === 'capture' && T && (
          <div className="fade-up flex-1 flex flex-col">
            <div className="mb-6">
              <div className="text-[12px] mb-3 font-sans" style={{ color: T.accent }}>
                — one step left
              </div>
              <h2 className="font-sans font-medium text-[30px] leading-[1.12] tracking-tight m-0 text-[#26211D]">
                Almost there.
              </h2>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="given-name"
                className="w-full bg-white border border-[#E8DFD2] rounded-[14px] p-4 text-[#26211D] placeholder:text-[#A99B89] text-[16px] font-sans outline-none transition-colors focus:border-[var(--tone-accent)]"
                style={{ ['--tone-accent' as never]: T.accent, boxShadow: CARD_SHADOW }}
              />
              <div className="flex gap-2 w-full">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Country code"
                  className="shrink-0 w-[96px] bg-white border border-[#E8DFD2] rounded-[14px] py-4 px-2 text-[#26211D] text-[16px] font-sans outline-none appearance-none text-center"
                  style={{ boxShadow: CARD_SHADOW }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
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
                  className="flex-1 min-w-0 bg-white border border-[#E8DFD2] rounded-[14px] p-4 text-[#26211D] placeholder:text-[#A99B89] text-[16px] font-sans outline-none transition-colors focus:border-[var(--tone-accent)]"
                  style={{ ['--tone-accent' as never]: T.accent, boxShadow: CARD_SHADOW }}
                />
              </div>
            </div>

            {error && (
              <div className="text-[13px] mb-3 font-sans" style={{ color: T.accent }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmitInfo}
              disabled={submitting}
              className="border-0 px-6 py-4 rounded-full text-base font-semibold flex items-center justify-center gap-2.5 font-sans mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: T.accent, color: '#fff' }}
            >
              <ArrowRight size={18} /> {submitting ? 'Unlocking…' : 'Show me my full read'}
            </button>
            <div className="text-[11px] text-[#A99B89] text-center font-sans">
              we won&apos;t share your number
            </div>
          </div>
        )}

        {/* SCREEN: RESULT */}
        {screen === 'result' && T && aiResponse && (
          <div className="fade-up flex-1 flex flex-col">
            <div className="text-[12px] mb-4 font-sans" style={{ color: T.accent }}>
              — {T.label.toLowerCase()} · full read
            </div>

            <div
              className="bg-white border border-[#E8DFD2] rounded-2xl p-6 mb-5"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <p className="font-serif text-[18px] leading-relaxed m-0 whitespace-pre-wrap text-[#26211D]">
                {body}
              </p>
              {fix && (
                <p
                  className="font-serif text-[17px] leading-snug mt-5 pt-5 font-medium"
                  style={{ borderTop: `2px solid ${T.accent}`, color: T.accent }}
                >
                  {fix}
                </p>
              )}
            </div>

            <div className="text-[11px] text-[#A99B89] mb-2 font-sans">↓ your share card</div>
            <div
              ref={cardRef}
              className="rounded-[20px] p-7 mb-6 relative overflow-hidden flex flex-col justify-between text-white"
              style={{ background: T.cardBg, aspectRatio: '1 / 1', boxShadow: CARD_SHADOW }}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />

              <div className="text-[12px] tracking-[0.05em] opacity-80 relative z-10 font-sans">
                Mirror · {T.label}
              </div>

              <div className="relative z-10">
                <p className="font-serif text-2xl leading-snug m-0 italic">
                  &ldquo;{punchLine}&rdquo;
                </p>
              </div>

              <div className="relative z-10 flex justify-between items-end font-sans text-[11px] opacity-80">
                <div>— {name || 'anonymous'}</div>
                <div>mirror.app</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {leadId && (
                <a
                  href={`/gift/${leadId}`}
                  className="text-white border-0 px-5 py-4 rounded-full text-[15px] font-medium flex items-center justify-center gap-2.5 font-sans no-underline"
                  style={{ background: T.accent, boxShadow: CARD_SHADOW }}
                >
                  Open your gift →
                </a>
              )}
              <button
                onClick={async () => {
                  const origin = window.location.origin;
                  const url = leadId ? `${origin}/r/${leadId}` : origin;
                  const text = `"${punchLine}" — try Mirror: ${url}`;

                  if (leadId && typeof navigator !== 'undefined' && 'canShare' in navigator) {
                    try {
                      const res = await fetch(`/api/og?id=${leadId}`);
                      if (res.ok) {
                        const blob = await res.blob();
                        const file = new File([blob], 'mirror.png', { type: 'image/png' });
                        if (navigator.canShare({ files: [file] })) {
                          trackShare('native_share');
                          await navigator.share({ files: [file], text });
                          return;
                        }
                      }
                    } catch {
                      // fall through
                    }
                  }

                  if (navigator.share) {
                    trackShare('native_share');
                    void navigator.share({ title: 'Mirror', text: punchLine, url });
                    return;
                  }
                  if (navigator.clipboard) {
                    trackShare('copy_link');
                    void navigator.clipboard.writeText(text);
                  }
                }}
                className="bg-white text-[#26211D] border border-[#E8DFD2] px-5 py-3.5 rounded-full text-[15px] font-medium flex items-center justify-center gap-2.5 font-sans"
                style={{ boxShadow: CARD_SHADOW }}
              >
                <Share2 size={18} /> Share my read
              </button>
            </div>

            <div className="mt-6 p-4 bg-[#F2EBDD] border border-dashed border-[#E8DFD2] rounded-xl text-[12px] text-[#73685C] leading-relaxed font-sans">
              A real morning practice, designed by India&apos;s most-followed wellness teacher. No
              cost, no app to download.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
