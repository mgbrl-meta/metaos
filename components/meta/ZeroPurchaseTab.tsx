"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

type MetricPack = {
  spend: number;
  revenue: number;
  purchases: number;
  impressions: number;
  reach: number;
  clicks: number;
  roas: number;
  cpa: number;
  aov: number;
  cpm: number;
  ctr: number;
  cpc: number;
  freq: number;
};

type ZeroPurchaseItem = {
  key: string;
  ad: string;
  campaign: string;
  adSet: string;
  lifetime: MetricPack;
  last7: MetricPack;
  yesterday: MetricPack;
  trend: Array<{
    date: string;
    spend: number;
    cpa: number | null;
    roas: number;
    purchases: number;
  }>;
};

type ZeroPurchasePayload = {
  source: string;
  sheetTab: string;
  rowCount: number;
  latest: string;
  latestRowCount: number;
  latestSpendAdCount: number;
  generatedAt: string;
  items: ZeroPurchaseItem[];
  error?: string;
};

const EMPTY_PAYLOAD: ZeroPurchasePayload = {
  source: "",
  sheetTab: "",
  rowCount: 0,
  latest: "",
  latestRowCount: 0,
  latestSpendAdCount: 0,
  generatedAt: "",
  items: [],
};

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);
const pct = (n: number, d = 2) => `${Number(n || 0).toFixed(d)}%`;

function toHandleOnly(adName: string) {
  const value = String(adName || "").trim();
  const handle = value.match(/@[a-zA-Z0-9._]+/);
  if (handle?.[0]) return handle[0];

  return value
    .split(/\s+-\s+/)[0]
    .replace(/[|·,\s]+$/g, "")
    .trim();
}

async function copyLines(lines: string[]) {
  const clean = Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean)));
  const text = clean.join("\n");

  if (!text) return 0;

  await navigator.clipboard.writeText(text);
  return clean.length;
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "red" | "green" | "blue" | "neutral";
}) {
  const toneClass =
    tone === "red"
      ? "text-red-600 dark:text-red-300"
      : tone === "green"
        ? "text-emerald-600 dark:text-emerald-300"
        : tone === "blue"
          ? "text-[#0A84FF]"
          : "";

  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.035] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">{label}</p>
      <p className={`mt-1 text-sm font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "red" | "green" | "neutral";
}) {
  const cls =
    tone === "red"
      ? "text-red-600 dark:text-red-300"
      : tone === "green"
        ? "text-emerald-600 dark:text-emerald-300"
        : "";

  return (
    <div className="min-w-[86px]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-55">{label}</p>
      <p className={`mt-1 text-sm font-black ${cls}`}>{value}</p>
    </div>
  );
}

function InfoBox({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.02] p-3">
      <h3 className="text-xs font-black uppercase tracking-[0.14em] opacity-70">{title}</h3>
      <div className="mt-2 grid gap-1 text-sm opacity-70">
        {lines.map((line) => (
          <p key={line}>• {line}</p>
        ))}
      </div>
    </div>
  );
}

export function ZeroPurchaseTab() {
  const [threshold, setThreshold] = useState(3000);
  const [payload, setPayload] = useState<ZeroPurchasePayload>(EMPTY_PAYLOAD);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function loadZeroPurchase() {
    setStatus("loading");
    setError("");

    try {
      const response = await fetch(`/api/meta-zero-purchase?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || `Zero Purchase API failed: ${response.status}`);
      }

      setPayload(json);
      setStatus("ready");
    } catch (err: any) {
      setPayload(EMPTY_PAYLOAD);
      setStatus("error");
      setError(err?.message || "Zero Purchase API failed");
    }
  }

  useEffect(() => {
    loadZeroPurchase();
  }, []);

  const data = useMemo(() => {
    const items = (payload.items || [])
      .filter((item) => item.lifetime.spend >= threshold)
      .sort((a, b) => b.lifetime.spend - a.lifetime.spend);

    return {
      items,
      totalSpend: items.reduce((sum, item) => sum + item.lifetime.spend, 0),
      yesterdaySpend: items.reduce((sum, item) => sum + item.yesterday.spend, 0),
    };
  }, [payload.items, threshold]);

  async function copyHandles() {
    const count = await copyLines(data.items.map((item) => toHandleOnly(item.ad)));
    setCopied(`${count} handles copied`);
    window.setTimeout(() => setCopied(""), 2000);
  }

  async function copyFullNames() {
    const count = await copyLines(data.items.map((item) => item.ad));
    setCopied(`${count} full names copied`);
    window.setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div className="grid gap-3">
      <section className="rounded-xl border border-current/10 bg-current/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">
              Zero Purchase Control
            </p>
            <h1 className="mt-1 text-2xl font-black">Live Zero-Purchase Ads</h1>
            <p className="mt-1 text-sm opacity-60">
              Server-side calculation from latest Google Sheet data. This tab no longer depends on stale browser performanceRows.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <Kpi label="Ads" value={String(data.items.length)} tone={data.items.length > 0 ? "red" : "green"} />
            <Kpi label="Lifetime Waste" value={money(data.totalSpend)} tone={data.totalSpend > 0 ? "red" : "green"} />
            <Kpi label="Latest-Day Waste" value={money(data.yesterdaySpend)} tone={data.yesterdaySpend > 0 ? "red" : "green"} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#0A84FF]" />
            <div>
              <h2 className="text-lg font-black">Lifetime Spend Threshold</h2>
              <p className="text-sm opacity-60">Filter zero-purchase ads by lifetime spend.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[2000, 3000, 5000, 10000].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setThreshold(value)}
                className={
                  threshold === value
                    ? "rounded-full bg-[#0A84FF] px-3 py-1.5 text-xs font-black text-white"
                    : "rounded-full border border-current/10 px-3 py-1.5 text-xs font-black"
                }
              >
                {money(value)}
              </button>
            ))}

            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value || 0)))}
              className="w-[130px] rounded-full border border-current/10 bg-transparent px-3 py-1.5 text-xs font-black outline-none"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
              API Source
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-300">
              Latest {payload.latest || "NA"}
            </span>
            <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
              Rows {payload.rowCount.toLocaleString("en-IN")}
            </span>
            <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
              Latest Rows {payload.latestRowCount.toLocaleString("en-IN")}
            </span>
            <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
              Latest Spend Ads {payload.latestSpendAdCount.toLocaleString("en-IN")}
            </span>
            <span className="rounded-full border border-current/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
              Sheet {payload.sheetTab || "NA"}
            </span>
          </div>

          <button
            type="button"
            onClick={loadZeroPurchase}
            className="inline-flex items-center gap-2 rounded-full border border-current/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] hover:bg-current/10"
          >
            <RefreshCw className={status === "loading" ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Refresh
          </button>
        </div>

        {status === "error" ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-black">Zero Purchase API failed</p>
              <p className="mt-1 opacity-80">{error}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-current/10 bg-current/[0.025]">
        <div className="flex flex-col gap-3 border-b border-current/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black">Live Ads With Zero Purchases</h2>
            <p className="mt-1 text-sm opacity-60">
              Latest-day spending ads with lifetime purchases = 0 and lifetime spend above {money(threshold)}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {copied ? <span className="text-xs font-black text-emerald-600 dark:text-emerald-300">{copied}</span> : null}

            <button
              type="button"
              onClick={copyHandles}
              className="inline-flex items-center gap-2 rounded-full bg-[#0A84FF] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Handles
            </button>

            <button
              type="button"
              onClick={copyFullNames}
              className="inline-flex items-center gap-2 rounded-full border border-current/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em]"
            >
              Full Names
            </button>
          </div>
        </div>

        <div className="divide-y divide-current/10">
          {status === "loading" ? (
            <div className="p-5 text-sm opacity-60">Loading server-side Zero Purchase data...</div>
          ) : null}

          {status !== "loading" &&
            data.items.map((item) => (
              <details key={item.key} className="group">
                <summary className="grid cursor-pointer list-none items-center gap-3 px-4 py-3 text-xs hover:bg-current/[0.035] xl:grid-cols-[minmax(420px,1fr)_repeat(8,120px)_24px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                        Zero Purchase
                      </span>
                      <span className="rounded-full border border-current/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
                        Latest Spend {money(item.yesterday.spend)}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-sm font-black">{item.ad}</p>
                    <p className="mt-0.5 truncate opacity-60">
                      {item.campaign} · {item.adSet}
                    </p>
                  </div>

                  <Metric label="Life Spend" value={money(item.lifetime.spend)} tone="red" />
                  <Metric label="CPM" value={money(item.lifetime.cpm)} />
                  <Metric label="CTR" value={pct(item.lifetime.ctr)} />
                  <Metric label="CPA" value="No sale" tone="red" />
                  <Metric label="ROAS" value={`${num(item.lifetime.roas)}x`} tone="red" />
                  <Metric label="Last 7D Spend" value={money(item.last7.spend)} />
                  <Metric label="Last 7D CPA" value="No sale" tone="red" />
                  <Metric label="Last 7D ROAS" value={`${num(item.last7.roas)}x`} tone="red" />
                  <ChevronDown className="h-4 w-4 opacity-45 transition group-open:rotate-180" />
                </summary>

                <div className="grid gap-3 px-4 pb-4 lg:grid-cols-3">
                  <InfoBox
                    title="Why This Is Critical"
                    lines={[
                      `This ad spent ${money(item.lifetime.spend)} lifetime with 0 purchases.`,
                      `It spent ${money(item.yesterday.spend)} on latest date ${payload.latest || "NA"}.`,
                      `Last 7D spend is ${money(item.last7.spend)} with 0 purchases.`,
                    ]}
                  />

                  <InfoBox
                    title="Metric Read"
                    lines={[
                      `CPM: ${money(item.lifetime.cpm)}`,
                      `CTR: ${pct(item.lifetime.ctr)}`,
                      `CPC: ${money(item.lifetime.cpc)}`,
                      `Frequency: ${num(item.lifetime.freq)}`,
                      `ROAS: ${num(item.lifetime.roas)}x`,
                    ]}
                  />

                  <InfoBox
                    title="Action"
                    lines={[
                      "Pause if creative has no strategic learning value.",
                      "If CTR is strong, inspect PDP, offer, audience, and landing-page fit.",
                      "If CPM is high and CTR is weak, rebuild the creative angle.",
                    ]}
                  />
                </div>
              </details>
            ))}

          {status !== "loading" && !data.items.length ? (
            <div className="p-5">
              <p className="font-black">No zero-purchase live ads found at this threshold.</p>
              <p className="mt-1 text-sm opacity-60">
                Try lowering the threshold. Remember: Akanksha lifetime spend is around ₹2,851, so it appears at ₹2,000 but not ₹3,000.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
