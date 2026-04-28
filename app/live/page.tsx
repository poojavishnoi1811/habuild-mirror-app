import { serverClient } from '@/lib/supabase';
import { TONE_IDS, TONES, type ToneId } from '@/lib/tones';

export const revalidate = 30; // ISR — fresh count every 30s

type ToneRow = { tone: string };
type CountryRow = { country_code: string };

const fmt = (n: number) => n.toLocaleString('en-IN');

export default async function Live() {
  const supa = serverClient();

  const [{ count: total }, { count: lastHour }, { data: toneRows }, { data: countryRows }] =
    await Promise.all([
      supa.from('leads').select('*', { count: 'exact', head: true }),
      supa
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      supa.from('leads').select('tone'),
      supa.from('leads').select('country_code'),
    ]);

  const toneCounts: Record<ToneId, number> = { roast: 0, mirror: 0, maa: 0 };
  (toneRows as ToneRow[] | null)?.forEach((r) => {
    if (r.tone in toneCounts) toneCounts[r.tone as ToneId]++;
  });

  const india = (countryRows as CountryRow[] | null)?.filter((r) => r.country_code === '+91').length ?? 0;
  const intl = ((countryRows as CountryRow[] | null)?.length ?? 0) - india;
  const intlPct = total ? Math.round((intl / total) * 100) : 0;

  const totalLeads = total ?? 0;

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#26211D]">
      <div className="max-w-[640px] mx-auto px-5 py-10 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-12">
          <div className="font-serif text-[20px] tracking-tight">Mirror</div>
          <div className="text-[12px] text-[#73685C] font-sans">live · refreshes every 30s</div>
        </header>

        <div className="fade-up flex-1 flex flex-col">
          <div className="text-[12px] uppercase tracking-wider text-[#A99B89] mb-4 font-sans">
            so far
          </div>
          <div className="font-sans font-medium text-[80px] sm:text-[112px] leading-none tracking-[-0.04em] m-0 mb-3 text-[#26211D]">
            {fmt(totalLeads)}
          </div>
          <p className="font-serif italic text-[22px] text-[#73685C] m-0 mb-12">
            people have looked in the mirror.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-10">
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 16px rgba(40,28,16,0.06)' }}>
              <div className="text-[11px] uppercase tracking-wider text-[#A99B89] font-sans mb-2">
                last hour
              </div>
              <div className="font-sans font-medium text-[36px] tracking-tight text-[#26211D]">
                +{fmt(lastHour ?? 0)}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 16px rgba(40,28,16,0.06)' }}>
              <div className="text-[11px] uppercase tracking-wider text-[#A99B89] font-sans mb-2">
                international
              </div>
              <div className="font-sans font-medium text-[36px] tracking-tight text-[#26211D]">
                {intlPct}%
              </div>
              <div className="text-[11px] text-[#73685C] font-sans mt-1">
                {fmt(intl)} intl · {fmt(india)} india
              </div>
            </div>
          </div>

          <div className="text-[12px] uppercase tracking-wider text-[#A99B89] mb-3 font-sans">
            by voice
          </div>
          <div className="flex flex-col gap-2 mb-10">
            {TONE_IDS.map((id) => {
              const tn = TONES[id];
              const count = toneCounts[id];
              const pct = totalLeads ? (count / totalLeads) * 100 : 0;
              return (
                <div
                  key={id}
                  className="bg-white rounded-2xl p-4"
                  style={{ boxShadow: '0 2px 16px rgba(40,28,16,0.06)' }}
                >
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="font-sans font-medium text-[16px] text-[#26211D]">{tn.label}</div>
                    <div className="font-sans text-[14px] text-[#73685C]">
                      {fmt(count)} · {pct.toFixed(0)}%
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F2EBDD] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: tn.accent, transition: 'width 600ms ease' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto text-[11px] text-[#A99B89] text-center font-sans">
            mirror · 30-second read · brutally honest
          </div>
        </div>
      </div>
    </div>
  );
}
