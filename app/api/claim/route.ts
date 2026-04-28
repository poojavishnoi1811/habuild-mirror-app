import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase';

export const runtime = 'edge';

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { leadId } = (body ?? {}) as { leadId?: unknown };
  if (!isUuid(leadId)) {
    return NextResponse.json({ error: 'leadId must be a uuid' }, { status: 400 });
  }

  const supa = serverClient();
  const { error } = await supa
    .from('leads')
    .update({ claim_clicked_at: new Date().toISOString() })
    .eq('id', leadId)
    .is('claim_clicked_at', null);

  if (error) {
    console.error('[claim] update failed:', error);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
