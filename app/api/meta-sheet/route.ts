import { NextResponse } from "next/server";
import { google } from "googleapis";
import {
  buildMetaDataQualitySummary,
  normalizeMetaRows,
} from "@/lib/metaDataQuality";

export const dynamic = "force-dynamic";

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

export async function GET() {
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
      // Important: FORMATTED_VALUE prevents Google Sheet date cells from coming as serial numbers like 46258.
      // Numeric strings are cleaned by metaDataQuality.toNumber(), so this is safer for dashboard date windows.
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

    const values = response.data.values || [];

    if (values.length < 2) {
      return NextResponse.json({
        source: "google_sheet",
        sheetTab,
        rows: [],
        rowCount: 0,
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

    const qcSummary = buildMetaDataQualitySummary(normalizedRows);

    return NextResponse.json({
      source: "google_sheet",
      sheetTab,
      rowCount: normalizedRows.length,
      rows: normalizedRows,
      qcSummary,
    });
  } catch (error: any) {
    console.error("Meta Sheet API error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch Meta sheet data",
      },
      { status: 500 }
    );
  }
}
