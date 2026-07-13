"use client";

import {
  CalendarRange,
  IndianRupee,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  EmptyState,
  MetricCard,
  PageHeader,
  SegmentedControl,
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
  MonthlyPerformanceChart,
  WeeklyPerformanceChart,
} from "@/components/metaos-ui/modules/AnalysisLayerTemporalCharts";

import {
  buildMetaV2MonthlyAnalysis,
  type MetaV2MonthlyRow,
  type MetaV2WeeklyRow,
} from "@/lib/meta-v2/engines/monthlyAnalysisEngine";

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

type MonthlyAnalysisView =
  | "monthly"
  | "weekly";

function monthlyRowTone(
  row:
    MetaV2MonthlyRow
): DataTableTone {
  if (
    row.spendOutcome ===
      "efficient_growth" ||
    row.cpaOutcome ===
      "improving"
  ) {
    return "positive";
  }

  if (
    row.spendOutcome ===
      "inefficient_growth" ||
    row.spendOutcome ===
      "contraction_decline" ||
    row.cpaOutcome ===
      "worsening"
  ) {
    return "negative";
  }

  return "warning";
}

function weeklyRowTone(
  row:
    MetaV2WeeklyRow
): DataTableTone {
  if (row.metrics.roas >= 1) {
    return "positive";
  }

  if (
    row.metrics.spend > 0 &&
    row.metrics.purchases <=
      0
  ) {
    return "negative";
  }

  return "warning";
}

function monthlySortValue(
  row:
    MetaV2MonthlyRow,
  key: string
): string | number {
  switch (key) {
    case "month":
      return row.month;

    case "spend":
      return row.metrics.spend;

    case "spendChange":
      return row.movement
        .spend.relative;

    case "revenue":
      return row.metrics.revenue;

    case "purchases":
      return row.metrics.purchases;

    case "cpa":
      return row.metrics.cpa;

    case "cpaChange":
      return row.movement
        .cpa.relative;

    case "roas":
      return row.metrics.roas;

    case "visitors":
      return row.metrics.visitors;

    default:
      return row.month;
  }
}

function weeklySortValue(
  row:
    MetaV2WeeklyRow,
  key: string
): string | number {
  switch (key) {
    case "week":
      return row.week;

    case "spend":
      return row.metrics.spend;

    case "revenue":
      return row.metrics.revenue;

    case "purchases":
      return row.metrics.purchases;

    case "cpa":
      return row.cpa ?? 0;

    case "roas":
      return row.metrics.roas;

    case "visitors":
      return row.metrics.visitors;

    case "costPerVisitor":
      return row.metrics.costPerVisitor;

    case "revenuePerVisitor":
      return row.metrics.revenuePerVisitor;

    default:
      return row.week;
  }
}

function spendOutcomeLabel(
  row:
    MetaV2MonthlyRow
): string {
  if (
    row.spendOutcome ===
    "efficient_growth"
  ) {
    return "Efficient Growth";
  }

  if (
    row.spendOutcome ===
    "inefficient_growth"
  ) {
    return "Inefficient Growth";
  }

  if (
    row.spendOutcome ===
    "contraction_decline"
  ) {
    return "Contraction Decline";
  }

  return "Neutral";
}

function outcomeTone(
  row:
    MetaV2MonthlyRow
) {
  if (
    row.spendOutcome ===
    "efficient_growth"
  ) {
    return "positive" as const;
  }

  if (
    row.spendOutcome ===
      "inefficient_growth" ||
    row.spendOutcome ===
      "contraction_decline"
  ) {
    return "negative" as const;
  }

  return "warning" as const;
}

export function MonthlyAnalysisModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const [view, setView] =
    useState<MonthlyAnalysisView>(
      "monthly"
    );

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [sort, setSort] =
    useState<DataTableSortState>({
      key: "month",
      direction: "desc",
    });

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
      buildMetaV2MonthlyAnalysis(
        cleanRows
      ),
    [cleanRows]
  );

  useEffect(() => {
    if (
      !selectedMonth &&
      output.current?.month
    ) {
      setSelectedMonth(
        output.current.month
      );
    }
  }, [
    selectedMonth,
    output.current?.month,
  ]);

  const selectedMonthlyRow =
    useMemo(
      () =>
        output.monthlyRows.find(
          (row) =>
            row.month ===
            selectedMonth
        ) ??
        output.current ??
        null,
      [
        output.monthlyRows,
        output.current,
        selectedMonth,
      ]
    );

  const selectedWeeklyRows =
    useMemo(
      () =>
        output.weeklyRows.filter(
          (row) =>
            !selectedMonth ||
            row.month ===
              selectedMonth
        ),
      [
        output.weeklyRows,
        selectedMonth,
      ]
    );

  const filteredMonthlyRows =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return output.monthlyRows;
      }

      return output.monthlyRows.filter(
        (row) =>
          [
            row.month,
            row.label,
            spendOutcomeLabel(
              row
            ),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      output.monthlyRows,
      search,
    ]);

  const filteredWeeklyRows =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return selectedWeeklyRows.filter(
        (row) =>
          !query ||
          [
            row.week,
            row.month,
            row.monthLabel,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      selectedWeeklyRows,
      search,
    ]);

  const sortedMonthlyRows =
    useMemo(
      () =>
        filteredMonthlyRows
          .slice()
          .sort(
            (left, right) => {
              const leftValue =
                monthlySortValue(
                  left,
                  sort.key
                );

              const rightValue =
                monthlySortValue(
                  right,
                  sort.key
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
            }
          ),
      [
        filteredMonthlyRows,
        sort,
      ]
    );

  const sortedWeeklyRows =
    useMemo(
      () =>
        filteredWeeklyRows
          .slice()
          .sort(
            (left, right) => {
              const leftValue =
                weeklySortValue(
                  left,
                  sort.key
                );

              const rightValue =
                weeklySortValue(
                  right,
                  sort.key
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
            }
          ),
      [
        filteredWeeklyRows,
        sort,
      ]
    );

  const activeRows =
    view === "monthly"
      ? sortedMonthlyRows
      : sortedWeeklyRows;

  const totalPages = Math.max(
    1,
    Math.ceil(
      activeRows.length /
        pageSize
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const visibleMonthlyRows =
    sortedMonthlyRows.slice(
      (safePage - 1) *
        pageSize,
      safePage * pageSize
    );

  const visibleWeeklyRows =
    sortedWeeklyRows.slice(
      (safePage - 1) *
        pageSize,
      safePage * pageSize
    );

  useEffect(() => {
    setPage(1);

    setSort(
      view === "monthly"
        ? {
            key: "month",
            direction: "desc",
          }
        : {
            key: "week",
            direction: "asc",
          }
    );
  }, [
    view,
    selectedMonth,
    search,
  ]);

  const monthlyColumns =
    useMemo<
      DataTableColumn<MetaV2MonthlyRow>[]
    >(
      () => [
        {
          id: "month",
          header: "Month",
          minWidth: 134,
          sticky: "left",
          sortable: true,
          cell: (row) => (
            <div className="mos-entity-cell">
              <strong className="mos-entity-title">
                {row.label}
              </strong>

              <span className="mos-entity-subtitle">
                {row.priorMonth
                  ? `vs ${row.priorMonth}`
                  : "First available month"}
              </span>
            </div>
          ),
        },
        {
          id: "outcome",
          header: "Outcome",
          minWidth: 156,
          cell: (row) => (
            <Badge
              tone={
                outcomeTone(row)
              }
              dot
            >
              {spendOutcomeLabel(
                row
              )}
            </Badge>
          ),
        },
        {
          id: "spend",
          header: "Spend",
          align: "right",
          numeric: true,
          minWidth: 112,
          sortable: true,
          cell: (row) =>
            formatINRCompact(
              row.metrics.spend
            ),
        },
        {
          id: "spendChange",
          header: "Spend Change",
          align: "right",
          numeric: true,
          minWidth: 116,
          sortable: true,
          cell: (row) =>
            row.priorMonth
              ? formatPct(
                  row.movement
                    .spend.relative *
                    100,
                  1
                )
              : "—",
          tone: (row) =>
            row.movement
              .spend.absolute >
              0
              ? "warning"
              : "neutral",
        },
        {
          id: "revenue",
          header: "Revenue",
          align: "right",
          numeric: true,
          minWidth: 118,
          sortable: true,
          cell: (row) =>
            formatINRCompact(
              row.metrics.revenue
            ),
        },
        {
          id: "purchases",
          header: "Purchases",
          align: "right",
          numeric: true,
          minWidth: 98,
          sortable: true,
          cell: (row) =>
            formatNumberCompact(
              row.metrics.purchases
            ),
        },
        {
          id: "cpa",
          header: "CPA",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (row) =>
            row.metrics
              .purchases > 0
              ? formatINRCompact(
                  row.metrics.cpa
                )
              : "No sale",
        },
        {
          id: "cpaChange",
          header: "CPA Change",
          align: "right",
          numeric: true,
          minWidth: 108,
          sortable: true,
          cell: (row) =>
            row.priorMonth
              ? formatPct(
                  row.movement
                    .cpa.relative *
                    100,
                  1
                )
              : "—",
          tone: (row) =>
            row.cpaOutcome ===
              "improving"
              ? "positive"
              : row.cpaOutcome ===
                  "worsening"
                ? "negative"
                : "neutral",
        },
        {
          id: "roas",
          header: "ROAS",
          align: "right",
          numeric: true,
          minWidth: 86,
          sortable: true,
          cell: (row) =>
            `${formatRoas(
              row.metrics.roas
            )}x`,
          tone: (row) =>
            row.metrics.roas >= 1
              ? "positive"
              : "negative",
        },
        {
          id: "visitors",
          header: "Visitors",
          align: "right",
          numeric: true,
          minWidth: 92,
          sortable: true,
          cell: (row) =>
            formatNumberCompact(
              row.metrics.visitors
            ),
        },
      ],
      []
    );

  const weeklyColumns =
    useMemo<
      DataTableColumn<MetaV2WeeklyRow>[]
    >(
      () => [
        {
          id: "week",
          header: "Week Starting",
          minWidth: 144,
          sticky: "left",
          sortable: true,
          cell: (row) => (
            <div className="mos-entity-cell">
              <strong className="mos-entity-title">
                {formatDate(
                  row.week
                )}
              </strong>

              <span className="mos-entity-subtitle">
                {row.monthLabel}
              </span>
            </div>
          ),
        },
        {
          id: "spend",
          header: "Spend",
          align: "right",
          numeric: true,
          minWidth: 112,
          sortable: true,
          cell: (row) =>
            formatINRCompact(
              row.metrics.spend
            ),
        },
        {
          id: "revenue",
          header: "Revenue",
          align: "right",
          numeric: true,
          minWidth: 118,
          sortable: true,
          cell: (row) =>
            formatINRCompact(
              row.metrics.revenue
            ),
        },
        {
          id: "purchases",
          header: "Purchases",
          align: "right",
          numeric: true,
          minWidth: 96,
          sortable: true,
          cell: (row) =>
            formatNumberCompact(
              row.metrics.purchases
            ),
        },
        {
          id: "cpa",
          header: "CPA",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (row) =>
            row.cpa
              ? formatINRCompact(
                  row.cpa
                )
              : "No sale",
          tone: (row) =>
            row.cpa
              ? "neutral"
              : "negative",
        },
        {
          id: "roas",
          header: "ROAS",
          align: "right",
          numeric: true,
          minWidth: 86,
          sortable: true,
          cell: (row) =>
            `${formatRoas(
              row.metrics.roas
            )}x`,
          tone: (row) =>
            row.metrics.roas >= 1
              ? "positive"
              : "negative",
        },
        {
          id: "visitors",
          header: "Visitors",
          align: "right",
          numeric: true,
          minWidth: 92,
          sortable: true,
          cell: (row) =>
            formatNumberCompact(
              row.metrics.visitors
            ),
        },
        {
          id: "costPerVisitor",
          header: "Cost / Visitor",
          align: "right",
          numeric: true,
          minWidth: 116,
          sortable: true,
          cell: (row) =>
            formatINRCompact(
              row.metrics
                .costPerVisitor
            ),
        },
        {
          id: "revenuePerVisitor",
          header: "Revenue / Visitor",
          align: "right",
          numeric: true,
          minWidth: 134,
          sortable: true,
          cell: (row) =>
            formatINRCompact(
              row.metrics
                .revenuePerVisitor
            ),
          tone: (row) =>
            row.metrics
              .revenuePerVisitor >=
            row.metrics
              .costPerVisitor
              ? "positive"
              : "negative",
        },
      ],
      []
    );

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="Monthly Summary is ready"
        description="Refresh Meta data to activate monthly and Monday-start weekly performance."
      />
    );
  }

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Time-series economics"
        title="Monthly Summary"
        description="Calendar-month performance, prior-month movement and Monday-start weekly visitor economics."
        meta={
          <>
            <Badge>
              {
                output.monthlyRows
                  .length
              }{" "}
              calendar months
            </Badge>

            <Badge>
              {
                output.weeklyRows
                  .length
              }{" "}
              Monday-start weeks
            </Badge>

            {selectedMonthlyRow ? (
              <Badge
                tone={
                  outcomeTone(
                    selectedMonthlyRow
                  )
                }
              >
                {spendOutcomeLabel(
                  selectedMonthlyRow
                )}
              </Badge>
            ) : null}
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Selected Spend"
          value={formatINRCompact(
            selectedMonthlyRow
              ?.metrics.spend ?? 0
          )}
          icon={
            <IndianRupee />
          }
        />

        <MetricCard
          label="Selected Revenue"
          value={formatINRCompact(
            selectedMonthlyRow
              ?.metrics.revenue ?? 0
          )}
          tone="positive"
          icon={
            <TrendingUp />
          }
        />

        <MetricCard
          label="Purchases"
          value={formatNumberCompact(
            selectedMonthlyRow
              ?.metrics.purchases ??
              0
          )}
          icon={
            <ShoppingCart />
          }
        />

        <MetricCard
          label="CPA"
          value={
            (
              selectedMonthlyRow
                ?.metrics
                .purchases ?? 0
            ) > 0
              ? formatINRCompact(
                  selectedMonthlyRow
                    ?.metrics.cpa ??
                    0
                )
              : "No sale"
          }
        />

        <MetricCard
          label="ROAS"
          value={`${formatRoas(
            selectedMonthlyRow
              ?.metrics.roas ?? 0
          )}x`}
          tone={
            (
              selectedMonthlyRow
                ?.metrics.roas ?? 0
            ) >= 1
              ? "positive"
              : "negative"
          }
        />

        <MetricCard
          label="Selected Month"
          value={
            selectedMonthlyRow
              ?.label ??
            "No month"
          }
          icon={
            <CalendarRange />
          }
        />
      </div>

      <div className="mos-analysis-month-controls">
        <label className="mos-analysis-select-control">
          <span>
            Selected month
          </span>

          <select
            value={
              selectedMonth
            }
            onChange={(
              event
            ) =>
              setSelectedMonth(
                event.target.value
              )
            }
            aria-label="Select monthly analysis month"
          >
            {output.monthlyRows
              .slice()
              .reverse()
              .map((row) => (
                <option
                  key={row.month}
                  value={row.month}
                >
                  {row.label}
                </option>
              ))}
          </select>
        </label>

        <SegmentedControl
          value={view}
          onChange={setView}
          ariaLabel="Monthly analysis view"
          options={[
            {
              value: "monthly",
              label:
                "Monthly",
            },
            {
              value: "weekly",
              label:
                "Selected Month Weeks",
            },
          ]}
        />
      </div>

      <div className="mos-analysis-chart-grid">
        <MonthlyPerformanceChart
          rows={
            output.monthlyRows
          }
        />

        <WeeklyPerformanceChart
          rows={
            selectedWeeklyRows
          }
        />
      </div>

      {selectedMonthlyRow ? (
        <div className="mos-analysis-comparison-grid">
          <MetricCard
            compact
            label="Spend Change"
            value={
              selectedMonthlyRow
                .priorMonth
                ? formatPct(
                    selectedMonthlyRow
                      .movement
                      .spend
                      .relative *
                      100,
                    1
                  )
                : "—"
            }
            tone={
              selectedMonthlyRow
                .movement
                .spend.absolute >
              0
                ? "warning"
                : "neutral"
            }
          />

          <MetricCard
            compact
            label="Revenue Change"
            value={
              selectedMonthlyRow
                .priorMonth
                ? formatPct(
                    selectedMonthlyRow
                      .movement
                      .revenue
                      .relative *
                      100,
                    1
                  )
                : "—"
            }
            tone={
              selectedMonthlyRow
                .movement
                .revenue.absolute >=
              0
                ? "positive"
                : "negative"
            }
          />

          <MetricCard
            compact
            label="CPA Change"
            value={
              selectedMonthlyRow
                .priorMonth
                ? formatPct(
                    selectedMonthlyRow
                      .movement
                      .cpa
                      .relative *
                      100,
                    1
                  )
                : "—"
            }
            tone={
              selectedMonthlyRow
                .cpaOutcome ===
              "improving"
                ? "positive"
                : selectedMonthlyRow
                      .cpaOutcome ===
                    "worsening"
                  ? "negative"
                  : "neutral"
            }
          />
        </div>
      ) : null}

      <TableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder:
            view === "monthly"
              ? "Search month or outcome"
              : "Search week",
          ariaLabel:
            "Search monthly analysis",
        }}
        summary={`${activeRows.length.toLocaleString(
          "en-IN"
        )} rows`}
        actions={
          <TableDensityControl
            value={density}
            onChange={
              setDensity
            }
          />
        }
      />

      {view === "monthly" ? (
        <DataTable
          rows={
            visibleMonthlyRows
          }
          columns={
            monthlyColumns
          }
          getRowId={(row) =>
            row.month
          }
          ariaLabel="Monthly performance table"
          caption="Calendar-month Meta performance"
          density={density}
          sort={sort}
          onSortChange={
            setSort
          }
          rowTone={
            monthlyRowTone
          }
          emptyTitle="No monthly rows found"
          emptyDescription="Clear the search or refresh Meta data."
        />
      ) : (
        <DataTable
          rows={
            visibleWeeklyRows
          }
          columns={
            weeklyColumns
          }
          getRowId={(row) =>
            row.week
          }
          ariaLabel="Weekly performance table"
          caption="Monday-start weekly performance for the selected month"
          density={density}
          sort={sort}
          onSortChange={
            setSort
          }
          rowTone={
            weeklyRowTone
          }
          emptyTitle="No weekly rows found"
          emptyDescription="Select another month or refresh Meta data."
        />
      )}

      <TablePagination
        page={safePage}
        pageSize={pageSize}
        totalRows={
          activeRows.length
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
