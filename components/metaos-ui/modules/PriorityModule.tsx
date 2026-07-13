"use client";

import {
  Activity,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import {
  useEffect,
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
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardHeaderText,
  CardTitle,
  EmptyState,
  MetricCard,
  PageHeader,
} from "@/components/metaos-ui/primitives";

import {
  DataTable,
  TableDensityControl,
  TablePagination,
  TableToolbar,
  type DataTableColumn,
  type DataTableDensity,
  type DataTableSortState,
  type DataTableTone,
} from "@/components/metaos-ui/table";

import {
  buildMetaV2PriorityMatrix,
  type MetaV2PriorityItem,
  type MetaV2PriorityTrendRow,
} from "@/lib/meta-v2/engines/priorityEngine";

import {
  formatDate,
  formatINRCompact,
  formatNumberCompact,
  formatPct,
  formatRoas,
} from "@/lib/meta-v2/formatters";

import {
  normalizeMetaV2Rows,
} from "@/lib/meta-v2/normalize";

import {
  useMetaStore,
} from "@/store/metaStore";

import {
  useMetaV2SettingsStore,
} from "@/store/metaV2SettingsStore";

type PriorityMode =
  | "descale"
  | "scale";

type TrendMetricKey =
  | "spend"
  | "cpm"
  | "ctr"
  | "cpa"
  | "aov"
  | "roas";

interface TrendMetricDefinition {
  key: TrendMetricKey;
  label: string;
  axis: "money" | "rate";
  stroke: string;
}

const TREND_METRICS: readonly TrendMetricDefinition[] =
  [
    {
      key: "spend",
      label: "Spend",
      axis: "money",
      stroke:
        "var(--mos-text)",
    },
    {
      key: "cpm",
      label: "CPM",
      axis: "money",
      stroke:
        "var(--mos-text-secondary)",
    },
    {
      key: "ctr",
      label: "CTR",
      axis: "rate",
      stroke:
        "var(--mos-warning)",
    },
    {
      key: "cpa",
      label: "CPA",
      axis: "money",
      stroke:
        "var(--mos-negative)",
    },
    {
      key: "aov",
      label: "AOV",
      axis: "money",
      stroke:
        "var(--mos-text-tertiary)",
    },
    {
      key: "roas",
      label: "ROAS",
      axis: "rate",
      stroke:
        "var(--mos-positive)",
    },
  ];

function formatTrendValue(
  metric: TrendMetricKey,
  value: number
) {
  if (
    [
      "spend",
      "cpm",
      "cpa",
      "aov",
    ].includes(metric)
  ) {
    return formatINRCompact(
      value
    );
  }

  if (metric === "ctr") {
    return formatPct(value, 2);
  }

  return `${formatRoas(
    value
  )}x`;
}

function PriorityTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number;
    name?: string;
    stroke?: string;
  }>;
  label?: string;
}) {
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
          ) as TrendMetricKey;

        return (
          <div
            key={key}
            className="mos-chart-tooltip-row"
          >
            <span>
              {item.name ??
                key}
            </span>

            <b>
              {formatTrendValue(
                key,
                Number(
                  item.value ?? 0
                )
              )}
            </b>
          </div>
        );
      })}
    </div>
  );
}

function PriorityTrendChart({
  data,
  mode,
}: {
  data: readonly MetaV2PriorityTrendRow[];
  mode: PriorityMode;
}) {
  const [selected, setSelected] =
    useState<
      Record<
        TrendMetricKey,
        boolean
      >
    >({
      spend: true,
      cpm: false,
      ctr: false,
      cpa:
        mode === "descale",
      aov: false,
      roas:
        mode === "scale",
    });

  const activeMetrics =
    TREND_METRICS.filter(
      (metric) =>
        selected[
          metric.key
        ]
    );

  const last30 =
    data.slice(-30);

  function toggleMetric(
    key: TrendMetricKey
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
          [key]:
            !current[key],
        };
      }
    );
  }

  return (
    <Card density="compact">
      <CardHeader>
        <CardHeaderText>
          <CardTitle>
            Selectable Trend
          </CardTitle>

          <CardDescription>
            Inspect the most recent 30 daily points before taking action.
          </CardDescription>
        </CardHeaderText>

        <Activity
          size={16}
          aria-hidden="true"
        />
      </CardHeader>

      <CardBody>
        <div className="mos-priority-trend-controls">
          {TREND_METRICS.map(
            (metric) => (
              <Button
                key={
                  metric.key
                }
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

        {last30.length ? (
          <div className="mos-priority-chart">
            <ResponsiveContainer
              width="100%"
              height={220}
            >
              <LineChart
                data={last30}
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
                  width={48}
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
                    <PriorityTrendTooltip />
                  }
                />

                {activeMetrics.map(
                  (metric) => (
                    <Line
                      key={
                        metric.key
                      }
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
            No trend data is available for this creative.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function prioritySortValue(
  item: MetaV2PriorityItem,
  key: string,
  mode: PriorityMode
): string | number {
  switch (key) {
    case "creative":
      return item.adName;

    case "score":
      return mode === "descale"
        ? item.descalingScore
        : item.scalingScore;

    case "spend":
      return item.last7.spend;

    case "cpa":
      return item.last7.cpa;

    case "roas":
      return item.last7.roas;

    case "purchases":
      return item.last7.purchases;

    case "spendChange":
      return item.spendChange7d;

    default:
      return mode === "descale"
        ? item.descalingScore
        : item.scalingScore;
  }
}

function queueRowTone(
  item: MetaV2PriorityItem,
  mode: PriorityMode
): DataTableTone {
  const score =
    mode === "descale"
      ? item.descalingScore
      : item.scalingScore;

  if (mode === "scale") {
    return score >= 50
      ? "positive"
      : "neutral";
  }

  return score >= 60
    ? "negative"
    : "warning";
}

function PriorityDetail({
  item,
  mode,
}: {
  item: MetaV2PriorityItem;
  mode: PriorityMode;
}) {
  const signals =
    mode === "descale"
      ? item.descalingSignals
      : item.scalingSignals;

  return (
    <div className="mos-priority-detail">
      <div className="mos-priority-detail-grid">
        <Card
          density="compact"
          tone={
            mode === "descale"
              ? "negative"
              : "positive"
          }
        >
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                {mode === "descale"
                  ? "Why Not Scale"
                  : "Why Scale"}
              </CardTitle>

              <CardDescription>
                {mode === "descale"
                  ? item.primaryIssue
                  : item.scalingReason}
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-badge-stack">
              {signals.length ? (
                signals.map(
                  (signal) => (
                    <Badge
                      key={signal}
                      tone={
                        mode ===
                        "descale"
                          ? "negative"
                          : "positive"
                      }
                    >
                      {signal}
                    </Badge>
                  )
                )
              ) : (
                <Badge>
                  No additional signal
                </Badge>
              )}
            </div>
          </CardBody>
        </Card>

        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Required Action
              </CardTitle>

              <CardDescription>
                {mode === "descale"
                  ? item.descalingAction
                  : item.scalingAction}
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-detail-list">
              <span>
                Decision rule:{" "}
                <strong>
                  {
                    item.decision
                      .action
                  }
                </strong>
              </span>

              <span>
                Incremental spend:{" "}
                <strong>
                  {formatINRCompact(
                    item.incrementalSpend
                  )}
                </strong>
              </span>

              <span>
                Incremental revenue:{" "}
                <strong>
                  {formatINRCompact(
                    item.incrementalRevenue
                  )}
                </strong>
              </span>
            </div>
          </CardBody>
        </Card>

        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Window Comparison
              </CardTitle>

              <CardDescription>
                Last seven days versus the previous seven days and lifetime context.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-priority-window-grid">
              <MetricCard
                compact
                label="L7D Spend"
                value={formatINRCompact(
                  item.last7.spend
                )}
              />

              <MetricCard
                compact
                label="L7D CPA"
                value={
                  item.last7
                    .purchases > 0
                    ? formatINRCompact(
                        item.last7
                          .cpa
                      )
                    : "No sale"
                }
                tone={
                  item.last7
                    .purchases > 0
                    ? "neutral"
                    : "negative"
                }
              />

              <MetricCard
                compact
                label="L7D ROAS"
                value={`${formatRoas(
                  item.last7.roas
                )}x`}
                tone={
                  item.last7
                    .roas >= 1
                    ? "positive"
                    : "negative"
                }
              />

              <MetricCard
                compact
                label="Previous 7D"
                value={formatINRCompact(
                  item.previous7
                    .spend
                )}
              />

              <MetricCard
                compact
                label="Lifetime CPA"
                value={
                  item.lifetime
                    .purchases > 0
                    ? formatINRCompact(
                        item.lifetime
                          .cpa
                      )
                    : "No sale"
                }
              />

              <MetricCard
                compact
                label="Lifetime ROAS"
                value={`${formatRoas(
                  item.lifetime
                    .roas
                )}x`}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <PriorityTrendChart
        data={item.trend}
        mode={mode}
      />
    </div>
  );
}

function PriorityQueueModule({
  mode,
}: {
  mode: PriorityMode;
}) {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const settings =
    useMetaV2SettingsStore(
      (state) => state.settings
    );

  const [search, setSearch] =
    useState("");

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [sort, setSort] =
    useState<DataTableSortState>({
      key: "score",
      direction: "desc",
    });

  const [
    expandedRowIds,
    setExpandedRowIds,
  ] =
    useState<string[]>([]);

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(25);

  const cleanRows = useMemo(
    () =>
      normalizeMetaV2Rows(
        performanceRows as unknown as Record<
          string,
          unknown
        >[]
      ),
    [performanceRows]
  );

  const output = useMemo(
    () =>
      buildMetaV2PriorityMatrix(
        cleanRows,
        settings
      ),
    [cleanRows, settings]
  );

  const queue =
    mode === "descale"
      ? output.descaling
      : output.scaling;

  const filteredItems =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return queue;
      }

      return queue.filter(
        (item) =>
          [
            item.adName,
            item.campaignName,
            item.adSetName,
            item.primaryIssue,
            item.scalingReason,
            item.descalingAction,
            item.scalingAction,
            ...item.descalingSignals,
            ...item.scalingSignals,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [queue, search]);

  const sortedItems =
    useMemo(
      () =>
        filteredItems
          .slice()
          .sort((left, right) => {
            const leftValue =
              prioritySortValue(
                left,
                sort.key,
                mode
              );

            const rightValue =
              prioritySortValue(
                right,
                sort.key,
                mode
              );

            const comparison =
              typeof leftValue ===
                "number" &&
              typeof rightValue ===
                "number"
                ? leftValue -
                  rightValue
                : String(
                    leftValue
                  ).localeCompare(
                    String(
                      rightValue
                    )
                  );

            return sort.direction ===
              "asc"
              ? comparison
              : -comparison;
          }),
      [
        filteredItems,
        sort,
        mode,
      ]
    );

  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedItems.length /
        pageSize
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const visibleItems =
    sortedItems.slice(
      (safePage - 1) *
        pageSize,
      safePage * pageSize
    );

  useEffect(() => {
    setPage(1);
  }, [search, mode]);

  const columns =
    useMemo<
      DataTableColumn<MetaV2PriorityItem>[]
    >(
      () => [
        {
          id: "rank",
          header: "#",
          align: "center",
          minWidth: 50,
          cell: (
            _item,
            rowIndex
          ) =>
            (safePage - 1) *
              pageSize +
            rowIndex +
            1,
        },
        {
          id: "creative",
          header: "Creative / Ad",
          minWidth: 330,
          sticky: "left",
          truncate: true,
          sortable: true,
          cell: (item) => (
            <div className="mos-entity-cell">
              <div className="mos-badge-stack">
                <Badge
                  tone={
                    mode ===
                    "descale"
                      ? "negative"
                      : "positive"
                  }
                >
                  {mode ===
                  "descale"
                    ? item.primaryIssue
                    : item.scalingReason}
                </Badge>

                <Badge>
                  {
                    item.decision
                      .action
                  }
                </Badge>
              </div>

              <strong
                className="mos-entity-title"
                title={item.adName}
              >
                {item.adName}
              </strong>

              <span
                className="mos-entity-subtitle"
                title={`${item.campaignName} · ${item.adSetName}`}
              >
                {
                  item.campaignName
                }{" "}
                ·{" "}
                {item.adSetName}
              </span>
            </div>
          ),
        },
        {
          id: "score",
          header:
            mode === "descale"
              ? "Risk Score"
              : "Scale Score",
          align: "right",
          numeric: true,
          minWidth: 102,
          sortable: true,
          cell: (item) =>
            mode === "descale"
              ? item.descalingScore
              : item.scalingScore,
          tone: () =>
            mode === "descale"
              ? "negative"
              : "positive",
        },
        {
          id: "spend",
          header: "L7D Spend",
          align: "right",
          numeric: true,
          minWidth: 112,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.last7.spend
            ),
        },
        {
          id: "cpa",
          header: "L7D CPA",
          align: "right",
          numeric: true,
          minWidth: 108,
          sortable: true,
          cell: (item) =>
            item.last7
              .purchases > 0
              ? formatINRCompact(
                  item.last7.cpa
                )
              : "No sale",
          tone: (item) =>
            item.last7
              .purchases > 0
              ? "neutral"
              : "negative",
        },
        {
          id: "roas",
          header: "L7D ROAS",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (item) =>
            `${formatRoas(
              item.last7.roas
            )}x`,
          tone: (item) =>
            item.last7.roas >=
            settings.targetRoas
              ? "positive"
              : "negative",
        },
        {
          id: "purchases",
          header: "Purchases",
          align: "right",
          numeric: true,
          minWidth: 96,
          sortable: true,
          cell: (item) =>
            formatNumberCompact(
              item.last7
                .purchases
            ),
        },
        {
          id: "spendChange",
          header: "Spend Change",
          align: "right",
          minWidth: 112,
          sortable: true,
          cell: (item) =>
            formatPct(
              item.spendChange7d *
                100
            ),
          tone: (item) =>
            mode === "descale"
              ? item.spendChange7d >
                  0
                ? "negative"
                : "positive"
              : item.spendChange7d >
                    0 &&
                  item.incrementalRevenue >
                    0
                ? "positive"
                : "neutral",
        },
        {
          id: "action",
          header: "Action",
          minWidth: 205,
          cell: (item) =>
            mode === "descale"
              ? item.descalingAction
              : item.scalingAction,
        },
      ],
      [
        mode,
        pageSize,
        safePage,
        settings.targetRoas,
      ]
    );

  if (!cleanRows.length) {
    return (
      <EmptyState
        title={
          mode === "descale"
            ? "De-scaling queue is ready"
            : "Scaling queue is ready"
        }
        description="Refresh Meta data to activate the protected priority matrix."
      />
    );
  }

  const queueSpend =
    mode === "descale"
      ? output.descalingSpend
      : output.scalingSpend;

  const highestScore =
    queue.length
      ? mode === "descale"
        ? queue[0]
            .descalingScore
        : queue[0]
            .scalingScore
      : 0;

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow={
          mode === "descale"
            ? "Risk reduction queue"
            : "Scale opportunity queue"
        }
        title={
          mode === "descale"
            ? "Top De-scaling Priorities"
            : "Top Scaling Priorities"
        }
        description={
          mode === "descale"
            ? "Ranked active creatives showing CPA decay, ROAS decay, attention deterioration, bad scaling, or scale fatigue."
            : "Ranked active creatives showing efficient scaling, underfed-winner potential, stable CPA, and purchase confidence."
        }
        actions={
          <>
            <Badge
              tone={
                mode === "descale"
                  ? "negative"
                  : "positive"
              }
            >
              {queue.length}{" "}
              candidates
            </Badge>

            <Badge>
              Latest{" "}
              {formatDate(
                output.latestDate
              )}
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label={
            mode === "descale"
              ? "Risk Candidates"
              : "Scale Candidates"
          }
          value={
            queue.length
          }
          tone={
            mode === "descale"
              ? queue.length
                ? "negative"
                : "positive"
              : queue.length
                ? "positive"
                : "neutral"
          }
          icon={
            mode === "descale" ? (
              <ShieldAlert />
            ) : (
              <TrendingUp />
            )
          }
        />

        <MetricCard
          label="Queue Spend"
          value={formatINRCompact(
            queueSpend
          )}
          tone={
            mode === "descale"
              ? queueSpend > 0
                ? "negative"
                : "positive"
              : "positive"
          }
        />

        <MetricCard
          label="Highest Score"
          value={highestScore}
          tone={
            mode === "descale"
              ? highestScore > 0
                ? "negative"
                : "neutral"
              : highestScore > 0
                ? "positive"
                : "neutral"
          }
        />

        <MetricCard
          label="Target ROAS"
          value={`${formatRoas(
            settings.targetRoas
          )}x`}
        />
      </div>

      <TableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder:
            "Search creative, campaign, signal, or action",
          ariaLabel:
            "Search priority queue",
        }}
        summary={`${sortedItems.length.toLocaleString(
          "en-IN"
        )} ranked creatives`}
        actions={
          <TableDensityControl
            value={density}
            onChange={setDensity}
          />
        }
      />

      <DataTable
        rows={visibleItems}
        columns={columns}
        getRowId={(item) =>
          item.id
        }
        ariaLabel={
          mode === "descale"
            ? "De-scaling priority queue"
            : "Scaling priority queue"
        }
        caption={
          mode === "descale"
            ? "Active Meta creatives ranked by de-scaling risk"
            : "Active Meta creatives ranked by scaling opportunity"
        }
        density={density}
        sort={sort}
        onSortChange={
          setSort
        }
        rowTone={(item) =>
          queueRowTone(
            item,
            mode
          )
        }
        expandedRowIds={
          expandedRowIds
        }
        onToggleRow={(id) =>
          setExpandedRowIds(
            (current) =>
              current.includes(id)
                ? current.filter(
                    (value) =>
                      value !== id
                  )
                : [
                    ...current,
                    id,
                  ]
          )
        }
        renderExpandedRow={(
          item
        ) => (
          <PriorityDetail
            item={item}
            mode={mode}
          />
        )}
        emptyTitle={
          mode === "descale"
            ? "No de-scaling candidates"
            : "No scaling candidates"
        }
        emptyDescription={
          mode === "descale"
            ? "No active creatives currently cross the protected de-scaling score."
            : "No active creatives currently cross the protected scaling score."
        }
      />

      <TablePagination
        page={safePage}
        pageSize={pageSize}
        totalRows={
          sortedItems.length
        }
        onPageChange={
          setPage
        }
        onPageSizeChange={(
          value
        ) => {
          setPageSize(value);
          setPage(1);
        }}
      />
    </div>
  );
}

export function TopDescalingModule() {
  return (
    <PriorityQueueModule mode="descale" />
  );
}

export function TopScalingModule() {
  return (
    <PriorityQueueModule mode="scale" />
  );
}
