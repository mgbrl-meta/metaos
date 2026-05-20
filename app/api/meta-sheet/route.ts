import { NextResponse } from "next/server";
import { google } from "googleapis";

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

function toNumber(value: any) {
  if (value === null || value === undefined || value === "") return 0;

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function get(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const v = row[cleanHeader(key)];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

function mapMetaRow(row: Record<string, any>) {
  const spend = toNumber(get(row, ["Amount spent (INR)", "amount spent inr", "spend"]));
  const purchases = toNumber(get(row, ["Purchases", "purchases"]));
  const purchaseValue = toNumber(
    get(row, [
      "Purchases conversion value",
      "purchase conversion value",
      "purchase_value",
      "purchase value",
    ])
  );

  const impressions = toNumber(get(row, ["Impressions", "impressions"]));
  const reach = toNumber(get(row, ["Reach", "reach"]));
  const clicks = toNumber(get(row, ["Clicks (all)", "clicks all", "clicks"]));
  const linkClicks = toNumber(get(row, ["Link clicks", "link_clicks"]));
  const outboundClicks = toNumber(get(row, ["Outbound clicks", "outbound_clicks"]));
  const landingPageViews = toNumber(get(row, ["Landing page views", "landing_page_views"]));
  const addsToCart = toNumber(get(row, ["Adds to cart", "adds_to_cart"]));
  const checkoutsInitiated = toNumber(get(row, ["Checkouts initiated", "checkouts_initiated"]));
  const addsPaymentInfo = toNumber(get(row, ["Adds of payment info", "adds_payment_info"]));

  return {
    date: String(get(row, ["Day", "date", "Date"])),
    day: String(get(row, ["Day", "date", "Date"])),

    creativeName: String(get(row, ["Creative Name", "Creative Name "])),
    creative_name: String(get(row, ["Creative Name", "Creative Name "])),

    campaignId: String(get(row, ["Campaign ID", "campaign_id"])),
    campaign_id: String(get(row, ["Campaign ID", "campaign_id"])),
    campaignName: String(get(row, ["Campaign name", "campaign_name"])),
    campaign_name: String(get(row, ["Campaign name", "campaign_name"])),

    adSetId: String(get(row, ["Ad set ID", "adset_id", "ad_set_id"])),
    adset_id: String(get(row, ["Ad set ID", "adset_id", "ad_set_id"])),
    adSetName: String(get(row, ["Ad set name", "adset_name", "ad_set_name"])),
    adset_name: String(get(row, ["Ad set name", "adset_name", "ad_set_name"])),

    adId: String(get(row, ["Ad ID", "ad_id"])),
    ad_id: String(get(row, ["Ad ID", "ad_id"])),
    adName: String(get(row, ["Ad name", "ad_name"])),
    ad_name: String(get(row, ["Ad name", "ad_name"])),

    objective: String(get(row, ["Objective", "objective"])),

    impressions,
    reach,
    frequency: toNumber(get(row, ["Frequency", "frequency"])),

    spend,
    amountSpent: spend,
    amount_spent: spend,

    cpm: toNumber(get(row, ["CPM (cost per 1,000 impressions)", "cpm"])),
    cpc: toNumber(get(row, ["CPC (cost per link click)", "cpc"])),
    costPerResult: toNumber(get(row, ["Cost per result", "cost_per_result"])),

    clicks,
    linkClicks,
    link_clicks: linkClicks,
    outboundClicks,
    outbound_clicks: outboundClicks,

    ctr: toNumber(get(row, ["CTR (all)", "ctr"])),
    linkCtr: toNumber(get(row, ["CTR (link click-through rate)", "ctr link click-through rate"])),

    landingPageViews,
    landing_page_views: landingPageViews,

    addsToCart,
    adds_to_cart: addsToCart,
    addToCart: addsToCart,

    checkoutsInitiated,
    checkouts_initiated: checkoutsInitiated,

    addsPaymentInfo,
    adds_payment_info: addsPaymentInfo,

    purchases,

    revenue: purchaseValue,
    purchaseValue,
    purchase_value: purchaseValue,
    conversionValue: purchaseValue,
    conversion_value: purchaseValue,

    roas: spend > 0 ? purchaseValue / spend : 0,
    purchaseRoas: toNumber(get(row, ["Purchase ROAS (return on ad spend)", "purchase roas"])),

    videoPlays: toNumber(get(row, ["Video plays", "video_plays"])),
    threeSecondVideoPlays: toNumber(get(row, ["3-second video plays", "3_second_video_plays"])),
    videoAveragePlayTime: toNumber(
      get(row, ["Video average play time (in seconds)", "video average play time in seconds"])
    ),
    thruPlays: toNumber(get(row, ["ThruPlays", "thruplays"])),

    reportingStarts: String(get(row, ["Reporting starts", "reporting_starts"])),
    reportingEnds: String(get(row, ["Reporting ends", "reporting_ends"])),
  };
}

export async function GET() {
  try {
    if (!sheetId) {
      throw new Error("Missing META_SHEET_ID in environment variables");
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const range = `'${sheetTab}'!A:AH`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

    const values = response.data.values || [];

    if (values.length < 2) {
      return NextResponse.json({
        rows: [],
        rowCount: 0,
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

    const rows = rawRows
      .map(mapMetaRow)
      .filter((row) => row.date && row.adId && row.campaignName);

    return NextResponse.json({
      source: "google_sheet",
      sheetTab,
      rowCount: rows.length,
      rows,
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
