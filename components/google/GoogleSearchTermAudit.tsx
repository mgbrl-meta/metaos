"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  Layers,
  Search,
  ShieldCheck,
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

type GoogleTab =
  | "search_terms"
  | "campaigns"
  | "adgroups"
  | "keywords"
  | "ads"
  | "summary";

type Row = {
  date: string;
  campaign_id?: string;
  campaign_name?: string;
  ad_group_id?: string;
  ad_group_name?: string;
  entity_name?: string;
  search_term?: string;
  keyword_text?: string;
  ad_name?: string;
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
const pct = (n: number) => `${num(Number(n || 0) * 100)}%`;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

const SETTINGS = {
  targetRoas: 5,
  targetCpa: 500,
  minSpendNoConversion: 1000,
  minClicksNoConversion: 20,
  minConversionsScale: 3,
  badRoas: 2,
  brandTerms: ["brillare", "brillaire", "brilar", "billare", "brillar"],
  negativeTerms: [
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

const googleTabs: { id: GoogleTab; label: string; icon: any; desc: string }[] = [
  { id: "search_terms", label: "Search Terms", icon: Search, desc: "Negatives and exact keywords" },
  { id: "campaigns", label: "Campaigns", icon: BarChart3, desc: "Campaign efficiency" },
  { id: "adgroups", label: "Ad Groups", icon: Layers, desc: "Ad group control" },
  { id: "keywords", label: "Keywords", icon: Sparkles, desc: "Keyword pruning" },
  { id: "ads", label: "Ads", icon: FileText, desc: "Ad copy performance" },
  { id: "summary", label: "Team Summary", icon: ShieldCheck, desc: "Daily Google action note" },
];

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

function latestDate(rows: Row[]) {
  const dates = rows.map((r) => parseDate(r.date)).filter(Boolean) as Date[];
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function windowRows(rows: Row[], days: number, latest: Date | null) {
  if (!latest) return [];
  const end = new Date(latest);
  const start = new Date(latest);
  start.setDate(start.getDate() - days + 1);

  return rows.filter((r) => {
    const d = parseDate(r.date);
    return d ? d >= start && d <= end : false;
  });
}

function summarize(rows: Row[]) {
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || 0), 0);
  const cost = rows.reduce((s, r) => s + Number(r.cost || 0), 0);
  const conversions = rows.reduce((s, r) => s + Number(r.conversions || 0), 0);
  const value = rows.reduce((s, r) => s + Number(r.conversion_value || 0), 0);

  return {
    impressions,
    clicks,
    cost,
    conversions,
    value,
    roas: safeDiv(value, cost),
    cpa: safeDiv(cost, conversions),
    ctr: safeDiv(clicks, impressions),
    cpc: safeDiv(cost, clicks),
    cvr: safeDiv(conversions, clicks),
    aov: safeDiv(value, conversions),
  };
}

function groupRows(rows: Row[], tab: GoogleTab) {
  const map = new Map<string, any>();

  rows.forEach((r) => {
    const entity =
      tab === "search_terms"
        ? r.search_term || r.entity_name || "Unknown Search Term"
        : tab === "keywords"
        ? r.keyword_text || r.entity_name || "Unknown Keyword"
        : tab === "ads"
        ? r.ad_name || r.entity_name || "Unknown Ad"
        : r.entity_name || r.campaign_name || r.ad_group_name || "Unknown";

    const key =
      tab === "campaigns"
        ? String(r.campaign_id || entity)
        : tab === "adgroups"
        ? `${r.campaign_id}|${r.ad_group_id || entity}`
        : `${r.campaign_id}|${r.ad_group_id}|${entity}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        entity,
        campaign_name: r.campaign_name || "",
        ad_group_name: r.ad_group_name || "",
        rows: [],
      });
    }

    map.get(key).rows.push(r);
  });

  return Array.from(map.values()).map((item) => ({
    ...item,
    ...summarize(item.rows),
  }));
}

function containsAny(text: string, terms: string[]) {
  const t = text.toLowerCase();
  return terms.some((x) => t.includes(x.toLowerCase()));
}

function classify(row: any, tab: GoogleTab) {
  const name = String(row.entity || "").toLowerCase();

  if (tab === "search_terms" && containsAny(name, SETTINGS.negativeTerms)) {
    return {
      label: "Hard Negative",
      tone: "red" as const,
      action: "Add as negative after intent check.",
      why: "Low-intent or irrelevant query pattern.",
      priority: 1,
    };
  }

  if (row.cost >= SETTINGS.minSpendNoConversion && row.conversions === 0) {
    return {
      label: tab === "search_terms" ? "Hard Negative" : "Cut / Reduce",
      tone: "red" as const,
      action: tab === "search_terms" ? "Add negative or isolate with control." : "Reduce spend or pause until fixed.",
      why: "High spend with zero conversions.",
      priority: 1,
    };
  }

  if (row.clicks >= SETTINGS.minClicksNoConversion && row.conversions === 0) {
    return {
      label: "Watch / Negative",
      tone: "yellow" as const,
      action: "Review intent. If not purchase-intent, exclude.",
      why: "Enough clicks but no conversion.",
      priority: 2,
    };
  }

  if (tab === "search_terms" && containsAny(name, SETTINGS.brandTerms)) {
    return {
      label: "Brand Protection",
      tone: "blue" as const,
      action: "Keep protected. Monitor impression share and CPA.",
      why: "Brand or brand-misspelling intent.",
      priority: 4,
    };
  }

  if (row.conversions >= SETTINGS.minConversionsScale && row.roas >= SETTINGS.targetRoas && row.cpa <= SETTINGS.targetCpa) {
    return {
      label: tab === "search_terms" ? "Promote Exact" : "Scale Carefully",
      tone: "green" as const,
      action: tab === "search_terms" ? "Add as exact keyword or isolate." : "Scale carefully without disrupting structure.",
      why: "Strong ROAS, CPA and conversion signal.",
      priority: 3,
    };
  }

  if (row.cost > 0 && row.roas > 0 && row.roas < SETTINGS.badRoas) {
    return {
      label: "Reduce / Investigate",
      tone: "red" as const,
      action: "Check bid, landing page, query mix and intent.",
      why: "ROAS below acceptable floor.",
      priority: 2,
    };
  }

  return {
    label: "Watch",
    tone: "neutral" as const,
    action: "Wait for stronger signal.",
    why: "Insufficient signal for decisive action.",
    priority: 5,
  };
}

function apiTab(tab: GoogleTab) {
  if (tab === "summary") return "search_terms";
  return tab;
}

export function GoogleSearchTermAudit({ initialTab = "search_terms" }: { initialTab?: GoogleTab }) {
  const [activeTab, setActiveTab] = useState<GoogleTab>(initialTab);
  const [period, setPeriod] = useState<"yesterday" | "l7">("yesterday");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/google-os?tab=${apiTab(activeTab)}&limit=30000`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Failed to fetch Google OS data");

        setRows(json.rows || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load Google OS");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [activeTab]);

  const data = useMemo(() => {
    const latest = latestDate(rows);
    const scoped = period === "yesterday" ? windowRows(rows, 1, latest) : windowRows(rows, 7, latest);
    const summary = summarize(scoped);

    const grouped = groupRows(scoped, activeTab)
      .map((r) => ({
        ...r,
        decision: classify(r, activeTab),
      }))
      .sort((a, b) => a.decision.priority - b.decision.priority || b.cost - a.cost);

    const filtered =
      filter === "all"
        ? grouped
        : grouped.filter((r) => r.decision.label.toLowerCase().replaceAll(" ", "_").replaceAll("/", "") === filter);

    return {
      latest,
      summary,
      grouped,
      filtered,
      hard: grouped.filter((r) => ["Hard Negative", "Cut / Reduce"].includes(r.decision.label)),
      soft: grouped.filter((r) => r.decision.label === "Watch / Negative"),
      winners: grouped.filter((r) => ["Promote Exact", "Scale Carefully"].includes(r.decision.label)),
      weak: grouped.filter((r) => r.decision.label === "Reduce / Investigate"),
    };
  }, [rows, activeTab, period, filter]);

  if (loading) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-2xl font-black">Google OS</h2>
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
        title={activeTab === "summary" ? "Google Daily Team Summary" : googleTabs.find((t) => t.id === activeTab)?.label || "Google OS"}
        description="Professional Google Ads command center for waste control, search term negatives, exact keyword opportunities and budget efficiency."
      />

      <GlassCard className="p-5 min-w-0">
        <div className="grid gap-3 lg:grid-cols-6">
          {googleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFilter("all");
                }}
                className={
                  active
                    ? "rounded-2xl bg-emerald-400 p-4 text-left text-black shadow-[0_14px_34px_rgba(52,168,83,0.22)]"
                    : "rounded-2xl border border-current/10 bg-current/[0.035] p-4 text-left hover:bg-current/[0.06]"
                }
              >
                <Icon className="h-5 w-5" />
                <p className="mt-3 text-sm font-black">{tab.label}</p>
                <p className={active ? "mt-1 text-xs text-black/65" : "mt-1 text-xs opacity-50"}>{tab.desc}</p>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-5 min-w-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <TonePill tone="green">BigQuery Live</TonePill>
              <TonePill tone="blue">Conversions + Value Only</TonePill>
              <TonePill tone="neutral">Latest: {data.latest ? dateKey(data.latest) : "NA"}</TonePill>
            </div>
            <h2 className="mt-4 text-2xl font-black">
              {period === "yesterday" ? "Yesterday Action Layer" : "Last 7 Days Confirmation Layer"}
            </h2>
            <MutedText className="mt-2 max-w-4xl text-sm leading-6">
              The view is action-first: cut waste, protect winners, promote exact keywords, and identify weak pockets before scaling.
            </MutedText>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPeriod("yesterday")}
              className={period === "yesterday" ? "rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-black" : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"}
            >
              Yesterday
            </button>
            <button
              onClick={() => setPeriod("l7")}
              className={period === "l7" ? "rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-black" : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"}
            >
              Last 7D
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Spend" value={money(data.summary.cost)} tone="neutral" />
        <MetricCard label="Conv. Value" value={money(data.summary.value)} tone="green" />
        <MetricCard label="ROAS" value={num(data.summary.roas)} tone={data.summary.roas >= SETTINGS.targetRoas ? "green" : "red"} />
        <MetricCard label="CPA" value={money(data.summary.cpa)} tone={data.summary.cpa <= SETTINGS.targetCpa ? "green" : "yellow"} />
        <MetricCard label="Waste / Cut" value={String(data.hard.length)} tone={data.hard.length ? "red" : "green"} />
        <MetricCard label="Review" value={String(data.soft.length)} tone={data.soft.length ? "yellow" : "green"} />
        <MetricCard label="Winners" value={String(data.winners.length)} tone={data.winners.length ? "green" : "neutral"} />
        <MetricCard label="Weak ROAS" value={String(data.weak.length)} tone={data.weak.length ? "red" : "green"} />
      </div>

      {activeTab === "summary" ? (
        <TeamSummary grouped={data.grouped} summary={data.summary} />
      ) : (
        <>
          <GlassCard className="p-5 min-w-0">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["hard_negative", "Hard Negative"],
                ["cut__reduce", "Cut / Reduce"],
                ["watch__negative", "Watch / Negative"],
                ["promote_exact", "Promote Exact"],
                ["scale_carefully", "Scale Carefully"],
                ["brand_protection", "Brand Protection"],
                ["reduce__investigate", "Reduce / Investigate"],
                ["watch", "Watch"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={filter === value ? "rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-black" : "rounded-full border border-current/10 px-4 py-2 text-xs font-black opacity-70"}
                >
                  {label}
                </button>
              ))}
            </div>
          </GlassCard>

          <div className="grid min-w-0 gap-4">
            {data.filtered.slice(0, 120).map((row) => (
              <Surface key={row.key} className="p-5">
                <div className="grid gap-5 xl:grid-cols-[1fr_220px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-black leading-7 whitespace-normal break-words">{row.entity}</p>
                        <MutedText className="mt-1 text-sm leading-6">
                          Campaign: {row.campaign_name || "—"}
                          {row.ad_group_name ? (
                            <>
                              <br />
                              Ad Group: {row.ad_group_name}
                            </>
                          ) : null}
                        </MutedText>
                      </div>

                      <TonePill tone={row.decision.tone}>{row.decision.label}</TonePill>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                      <Mini label="Spend" value={money(row.cost)} />
                      <Mini label="Clicks" value={num(row.clicks, 0)} />
                      <Mini label="Conv." value={num(row.conversions, 2)} />
                      <Mini label="Value" value={money(row.value)} />
                      <Mini label="ROAS" value={num(row.roas)} />
                      <Mini label="CPA" value={money(row.cpa)} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <InsightCard title="Why" text={row.decision.why} icon={<AlertTriangle className="h-4 w-4" />} />
                      <InsightCard title="Action" text={row.decision.action} icon={<CheckCircle2 className="h-4 w-4" />} />
                      <InsightCard title="Signal" text={`CTR ${pct(row.ctr)} · CPC ${money(row.cpc)} · CVR ${pct(row.cvr)}`} icon={<BarChart3 className="h-4 w-4" />} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-current/10 bg-current/[0.03] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] opacity-45">Operator Note</p>
                    <p className="mt-3 text-sm leading-6 opacity-80">
                      {row.decision.priority <= 2
                        ? "Resolve this before scaling. Do not let budget continue into weak intent or weak economics."
                        : row.decision.priority === 3
                        ? "This is a controlled scale opportunity. Create tighter control before increasing budget."
                        : "Keep monitoring. Wait for more signal before changing structure."}
                    </p>
                  </div>
                </div>
              </Surface>
            ))}

            {!data.filtered.length && (
              <GlassCard className="p-8">
                <p className="font-black">No rows found for this filter.</p>
              </GlassCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TeamSummary({ grouped, summary }: { grouped: any[]; summary: any }) {
  const cuts = grouped.filter((r) => ["Hard Negative", "Cut / Reduce", "Reduce / Investigate"].includes(r.decision.label));
  const winners = grouped.filter((r) => ["Promote Exact", "Scale Carefully"].includes(r.decision.label));
  const cutPool = cuts.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="grid gap-6">
      <GlassCard className="p-6">
        <h2 className="text-2xl font-black">Google Daily Action Summary</h2>
        <MutedText className="mt-2 max-w-4xl text-sm leading-6">
          Today’s priority is to cut query waste first, then promote winning exact terms and protect profitable campaigns.
        </MutedText>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard label="Cut / Reduce Pool" value={money(cutPool)} tone={cutPool ? "red" : "green"} />
          <MetricCard label="Winner Opportunities" value={String(winners.length)} tone={winners.length ? "green" : "neutral"} />
          <MetricCard label="Overall ROAS" value={num(summary.roas)} tone={summary.roas >= SETTINGS.targetRoas ? "green" : "red"} />
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="text-xl font-black">Priority Actions</h3>
        <div className="mt-4 grid gap-3">
          {cuts.slice(0, 15).map((r) => (
            <Surface key={r.key} className="p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-black">{r.entity}</p>
                  <MutedText className="mt-1 text-xs">{r.campaign_name}</MutedText>
                </div>
                <TonePill tone={r.decision.tone}>{r.decision.label}</TonePill>
              </div>
              <p className="mt-3 text-sm opacity-80">{r.decision.action}</p>
            </Surface>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.035] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-40">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function InsightCard({ title, text, icon }: { title: string; text: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
      <div className="flex items-center gap-2 opacity-60">
        {icon}
        <p className="text-xs font-black uppercase tracking-[0.14em]">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 opacity-80">{text}</p>
    </div>
  );
}
