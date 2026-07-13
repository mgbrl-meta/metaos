"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardHeaderText,
  CardTitle,
} from "@/components/metaos-ui/primitives";

import type {
  MetaV2DailyAnalysisRow,
} from "@/lib/meta-v2/analysisLayerUtils";

import type {
  MetaV2SpendDimensionRow,
} from "@/lib/meta-v2/engines/spendAnalysisEngine";

import {
  formatDate,
  formatINRCompact,
  formatRoas,
} from "@/lib/meta-v2/formatters";

interface AnalysisTooltipPayload {
  dataKey?: string | number;
  name?: string;
  value?: number | null;
}

interface AnalysisTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: AnalysisTooltipPayload[];
}

function SpendTrendTooltip({
  active,
  label,
  payload,
}: AnalysisTooltipProps) {
  if (!active || !payload?.length) {
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
          );

        const value =
          Number(
            item.value ?? 0
          );

        const formatted =
          key === "roas"
            ? `${formatRoas(value)}x`
            : formatINRCompact(
                value
              );

        return (
          <div
            key={key}
            className="mos-chart-tooltip-row"
          >
            <span>
              {item.name ?? key}
            </span>

            <b>{formatted}</b>
          </div>
        );
      })}
    </div>
  );
}

function SpendBarTooltip({
  active,
  label,
  payload,
}: AnalysisTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="mos-chart-tooltip">
      <strong>
        {String(label ?? "")}
      </strong>

      <div className="mos-chart-tooltip-row">
        <span>Spend</span>

        <b>
          {formatINRCompact(
            Number(
              payload[0]?.value ??
                0
            )
          )}
        </b>
      </div>
    </div>
  );
}

export function SpendTrendChart({
  rows,
}: {
  rows:
    readonly MetaV2DailyAnalysisRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardHeaderText>
          <CardTitle>
            Daily Spend Efficiency
          </CardTitle>

          <CardDescription>
            Spend, revenue, CPA and ROAS across the selected window.
          </CardDescription>
        </CardHeaderText>
      </CardHeader>

      <CardBody>
        {rows.length ? (
          <div className="mos-analysis-chart">
            <ResponsiveContainer
              width="100%"
              height={260}
            >
              <LineChart
                data={[...rows]}
                margin={{
                  top: 8,
                  right: 10,
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
                  minTickGap={22}
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
                  width={60}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                  tickFormatter={(
                    value
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
                  width={42}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                  tickFormatter={(
                    value
                  ) =>
                    Number(
                      value
                    ).toFixed(1)
                  }
                />

                <Tooltip
                  content={
                    <SpendTrendTooltip />
                  }
                />

                <Line
                  yAxisId="money"
                  type="monotone"
                  dataKey="spend"
                  name="Spend"
                  stroke="var(--mos-text)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />

                <Line
                  yAxisId="money"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="var(--mos-positive)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />

                <Line
                  yAxisId="money"
                  type="monotone"
                  dataKey="cpa"
                  name="CPA"
                  stroke="var(--mos-negative)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />

                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="roas"
                  name="ROAS"
                  stroke="var(--mos-warning)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mos-inline-empty">
            No daily rows are available for this window.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function SpendConcentrationChart({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;

  rows:
    readonly MetaV2SpendDimensionRow[];
}) {
  const chartRows =
    rows.map((row) => ({
      name: row.name,
      spend:
        row.totals.spend,
    }));

  return (
    <Card>
      <CardHeader>
        <CardHeaderText>
          <CardTitle>
            {title}
          </CardTitle>

          <CardDescription>
            {description}
          </CardDescription>
        </CardHeaderText>
      </CardHeader>

      <CardBody>
        {chartRows.length ? (
          <div className="mos-analysis-bar-chart">
            <ResponsiveContainer
              width="100%"
              height={260}
            >
              <BarChart
                data={chartRows}
                layout="vertical"
                margin={{
                  top: 4,
                  right: 12,
                  left: 8,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--mos-border)"
                />

                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                  tickFormatter={(
                    value
                  ) =>
                    formatINRCompact(
                      Number(value)
                    )
                  }
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-secondary)",
                  }}
                  tickFormatter={(
                    value
                  ) => {
                    const text =
                      String(value);

                    return text.length >
                      20
                      ? `${text.slice(
                          0,
                          20
                        )}…`
                      : text;
                  }}
                />

                <Tooltip
                  content={
                    <SpendBarTooltip />
                  }
                />

                <Bar
                  dataKey="spend"
                  name="Spend"
                  fill="var(--mos-text)"
                  radius={[
                    0,
                    4,
                    4,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mos-inline-empty">
            No concentration rows are available.
          </div>
        )}
      </CardBody>
    </Card>
  );
}
