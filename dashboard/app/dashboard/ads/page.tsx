import TopBar from '@/components/TopBar';
import DataTable, { Column } from '@/components/DataTable';
import { defaultWindow, getAdBreakdown, getLifecycle, getDateRange } from '@/lib/queries';
import { fmtCur, fmtNum, fmtPctRaw, fmtRatio } from '@/lib/format';

export const dynamic = 'force-dynamic';

function stageColor(stage: string): string {
  if (stage === 'Peak') return 'bg-emerald-100 text-emerald-700';
  if (stage === 'Ramp') return 'bg-blue-100 text-blue-700';
  if (stage === 'Decay') return 'bg-rose-100 text-rose-700';
  if (stage === 'Reviving') return 'bg-amber-100 text-amber-700';
  if (stage === 'Paused') return 'bg-slate-100 text-slate-500';
  return 'bg-slate-100 text-slate-700';
}

function roasColor(v: number): string {
  if (v >= 2) return 'text-emerald-600 font-medium';
  if (v >= 1) return 'text-amber-600';
  if (v > 0) return 'text-rose-600';
  return 'text-slate-400';
}

function scoreColor(s: number): string {
  if (s >= 80) return 'bg-emerald-100 text-emerald-700';
  if (s >= 60) return 'bg-blue-100 text-blue-700';
  if (s >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function fatigueColor(f: number): string {
  if (f >= 70) return 'text-rose-600 font-medium';
  if (f >= 50) return 'text-amber-600';
  return 'text-slate-400';
}

export default async function AdsPage({ searchParams }: { searchParams: { d?: string } }) {
  const days = Number(searchParams.d || 7);
  const window = defaultWindow(days);
  const ads = await getAdBreakdown(window);
  const lifecycle = await getLifecycle();
  const range = await getDateRange();

  const lcMap = new Map<string, any>();
  for (const lc of lifecycle) lcMap.set(lc.ad_id, lc);

  const enriched = ads.map((a: any) => ({
    ...a,
    fatigue_score: lcMap.get(a.ad_id)?.fatigue_score || 0,
    performance_score: lcMap.get(a.ad_id)?.performance_score || 0,
    lifecycle_stage: lcMap.get(a.ad_id)?.lifecycle_stage || 'New',
    days_active: lcMap.get(a.ad_id)?.days_active || 0,
  }));

  const renderName = (r: any) => (
    <div>
      <div className="font-medium text-slate-900 truncate max-w-xs">{r.ad_name}</div>
      <div className="text-[10px] text-slate-400 truncate max-w-xs">{r.adset_name}</div>
    </div>
  );

  const renderStage = (r: any) => (
    <span className={'text-[10px] px-1.5 py-0.5 rounded ' + stageColor(r.lifecycle_stage)}>
      {r.lifecycle_stage}
    </span>
  );

  const renderRoas = (r: any) => (
    <span className={roasColor(r.roas || 0)}>{fmtRatio(r.roas)}</span>
  );

  const renderScore = (r: any) => (
    <span className={'text-[10px] px-1.5 py-0.5 rounded font-medium ' + scoreColor(r.performance_score)}>
      {r.performance_score}
    </span>
  );

  const renderFatigue = (r: any) => (
    <span className={fatigueColor(r.fatigue_score)}>{r.fatigue_score}</span>
  );

  const columns: Column<any>[] = [
    { key: 'ad_name', label: 'Ad', render: renderName },
    { key: 'lifecycle_stage', label: 'Stage', render: renderStage },
    { key: 'days_active', label: 'Days', align: 'right', render: (r) => r.days_active },
    { key: 'spend', label: 'Spend', align: 'right', render: (r) => fmtCur(r.spend, { compact: true }) },
    { key: 'roas', label: 'ROAS', align: 'right', render: renderRoas },
    { key: 'purchases', label: 'Pur', align: 'right', render: (r) => fmtNum(r.purchases) },
    { key: 'ctr_link', label: 'CTR', align: 'right', render: (r) => fmtPctRaw(r.ctr_link) },
    { key: 'cpc', label: 'CPC', align: 'right', render: (r) => fmtCur(r.cpc) },
    { key: 'frequency', label: 'Freq', align: 'right', render: (r) => fmtRatio(r.frequency) },
    { key: 'hook_rate', label: 'Hook', align: 'right', render: (r) => fmtPctRaw(r.hook_rate) },
    { key: 'hold_rate', label: 'Hold', align: 'right', render: (r) => fmtPctRaw(r.hold_rate) },
    { key: 'performance_score', label: 'Score', align: 'right', render: renderScore },
    { key: 'fatigue_score', label: 'Fatigue', align: 'right', render: renderFatigue },
  ];

  return (
    <div>
      <TopBar title="Ads" maxDay={range.maxDay} />
      <div className="p-5">
        <div className="text-xs text-slate-500 mb-4">
          {enriched.length} ads · {window.start} to {window.end}
        </div>
        <DataTable
          rows={enriched}
          columns={columns}
          searchKeys={['ad_name', 'adset_name', 'campaign_name']}
          searchPlaceholder="Search ads"
          defaultSortKey="spend"
          pageSize={50}
        />
      </div>
    </div>
  );
}
