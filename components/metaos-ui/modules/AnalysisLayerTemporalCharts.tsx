"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  MetaV2CreativeAgeBucketRow,
  MetaV2CreativeAgeingMonthRow,
} from "@/lib/meta-v2/engines/creativeAgeingEngine";

import type {
  MetaV2MonthlyRow,
  MetaV2WeeklyRow,
} from "@/lib/meta-v2/engines/monthlyAnalysisEngine";

import {
  formatINRCompact,
  formatPct,
} from "@/lib/meta-v2/formatters";

function compactNumber(
  value: number
): string {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  );
}

export function CreativeCohortChart({
  rows,
}: {
  rows:
    readonly MetaV2CreativeAgeingMonthRow[];
}) {
  const chartRows =
    rows.map((row) => ({
      month: row.label,
      newCreatives:
        row.newCreatives,
      oldCreatives:
        row.oldCreatives,
      newSpendShare:
        row.newSpendShare *
        100,
    }));

  return (
    <Card>
      <CardHeader>
        <CardHeaderText>
          <CardTitle>
            Creative Cohort Mix
          </CardTitle>

          <CardDescription>
            New and existing creative counts with new-creative spend share.
          </CardDescription>
        </CardHeaderText>
      </CardHeader>

      <CardBody>
        {chartRows.length ? (
          <div className="mos-analysis-chart">
            <ResponsiveContainer
              width="100%"
              height={270}
            >
              <BarChart
                data={chartRows}
                margin={{
                  top: 8,
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
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                />

                <YAxis
                  yAxisId="count"
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                  tickFormatter={(
                    value
                  ) =>
                    compactNumber(
                      Number(value)
                    )
                  }
                />

                <YAxis
                  yAxisId="share"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  domain={[
                    0,
                    100,
                  ]}
                  tick={{
                    fontSize: 9,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                  tickFormatter={(
                    value
                  ) =>
                    `${Number(
                      value
                    ).toFixed(0)}%`
                  }
                />

                <Tooltip />

                <Legend
                  wrapperStyle={{
                    fontSize: 10,
                  }}
                />

                <Bar
                  yAxisId="count"
                  dataKey="newCreatives"
                  name="New Creatives"
                  fill="var(--mos-positive)"
                  radius={[
                    3,
                    3,
                    0,
                    0,
                  ]}
                />

                <Bar
                  yAxisId="count"
                  dataKey="oldCreatives"
                  name="Old Creatives"
                  fill="var(--mos-text-tertiary)"
                  radius={[
                    3,
                    3,
                    0,
                    0,
                  ]}
                />

                <Line
                  yAxisId="share"
                  type="monotone"
                  dataKey="newSpendShare"
                  name="New Spend Share"
                  stroke="var(--mos-warning)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mos-inline-empty">
            No creative cohort rows are available.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function CreativeAgeBucketChart({
  rows,
}: {
  rows:
    readonly MetaV2CreativeAgeBucketRow[];
}) {
  const chartRows =
    rows.map((row) => ({
      bucket: row.bucket,
      spend:
        row.metrics.spend,
      roas:
        row.metrics.roas,
      creatives:
        row.creativeCount,
    }));

  return (
    <Card>
      <CardHeader>
        <CardHeaderText>
          <CardTitle>
            Latest 30-Day Age Distribution
          </CardTitle>

          <CardDescription>
            Spend and ROAS across the eleven protected creative-age buckets.
          </CardDescription>
        </CardHeaderText>
      </CardHeader>

      <CardBody>
        {chartRows.length ? (
          <div className="mos-analysis-chart">
            <ResponsiveContainer
              width="100%"
              height={270}
            >
              <BarChart
                data={chartRows}
                margin={{
                  top: 8,
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
                  dataKey="bucket"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={58}
                  tick={{
                    fontSize: 8,
                    fill:
                      "var(--mos-text-tertiary)",
                  }}
                />

                <YAxis
                  yAxisId="money"
                  axisLine={false}
                  tickLine={false}
                  width={62}
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
                />

                <Tooltip />

                <Legend
                  wrapperStyle={{
                    fontSize: 10,
                  }}
                />

                <Bar
                  yAxisId="money"
                  dataKey="spend"
                  name="Spend"
                  fill="var(--mos-text)"
                  radius={[
                    3,
                    3,
                    0,
                    0,
                  ]}
                />

                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="roas"
                  name="ROAS"
                  stroke="var(--mos-positive)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mos-inline-empty">
            No creative-age rows are available.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function MonthlyPerformanceChart({
  rows,
}: {
  rows:
    readonly MetaV2MonthlyRow[];
}) {
  const chartRows =
    rows.map((row) => ({
      month: row.label,
      spend:
        row.metrics.spend,
      revenue:
        row.metrics.revenue,
      cpa:
        row.metrics.cpa,
      roas:
        row.metrics.roas,
    }));

  return (
    <Card>
      <CardHeader>
        <CardHeaderText>
          <CardTitle>
            Monthly Performance
          </CardTitle>

          <CardDescription>
            Spend, revenue, CPA and ROAS across calendar months.
          </CardDescription>
        </CardHeaderText>
      </CardHeader>

      <CardBody>
        {chartRows.length ? (
          <div className="mos-analysis-chart">
            <ResponsiveContainer
              width="100%"
              height={280}
            >
              <LineChart
                data={chartRows}
                margin={{
                  top: 8,
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
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
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
                  width={62}
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
                />

                <Tooltip />

                <Legend
                  wrapperStyle={{
                    fontSize: 10,
                  }}
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
            No monthly rows are available.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function WeeklyPerformanceChart({
  rows,
}: {
  rows:
    readonly MetaV2WeeklyRow[];
}) {
  const chartRows =
    rows.map((row) => ({
      week: row.week,
      spend:
        row.metrics.spend,
      revenue:
        row.metrics.revenue,
      cpa:
        row.cpa ?? 0,
      roas:
        row.metrics.roas,
    }));

  return (
    <Card>
      <CardHeader>
        <CardHeaderText>
          <CardTitle>
            Weekly Spend and CPA
          </CardTitle>

          <CardDescription>
            Monday-start weekly performance for the selected month.
          </CardDescription>
        </CardHeaderText>
      </CardHeader>

      <CardBody>
        {chartRows.length ? (
          <div className="mos-analysis-chart">
            <ResponsiveContainer
              width="100%"
              height={270}
            >
              <LineChart
                data={chartRows}
                margin={{
                  top: 8,
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
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
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
                  width={62}
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
                />

                <Tooltip />

                <Legend
                  wrapperStyle={{
                    fontSize: 10,
                  }}
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
                  stroke="var(--mos-positive)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mos-inline-empty">
            No weekly rows are available for the selected month.
          </div>
        )}
      </CardBody>
    </Card>
  );
}
