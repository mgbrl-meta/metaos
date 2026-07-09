"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Copy, ShieldAlert, SlidersHorizontal } from "lucide-react";
import type { MetaV2CleanRow } from "@/lib/meta-v2/schema";
import {
  buildMetaV2ZeroPurchase,
  type MetaV2ZeroPurchaseItem,
} from "@/lib/meta-v2/engines/zeroPurchaseEngine";
import {
  formatINRCompact,
  formatNumberCompact,
  formatRoas,
} from "@/lib/meta-v2/formatters";
import { MetricCard } from "@/components/meta-v2/shared/MetricCard";
import { SectionCard } from "@/components/meta-v2/shared/SectionCard";
import { StatusPill } from "@/components/meta-v2/shared/StatusPill";
import { EmptyState } from "@/components/meta-v2/shared/EmptyState";

function handleOnly(adName: string) {
  const value = String(adName || "").trim();
  const match = value.match(/@[a-zA-Z0-9._]+/);
  if (match?.[0]) return match[0];

  return value
    .split(/\s+-\s+/)[0]
    .replace(/[|·,\s]+$/g, "")
    .trim();
}

async function copyLines(lines: string[]) {
  const clean = Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean)));
  await navigator.clipboard.writeText(clean.join("\n"));
  return clean.length;
}

function severityTone(severity: MetaV2ZeroPurchaseItem["severity"]) {
  if (severity === "critical") return "red";
  if (severity === "high") return "amber";
  return "blue";
}

function Cell({
  value,
  tone = "normal",
}: {
  value: string;
  tone?: "normal" | "green" | "red" | "blue" | "amber";
}) {
  const color =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-red-300"
        : tone === "blue"
          ? "text-[#6BB6FF]"
          : tone === "amber"
            ? "text-amber-200"
            : "text-white/78";

  return (
    <td className={`whitespace-nowrap px-4 py-4 text-right text-sm font-black tabular-nums ${color}`}>
      {value}
    </td>
  );
}

function TrendMiniTable({ item }: { item: MetaV2ZeroPurchaseItem }) {
  return (
    <div className="overflow-x-auto rounded-[22px] border border-white/10">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="bg-white/[0.06] text-white/42">
          <tr>
            <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em]">Date</th>
            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Spend</th>
            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Clicks</th>
            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">LPV</th>
            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">ATC</th>
            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">Purchases</th>
            <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-[0.14em]">ROAS</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-white/10">
          {item.trend.map((row) => (
            <tr key={row.date} className="bg-white/[0.02]">
              <td className="whitespace-nowrap px-3 py-3 text-left text-sm font-bold text-white/72">
                {row.date}
              </td>
              <Cell value={formatINRCompact(row.spend)} tone={row.spend > 0 ? "red" : "normal"} />
              <Cell value={formatNumberCompact(row.clicks)} />
              <Cell value={formatNumberCompact(row.lpv)} />
              <Cell value={formatNumberCompact(row.atc)} tone={row.atc > 0 ? "amber" : "normal"} />
              <Cell value={formatNumberCompact(row.purchases)} tone={row.purchases > 0 ? "green" : "red"} />
              <Cell value={formatRoas(row.roas)} tone={row.roas > 0 ? "green" : "red"} />
            </tr>
          ))}

          {!item.trend.length ? (
            <tr>
              <td colSpan={7} className="px-3 py-5 text-sm text-white/45">
                No recent trend available.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function DetailCard({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <h3 className="text-sm font-black text-white">{title}</h3>
      <div className="mt-2 grid gap-1 text-sm leading-6 text-white/55">
        {lines.map((line) => (
          <p key={line}>• {line}</p>
        ))}
      </div>
    </div>
  );
}

export function ZeroPurchaseDashboard({ rows }: { rows: MetaV2CleanRow[] }) {
  const [threshold, setThreshold] = useState(3000);
  const [openId, setOpenId] = useState("");
  const [copied, setCopied] = useState("");

  const output = useMemo(() => buildMetaV2ZeroPurchase(rows, threshold), [rows, threshold]);

  async function copyHandles() {
    const count = await copyLines(output.items.map((item) => handleOnly(item.adName)));
    setCopied(`${count} handles copied`);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function copyAdNames() {
    const count = await copyLines(output.items.map((item) => item.adName));
    setCopied(`${count} ad names copied`);
    window.setTimeout(() => setCopied(""), 1800);
  }

  if (!rows.length) {
    return <EmptyState title="Zero Purchase data unavailable" description="Load Meta rows first." />;
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.25),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusPill label="Zero Purchase V2" tone="red" />
          <StatusPill label={`${output.totalItems} ads`} tone={output.totalItems > 0 ? "red" : "green"} />
          <StatusPill label={`Latest ${output.latestDate || "NA"}`} tone="slate" />
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Zero-Purchase Waste Control</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-white/58">{output.verdict}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Waste Ads" value={String(output.totalItems)} tone={output.totalItems > 0 ? "red" : "green"} />
        <MetricCard label="Lifetime Waste" value={formatINRCompact(output.totalLifetimeWaste)} tone="red" />
        <MetricCard label="Last 7D Waste" value={formatINRCompact(output.totalLast7Waste)} tone={output.totalLast7Waste > 0 ? "red" : "green"} />
        <MetricCard label="Latest Waste" value={formatINRCompact(output.totalLatestWaste)} tone={output.totalLatestWaste > 0 ? "red" : "green"} />
      </section>

      <SectionCard
        title="Waste Filter"
        eyebrow="Control Threshold"
        right={<SlidersHorizontal className="h-5 w-5 text-[#0A84FF]" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {[2000, 3000, 5000, 10000].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setThreshold(value)}
              className={
                threshold === value
                  ? "rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
                  : "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/58 hover:bg-white/[0.08]"
              }
            >
              {formatINRCompact(value)}
            </button>
          ))}

          <input
            type="number"
            value={threshold}
            onChange={(event) => setThreshold(Math.max(0, Number(event.target.value || 0)))}
            className="h-9 w-[140px] rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-white outline-none"
          />

          {copied ? <span className="ml-auto text-xs font-black text-emerald-300">{copied}</span> : null}

          <button
            type="button"
            onClick={copyHandles}
            className="inline-flex items-center gap-2 rounded-full bg-[#0A84FF] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Handles
          </button>

          <button
            type="button"
            onClick={copyAdNames}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/65"
          >
            Copy Names
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Ads With Spend But Zero Purchases" eyebrow="Budget Recovery">
        <div className="overflow-x-auto rounded-[24px] border border-white/10">
          <table className="w-full min-w-[1220px] border-collapse">
            <thead className="bg-white/[0.06] text-white/42">
              <tr>
                <th className="w-[330px] px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.15em]">Ad</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Lifetime</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Latest</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Last 7D</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Clicks</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">LPV</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">ATC</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">Purchases</th>
                <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.15em]">ROAS</th>
                <th className="w-[70px] px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.15em]">Open</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {output.items.map((item) => {
                const isOpen = openId === item.id;

                return (
                  <Fragment key={item.id}>
                    <tr className="bg-white/[0.025] hover:bg-white/[0.045]">
                      <td className="px-4 py-4 text-left">
                        <div className="mb-2">
                          <StatusPill label={item.severity} tone={severityTone(item.severity)} />
                        </div>

                        <div className="max-w-[310px] truncate text-sm font-black text-white" title={item.adName}>
                          {item.adName}
                        </div>

                        <div className="mt-1 max-w-[310px] truncate text-xs font-medium text-white/38" title={`${item.campaignName} · ${item.adSetName}`}>
                          {item.campaignName} · {item.adSetName}
                        </div>
                      </td>

                      <Cell value={formatINRCompact(item.lifetime.spend)} tone="red" />
                      <Cell value={formatINRCompact(item.latest.spend)} tone={item.latest.spend > 0 ? "red" : "normal"} />
                      <Cell value={formatINRCompact(item.last7.spend)} tone={item.last7.spend > 0 ? "red" : "normal"} />
                      <Cell value={formatNumberCompact(item.lifetime.clicks)} />
                      <Cell value={formatNumberCompact(item.lifetime.lpv)} />
                      <Cell value={formatNumberCompact(item.lifetime.atc)} tone={item.lifetime.atc > 0 ? "amber" : "normal"} />
                      <Cell value={formatNumberCompact(item.lifetime.purchases)} tone="red" />
                      <Cell value={formatRoas(item.lifetime.roas)} tone="red" />

                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setOpenId(isOpen ? "" : item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.1]"
                        >
                          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr>
                        <td colSpan={10} className="bg-white/[0.018] px-4 py-4">
                          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.4fr]">
                            <DetailCard
                              title="Why This Is Waste"
                              lines={[
                                item.reason,
                                `Lifetime spend is ${formatINRCompact(item.lifetime.spend)} with zero purchases.`,
                                `Latest spend is ${formatINRCompact(item.latest.spend)}.`,
                              ]}
                            />

                            <DetailCard
                              title="Operator Action"
                              lines={[
                                item.action,
                                "Check LPV and ATC before deciding permanent kill vs offer/PDP fix.",
                                "Do not scale surrounding ad set until this leakage is controlled.",
                              ]}
                            />

                            <TrendMiniTable item={item} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}

              {!output.items.length ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8">
                    <EmptyState
                      title="No zero-purchase waste at this threshold"
                      description="Lower the threshold or check another time window."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
