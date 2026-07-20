import { NextRequest, NextResponse } from "next/server";
import { buildHighCpaFast, buildZeroPurchaseFast } from "@/lib/meta/metaSheetFastEngine";
import { buildMetaDataQualitySummary, normalizeMetaRows } from "@/lib/metaDataQuality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CacheValue = {
  expiresAt: number;
  data: any;
};

declare global {
   
  var __META_SHEET_RAW_CACHE__: CacheValue | undefined;

   
  var __META_OS_FAST_VIEW_CACHE__: Map<string, CacheValue> | undefined;
}

const viewCache = globalThis.__META_OS_FAST_VIEW_CACHE__ || new Map<string, CacheValue>();
globalThis.__META_OS_FAST_VIEW_CACHE__ = viewCache;

const CACHE_TTL_MS = Number(process.env.META_OS_FAST_CACHE_TTL_MS || 10 * 60 * 1000);

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseCsv(text: string) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, any> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

async function fetchMetaRowsFromGoogleSheet(force = false) {
  if (!force && globalThis.__META_SHEET_RAW_CACHE__?.expiresAt && globalThis.__META_SHEET_RAW_CACHE__.expiresAt > Date.now()) {
    return {
      rows: globalThis.__META_SHEET_RAW_CACHE__.data,
      rawCached: true,
    };
  }

  const csvUrl = process.env.META_SHEET_CSV_URL;

  if (!csvUrl) {
    throw new Error(
      "Missing META_SHEET_CSV_URL. Add your Google Sheet CSV export URL in .env.local and Vercel environment variables."
    );
  }

  const res = await fetch(csvUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "MetaOS-Fast-Loader",
    },
  });

  if (!res.ok) {
    throw new Error(`Google Sheet CSV fetch failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();

  if (text.toLowerCase().includes("<html") || text.toLowerCase().includes("<!doctype")) {
    throw new Error(
      "Google Sheet returned HTML instead of CSV. Use a valid Google Sheet CSV export URL or publish the tab as CSV."
    );
  }

  const rows = parseCsv(text);

  globalThis.__META_SHEET_RAW_CACHE__ = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: rows,
  };

  return {
    rows,
    rawCached: false,
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const view = url.searchParams.get("view") || "zero_purchase";
    const threshold = Number(url.searchParams.get("threshold") || 3000);
    const force = Boolean(url.searchParams.get("force"));

    const cacheKey = `${view}:${threshold}`;
    const cached = viewCache.get(cacheKey);

    if (!force && cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        ...cached.data,
        viewCached: true,
        cacheTtlMs: CACHE_TTL_MS,
      });
    }

    const { rows, rawCached } = await fetchMetaRowsFromGoogleSheet(force);
    const normalizedRows = normalizeMetaRows(rows as any[]);
    const qcSummary = buildMetaDataQualitySummary(normalizedRows);

    let data: any;

    if (view === "zero_purchase") {
      data = buildZeroPurchaseFast(normalizedRows, threshold);
    } else if (view === "high_cpa") {
      data = buildHighCpaFast(normalizedRows, threshold);
    } else {
      return NextResponse.json(
        {
          error: `Unsupported Meta OS fast view: ${view}`,
        },
        { status: 400 }
      );
    }

    const response = {
      view,
      generatedAt: new Date().toISOString(),
      source: "google_sheet_csv",
      rowsLoaded: normalizedRows.length,
      qcSummary,
      rawCached,
      viewCached: false,
      data,
    };

    viewCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data: response,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("meta-os-fast error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Meta OS fast API failed",
      },
      { status: 500 }
    );
  }
}
