import { serverClient } from '@/lib/supabase';
import { isToneId, type ToneId } from '@/lib/tones';
import GiftReveal from './GiftReveal';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

const isUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export default async function GiftPage({ params }: Props) {
  const challengeUrl = process.env.NEXT_PUBLIC_HABUILD_CHALLENGE_URL ?? 'https://habit.yoga/';

  let tone: ToneId = 'mirror';
  let firstName: string | null = null;

  if (isUuid(params.id)) {
    const supa = serverClient();
    const { data: lead } = await supa
      .from('leads')
      .select('tone, name')
      .eq('id', params.id)
      .single<{ tone: string; name: string | null }>();
    if (lead && isToneId(lead.tone)) tone = lead.tone;
    if (lead?.name) firstName = lead.name.split(' ')[0] ?? null;
  }

  return (
    <GiftReveal
      tone={tone}
      firstName={firstName}
      challengeUrl={challengeUrl}
      leadId={isUuid(params.id) ? params.id : undefined}
    />
  );
}
