import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { serverClient } from '@/lib/supabase';
import { TONES, isToneId, type ToneId } from '@/lib/tones';

type Props = { params: { id: string } };

type LeadRow = {
  id: string;
  name: string | null;
  tone: string;
  ai_response: { punchy_line?: string; reflection?: string } | null;
};

const CARD_SHADOW = '0 2px 16px rgba(40,28,16,0.06)';

const fetchLead = async (id: string): Promise<LeadRow | null> => {
  try {
    const { data, error } = await serverClient()
      .from('leads')
      .select('id, name, tone, ai_response')
      .eq('id', id)
      .single<LeadRow>();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lead = await fetchLead(params.id);
  const punchy = lead?.ai_response?.punchy_line ?? 'See your day, differently.';
  const ogUrl = `/api/og?id=${params.id}`;
  return {
    title: 'Mirror — someone shared their read',
    description: punchy,
    openGraph: {
      title: 'Mirror',
      description: punchy,
      images: [{ url: ogUrl, width: 1200, height: 1200 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Mirror',
      description: punchy,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const lead = await fetchLead(params.id);
  if (!lead || !isToneId(lead.tone)) notFound();

  const tone = lead.tone as ToneId;
  const T = TONES[tone];
  const punchy = lead.ai_response?.punchy_line ?? '';
  const name = lead.name ?? 'anonymous';

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26211D]">
      <div className="max-w-[520px] mx-auto px-5 py-6 pb-12 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-10">
          <div className="font-serif text-[20px] tracking-tight">Mirror</div>
          <div className="text-[12px] font-sans" style={{ color: T.accent }}>
            shared with you
          </div>
        </header>

        <div className="fade-up flex-1 flex flex-col">
          <h1 className="font-sans font-bold text-[36px] leading-[1.1] tracking-[-0.025em] m-0 mb-6 text-[#26211D]">
            {name} just got{' '}
            <em className="font-serif italic font-normal" style={{ color: T.accent }}>
              {T.label.toLowerCase()}
            </em>
            .
          </h1>

          <div
            className="rounded-2xl p-6 mb-6 bg-white border border-[#E8DFD2]"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <p className="font-serif italic text-[22px] leading-snug m-0 text-[#26211D]">
              &ldquo;{punchy}&rdquo;
            </p>
            <p className="text-[11px] mt-4 m-0 text-[#A99B89] font-sans">— {name}</p>
          </div>

          <div className="text-[11px] text-[#A99B89] mb-2 font-sans">↓ their share card</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/og?id=${lead.id}`}
            alt={`Mirror result by ${name}`}
            width={1200}
            height={1200}
            className="w-full rounded-2xl mb-8"
            style={{ aspectRatio: '1 / 1', boxShadow: CARD_SHADOW }}
          />

          <div
            className="rounded-3xl p-5 mb-3 text-white"
            style={{ background: T.accent, boxShadow: CARD_SHADOW }}
          >
            <div className="text-[12px] opacity-90 mb-2 font-sans uppercase tracking-wider">Want yours?</div>
            <div className="font-sans font-bold text-[20px] leading-snug">
              30 seconds. Type your day. Hear yourself, differently.
            </div>
          </div>

          <Link
            href={`/?ref=${lead.id}`}
            className="text-center bg-[#26211D] text-white border-0 px-6 py-4 rounded-full text-base font-semibold font-sans hover:bg-black transition-colors"
            style={{ boxShadow: CARD_SHADOW }}
          >
            Get my read →
          </Link>

          <div className="mt-10 text-[11px] text-[#A99B89] text-center font-sans">
            built in 48 hours · brutally honest · share-worthy
          </div>
        </div>
      </div>
    </div>
  );
}
