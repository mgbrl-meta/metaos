"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, TrendingDown, Zap } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import { onlyLiveRows } from "@/lib/liveFilter";
import {
  GlassCard,
  MetricCard,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";

const money = (n: number) => `₹${Math.round(n || 0).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function revenueValue(row: any) {
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
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getLatestDate(rows: any[]) {
  const dates = rows.map((r) => parseDate(r.date)).filter(Boolean) as Date[];
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function windowRows(rows: any[], days: number, latestDate: Date | null) {
  if (!latestDate) return [];
  const start = new Date(latestDate);
  start.setDate(start.getDate() - days + 1);

  return rows.filter((row) => {
    const d = parseDate(row.date);
    if (!d) return false;
    return d >= start && d <= latestDate;
  });
}

function getName(row: any, key: string) {
  return String(row[key] || "").trim();
}

function inferFunnel(name: string) {
  const n = name.toLowerCase();

  if (
    n.includes("bof") ||
    n.includes("mof") ||
    n.includes("retarget") ||
    n.includes("remarket") ||
    n.includes("viewcontent") ||
    n.includes("atc") ||
    n.includes("checkout")
  ) {
    return "BOF/MOF";
  }

  if (n.includes("test") || n.includes("creative") || n.includes("collab") || n.includes("ugc")) {
    return "Test/Creative";
  }

  if (n.includes("broad") || n.includes("tof") || n.includes("prospecting")) {
    return "TOF";
  }

  if (n.includes("catalog") || n.includes("asc") || n.includes("advantage")) {
    return "Catalog/ASC";
  }

  return "Unclassified";
}

function summarize(rows: any[]) {
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const revenue = rows.reduce((s, r) => s + revenueValue(r), 0);
  const purchases = rows.reduce((s, r) => s + Number(r.purchases || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || r.linkClicks || 0), 0);
  const lpv = rows.reduce((s, r) => s + Number(r.landingPageViews || 0), 0);
  const atc = rows.reduce((s, r) => s + Number(r.addToCart || 0), 0);
  const checkout = rows.reduce((s, r) => s + Number(r.checkoutsInitiated || 0), 0);
  const addPayment = rows.reduce((s, r) => s + Number(r.addPaymentInfo || 0), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    clicks,
    lpv,
    atc,
    checkout,
    addPayment,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    ctr: safeDiv(clicks, impressions) * 100,
    clickToLpv: safeDiv(lpv, clicks) * 100,
    lpvToAtc: safeDiv(atc, lpv) * 100,
    atcToCheckout: safeDiv(checkout, atc) * 100,
    checkoutToPurchase: safeDiv(purchases, checkout) * 100,
    cvr: safeDiv(purchases, clicks) * 100,
  };
}

function aggregateBy(rows: any[], level: "campaignName" | "adSetName" | "adName") {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = getName(row, level) || "Unknown";

    if (!map.has(key)) {
      map.set(key, {
        name: key,
        campaignName: row.campaignName || "",
        adSetName: row.adSetName || "",
        adName: row.adName || "",
        rows: [],
      });
    }

    map.get(key).rows.push(row);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      ...summarize(item.rows),
      funnel: inferFunnel(`${item.name} ${item.campaignName} ${item.adSetName}`),
    }))
    .sort((a, b) => b.spend - a.spend);
}

function severity(score: number) {
  if (score >= 75) return { label: "Critical", tone: "red" as const };
  if (score >= 55) return { label: "High", tone: "yellow" as const };
  if (score >= 35) return { label: "Medium", tone: "blue" as const };
  return { label: "Controlled", tone: "green" as const };
}

function gapScore({
  spendAtRisk,
  totalSpend,
  badSignalCount,
}: {
  spendAtRisk: number;
  totalSpend: number;
  badSignalCount: number;
}) {
  const spendRisk = Math.min(70, safeDiv(spendAtRisk, totalSpend) * 100);
  const signalRisk = Math.min(30, badSignalCount * 6);
  return Math.round(spendRisk + signalRisk);
}

function confidence(row: any) {
  if (row.spend >= 100000 && row.purchases >= 30) return "High";
  if (row.spend >= 30000 && row.purchases >= 5) return "Medium";
  return "Low";
}

function actionForGap(area: string) {
  const actions: Record<string, string> = {
    "Campaign Architecture":
      "Classify every campaign/ad set into TOF, MOF, BOF, Test, Catalog or Retention. Reduce unclassified spend.",
    "Budget Misallocation":
      "Cut spend from weak/high-CPA ads and reallocate only 30–50% into proven winners. Keep the rest for next-day signal.",
    "Creative Fatigue":
      "Refresh old/high-frequency creatives. Keep winning angle but change creator, first frame, proof and format.",
    "Funnel Gap":
      "Fix the stage where users are leaking: hook, landing page, PDP, offer, checkout or tracking.",
    "Audience Hygiene":
      "Check BOF/MOF exclusions, purchaser exclusions, retargeting frequency and prospecting contamination.",
    "Measurement Quality":
      "Fix rows/events with missing revenue, missing purchases, impossible values and tracking inconsistencies.",
    "Incrementality Risk":
      "Flag retargeting-heavy and high-frequency spend. Compare Meta spend to blended revenue/MER before scaling.",
  };

  return actions[area] || "Review and fix immediately.";
}

function rootCauseFor(row: any, settings: any) {
  if (row.spend > 3000 && row.purchases === 0) {
    if (row.ctr >= settings.targetCtrPct && row.clickToLpv >= 60) {
      return "Traffic is reaching site but not converting. Likely PDP/offer/checkout gap.";
    }

    if (row.ctr < settings.targetCtrPct) {
      return "Weak hook/creative/audience fit. CTR is below target.";
    }

    return "Spend crossed threshold without purchase signal.";
  }

  if (row.ctr < settings.targetCtrPct) return "Hook or audience relevance issue.";
  if (row.clickToLpv < 60) return "Click quality or landing page load mismatch.";
  if (row.lpvToAtc < 8) return "PDP/offer/message mismatch.";
  if (row.checkoutToPurchase > 0 && row.checkoutToPurchase < 35) return "Checkout/trust/payment friction.";
  if (row.roas < settings.targetRoas) return "Economics weak despite conversion signal.";
  return "No major gap detected.";
}

export function ROIGap() {
  const { performanceRows, settings } = useMetaStore();

  const liveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);
  const latestDate = useMemo(() => getLatestDate(liveRows), [liveRows]);
  const rows7 = useMemo(() => windowRows(liveRows, 7, latestDate), [liveRows, latestDate]);
  const rows30 = useMemo(() => windowRows(liveRows, 30, latestDate), [liveRows, latestDate]);

  const data = useMemo(() => {
    const s7 = summarize(rows7);
    const campaigns = aggregateBy(rows7, "campaignName");
    const adsets = aggregateBy(rows7, "adSetName");
    const ads = aggregateBy(rows7, "adName");

    const totalSpend = s7.spend;

    const unclassifiedSpend = campaigns
      .filter((r) => r.funnel === "Unclassified")
      .reduce((s, r) => s + r.spend, 0);

    const zeroPurchaseSpend = ads
      .filter((r) => r.spend > 3000 && r.purchases === 0)
      .reduce((s, r) => s + r.spend, 0);

    const highCpaSpend = ads
      .filter((r) => r.purchases > 0 && r.cpa > settings.targetCpa * 1.25)
      .reduce((s, r) => s + r.spend, 0);

    const weakRoasSpend = ads
      .filter((r) => r.spend > 30000 && r.roas < settings.targetRoas * 0.75)
      .reduce((s, r) => s + r.spend, 0);

    const topAds = [...ads].sort((a, b) => b.spend - a.spend);
    const top1Spend = topAds[0]?.spend || 0;
    const top3Spend = topAds.slice(0, 3).reduce((s, r) => s + r.spend, 0);
    const top5Spend = topAds.slice(0, 5).reduce((s, r) => s + r.spend, 0);

    const fatigueRiskSpend = ads
      .filter((r) => Number(r.frequency || 0) > settings.maxHealthyFrequency || r.ctr < settings.targetCtrPct * 0.75)
      .reduce((s, r) => s + r.spend, 0);

    const missingRevenueRows = rows7.filter((r) => Number(r.purchases || 0) > 0 && revenueValue(r) === 0).length;
    const missingDateRows = liveRows.filter((r) => !r.date).length;
    const missingNameRows = liveRows.filter((r) => !r.adName || !r.campaignName || !r.adSetName).length;

    const gapAreas = [
      {
        area: "Campaign Architecture",
        spendAtRisk: unclassifiedSpend,
        evidence: `${num(safeDiv(unclassifiedSpend, totalSpend) * 100)}% of live spend is unclassified by funnel role.`,
        badSignalCount: campaigns.filter((r) => r.funnel === "Unclassified").length,
      },
      {
        area: "Budget Misallocation",
        spendAtRisk: zeroPurchaseSpend + highCpaSpend + weakRoasSpend,
        evidence: `${money(zeroPurchaseSpend)} zero-purchase spend, ${money(highCpaSpend)} high-CPA spend, ${money(weakRoasSpend)} weak-ROAS spend.`,
        badSignalCount: ads.filter((r) => r.spend > 3000 && (r.purchases === 0 || r.roas < settings.targetRoas * 0.75)).length,
      },
      {
        area: "Creative Fatigue",
        spendAtRisk: fatigueRiskSpend,
        evidence: `${money(fatigueRiskSpend)} spend has weak CTR/frequency risk proxy.`,
        badSignalCount: ads.filter((r) => r.ctr < settings.targetCtrPct * 0.75).length,
      },
      {
        area: "Funnel Gap",
        spendAtRisk: ads
          .filter((r) => r.clickToLpv < 60 || r.lpvToAtc < 8 || (r.checkoutToPurchase > 0 && r.checkoutToPurchase < 35))
          .reduce((s, r) => s + r.spend, 0),
        evidence: `Account: CTR ${num(s7.ctr)}%, Click→LPV ${num(s7.clickToLpv)}%, LPV→ATC ${num(s7.lpvToAtc)}%, Checkout→Purchase ${num(s7.checkoutToPurchase)}%.`,
        badSignalCount: ads.filter((r) => r.clickToLpv < 60 || r.lpvToAtc < 8).length,
      },
      {
        area: "Audience Hygiene",
        spendAtRisk: adsets
          .filter((r) => r.funnel === "BOF/MOF" && (r.cpa > settings.targetCpa || r.roas < settings.targetRoas))
          .reduce((s, r) => s + r.spend, 0),
        evidence: "Proxy check: BOF/MOF spend with poor CPA/ROAS can indicate retargeting saturation or exclusion gaps.",
        badSignalCount: adsets.filter((r) => r.funnel === "BOF/MOF" && r.roas < settings.targetRoas).length,
      },
      {
        area: "Measurement Quality",
        spendAtRisk: 0,
        evidence: `${missingRevenueRows} purchase rows have zero revenue, ${missingDateRows} rows missing date, ${missingNameRows} rows missing naming fields.`,
        badSignalCount: missingRevenueRows + missingDateRows + missingNameRows,
      },
      {
        area: "Incrementality Risk",
        spendAtRisk: adsets
          .filter((r) => r.funnel === "BOF/MOF")
          .reduce((s, r) => s + r.spend, 0),
        evidence: `${num(safeDiv(adsets.filter((r) => r.funnel === "BOF/MOF").reduce((s, r) => s + r.spend, 0), totalSpend) * 100)}% of spend is BOF/MOF proxy. Validate against blended revenue before scaling.`,
        badSignalCount: adsets.filter((r) => r.funnel === "BOF/MOF").length,
      },
    ].map((item) => {
      const score = gapScore({
        spendAtRisk: item.spendAtRisk,
        totalSpend,
        badSignalCount: item.badSignalCount,
      });
      return {
        ...item,
        score,
        severity: severity(score),
        action: actionForGap(item.area),
      };
    });

    const immediateFixes = ads
      .filter((r) => r.spend > 3000)
      .map((r) => ({
        ...r,
        rootCause: rootCauseFor(r, settings),
        confidence: confidence(r),
      }))
      .filter(
        (r) =>
          r.purchases === 0 ||
          r.roas < settings.targetRoas * 0.75 ||
          r.cpa > settings.targetCpa * 1.25 ||
          r.lpvToAtc < 8
      )
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 20);

    const winners = ads
      .filter((r) => r.spend > 3000 && r.purchases >= 5 && r.roas >= settings.targetRoas && r.cpa <= settings.targetCpa)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 12);

    return {
      s7,
      s30: summarize(rows30),
      campaigns,
      adsets,
      ads,
      gapAreas,
      immediateFixes,
      winners,
      totalSpend,
      top1Spend,
      top3Spend,
      top5Spend,
      unclassifiedSpend,
      zeroPurchaseSpend,
      highCpaSpend,
      weakRoasSpend,
    };
  }, [rows7, rows30, liveRows, settings]);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Efficiency Gaps</h2>
        <MutedText className="mt-2">
          Upload Meta data first. This audit uses live ads only.
        </MutedText>
      </GlassCard>
    );
  }

  const overallScore = Math.round(
    data.gapAreas.reduce((s, r) => s + r.score, 0) / Math.max(data.gapAreas.length, 1)
  );
  const overallSeverity = severity(overallScore);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Efficiency Gaps"
        title="Efficiency Gap Audit"
        description="Find structural gaps before the internal review: campaign architecture, budget waste, creative fatigue, funnel gap, audience hygiene, measurement gaps and incrementality risk."
      />

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <TonePill tone={overallSeverity.tone}>Gap Risk: {overallSeverity.label}</TonePill>
          <TonePill tone="blue">Last 7 Days</TonePill>
          <TonePill tone="neutral">Live Ads Only</TonePill>
        </div>

        <h2 className="mt-4 text-3xl font-black">
          Efficiency Gaps Score: {overallScore}/100
        </h2>

        <MutedText className="mt-2">
          This score converts Internal Review-style audit gaps into immediate execution priorities.
        </MutedText>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="7D Spend" value={money(data.s7.spend)} tone="neutral" />
        <MetricCard label="7D ROAS" value={num(data.s7.roas)} tone={data.s7.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label="7D CPA" value={money(data.s7.cpa)} tone={data.s7.cpa <= settings.targetCpa ? "green" : "yellow"} />
        <MetricCard label="Zero Purchase Waste" value={money(data.zeroPurchaseSpend)} tone={data.zeroPurchaseSpend > 0 ? "red" : "green"} />
        <MetricCard label="Top 1 Ad Spend Share" value={`${num(safeDiv(data.top1Spend, data.totalSpend) * 100)}%`} tone={safeDiv(data.top1Spend, data.totalSpend) > 0.3 ? "red" : "green"} />
        <MetricCard label="Top 3 Ads Spend Share" value={`${num(safeDiv(data.top3Spend, data.totalSpend) * 100)}%`} tone={safeDiv(data.top3Spend, data.totalSpend) > 0.5 ? "yellow" : "green"} />
        <MetricCard label="Unclassified Spend" value={money(data.unclassifiedSpend)} tone={data.unclassifiedSpend > data.totalSpend * 0.15 ? "yellow" : "green"} />
        <MetricCard label="Weak ROAS Spend" value={money(data.weakRoasSpend)} tone={data.weakRoasSpend > 0 ? "red" : "green"} />
      </div>

      <GlassCard className="overflow-hidden">
        <div className="border-b border-current/10 p-5">
          <h2 className="text-xl font-black">Efficiency Gaps Matrix</h2>
          <MutedText className="mt-1 text-sm">
            Every row is an audit gap converted into evidence and action.
          </MutedText>
        </div>

        <div className="grid gap-4 p-5">
          {data.gapAreas.map((row) => (
            <Surface key={row.area} className="p-4">
              <div className="grid gap-4 xl:grid-cols-[260px_120px_1fr_1fr] xl:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    {row.severity.tone === "red" ? (
                      <ShieldAlert className="h-4 w-4 text-red-400" />
                    ) : row.severity.tone === "yellow" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                    <p className="font-black">{row.area}</p>
                  </div>
                  <MutedText className="mt-2 text-xs">Spend at risk: {money(row.spendAtRisk)}</MutedText>
                </div>

                <div>
                  <TonePill tone={row.severity.tone}>{row.severity.label}</TonePill>
                  <p className="mt-2 text-sm font-black">{row.score}/100</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">
                    Evidence
                  </p>
                  <p className="mt-2 text-sm leading-6 opacity-80">{row.evidence}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">
                    Immediate Action
                  </p>
                  <p className="mt-2 text-sm leading-6 opacity-80">{row.action}</p>
                </div>
              </div>
            </Surface>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard className="overflow-hidden">
          <div className="border-b border-current/10 p-5">
            <h2 className="text-xl font-black">Immediate Fix List</h2>
            <MutedText className="mt-1 text-sm">
              Ads/ad sets Internal Review will likely flag first because spend is leaking now.
            </MutedText>
          </div>

          <div className="grid gap-3 p-5">
            {data.immediateFixes.map((row, index) => (
              <Surface key={`${row.name}-${index}`} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black leading-6 whitespace-normal break-words">{row.name}</p>
                    <MutedText className="mt-1 text-xs">
                      Spend {money(row.spend)} · ROAS {num(row.roas)} · CPA {money(row.cpa)} · Purchases {num(row.purchases, 0)}
                    </MutedText>
                  </div>
                  <TonePill tone={row.confidence === "High" ? "red" : row.confidence === "Medium" ? "yellow" : "neutral"}>
                    {row.confidence} Confidence
                  </TonePill>
                </div>

                <p className="mt-3 text-sm leading-6 opacity-80">
                  {row.rootCause}
                </p>
              </Surface>
            ))}

            {!data.immediateFixes.length && (
              <Surface className="p-4">
                <p className="font-black">No major immediate gap found.</p>
              </Surface>
            )}
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden">
          <div className="border-b border-current/10 p-5">
            <h2 className="text-xl font-black">Protect / Scale Candidates</h2>
            <MutedText className="mt-1 text-sm">
              Do not over-edit winners. Scale slowly and create variants from the same winning idea.
            </MutedText>
          </div>

          <div className="grid gap-3 p-5">
            {data.winners.map((row, index) => (
              <Surface key={`${row.name}-${index}`} className="p-4">
                <div className="flex items-start gap-3">
                  <Zap className="mt-1 h-4 w-4 text-emerald-400" />
                  <div className="min-w-0">
                    <p className="font-black leading-6 whitespace-normal break-words">{row.name}</p>
                    <MutedText className="mt-1 text-xs">
                      Spend {money(row.spend)} · ROAS {num(row.roas)} · CPA {money(row.cpa)} · Purchases {num(row.purchases, 0)}
                    </MutedText>
                    <p className="mt-3 text-sm leading-6 opacity-80">
                      Protect. Scale carefully. Build 2–3 variants using same hook, proof and offer direction.
                    </p>
                  </div>
                </div>
              </Surface>
            ))}

            {!data.winners.length && (
              <Surface className="p-4">
                <p className="font-black">No clean scale candidates yet.</p>
                <MutedText className="mt-1 text-sm">
                  Keep focus on waste control and creative production.
                </MutedText>
              </Surface>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-[#0A84FF]" />
          <h2 className="text-xl font-black">Budget Reallocation Map</h2>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Surface className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">Cut / Reduce Pool</p>
            <p className="mt-2 text-2xl font-black text-red-400">
              {money(data.zeroPurchaseSpend + data.weakRoasSpend)}
            </p>
            <p className="mt-2 text-sm opacity-70">
              From zero-purchase and weak-ROAS live ads.
            </p>
          </Surface>

          <Surface className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">Safe Reallocation Today</p>
            <p className="mt-2 text-2xl font-black text-emerald-400">
              {money((data.zeroPurchaseSpend + data.weakRoasSpend) * 0.4)}
            </p>
            <p className="mt-2 text-sm opacity-70">
              Move only 30–50% into winners. Do not overreact.
            </p>
          </Surface>

          <Surface className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">Hold as Test Reserve</p>
            <p className="mt-2 text-2xl font-black text-[#0A84FF]">
              {money((data.zeroPurchaseSpend + data.weakRoasSpend) * 0.6)}
            </p>
            <p className="mt-2 text-sm opacity-70">
              Keep reserve for tomorrow’s signal and new creative tests.
            </p>
          </Surface>
        </div>
      </GlassCard>
    </div>
  );
}
