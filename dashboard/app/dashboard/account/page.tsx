import TopBar from '@/components/TopBar';
import KpiCard from '@/components/KpiCard';
import { defaultWindow, previousWindow, getAccountTotals, getDateRange } from '@/lib/queries';
import { computeDelta } from '@/lib/deltas';
import { fmtCur, fmtNum, fmtPctRaw, fmtRatio } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AccountOverview({ searchParams }: { searchParams: { d?: string } }) {
  const days = Number(searchParams.d || 7);
  const w = defaultWindow(days);
  const pw = previousWindow(w);
  const curr = await getAccountTotals(w);
  const prev = await getAccountTotals(pw);
  const range = await getDateRange();

  const d = (k: string) => computeDelta(curr[k] || 0, prev[k] || 0, k, curr.impressions || 0);

  return (
    <div>
      <TopBar title="Account Overview" maxDay={range.maxDay} />
      <div className="p-5">
        <div className="text-xs text-slate-500 mb-4">
          {w.start} to {w.end}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Spend" value={fmtCur(curr.spend, { compact: true })} delta={d('spend')} />
          <KpiCard label="Revenue" value={fmtCur(curr.revenue, { compact: true })} delta={d('revenue')} />
          <KpiCard label="ROAS" value={fmtRatio(curr.roas)} delta={d('roas')} />
          <KpiCard label="Purchases" value={fmtNum(curr.purchases)} delta={d('purchases')} />
          <KpiCard label="AOV" value={fmtCur(curr.aov)} delta={d('aov')} />
          <KpiCard label="Impressions" value={fmtNum(curr.impressions, { compact: true })} delta={d('impressions')} />
          <KpiCard label="Reach" value={fmtNum(curr.reach, { compact: true })} delta={d('reach')} />
          <KpiCard label="Frequency" value={fmtRatio(curr.frequency)} delta={d('frequency')} />
          <KpiCard label="CPM" value={fmtCur(curr.cpm)} delta={d('cpm')} />
          <KpiCard label="CTR link" value={fmtPctRaw(curr.ctr_link)} delta={d('ctr_link')} />
          <KpiCard label="CTR all" value={fmtPctRaw(curr.ctr_all)} delta={d('ctr_all')} />
          <KpiCard label="Link clicks" value={fmtNum(curr.link_clicks, { compact: true })} delta={d('link_clicks')} />
          <KpiCard label="CPC" value={fmtCur(curr.cpc)} delta={d('cpc')} />
          <KpiCard label="Cost per purchase" value={fmtCur(curr.cost_per_purchase)} delta={d('cost_per_purchase')} />
          <KpiCard label="LPV" value={fmtNum(curr.landing_page_views, { compact: true })} delta={d('landing_page_views')} />
          <KpiCard label="ATC" value={fmtNum(curr.adds_to_cart, { compact: true })} delta={d('adds_to_cart')} />
          <KpiCard label="Checkouts" value={fmtNum(curr.checkouts_initiated, { compact: true })} delta={d('checkouts_initiated')} />
          <KpiCard label="Hook rate" value={fmtPctRaw(curr.hook_rate)} delta={d('hook_rate')} />
          <KpiCard label="Hold rate" value={fmtPctRaw(curr.hold_rate)} delta={d('hold_rate')} />
          <KpiCard label="ThruPlays" value={fmtNum(curr.thru_plays, { compact: true })} delta={d('thru_plays')} />
        </div>
      </div>
    </div>
  );
}
