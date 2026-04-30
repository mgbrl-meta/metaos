import TopBar from '@/components/TopBar';
import DataTable, { Column } from '@/components/DataTable';
import { defaultWindow, getAdBreakdown, getLifecycle, getDateRange } from '@/lib/queries';
import { fmtCur, fmtNum, fmtPctRaw, fmtRatio } from '@/lib/format';

export const dynamic = 'force-dynamic';

const stageColor = (stage: string) => {
  const colors: Record<string, string> = {
    Peak: 'bg-emerald-100 text-emerald-700',
    Ramp: 'bg-blue-100 text-blue-700',
    Plateau: 'bg-slate-100 text-slate-700',
    Decay: 'bg-rose-100 text-rose-700',
    Reviving: 'bg-amber-100 text-amber-700',
    Paused: 'bg-slate-100 text-slate-500',
  };
  return colors[stage] || 'bg-slate-100 text-slate-500';
};

export default async function AdsPage({ searchParams }: { searchParams: { d?: string } }) {
  const days = Number(searchParams.d || 7);
  const window = defaultWindow(days);
  const [ads, lifecycle, range] = await Promise.all([
    getAdBreakdown(window),
    getLifecycle(),
    getDateRange(),
  ]);

  const lcMap = new Map<string, any>();
  for (const lc of lifecycle) lcMap.set(lc.ad_id, lc);

  const enriched = ads.map((a: any) => ({
    ...a,
    fatigue_score: lcMap.get(a.ad_id)?.fatigue_score || 0,
    performance_score: lcMap.get(a.ad_id)?.performance_score || 0,
    lifecycle_stage: lcMap.get(a.ad_id)?.lifecycle_stage || 'New',
    days_active: lcMap.get(a.ad_id)?.days_active || 0,
  }));

  const columns: Column<any>[] = [
    {
      key: 'ad_name', label: 'Ad',
      render: r => (
        <div>
          <div className="font-medium text-slate-900 truncate max-w-xs">{r.ad_name}</div>
          <div className="text-[10px] text-slate-400 truncate max-w-xs">
            {r.adset_name} · {r.campaign_name}
          </div>
        </div>
      )
    },
    {
      key: 'lifecycle_stage', label: 'Stage',
      render: r => (
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${stageColor(r.lifecycle_stage)}`}>
          {r.lifecycle_stage}
        </span>
      )
    },
    { key: 'days_active', label: 'Days', align: 'right', render: r => r.days_active },
    { key: 'spend', label: 'Spend', align: 'right', render: r => fmtCur(r.spend, { compact: true }) },
    {
      key: 'roas', label: 'ROAS', align: 'right',
      render: r => {
        const v = r.roas || 0;
        const cls = v >= 2 ? 'text-emerald-600 font-medium' : v >= 1 ? 'text-amber-600' : v > 0 ? 'text-rose-600' : 'text-slate-400';
        return <span className={cls}>{fmtRatio(v)}</span>;
      }
    },
    { key: 'purchases', label: 'Pur', align: 'right', render: r => fmtNum(r.purchases) },
    { key: 'ctr_link', label: 'CTR', align: 'right', render: r => fmtPctRaw(r.ctr_link) },
    { key: 'cpc', label: 'CPC', align: 'right', render: r => fmtCur(r.cpc) },
    { key: 'frequency', label: 'Freq', align: 'right', render: r => fmtRatio(r.frequency) },
    { key: 'hook_rate', label: 'Hook', align: 'right', render: r => fmtPctRaw(r.hook_rate) },
    { key: 'hold_rate', label: 'Hold', align: 'right', render: r => fmtPctRaw(r.hold_rate) },
    {
      key: 'performance_score', label: 'Score', align: 'right',
      render: r => {
        const s
