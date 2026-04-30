import TopBar from '@/components/TopBar';
import KpiCard from '@/components/KpiCard';
import Sparkline from '@/components/Sparkline';
import {
  getAccountDailySeries, getAccountTotals, defaultWindow,
  getAdBreakdown, getDateRange,
} from '@/lib/queries';
import { computeDelta } from '@/lib/deltas';
import { fmtCur, fmtNum, fmtRatio, fmtDateShort } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PulsePage() {
  const range = await getDateRange();

  const yWindow = { start: range.maxDay, end: range.maxDay };
  const dayBefore = new Date(range.maxDay);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dbStr = dayBefore.toISOString().slice(0, 10);
  const yPrev = { start: dbStr, end: dbStr };

  const sparkW = defaultWindow(28);
  const w7 = defaultWindow(7);

  const [yesterday, dayBeforeData, sparkSeries, topAds] = await Promise.all([
    getAccountTotals(yWindow),
    getAccountTotals(yPrev),
    getAccountDailySeries(sparkW),
    getAdBreakdown(w7),
  ]);

  const m = (k: string) => computeDelta(yesterday[k] || 0, dayBeforeData[k] || 0, k, yesterday.impressions || 0);

  const winners = topAds.filter((a: any) => a.spend >= 500 && a.purchases > 0).sort((a: any, b: any) => b.roas - a.roas).slice(0, 5);
  const losers = topAds.filter((a: any) => a.spend >= 500 && a.purchases === 0).sort((a: any, b: any) => b.spend - a.spend).slice(0, 5);

  return (
    <div>
      <TopBar title="Morning Briefing" maxDay={range.maxDay} />
      <div className="p-5 space-y-6">
        <div>
          <div className="text-sm text-slate-500 mb-3">
            Yesterday — <span className="font-medium text-slate-700">{fmtDateShort(range.maxDay)}</span> · vs day before
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Spend" value={fmtCur(yesterday.spend, { compact: true })} delta={m('spend')} />
            <KpiCard label="Revenue" value={fmtCur(yesterday.revenue, { compact: true })} delta={m('revenue')} />
            <KpiCard label="ROAS" value={fmtRatio(yesterday.roas)} delta={m('roas')} />
            <KpiCard label="Purchases" value={fmtNum(yesterday.purchases)} delta={m('purchases')} />
            <KpiCard label="AOV" value={fmtCur(yesterday.aov)} delta={m('aov')} />
          </div>
        </div>

        <div>
          <div className="text-sm text-slate-500 mb-3">28-day trend</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SparkCard title="Spend" data={sparkSeries.map((d: any) => Number(d.spend || 0))} fmt={(v: number) => fmtCur(v, { compact: true })} />
            <SparkCard title="Revenue" data={sparkSeries.map((d: any) => Number(d.revenue || 0))} fmt={(v: number) => fmtCur(v, { compact: true })} />
            <SparkCard title="ROAS" data={sparkSeries.map((d: any) => Number(d.roas || 0))} fmt={(v: number) => fmtRatio(v)} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">Top winners (last 7d)</div>
            {winners.length === 0 ? (
              <div className="text-xs text-slate-400">No winners with meaningful spend</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {winners.map((w: any) => (
                    <tr key={w.ad_id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 truncate max-w-[200px] text-slate-900">{w.ad_name}</td>
                      <td className="py-2 text-right tabular-nums text-emerald-600 font-medium">{fmtRatio(w.roas)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-500 text-xs">{fmtCur(w.spend, { compact: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">Top losers (high spend, 0 purchases, last 7d)</div>
            {losers.length === 0 ? (
              <div className="text-xs text-slate-400">No high-spend losers</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {losers.map((l: any) => (
                    <tr key={l.ad_id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 truncate max-w-[200px] text-slate-900">{l.ad_name}</td>
                      <td className="py-2 text-right tabular-nums text-rose-600 font-medium">{fmtCur(l.spend, { compact: true })}</td>
                      <td className="py-2 text-right tabular-nums text-slate-500 text-xs">0 purchases</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SparkCard({ title, data, fmt }: { title: string; data: number[]; fmt: (v: number) => string }) {
  const last = data[data.length - 1] || 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">{title}</div>
      <div className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{fmt(last)}</div>
      <div className="mt-2">
        <Sparkline data={data} width={300} height={40} />
      </div>
    </div>
  );
}
