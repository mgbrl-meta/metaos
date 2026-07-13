import { NextResponse } from "next/server";
import { google } from "googleapis";
import { normalizeMetaRows } from "@/lib/metaDataQuality";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
};

const sheetId = process.env.META_SHEET_ID;
const sheetTab = process.env.META_SHEET_TAB || "Meta_Raw_Data";

type Row = Record<string, any>;

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

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/%/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDateKey(value: unknown) {
  if (value === null || value === undefined || value === "") return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = Number(slash[3]);

    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;

    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
      .toISOString()
      .slice(0, 10);
  }

  return "";
}

function addDaysToDateKeyUtc(dateKey: string, days: number) {
  const key = normalizeDateKey(dateKey);
  if (!key) return "";

  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

function getDate(row: Row) {
  return normalizeDateKey(row.date ?? row.day ?? row.Date ?? row.Day ?? "");
}

function getAdId(row: Row) {
  return String(row.adId ?? row.ad_id ?? row["ad id"] ?? row["Ad ID"] ?? getAd(row)).trim();
}

function getAd(row: Row) {
  return String(row.adName ?? row.ad_name ?? row["ad name"] ?? row["Ad name"] ?? "Unknown Ad").trim();
}

function getCampaign(row: Row) {
  return String(row.campaignName ?? row.campaign_name ?? row["campaign name"] ?? row["Campaign name"] ?? "Unknown Campaign").trim();
}

function getAdSet(row: Row) {
  return String(row.adSetName ?? row.adsetName ?? row.adset_name ?? row["ad set name"] ?? row["Ad set name"] ?? "Unknown Ad Set").trim();
}

function getSpend(row: Row) {
  return toNumber(row.spend ?? row.amountSpent ?? row.amount_spent ?? row["amount spent inr"] ?? row["Amount spent (INR)"]);
}

function getRevenue(row: Row) {
  return toNumber(row.revenue ?? row.purchaseValue ?? row.purchase_value ?? row["purchases conversion value"]);
}

function getPurchases(row: Row) {
  return toNumber(row.purchases ?? row.Purchases ?? row.results ?? row.Results);
}

function getImpressions(row: Row) {
  return toNumber(row.impressions ?? row.Impressions);
}

function getReach(row: Row) {
  return toNumber(row.reach ?? row.Reach);
}

function getClicks(row: Row) {
  return toNumber(row.linkClicks ?? row.link_clicks ?? row.clicks ?? row["link clicks"]);
}

function latestDate(rows: Row[]) {
  const dates = Array.from(new Set(rows.map(getDate).filter(Boolean))).sort();
  return dates[dates.length - 1] || "";
}

function summarize(rows: Row[]) {
  const spend = rows.reduce((s, row) => s + getSpend(row), 0);
  const revenue = rows.reduce((s, row) => s + getRevenue(row), 0);
  const purchases = rows.reduce((s, row) => s + getPurchases(row), 0);
  const impressions = rows.reduce((s, row) => s + getImpressions(row), 0);
  const reach = rows.reduce((s, row) => s + getReach(row), 0);
  const clicks = rows.reduce((s, row) => s + getClicks(row), 0);

  return {
    spend,
    revenue,
    purchases,
    impressions,
    reach,
    clicks,
    roas: spend > 0 ? revenue / spend : 0,
    cpa: purchases > 0 ? spend / purchases : 0,
    aov: purchases > 0 ? revenue / purchases : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    freq: reach > 0 ? impressions / reach : 0,
  };
}

function summarizeCalendarWindow(rows: Row[], endDateKey: string, days = 7) {
  const end = normalizeDateKey(endDateKey);
  const start = addDaysToDateKeyUtc(end, 1 - days);

  const windowRows = rows.filter((row) => {
    const key = getDate(row);
    return key && key >= start && key <= end;
  });

  return summarize(windowRows);
}

function dailyTrend(rows: Row[]) {
  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = getDate(row);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, dayRows]) => {
      const s = summarize(dayRows);
      return {
        date,
        spend: s.spend,
        cpa: s.purchases > 0 ? s.cpa : null,
        roas: s.roas,
        purchases: s.purchases,
      };
    });
}

function buildZeroPurchaseItems(rows: Row[]) {
  const latest = latestDate(rows);

  const latestRows = rows.filter((row) => getDate(row) === latest);

  const latestSpendAdIds = new Set(
    latestRows
      .filter((row) => getSpend(row) > 0)
      .map(getAdId)
      .filter(Boolean)
  );

  const map = new Map<string, Row[]>();

  rows.forEach((row) => {
    const key = getAdId(row);
    if (!latestSpendAdIds.has(key)) return;

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  const items = Array.from(map.entries())
    .map(([key, adRows]) => {
      const latestAdRows = adRows.filter((row) => getDate(row) === latest);
      const sample = latestAdRows[0] || adRows[0];
      const lifetime = summarize(adRows);
      const last7 = summarizeCalendarWindow(adRows, latest, 7);
      const yesterday = summarize(latestAdRows);

      return {
        key,
        ad: getAd(sample),
        campaign: getCampaign(sample),
        adSet: getAdSet(sample),
        lifetime,
        last7,
        yesterday,
        trend: dailyTrend(adRows),
      };
    })
    .filter((item) => item.yesterday.spend > 0)
    .filter((item) => item.lifetime.purchases === 0)
    .sort((a, b) => b.lifetime.spend - a.lifetime.spend);

  return {
    latest,
    latestRowCount: latestRows.length,
    latestSpendAdCount: latestSpendAdIds.size,
    items,
  };
}

export async function GET() {
  try {
    if (!sheetId) {
      throw new Error("Missing META_SHEET_ID. Add it in Vercel Environment Variables.");
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${sheetTab}'!A:ZZ`,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

    const values = response.data.values || [];

    if (values.length < 2) {
      return NextResponse.json(
        {
          source: "google_sheet",
          sheetTab,
          rowCount: 0,
          latest: "",
          latestRowCount: 0,
          latestSpendAdCount: 0,
          items: [],
        },
        { headers: NO_CACHE_HEADERS }
      );
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

    const zero = buildZeroPurchaseItems(normalizedRows as Row[]);

    return NextResponse.json(
      {
        source: "google_sheet",
        sheetTab,
        rowCount: normalizedRows.length,
        generatedAt: new Date().toISOString(),
        ...zero,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("Zero Purchase API error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to calculate Zero Purchase data",
      },
      {
        status: 500,
        headers: NO_CACHE_HEADERS,
      }
    );
  }
}
