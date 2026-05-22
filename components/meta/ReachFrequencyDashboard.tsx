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
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMetaStore } from "@/store/metaStore";
import { GlassCard, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

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

function isAccountTotalRow(row: any) {
  const campaign = getCampaign(row).toLowerCase().trim();
  return ["total", "account total", "overall total", "grand total"].includes(campaign);
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
  if (grain === "weekly") return `${ymd(startOfWeek(date))} W`;
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

function aggregateTrend(rows: any[], grain: Grain, selectedCampaign: string) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    if (isAccountTotalRow(row)) return;

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

  let cumulativeReachSum = 0;
  let cumulativeImpressions = 0;
  let cumulativeSpend = 0;

  return Array.from(map.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((row) => {
      cumulativeReachSum += row.reach;
      cumulativeImpressions += row.impressions;
      cumulativeSpend += row.spend;

      return {
        ...row,
        frequency: safeDiv(row.impressions, row.reach),
        costPerReach: safeDiv(row.spend, row.reach),
        cumulativeReachSum,
        cumulativeImpressions,
        cumulativeSpend,
        cumulativeFrequency: safeDiv(cumulativeImpressions, cumulativeReachSum),
        cumulativeCostPerReach: safeDiv(cumulativeSpend, cumulativeReachSum),
      };
    });
}

function campaignTable(rows: any[], selectedCampaign: string) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    if (isAccountTotalRow(row)) return;

    const campaign = getCampaign(row);
    if (selectedCampaign !== "ALL" && campaign !== selectedCampaign) return;

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
      costPerReach: safeDiv(r.spend, r.reach),
      reachShare: 0,
    }))
    .sort((a, b) => b.reach - a.reach);
}

function campaignOptions(rows: any[]) {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    if (isAccountTotalRow(row)) return;
    const campaign = getCampaign(row);
    map.set(campaign, (map.get(campaign) || 0) + getSpend(row));
  });

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

function findActualTotalReach(rows: any[], grain: Grain, selectedCampaign: string) {
  if (selectedCampaign !== "ALL") return null;

  const totalRows = rows.filter(isAccountTotalRow);
  if (!totalRows.length) return null;

  const map = new Map<string, any>();

  totalRows.forEach((row) => {
    const d = parseDate(getDate(row));
    if (!d) return;
    const key = bucketKey(d, grain);

    if (!map.has(key)) {
      map.set(key, {
        key,
        reach: 0,
        impressions: 0,
        spend: 0,
      });
    }

    const item = map.get(key);
    item.reach += getReach(row);
    item.impressions += getImpressions(row);
    item.spend += getSpend(row);
  });

  const rowsByPeriod = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  if (!rowsByPeriod.length) return null;

  return rowsByPeriod.reduce((s, r) => s + Number(r.reach || 0), 0);
}

function summary(rows: any[], rawRows: any[], grain: Grain, selectedCampaign: string) {
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const campaignReachSum = rows.reduce((s, r) => s + Number(r.reach || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);

  const actualTotalReach = findActualTotalReach(rawRows, grain, selectedCampaign);
  const reachReduction =
    actualTotalReach && campaignReachSum > 0
      ? safeDiv(campaignReachSum - actualTotalReach, campaignReachSum)
      : null;

  return {
    spend,
    campaignReachSum,
    actualTotalReach,
    reachReduction,
    impressions,
    frequency: safeDiv(impressions, campaignReachSum),
    costPerReach: safeDiv(spend, campaignReachSum),
  };
}

function delta(current: number, previous: number) {
  if (!previous) return 0;
  return (current - previous) / previous;
}

export function ReachFrequencyDashboard() {
  const rows = useMetaStore((state) => state.performanceRows);
  const [grain, setGrain] = useState<Grain>("daily");
  const [selectedCampaign, setSelectedCampaign] = useState("ALL");

  const data = useMemo(() => {
    const campaigns = campaignOptions(rows || []);
    const trend = aggregateTrend(rows || [], grain, selectedCampaign);
    const table = campaignTable(rows || [], selectedCampaign);
    const total = summary(table, rows || [], grain, selectedCampaign);

    const tableWithShare = table.map((r) => ({
      ...r,
      reachShare: safeDiv(r.reach, total.campaignReachSum),
    }));

    const topCampaignReach = tableWithShare.slice(0, 12);
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];

    return {
      campaigns,
      trend,
      table: tableWithShare,
      topCampaignReach,
      total,
      latestReachDelta: delta(last?.reach || 0, prev?.reach || 0),
      latestFrequencyDelta: delta(last?.frequency || 0, prev?.frequency || 0),
      latestCprDelta: delta(last?.costPerReach || 0, prev?.costPerReach || 0),
    };
  }, [rows, grain, selectedCampaign]);

  return (
    <div className="grid min-w-0 gap-3">
      <GlassCard className="p-3 min-w-0">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="blue">Meta Reach</TonePill>
              <TonePill tone="neutral">Compact Delivery View</TonePill>
              <TonePill tone={data.total.actualTotalReach ? "green" : "yellow"}>
                {data.total.actualTotalReach ? "Actual Total Reach Found" : "Account Total Reach Needed"}
              </TonePill>
            </div>

            <h2 className="mt-2 text-xl font-black">Reach, Frequency & Cost Per Reach</h2>

            <MutedText className="mt-1 max-w-5xl text-xs leading-5">
              Campaign reach is additive and can overlap. Exact reach reduction requires account-level total reach row/export from Meta for the same period.
            </MutedText>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["daily", "weekly", "monthly"] as Grain[]).map((item) => (
              <button
                key={item}
                onClick={() => setGrain(item)}
                className={
                  grain === item
                    ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-[11px] font-black text-white"
                    : "rounded-full border border-current/10 px-3 py-1.5 text-[11px] font-black opacity-70"
                }
              >
                {item.toUpperCase()}
              </button>
            ))}

            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="max-w-[280px] rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-[11px] font-black outline-none"
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

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
        <CompactMetric
          label="Campaign Reach Sum"
          value={compact(data.total.campaignReachSum)}
          delta={data.latestReachDelta}
          icon={<RadioTower className="h-4 w-4" />}
          goodWhenUp
        />
        <CompactMetric
          label="Actual Total Reach"
          value={data.total.actualTotalReach ? compact(data.total.actualTotalReach) : "Need Export"}
          delta={0}
          icon={<Eye className="h-4 w-4" />}
          neutral
        />
        <CompactMetric
          label="Reach Reduction"
          value={data.total.reachReduction === null ? "NA" : pct(data.total.reachReduction)}
          delta={0}
          icon={<TrendingDown className="h-4 w-4" />}
          neutral={data.total.reachReduction === null}
          lowerIsBetter
        />
        <CompactMetric
          label="Frequency"
          value={`${num(data.total.frequency)}x`}
          delta={data.latestFrequencyDelta}
          icon={<Gauge className="h-4 w-4" />}
          lowerIsBetter
        />
        <CompactMetric
          label="Cost / Reach"
          value={money(data.total.costPerReach)}
          delta={data.latestCprDelta}
          icon={<Activity className="h-4 w-4" />}
          lowerIsBetter
        />
        <CompactMetric
          label="Impressions"
          value={compact(data.total.impressions)}
          delta={0}
          icon={<BarChart3 className="h-4 w-4" />}
          neutral
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="p-3 min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black">Campaign-wise Reach</h3>
              <MutedText className="text-[11px]">Bottom row shows total and reach reduction logic.</MutedText>
            </div>
            <RadioTower className="h-5 w-5 opacity-50" />
          </div>

          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.topCampaignReach}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.16)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }} tickFormatter={compact} />
                <YAxis
                  type="category"
                  dataKey="campaign"
                  width={140}
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.7 }}
                  tickFormatter={(v) => String(v).slice(0, 24)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="reach" name="Reach" fill="rgba(16,185,129,0.8)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 rounded-xl border border-current/10 bg-current/[0.035] p-3 text-xs">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <TotalMini label="Campaign Reach Sum" value={compact(data.total.campaignReachSum)} />
              <TotalMini label="Actual Total Reach" value={data.total.actualTotalReach ? compact(data.total.actualTotalReach) : "Need export"} />
              <TotalMini
                label="Reduction"
                value={data.total.reachReduction === null ? "NA" : pct(data.total.reachReduction)}
                red={data.total.reachReduction !== null && data.total.reachReduction > 0.25}
              />
              <TotalMini label="Cost / Reach" value={money(data.total.costPerReach)} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-3 min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black">Daily / Weekly / Monthly Trend</h3>
              <MutedText className="text-[11px]">Reach + impressions with frequency and cost per reach.</MutedText>
            </div>
            <BarChart3 className="h-5 w-5 opacity-50" />
          </div>

          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.16)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} tickFormatter={compact} width={48} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }} axisLine={false} tickLine={false} width={38} />
                <Tooltip content={<ChartTooltip />} />
                <Bar yAxisId="left" dataKey="impressions" name="Impressions" fill="rgba(150,150,150,0.32)" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="left" dataKey="reach" name="Reach" fill="rgba(16,185,129,0.74)" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="frequency" name="Frequency" stroke="currentColor" strokeWidth={2.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="costPerReach" name="Cost / Reach" stroke="rgba(239,68,68,0.95)" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden min-w-0">
        <div className="border-b border-current/10 p-3">
          <h3 className="text-base font-black">Compact Campaign Table</h3>
          <MutedText className="text-[11px]">Red = breaking, green = improving/efficient.</MutedText>
        </div>

        <div className="metaos-scroll-table overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-[11px]">
            <thead className="border-b border-current/10 bg-current/[0.04] uppercase tracking-[0.14em] opacity-55">
              <tr>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Spend</th>
                <th className="px-3 py-2">Reach</th>
                <th className="px-3 py-2">Reach Share</th>
                <th className="px-3 py-2">Impr.</th>
                <th className="px-3 py-2">Freq</th>
                <th className="px-3 py-2">Cost / Reach</th>
              </tr>
            </thead>

            <tbody>
              {data.table.slice(0, 40).map((row) => (
                <tr key={row.campaign} className="border-b border-current/10">
                  <td className="max-w-[300px] px-3 py-2 font-black whitespace-normal break-words">{row.campaign}</td>
                  <td className="px-3 py-2">{money(row.spend)}</td>
                  <td className="px-3 py-2 text-emerald-400">{compact(row.reach)}</td>
                  <td className="px-3 py-2">{pct(row.reachShare)}</td>
                  <td className="px-3 py-2">{compact(row.impressions)}</td>
                  <td className={row.frequency > 2.5 ? "px-3 py-2 text-red-400" : "px-3 py-2 text-emerald-400"}>
                    {num(row.frequency)}x
                  </td>
                  <td className={row.costPerReach > data.total.costPerReach * 1.25 ? "px-3 py-2 text-red-400" : "px-3 py-2 text-emerald-400"}>
                    {money(row.costPerReach)}
                  </td>
                </tr>
              ))}

              <tr className="border-t-2 border-current/20 bg-current/[0.06] font-black">
                <td className="px-3 py-3">TOTAL</td>
                <td className="px-3 py-3">{money(data.total.spend)}</td>
                <td className="px-3 py-3 text-emerald-400">{compact(data.total.campaignReachSum)}</td>
                <td className="px-3 py-3">100%</td>
                <td className="px-3 py-3">{compact(data.total.impressions)}</td>
                <td className="px-3 py-3">{num(data.total.frequency)}x</td>
                <td className="px-3 py-3">{money(data.total.costPerReach)}</td>
              </tr>

              <tr className="bg-current/[0.035]">
                <td className="px-3 py-3 font-black">ACTUAL TOTAL REACH</td>
                <td className="px-3 py-3 opacity-50">—</td>
                <td className="px-3 py-3 font-black">
                  {data.total.actualTotalReach ? compact(data.total.actualTotalReach) : "Need account-level total reach"}
                </td>
                <td className={data.total.reachReduction === null ? "px-3 py-3 opacity-50" : "px-3 py-3 text-red-400 font-black"}>
                  {data.total.reachReduction === null ? "NA" : `${pct(data.total.reachReduction)} reduction`}
                </td>
                <td className="px-3 py-3 opacity-50" colSpan={3}>
                  Example logic: if campaign reach sum = 4 and actual total reach = 2, reduction = 50%. If you define duplication ratio as duplicate reach / actual reach, that equals 100%.
                </td>
              </tr>
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
    <Surface className="p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-45">{label}</p>
        <span className={bad ? "text-red-400" : good ? "text-emerald-400" : "opacity-45"}>{icon}</span>
      </div>
      <p className="mt-1 text-xl font-black">{value}</p>
      <p className={bad ? "mt-0.5 text-[10px] font-black text-red-400" : good ? "mt-0.5 text-[10px] font-black text-emerald-400" : "mt-0.5 text-[10px] opacity-45"}>
        {neutral ? "tracked" : `${delta >= 0 ? "+" : ""}${num(delta * 100, 1)}% vs prev`}
      </p>
    </Surface>
  );
}

function TotalMini({ label, value, red = false }: { label: string; value: string; red?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-45">{label}</p>
      <p className={red ? "mt-1 font-black text-red-400" : "mt-1 font-black"}>{value}</p>
    </div>
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
          if (name.toLowerCase().includes("cost")) display = money(value);

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
