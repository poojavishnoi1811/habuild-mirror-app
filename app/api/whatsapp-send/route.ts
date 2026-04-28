import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase';
import { sendWatiTemplate } from '@/lib/whatsapp';
import { GIFT_MESSAGES, giftLinkFor } from '@/lib/whatsapp-messages';
import { isToneId } from '@/lib/tones';

export const runtime = 'edge';

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

type LeadFetch = {
  id: string;
  country_code: string;
  phone: string;
  tone: string;
  whatsapp_status: string | null;
};

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
  const { data: lead, error: fetchErr } = await supa
    .from('leads')
    .select('id, country_code, phone, tone, whatsapp_status')
    .eq('id', leadId)
    .single<LeadFetch>();

  if (fetchErr || !lead) {
    return NextResponse.json({ error: 'lead not found' }, { status: 404 });
  }

  if (lead.whatsapp_status === 'sent' || lead.whatsapp_status === 'delivered') {
    return NextResponse.json({ ok: true, skipped: 'already sent' });
  }

  if (!isToneId(lead.tone)) {
    await supa.from('leads').update({ whatsapp_status: 'failed' }).eq('id', lead.id);
    return NextResponse.json({ error: 'invalid tone on lead' }, { status: 400 });
  }

  const message = GIFT_MESSAGES[lead.tone];
  const giftLink = giftLinkFor(lead.id);

  const result = await sendWatiTemplate({
    countryCode: lead.country_code,
    phone: lead.phone,
    templateName: message.templateName,
    parameters: [{ name: '1', value: giftLink }],
  });

  if (!result.ok) {
    await supa.from('leads').update({ whatsapp_status: 'failed' }).eq('id', lead.id);
    console.error('[whatsapp-send] failed:', result.error, result.status);
    return NextResponse.json(
      { error: result.error, status: result.status ?? null },
      { status: 502 },
    );
  }

  await supa.from('leads').update({ whatsapp_status: 'sent' }).eq('id', lead.id);
  return NextResponse.json({ ok: true });
}
