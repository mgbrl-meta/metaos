import TopBar from '@/components/TopBar';
import DataTable, { Column } from '@/components/DataTable';
import { getAdBreakdown, getDateRange } from '@/lib/queries';
import { fmtCur, fmtNum, fmtPctRaw, fmtRatio } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getW(p: any) {
  if (p.from && p.to) return { start: p.from, end: p.to };
  const days = Number(p.d || 7);
  const end = new Date(); end.setDate(end.getDate() - 1);
  const start = new Date(end); start.setDate(start.getDate() - (days - 1));
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
}

export default async function P({ searchParams }: { searchParams: any }) {
  const w = getW(searchParams);
  const [a, range] = await Promise.all([getAdBreakdown(w), getDateRange()]);
  const cols: Column<any>[] = [
    { key: 'ad_name', label: 'Ad', render: (r) => <div><div className="font-medium truncate max-w-xs">{r.ad_name}</div><div className="text-[10px] text-slate-400 truncate max-w-xs">{r.adset_name}</div></div> },
    { key: 'spend', label: 'Spend', align: 'right', render: (r) => fmtCur(r.spend, { compact: true }) },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtCur(r.revenue, { compact: true }) },
    { key: 'roas', label: 'ROAS', align: 'right', render: (r) => fmtRatio(r.roas) },
    { key: 'purchases', label: 'Purch', align: 'right', render: (r) => fmtNum(r.purchases) },
    { key: 'ctr_link', label: 'CTR', align: 'right', render: (r) => fmtPctRaw(r.ctr_link) },
    { key: 'cpc', label: 'CPC', align: 'right', render: (r) => fmtCur(r.cpc) },
    { key: 'frequency', label: 'Freq', align: 'right', render: (r) => fmtRatio(r.frequency) },
    { key: 'hook_rate', label: 'Hook', align: 'right', render: (r) => fmtPctRaw(r.hook_rate) },
    { key: 'hold_rate', label: 'Hold', align: 'right', render: (r) => fmtPctRaw(r.hold_rate) },
  ];
  return (
    <div>
      <TopBar title="Ads" maxDay={range.maxDay} />
      <div className="p-5">
        <div className="text-xs text-slate-500 mb-4">{a.length} ads · {w.start} to {w.end}</div>
        <DataTable rows={a} columns={cols} searchKeys={['ad_name', 'adset_name', 'campaign_name']} searchPlaceholder="Search" defaultSortKey="spend" pageSize={50} />
      </div>
    </div>
  );
}
