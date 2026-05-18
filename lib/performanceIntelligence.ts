import { MetaPerformanceRow } from "@/types/meta";
import { aggregateRows } from "@/lib/metrics";
import { onlyLiveRows } from "@/lib/liveFilter";

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function getRevenueValue(row: any) {
  return Number(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.purchaseConversionValue ??
      row.purchase_conversion_value ??
      row.conversionValue ??
      row.conversion_value ??
      row["Purchases conversion value"] ??
      row["Purchase conversion value"] ??
      row["Purchase Value"] ??
      0
  );
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(value?: string) {
  if (!value) return "";
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function latestDateKey(rows: any[]) {
  const dates = rows.map((r) => parseDate(r.date)).filter(Boolean) as Date[];
  if (!dates.length) return "";

  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  return `${latest.getFullYear()}-${String(latest.getMonth() + 1).padStart(2, "0")}-${String(
    latest.getDate()
  ).padStart(2, "0")}`;
}

function rowAdKey(row: any) {
  return String(row.adId || row.adName || "").trim();
}

function inLastDays(row: any, latest: Date, days: number) {
  const d = parseDate(row.date);
  if (!d) return false;

  const start = new Date(latest);
  start.setDate(start.getDate() - days + 1);

  return d >= start && d <= latest;
}

function latestDate(rows: any[]) {
  const dates = rows.map((r) => parseDate(r.date)).filter(Boolean) as Date[];
  if (!dates.length) return new Date();
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function summarize(rows: any[]) {
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const revenue = rows.reduce((s, r) => s + getRevenueValue(r), 0);
  const purchases = rows.reduce((s, r) => s + Number(r.purchases || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || 0), 0);
  const lpv = rows.reduce((s, r) => s + Number(r.landingPageViews || 0), 0);
  const atc = rows.reduce((s, r) => s + Number(r.addToCart || 0), 0);
  const checkout = rows.reduce((s, r) => s + Number(r.checkoutInitiated || 0), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    clicks,
    lpv,
    atc,
    checkout,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    ctr: safeDiv(clicks, impressions) * 100,
    lpvRate: safeDiv(lpv, clicks) * 100,
    atcRate: safeDiv(atc, lpv) * 100,
    checkoutRate: safeDiv(checkout, atc) * 100,
    purchaseCvr: safeDiv(purchases, checkout) * 100,
  };
}

function change(current: number, base: number) {
  if (!base) return 0;
  return ((current - base) / base) * 100;
}

function buildPurchaseCpaTrend(rows: any[]) {
  const sorted = [...rows].sort((a, b) => {
    const da = parseDate(a.date)?.getTime() || 0;
    const db = parseDate(b.date)?.getTime() || 0;
    return da - db;
  });

  let cumulativeSpend = 0;
  let cumulativePurchases = 0;
  const points: { purchaseNumber: number; date: string; cpa: number; spend: number }[] = [];

  sorted.forEach((row) => {
    cumulativeSpend += Number(row.spend || 0);
    const purchases = Math.floor(Number(row.purchases || 0));

    for (let i = 0; i < purchases; i++) {
      cumulativePurchases += 1;
      points.push({
        purchaseNumber: cumulativePurchases,
        date: row.date,
        cpa: safeDiv(cumulativeSpend, cumulativePurchases),
        spend: cumulativeSpend,
      });
    }
  });

  const first = points[0]?.cpa || 0;
  const last = points[points.length - 1]?.cpa || 0;
  const improving = points.length >= 2 && last > 0 && first > 0 && last < first;

  return {
    points,
    firstPurchaseCpa: first,
    latestPurchaseCpa: last,
    improving,
    trendText:
      points.length === 0
        ? "No purchase yet"
        : points.length === 1
        ? `Only 1 purchase. CPA signal is early.`
        : improving
        ? `CPA is improving purchase-by-purchase.`
        : `CPA is not improving purchase-by-purchase.`,
  };
}

export function buildTopOperatorReport(rows: MetaPerformanceRow[], settings: any) {
  const liveStatusRows = onlyLiveRows(rows);
  const latestKey = latestDateKey(liveStatusRows);
  const latest = latestDate(liveStatusRows);

  const latestDayRows = liveStatusRows.filter((row) => dateKey(row.date) === latestKey);

  const currentlySpendingAdKeys = new Set(
    latestDayRows
      .filter((row) => Number(row.impressions || 0) > 0 || Number(row.spend || 0) > 0)
      .map(rowAdKey)
      .filter(Boolean)
  );

  const currentRows = liveStatusRows.filter((row) => currentlySpendingAdKeys.has(rowAdKey(row)));

  const l7Rows = currentRows.filter((row) => inLastDays(row, latest, 7));
  const l30Rows = currentRows.filter((row) => inLastDays(row, latest, 30));
  const l60Rows = currentRows.filter((row) => inLastDays(row, latest, 60));
  const l90Rows = currentRows.filter((row) => inLastDays(row, latest, 90));

  const l7 = summarize(l7Rows);
  const l30 = summarize(l30Rows);
  const l60 = summarize(l60Rows);
  const l90 = summarize(l90Rows);

  const ads7 = aggregateRows(l7Rows as any, "ad").filter((ad: any) =>
    currentlySpendingAdKeys.has(rowAdKey(ad))
  );

  const ads90 = aggregateRows(l90Rows as any, "ad").filter((ad: any) =>
    currentlySpendingAdKeys.has(rowAdKey(ad))
  );

  const adHistoryByKey = new Map<string, any[]>();
  currentRows.forEach((row) => {
    const key = rowAdKey(row);
    if (!adHistoryByKey.has(key)) adHistoryByKey.set(key, []);
    adHistoryByKey.get(key)!.push(row);
  });

  const enrichedAds = ads7.map((ad: any) => {
    const history = adHistoryByKey.get(rowAdKey(ad)) || [];
    const trend = buildPurchaseCpaTrend(history.filter((row) => inLastDays(row, latest, 90)));

    const historical = ads90.find((x: any) => rowAdKey(x) === rowAdKey(ad));
    const roasVs90 = historical ? change(ad.roas, historical.roas) : 0;
    const cpaVs90 = historical ? change(ad.cpa, historical.cpa) : 0;

    return {
      ...ad,
      purchaseTrend: trend,
      roasVs90,
      cpaVs90,
    };
  });

  const pause = enrichedAds
    .filter((ad: any) => ad.spend > 3000 && ad.purchases === 0)
    .sort((a: any, b: any) => b.spend - a.spend);

  const reduce = enrichedAds
    .filter(
      (ad: any) =>
        ad.purchases > 0 &&
        ad.cpa > settings.targetCpa * 1.35 &&
        !pause.some((p: any) => rowAdKey(p) === rowAdKey(ad))
    )
    .sort((a: any, b: any) => b.spend - a.spend);

  const scale = enrichedAds
    .filter(
      (ad: any) =>
        ad.spend >= settings.minSpendForDecision &&
        ad.purchases >= settings.minPurchasesForScale &&
        ad.roas >= settings.targetRoas &&
        ad.cpa <= settings.targetCpa &&
        ad.fatigueScore < 60 &&
        !pause.some((p: any) => rowAdKey(p) === rowAdKey(ad)) &&
        !reduce.some((r: any) => rowAdKey(r) === rowAdKey(ad))
    )
    .sort((a: any, b: any) => {
      if (a.purchaseTrend.improving && !b.purchaseTrend.improving) return -1;
      if (!a.purchaseTrend.improving && b.purchaseTrend.improving) return 1;
      return b.roas - a.roas;
    });

  const refresh = enrichedAds
    .filter(
      (ad: any) =>
        (ad.fatigueScore >= 70 || (ad.frequency > settings.maxHealthyFrequency && ad.purchases > 0)) &&
        !pause.some((p: any) => rowAdKey(p) === rowAdKey(ad)) &&
        !scale.some((s: any) => rowAdKey(s) === rowAdKey(ad))
    )
    .sort((a: any, b: any) => b.fatigueScore - a.fatigueScore);

  const improve = enrichedAds
    .filter(
      (ad: any) =>
        ad.spend >= 1000 &&
        ad.purchases > 0 &&
        ad.roas < settings.targetRoas &&
        ad.cpa <= settings.targetCpa * 1.25 &&
        !pause.some((p: any) => rowAdKey(p) === rowAdKey(ad)) &&
        !reduce.some((r: any) => rowAdKey(r) === rowAdKey(ad))
    )
    .sort((a: any, b: any) => b.spend - a.spend);

  const watch = enrichedAds
    .filter(
      (ad: any) =>
        !pause.some((x: any) => rowAdKey(x) === rowAdKey(ad)) &&
        !reduce.some((x: any) => rowAdKey(x) === rowAdKey(ad)) &&
        !scale.some((x: any) => rowAdKey(x) === rowAdKey(ad)) &&
        !refresh.some((x: any) => rowAdKey(x) === rowAdKey(ad)) &&
        !improve.some((x: any) => rowAdKey(x) === rowAdKey(ad))
    )
    .sort((a: any, b: any) => b.spend - a.spend);

  const wastedSpend = pause.reduce((s: number, ad: any) => s + ad.spend, 0);

  const funnelIssue =
    l7.ctr < settings.targetCtrPct
      ? "Creative hook is weak. CTR is below benchmark."
      : l7.lpvRate < settings.targetClickToLpvRatePct
      ? "Traffic quality or landing page load is weak."
      : l7.atcRate < settings.targetLpvToAtcRatePct
      ? "PDP / offer is not converting enough visitors into ATC."
      : l7.checkoutRate < settings.targetAtcToCheckoutRatePct
      ? "Checkout intent or trust is weak."
      : l7.purchaseCvr < settings.targetCheckoutToPurchaseRatePct
      ? "Payment / final conversion is leaking."
      : "No major funnel leak detected.";

  const decision =
    pause.length > 0
      ? "CUT WASTE BEFORE SCALE"
      : scale.length > 0 && l7.roas >= settings.targetRoas && l7.cpa <= settings.targetCpa
      ? "CONTROLLED SCALE"
      : refresh.length > 0
      ? "REFRESH BEFORE SCALE"
      : "HOLD AND IMPROVE SIGNAL";

  const priority =
    pause.length > 0
      ? `Cut ${pause.length} live wasting ads and recover ${wastedSpend.toFixed(0)} spend first.`
      : scale.length > 0
      ? `Scale ${scale.length} live winners by 5–10%, prioritising improving CPA creatives.`
      : refresh.length > 0
      ? `Refresh ${refresh.length} fatigued creatives before adding budget.`
      : `Hold budget. Improve signal quality before scale.`;

  return {
    latestKey,
    latestDayRows,
    liveStatusRows,
    currentRows,
    currentlySpendingAdKeys,
    l7,
    l30,
    l60,
    l90,
    roasVs30: change(l7.roas, l30.roas),
    cpaVs30: change(l7.cpa, l30.cpa),
    roasVs90: change(l7.roas, l90.roas),
    cpaVs90: change(l7.cpa, l90.cpa),
    ads: enrichedAds,
    pause,
    reduce,
    scale,
    refresh,
    improve,
    watch,
    wastedSpend,
    funnelIssue,
    decision,
    priority,
  };
}
