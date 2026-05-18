import { MetaNormalizedRow, MetaPerformanceRow, MetaSettings } from "@/types/meta";
import { getDecision } from "@/lib/decisions";
import {
  getEfficiencyScore,
  getFatigueScore,
  getFunnelHealthScore,
  getScaleScore,
  getWasteScore,
} from "@/lib/scoring";

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export function enrichRows(
  rows: MetaNormalizedRow[],
  settings: MetaSettings
): MetaPerformanceRow[] {
  return rows.map((row) => {
    const roas = safeDiv(row.revenue, row.spend);
    const cpa = safeDiv(row.spend, row.purchases);
    const aov = safeDiv(row.revenue, row.purchases);
    const ctr = safeDiv(row.clicks, row.impressions) * 100;
    const cpc = safeDiv(row.spend, row.clicks);
    const cpm = safeDiv(row.spend * 1000, row.impressions);
    const lpvRate = safeDiv(row.landingPageViews, row.linkClicks || row.clicks) * 100;
    const atcRate = safeDiv(row.addToCart, row.landingPageViews) * 100;
    const checkoutRate = safeDiv(row.checkoutInitiated, row.addToCart) * 100;
    const purchaseCvr = safeDiv(row.purchases, row.landingPageViews) * 100;
    const contributionAfterAds =
      row.revenue * (settings.grossMarginPct / 100) - row.spend;

    const base = {
      ...row,
      roas,
      cpa,
      aov,
      ctr,
      cpc,
      cpm,
      lpvRate,
      atcRate,
      checkoutRate,
      purchaseCvr,
      contributionAfterAds,
    };

    const scaleScore = getScaleScore(base, settings);
    const wasteScore = getWasteScore(base, settings);
    const fatigueScore = getFatigueScore(base, settings);
    const funnelHealthScore = getFunnelHealthScore(base, settings);
    const efficiencyScore = getEfficiencyScore(base, settings);

    const decision = getDecision(
      {
        ...base,
        scaleScore,
        wasteScore,
        fatigueScore,
        funnelHealthScore,
        efficiencyScore,
      },
      settings
    );

    return {
      ...base,
      scaleScore,
      wasteScore,
      fatigueScore,
      funnelHealthScore,
      efficiencyScore,
      ...decision,
    };
  });
}

export function aggregateRows(
  rows: MetaPerformanceRow[],
  level: "campaign" | "adset" | "ad"
): MetaPerformanceRow[] {
  const map = new Map<string, MetaPerformanceRow[]>();

  rows.forEach((row) => {
    const key =
      level === "campaign"
        ? row.campaignName
        : level === "adset"
        ? `${row.campaignName} / ${row.adSetName}`
        : `${row.campaignName} / ${row.adSetName} / ${row.adName}`;

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries()).map(([key, group]) => {
    const first = group[0];

    const spend = group.reduce((s, r) => s + r.spend, 0);
    const revenue = group.reduce((s, r) => s + r.revenue, 0);
    const purchases = group.reduce((s, r) => s + r.purchases, 0);
    const impressions = group.reduce((s, r) => s + r.impressions, 0);
    const reach = group.reduce((s, r) => s + r.reach, 0);
    const clicks = group.reduce((s, r) => s + r.clicks, 0);
    const linkClicks = group.reduce((s, r) => s + r.linkClicks, 0);
    const landingPageViews = group.reduce((s, r) => s + r.landingPageViews, 0);
    const contentViews = group.reduce((s, r) => s + r.contentViews, 0);
    const addToCart = group.reduce((s, r) => s + r.addToCart, 0);
    const checkoutInitiated = group.reduce((s, r) => s + r.checkoutInitiated, 0);
    const paymentInfo = group.reduce((s, r) => s + r.paymentInfo, 0);

    const roas = safeDiv(revenue, spend);
    const cpa = safeDiv(spend, purchases);
    const aov = safeDiv(revenue, purchases);
    const ctr = safeDiv(clicks, impressions) * 100;
    const cpc = safeDiv(spend, clicks);
    const cpm = safeDiv(spend * 1000, impressions);
    const lpvRate = safeDiv(landingPageViews, linkClicks || clicks) * 100;
    const atcRate = safeDiv(addToCart, landingPageViews) * 100;
    const checkoutRate = safeDiv(checkoutInitiated, addToCart) * 100;
    const purchaseCvr = safeDiv(purchases, landingPageViews) * 100;

    return {
      ...first,
      campaignName: level === "campaign" ? key : first.campaignName,
      adSetName: level === "adset" ? key : first.adSetName,
      adName: level === "ad" ? key : first.adName,
      spend,
      revenue,
      purchases,
      impressions,
      reach,
      frequency: safeDiv(impressions, reach),
      clicks,
      linkClicks,
      landingPageViews,
      contentViews,
      addToCart,
      checkoutInitiated,
      paymentInfo,
      roas,
      cpa,
      aov,
      ctr,
      cpc,
      cpm,
      lpvRate,
      atcRate,
      checkoutRate,
      purchaseCvr,
      contributionAfterAds: group.reduce((s, r) => s + r.contributionAfterAds, 0),
      scaleScore: Math.round(group.reduce((s, r) => s + r.scaleScore, 0) / group.length),
      wasteScore: Math.round(group.reduce((s, r) => s + r.wasteScore, 0) / group.length),
      fatigueScore: Math.round(group.reduce((s, r) => s + r.fatigueScore, 0) / group.length),
      funnelHealthScore: Math.round(group.reduce((s, r) => s + r.funnelHealthScore, 0) / group.length),
      efficiencyScore: Math.round(group.reduce((s, r) => s + r.efficiencyScore, 0) / group.length),
      decision: first.decision,
      reason: first.reason,
      action: first.action,
      risk: first.risk,
    };
  });
}
