import { serverClient } from '@/lib/supabase';

export const revalidate = 30;

type LatestLead = {
  id: string;
  created_at: string;
  name: string | null;
  phone: string;
  country_code: string;
};

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
  const [{ count: total }, { count: lastHour }, { data: phoneRows }, { data: latest }] =
    await Promise.all([
      supa.from('leads').select('*', { count: 'exact', head: true }),
      supa
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      supa
        .from('leads')
        .select('full_phone, claim_clicked_at, country_code')
        .returns<
          {
            full_phone: string;
            claim_clicked_at: string | null;
            country_code: string;
          }[]
        >(),
      supa
        .from('leads')
        .select('id, created_at, name, phone, country_code')
        .order('created_at', { ascending: false })
        .limit(500)
        .returns<LatestLead[]>(),
    ]);

  const totalLeads = total ?? 0;
  const phones = phoneRows ?? [];
  const distinctSignups = new Set(phones.map((p) => p.full_phone)).size;
  const distinctClaimers = new Set(
    phones.filter((p) => p.claim_clicked_at).map((p) => p.full_phone),
  ).size;
  const claimRate =
    distinctSignups > 0 ? Math.round((distinctClaimers / distinctSignups) * 100) : 0;
  const indiaSignups = new Set(
    phones.filter((p) => p.country_code === '+91').map((p) => p.full_phone),
  ).size;
  const intlSignups = distinctSignups - indiaSignups;
  const intlPct = distinctSignups > 0 ? Math.round((intlSignups / distinctSignups) * 100) : 0;

  // Dedupe by phone, keep the most recent entry per number, cap at 100.
  const seen = new Set<string>();
  const recent: LatestLead[] = [];
  for (const l of latest ?? []) {
    const key = l.country_code + l.phone;
    if (seen.has(key)) continue;
    seen.add(key);
    recent.push(l);
    if (recent.length >= 100) break;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26211D]">
      <div className="max-w-[820px] mx-auto px-5 py-10 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-12">
          <div className="font-serif text-[20px] tracking-tight">Mirror · database</div>
          <div className="text-[12px] text-[#73685C] font-sans">refreshes every 30s</div>
        </header>

        <div className="fade-up flex-1 flex flex-col">
          <div className="text-[12px] uppercase tracking-wider text-[#A99B89] mb-4 font-sans">
            distinct signups
          </div>
          <div className="font-sans font-medium text-[80px] sm:text-[112px] leading-none tracking-[-0.04em] m-0 mb-3 text-[#26211D]">
            {fmt(distinctSignups)}
          </div>
          <p className="font-serif italic text-[22px] text-[#73685C] m-0 mb-2">
            every signup logged in the shared tracker.
          </p>
          {totalLeads > distinctSignups && (
            <p className="text-[12px] text-[#A99B89] font-sans mb-12">
              {fmt(totalLeads)} total submissions ({fmt(totalLeads - distinctSignups)} repeats)
            </p>
          )}
          {totalLeads === distinctSignups && <div className="mb-12" />}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <Stat label="last hour" value={`+${fmt(lastHour ?? 0)}`} />
            <Stat
              label="claim rate"
              value={distinctSignups > 0 ? `${claimRate}%` : '—'}
              sub={
                distinctSignups > 0
                  ? `${fmt(distinctClaimers)} of ${fmt(distinctSignups)}`
                  : undefined
              }
            />
            <Stat
              label="origin"
              value={distinctSignups > 0 ? `${intlPct}% intl` : '—'}
              sub={
                distinctSignups > 0
                  ? `${fmt(indiaSignups)} india · ${fmt(intlSignups)} intl`
                  : undefined
              }
            />
          </div>

          {recent.length > 0 && (
            <div
              className="bg-white rounded-2xl overflow-hidden mb-8"
              style={{ boxShadow: '0 2px 16px rgba(40,28,16,0.06)' }}
            >
              <div className="flex justify-between items-center px-5 py-3 border-b border-[#F2EBDD]">
                <div className="text-[12px] uppercase tracking-wider text-[#73685C] font-sans">
                  recent signups (distinct)
                </div>
                <div className="text-[11px] text-[#A99B89] font-sans">
                  showing {fmt(recent.length)} of {fmt(distinctSignups)}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] font-sans">
                  <thead className="bg-[#FAF7F0] text-[#73685C] text-left">
                    <tr>
                      <Th>when</Th>
                      <Th>name</Th>
                      <Th>phone</Th>
                      <Th>origin</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((l) => (
                      <tr key={l.id} className="border-t border-[#F2EBDD]">
                        <Td className="text-[#73685C] whitespace-nowrap">{fmtTime(l.created_at)}</Td>
                        <Td>{l.name ?? '—'}</Td>
                        <Td className="whitespace-nowrap font-mono text-[12px]">
                          {l.country_code} {l.phone}
                        </Td>
                        <Td>
                          <OriginTag countryCode={l.country_code} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
      <div className="font-sans font-medium text-[28px] sm:text-[32px] tracking-tight text-[#26211D]">
        {value}
      </div>
      {sub && <div className="text-[11px] text-[#73685C] font-sans mt-1">{sub}</div>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider">{children}</th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function OriginTag({ countryCode }: { countryCode: string }) {
  const isIndia = countryCode === '+91';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{
        background: isIndia ? '#FFF7E6' : '#F0F4FF',
        color: isIndia ? '#B45309' : '#3730A3',
      }}
    >
      {isIndia ? '🇮🇳 india' : `🌐 intl ${countryCode}`}
    </span>
  );
}
