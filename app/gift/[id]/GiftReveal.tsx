'use client';

import { useState } from 'react';
import { TONES, type ToneId } from '@/lib/tones';

type Props = {
  tone: ToneId;
  firstName: string | null;
  challengeUrl: string;
  leadId?: string;
};

export default function GiftReveal({ tone, firstName, challengeUrl, leadId }: Props) {
  const [flipped, setFlipped] = useState(false);
  const t = TONES[tone];

  const greeting = firstName ?? null;

  const finalUrl = (() => {
    try {
      const url = new URL(challengeUrl);
      url.searchParams.set('utm_source', 'mirror');
      url.searchParams.set('utm_medium', 'gift');
      if (leadId) url.searchParams.set('ref', leadId);
      return url.toString();
    } catch {
      return challengeUrl;
    }
  })();

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26211D] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        <div className="text-[12px] uppercase tracking-[0.2em] text-[#A99B89] font-sans mb-6">
          a gift, for showing up
        </div>

        <div
          className="relative w-full"
          style={{ height: 620, perspective: '1400px' }}
        >
          <div
            className="relative w-full h-full"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            <ClosedFace accent={t.accent} onClaim={() => setFlipped(true)} />
            <OpenFace
              accent={t.accent}
              greeting={greeting}
              tone={tone}
              finalUrl={finalUrl}
            />
          </div>
        </div>

        <div className="mt-8 text-[11px] text-[#A99B89] font-sans text-center">
          mirror · gift card
        </div>
      </div>
    </div>
  );
}

function ClosedFace({
  accent,
  onClaim,
}: {
  accent: string;
  onClaim: () => void;
}) {
  return (
    <div
      className="absolute inset-0 w-full h-full rounded-[28px] flex flex-col items-center justify-center text-white p-7"
      style={{
        background: accent,
        boxShadow: '0 12px 40px rgba(40,28,16,0.18)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      <div
        className="absolute left-0 right-0 mx-auto"
        style={{
          top: '46%',
          height: 34,
          background: 'rgba(255,255,255,0.18)',
          borderTop: '1px solid rgba(255,255,255,0.28)',
          borderBottom: '1px solid rgba(255,255,255,0.28)',
        }}
      />
      <div
        className="absolute top-0 bottom-0 mx-auto left-0 right-0"
        style={{
          width: 34,
          background: 'rgba(255,255,255,0.18)',
          borderLeft: '1px solid rgba(255,255,255,0.28)',
          borderRight: '1px solid rgba(255,255,255,0.28)',
        }}
      />

      <div className="relative font-serif italic text-[48px] leading-none tracking-tight mb-2">
        your gift
      </div>
      <div className="relative font-sans text-[12px] uppercase tracking-[0.25em] opacity-80 mb-10">
        sealed for you
      </div>

      <button
        onClick={onClaim}
        className="relative bg-white text-[#26211D] border-0 px-7 py-3.5 rounded-full text-[15px] font-medium font-sans cursor-pointer"
        style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}
      >
        Claim your gift →
      </button>
    </div>
  );
}

function OpenFace({
  accent,
  greeting,
  tone,
  finalUrl,
}: {
  accent: string;
  greeting: string | null;
  tone: ToneId;
  finalUrl: string;
}) {
  const promiseLine =
    tone === 'maa'
      ? 'I will give myself 14 days. Even 5 minutes counts. Maa is watching, but really — I am.'
      : tone === 'roast'
        ? 'I will give myself 14 days. Even 5 minutes counts. No more excuses, no more later.'
        : 'I will give myself 14 days. Even 5 minutes counts. I begin tomorrow.';

  return (
    <div
      className="absolute inset-0 w-full h-full rounded-[28px] bg-white flex flex-col overflow-hidden"
      style={{
        boxShadow: '0 12px 40px rgba(40,28,16,0.10)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
      }}
    >
      <div
        className="relative w-full flex-shrink-0"
        style={{ height: 220, background: '#F2EBDD' }}
      >
        <img
          src="/gift-banner.jpg"
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 90%' }}
          loading="lazy"
        />
      </div>

      <div className="p-7 pt-5 flex flex-col flex-1">
        <div className="text-[11px] uppercase tracking-[0.25em] text-[#A99B89] font-sans mb-2">
          a promise to self
        </div>

        {greeting && (
          <div className="font-serif italic text-[15px] text-[#73685C] mb-2">{greeting},</div>
        )}

        <div className="font-serif italic text-[20px] leading-snug text-[#26211D] mb-4">
          &ldquo;{promiseLine}&rdquo;
        </div>

        <div className="h-px bg-[#E8DFD2] my-2" />

        <div className="text-[13px] text-[#73685C] font-sans leading-relaxed mb-1 mt-2">
          Take the <span className="text-[#26211D] font-medium">14-day free yoga challenge</span>{' '}
          with <span className="text-[#26211D] font-medium">Habuild</span>.
        </div>
        <div className="text-[13px] text-[#73685C] font-sans leading-relaxed mb-5">
          Even a 5-minute show-up counts.
        </div>

        <a
          href={finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-white border-0 px-5 py-4 rounded-full text-[15px] font-medium font-sans no-underline mt-auto"
          style={{ background: accent }}
        >
          Yes — I&rsquo;ll do this →
        </a>

        <div className="mt-3 text-[11px] text-[#A99B89] font-sans text-center">
          starts tomorrow morning · no card needed
        </div>
      </div>
    </div>
  );
}
