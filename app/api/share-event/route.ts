import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase';

export const runtime = 'edge';

const ALLOWED_CHANNELS = ['whatsapp', 'instagram', 'twitter', 'copy_link', 'native_share'] as const;
type Channel = (typeof ALLOWED_CHANNELS)[number];

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const isChannel = (v: unknown): v is Channel =>
  typeof v === 'string' && (ALLOWED_CHANNELS as readonly string[]).includes(v);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { leadId, channel } = (body ?? {}) as { leadId?: unknown; channel?: unknown };
  if (!isUuid(leadId)) return NextResponse.json({ error: 'leadId must be a uuid' }, { status: 400 });
  if (!isChannel(channel)) return NextResponse.json({ error: 'invalid channel' }, { status: 400 });

  const supa = serverClient();

  const { error: insertErr } = await supa
    .from('share_events')
    .insert({ lead_id: leadId, channel });
  if (insertErr) {
    console.error('[share-event] insert failed:', insertErr);
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }

  // Best-effort increment. Race-condition-tolerant for v1 (off-by-one acceptable).
  const { data: lead } = await supa
    .from('leads')
    .select('share_count')
    .eq('id', leadId)
    .single<{ share_count: number | null }>();
  const next = (lead?.share_count ?? 0) + 1;
  await supa.from('leads').update({ share_count: next }).eq('id', leadId);

  return NextResponse.json({ ok: true });
}
