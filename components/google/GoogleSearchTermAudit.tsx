"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import {
  GlassCard,
  MetricCard,
  MutedText,
  PageHeader,
  Surface,
  TonePill,
} from "@/components/cards/MetaCards";

type GoogleSearchTermRow = {
  date: string;
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string;
  ad_group_name: string;
  search_term: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  average_cpc: number;
  cost_per_conversion: number;
  conversion_rate: number;
  roas: number;
};

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString()}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

const SETTINGS = {
  targetRoas: 5,
  targetCpa: 500,
  minSpendForDecision: 1000,
  minClicksForNegative: 20,
  minCostNoConversion: 1000,
  minConversionsScale: 3,
  badRoasThreshold: 2,
  goodRoasThreshold: 5,
  maxCpaThreshold: 700,
  brandTerms: ["brillare", "brillaire", "brilar", "billare", "brillar"],
  negativeIntentTerms: [
    "free",
    "job",
    "jobs",
    "wholesale",
    "pdf",
    "meaning",
    "side effects",
    "complaint",
    "contact number",
    "distributor",
  ],
};

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(value?: string | Date | null) {
  if (!value) return "";
  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getLatestDate(rows: GoogleSearchTermRow[]) {
  const dates = rows.map((r) => parseDate(r.date)).filter(Boolean) as Date[];
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function betweenDates(row: GoogleSearchTermRow, start: Date, end: Date) {
  const d = parseDate(row.date);
  if (!d) return false;
  return d >= start && d <= end;
}

function windowRows(rows: GoogleSearchTermRow[], days: number, latestDate: Date | null, offsetDays = 0) {
  if (!latestDate) return [];

  const end = new Date(latestDate);
  end.setDate(end.getDate() - offsetDays);

  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  return rows.filter((row) => betweenDates(row, start, end));
}

function summarize(rows: GoogleSearchTermRow[]) {
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || 0), 0);
  const cost = rows.reduce((s, r) => s + Number(r.cost || 0), 0);
  const conversions = rows.reduce((s, r) => s + Number(r.conversions || 0), 0);
  const conversionValue = rows.reduce((s, r) => s + Number(r.conversion_value || 0), 0);

  return {
    impressions,
    clicks,
    cost,
    conversions,
    conversionValue,
    ctr: safeDiv(clicks, impressions) * 100,
    avgCpc: safeDiv(cost, clicks),
    cpa: safeDiv(cost, conversions),
    conversionRate: safeDiv(conversions, clicks) * 100,
    roas: safeDiv(conversionValue, cost),
  };
}

function aggregateSearchTerms(rows: GoogleSearchTermRow[]) {
  const map = new Map<string, any>();

  rows.forEach((row) => {
    const key = `${row.campaign_id}|${row.ad_group_id}|${row.search_term}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        ad_group_id: row.ad_group_id,
        ad_group_name: row.ad_group_name,
        search_term: row.search_term,
        rows: [],
      });
    }

    map.get(key).rows.push(row);
  });

  return Array.from(map.values()).map((item) => ({
    ...item,
    ...summarize(item.rows),
  }));
}

function containsAny(text: string, terms: string[]) {
  const t = text.toLowerCase();
  return terms.some((term) => t.includes(term.toLowerCase()));
}

function classify(row: any) {
  const term = String(row.search_term || "").toLowerCase();

  if (containsAny(term, SETTINGS.negativeIntentTerms)) {
    return {
      label: "Hard Negative",
      tone: "red" as const,
      reason: "Search term contains low-intent or irrelevant intent.",
      action: "Add as phrase/exact negative after checking campaign intent.",
      priority: 1,
    };
  }

  if (row.cost >= SETTINGS.minCostNoConversion && row.conversions === 0) {
    return {
      label: "Hard Negative",
      tone: "red" as const,
      reason: "High spend with zero conversion.",
      action: "Add as negative or exclude from this ad group. Check if term is strategically useful before blocking account-wide.",
      priority: 1,
    };
  }

  if (row.clicks >= SETTINGS.minClicksForNegative && row.conversions === 0) {
    return {
      label: "Soft Negative",
      tone: "yellow" as const,
      reason: "Enough clicks but no conversion.",
      action: "Review intent. Add as negative if not clearly purchase-intent.",
      priority: 2,
    };
  }

  if (containsAny(term, SETTINGS.brandTerms)) {
    return {
      label: "Brand Protection",
      tone: "blue" as const,
      reason: "Brand or brand-misspelling intent.",
      action: "Keep protected. Check CPA/ROAS and ensure competitors are not stealing impression share.",
      priority: 4,
    };
  }

  if (
    row.conversions >= SETTINGS.minConversionsScale &&
    row.roas >= SETTINGS.goodRoasThreshold &&
    row.cpa <= SETTINGS.maxCpaThreshold
  ) {
    return {
      label: "Promote Exact",
      tone: "green" as const,
      reason: "Strong conversion signal with high ROAS and acceptable CPA.",
      action: "Add as exact keyword or isolate into higher-control ad group.",
      priority: 3,
    };
  }

  if (row.ctr >= 5 && row.conversions === 0 && row.cost >= SETTINGS.minSpendForDecision) {
    return {
      label: "Landing Page / Offer Issue",
      tone: "yellow" as const,
      reason: "CTR is strong but conversion is weak.",
      action: "Check landing page match, offer clarity, price, trust cues and product relevance.",
      priority: 2,
    };
  }

  if (row.cost >= SETTINGS.minSpendForDecision && row.roas > 0 && row.roas < SETTINGS.badRoasThreshold) {
    return {
      label: "Reduce / Investigate",
      tone: "red" as const,
      reason: "Term is spending but ROAS is below acceptable floor.",
      action: "Reduce exposure, add tighter match type, or move to exact with lower bid.",
      priority: 2,
    };
  }

  return {
    label: "Watch",
    tone: "neutral" as const,
    reason: "Insufficient signal for decisive action.",
    action: "Keep watching until spend/click/conversion threshold is met.",
    priority: 5,
  };
}

export function GoogleSearchTermAudit() {
  const [rows, setRows] = useState<GoogleSearchTermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"yesterday" | "l7">("yesterday");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/google-os?tab=search_terms&limit=10000", {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to fetch Google OS data");
        }

        setRows(json.rows || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load Google OS data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const data = useMemo(() => {
    const latestDate = getLatestDate(rows);
    const activeRows = period === "yesterday" ? windowRows(rows, 1, latestDate) : windowRows(rows, 7, latestDate);

    const summary = summarize(activeRows);

    const terms = aggregateSearchTerms(activeRows)
      .map((row) => ({
        ...row,
        decision: classify(row),
      }))
      .sort((a, b) => a.decision.priority - b.decision.priority || b.cost - a.cost);

    const hardNegatives = terms.filter((r) => r.decision.label === "Hard Negative");
    const softNegatives = terms.filter((r) => r.decision.label === "Soft Negative");
    const promote = terms.filter((r) => r.decision.label === "Promote Exact");
    const landing = terms.filter((r) => r.decision.label === "Landing Page / Offer Issue");

    const filtered =
      filter === "all"
        ? terms
        : terms.filter((r) => r.decision.label.toLowerCase().replaceAll(" ", "_").replaceAll("/", "") === filter);

    return {
      latestDate,
      activeRows,
      summary,
      terms,
      filtered,
      hardNegatives,
      softNegatives,
      promote,
      landing,
    };
  }, [rows, period, filter]);

  if (loading) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Google Search Term Audit</h2>
        <MutedText className="mt-2">Loading BigQuery data...</MutedText>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black text-red-400">Google OS Error</h2>
        <MutedText className="mt-2">{error}</MutedText>
      </GlassCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        eyebrow="Google OS"
        title="Search Term Audit"
        description="Daily search term decision engine: negatives, exact keyword opportunities, landing page issues and high-intent winners."
      />

      <GlassCard className="p-5 min-w-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="blue">BigQuery Connected</TonePill>
              <TonePill tone="yellow">Primary: Conversions + Conversion Value</TonePill>
              <TonePill tone="neutral">Latest: {data.latestDate ? dateKey(data.latestDate) : "NA"}</TonePill>
            </div>

            <h2 className="mt-4 text-2xl font-black">
              {period === "yesterday" ? "Yesterday" : "Last 7 Days"} Search Term Actions
            </h2>

            <MutedText className="mt-2 max-w-4xl text-sm leading-6">
              This uses purchase conversion metrics only. All-conversions are intentionally ignored for ROAS/CPA decisions.
            </MutedText>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["yesterday", "Yesterday"],
              ["l7", "Last 7D"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPeriod(value as any)}
                className={
                  period === value
                    ? "rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black text-white"
                    : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Spend" value={money(data.summary.cost)} tone="neutral" />
        <MetricCard label="Conv. Value" value={money(data.summary.conversionValue)} tone="green" />
        <MetricCard label="ROAS" value={num(data.summary.roas)} tone={data.summary.roas >= SETTINGS.targetRoas ? "green" : "red"} />
        <MetricCard label="CPA" value={money(data.summary.cpa)} tone={data.summary.cpa <= SETTINGS.targetCpa ? "green" : "yellow"} />
        <MetricCard label="Hard Negatives" value={String(data.hardNegatives.length)} tone={data.hardNegatives.length ? "red" : "green"} />
        <MetricCard label="Soft Negatives" value={String(data.softNegatives.length)} tone={data.softNegatives.length ? "yellow" : "green"} />
        <MetricCard label="Promote Exact" value={String(data.promote.length)} tone={data.promote.length ? "green" : "neutral"} />
        <MetricCard label="LP / Offer Issues" value={String(data.landing.length)} tone={data.landing.length ? "yellow" : "green"} />
      </div>

      <GlassCard className="p-5 min-w-0">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["hard_negative", "Hard Negative"],
            ["soft_negative", "Soft Negative"],
            ["promote_exact", "Promote Exact"],
            ["brand_protection", "Brand Protection"],
            ["landing_page__offer_issue", "LP / Offer Issue"],
            ["reduce__investigate", "Reduce / Investigate"],
            ["watch", "Watch"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={
                filter === value
                  ? "rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-black"
                  : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden min-w-0">
        <div className="border-b border-current/10 p-5">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[#0A84FF]" />
            <h2 className="text-xl font-black">Search Term Action Table</h2>
          </div>
          <MutedText className="mt-1 text-sm">
            Sorted by action priority and spend. Start from the top.
          </MutedText>
        </div>

        <div className="metaos-scroll-table overflow-x-auto">
          <table className="w-full min-w-[1320px] text-left text-sm">
            <thead className="border-b border-current/10 bg-current/[0.04] text-[11px] uppercase tracking-[0.16em] opacity-55">
              <tr>
                <th className="px-5 py-4">Search Term</th>
                <th className="px-5 py-4">Decision</th>
                <th className="px-5 py-4">Campaign</th>
                <th className="px-5 py-4">Ad Group</th>
                <th className="px-5 py-4">Spend</th>
                <th className="px-5 py-4">Clicks</th>
                <th className="px-5 py-4">Conv.</th>
                <th className="px-5 py-4">Value</th>
                <th className="px-5 py-4">ROAS</th>
                <th className="px-5 py-4">CPA</th>
                <th className="px-5 py-4">CTR</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {data.filtered.slice(0, 300).map((row) => (
                <tr key={row.key} className="border-b border-current/10 align-top">
                  <td className="max-w-[300px] px-5 py-4">
                    <p className="font-black leading-6 whitespace-normal break-words">
                      {row.search_term}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <TonePill tone={row.decision.tone}>{row.decision.label}</TonePill>
                    <p className="mt-2 text-xs leading-5 opacity-60">{row.decision.reason}</p>
                  </td>

                  <td className="max-w-[240px] px-5 py-4 opacity-75 whitespace-normal break-words">
                    {row.campaign_name}
                  </td>
                  <td className="max-w-[220px] px-5 py-4 opacity-75 whitespace-normal break-words">
                    {row.ad_group_name}
                  </td>
                  <td className="px-5 py-4 opacity-75">{money(row.cost)}</td>
                  <td className="px-5 py-4 opacity-75">{num(row.clicks, 0)}</td>
                  <td className="px-5 py-4 opacity-75">{num(row.conversions, 2)}</td>
                  <td className="px-5 py-4 opacity-75">{money(row.conversionValue)}</td>
                  <td className="px-5 py-4 font-black text-emerald-400">{num(row.roas)}</td>
                  <td className="px-5 py-4 opacity-75">{money(row.cpa)}</td>
                  <td className="px-5 py-4 opacity-75">{num(row.ctr)}%</td>
                  <td className="max-w-[320px] px-5 py-4 text-sm leading-6 opacity-80">
                    {row.decision.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
