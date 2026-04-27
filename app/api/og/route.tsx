import { ImageResponse } from '@vercel/og';
import { TONES, isToneId, type ToneId } from '@/lib/tones';
import { serverClient } from '@/lib/supabase';

export const runtime = 'edge';

const FALLBACK = {
  tone: 'mirror' as ToneId,
  name: '',
  punchy: 'Tell me about your day.',
};

const GENERIC_LABEL: Record<ToneId, string> = {
  roast: 'Roast me',
  mirror: 'Mirror me',
  maa: 'Maa ki Salaah',
};

type LeadRow = {
  tone: string;
  name: string | null;
  ai_response: { punchy_line?: string } | null;
};

const fetchLead = async (id: string) => {
  try {
    const { data, error } = await serverClient()
      .from('leads')
      .select('tone, name, ai_response')
      .eq('id', id)
      .single<LeadRow>();
    if (error || !data) return null;
    if (!isToneId(data.tone)) return null;
    return data;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  let tone = FALLBACK.tone;
  let name = FALLBACK.name;
  let punchy = FALLBACK.punchy;

  if (id) {
    const lead = await fetchLead(id);
    if (lead) {
      tone = lead.tone as ToneId;
      name = lead.name ?? '';
      const fromAI = lead.ai_response?.punchy_line;
      if (typeof fromAI === 'string' && fromAI.trim().length > 0) {
        punchy = fromAI;
      }
    }
  }

  const T = TONES[tone];
  const fontData = await fetch(new URL('/fonts/Newsreader-Italic.woff', request.url)).then(
    (r) => r.arrayBuffer(),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: T.cardBg,
          padding: '80px',
          position: 'relative',
          color: '#fff',
        }}
      >
        {/* Decorative circle, top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-160px',
            right: '-160px',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex',
          }}
        />
        {/* Decorative circle, bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-200px',
            left: '-200px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            fontSize: 28,
            letterSpacing: '0.18em',
            opacity: 0.78,
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          Mirror · {GENERIC_LABEL[tone]}
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'Newsreader',
              fontSize: 84,
              lineHeight: 1.18,
              fontStyle: 'italic',
              display: 'flex',
            }}
          >
            “{punchy}”
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 24,
            letterSpacing: '0.12em',
            opacity: 0.8,
          }}
        >
          <div style={{ display: 'flex' }}>— {name || 'anonymous'}</div>
          <div style={{ display: 'flex' }}>mirror.app</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 1200,
      fonts: [
        {
          name: 'Newsreader',
          data: fontData,
          style: 'italic',
          weight: 400,
        },
      ],
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  );
}
