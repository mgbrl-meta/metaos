import TopBar from '@/components/TopBar';
import DataTable, { Column } from '@/components/DataTable';
import { defaultWindow, getAdSetBreakdown, getDateRange } from '@/lib/queries';
import { fmtCur, fmtNum, fmtPctRaw, fmtRatio } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdSetsPage({ searchParams }: { searchParams: { d?: string } }) {
  const days = Number(searchParams.d || 7);
  const window = defaultWindow(days);
  const [adsets, range] = await Promise.all([
    getAdSetBreakdown(window),
    getDateRange(),
  ]);

  const columns: Column<any>[] = [
    {
      key: 'adset_name', label: 'Ad Set',
      render: r => (
        <div>
          <div className="font-medium text-slate-900 truncate max-w-xs">{r.adset_name}</div>
          <div className="text-[10px] text-slate-400 truncate max-w-xs">{r.campaign_name}</div>
        </div>
      )
    },
    { key: 'spend', label: 'Spend', align: 'right', render: r => fmtCur(r.spend, { compact: true }) },
    { key: 'revenue', label: 'Revenue', align: 'right', render: r => fmtCur(r.revenue, { compact: true }) },
    {
      key: 'roas', label: 'ROAS', align: 'right',
      render: r => {
        const v = r.roas || 0;
        const cls = v >= 2 ? 'text-emerald-600 font-medium' : v >= 1 ? 'text-amber-600' : v > 0 ? 'text-rose-600' : 'text-slate-400';
        return <span className={cls}>{fmtRatio(v)}</span>;
      }
    },
    { key: 'purchases', label: 'Purchases', align: 'right', render: r => fmtNum(r.purchases) },
    { key: 'frequency', label: 'Freq', align: 'right', render: r => {
        const v = r.frequency || 0;
        const cls = v > 3 ? 'text-rose-600 font-medium' : v > 2 ? 'text-amber-600' : 'text-slate-700';
        return <span className={cls}>{fmtRatio(v)}</span>;
      }
    },
    { key: 'ctr_link', label: 'CTR', align: 'right', render: r => fmtPctRaw(r.ctr_link) },
    { key: 'cpc', label: 'CPC', align: 'right', render: r => fmtCur(r.cpc) },
    { key: 'cpm', label: 'CPM', align: 'right', render: r => fmtCur(r.cpm) },
    { key: 'cost_per_purchase', label: 'CPP', align: 'right', render: r => fmtCur(r.cost_per_purchase) },
  ];

  return (
    <div>
      <TopBar title="Ad Sets" maxDay={range.maxDay} />
      <div className="p-5">
        <div className="text-xs text-slate-500 mb-4">
          {adsets.length} ad sets · {window.start} → {window.end}
        </div>
        <DataTable
          rows={adsets}
          columns={columns}
          searchKeys={['adset_name', 'campaign_name']}
          searchPlaceholder="Search ad sets…"
          defaultSortKey="spend"
        />
      </div>
    </div>
  );
}
