import { serverClient } from '@/lib/supabase';

export const revalidate = 30;

const fmt = (n: number) => n.toLocaleString('en-IN');

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default async function Database() {
  const trackerUrl = process.env.NEXT_PUBLIC_TRACKER_URL ?? '';

  const supa = serverClient();
  const [{ count: total }, { count: lastHour }, { count: claimed }, { data: latest }] =
    await Promise.all([
      supa.from('leads').select('*', { count: 'exact', head: true }),
      supa
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      supa
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .not('claim_clicked_at', 'is', null),
      supa
        .from('leads')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ created_at: string }>(),
    ]);

  const totalLeads = total ?? 0;
  const claimRate = totalLeads > 0 ? Math.round(((claimed ?? 0) / totalLeads) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26211D]">
      <div className="max-w-[640px] mx-auto px-5 py-10 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-12">
          <div className="font-serif text-[20px] tracking-tight">Mirror · database</div>
          <div className="text-[12px] text-[#73685C] font-sans">refreshes every 30s</div>
        </header>

        <div className="fade-up flex-1 flex flex-col">
          <div className="text-[12px] uppercase tracking-wider text-[#A99B89] mb-4 font-sans">
            signups
          </div>
          <div className="font-sans font-medium text-[80px] sm:text-[112px] leading-none tracking-[-0.04em] m-0 mb-3 text-[#26211D]">
            {fmt(totalLeads)}
          </div>
          <p className="font-serif italic text-[22px] text-[#73685C] m-0 mb-12">
            every signup logged in the shared tracker.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-10">
            <Stat label="last hour" value={`+${fmt(lastHour ?? 0)}`} />
            <Stat
              label="claim rate"
              value={totalLeads > 0 ? `${claimRate}%` : '—'}
              sub={totalLeads > 0 ? `${fmt(claimed ?? 0)} claimed` : undefined}
            />
          </div>

          {latest && (
            <div className="text-[12px] text-[#73685C] font-sans mb-10">
              most recent: <span className="text-[#26211D]">{fmtTime(latest.created_at)}</span> IST
            </div>
          )}

          {trackerUrl ? (
            <a
              href={trackerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-[#26211D] text-white border-0 px-6 py-4 rounded-full text-[15px] font-medium font-sans no-underline"
              style={{ boxShadow: '0 2px 16px rgba(40,28,16,0.12)' }}
            >
              Open shared tracker →
            </a>
          ) : (
            <div
              className="block w-full text-center bg-[#E8DFD2] text-[#A99B89] px-6 py-4 rounded-full text-[15px] font-medium font-sans cursor-not-allowed"
              aria-disabled="true"
            >
              tracker link — ships saturday
            </div>
          )}

          <div className="mt-auto pt-10 text-[11px] text-[#A99B89] text-center font-sans">
            mirror · database snapshot
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="bg-white rounded-2xl p-5"
      style={{ boxShadow: '0 2px 16px rgba(40,28,16,0.06)' }}
    >
      <div className="text-[11px] uppercase tracking-wider text-[#A99B89] font-sans mb-2">
        {label}
      </div>
      <div className="font-sans font-medium text-[36px] tracking-tight text-[#26211D]">
        {value}
      </div>
      {sub && <div className="text-[11px] text-[#73685C] font-sans mt-1">{sub}</div>}
    </div>
  );
}
