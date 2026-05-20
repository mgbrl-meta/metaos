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
    throw new Error("Missing GCP_CLIENT_EMAIL or GCP_PRIVATE_KEY in .env.local");
  }

  return new BigQuery({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

function toDate(value: string | null) {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(req: NextRequest) {
  try {
    const bigquery = getBigQueryClient();

    const searchParams = req.nextUrl.searchParams;
    const tab = searchParams.get("tab") || "search_terms";
    const start = toDate(searchParams.get("start"));
    const end = toDate(searchParams.get("end"));
    const limit = Math.min(Number(searchParams.get("limit") || 10000), 50000);

    if (tab !== "search_terms") {
      return NextResponse.json(
        { error: `Unsupported Google OS tab: ${tab}` },
        { status: 400 }
      );
    }

    const query = `
      SELECT
        CAST(date AS STRING) AS date,
        CAST(campaign_id AS STRING) AS campaign_id,
        campaign_name,
        CAST(ad_group_id AS STRING) AS ad_group_id,
        ad_group_name,
        search_term,
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
      FROM \`${projectId}.${dataset}.google_os_search_terms_v\`
      WHERE (@start IS NULL OR date >= @start)
        AND (@end IS NULL OR date <= @end)
      ORDER BY date DESC, cost DESC
      LIMIT @limit
    `;

    const [rows] = await bigquery.query({
      query,
      params: { start, end, limit },
      types: {
        start: "DATE",
        end: "DATE",
        limit: "INT64",
      },
    });

    return NextResponse.json({
      tab,
      rows,
      rowCount: rows.length,
    });
  } catch (error: any) {
    console.error("Google OS API error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch Google OS data",
      },
      { status: 500 }
    );
  }
}
