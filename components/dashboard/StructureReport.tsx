"use client";

import { useMemo, useState } from "react";
import { Layers, Megaphone, MousePointerClick, ShieldCheck } from "lucide-react";
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

function getLatestDate(rows: any[]) {
  const dates = rows.map((r) => parseDate(r.date)).filter(Boolean) as Date[];
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function dateKey(value?: string) {
  const d = parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function isLatestDay(row: any, latestDate: Date | null) {
  if (!latestDate) return false;
  return dateKey(row.date) === dateKey(latestDate.toISOString());
}

function campaignKey(row: any) {
  return String(row.campaignId || row.campaignName || "Unknown Campaign");
}

function adsetKey(row: any) {
  return String(row.adSetId || row.adsetId || row.adSetName || row.adsetName || "Unknown Ad Set");
}

function adKey(row: any) {
  return String(row.adId || row.adName || "Unknown Ad");
}

function campaignName(row: any) {
  return String(row.campaignName || "Unknown Campaign");
}

function adsetName(row: any) {
  return String(row.adSetName || row.adsetName || "Unknown Ad Set");
}

function adName(row: any) {
  return String(row.adName || "Unknown Ad");
}

function summarize(rows: any[]) {
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const revenue = rows.reduce((s, r) => s + revenueValue(r), 0);
  const purchases = rows.reduce((s, r) => s + Number(r.purchases || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || r.linkClicks || 0), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    clicks,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, purchases),
    aov: safeDiv(revenue, purchases),
    ctr: safeDiv(clicks, impressions) * 100,
  };
}

function groupBy(rows: any[], keyFn: (row: any) => string, nameFn: (row: any) => string) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = keyFn(row);

    if (!map.has(key)) {
      map.set(key, {
        key,
        name: nameFn(row),
        rows: [],
      });
    }

    map.get(key).rows.push(row);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      ...summarize(item.rows),
    }))
    .sort((a, b) => b.spend - a.spend);
}

function getLiveRowsOnly(rows: any[], latestDate: Date | null) {
  const latestRows = rows.filter((r) => isLatestDay(r, latestDate));

  const liveAdKeys = new Set(
    latestRows
      .filter((r) => Number(r.impressions || 0) > 0 || Number(r.spend || 0) > 0)
      .map(adKey)
  );

  return rows.filter((r) => liveAdKeys.has(adKey(r)));
}

function getStructureScore({
  campaignCount,
  adsetCount,
  adCount,
  unknownCount,
}: {
  campaignCount: number;
  adsetCount: number;
  adCount: number;
  unknownCount: number;
}) {
  let score = 100;

  if (unknownCount > 0) score -= Math.min(35, unknownCount * 3);
  if (campaignCount > 0 && adsetCount / campaignCount > 12) score -= 15;
  if (adsetCount > 0 && adCount / adsetCount > 20) score -= 15;
  if (adCount < 3) score -= 20;

  return Math.max(0, Math.round(score));
}

function structureLabel(score: number) {
  if (score >= 85) return { label: "Clean", tone: "green" as const };
  if (score >= 65) return { label: "Manageable", tone: "blue" as const };
  if (score >= 45) return { label: "Needs Cleanup", tone: "yellow" as const };
  return { label: "Messy", tone: "red" as const };
}

export function StructureReport() {
  const { performanceRows, settings } = useMetaStore();

  const baseLiveRows = useMemo(() => onlyLiveRows(performanceRows), [performanceRows]);
  const latestDate = useMemo(() => getLatestDate(baseLiveRows), [baseLiveRows]);

  const liveRows = useMemo(
    () => getLiveRowsOnly(baseLiveRows, latestDate),
    [baseLiveRows, latestDate]
  );

  const campaigns = useMemo(
    () => groupBy(liveRows, campaignKey, campaignName),
    [liveRows]
  );

  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedAdset, setSelectedAdset] = useState("");

  const activeCampaignKey = selectedCampaign || campaigns[0]?.key || "";

  const campaignScopedRows = useMemo(
    () => liveRows.filter((r) => campaignKey(r) === activeCampaignKey),
    [liveRows, activeCampaignKey]
  );

  const adsets = useMemo(
    () => groupBy(campaignScopedRows, adsetKey, adsetName),
    [campaignScopedRows]
  );

  const activeAdsetKey =
    selectedAdset && adsets.some((a) => a.key === selectedAdset)
      ? selectedAdset
      : adsets[0]?.key || "";

  const adsetScopedRows = useMemo(
    () => campaignScopedRows.filter((r) => adsetKey(r) === activeAdsetKey),
    [campaignScopedRows, activeAdsetKey]
  );

  const ads = useMemo(
    () => groupBy(adsetScopedRows, adKey, adName),
    [adsetScopedRows]
  );

  const accountSummary = useMemo(() => summarize(liveRows), [liveRows]);
  const campaignSummary = useMemo(() => summarize(campaignScopedRows), [campaignScopedRows]);
  const adsetSummary = useMemo(() => summarize(adsetScopedRows), [adsetScopedRows]);

  const unknownCount = liveRows.filter(
    (r) =>
      !r.campaignName ||
      !(r.adSetName || r.adsetName) ||
      !r.adName ||
      String(r.campaignName).toLowerCase().includes("unknown") ||
      String(r.adName).toLowerCase().includes("unknown")
  ).length;

  const structureScore = getStructureScore({
    campaignCount: campaigns.length,
    adsetCount: adsets.length,
    adCount: ads.length,
    unknownCount,
  });

  const scoreLabel = structureLabel(structureScore);

  if (!liveRows.length) {
    return (
      <GlassCard className="p-8 min-w-0">
        <h2 className="text-2xl font-black">Structure Report</h2>
        <MutedText className="mt-2">
          Upload Meta data first. This view shows only currently live/spending structure.
        </MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        eyebrow="Structure Report"
        title="Live Campaign → Ad Set → Ad Structure"
        description="A drill-down view of only currently live ads. Select a campaign to inspect its ad sets and ads without showing the full account in one large table."
      />

      <GlassCard className="p-4 min-w-0">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="blue">Live Ads Only</TonePill>
              <TonePill tone={scoreLabel.tone}>Structure: {scoreLabel.label}</TonePill>
              <TonePill tone="neutral">Latest: {latestDate ? dateKey(latestDate.toISOString()) : "NA"}</TonePill>
            </div>

            <h2 className="mt-4 text-2xl font-black">
              Structure Score: {structureScore}/100
            </h2>

            <MutedText className="mt-2 max-w-4xl text-sm leading-6">
              This screen is for execution clarity: campaign selection controls ad set view, and ad set selection controls ad view.
            </MutedText>
          </div>

          <div className="grid min-w-0 gap-3 md:grid-cols-2 2xl:w-[760px]">
            <SelectBox
              label="Campaign"
              value={activeCampaignKey}
              options={campaigns.map((c) => ({ key: c.key, name: c.name }))}
              onChange={(value) => {
                setSelectedCampaign(value);
                setSelectedAdset("");
              }}
            />

            <SelectBox
              label="Ad Set"
              value={activeAdsetKey}
              options={adsets.map((a) => ({ key: a.key, name: a.name }))}
              onChange={setSelectedAdset}
            />
          </div>
        </div>
      </GlassCard>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Live Campaigns" value={String(campaigns.length)} tone="blue" />
        <MetricCard label="Live Ad Sets in Campaign" value={String(adsets.length)} tone="neutral" />
        <MetricCard label="Live Ads in Ad Set" value={String(ads.length)} tone="neutral" />
        <MetricCard label="Unknown Naming Rows" value={String(unknownCount)} tone={unknownCount ? "yellow" : "green"} />

        <MetricCard label="Account Spend" value={money(accountSummary.spend)} tone="neutral" />
        <MetricCard label="Account ROAS" value={num(accountSummary.roas)} tone={accountSummary.roas >= settings.targetRoas ? "green" : "red"} />
        <MetricCard label="Campaign CPA" value={money(campaignSummary.cpa)} tone={campaignSummary.cpa <= settings.targetCpa ? "green" : "yellow"} />
        <MetricCard label="Ad Set CPA" value={money(adsetSummary.cpa)} tone={adsetSummary.cpa <= settings.targetCpa ? "green" : "yellow"} />
      </div>

      <div className="grid min-w-0 gap-6 2xl:grid-cols-3">
        <EntityPanel
          icon={<Megaphone className="h-4 w-4" />}
          title="Campaigns"
          description="Select one campaign to inspect its ad sets."
          rows={campaigns}
          selectedKey={activeCampaignKey}
          onSelect={(key) => {
            setSelectedCampaign(key);
            setSelectedAdset("");
          }}
        />

        <EntityPanel
          icon={<Layers className="h-4 w-4" />}
          title="Ad Sets in Selected Campaign"
          description="Only ad sets inside the selected campaign are shown."
          rows={adsets}
          selectedKey={activeAdsetKey}
          onSelect={setSelectedAdset}
        />

        <EntityPanel
          icon={<MousePointerClick className="h-4 w-4" />}
          title="Ads in Selected Ad Set"
          description="Only ads inside the selected ad set are shown."
          rows={ads}
          selectedKey=""
          onSelect={() => {}}
          isAdPanel
        />
      </div>

      <GlassCard className="overflow-hidden min-w-0">
        <div className="border-b border-current/10 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-black">Selected Structure Summary</h2>
          </div>
          <MutedText className="mt-1 text-sm">
            This shows the selected campaign and ad set only, not the full account.
          </MutedText>
        </div>

        <div className="metaos-scroll-table overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-current/10 bg-current/[0.04] text-[11px] uppercase tracking-[0.16em] opacity-55">
              <tr>
                <th className="px-5 py-4">Layer</th>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Spend</th>
                <th className="px-5 py-4">Revenue</th>
                <th className="px-5 py-4">Purchases</th>
                <th className="px-5 py-4">CPA</th>
                <th className="px-5 py-4">ROAS</th>
                <th className="px-5 py-4">AOV</th>
                <th className="px-5 py-4">CTR</th>
              </tr>
            </thead>

            <tbody>
              <SummaryRow layer="Account" name="All live ads" data={accountSummary} />
              <SummaryRow
                layer="Campaign"
                name={campaigns.find((c) => c.key === activeCampaignKey)?.name || "Selected Campaign"}
                data={campaignSummary}
              />
              <SummaryRow
                layer="Ad Set"
                name={adsets.find((a) => a.key === activeAdsetKey)?.name || "Selected Ad Set"}
                data={adsetSummary}
              />
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function SelectBox({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { key: string; name: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] opacity-45">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 min-w-0 rounded-2xl border border-current/10 bg-[#111318] px-4 text-sm font-bold text-white outline-none"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function EntityPanel({
  icon,
  title,
  description,
  rows,
  selectedKey,
  onSelect,
  isAdPanel = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  rows: any[];
  selectedKey: string;
  onSelect: (key: string) => void;
  isAdPanel?: boolean;
}) {
  return (
    <GlassCard className="overflow-hidden min-w-0">
      <div className="border-b border-current/10 p-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-black">{title}</h2>
        </div>
        <MutedText className="mt-1 text-xs">{description}</MutedText>
      </div>

      <div className="max-h-[560px] overflow-y-auto">
        {rows.map((row) => (
          <button
            key={row.key}
            onClick={() => onSelect(row.key)}
            disabled={isAdPanel}
            className={
              selectedKey === row.key
                ? "block w-full border-b border-current/10 bg-[#0A84FF]/15 p-4 text-left"
                : "block w-full border-b border-current/10 p-4 text-left hover:bg-current/[0.04]"
            }
          >
            <p className="text-sm font-black leading-5 whitespace-normal break-words">
              {row.name}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Mini label="Spend" value={money(row.spend)} />
              <Mini label="CPA" value={money(row.cpa)} />
              <Mini label="ROAS" value={num(row.roas)} />
              <Mini label="AOV" value={money(row.aov)} />
            </div>
          </button>
        ))}

        {!rows.length && (
          <div className="p-4">
            <p className="text-sm opacity-60">No live data found for this selection.</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.03] p-2">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-40">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function SummaryRow({
  layer,
  name,
  data,
}: {
  layer: string;
  name: string;
  data: ReturnType<typeof summarize>;
}) {
  return (
    <tr className="border-b border-current/10">
      <td className="px-5 py-4">
        <TonePill tone={layer === "Account" ? "blue" : layer === "Campaign" ? "yellow" : "green"}>
          {layer}
        </TonePill>
      </td>
      <td className="max-w-[460px] px-5 py-4 font-black leading-6 whitespace-normal break-words">
        {name}
      </td>
      <td className="px-5 py-4 opacity-75">{money(data.spend)}</td>
      <td className="px-5 py-4 opacity-75">{money(data.revenue)}</td>
      <td className="px-5 py-4 opacity-75">{num(data.purchases, 0)}</td>
      <td className="px-5 py-4 opacity-75">{money(data.cpa)}</td>
      <td className="px-5 py-4 font-black text-emerald-400">{num(data.roas)}</td>
      <td className="px-5 py-4 opacity-75">{money(data.aov)}</td>
      <td className="px-5 py-4 opacity-75">{num(data.ctr)}%</td>
    </tr>
  );
}
