import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function getPrivateKey() {
  const raw = process.env.GCP_PRIVATE_KEY || "";
  return raw.replace(/\\n/g, "\n");
}

function toDateValue(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return 0;

  const parsed = new Date(raw);
  const time = parsed.getTime();

  return Number.isFinite(time) ? time : 0;
}

function getRowDate(row: Record<string, unknown>) {
  return (
    toDateValue(row.Day) ||
    toDateValue(row.day) ||
    toDateValue(row["Reporting starts"]) ||
    toDateValue(row["Reporting Starts"]) ||
    toDateValue(row["reporting starts"])
  );
}

function filterRecentRows(rows: Record<string, unknown>[], latestDays: number) {
  const datedRows = rows
    .map((row) => ({ row, time: getRowDate(row) }))
    .filter((item) => item.time > 0);

  if (!datedRows.length) return rows;

  const latestTime = Math.max(...datedRows.map((item) => item.time));
  const cutoff = latestTime - latestDays * 24 * 60 * 60 * 1000;

  return datedRows
    .filter((item) => item.time >= cutoff)
    .map((item) => item.row);
}

export async function GET(request: Request) {
  const startedAt = Date.now();

  try {
    const url = new URL(request.url);

    const full = url.searchParams.get("full") === "1";
    const latestDays = Number(url.searchParams.get("days") || "120");
    const hardLimit = Number(url.searchParams.get("limit") || "20000");

    const sheetId = process.env.META_SHEET_ID;
    const sheetTab = process.env.META_SHEET_TAB || "meta_ads_raw_data";
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const privateKey = getPrivateKey();

    const envStatus = {
      hasMetaSheetId: Boolean(sheetId),
      metaSheetTab: sheetTab,
      hasGcpClientEmail: Boolean(clientEmail),
      hasGcpPrivateKey: Boolean(privateKey),
      privateKeyLooksValid:
        privateKey.includes("BEGIN PRIVATE KEY") &&
        privateKey.includes("END PRIVATE KEY"),
    };

    if (!sheetId) {
      return json({
        ok: false,
        source: "google_sheet",
        error: "Missing META_SHEET_ID",
        envStatus,
      }, 500);
    }

    if (!clientEmail || !privateKey) {
      return json({
        ok: false,
        source: "google_sheet",
        error: "Missing GCP_CLIENT_EMAIL or GCP_PRIVATE_KEY",
        envStatus,
      }, 500);
    }

    if (!envStatus.privateKeyLooksValid) {
      return json({
        ok: false,
        source: "google_sheet",
        error: "GCP_PRIVATE_KEY does not look valid.",
        envStatus,
      }, 500);
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const range = `${sheetTab}!A:ZZ`;

    const response = await withTimeout(
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      }),
      12000,
      "Google Sheets fetch"
    );

    const values = response.data.values || [];
    const [headers = [], ...bodyRows] = values;

    const allRows = bodyRows
      .filter((row) => row.some((cell) => String(cell || "").trim()))
      .map((row) => {
        const item: Record<string, unknown> = {};

        headers.forEach((header, index) => {
          item[String(header || `Column ${index + 1}`)] = row[index] ?? "";
        });

        return item;
      });

    const recentRows = full ? allRows : filterRecentRows(allRows, latestDays);
    const rows = full ? recentRows : recentRows.slice(-hardLimit);

    const latestDateMs = Math.max(0, ...allRows.map(getRowDate));
    const latestDate = latestDateMs
      ? new Date(latestDateMs).toISOString().slice(0, 10)
      : "";

    return json({
      ok: true,
      source: "google_sheet",
      sheetId,
      sheetTab,
      range,
      latestDate,
      full,
      latestDays: full ? null : latestDays,
      totalRowCount: allRows.length,
      returnedRowCount: rows.length,
      rowCount: rows.length,
      headerCount: headers.length,
      headers,
      rows,
      timingMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return json({
      ok: false,
      source: "google_sheet",
      error: message,
      timingMs: Date.now() - startedAt,
      hint: "Check Vercel env variables, service-account access, sheet tab name, and payload size.",
    }, 500);
  }
}
