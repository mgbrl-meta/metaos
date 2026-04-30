import TopBar from '@/components/TopBar';
import DataTable, { Column } from '@/components/DataTable';
import { getCampaignBreakdown, getDateRange } from '@/lib/queries';
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
  const [c, range] = await Promise.all([getCampaignBreakdown(w), getDateRange()]);
  const cols: Column<any>[] = [
    { key: 'campaign_name', label: 'Campaign', render: (r) => <div><div className="font-medium truncate max-w-xs">{r.campaign_name}</div><div className="text-[10px] text-slate-400">{r.objective}</div></div> },
    { key: 'spend', label: 'Spend', align: 'right', render: (r) => fmtCur(r.spend, { compact: true }) },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => fmtCur(r.revenue, { compact: true }) },
    { key: 'roas', label: 'ROAS', align: 'right', render: (r) => fmtRatio(r.roas) },
    { key: 'purchases', label: 'Purch', align: 'right', render: (r) => fmtNum(r.purchases) },
    { key: 'ctr_link', label: 'CTR', align: 'right', render: (r) => fmtPctRaw(r.ctr_link) },
    { key: 'cpc', label: 'CPC', align: 'right', render: (r) => fmtCur(r.cpc) },
    { key: 'cpm', label: 'CPM', align: 'right', render: (r) => fmtCur(r.cpm) },
    { key: 'frequency', label: 'Freq', align: 'right', render: (r) => fmtRatio(r.frequency) },
  ];
  return (
    <div>
      <TopBar title="Campaigns" maxDay={range.maxDay} />
      <div className="p-5">
        <div className="text-xs text-slate-500 mb-4">{c.length} campaigns · {w.start} to {w.end}</div>
        <DataTable rows={c} columns={cols} searchKeys={['campaign_name', 'objective']} searchPlaceholder="Search" defaultSortKey="spend" />
      </div>
    </div>
  );
}
