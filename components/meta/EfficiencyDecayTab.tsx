"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Filter, ShieldAlert } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";

type Row = Record<string, any>;
type DecayFilter = "all" | "cpa" | "roas" | "attention" | "scale";

type DecaySettings = {
  cpaDecayPct: number;
  roasDecayPct: number;
  ctrDecayPct: number;
  cpmRisePct: number;
  minLast7Spend: number;
  minLast7Purchases: number;
  minLifetimePurchases: number;
  minLast7Impressions: number;
  scaleSpendIncreasePct: number;
  scaleCpaWorsePct: number;
  scaleRoasDropPct: number;
};

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 1) => `${num(Number(n || 0) * 100, d)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function getRowsFromStore(store: any): Row[] {
  return (
    store.rows ||
    store.metaRows ||
    store.rawRows ||
    store.data ||
    store.sheetRows ||
    store.metaData ||
    []
  );
}

function getDate(row: Row) {
  const raw = String(row.date ?? row.day ?? row.Day ?? row.Date ?? row["Reporting starts"] ?? "").trim();
  if (!raw) return "";

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return raw.slice(0, 10);
}

function getAdId(row: Row) {
  return String(row.ad_id ?? row.adId ?? row.Ad_ID ?? row["Ad ID"] ?? row.adName ?? row.ad_name ?? row.Ad_name ?? "").trim();
}

function getAdName(row: Row) {
  return String(row.ad_name ?? row.adName ?? row.Ad_name ?? row["Ad name"] ?? row.Creative_Name_ ?? "Untitled Creative");
}

function getCampaign(row: Row) {
  return String(row.campaign_name ?? row.campaignName ?? row.Campaign_name ?? row["Campaign name"] ?? "Unknown Campaign");
}

function getAdSet(row: Row) {
  return String(row.adset_name ?? row.adSetName ?? row.Ad_set_name ?? row["Ad set name"] ?? "Unknown Ad Set");
}

function getSpend(row: Row) {
  return Number(row.spend ?? row.amountSpent ?? row.amount_spent ?? row.Amount_spent__INR_ ?? row["Amount spent (INR)"] ?? 0);
}

function getRevenue(row: Row) {
  return Number(
    row.revenue ??
      row.purchaseValue ??
      row.purchase_value ??
      row.Purchases_conversion_value ??
      row["Purchases conversion value"] ??
      0
  );
}

function getPurchases(row: Row) {
  return Number(row.purchases ?? row.Purchases ?? 0);
}

function getImpressions(row: Row) {
  return Number(row.impressions ?? row.Impressions ?? 0);
}

function getReach(row: Row) {
  return Number(row.reach ?? row.Reach ?? 0);
}

function getClicks(row: Row) {
  return Number(
    row.clicks ??
      row.linkClicks ??
      row.link_clicks ??
      row.Link_clicks ??
      row.outboundClicks ??
      row.outbound_clicks ??
      row.Outbound_clicks ??
      row["Link clicks"] ??
      row["Clicks (all)"] ??
      0
  );
}

function getVideo3s(row: Row) {
  return Number(row.three_second_video_plays ?? row._3_second_video_plays ?? row["_3_second_video_plays"] ?? 0);
}

function summarize(rows: Row[]) {
  const spend = rows.reduce((s, r) => s + getSpend(r), 0);
  const revenue = rows.reduce((s, r) => s + getRevenue(r), 0);
  const purchases = rows.reduce((s, r) => s + getPurchases(r), 0);
  const impressions = rows.reduce((s, r) => s + getImpressions(r), 0);
  const reach = rows.reduce((s, r) => s + getReach(r), 0);
  const clicks = rows.reduce((s, r) => s + getClicks(r), 0);
  const video3s = rows.reduce((s, r) => s + getVideo3s(r), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    reach,
    clicks,
    video3s,
    cpa: safeDiv(spend, purchases),
    roas: safeDiv(revenue, spend),
    aov: safeDiv(revenue, purchases),
    ctr: safeDiv(clicks, impressions),
    cpm: safeDiv(spend * 1000, impressions),
    frequency: safeDiv(impressions, reach),
    hookRate: safeDiv(video3s, impressions),
  };
}

function changePct(current: number, base: number) {
  if (!base) return 0;
  return (current - base) / base;
}

function toneClass(tone: "red" | "green" | "amber" | "neutral") {
  if (tone === "red") return "text-red-600 dark:text-red-300";
  if (tone === "green") return "text-emerald-600 dark:text-emerald-300";
  if (tone === "amber") return "text-orange-600 dark:text-orange-300";
  return "";
}

function buildEfficiencyRows(rows: Row[], settings: DecaySettings) {
  const allDates = Array.from(new Set(rows.map(getDate).filter(Boolean))).sort();
  const latestDate = allDates[allDates.length - 1] || "";
  const last7Dates = new Set(allDates.slice(-7));
  const prev7Dates = new Set(allDates.slice(-14, -7));

  const activeAdIds = new Set(
    rows
      .filter((row) => getDate(row) === latestDate && getSpend(row) > 0)
      .map(getAdId)
      .filter(Boolean)
  );

  const grouped = new Map<string, Row[]>();

  rows.forEach((row) => {
    const adId = getAdId(row);
    if (!adId || !activeAdIds.has(adId)) return;

    if (!grouped.has(adId)) grouped.set(adId, []);
    grouped.get(adId)!.push(row);
  });

  return Array.from(grouped.entries())
    .map(([adId, adRows]) => {
      const lifetime = summarize(adRows);
      const last7 = summarize(adRows.filter((row) => last7Dates.has(getDate(row))));
      const prev7 = summarize(adRows.filter((row) => prev7Dates.has(getDate(row))));
      const yesterday = summarize(adRows.filter((row) => getDate(row) === latestDate));

      const cpaChange = changePct(last7.cpa, lifetime.cpa);
      const roasChange = changePct(last7.roas, lifetime.roas);
      const ctrChange = changePct(last7.ctr, lifetime.ctr);
      const cpmChange = changePct(last7.cpm, lifetime.cpm);

      const spendChange7d = changePct(last7.spend, prev7.spend);
      const cpaChange7d = changePct(last7.cpa, prev7.cpa);
      const roasChange7d = changePct(last7.roas, prev7.roas);

      const cpaDecayMultiplier = 1 + settings.cpaDecayPct / 100;
      const roasDecayMultiplier = 1 - settings.roasDecayPct / 100;
      const ctrDecayMultiplier = 1 - settings.ctrDecayPct / 100;
      const cpmRiseMultiplier = 1 + settings.cpmRisePct / 100;

      const scaleSpendMultiplier = 1 + settings.scaleSpendIncreasePct / 100;
      const scaleCpaMultiplier = 1 + settings.scaleCpaWorsePct / 100;
      const scaleRoasMultiplier = 1 - settings.scaleRoasDropPct / 100;

      const isCpaDecay =
        last7.spend >= settings.minLast7Spend &&
        last7.purchases >= settings.minLast7Purchases &&
        lifetime.purchases >= settings.minLifetimePurchases &&
        lifetime.cpa > 0 &&
        last7.cpa >= lifetime.cpa * cpaDecayMultiplier;

      const isRoasDecay =
        last7.spend >= settings.minLast7Spend &&
        lifetime.roas > 0 &&
        last7.roas <= lifetime.roas * roasDecayMultiplier;

      const isAttentionDecay =
        last7.impressions >= settings.minLast7Impressions &&
        lifetime.ctr > 0 &&
        lifetime.cpm > 0 &&
        last7.ctr <= lifetime.ctr * ctrDecayMultiplier &&
        last7.cpm >= lifetime.cpm * cpmRiseMultiplier;

      const isScaleFatigue =
        prev7.spend > 0 &&
        last7.spend >= prev7.spend * scaleSpendMultiplier &&
        (
          (prev7.cpa > 0 && last7.cpa >= prev7.cpa * scaleCpaMultiplier) ||
          (prev7.roas > 0 && last7.roas <= prev7.roas * scaleRoasMultiplier)
        );

      const tags = [
        isCpaDecay ? "CPA Decay" : null,
        isRoasDecay ? "ROAS Decay" : null,
        isAttentionDecay ? "Attention Decay" : null,
        isScaleFatigue ? "Scale Fatigue" : null,
      ].filter(Boolean) as string[];

      const severity =
        (isCpaDecay ? 30 : 0) +
        (isRoasDecay ? 30 : 0) +
        (isAttentionDecay ? 20 : 0) +
        (isScaleFatigue ? 25 : 0) +
        Math.min(25, last7.spend / 1000);

      let recommendation = "Watch";
      if (isCpaDecay && isRoasDecay && last7.spend >= 2000) recommendation = "Reduce / Refresh";
      if (isAttentionDecay && !isCpaDecay) recommendation = "Refresh Creative";
      if (isScaleFatigue) recommendation = "Stop Scaling";
      if (isCpaDecay && isRoasDecay && isScaleFatigue) recommendation = "Pause / Rebuild";

      return {
        key: adId,
        adId,
        adName: getAdName(adRows[0]),
        campaign: getCampaign(adRows[0]),
        adSet: getAdSet(adRows[0]),
        latestDate,
        lifetime,
        last7,
        prev7,
        yesterday,
        cpaChange,
        roasChange,
        ctrChange,
        cpmChange,
        spendChange7d,
        cpaChange7d,
        roasChange7d,
        isCpaDecay,
        isRoasDecay,
        isAttentionDecay,
        isScaleFatigue,
        tags,
        severity,
        recommendation,
      };
    })
    .filter((item) => item.tags.length > 0)
    .sort((a, b) => b.severity - a.severity);
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "red" | "green" | "amber" | "neutral" }) {
  return (
    <div className="min-w-[86px]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-1 text-sm font-black ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

function Tag({ children, tone = "red" }: { children: string; tone?: "red" | "amber" | "blue" }) {
  const cls =
    tone === "blue"
      ? "border-[#0A84FF]/30 bg-[#0A84FF]/10 text-[#0A84FF]"
      : tone === "amber"
        ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
        : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${cls}`}>
      {children}
    </span>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "red" | "green" | "amber" | "neutral" }) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.025] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-1 text-xl font-black ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

function InfoBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.025] p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] opacity-60">{title}</p>
      <ul className="mt-2 space-y-1 text-sm opacity-80">
        {lines.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </div>
  );
}


function SettingInput({
  label,
  value,
  onChange,
  suffix = "%",
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
}) {
  return (
    <label className="rounded-xl border border-current/10 bg-current/[0.025] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          className="w-full rounded-lg border border-current/10 bg-transparent px-2 py-1.5 text-sm font-black outline-none"
        />
        <span className="text-xs font-black opacity-55">{suffix}</span>
      </div>
    </label>
  );
}


export function EfficiencyDecayTab() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [filter, setFilter] = useState<DecayFilter>("all");

  const [settings, setSettings] = useState<DecaySettings>({
    cpaDecayPct: 30,
    roasDecayPct: 25,
    ctrDecayPct: 20,
    cpmRisePct: 15,
    minLast7Spend: 1000,
    minLast7Purchases: 1,
    minLifetimePurchases: 3,
    minLast7Impressions: 2000,
    scaleSpendIncreasePct: 10,
    scaleCpaWorsePct: 10,
    scaleRoasDropPct: 10,
  });

  function updateSetting(key: keyof DecaySettings, value: number) {
    setSettings((current) => ({
      ...current,
      [key]: Math.max(0, value),
    }));
  }

  const data = useMemo(() => {
    const items = buildEfficiencyRows(rows, settings);

    return {
      items,
      latest: items[0]?.latestDate || "",
      cpaDecay: items.filter((x) => x.isCpaDecay).length,
      roasDecay: items.filter((x) => x.isRoasDecay).length,
      attentionDecay: items.filter((x) => x.isAttentionDecay).length,
      scaleFatigue: items.filter((x) => x.isScaleFatigue).length,
      spendAtRisk: items.reduce((s, x) => s + x.last7.spend, 0),
    };
  }, [rows, settings]);

  const visibleItems = useMemo(() => {
    if (filter === "cpa") return data.items.filter((x) => x.isCpaDecay);
    if (filter === "roas") return data.items.filter((x) => x.isRoasDecay);
    if (filter === "attention") return data.items.filter((x) => x.isAttentionDecay);
    if (filter === "scale") return data.items.filter((x) => x.isScaleFatigue);
    return data.items;
  }, [data.items, filter]);

  const filterButtons: { key: DecayFilter; label: string; count: number }[] = [
    { key: "all", label: "All Critical", count: data.items.length },
    { key: "cpa", label: "CPA Decay", count: data.cpaDecay },
    { key: "roas", label: "ROAS Decay", count: data.roasDecay },
    { key: "attention", label: "Attention Decay", count: data.attentionDecay },
    { key: "scale", label: "Scale Fatigue", count: data.scaleFatigue },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-500">Early Warning System</p>
            </div>
            <h1 className="mt-1 text-2xl font-black">Efficiency Decay</h1>
            <p className="mt-1 max-w-4xl text-sm opacity-60">
              Finds active creatives where last 7D performance is weaker than historical performance. Use this before the ad becomes obvious waste in High CPA.
            </p>
          </div>

          <div className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
            Latest {data.latest || "NA"}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <Kpi label="Critical Ads" value={String(data.items.length)} tone={data.items.length ? "red" : "green"} />
          <Kpi label="CPA Decay" value={String(data.cpaDecay)} tone={data.cpaDecay ? "red" : "green"} />
          <Kpi label="ROAS Decay" value={String(data.roasDecay)} tone={data.roasDecay ? "red" : "green"} />
          <Kpi label="Attention Decay" value={String(data.attentionDecay)} tone={data.attentionDecay ? "amber" : "green"} />
          <Kpi label="7D Spend At Risk" value={money(data.spendAtRisk)} tone={data.spendAtRisk ? "red" : "green"} />
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black">Dynamic Decay Rules</h2>
            <p className="mt-1 text-sm opacity-60">
              Change thresholds and the action queue updates instantly. Use stricter values for high-confidence action, lower values for early warning.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSettings({
                cpaDecayPct: 30,
                roasDecayPct: 25,
                ctrDecayPct: 20,
                cpmRisePct: 15,
                minLast7Spend: 1000,
                minLast7Purchases: 1,
                minLifetimePurchases: 3,
                minLast7Impressions: 2000,
                scaleSpendIncreasePct: 10,
                scaleCpaWorsePct: 10,
                scaleRoasDropPct: 10,
              })
            }
            className="rounded-full border border-current/10 px-3 py-1.5 text-xs font-black"
          >
            Reset Defaults
          </button>
        </div>

        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <SettingInput label="CPA Decay" value={settings.cpaDecayPct} onChange={(v) => updateSetting("cpaDecayPct", v)} />
          <SettingInput label="ROAS Decay" value={settings.roasDecayPct} onChange={(v) => updateSetting("roasDecayPct", v)} />
          <SettingInput label="CTR Decay" value={settings.ctrDecayPct} onChange={(v) => updateSetting("ctrDecayPct", v)} />
          <SettingInput label="CPM Rise" value={settings.cpmRisePct} onChange={(v) => updateSetting("cpmRisePct", v)} />
          <SettingInput label="Min 7D Spend" value={settings.minLast7Spend} onChange={(v) => updateSetting("minLast7Spend", v)} suffix="₹" step={500} />
          <SettingInput label="Min 7D Purch." value={settings.minLast7Purchases} onChange={(v) => updateSetting("minLast7Purchases", v)} suffix="orders" step={1} />
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-3 xl:grid-cols-4">
          <SettingInput label="Min Lifetime Purch." value={settings.minLifetimePurchases} onChange={(v) => updateSetting("minLifetimePurchases", v)} suffix="orders" step={1} />
          <SettingInput label="Min 7D Impr." value={settings.minLast7Impressions} onChange={(v) => updateSetting("minLast7Impressions", v)} suffix="impr." step={500} />
          <SettingInput label="Scale Spend Up" value={settings.scaleSpendIncreasePct} onChange={(v) => updateSetting("scaleSpendIncreasePct", v)} />
          <SettingInput label="Scale CPA Worse" value={settings.scaleCpaWorsePct} onChange={(v) => updateSetting("scaleCpaWorsePct", v)} />
          <SettingInput label="Scale ROAS Drop" value={settings.scaleRoasDropPct} onChange={(v) => updateSetting("scaleRoasDropPct", v)} />
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#0A84FF]" />
          <h2 className="text-lg font-black">Decay Filters</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={() => setFilter(button.key)}
              className={
                filter === button.key
                  ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-xs font-black text-white"
                  : "rounded-full border border-current/10 px-3 py-1.5 text-xs font-black"
              }
            >
              {button.label} · {button.count}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">Decay Action Queue</h2>
          <p className="mt-1 text-sm opacity-60">
            Sorted by severity and recent spend, so the highest-risk active creatives appear first.
          </p>
        </div>

        <div className="divide-y divide-current/10">
          {visibleItems.map((item) => (
            <details key={item.key} className="group">
              <summary className="creative-summary-row cursor-pointer list-none px-4 py-3 text-xs hover:bg-current/[0.035]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isCpaDecay ? <Tag>CPA Decay</Tag> : null}
                    {item.isRoasDecay ? <Tag>ROAS Decay</Tag> : null}
                    {item.isAttentionDecay ? <Tag tone="amber">Attention Decay</Tag> : null}
                    {item.isScaleFatigue ? <Tag>Scale Fatigue</Tag> : null}
                    <Tag tone="blue">{item.recommendation}</Tag>
                  </div>

                  <p className="mt-2 truncate text-sm font-black">{item.adName}</p>
                  <p className="mt-0.5 truncate opacity-60">
                    {item.campaign} · {item.adSet}
                  </p>
                </div>

                <Metric label="7D Spend" value={money(item.last7.spend)} tone="red" />
                <Metric label="Life CPA" value={money(item.lifetime.cpa)} />
                <Metric label="7D CPA" value={item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"} tone={item.isCpaDecay ? "red" : "neutral"} />
                <Metric label="CPA Δ" value={pct(item.cpaChange)} tone={item.cpaChange > 0 ? "red" : "green"} />
                <Metric label="Life ROAS" value={`${num(item.lifetime.roas)}x`} />
                <Metric label="7D ROAS" value={`${num(item.last7.roas)}x`} tone={item.isRoasDecay ? "red" : "green"} />
                <Metric label="ROAS Δ" value={pct(item.roasChange)} tone={item.roasChange < 0 ? "red" : "green"} />
                <Metric label="CTR Δ" value={pct(item.ctrChange)} tone={item.ctrChange < 0 ? "red" : "green"} />
                <Metric label="CPM Δ" value={pct(item.cpmChange)} tone={item.cpmChange > 0 ? "red" : "green"} />

                <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
              </summary>

              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-3">
                <InfoBox
                  title="Why It Is Flagged"
                  lines={[
                    item.isCpaDecay ? `CPA decay: Last 7D CPA is ${pct(item.cpaChange)} vs lifetime. Rule: ${settings.cpaDecayPct}%+ worse.` : "",
                    item.isRoasDecay ? `ROAS decay: Last 7D ROAS is ${pct(Math.abs(item.roasChange))} lower vs lifetime. Rule: ${settings.roasDecayPct}%+ drop.` : "",
                    item.isAttentionDecay ? `Attention decay: CTR is down ${pct(Math.abs(item.ctrChange))} while CPM is up ${pct(item.cpmChange)}. Rules: CTR ${settings.ctrDecayPct}% down + CPM ${settings.cpmRisePct}% up.` : "",
                    item.isScaleFatigue ? `Scale fatigue: Spend increased vs previous 7D but CPA worsened and ROAS dropped.` : "",
                  ].filter(Boolean)}
                />

                <InfoBox
                  title="Recent vs Historical"
                  lines={[
                    `Lifetime CPA: ${money(item.lifetime.cpa)} | Last 7D CPA: ${item.last7.purchases > 0 ? money(item.last7.cpa) : "No sale"}`,
                    `Lifetime ROAS: ${num(item.lifetime.roas)}x | Last 7D ROAS: ${num(item.last7.roas)}x`,
                    `Lifetime CTR: ${pct(item.lifetime.ctr, 2)} | Last 7D CTR: ${pct(item.last7.ctr, 2)}`,
                    `Lifetime CPM: ${money(item.lifetime.cpm)} | Last 7D CPM: ${money(item.last7.cpm)}`,
                  ]}
                />

                <InfoBox
                  title="Recommended Action"
                  lines={[
                    item.recommendation,
                    item.isAttentionDecay ? "Refresh hook/visual before increasing budget." : "Avoid increasing budget until recent trend stabilizes.",
                    item.last7.spend >= 2000 ? "High enough recent spend to act." : "Watch one more day if spend is still low.",
                  ]}
                />
              </div>
            </details>
          ))}

          {!visibleItems.length ? (
            <div className="p-5">
              <p className="font-black">No efficiency decay found for this filter.</p>
              <p className="mt-1 text-sm opacity-60">
                This means currently active creatives are not showing meaningful recent decay under the selected rule.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
