import TopBar from '@/components/TopBar';
import DataTable, { Column } from '@/components/DataTable';
import { getAdSetBreakdown, getDateRange, windowFrom } from '@/lib/queries';
import { fmtCur, fmtNum, fmtPctRaw, fmtRatio } from '@/lib/format';

export const dynamic = 'force-dynamic';

function roasColor(v: number): string {
  if (v >= 2) return 'text-emerald-600 font-medium';
  if (v >= 1) return 'text-amber-600';
  if (v > 0) return 'text-rose-600';
  return 'text-slate-400';
}

function freqColor(v: number): string {
  if (v > 3) return 'text-rose-600 font-medium';
  if (v > 2) return 'text-amber-600';
  return 'text-slate-700';
}

export default async function AdSetsPage({ searchParams }: { searchParams: { d?: string; from?: string; to?: string } }) {
  const w = windowFrom(searchParams);
  const adsets = await getAdSetBreakdown(w);
  const range = await getDateRange();

  const renderName = (r: any) => (
    <div>
      <div className="font-medium text-slate-900 truncate max-w-xs">{r.adset_name}</div>
      <div className="text-[10px] text-slate-400 truncate max-w-xs">{r.campaign_name}</div>
    </div>
  );

  const renderRoas = (r: any) => (
    <span className={roasColor(r.roas || 0)}>{fmtRatio(r.roas)}</span>
  );

  const renderFreq = (r: any) => (
    <span className={freqColor(r.frequency || 0)}>{fmtRatio(r.frequency)}</span>
  );

  const columns: Column<any>[] = [
    { key: 'adset_name', label: 'Ad Set', render: renderName },
    { key: 'spend', label: 'Spend', align: 'right', render: (r) => fmtCur(r.spend, { compact: true }) },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtCur(r.revenue, { compact: true }) },
    { key: 'roas', label: 'ROAS', align: 'right', render: renderRoas },
    { key: 'purchases', label: 'Purchases', align: 'right', render: (r) => fmtNum(r.purchases) },
    { key: 'frequency', label: 'Freq', align: 'right', render: renderFreq },
    { key: 'ctr_link', label: 'CTR', align: 'right', render: (r) => fmtPctRaw(r.ctr_link) },
    { key: 'cpc', label: 'CPC', align: 'right', render: (r) => fmtCur(r.cpc) },
    { key: 'cpm', label: 'CPM', align: 'right', render: (r) => fmtCur(r.cpm) },
    { key: 'cost_per_purchase', label: 'CPP', align: 'right', render: (r) => fmtCur(r.cost_per_purchase) },
  ];

  return (
    <div>
      <TopBar title="Ad Sets" maxDay={range.maxDay} />
      <div className="p-5">
        <div className="text-xs text-slate-500 mb-4">{adsets.length} ad sets · {w.start} to {w.end}</div>
        <DataTable rows={adsets} columns={columns} searchKeys={['adset_name', 'campaign_name']} searchPlaceholder="Search" defaultSortKey="spend" />
      </div>
    </div>
  );
}
