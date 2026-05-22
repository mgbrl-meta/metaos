"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Eye,
  Gauge,
  RadioTower,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMetaStore } from "@/store/metaStore";
import {
  GlassCard,
  MutedText,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";

type Grain = "daily" | "weekly" | "monthly";

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const compact = (n: number) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return Math.round(v).toLocaleString();
};
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number) => `${num(Number(n || 0) * 100, 1)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getDate(row: any) {
  return String(row.date || row.day || row.Day || "");
}

function getSpend(row: any) {
  return Number(row.spend ?? row.amountSpent ?? row.amount_spent ?? row["Amount spent (INR)"] ?? 0);
}

function getReach(row: any) {
  return Number(row.reach ?? row.Reach ?? 0);
}

function getImpressions(row: any) {
  return Number(row.impressions ?? row.Impressions ?? 0);
}

function getCampaign(row: any) {
  return String(row.campaignName || row.campaign_name || row["Campaign name"] || "Unknown Campaign");
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  return x;
}

function bucketKey(date: Date, grain: Grain) {
  if (grain === "daily") return ymd(date);

  if (grain === "weekly") {
    const w = startOfWeek(date);
    return `${ymd(w)} W`;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function bucketLabel(key: string, grain: Grain) {
  if (grain === "daily") {
    const d = parseDate(key);
    if (!d) return key;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  if (grain === "weekly") {
    const d = parseDate(key.replace(" W", ""));
    if (!d) return key;
    return `W ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const [y, m] = key.split("-");
  return `${m}/${String(y).slice(-2)}`;
}

function aggregate(rows: any[], grain: Grain, selectedCampaign: string) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const d = parseDate(getDate(row));
    if (!d) return;

    const campaign = getCampaign(row);
    if (selectedCampaign !== "ALL" && campaign !== selectedCampaign) return;

    const key = bucketKey(d, grain);

    if (!map.has(key)) {
      map.set(key, {
        key,
        label: bucketLabel(key, grain),
        spend: 0,
        reach: 0,
        impressions: 0,
      });
    }

    const item = map.get(key);
    item.spend += getSpend(row);
    item.reach += getReach(row);
    item.impressions += getImpressions(row);
  });

  let cumulativeReach = 0;
  let cumulativeImpressions = 0;
  let cumulativeSpend = 0;

  return Array.from(map.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((row) => {
      const frequency = safeDiv(row.impressions, row.reach);
      const cpr = safeDiv(row.spend, row.reach);

      cumulativeReach += row.reach;
      cumulativeImpressions += row.impressions;
      cumulativeSpend += row.spend;

      const cumulativeFrequency = safeDiv(cumulativeImpressions, cumulativeReach);
      const reachEfficiency = safeDiv(cumulativeReach, cumulativeImpressions);
      const duplicationPressure = Math.max(0, 1 - reachEfficiency);

      return {
        ...row,
        frequency,
        cpr,
        cumulativeReach,
        cumulativeImpressions,
        cumulativeSpend,
        cumulativeFrequency,
        reachEfficiency,
        duplicationPressure,
        cumulativeCpr: safeDiv(cumulativeSpend, cumulativeReach),
      };
    });
}

function campaignOptions(rows: any[]) {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    const campaign = getCampaign(row);
    map.set(campaign, (map.get(campaign) || 0) + getSpend(row));
  });

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

function summary(rows: any[]) {
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const reach = rows.reduce((s, r) => s + Number(r.reach || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);

  return {
    spend,
    reach,
    impressions,
    frequency: safeDiv(impressions, reach),
    cpr: safeDiv(spend, reach),
    reachEfficiency: safeDiv(reach, impressions),
    duplicationPressure: Math.max(0, 1 - safeDiv(reach, impressions)),
  };
}

function delta(current: number, previous: number) {
  if (!previous) return 0;
  return (current - previous) / previous;
}

function campaignTable(rows: any[]) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const campaign = getCampaign(row);

    if (!map.has(campaign)) {
      map.set(campaign, {
        campaign,
        spend: 0,
        reach: 0,
        impressions: 0,
      });
    }

    const item = map.get(campaign);
    item.spend += getSpend(row);
    item.reach += getReach(row);
    item.impressions += getImpressions(row);
  });

  return Array.from(map.values())
    .map((r) => ({
      ...r,
      frequency: safeDiv(r.impressions, r.reach),
      cpr: safeDiv(r.spend, r.reach),
      reachEfficiency: safeDiv(r.reach, r.impressions),
      duplicationPressure: Math.max(0, 1 - safeDiv(r.reach, r.impressions)),
    }))
    .sort((a, b) => b.spend - a.spend);
}

export function ReachFrequencyDashboard() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [grain, setGrain] = useState<Grain>("daily");
  const [selectedCampaign, setSelectedCampaign] = useState("ALL");

  const data = useMemo(() => {
    const campaigns = campaignOptions(rows || []);
    const chartRows = aggregate(rows || [], grain, selectedCampaign);
    const current = summary(chartRows);
    const table = campaignTable(rows || []);

    const last = chartRows[chartRows.length - 1];
    const prev = chartRows[chartRows.length - 2];

    return {
      campaigns,
      chartRows,
      current,
      table,
      latestReachDelta: delta(last?.reach || 0, prev?.reach || 0),
      latestFrequencyDelta: delta(last?.frequency || 0, prev?.frequency || 0),
      latestCprDelta: delta(last?.cpr || 0, prev?.cpr || 0),
    };
  }, [rows, grain, selectedCampaign]);

  return (
    <div className="grid min-w-0 gap-4">
      <GlassCard className="p-4 min-w-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="blue">Meta Reach</TonePill>
              <TonePill tone="neutral">Campaign Level</TonePill>
              <TonePill tone="neutral">Daily / Weekly / Monthly</TonePill>
            </div>

            <h2 className="mt-3 text-2xl font-black">Reach, Impressions, Frequency & CPR</h2>

            <MutedText className="mt-2 max-w-5xl text-sm leading-6">
              Compact view to track campaign delivery saturation. Cumulative reach shown here is a daily summed upper-bound because true unique cumulative reach needs period-level Meta reach export.
            </MutedText>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["daily", "weekly", "monthly"] as Grain[]).map((item) => (
              <button
                key={item}
                onClick={() => setGrain(item)}
                className={
                  grain === item
                    ? "rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black text-white"
                    : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"
                }
              >
                {item.toUpperCase()}
              </button>
            ))}

            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="rounded-full border border-current/10 bg-transparent px-4 py-2 text-xs font-black outline-none"
            >
              <option value="ALL">All Campaigns</option>
              {data.campaigns.map((campaign) => (
                <option key={campaign} value={campaign}>
                  {campaign}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <CompactMetric
          label="Reach"
          value={compact(data.current.reach)}
          delta={data.latestReachDelta}
          icon={<RadioTower className="h-4 w-4" />}
          goodWhenUp
        />
        <CompactMetric
          label="Impressions"
          value={compact(data.current.impressions)}
          delta={0}
          icon={<Eye className="h-4 w-4" />}
          neutral
        />
        <CompactMetric
          label="Frequency"
          value={`${num(data.current.frequency)}x`}
          delta={data.latestFrequencyDelta}
          icon={<Gauge className="h-4 w-4" />}
        />
        <CompactMetric
          label="CPR"
          value={money(data.current.cpr)}
          delta={data.latestCprDelta}
          icon={<Activity className="h-4 w-4" />}
          lowerIsBetter
        />
        <CompactMetric
          label="Reach Efficiency"
          value={pct(data.current.reachEfficiency)}
          delta={0}
          icon={<TrendingUp className="h-4 w-4" />}
          neutral
        />
        <CompactMetric
          label="Duplication"
          value={pct(data.current.duplicationPressure)}
          delta={0}
          icon={<TrendingDown className="h-4 w-4" />}
          neutral
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <GlassCard className="p-4 min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">Reach, Impressions & Frequency Trend</h3>
              <MutedText className="mt-1 text-xs">Bars = reach / impressions · Line = frequency</MutedText>
            </div>
            <BarChart3 className="h-5 w-5 opacity-50" />
          </div>

          <div className="h-[340px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={data.chartRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.18)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} tickFormatter={compact} width={52} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<ChartTooltip />} />
                <Bar yAxisId="left" dataKey="impressions" name="Impressions" fill="rgba(150,150,150,0.35)" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="left" dataKey="reach" name="Reach" fill="rgba(16,185,129,0.75)" radius={[8, 8, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="frequency" name="Frequency" stroke="currentColor" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-4 min-w-0">
          <div className="mb-3">
            <h3 className="text-lg font-black">CPR & Duplication Pressure</h3>
            <MutedText className="mt-1 text-xs">Higher duplication means more impressions are repeating to already reached users.</MutedText>
          </div>

          <div className="h-[340px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={data.chartRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.18)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(Number(v || 0))}`} width={54} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v || 0) * 100)}%`} width={42} />
                <Tooltip content={<ChartTooltip />} />
                <Area yAxisId="right" type="monotone" dataKey="duplicationPressure" name="Duplication Pressure" fill="rgba(239,68,68,0.20)" stroke="rgba(239,68,68,0.8)" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="cpr" name="CPR" stroke="rgba(16,185,129,0.95)" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden min-w-0">
        <div className="border-b border-current/10 p-4">
          <h3 className="text-lg font-black">Campaign Reach Table</h3>
          <MutedText className="mt-1 text-xs">Compact campaign-level delivery and saturation view.</MutedText>
        </div>

        <div className="metaos-scroll-table overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-current/10 bg-current/[0.04] uppercase tracking-[0.16em] opacity-55">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Spend</th>
                <th className="px-4 py-3">Reach</th>
                <th className="px-4 py-3">Impressions</th>
                <th className="px-4 py-3">Freq</th>
                <th className="px-4 py-3">CPR</th>
                <th className="px-4 py-3">Reach Eff.</th>
                <th className="px-4 py-3">Duplication</th>
              </tr>
            </thead>

            <tbody>
              {data.table.slice(0, 40).map((row) => (
                <tr key={row.campaign} className="border-b border-current/10">
                  <td className="max-w-[320px] px-4 py-3 font-black whitespace-normal break-words">{row.campaign}</td>
                  <td className="px-4 py-3">{money(row.spend)}</td>
                  <td className="px-4 py-3 text-emerald-400">{compact(row.reach)}</td>
                  <td className="px-4 py-3">{compact(row.impressions)}</td>
                  <td className="px-4 py-3">{num(row.frequency)}x</td>
                  <td className="px-4 py-3">{money(row.cpr)}</td>
                  <td className="px-4 py-3 text-emerald-400">{pct(row.reachEfficiency)}</td>
                  <td className="px-4 py-3 text-red-400">{pct(row.duplicationPressure)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  delta,
  icon,
  lowerIsBetter = false,
  goodWhenUp = false,
  neutral = false,
}: {
  label: string;
  value: string;
  delta: number;
  icon: React.ReactNode;
  lowerIsBetter?: boolean;
  goodWhenUp?: boolean;
  neutral?: boolean;
}) {
  const good = neutral ? false : lowerIsBetter ? delta < 0 : goodWhenUp ? delta > 0 : delta <= 0;
  const bad = !neutral && Math.abs(delta) > 0.02 && !good;

  return (
    <Surface className="p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">{label}</p>
        <span className={bad ? "text-red-400" : good ? "text-emerald-400" : "opacity-45"}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className={bad ? "mt-1 text-xs font-black text-red-400" : good ? "mt-1 text-xs font-black text-emerald-400" : "mt-1 text-xs opacity-45"}>
        {neutral ? "tracked" : `${delta >= 0 ? "+" : ""}${num(delta * 100, 1)}% vs prev`}
      </p>
    </Surface>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-current/10 bg-[#111318] p-3 text-xs text-white shadow-2xl">
      <p className="mb-2 font-black">{label}</p>
      <div className="grid gap-1">
        {payload.map((item: any) => {
          const name = String(item.name || item.dataKey);
          const value = Number(item.value || 0);

          let display = compact(value);
          if (name.toLowerCase().includes("frequency")) display = `${num(value)}x`;
          if (name.toLowerCase().includes("cpr")) display = money(value);
          if (name.toLowerCase().includes("duplication")) display = pct(value);

          return (
            <div key={item.dataKey} className="flex items-center justify-between gap-5">
              <span className="opacity-65">{name}</span>
              <span className="font-black">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
