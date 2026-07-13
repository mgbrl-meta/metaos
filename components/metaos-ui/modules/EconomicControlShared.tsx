"use client";

import {
  Activity,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardHeaderText,
  CardTitle,
} from "@/components/metaos-ui/primitives";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/metaos-ui/table";

import type {
  MetaV2EconomicCampaignRow,
  MetaV2EconomicTrendRow,
} from "@/lib/meta-v2/economicControlUtils";

import {
  formatDate,
  formatINRCompact,
  formatNumberCompact,
  formatPct,
  formatRoas,
} from "@/lib/meta-v2/formatters";

type EconomicTrendMetric =
  | "spend"
  | "cpa"
  | "aov"
  | "roas";

interface EconomicTrendDefinition {
  key: EconomicTrendMetric;
  label: string;
  axis: "money" | "rate";
  stroke: string;
}

const ECONOMIC_TREND_METRICS:
  readonly EconomicTrendDefinition[] = [
    {
      key: "spend",
      label: "Spend",
      axis: "money",
      stroke: "var(--mos-text)",
    },
    {
      key: "cpa",
      label: "CPA",
      axis: "money",
      stroke: "var(--mos-negative)",
    },
    {
      key: "aov",
      label: "AOV",
      axis: "money",
      stroke: "var(--mos-text-secondary)",
    },
    {
      key: "roas",
      label: "ROAS",
      axis: "rate",
      stroke: "var(--mos-positive)",
    },
  ];

function formatTrendValue(
  metric: EconomicTrendMetric,
  value: number | null
): string {
  if (value === null) {
    return "No sale";
  }

  if (
    metric === "spend" ||
    metric === "cpa" ||
    metric === "aov"
  ) {
    return formatINRCompact(value);
  }

  return `${formatRoas(value)}x`;
}

interface EconomicTooltipProps {
  active?: boolean;

  payload?: Array<{
    dataKey?: string | number;
    value?: number | null;
    name?: string;
  }>;

  label?: string | number;
}

function EconomicTooltip({
  active,
  payload,
  label,
}: EconomicTooltipProps) {
  if (
    !active ||
    !payload?.length
  ) {
    return null;
  }

  return (
    <div className="mos-chart-tooltip">
      <strong>
        {formatDate(
          String(label ?? "")
        )}
      </strong>

      {payload.map((item) => {
        const key =
          String(
            item.dataKey ?? ""
          ) as EconomicTrendMetric;

        return (
          <div
            key={key}
            className="mos-chart-tooltip-row"
          >
            <span>
              {item.name ?? key}
            </span>

            <b>
              {formatTrendValue(
                key,
                item.value ?? null
              )}
            </b>
          </div>
        );
      })}
    </div>
  );
}

export function EconomicTrendChart({
  rows,
  focus,
}: {
  rows: readonly MetaV2EconomicTrendRow[];
  focus: "cpa" | "roas";
}) {
  const [selected, setSelected] =
    useState<
      Record<EconomicTrendMetric, boolean>
    >({
      spend: true,
      cpa: focus === "cpa",
      aov: false,
      roas: focus === "roas",
    });

  const activeMetrics =
    ECONOMIC_TREND_METRICS.filter(
      (metric) =>
        selected[metric.key]
    );

  function toggleMetric(
    key: EconomicTrendMetric
  ) {
    setSelected(
      (current) => {
        const activeCount =
          Object.values(
            current
          ).filter(Boolean)
            .length;

        if (
          current[key] &&
          activeCount === 1
        ) {
          return current;
        }

        return {
          ...current,
          [key]: !current[key],
        };
      }
    );
  }

  return (
    <Card density="compact">
      <CardHeader>
        <CardHeaderText>
          <CardTitle>
            Last 30-Day Trend
          </CardTitle>

          <CardDescription>
            Select the economic metrics required for the decision.
          </CardDescription>
        </CardHeaderText>

        <Activity
          size={16}
          aria-hidden="true"
        />
      </CardHeader>

      <CardBody>
        <div className="mos-economic-trend-controls">
          {ECONOMIC_TREND_METRICS.map(
            (metric) => (
              <Button
                key={metric.key}
                size="xs"
                variant={
                  selected[
                    metric.key
                  ]
                    ? "primary"
                    : "secondary"
                }
                onClick={() =>
                  toggleMetric(
                    metric.key
                  )
                }
              >
                {metric.label}
              </Button>
            )
          )}
        </div>

        {rows.length ? (
          <div className="mos-economic-chart">
            <ResponsiveContainer
              width="100%"
              height={220}
            >
              <LineChart
                data={rows}
                margin={{
                  top: 10,
                  right: 12,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--mos-border)"
                />

                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                />

                <YAxis
                  yAxisId="money"
                  axisLine={false}
                  tickLine={false}
                  width={58}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                  tickFormatter={(
                    value:
                      | number
                      | string
                  ) =>
                    formatINRCompact(
                      Number(value)
                    )
                  }
                />

                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                  tickFormatter={(
                    value:
                      | number
                      | string
                  ) =>
                    Number(
                      value
                    ).toFixed(1)
                  }
                />

                <Tooltip
                  content={
                    <EconomicTooltip />
                  }
                />

                {activeMetrics.map(
                  (metric) => (
                    <Line
                      key={metric.key}
                      yAxisId={
                        metric.axis
                      }
                      type="monotone"
                      dataKey={
                        metric.key
                      }
                      name={
                        metric.label
                      }
                      stroke={
                        metric.stroke
                      }
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  )
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mos-inline-empty">
            No daily trend rows are available.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function EconomicCampaignTable({
  rows,
  mode,
}: {
  rows: readonly MetaV2EconomicCampaignRow[];
  mode: "cpa" | "roas";
}) {
  const columns =
    useMemo<
      DataTableColumn<MetaV2EconomicCampaignRow>[]
    >(
      () => [
        {
          id: "campaign",
          header: "Campaign",
          minWidth: 300,
          sticky: "left",
          truncate: true,
          cell: (row) => (
            <div className="mos-entity-cell">
              <strong
                className="mos-entity-title"
                title={
                  row.campaignName
                }
              >
                {row.campaignName}
              </strong>

              <span className="mos-entity-subtitle">
                {row.adCount} qualified ads
              </span>
            </div>
          ),
        },
        {
          id: "spend",
          header: "Lifetime Spend",
          align: "right",
          numeric: true,
          minWidth: 126,
          cell: (row) =>
            formatINRCompact(
              row.totals.spend
            ),
        },
        {
          id: "yesterday",
          header: "Latest Spend",
          align: "right",
          numeric: true,
          minWidth: 118,
          cell: (row) =>
            formatINRCompact(
              row.yesterdaySpend
            ),
        },
        {
          id: "purchases",
          header: "Purchases",
          align: "right",
          numeric: true,
          minWidth: 96,
          cell: (row) =>
            formatNumberCompact(
              row.totals
                .purchases
            ),
        },
        {
          id: "cpa",
          header: "CPA",
          align: "right",
          numeric: true,
          minWidth: 104,
          cell: (row) =>
            row.totals
              .purchases > 0
              ? formatINRCompact(
                  row.totals.cpa
                )
              : "No sale",
          tone: () =>
            mode === "cpa"
              ? "negative"
              : "neutral",
        },
        {
          id: "roas",
          header: "ROAS",
          align: "right",
          numeric: true,
          minWidth: 84,
          cell: (row) =>
            `${formatRoas(
              row.totals.roas
            )}x`,
          tone: (row) =>
            mode === "roas"
              ? "positive"
              : row.totals.roas >= 1
                ? "positive"
                : "negative",
        },
        {
          id: "ctr",
          header: "CTR",
          align: "right",
          numeric: true,
          minWidth: 82,
          cell: (row) =>
            formatPct(
              row.totals.ctr,
              2
            ),
        },
      ],
      [mode]
    );

  return (
    <DataTable
      rows={[...rows]}
      columns={columns}
      getRowId={(row) =>
        row.id
      }
      ariaLabel={
        mode === "cpa"
          ? "High CPA campaign rollup"
          : "High ROAS campaign rollup"
      }
      caption="Qualified campaign rollup"
      emptyTitle="No campaign rows"
      emptyDescription="No qualified campaigns are available for the selected threshold."
    />
  );
}

export async function copyUniqueLines(
  lines: readonly string[]
): Promise<number> {
  const clean = Array.from(
    new Set(
      lines
        .map((line) =>
          line.trim()
        )
        .filter(Boolean)
    )
  );

  await navigator.clipboard.writeText(
    clean.join("\n")
  );

  return clean.length;
}
