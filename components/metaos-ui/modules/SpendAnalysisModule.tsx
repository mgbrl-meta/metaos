"use client";

import {
  CalendarRange,
  IndianRupee,
  TrendingUp,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardHeaderText,
  CardTitle,
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
  SpendConcentrationChart,
  SpendTrendChart,
} from "@/components/metaos-ui/modules/AnalysisLayerShared";

import type {
  MetaV2SpendPreset,
} from "@/lib/meta-v2/analysisLayerUtils";

import {
  buildMetaV2SpendAnalysis,
  type MetaV2SpendDimension,
  type MetaV2SpendDimensionRow,
} from "@/lib/meta-v2/engines/spendAnalysisEngine";

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

type SpendRangeMode =
  | "7"
  | "14"
  | "30"
  | "60"
  | "90"
  | "all"
  | "custom";

function getPreset(
  mode: SpendRangeMode
): MetaV2SpendPreset {
  if (mode === "all") {
    return "all";
  }

  if (mode === "custom") {
    return 30;
  }

  return Number(
    mode
  ) as MetaV2SpendPreset;
}

function getDimensionRows(
  dimension:
    MetaV2SpendDimension,
  output:
    ReturnType<
      typeof buildMetaV2SpendAnalysis
    >
): MetaV2SpendDimensionRow[] {
  if (dimension === "campaign") {
    return output.campaigns;
  }

  if (dimension === "adset") {
    return output.adSets;
  }

  return output.ads;
}

function getDimensionLabel(
  dimension:
    MetaV2SpendDimension
): string {
  if (dimension === "campaign") {
    return "Campaign";
  }

  if (dimension === "adset") {
    return "Ad Set";
  }

  return "Ad";
}

function sortValue(
  row: MetaV2SpendDimensionRow,
  key: string
): string | number {
  switch (key) {
    case "name":
      return row.name;

    case "spend":
      return row.totals.spend;

    case "spendShare":
      return row.spendShare;

    case "revenue":
      return row.totals.revenue;

    case "revenueShare":
      return row.revenueShare;

    case "purchases":
      return row.totals.purchases;

    case "cpa":
      return row.totals.cpa;

    case "roas":
      return row.totals.roas;

    case "ctr":
      return row.totals.ctr;

    default:
      return row.totals.spend;
  }
}

function spendRowTone(
  row: MetaV2SpendDimensionRow
): DataTableTone {
  if (
    row.totals.purchases <= 0 &&
    row.totals.spend > 0
  ) {
    return "negative";
  }

  if (row.totals.roas >= 1) {
    return "positive";
  }

  return "warning";
}

export function SpendAnalysisModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const [rangeMode, setRangeMode] =
    useState<SpendRangeMode>(
      "30"
    );

  const [
    customStartDate,
    setCustomStartDate,
  ] = useState("");

  const [
    customEndDate,
    setCustomEndDate,
  ] = useState("");

  const [
    dimension,
    setDimension,
  ] =
    useState<MetaV2SpendDimension>(
      "campaign"
    );

  const [search, setSearch] =
    useState("");

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [sort, setSort] =
    useState<DataTableSortState>({
      key: "spend",
      direction: "desc",
    });

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(50);

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
      buildMetaV2SpendAnalysis(
        cleanRows,
        {
          preset:
            getPreset(
              rangeMode
            ),

          customRange:
            rangeMode ===
            "custom"
              ? {
                  startDate:
                    customStartDate,
                  endDate:
                    customEndDate,
                }
              : undefined,
        }
      ),
    [
      cleanRows,
      rangeMode,
      customStartDate,
      customEndDate,
    ]
  );

  useEffect(() => {
    if (
      !customStartDate &&
      output.availableRange
        .startDate
    ) {
      setCustomStartDate(
        output.availableRange
          .startDate
      );
    }

    if (
      !customEndDate &&
      output.availableRange
        .endDate
    ) {
      setCustomEndDate(
        output.availableRange
          .endDate
      );
    }
  }, [
    customStartDate,
    customEndDate,
    output.availableRange
      .startDate,
    output.availableRange
      .endDate,
  ]);

  const dimensionRows =
    useMemo(
      () =>
        getDimensionRows(
          dimension,
          output
        ),
      [dimension, output]
    );

  const filteredRows =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return dimensionRows;
      }

      return dimensionRows.filter(
        (row) =>
          row.name
            .toLowerCase()
            .includes(query)
      );
    }, [
      dimensionRows,
      search,
    ]);

  const sortedRows =
    useMemo(
      () =>
        filteredRows
          .slice()
          .sort(
            (left, right) => {
              const leftValue =
                sortValue(
                  left,
                  sort.key
                );

              const rightValue =
                sortValue(
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
      [filteredRows, sort]
    );

  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedRows.length /
        pageSize
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const visibleRows =
    sortedRows.slice(
      (safePage - 1) *
        pageSize,
      safePage * pageSize
    );

  useEffect(() => {
    setPage(1);
  }, [
    rangeMode,
    customStartDate,
    customEndDate,
    dimension,
    search,
  ]);

  const columns =
    useMemo<
      DataTableColumn<MetaV2SpendDimensionRow>[]
    >(
      () => [
        {
          id: "name",
          header:
            getDimensionLabel(
              dimension
            ),
          minWidth: 320,
          sticky: "left",
          truncate: true,
          sortable: true,
          cell: (row) => (
            <div className="mos-entity-cell">
              <strong
                className="mos-entity-title"
                title={row.name}
              >
                {row.name}
              </strong>

              <span className="mos-entity-subtitle">
                {getDimensionLabel(
                  row.dimension
                )}{" "}
                spend allocation
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
              row.totals.spend
            ),
        },
        {
          id: "spendShare",
          header: "Spend Share",
          align: "right",
          numeric: true,
          minWidth: 112,
          sortable: true,
          cell: (row) =>
            formatPct(
              row.spendShare *
                100,
              1
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
              row.totals.revenue
            ),
        },
        {
          id: "revenueShare",
          header: "Revenue Share",
          align: "right",
          numeric: true,
          minWidth: 124,
          sortable: true,
          cell: (row) =>
            formatPct(
              row.revenueShare *
                100,
              1
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
          sortable: true,
          cell: (row) =>
            row.totals
              .purchases > 0
              ? formatINRCompact(
                  row.totals.cpa
                )
              : "No sale",
          tone: (row) =>
            row.totals
              .purchases > 0
              ? "neutral"
              : "negative",
        },
        {
          id: "roas",
          header: "ROAS",
          align: "right",
          numeric: true,
          minWidth: 84,
          sortable: true,
          cell: (row) =>
            `${formatRoas(
              row.totals.roas
            )}x`,
          tone: (row) =>
            row.totals.roas >= 1
              ? "positive"
              : "negative",
        },
        {
          id: "ctr",
          header: "CTR",
          align: "right",
          numeric: true,
          minWidth: 82,
          sortable: true,
          cell: (row) =>
            formatPct(
              row.totals.ctr,
              2
            ),
        },
      ],
      [dimension]
    );

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="Spend Analysis is ready"
        description="Refresh Meta data to activate live-ad spend allocation and period comparison."
      />
    );
  }

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Budget intelligence"
        title="Spend Analysis"
        description="Live-ad spend allocation, concentration and efficiency across campaigns, ad sets and ads."
        meta={
          <>
            <Badge>
              Available{" "}
              {formatDate(
                output.availableRange
                  .startDate
              )}{" "}
              to{" "}
              {formatDate(
                output.availableRange
                  .endDate
              )}
            </Badge>

            <Badge
              tone={
                output.isLive
                  ? "positive"
                  : "warning"
              }
            >
              {output.isLive
                ? "Live ads only"
                : "No live ads"}
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Spend"
          value={formatINRCompact(
            output.totals.spend
          )}
          icon={
            <IndianRupee />
          }
        />

        <MetricCard
          label="Revenue"
          value={formatINRCompact(
            output.totals.revenue
          )}
          tone="positive"
          icon={
            <TrendingUp />
          }
        />

        <MetricCard
          label="Purchases"
          value={formatNumberCompact(
            output.totals
              .purchases
          )}
        />

        <MetricCard
          label="CPA"
          value={
            output.totals
              .purchases > 0
              ? formatINRCompact(
                  output.totals.cpa
                )
              : "No sale"
          }
          tone={
            output.totals
              .purchases > 0
              ? "neutral"
              : "negative"
          }
        />

        <MetricCard
          label="ROAS"
          value={`${formatRoas(
            output.totals.roas
          )}x`}
          tone={
            output.totals.roas >=
            1
              ? "positive"
              : "negative"
          }
        />

        <MetricCard
          label="Selected Window"
          value={`${formatDate(
            output.selectedRange
              .startDate
          )} – ${formatDate(
            output.selectedRange
              .endDate
          )}`}
          icon={
            <CalendarRange />
          }
        />
      </div>

      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Analysis Window
            </CardTitle>

            <CardDescription>
              Preset and custom UTC-safe date windows over live-ad history.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-analysis-control-stack">
            <SegmentedControl
              value={rangeMode}
              onChange={
                setRangeMode
              }
              ariaLabel="Spend analysis date window"
              options={[
                {
                  value: "7",
                  label: "7D",
                },
                {
                  value: "14",
                  label: "14D",
                },
                {
                  value: "30",
                  label: "30D",
                },
                {
                  value: "60",
                  label: "60D",
                },
                {
                  value: "90",
                  label: "90D",
                },
                {
                  value: "all",
                  label: "All",
                },
                {
                  value: "custom",
                  label: "Custom",
                },
              ]}
            />

            {rangeMode ===
            "custom" ? (
              <div className="mos-analysis-date-controls">
                <label className="mos-analysis-date-control">
                  <span>
                    Start date
                  </span>

                  <input
                    type="date"
                    value={
                      customStartDate
                    }
                    min={
                      output.availableRange
                        .startDate
                    }
                    max={
                      customEndDate ||
                      output.availableRange
                        .endDate
                    }
                    onChange={(
                      event
                    ) =>
                      setCustomStartDate(
                        event.target
                          .value
                      )
                    }
                  />
                </label>

                <label className="mos-analysis-date-control">
                  <span>
                    End date
                  </span>

                  <input
                    type="date"
                    value={
                      customEndDate
                    }
                    min={
                      customStartDate ||
                      output.availableRange
                        .startDate
                    }
                    max={
                      output.availableRange
                        .endDate
                    }
                    onChange={(
                      event
                    ) =>
                      setCustomEndDate(
                        event.target
                          .value
                      )
                    }
                  />
                </label>
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <SpendTrendChart
        rows={output.daily}
      />

      <div className="mos-analysis-comparison-grid">
        {output.periodComparisons.map(
          (comparison) => (
            <Card
              key={
                comparison.period
              }
              density="compact"
            >
              <CardHeader>
                <CardHeaderText>
                  <CardTitle>
                    {
                      comparison.period
                    }
                  </CardTitle>

                  <CardDescription>
                    Versus the immediately preceding equal period.
                  </CardDescription>
                </CardHeaderText>
              </CardHeader>

              <CardBody>
                <div className="mos-analysis-comparison-metrics">
                  <MetricCard
                    compact
                    label="Spend Change"
                    value={formatPct(
                      comparison
                        .movement
                        .spend
                        .relative *
                        100,
                      1
                    )}
                    tone={
                      comparison
                        .movement
                        .spend
                        .absolute >
                      0
                        ? "warning"
                        : "neutral"
                    }
                  />

                  <MetricCard
                    compact
                    label="Revenue Change"
                    value={formatPct(
                      comparison
                        .movement
                        .revenue
                        .relative *
                        100,
                      1
                    )}
                    tone={
                      comparison
                        .movement
                        .revenue
                        .absolute >=
                      0
                        ? "positive"
                        : "negative"
                    }
                  />

                  <MetricCard
                    compact
                    label="ROAS Change"
                    value={formatPct(
                      comparison
                        .movement
                        .roas
                        .relative *
                        100,
                      1
                    )}
                    tone={
                      comparison
                        .movement
                        .roas
                        .absolute >=
                      0
                        ? "positive"
                        : "negative"
                    }
                  />

                  <MetricCard
                    compact
                    label="CPA Change"
                    value={formatPct(
                      comparison
                        .movement
                        .cpa
                        .relative *
                        100,
                      1
                    )}
                    tone={
                      comparison
                        .movement
                        .cpa
                        .absolute <=
                      0
                        ? "positive"
                        : "negative"
                    }
                  />
                </div>
              </CardBody>
            </Card>
          )
        )}
      </div>

      <div className="mos-analysis-chart-grid">
        <SpendConcentrationChart
          title="Campaign Concentration"
          description="Top eight campaigns by spend."
          rows={
            output.campaignChartRows
          }
        />

        <SpendConcentrationChart
          title="Ad Set Concentration"
          description="Top eight ad sets by spend."
          rows={
            output.adSetChartRows
          }
        />
      </div>

      <TableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder:
            "Search selected dimension",
          ariaLabel:
            "Search spend allocation",
        }}
        filters={
          <SegmentedControl
            value={dimension}
            onChange={
              setDimension
            }
            ariaLabel="Spend analysis dimension"
            options={[
              {
                value:
                  "campaign",
                label:
                  "Campaigns",
              },
              {
                value: "adset",
                label:
                  "Ad Sets",
              },
              {
                value: "ad",
                label: "Ads",
              },
            ]}
          />
        }
        summary={`${sortedRows.length.toLocaleString(
          "en-IN"
        )} ${getDimensionLabel(
          dimension
        ).toLowerCase()} rows`}
        actions={
          <TableDensityControl
            value={density}
            onChange={
              setDensity
            }
          />
        }
      />

      <DataTable
        rows={visibleRows}
        columns={columns}
        getRowId={(row) =>
          row.id
        }
        ariaLabel="Spend allocation table"
        caption="Spend and revenue allocation across the selected dimension"
        density={density}
        sort={sort}
        onSortChange={
          setSort
        }
        rowTone={
          spendRowTone
        }
        emptyTitle="No spend rows found"
        emptyDescription="Clear search or select another date window."
      />

      <TablePagination
        page={safePage}
        pageSize={pageSize}
        totalRows={
          sortedRows.length
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
