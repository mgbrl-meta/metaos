"use client";

import {
  CalendarDays,
  History,
  Sparkles,
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
  CreativeAgeBucketChart,
  CreativeCohortChart,
} from "@/components/metaos-ui/modules/AnalysisLayerTemporalCharts";

import {
  buildMetaV2CreativeAgeing,
  type MetaV2CreativeAgeBucketRow,
  type MetaV2CreativeAgeingMonthRow,
} from "@/lib/meta-v2/engines/creativeAgeingEngine";

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

type CreativeAgeingView =
  | "cohorts"
  | "age_buckets";

function monthlySortValue(
  row:
    MetaV2CreativeAgeingMonthRow,
  key: string
): string | number {
  switch (key) {
    case "month":
      return row.month;

    case "newCreatives":
      return row.newCreatives;

    case "oldCreatives":
      return row.oldCreatives;

    case "newSpendShare":
      return row.newSpendShare;

    case "newSpend":
      return row.newMetrics.spend;

    case "newCpa":
      return row.newMetrics.cpa;

    case "newRoas":
      return row.newMetrics.roas;

    case "oldSpend":
      return row.oldMetrics.spend;

    case "oldCpa":
      return row.oldMetrics.cpa;

    case "oldRoas":
      return row.oldMetrics.roas;

    default:
      return row.month;
  }
}

function ageingSortValue(
  row:
    MetaV2CreativeAgeBucketRow,
  key: string
): string | number {
  switch (key) {
    case "bucket":
      return row.key;

    case "creativeCount":
      return row.creativeCount;

    case "spend":
      return row.metrics.spend;

    case "purchases":
      return row.metrics.purchases;

    case "cpa":
      return row.metrics.cpa;

    case "roas":
      return row.metrics.roas;

    case "ctr":
      return row.metrics.ctr;

    case "frequency":
      return row.metrics.frequency;

    default:
      return row.key;
  }
}

function cohortTone(
  row:
    MetaV2CreativeAgeingMonthRow
): DataTableTone {
  if (
    row.newCreatives > 0 &&
    row.newMetrics.roas >=
      row.oldMetrics.roas
  ) {
    return "positive";
  }

  if (
    row.newSpendShare >
      0.5 &&
    row.newMetrics.roas <
      row.oldMetrics.roas
  ) {
    return "negative";
  }

  return "warning";
}

function ageingTone(
  row:
    MetaV2CreativeAgeBucketRow
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

export function CreativeAgeingModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const [view, setView] =
    useState<CreativeAgeingView>(
      "cohorts"
    );

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
      buildMetaV2CreativeAgeing(
        cleanRows
      ),
    [cleanRows]
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
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      output.monthlyRows,
      search,
    ]);

  const filteredAgeRows =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return output.ageRows;
      }

      return output.ageRows.filter(
        (row) =>
          [
            row.key,
            row.bucket,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      output.ageRows,
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

  const sortedAgeRows =
    useMemo(
      () =>
        filteredAgeRows
          .slice()
          .sort(
            (left, right) => {
              const leftValue =
                ageingSortValue(
                  left,
                  sort.key
                );

              const rightValue =
                ageingSortValue(
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
        filteredAgeRows,
        sort,
      ]
    );

  const activeRows =
    view === "cohorts"
      ? sortedMonthlyRows
      : sortedAgeRows;

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

  const visibleAgeRows =
    sortedAgeRows.slice(
      (safePage - 1) *
        pageSize,
      safePage * pageSize
    );

  useEffect(() => {
    setPage(1);

    setSort(
      view === "cohorts"
        ? {
            key: "month",
            direction: "desc",
          }
        : {
            key: "bucket",
            direction: "asc",
          }
    );
  }, [
    view,
    search,
  ]);

  const monthlyColumns =
    useMemo<
      DataTableColumn<MetaV2CreativeAgeingMonthRow>[]
    >(
      () => [
        {
          id: "month",
          header: "Month",
          minWidth: 126,
          sticky: "left",
          sortable: true,
          cell: (row) => (
            <div className="mos-entity-cell">
              <strong className="mos-entity-title">
                {row.label}
              </strong>

              <span className="mos-entity-subtitle">
                {row.month}
              </span>
            </div>
          ),
        },
        {
          id: "newCreatives",
          header: "New",
          align: "right",
          numeric: true,
          minWidth: 78,
          sortable: true,
          cell: (row) =>
            formatNumberCompact(
              row.newCreatives
            ),
        },
        {
          id: "oldCreatives",
          header: "Old Active",
          align: "right",
          numeric: true,
          minWidth: 92,
          sortable: true,
          cell: (row) =>
            formatNumberCompact(
              row.oldCreatives
            ),
        },
        {
          id: "newSpendShare",
          header: "New Spend Share",
          align: "right",
          numeric: true,
          minWidth: 128,
          sortable: true,
          cell: (row) =>
            formatPct(
              row.newSpendShare *
                100,
              1
            ),
          tone: (row) =>
            row.newSpendShare >=
              0.3
              ? "positive"
              : "warning",
        },
        {
          id: "newSpend",
          header: "New Spend",
          align: "right",
          numeric: true,
          minWidth: 108,
          sortable: true,
          cell: (row) =>
            formatINRCompact(
              row.newMetrics.spend
            ),
        },
        {
          id: "newCpa",
          header: "New CPA",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (row) =>
            row.newMetrics
              .purchases > 0
              ? formatINRCompact(
                  row.newMetrics.cpa
                )
              : "No sale",
        },
        {
          id: "newRoas",
          header: "New ROAS",
          align: "right",
          numeric: true,
          minWidth: 96,
          sortable: true,
          cell: (row) =>
            `${formatRoas(
              row.newMetrics.roas
            )}x`,
          tone: (row) =>
            row.newMetrics.roas >=
              row.oldMetrics.roas
              ? "positive"
              : "negative",
        },
        {
          id: "oldSpend",
          header: "Old Spend",
          align: "right",
          numeric: true,
          minWidth: 108,
          sortable: true,
          cell: (row) =>
            formatINRCompact(
              row.oldMetrics.spend
            ),
        },
        {
          id: "oldCpa",
          header: "Old CPA",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (row) =>
            row.oldMetrics
              .purchases > 0
              ? formatINRCompact(
                  row.oldMetrics.cpa
                )
              : "No sale",
        },
        {
          id: "oldRoas",
          header: "Old ROAS",
          align: "right",
          numeric: true,
          minWidth: 96,
          sortable: true,
          cell: (row) =>
            `${formatRoas(
              row.oldMetrics.roas
            )}x`,
        },
      ],
      []
    );

  const ageingColumns =
    useMemo<
      DataTableColumn<MetaV2CreativeAgeBucketRow>[]
    >(
      () => [
        {
          id: "bucket",
          header: "Creative Age",
          minWidth: 144,
          sticky: "left",
          sortable: true,
          cell: (row) => (
            <div className="mos-entity-cell">
              <strong className="mos-entity-title">
                {row.bucket}
              </strong>

              <span className="mos-entity-subtitle">
                Latest 30-day contribution
              </span>
            </div>
          ),
        },
        {
          id: "creativeCount",
          header: "Creatives",
          align: "right",
          numeric: true,
          minWidth: 92,
          sortable: true,
          cell: (row) =>
            formatNumberCompact(
              row.creativeCount
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
            row.metrics
              .purchases > 0
              ? formatINRCompact(
                  row.metrics.cpa
                )
              : "No sale",
          tone: (row) =>
            row.metrics
              .purchases > 0
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
          id: "ctr",
          header: "CTR",
          align: "right",
          numeric: true,
          minWidth: 84,
          sortable: true,
          cell: (row) =>
            formatPct(
              row.metrics.ctr,
              2
            ),
        },
        {
          id: "frequency",
          header: "Frequency",
          align: "right",
          numeric: true,
          minWidth: 94,
          sortable: true,
          cell: (row) =>
            row.metrics.frequency.toFixed(
              2
            ),
          tone: (row) =>
            row.metrics.frequency >
              3
              ? "negative"
              : "neutral",
        },
      ],
      []
    );

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="Creative Ageing is ready"
        description="Refresh Meta data to activate creative cohorts and age-bucket economics."
      />
    );
  }

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Creative lifecycle"
        title="Creative Ageing"
        description="First-seen cohorts, new-versus-old economics and the latest 30-day creative-age distribution."
        meta={
          <>
            <Badge>
              Latest{" "}
              {formatDate(
                output.latestDate
              )}
            </Badge>

            <Badge>
              Latest 30D starts{" "}
              {formatDate(
                output.latest30StartDate
              )}
            </Badge>

            <Badge>
              11 protected age buckets
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Total Creatives"
          value={
            output.totalCreatives
          }
          icon={
            <Sparkles />
          }
        />

        <MetricCard
          label="Cohort Months"
          value={
            output.totalFirstSeenMonths
          }
          icon={
            <CalendarDays />
          }
        />

        <MetricCard
          label="Total Spend"
          value={formatINRCompact(
            output.totals.spend
          )}
        />

        <MetricCard
          label="Total Purchases"
          value={formatNumberCompact(
            output.totals.purchases
          )}
        />

        <MetricCard
          label="Account CPA"
          value={
            output.totals
              .purchases > 0
              ? formatINRCompact(
                  output.totals.cpa
                )
              : "No sale"
          }
        />

        <MetricCard
          label="Account ROAS"
          value={`${formatRoas(
            output.totals.roas
          )}x`}
          tone={
            output.totals.roas >=
              1
              ? "positive"
              : "negative"
          }
          icon={
            <History />
          }
        />
      </div>

      <div className="mos-analysis-chart-grid">
        <CreativeCohortChart
          rows={output.chartMonths}
        />

        <CreativeAgeBucketChart
          rows={output.ageRows}
        />
      </div>

      <TableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder:
            view === "cohorts"
              ? "Search month"
              : "Search age bucket",
          ariaLabel:
            "Search creative ageing",
        }}
        filters={
          <SegmentedControl
            value={view}
            onChange={setView}
            ariaLabel="Creative ageing view"
            options={[
              {
                value:
                  "cohorts",
                label:
                  "Monthly Cohorts",
              },
              {
                value:
                  "age_buckets",
                label:
                  "Age Buckets",
              },
            ]}
          />
        }
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

      {view === "cohorts" ? (
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
          ariaLabel="Creative cohort table"
          caption="Monthly new and old creative economics"
          density={density}
          sort={sort}
          onSortChange={
            setSort
          }
          rowTone={
            cohortTone
          }
          emptyTitle="No cohort rows found"
          emptyDescription="Clear the search or refresh Meta data."
        />
      ) : (
        <DataTable
          rows={visibleAgeRows}
          columns={
            ageingColumns
          }
          getRowId={(row) =>
            row.key
          }
          ariaLabel="Creative age-bucket table"
          caption="Latest 30-day creative age distribution"
          density={density}
          sort={sort}
          onSortChange={
            setSort
          }
          rowTone={
            ageingTone
          }
          emptyTitle="No age-bucket rows found"
          emptyDescription="Clear the search or refresh Meta data."
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
