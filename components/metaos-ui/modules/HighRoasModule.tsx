"use client";

import {
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  EconomicCampaignTable,
  EconomicTrendChart,
} from "@/components/metaos-ui/modules/EconomicControlShared";

import {
  buildMetaV2HighRoasControl,
  type MetaV2HighRoasItem,
  type MetaV2HighRoasProtection,
} from "@/lib/meta-v2/engines/highRoasEngine";

import {
  formatDate,
  formatINRCompact,
  formatNumberCompact,
  formatRoas,
} from "@/lib/meta-v2/formatters";

import {
  normalizeMetaV2Rows,
} from "@/lib/meta-v2/normalize";

import {
  useMetaStore,
} from "@/store/metaStore";

type ProtectionFilter =
  | "all"
  | MetaV2HighRoasProtection;

function protectionLabel(
  protection:
    MetaV2HighRoasProtection
): string {
  if (
    protection ===
    "protected"
  ) {
    return "Protected Winner";
  }

  if (
    protection ===
    "insufficient_recent_purchases"
  ) {
    return "Needs Evidence";
  }

  return "Watch";
}

function protectionTone(
  protection:
    MetaV2HighRoasProtection
) {
  if (
    protection ===
    "protected"
  ) {
    return "positive" as const;
  }

  return "warning" as const;
}

function rowTone(
  item: MetaV2HighRoasItem
): DataTableTone {
  if (
    item.protection ===
    "protected"
  ) {
    return "positive";
  }

  return "warning";
}

function sortValue(
  item: MetaV2HighRoasItem,
  key: string
): string | number {
  switch (key) {
    case "ad":
      return item.adName;

    case "protection":
      return item.protection ===
        "protected"
        ? 3
        : item.protection ===
            "watch"
          ? 2
          : 1;

    case "roas":
      return item.lifetime.roas;

    case "last7Roas":
      return item.last7.roas;

    case "cpa":
      return item.lifetime.cpa;

    case "last7Cpa":
      return item.last7.cpa;

    case "latestSpend":
      return item.yesterday.spend;

    case "spend":
      return item.lifetime.spend;

    case "purchases":
      return item.lifetime.purchases;

    default:
      return item.lifetime.roas;
  }
}

function HighRoasDetail({
  item,
}: {
  item: MetaV2HighRoasItem;
}) {
  return (
    <div className="mos-economic-detail">
      <div className="mos-economic-detail-grid">
        <Card
          density="compact"
          tone={protectionTone(
            item.protection
          )}
        >
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Winner Protection
              </CardTitle>

              <CardDescription>
                {item.reason}
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-badge-stack">
              <Badge
                tone={protectionTone(
                  item.protection
                )}
              >
                {protectionLabel(
                  item.protection
                )}
              </Badge>

              <Badge
                tone={
                  item.recentCpaHealthy
                    ? "positive"
                    : "warning"
                }
              >
                Recent CPA{" "}
                {item.recentCpaHealthy
                  ? "healthy"
                  : "weaker"}
              </Badge>

              <Badge
                tone={
                  item.recentRoasHealthy
                    ? "positive"
                    : "warning"
                }
              >
                Recent ROAS{" "}
                {item.recentRoasHealthy
                  ? "healthy"
                  : "weaker"}
              </Badge>
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
                {item.action}
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-detail-list">
              <span>
                Campaign:{" "}
                <strong>
                  {item.campaignName}
                </strong>
              </span>

              <span>
                Ad Set:{" "}
                <strong>
                  {item.adSetName}
                </strong>
              </span>
            </div>
          </CardBody>
        </Card>

        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Protection Windows
              </CardTitle>

              <CardDescription>
                Lifetime winner quality versus the most recent seven days.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-economic-window-grid">
              <MetricCard
                compact
                label="Lifetime ROAS"
                value={`${formatRoas(
                  item.lifetime.roas
                )}x`}
                tone="positive"
              />

              <MetricCard
                compact
                label="L7D ROAS"
                value={`${formatRoas(
                  item.last7.roas
                )}x`}
                tone={
                  item.recentRoasHealthy
                    ? "positive"
                    : "warning"
                }
              />

              <MetricCard
                compact
                label="Lifetime CPA"
                value={formatINRCompact(
                  item.lifetime.cpa
                )}
              />

              <MetricCard
                compact
                label="L7D CPA"
                value={
                  item.last7
                    .purchases > 0
                    ? formatINRCompact(
                        item.last7.cpa
                      )
                    : "No sale"
                }
                tone={
                  item.recentCpaHealthy
                    ? "positive"
                    : "warning"
                }
              />

              <MetricCard
                compact
                label="Latest Spend"
                value={formatINRCompact(
                  item.yesterday.spend
                )}
              />

              <MetricCard
                compact
                label="L7D Purchases"
                value={formatNumberCompact(
                  item.last7
                    .purchases
                )}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <EconomicTrendChart
        rows={item.trend}
        focus="roas"
      />
    </div>
  );
}

export function HighRoasModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const [threshold, setThreshold] =
    useState(1.2);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<ProtectionFilter>(
      "all"
    );

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [sort, setSort] =
    useState<DataTableSortState>({
      key: "roas",
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
      buildMetaV2HighRoasControl(
        cleanRows,
        threshold
      ),
    [cleanRows, threshold]
  );

  const filteredItems =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return output.items.filter(
        (item) => {
          if (
            filter !== "all" &&
            item.protection !==
              filter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            item.adName,
            item.campaignName,
            item.adSetName,
            item.reason,
            item.action,
            protectionLabel(
              item.protection
            ),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      output.items,
      filter,
      search,
    ]);

  const sortedItems =
    useMemo(
      () =>
        filteredItems
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
      [filteredItems, sort]
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
  }, [
    threshold,
    filter,
    search,
  ]);

  const columns =
    useMemo<
      DataTableColumn<MetaV2HighRoasItem>[]
    >(
      () => [
        {
          id: "ad",
          header: "Ad",
          minWidth: 330,
          sticky: "left",
          truncate: true,
          sortable: true,
          cell: (item) => (
            <div className="mos-entity-cell">
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
          id: "protection",
          header: "Protection",
          minWidth: 145,
          sortable: true,
          cell: (item) => (
            <Badge
              tone={protectionTone(
                item.protection
              )}
              dot
            >
              {protectionLabel(
                item.protection
              )}
            </Badge>
          ),
        },
        {
          id: "roas",
          header: "Lifetime ROAS",
          align: "right",
          numeric: true,
          minWidth: 126,
          sortable: true,
          cell: (item) =>
            `${formatRoas(
              item.lifetime.roas
            )}x`,
          tone: () =>
            "positive",
        },
        {
          id: "last7Roas",
          header: "L7D ROAS",
          align: "right",
          numeric: true,
          minWidth: 108,
          sortable: true,
          cell: (item) =>
            `${formatRoas(
              item.last7.roas
            )}x`,
          tone: (item) =>
            item.recentRoasHealthy
              ? "positive"
              : "warning",
        },
        {
          id: "cpa",
          header: "Lifetime CPA",
          align: "right",
          numeric: true,
          minWidth: 122,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.lifetime.cpa
            ),
        },
        {
          id: "last7Cpa",
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
            item.recentCpaHealthy
              ? "positive"
              : "warning",
        },
        {
          id: "latestSpend",
          header: "Latest Spend",
          align: "right",
          numeric: true,
          minWidth: 118,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.yesterday
                .spend
            ),
        },
        {
          id: "spend",
          header: "Lifetime Spend",
          align: "right",
          numeric: true,
          minWidth: 128,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.lifetime
                .spend
            ),
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
              item.lifetime
                .purchases
            ),
        },
        {
          id: "action",
          header: "Action",
          minWidth: 280,
          cell: (item) =>
            item.action,
        },
      ],
      []
    );

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="High ROAS Control is ready"
        description="Refresh Meta data to activate winner protection and scale-readiness control."
      />
    );
  }

  const protectedCount =
    output.items.filter(
      (item) =>
        item.protection ===
        "protected"
    ).length;

  const watchCount =
    output.items.filter(
      (item) =>
        item.protection !==
        "protected"
    ).length;

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Winner protection"
        title="High ROAS Control"
        description="Active ads with lifetime purchases and lifetime ROAS at or above the selected threshold, assessed against recent CPA and ROAS health."
        actions={
          <>
            <Badge
              tone="positive"
            >
              {protectedCount}{" "}
              protected winners
            </Badge>

            <Badge
              tone={
                watchCount
                  ? "warning"
                  : "positive"
              }
            >
              {watchCount}{" "}
              watch items
            </Badge>
          </>
        }
        meta={
          <>
            <Badge>
              Latest{" "}
              {formatDate(
                output.latestDate
              )}
            </Badge>

            <Badge
              tone="positive"
            >
              Threshold{" "}
              {formatRoas(
                threshold
              )}
              x
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Qualified Winners"
          value={
            output.items.length
          }
          tone={
            output.items.length
              ? "positive"
              : "neutral"
          }
          icon={
            <TrendingUp />
          }
        />

        <MetricCard
          label="Protected"
          value={
            protectedCount
          }
          tone={
            protectedCount
              ? "positive"
              : "neutral"
          }
          icon={
            <ShieldCheck />
          }
        />

        <MetricCard
          label="Watch"
          value={
            watchCount
          }
          tone={
            watchCount
              ? "warning"
              : "positive"
          }
        />

        <MetricCard
          label="Latest Spend"
          value={formatINRCompact(
            output.yesterdaySpend
          )}
        />

        <MetricCard
          label="Winner Spend"
          value={formatINRCompact(
            output.totals.spend
          )}
        />

        <MetricCard
          label="Blended ROAS"
          value={`${formatRoas(
            output.blendedRoas
          )}x`}
          tone="positive"
        />
      </div>

      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              ROAS Threshold
            </CardTitle>

            <CardDescription>
              Qualify lifetime winners first, then protect only those with recent purchase evidence and healthy recent CPA and ROAS.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-threshold-controls">
            <div className="mos-button-row">
              {[
                1,
                1.2,
                1.5,
                2,
              ].map((value) => (
                <Button
                  key={value}
                  size="xs"
                  variant={
                    threshold ===
                    value
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    setThreshold(
                      value
                    )
                  }
                >
                  {formatRoas(
                    value
                  )}
                  x
                </Button>
              ))}
            </div>

            <label className="mos-number-control">
              <span>
                Custom ROAS
              </span>

              <input
                type="number"
                min={0}
                step={0.1}
                value={threshold}
                aria-label="Custom High ROAS threshold"
                onChange={(event) =>
                  setThreshold(
                    Math.max(
                      0,
                      Number(
                        event
                          .target
                          .value || 0
                      )
                    )
                  )
                }
              />
            </label>
          </div>
        </CardBody>
      </Card>

      <TableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder:
            "Search winner, campaign, protection, or action",
          ariaLabel:
            "Search High ROAS ads",
        }}
        filters={
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            ariaLabel="High ROAS protection state"
            options={[
              {
                value: "all",
                label: "All",
              },
              {
                value:
                  "protected",
                label:
                  "Protected",
              },
              {
                value: "watch",
                label: "Watch",
              },
              {
                value:
                  "insufficient_recent_purchases",
                label:
                  "Needs Evidence",
              },
            ]}
          />
        }
        summary={`${sortedItems.length.toLocaleString(
          "en-IN"
        )} winners`}
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
        rows={visibleItems}
        columns={columns}
        getRowId={(item) =>
          item.id
        }
        ariaLabel="High ROAS winner protection queue"
        caption="Active lifetime ROAS winners and recent protection state"
        density={density}
        sort={sort}
        onSortChange={
          setSort
        }
        rowTone={rowTone}
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
          <HighRoasDetail
            item={item}
          />
        )}
        emptyTitle="No High ROAS winners found"
        emptyDescription="Lower the threshold, clear the filters, or refresh Meta data."
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

      <Card>
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Campaign Rollup
            </CardTitle>

            <CardDescription>
              Qualified High ROAS winners aggregated back to campaign level.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <EconomicCampaignTable
            rows={output.campaigns}
            mode="roas"
          />
        </CardBody>
      </Card>
    </div>
  );
}
