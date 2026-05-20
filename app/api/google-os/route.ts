import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

export const dynamic = "force-dynamic";

const projectId = process.env.GCP_PROJECT_ID || "shopify-colab";
const dataset = process.env.GCP_DATASET || "brillare_shopify";

function getBigQueryClient() {
  const clientEmail = process.env.GCP_CLIENT_EMAIL;
  const privateKey = process.env.GCP_PRIVATE_KEY
    ?.replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing GCP_CLIENT_EMAIL or GCP_PRIVATE_KEY");
  }

  return new BigQuery({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

function cleanDate(value: string | null) {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

const VIEW_MAP: Record<string, string> = {
  search_terms: "google_os_search_terms_v",
  campaigns: "google_os_campaigns_v",
  adgroups: "google_os_adgroups_v",
  keywords: "google_os_keywords_v",
  ads: "google_os_ads_v",
};

const SELECT_MAP: Record<string, string> = {
  search_terms: `
    CAST(date AS STRING) AS date,
    CAST(campaign_id AS STRING) AS campaign_id,
    campaign_name,
    CAST(ad_group_id AS STRING) AS ad_group_id,
    ad_group_name,
    search_term AS entity_name,
    search_term,
    NULL AS keyword_text,
    NULL AS ad_name,
    impressions,
    clicks,
    cost,
    conversions,
    conversion_value,
    ctr,
    average_cpc,
    cost_per_conversion,
    conversion_rate,
    roas
  `,
  campaigns: `
    CAST(date AS STRING) AS date,
    CAST(campaign_id AS STRING) AS campaign_id,
    campaign_name,
    NULL AS ad_group_id,
    NULL AS ad_group_name,
    campaign_name AS entity_name,
    NULL AS search_term,
    NULL AS keyword_text,
    NULL AS ad_name,
    impressions,
    clicks,
    cost,
    conversions,
    conversion_value,
    ctr,
    average_cpc,
    cost_per_conversion,
    conversion_rate,
    roas
  `,
  adgroups: `
    CAST(date AS STRING) AS date,
    CAST(campaign_id AS STRING) AS campaign_id,
    campaign_name,
    CAST(ad_group_id AS STRING) AS ad_group_id,
    ad_group_name,
    ad_group_name AS entity_name,
    NULL AS search_term,
    NULL AS keyword_text,
    NULL AS ad_name,
    impressions,
    clicks,
    cost,
    conversions,
    conversion_value,
    ctr,
    average_cpc,
    cost_per_conversion,
    conversion_rate,
    roas
  `,
  keywords: `
    CAST(date AS STRING) AS date,
    CAST(campaign_id AS STRING) AS campaign_id,
    campaign_name,
    CAST(ad_group_id AS STRING) AS ad_group_id,
    ad_group_name,
    keyword_text AS entity_name,
    NULL AS search_term,
    keyword_text,
    NULL AS ad_name,
    impressions,
    clicks,
    cost,
    conversions,
    conversion_value,
    ctr,
    average_cpc,
    SAFE_DIVIDE(cost, conversions) AS cost_per_conversion,
    SAFE_DIVIDE(conversions, clicks) AS conversion_rate,
    SAFE_DIVIDE(conversion_value, cost) AS roas
  `,
  ads: `
    CAST(date AS STRING) AS date,
    CAST(campaign_id AS STRING) AS campaign_id,
    campaign_name,
    CAST(ad_group_id AS STRING) AS ad_group_id,
    ad_group_name,
    ad_name AS entity_name,
    NULL AS search_term,
    NULL AS keyword_text,
    ad_name,
    impressions,
    clicks,
    cost,
    conversions,
    conversion_value,
    ctr,
    average_cpc,
    cost_per_conversion,
    conversion_rate,
    roas
  `,
};

export async function GET(req: NextRequest) {
  try {
    const bigquery = getBigQueryClient();
    const sp = req.nextUrl.searchParams;

    const tab = sp.get("tab") || "search_terms";
    const start = cleanDate(sp.get("start"));
    const end = cleanDate(sp.get("end"));
    const limit = Math.min(Number(sp.get("limit") || 5000), 50000);

    const view = VIEW_MAP[tab];
    const select = SELECT_MAP[tab];

    if (!view || !select) {
      return NextResponse.json({ error: `Unsupported tab: ${tab}` }, { status: 400 });
    }

    const query = `
      SELECT ${select}
      FROM \`${projectId}.${dataset}.${view}\`
      WHERE (@start IS NULL OR date >= @start)
        AND (@end IS NULL OR date <= @end)
      ORDER BY date DESC, cost DESC
      LIMIT @limit
    `;

    const [rows] = await bigquery.query({
      query,
      params: { start, end, limit },
      types: { start: "DATE", end: "DATE", limit: "INT64" },
    });

    return NextResponse.json({ tab, rows, rowCount: rows.length });
  } catch (error: any) {
    console.error("Google OS API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch Google OS data" },
      { status: 500 }
    );
  }
}
