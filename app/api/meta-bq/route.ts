import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBigQueryClient() {
  const projectId = process.env.GCP_PROJECT_ID;
  const clientEmail = process.env.GCP_CLIENT_EMAIL;
  const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing GCP_PROJECT_ID, GCP_CLIENT_EMAIL, or GCP_PRIVATE_KEY");
  }

  return new BigQuery({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [
      "https://www.googleapis.com/auth/bigquery",
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });
}

function getTableParts() {
  const tableRef =
    process.env.BQ_META_TABLE ||
    "shopify-colab.brillare_shopify.Meta_Raw_Data";

  const parts = tableRef.split(".");
  if (parts.length !== 3) {
    throw new Error("BQ_META_TABLE must be in project.dataset.table format");
  }

  return {
    tableRef,
    projectId: parts[0],
    datasetId: parts[1],
    tableId: parts[2],
  };
}

async function getDatasetLocation(bigquery: BigQuery, datasetId: string, projectId: string) {
  const dataset = bigquery.dataset(datasetId, { projectId });
  const [metadata] = await dataset.getMetadata();
  return process.env.BQ_LOCATION || metadata.location || metadata.locationId || "asia-southeast1";
}

const baseCleanSql = (tableRef: string) => `
  WITH clean AS (
    SELECT
      Day AS date,
      CAST(Campaign_ID AS STRING) AS campaign_id,
      Campaign_name AS campaign_name,
      CAST(Ad_set_ID AS STRING) AS adset_id,
      Ad_set_name AS adset_name,
      CAST(Ad_ID AS STRING) AS ad_id,
      Ad_name AS ad_name,
      Creative_Name_ AS creative_name,
      Objective AS objective,

      SAFE_CAST(Impressions AS FLOAT64) AS impressions,
      SAFE_CAST(Reach AS FLOAT64) AS reach,
      SAFE_CAST(Frequency AS FLOAT64) AS frequency,
      SAFE_CAST(Amount_spent__INR_ AS FLOAT64) AS spend,
      SAFE_CAST(CPM__cost_per_1_000_impressions_ AS FLOAT64) AS cpm,
      SAFE_CAST(CPC__cost_per_link_click_ AS FLOAT64) AS cpc,
      SAFE_CAST(Clicks__all_ AS FLOAT64) AS clicks,
      SAFE_CAST(Link_clicks AS FLOAT64) AS link_clicks,
      SAFE_CAST(Outbound_clicks AS FLOAT64) AS outbound_clicks,
      SAFE_CAST(CTR__all_ AS FLOAT64) AS ctr_all,
      SAFE_CAST(CTR__link_click_through_rate_ AS FLOAT64) AS ctr_link,
      SAFE_CAST(Landing_page_views AS FLOAT64) AS landing_page_views,
      SAFE_CAST(Adds_to_cart AS FLOAT64) AS adds_to_cart,
      SAFE_CAST(Checkouts_initiated AS FLOAT64) AS checkouts_initiated,
      SAFE_CAST(Adds_of_payment_info AS FLOAT64) AS adds_payment_info,
      SAFE_CAST(Purchases AS FLOAT64) AS purchases,
      SAFE_CAST(Purchases_conversion_value AS FLOAT64) AS revenue,
      SAFE_CAST(Purchase_ROAS__return_on_ad_spend_ AS FLOAT64) AS reported_roas,
      SAFE_CAST(Video_plays AS FLOAT64) AS video_plays,
      SAFE_CAST(_3_second_video_plays AS FLOAT64) AS three_second_video_plays,
      SAFE_CAST(Video_average_play_time__in_seconds_ AS FLOAT64) AS video_average_play_time,
      SAFE_CAST(ThruPlays AS FLOAT64) AS thruplays
    FROM \`${tableRef}\`
    WHERE Day IS NOT NULL
  ),

  latest AS (
    SELECT MAX(date) AS latest_date
    FROM clean
    WHERE spend > 0
  ),

  active_ads AS (
    SELECT DISTINCT ad_id
    FROM clean, latest
    WHERE date = latest.latest_date
      AND spend > 0
      AND ad_id IS NOT NULL
  ),

  lifetime AS (
    SELECT
      ad_id,
      ANY_VALUE(ad_name) AS ad_name,
      ANY_VALUE(creative_name) AS creative_name,
      ANY_VALUE(campaign_id) AS campaign_id,
      ANY_VALUE(campaign_name) AS campaign_name,
      ANY_VALUE(adset_id) AS adset_id,
      ANY_VALUE(adset_name) AS adset_name,

      SUM(spend) AS spend,
      SUM(revenue) AS revenue,
      SUM(purchases) AS purchases,
      SUM(impressions) AS impressions,
      SUM(reach) AS reach,
      SUM(clicks) AS clicks,
      SUM(link_clicks) AS link_clicks,
      SUM(outbound_clicks) AS outbound_clicks,
      SUM(landing_page_views) AS landing_page_views,
      SUM(adds_to_cart) AS adds_to_cart,
      SUM(checkouts_initiated) AS checkouts_initiated,
      SUM(video_plays) AS video_plays,
      SUM(three_second_video_plays) AS three_second_video_plays,
      SUM(thruplays) AS thruplays,

      SAFE_DIVIDE(SUM(revenue), SUM(spend)) AS roas,
      SAFE_DIVIDE(SUM(spend), SUM(purchases)) AS cpa,
      SAFE_DIVIDE(SUM(revenue), SUM(purchases)) AS aov,
      SAFE_DIVIDE(SUM(spend) * 1000, SUM(impressions)) AS cpm,
      SAFE_DIVIDE(SUM(link_clicks), SUM(impressions)) AS ctr,
      SAFE_DIVIDE(SUM(impressions), SUM(reach)) AS frequency,
      SAFE_DIVIDE(SUM(three_second_video_plays), SUM(impressions)) AS hook_rate,
      SAFE_DIVIDE(SUM(thruplays), SUM(three_second_video_plays)) AS hold_rate
    FROM clean
    WHERE ad_id IN (SELECT ad_id FROM active_ads)
    GROUP BY ad_id
  ),

  last7_dates AS (
    SELECT DISTINCT date
    FROM clean
    WHERE ad_id IN (SELECT ad_id FROM active_ads)
    ORDER BY date DESC
    LIMIT 7
  ),

  last7 AS (
    SELECT
      ad_id,
      SUM(spend) AS last7_spend,
      SUM(revenue) AS last7_revenue,
      SUM(purchases) AS last7_purchases,
      SAFE_DIVIDE(SUM(spend), SUM(purchases)) AS last7_cpa,
      SAFE_DIVIDE(SUM(revenue), SUM(spend)) AS last7_roas
    FROM clean
    WHERE date IN (SELECT date FROM last7_dates)
      AND ad_id IN (SELECT ad_id FROM active_ads)
    GROUP BY ad_id
  ),

  yesterday AS (
    SELECT
      ad_id,
      SUM(spend) AS yesterday_spend,
      SUM(revenue) AS yesterday_revenue,
      SUM(purchases) AS yesterday_purchases
    FROM clean, latest
    WHERE date = latest.latest_date
      AND ad_id IN (SELECT ad_id FROM active_ads)
    GROUP BY ad_id
  )

  SELECT
    latest.latest_date,
    l.*,
    COALESCE(y.yesterday_spend, 0) AS yesterday_spend,
    COALESCE(y.yesterday_revenue, 0) AS yesterday_revenue,
    COALESCE(y.yesterday_purchases, 0) AS yesterday_purchases,
    COALESCE(s.last7_spend, 0) AS last7_spend,
    COALESCE(s.last7_revenue, 0) AS last7_revenue,
    COALESCE(s.last7_purchases, 0) AS last7_purchases,
    s.last7_cpa,
    COALESCE(s.last7_roas, 0) AS last7_roas
  FROM lifetime l
  CROSS JOIN latest
  LEFT JOIN yesterday y USING (ad_id)
  LEFT JOIN last7 s USING (ad_id)
`;

function getQuery(view: string, tableRef: string) {
  const base = baseCleanSql(tableRef);

  if (view === "zero_purchase") {
    return `
      ${base}
      WHERE purchases = 0
        AND spend >= @threshold
        AND yesterday_spend > 0
      ORDER BY spend DESC
      LIMIT 500
    `;
  }

  if (view === "high_cpa") {
    return `
      ${base}
      WHERE purchases > 0
        AND cpa >= @threshold
        AND yesterday_spend > 0
      ORDER BY cpa DESC
      LIMIT 500
    `;
  }

  if (view === "high_roas") {
    return `
      ${base}
      WHERE purchases > 0
        AND roas >= @threshold
        AND yesterday_spend > 0
      ORDER BY roas DESC
      LIMIT 500
    `;
  }

  throw new Error("Invalid view. Use zero_purchase, high_cpa, or high_roas.");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const view = url.searchParams.get("view") || "zero_purchase";
    const threshold = Number(url.searchParams.get("threshold") || 0);

    const { tableRef, projectId, datasetId } = getTableParts();
    const bigquery = getBigQueryClient();
    const location = await getDatasetLocation(bigquery, datasetId, projectId);

    const query = getQuery(view, tableRef);

    const [rows] = await bigquery.query({
      query,
      params: { threshold },
      location,
    });

    return NextResponse.json({
      ok: true,
      source: "bigquery",
      table: tableRef,
      location,
      view,
      threshold,
      count: rows.length,
      rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
