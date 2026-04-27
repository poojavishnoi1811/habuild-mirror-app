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
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: T.bg, color: '#fff' }}
    >
      <div className="grain pointer-events-none fixed inset-0" />

      <div className="max-w-[520px] mx-auto px-5 py-6 pb-12 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-8">
          <div className="font-mono text-[13px] uppercase tracking-[0.1em] text-white/55">
            Mirror
          </div>
          <div
            className="font-mono text-[11px] uppercase tracking-[0.1em]"
            style={{ color: T.accent }}
          >
            shared with you
          </div>
        </header>

        <div className="fade-up flex-1 flex flex-col">
          <h1 className="font-serif text-[36px] leading-[1.1] tracking-[-0.02em] m-0 mb-6">
            {name} just got{' '}
            <em style={{ color: T.accent }}>{T.label.toLowerCase()}</em>.
          </h1>

          <div
            className="rounded-2xl p-6 mb-6 bg-white/[0.04] border border-white/10 relative overflow-hidden"
          >
            <p className="font-serif italic text-[22px] leading-snug m-0">
              &ldquo;{punchy}&rdquo;
            </p>
            <p className="font-mono text-[10px] tracking-[0.12em] mt-4 m-0 opacity-60">
              — {name}
            </p>
          </div>

          <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/45 mb-3">
            ↓ their share card
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/og?id=${lead.id}`}
            alt={`Mirror result by ${name}`}
            width={1200}
            height={1200}
            className="w-full rounded-2xl mb-8"
            style={{ aspectRatio: '1 / 1' }}
          />

          <div className="rounded-2xl p-5 mb-3" style={{ background: T.accent }}>
            <div className="font-mono text-[11px] uppercase tracking-[0.1em] opacity-85 mb-2">
              Want yours?
            </div>
            <div className="font-serif text-xl leading-snug">
              30 seconds. Type your day. Hear yourself, differently.
            </div>
          </div>

          <Link
            href={`/?ref=${lead.id}`}
            className="text-center bg-white text-black border-0 px-6 py-4 rounded-[14px] text-base font-semibold font-sans"
            style={{ color: T.bg }}
          >
            Get my read →
          </Link>

          <div className="mt-8 font-mono text-[10px] text-white/30 text-center">
            built in 48 hours · brutally honest · share-worthy
          </div>
        </div>
      </div>
    </div>
  );
}
