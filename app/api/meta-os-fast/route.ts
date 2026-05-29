import { NextRequest, NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import { buildHighCpaFast, buildZeroPurchaseFast } from "@/lib/meta/metaFastEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CacheValue = {
  expiresAt: number;
  data: any;
};

declare global {
  // eslint-disable-next-line no-var
  var __META_OS_FAST_CACHE__: Map<string, CacheValue> | undefined;
}

const cache = globalThis.__META_OS_FAST_CACHE__ || new Map<string, CacheValue>();
globalThis.__META_OS_FAST_CACHE__ = cache;

const CACHE_TTL_MS = Number(process.env.META_OS_FAST_CACHE_TTL_MS || 10 * 60 * 1000);

function getBigQueryClient() {
  const projectId = process.env.GCP_PROJECT_ID || process.env.BQ_PROJECT_ID || "shopify-colab";

  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    const credentials = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    return new BigQuery({
      projectId,
      credentials,
    });
  }

  const clientEmail = process.env.GCP_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GCP_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    return new BigQuery({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }

  return new BigQuery({ projectId });
}

function sourceTable() {
  return (
    process.env.META_OS_SOURCE_TABLE ||
    process.env.META_BIGQUERY_TABLE ||
    "`shopify-colab.brillare_shopify.meta_ad_insights_stg`"
  );
}

function tableSqlName() {
  const t = sourceTable().trim();
  if (t.startsWith("`") && t.endsWith("`")) return t;
  return `\`${t}\``;
}

async function fetchActiveCreativeRows() {
  const bq = getBigQueryClient();
  const table = tableSqlName();

  // IMPORTANT:
  // This does not change your base sheet.
  // It only asks BigQuery to return history for ads that spent yesterday.
  const query = `
    WITH active_ads AS (
      SELECT DISTINCT CAST(ad_id AS STRING) AS ad_id
      FROM ${table}
      WHERE DATE(date) = DATE_SUB(CURRENT_DATE("Asia/Kolkata"), INTERVAL 1 DAY)
        AND SAFE_CAST(spend AS FLOAT64) > 0
        AND ad_id IS NOT NULL
    )
    SELECT *
    FROM ${table}
    WHERE CAST(ad_id AS STRING) IN (SELECT ad_id FROM active_ads)
  `;

  const [rows] = await bq.query({ query });
  return rows as Record<string, any>[];
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const view = url.searchParams.get("view") || "zero_purchase";
    const threshold = Number(url.searchParams.get("threshold") || 3000);

    const cacheKey = `${view}:${threshold}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        cacheTtlMs: CACHE_TTL_MS,
      });
    }

    const rows = await fetchActiveCreativeRows();

    let data: any;

    if (view === "zero_purchase") {
      data = buildZeroPurchaseFast(rows, threshold);
    } else if (view === "high_cpa") {
      data = buildHighCpaFast(rows, threshold);
    } else {
      return NextResponse.json(
        {
          error: `Unsupported view: ${view}`,
        },
        { status: 400 }
      );
    }

    const response = {
      view,
      generatedAt: new Date().toISOString(),
      cached: false,
      data,
    };

    cache.set(cacheKey, {
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
