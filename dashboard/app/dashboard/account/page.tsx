import TopBar from '@/components/TopBar';
import KpiCard from '@/components/KpiCard';
import { defaultWindow, previousWindow, getAccountTotals, getDateRange } from '@/lib/queries';
import { computeDelta } from '@/lib/deltas';
import { fmtCur, fmtNum, fmtPctRaw, fmtRatio } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AccountOverview({ searchParams }: { searchParams: { d?: string } }) {
  const days = Number(searchParams.d || 7);
  const window = defaultWindow(days);
  const prevW = previousWindow(window);

  const [curr, prev, range] = await Promise.all([
    getAccountTotals(window),
    getAccountTotals(prevW),
    getDateRange(),
  ]);

  const m = (k: string) => computeDelta(curr[k] || 0, prev[k] || 0, k, curr.impressions || 0);

  return (
    <div>
      <TopBar title="Account Overview" maxDay={range.maxDay} />
      <div className="p-5">
        <div className="text-xs text-slate-500 mb-4">
          {window.start} → {window.end} · vs prior {days}d ({prevW.start} → {prevW.end})
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Spend" value={fmtCur(curr.spend, { compact: true })} delta={m('spend')} />
          <KpiCard label="Revenue" value={fmtCur(curr.revenue, { compact: true })} delta={m('revenue')} />
          <KpiCard label="ROAS" value={fmtRatio(curr.roas)} delta={m('roas')} />
          <KpiCard label="Purchases" value={fmtNum(curr.purchases)} delta={m('purchases')} />
          <KpiCard label="AOV" value={fmtCur(curr.aov)} delta={m('aov')} />

          <KpiCard label="Impressions" value={fmtNum(curr.impressions, { compact: true })} delta={m('impressions')} />
          <KpiCard label="Reach" value={fmtNum(curr.reach, { compact: true })} delta={m('reach')} />
          <KpiCard label="Frequency" value={fmtRatio(curr.frequency)} delta={m('frequency')} />
          <KpiCard label="CPM" value={fmtCur(curr.cpm)} delta={m('cpm')} />
          <KpiCard label="CTR (link)" value={fmtPctRaw(curr.ctr_link)} delta={m('ctr_link')} />

          <KpiCard label="CTR (all)" value={fmtPctRaw(curr.ctr_all)} delta={m('ctr_all')} />
          <KpiCard label="Link clicks" value={fmtNum(curr.link_clicks, { compact: true })} delta={m('link_clicks')} />
          <KpiCard label="Outbound clicks" value={fmtNum(curr.outbound_clicks, { compact: true })} delta={m('outbound_clicks')} />
          <KpiCard label="CPC" value={fmtCur(curr.cpc)} delta={m('cpc')} />
          <KpiCard label="Cost per purchase" value={fmtCur(curr.cost_per_purchase)} delta={m('cost_per_purchase')} />

          <KpiCard label="Landing page views" value={fmtNum(curr.landing_page_views, { compact: true })} delta={m('landing_page_views')} />
          <KpiCard label="Adds to cart" value={fmtNum(curr.adds_to_cart, { compact: true })} delta={m('adds_to_cart')} />
          <KpiCard label="Checkouts initiated" value={fmtNum(curr.checkouts_initiated, { compact: true })} delta={m('checkouts_initiated')} />
          <KpiCard label="Adds payment info" value={fmtNum(curr.adds_payment_info, { compact: true })} delta={m('adds_payment_info')} />
          <KpiCard label="Purchase conv. rate" value={(curr.purchase_conv_rate * 100).toFixed(2) + '%'} />

          <KpiCard label="ATC rate" value={(curr.atc_rate * 100).toFixed(2) + '%'} />
          <KpiCard label="Checkout rate" value={(curr.checkout_rate * 100).toFixed(2) + '%'} />
          <KpiCard label="Payment info rate" value={(curr.payment_info_rate * 100).toFixed(2) + '%'} />
          <KpiCard label="Hook rate" value={fmtPctRaw(curr.hook_rate)} delta={m('hook_rate')} />
          <KpiCard label="Hold rate" value={fmtPctRaw(curr.hold_rate)} delta={m('hold_rate')} />

          <KpiCard label="Video plays" value={fmtNum(curr.video_plays, { compact: true })} delta={m('video_plays')} />
          <KpiCard label="3-sec plays" value={fmtNum(curr.video_3sec_plays, { compact: true })} delta={m('video_3sec_plays')} />
          <KpiCard label="ThruPlays" value={fmtNum(curr.thru_plays, { compact: true })} delta={m('thru_plays')} />
          <KpiCard label="Cost per ThruPlay" value={fmtCur(curr.
