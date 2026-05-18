"use client";

import ExcelJS from "exceljs";
import Papa from "papaparse";
import { FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { useMetaStore } from "@/store/metaStore";
import { enrichRows } from "@/lib/metrics";
import { DataHealth, MetaNormalizedRow } from "@/types/meta";
import { GlassCard, MetaButton, MutedText, Surface, TonePill } from "@/components/cards/MetaCards";

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[₹,% ,]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getValue(row: Record<string, unknown>, possibleKeys: string[]) {
  const normalizedMap = Object.keys(row).reduce<Record<string, string>>((acc, key) => {
    acc[key.toLowerCase().trim()] = key;
    return acc;
  }, {});

  for (const key of possibleKeys) {
    const matchedKey = normalizedMap[key.toLowerCase().trim()];
    if (matchedKey) return row[matchedKey];
  }

  return undefined;
}

function normalizeRows(rows: Record<string, unknown>[]): MetaNormalizedRow[] {
  return rows.map((row) => ({
    date: String(getValue(row, ["Day", "Date", "Reporting starts", "Reporting Starts"]) ?? ""),
    campaignName: String(getValue(row, ["Campaign name", "Campaign Name"]) ?? "Unknown Campaign"),
    campaignId: String(getValue(row, ["Campaign ID", "Campaign id"]) ?? ""),
    adSetName: String(getValue(row, ["Ad set name", "Ad Set Name"]) ?? "Unknown Ad Set"),
    adSetId: String(getValue(row, ["Ad set ID", "Ad Set ID"]) ?? ""),
    adName: String(getValue(row, ["Ad name", "Ad Name"]) ?? "Unknown Ad"),
    adId: String(getValue(row, ["Ad ID", "Ad id"]) ?? ""),
    deliveryStatus: String(getValue(row, ["Delivery status", "Delivery", "Ad delivery"]) ?? ""),
    spend: toNumber(getValue(row, ["Amount spent (INR)", "Amount spent", "Spend"])),
    revenue: toNumber(getValue(row, ["Purchases conversion value", "Purchase conversion value", "Revenue", "Conversion value"])),
    purchases: toNumber(getValue(row, ["Purchases", "Website purchases"])),
    impressions: toNumber(getValue(row, ["Impressions"])),
    reach: toNumber(getValue(row, ["Reach"])),
    frequency: toNumber(getValue(row, ["Frequency"])),
    clicks: toNumber(getValue(row, ["Clicks (all)", "Clicks"])),
    linkClicks: toNumber(getValue(row, ["Link clicks", "Outbound clicks"])),
    landingPageViews: toNumber(getValue(row, ["Landing page views", "LPV"])),
    contentViews: toNumber(getValue(row, ["Content views", "View content"])),
    addToCart: toNumber(getValue(row, ["Adds to cart", "Add to cart"])),
    checkoutInitiated: toNumber(getValue(row, ["Checkouts initiated", "Initiate checkout"])),
    paymentInfo: toNumber(getValue(row, ["Adds of payment info", "Payment info"])),
  }));
}

function buildDataHealth(rows: MetaNormalizedRow[], columnsDetected: number): DataHealth {
  const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalPurchases = rows.reduce((sum, row) => sum + row.purchases, 0);

  const dates = rows.map((row) => row.date).filter(Boolean);
  const dateRange = dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : "Not detected";

  const warnings: string[] = [];
  if (!totalSpend) warnings.push("Spend was not detected.");
  if (!totalRevenue) warnings.push("Revenue / purchase value was not detected.");
  if (!totalPurchases) warnings.push("Purchases were not detected.");
  if (!rows.some((row) => row.landingPageViews > 0)) warnings.push("Landing page views were not detected.");
  if (!rows.some((row) => row.addToCart > 0)) warnings.push("Add to cart data was not detected.");

  return {
    score: Math.max(40, 100 - warnings.length * 12),
    rowsImported: rows.length,
    columnsDetected,
    dateRange,
    totalSpend,
    totalRevenue,
    totalPurchases,
    warnings,
  };
}

function worksheetToJson(worksheet: ExcelJS.Worksheet): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as unknown[];

    if (rowNumber === 1) {
      values.forEach((value, index) => {
        if (index > 0) headers[index] = String(value ?? "").trim();
      });
      return;
    }

    const obj: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) obj[header] = values[index] ?? "";
    });

    if (Object.values(obj).some((value) => value !== "" && value !== null && value !== undefined)) {
      rows.push(obj);
    }
  });

  return rows;
}

export function UploadPanel() {
  const { dataHealth, settings, setRawRows, setPerformanceRows, setDataHealth, clearUpload } = useMetaStore();

  const processRows = (jsonRows: Record<string, unknown>[]) => {
    const normalized = normalizeRows(jsonRows);
    setRawRows(normalized);
    setPerformanceRows(enrichRows(normalized, settings));
    setDataHealth(buildDataHealth(normalized, Object.keys(jsonRows[0] ?? {}).length));
  };

  const handleFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "xls") {
      alert("Old .xls files are not supported. Convert to .xlsx or .csv first.");
      return;
    }

    if (extension === "csv") {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => processRows(result.data),
      });
      return;
    }

    if (extension === "xlsx") {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        alert("No worksheet found.");
        return;
      }

      processRows(worksheetToJson(worksheet));
      return;
    }

    alert("Unsupported file type. Upload .csv or .xlsx.");
  };

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0A84FF]">Data Input</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Upload Meta Raw Data</h1>
        <MutedText className="mt-2">Upload CSV or XLSX export from Meta Ads Manager. Data is processed locally.</MutedText>
      </div>

      <GlassCard className="p-10">
        <div className="flex flex-col items-center justify-center gap-5 text-center">
          <div className="rounded-3xl border border-[#0A84FF]/30 bg-[#0A84FF]/10 p-5 text-[#0A84FF]">
            <Upload className="h-8 w-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black">Drop your Meta file</h2>
            <MutedText className="mt-2">Supports .xlsx and .csv</MutedText>
          </div>

          <input
            type="file"
            accept=".xlsx,.csv"
            className="w-full max-w-sm rounded-2xl border border-current/10 bg-transparent p-3 text-sm outline-none"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      </GlassCard>

      {dataHealth && (
        <GlassCard className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-[#0A84FF]" />
              <h2 className="text-xl font-black">Data Health</h2>
              <TonePill tone={dataHealth.score >= 80 ? "green" : dataHealth.score >= 60 ? "yellow" : "red"}>
                {dataHealth.score}/100
              </TonePill>
            </div>

            <MetaButton variant="secondary" onClick={clearUpload}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </MetaButton>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <HealthCard label="Rows Imported" value={dataHealth.rowsImported.toLocaleString()} />
            <HealthCard label="Columns Detected" value={dataHealth.columnsDetected.toLocaleString()} />
            <HealthCard label="Date Range" value={dataHealth.dateRange} />
            <HealthCard label="Total Spend" value={`₹${Math.round(dataHealth.totalSpend).toLocaleString()}`} />
            <HealthCard label="Total Revenue" value={`₹${Math.round(dataHealth.totalRevenue).toLocaleString()}`} />
            <HealthCard label="Purchases" value={dataHealth.totalPurchases.toLocaleString()} />
          </div>

          {dataHealth.warnings.length > 0 && (
            <Surface className="mt-5 p-4">
              <TonePill tone="yellow">Warnings</TonePill>
              <ul className="mt-3 list-disc pl-5 text-sm opacity-65">
                {dataHealth.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Surface>
          )}
        </GlassCard>
      )}
    </div>
  );
}

function HealthCard({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-45">{label}</p>
      <p className="mt-2 font-black">{value}</p>
    </Surface>
  );
}
