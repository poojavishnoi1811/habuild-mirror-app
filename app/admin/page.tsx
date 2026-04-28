import { serverClient } from '@/lib/supabase';
import { TONES, isToneId, type ToneId } from '@/lib/tones';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: { p?: string };
};

type LeadRow = {
  id: string;
  created_at: string;
  name: string | null;
  phone: string;
  country_code: string;
  tone: string;
  whatsapp_status: string | null;
  source: string | null;
  utm_source: string | null;
  share_count: number | null;
};

const fmt = (n: number) => n.toLocaleString('en-IN');

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function PasscodeGate() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26211D] flex items-center justify-center px-5">
      <form
        method="get"
        action="/admin"
        className="bg-white rounded-2xl p-6 w-full max-w-[360px]"
        style={{ boxShadow: '0 2px 16px rgba(40,28,16,0.06)' }}
      >
        <div className="font-serif text-[20px] tracking-tight mb-4">Mirror · admin</div>
        <input
          type="password"
          name="p"
          placeholder="Passcode"
          autoFocus
          className="w-full bg-[#FAF7F0] border border-[#E8DFD2] rounded-xl p-3 text-[16px] font-sans outline-none focus:border-[#26211D] mb-3"
        />
        <button
          type="submit"
          className="w-full bg-[#26211D] text-white border-0 px-5 py-3 rounded-full text-[15px] font-medium font-sans"
        >
          Enter
        </button>
      </form>
    </div>
  );
}

export default async function Admin({ searchParams }: Props) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] text-[#26211D] flex items-center justify-center p-5 text-center font-sans">
        <div>
          <div className="font-serif text-[24px] mb-2">Admin disabled</div>
          <div className="text-[14px] text-[#73685C]">Set ADMIN_PASSCODE env var to enable.</div>
        </div>
      </div>
    );
  }
  if (searchParams.p !== expected) {
    return <PasscodeGate />;
  }

  const supa = serverClient();
  const [{ count: total }, { count: lastHour }, { data: leads }] = await Promise.all([
    supa.from('leads').select('*', { count: 'exact', head: true }),
    supa
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
    supa
      .from('leads')
      .select(
        'id, created_at, name, phone, country_code, tone, whatsapp_status, source, utm_source, share_count',
      )
      .order('created_at', { ascending: false })
      .limit(200)
      .returns<LeadRow[]>(),
  ]);

  const totalLeads = total ?? 0;
  const recent = leads ?? [];
  const intlCount = recent.filter((l) => l.country_code !== '+91').length;

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26211D]">
      <div className="max-w-[1100px] mx-auto px-5 py-8">
        <header className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <div className="font-serif text-[22px] tracking-tight">Mirror · admin</div>
          <div className="text-[12px] text-[#73685C] font-sans">
            showing latest {recent.length} · {fmt(totalLeads)} total
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat label="total leads" value={fmt(totalLeads)} />
          <Stat label="last hour" value={`+${fmt(lastHour ?? 0)}`} />
          <Stat label="intl in view" value={fmt(intlCount)} />
          <Stat
            label="ai response avg"
            value={
              recent.length > 0
                ? `${(recent.filter((l) => l.whatsapp_status === 'sent').length /
                    Math.max(recent.length, 1) *
                    100).toFixed(0)}% delivered`
                : '—'
            }
          />
        </div>

        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 2px 16px rgba(40,28,16,0.06)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] font-sans">
              <thead className="bg-[#F2EBDD] text-[#73685C] text-left">
                <tr>
                  <Th>when</Th>
                  <Th>name</Th>
                  <Th>phone</Th>
                  <Th>tone</Th>
                  <Th>WA</Th>
                  <Th>source</Th>
                  <Th>shares</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((l) => (
                  <tr key={l.id} className="border-t border-[#F2EBDD] hover:bg-[#FAF7F0]">
                    <Td className="text-[#73685C] whitespace-nowrap">{fmtTime(l.created_at)}</Td>
                    <Td>{l.name ?? '—'}</Td>
                    <Td className="whitespace-nowrap font-mono text-[12px]">
                      {l.country_code}
                      {l.phone}
                    </Td>
                    <Td>
                      <ToneTag tone={l.tone} />
                    </Td>
                    <Td>
                      <StatusTag status={l.whatsapp_status} />
                    </Td>
                    <Td className="text-[#73685C]">{l.utm_source ?? l.source ?? '—'}</Td>
                    <Td className="text-[#73685C]">{l.share_count ?? 0}</Td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-[#A99B89]">
                      No leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 16px rgba(40,28,16,0.06)' }}>
      <div className="text-[11px] uppercase tracking-wider text-[#A99B89] font-sans mb-1">{label}</div>
      <div className="font-sans font-medium text-[24px] tracking-tight text-[#26211D]">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider">{children}</th>;
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function ToneTag({ tone }: { tone: string }) {
  if (!isToneId(tone)) return <span className="text-[#A99B89]">—</span>;
  const t = TONES[tone as ToneId];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
      style={{ background: t.accent }}
    >
      {t.label}
    </span>
  );
}

function StatusTag({ status }: { status: string | null }) {
  const s = status ?? 'pending';
  const colors: Record<string, string> = {
    pending: '#A99B89',
    sent: '#73685C',
    delivered: '#16A34A',
    failed: '#DC2626',
    skipped: '#A99B89',
  };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: '#F2EBDD', color: colors[s] ?? '#73685C' }}
    >
      {s}
    </span>
  );
}
