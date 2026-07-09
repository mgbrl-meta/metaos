import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import {
  buildMetaDataQualitySummary,
  normalizeMetaRows,
} from "@/lib/metaDataQuality";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
};

const sheetId = process.env.META_SHEET_ID;
const sheetTab = process.env.META_SHEET_TAB || "Meta_Raw_Data";

function getAuth() {
  const clientEmail = process.env.GCP_CLIENT_EMAIL;
  const privateKey = process.env.GCP_PRIVATE_KEY
    ?.replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing GCP_CLIENT_EMAIL or GCP_PRIVATE_KEY");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function cleanHeader(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .replace(/,/g, "")
    .replace(/-/g, " ")
    .replace(/_/g, " ");
}

function latestDateFromRows(rows: Array<Record<string, any>>) {
  const dates = rows
    .map((row) => String(row?.date || "").slice(0, 10))
    .filter(Boolean)
    .sort();

  return dates[dates.length - 1] || "";
}

function jsonNoCache(payload: Record<string, any>, init?: { status?: number }) {
  return NextResponse.json(payload, {
    status: init?.status || 200,
    headers: NO_CACHE_HEADERS,
  });
}

export async function GET(_request: NextRequest) {
  const generatedAt = new Date().toISOString();

  try {
    if (!sheetId) {
      throw new Error("Missing META_SHEET_ID. Add it in Vercel Environment Variables.");
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const range = `'${sheetTab}'!A:ZZ`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

    const values = response.data.values || [];

    if (values.length < 2) {
      return jsonNoCache({
        source: "google_sheet",
        sheetTab,
        rows: [],
        rowCount: 0,
        latestDate: "",
        generatedAt,
        qcSummary: buildMetaDataQualitySummary([]),
        message: "No Meta rows found in sheet",
      });
    }

    const headers = values[0].map((h) => cleanHeader(String(h || "")));

    const rawRows = values.slice(1).map((cells) => {
      const row: Record<string, any> = {};

      headers.forEach((header, index) => {
        row[header] = cells[index] ?? "";
      });

      return row;
    });

    const normalizedRows = normalizeMetaRows(rawRows).filter((row) => {
      return row.date && row.adId && row.campaignName;
    });

    const latestDate = latestDateFromRows(normalizedRows);
    const qcSummary = buildMetaDataQualitySummary(normalizedRows);

    return jsonNoCache({
      source: "google_sheet",
      sheetTab,
      rowCount: normalizedRows.length,
      latestDate,
      generatedAt,
      rows: normalizedRows,
      qcSummary,
    });
  } catch (error: any) {
    console.error("Meta Sheet API error:", error);

    return jsonNoCache(
      {
        error: error?.message || "Failed to fetch Meta sheet data",
        latestDate: "",
        generatedAt,
        rows: [],
        rowCount: 0,
      },
      { status: 500 }
    );
  }
}
