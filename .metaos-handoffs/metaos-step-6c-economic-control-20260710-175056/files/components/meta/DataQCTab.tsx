"use client";

import { Download, ShieldAlert, ShieldCheck, WandSparkles } from "lucide-react";
import { useMemo } from "react";
import { useMetaStore } from "@/store/metaStore";

const money = (n: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n: number, d = 2) => Number(n || 0).toFixed(d);

function exportQcRows(rows: any[]) {
  const headers = [
    "Date",
    "Campaign",
    "Ad Set",
    "Ad",
    "Creative",
    "Spend",
    "Purchases",
    "Revenue",
    "CPA",
    "ROAS",
    "QC Flags",
  ];

  const body = rows.map((row) => [
    row.date || "",
    row.campaignName || "",
    row.adSetName || "",
    row.adName || "",
    row.creativeName || "",
    row.spend || 0,
    row.purchases || 0,
    row.revenue || 0,
    row.cpa || 0,
    row.roas || 0,
    row.__qc?.flags?.map((f: any) => `${f.code}: ${f.message}`).join(" | ") || "",
  ]);

  const csv = [headers, ...body]
    .map((line) => line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "meta-data-qc-report.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function QcCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "green" | "red" | "amber" | "blue" | "neutral";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "red"
        ? "text-red-600 dark:text-red-300"
        : tone === "amber"
          ? "text-orange-600 dark:text-orange-300"
          : tone === "blue"
            ? "text-[#0A84FF]"
            : "text-[var(--meta-text)]";

  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--meta-text-muted)]">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

export function DataQCTab() {
  const rows = useMetaStore((state) => state.performanceRows as any[]);
  const qcSummary = useMetaStore((state) => (state as any).metaQcSummary);

  const suspiciousRows = useMemo(() => {
    return rows
      .filter((row) => row.__qc?.flags?.length)
      .sort((a, b) => {
        const ac = a.__qc?.flags?.some((f: any) => f.severity === "critical") ? 1 : 0;
        const bc = b.__qc?.flags?.some((f: any) => f.severity === "critical") ? 1 : 0;
        return bc - ac;
      });
  }, [rows]);

  const shiftedRows = suspiciousRows.filter((row) => row.__qc?.shiftedPurchaseRow);

  return (
    <div className="data-qc-root grid gap-4">
      <section className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0A84FF]">
                Data QC
              </span>

              {qcSummary?.rowsWithCritical > 0 ? (
                <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-300">
                  Critical flags found
                </span>
              ) : (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                  Clean enough
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-[-0.04em]">
              Meta Data Quality Control
            </h1>

            <p className="mt-1 max-w-4xl text-sm text-[var(--meta-text-muted)]">
              QC checks raw Meta rows before CPA, ROAS, purchases, and revenue are trusted. Copy-paste shifted rows are corrected and flagged.
            </p>
          </div>

          <button
            type="button"
            onClick={() => exportQcRows(suspiciousRows)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0A84FF] px-4 text-xs font-black text-white shadow-lg shadow-blue-500/20"
          >
            <Download className="h-4 w-4" />
            Export QC
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        <QcCard label="Rows checked" value={String(qcSummary?.rowsChecked || rows.length || 0)} tone="blue" />
        <QcCard label="Clean rows" value={String(qcSummary?.cleanRows || 0)} tone="green" />
        <QcCard label="Critical rows" value={String(qcSummary?.rowsWithCritical || 0)} tone={qcSummary?.rowsWithCritical ? "red" : "green"} />
        <QcCard label="Warnings" value={String(qcSummary?.rowsWithWarnings || 0)} tone={qcSummary?.rowsWithWarnings ? "amber" : "green"} />
        <QcCard label="Shifted fixed" value={String(qcSummary?.shiftedRowsFixed || shiftedRows.length || 0)} tone={shiftedRows.length ? "red" : "green"} />
      </section>

      <section className="rounded-2xl border border-current/10 bg-current/[0.025] p-4">
        <div className="flex items-start gap-3">
          {qcSummary?.rowsWithCritical > 0 ? (
            <ShieldAlert className="mt-1 h-5 w-5 text-red-600 dark:text-red-300" />
          ) : qcSummary?.rowsWithWarnings > 0 ? (
            <WandSparkles className="mt-1 h-5 w-5 text-orange-600 dark:text-orange-300" />
          ) : (
            <ShieldCheck className="mt-1 h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          )}

          <div>
            <h2 className="text-lg font-black">QC read</h2>
            <p className="mt-1 text-sm text-[var(--meta-text-muted)]">
              {qcSummary?.shiftedRowsFixed > 0
                ? `${qcSummary.shiftedRowsFixed} shifted Meta export row(s) were corrected before calculation. Fix the source sheet and re-sync.`
                : "No shifted purchase rows detected in the current loaded data."}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-current/10 bg-current/[0.025]">
        <div className="border-b border-current/10 px-4 py-3">
          <h2 className="text-lg font-black">Flagged rows</h2>
          <p className="mt-1 text-sm text-[var(--meta-text-muted)]">
            Rows with critical or warning QC flags. Export this when you need to fix the sheet/source file.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-xs">
            <thead className="bg-[#14233b] text-white">
              <tr>
                {["Date", "Creative / Ad", "Campaign", "Spend", "Purchases", "Revenue", "CPA", "ROAS", "Flags"].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {suspiciousRows.slice(0, 300).map((row, index) => (
                <tr key={`${row.adId || row.adName || index}-${row.date}`} className="border-b border-current/10">
                  <td className="px-3 py-3">{row.date}</td>
                  <td className="max-w-[280px] px-3 py-3">
                    <p className="truncate font-black">{row.creativeName || row.adName}</p>
                    <p className="truncate text-[var(--meta-text-muted)]">{row.adName}</p>
                  </td>
                  <td className="max-w-[260px] px-3 py-3">
                    <p className="truncate">{row.campaignName}</p>
                  </td>
                  <td className="px-3 py-3">{money(row.spend)}</td>
                  <td className="px-3 py-3">{num(row.purchases, 0)}</td>
                  <td className="px-3 py-3">{money(row.revenue)}</td>
                  <td className="px-3 py-3">{row.purchases > 0 ? money(row.cpa) : "No sale"}</td>
                  <td className="px-3 py-3">{num(row.roas)}x</td>
                  <td className="px-3 py-3">
                    <div className="grid gap-1">
                      {row.__qc?.flags?.map((flag: any) => (
                        <span
                          key={`${flag.code}-${flag.field || ""}`}
                          title={flag.message}
                          className={
                            flag.severity === "critical"
                              ? "rounded-full border border-red-400/30 bg-red-400/10 px-2 py-1 text-[10px] font-black text-red-600 dark:text-red-300"
                              : "rounded-full border border-orange-400/30 bg-orange-400/10 px-2 py-1 text-[10px] font-black text-orange-600 dark:text-orange-300"
                          }
                        >
                          {flag.code}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}

              {!suspiciousRows.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--meta-text-muted)]">
                    No QC issues detected in current loaded data.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
