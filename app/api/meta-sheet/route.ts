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

export async function GET() {
  const startedAt = Date.now();

  try {
    const sheetId = process.env.META_SHEET_ID;
    const sheetTab = process.env.META_SHEET_TAB || "Meta_Raw_Data";
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
        error: "GCP_PRIVATE_KEY does not look valid. It must include BEGIN PRIVATE KEY and END PRIVATE KEY.",
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

    const rows = bodyRows
      .filter((row) => row.some((cell) => String(cell || "").trim()))
      .map((row) => {
        const item: Record<string, unknown> = {};

        headers.forEach((header, index) => {
          item[String(header || `Column ${index + 1}`)] = row[index] ?? "";
        });

        return item;
      });

    return json({
      ok: true,
      source: "google_sheet",
      sheetId,
      sheetTab,
      range,
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
      hint: "Check Vercel env variables, service-account private key formatting, and Google Sheet sharing access.",
    }, 500);
  }
}
