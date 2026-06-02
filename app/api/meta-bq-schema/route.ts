import { NextResponse } from "next/server";
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
  });
}

export async function GET() {
  try {
    const tableRef =
      process.env.BQ_META_TABLE ||
      "shopify-colab.brillare_shopify.Meta_Raw_Data";

    const parts = tableRef.split(".");
    if (parts.length !== 3) {
      throw new Error("BQ_META_TABLE must be in project.dataset.table format");
    }

    const [projectId, datasetId, tableId] = parts;
    const bigquery = getBigQueryClient();

    const query = `
      SELECT
        column_name,
        data_type
      FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = @tableId
      ORDER BY ordinal_position
    `;

    const [rows] = await bigquery.query({
      query,
      params: { tableId },
      location: process.env.BQ_LOCATION || "asia-south1",
    });

    return NextResponse.json({
      ok: true,
      table: tableRef,
      columns: rows,
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
