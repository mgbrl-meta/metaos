"use client";

import {
  Copy,
  ShieldAlert,
  TrendingDown,
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
  copyUniqueLines,
} from "@/components/metaos-ui/modules/EconomicControlShared";

import {
  buildMetaV2HighCpaControl,
  type MetaV2HighCpaItem,
  type MetaV2HighCpaState,
} from "@/lib/meta-v2/engines/highCpaEngine";

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

type HighCpaFilter =
  | "all"
  | MetaV2HighCpaState;

function stateLabel(
  state: MetaV2HighCpaState
): string {
  if (state === "persistent") {
    return "Still High CPA";
  }

  if (state === "improving") {
    return "Improving";
  }

  if (
    state ===
    "no_recent_purchase"
  ) {
    return "No L7D Purchase";
  }

  return "Threshold Match";
}

function stateTone(
  state: MetaV2HighCpaState
) {
  if (state === "persistent") {
    return "negative" as const;
  }

  if (state === "improving") {
    return "positive" as const;
  }

  if (
    state ===
    "no_recent_purchase"
  ) {
    return "warning" as const;
  }

  return "neutral" as const;
}


function cardStateTone(
  state: MetaV2HighCpaState
):
  | "positive"
  | "negative"
  | "warning"
  | undefined {
  if (state === "persistent") {
    return "negative";
  }

  if (state === "improving") {
    return "positive";
  }

  if (
    state ===
    "no_recent_purchase"
  ) {
    return "warning";
  }

  /**
   * Card does not expose a neutral tone.
   * Undefined keeps the canonical default card surface.
   */
  return undefined;
}

function rowTone(
  item: MetaV2HighCpaItem
): DataTableTone {
  if (
    item.state ===
    "persistent"
  ) {
    return "negative";
  }

  if (
    item.state ===
    "no_recent_purchase"
  ) {
    return "warning";
  }

  if (
    item.state ===
    "improving"
  ) {
    return "positive";
  }

  return "neutral";
}

function sortValue(
  item: MetaV2HighCpaItem,
  key: string
): string | number {
  switch (key) {
    case "ad":
      return item.adName;

    case "state":
      return item.state ===
        "persistent"
        ? 4
        : item.state ===
            "no_recent_purchase"
          ? 3
          : item.state ===
              "threshold_match"
            ? 2
            : 1;

    case "lifetimeCpa":
      return item.lifetime.cpa;

    case "last7Cpa":
      return item.last7.cpa;

    case "latestSpend":
      return item.yesterday.spend;

    case "lifetimeSpend":
      return item.lifetime.spend;

    case "purchases":
      return item.lifetime.purchases;

    case "roas":
      return item.lifetime.roas;

    default:
      return item.lifetime.cpa;
  }
}

function HighCpaDetail({
  item,
}: {
  item: MetaV2HighCpaItem;
}) {
  return (
    <div className="mos-economic-detail">
      <div className="mos-economic-detail-grid">
        <Card
          density="compact"
          tone={cardStateTone(
            item.state
          )}
        >
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Why It Is Here
              </CardTitle>

              <CardDescription>
                {item.reason}
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <Badge
              tone={stateTone(
                item.state
              )}
            >
              {stateLabel(
                item.state
              )}
            </Badge>
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
                Economic Windows
              </CardTitle>

              <CardDescription>
                Lifetime, last-seven-day, and latest-day evidence.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-economic-window-grid">
              <MetricCard
                compact
                label="Lifetime CPA"
                value={formatINRCompact(
                  item.lifetime.cpa
                )}
                tone="negative"
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
                  item.last7
                    .purchases > 0
                    ? item.state ===
                      "improving"
                      ? "positive"
                      : "negative"
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
                label="L7D Spend"
                value={formatINRCompact(
                  item.last7.spend
                )}
              />

              <MetricCard
                compact
                label="Lifetime ROAS"
                value={`${formatRoas(
                  item.lifetime.roas
                )}x`}
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
        focus="cpa"
      />
    </div>
  );
}

export function HighCpaModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const [threshold, setThreshold] =
    useState(3000);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<HighCpaFilter>(
      "all"
    );

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [sort, setSort] =
    useState<DataTableSortState>({
      key: "lifetimeCpa",
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

  const [
    clipboardStatus,
    setClipboardStatus,
  ] =
    useState("");

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
      buildMetaV2HighCpaControl(
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
            item.state !== filter
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
            stateLabel(
              item.state
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
      DataTableColumn<MetaV2HighCpaItem>[]
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
          id: "state",
          header: "State",
          minWidth: 140,
          sortable: true,
          cell: (item) => (
            <Badge
              tone={stateTone(
                item.state
              )}
              dot
            >
              {stateLabel(
                item.state
              )}
            </Badge>
          ),
        },
        {
          id: "lifetimeCpa",
          header: "Lifetime CPA",
          align: "right",
          numeric: true,
          minWidth: 122,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.lifetime.cpa
            ),
          tone: () =>
            "negative",
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
            item.state ===
            "improving"
              ? "positive"
              : item.last7
                    .purchases > 0
                ? "negative"
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
          id: "lifetimeSpend",
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
          id: "roas",
          header: "ROAS",
          align: "right",
          numeric: true,
          minWidth: 84,
          sortable: true,
          cell: (item) =>
            `${formatRoas(
              item.lifetime
                .roas
            )}x`,
          tone: (item) =>
            item.lifetime
              .roas >= 1
              ? "positive"
              : "negative",
        },
        {
          id: "action",
          header: "Action",
          minWidth: 260,
          cell: (item) =>
            item.action,
        },
      ],
      []
    );

  async function copyPersistentQueue() {
    try {
      const count =
        await copyUniqueLines(
          output.persistentItems.map(
            (item) =>
              `${item.adName} — ${item.action}`
          )
        );

      setClipboardStatus(
        `${count} actions copied`
      );
    } catch {
      setClipboardStatus(
        "Clipboard failed"
      );
    }

    window.setTimeout(
      () =>
        setClipboardStatus(""),
      1800
    );
  }

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="High CPA Control is ready"
        description="Refresh Meta data to activate lifetime and recent CPA control."
      />
    );
  }

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Economic risk control"
        title="High CPA Control"
        description="Active ads with lifetime purchases and lifetime CPA at or above the selected threshold, split by recent performance state."
        actions={
          <>
            {clipboardStatus ? (
              <Badge
                tone={
                  clipboardStatus.includes(
                    "failed"
                  )
                    ? "negative"
                    : "positive"
                }
              >
                {clipboardStatus}
              </Badge>
            ) : null}

            <Button
              variant="secondary"
              size="sm"
              leadingIcon={
                <Copy />
              }
              disabled={
                output.persistentItems
                  .length === 0
              }
              onClick={
                copyPersistentQueue
              }
            >
              Copy Action Queue
            </Button>
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
              tone="negative"
            >
              Threshold{" "}
              {formatINRCompact(
                threshold
              )}
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Qualified Ads"
          value={
            output.items.length
          }
          tone={
            output.items.length
              ? "negative"
              : "positive"
          }
          icon={
            <ShieldAlert />
          }
        />

        <MetricCard
          label="Still High CPA"
          value={
            output.persistentItems
              .length
          }
          tone={
            output.persistentItems
              .length
              ? "negative"
              : "positive"
          }
          icon={
            <TrendingDown />
          }
        />

        <MetricCard
          label="Improving"
          value={
            output.improvingItems
              .length
          }
          tone={
            output.improvingItems
              .length
              ? "positive"
              : "neutral"
          }
          icon={
            <TrendingUp />
          }
        />

        <MetricCard
          label="No L7D Purchase"
          value={
            output.noRecentPurchaseItems
              .length
          }
          tone={
            output.noRecentPurchaseItems
              .length
              ? "warning"
              : "positive"
          }
        />

        <MetricCard
          label="Latest Spend"
          value={formatINRCompact(
            output.yesterdaySpend
          )}
          tone={
            output.yesterdaySpend >
            0
              ? "negative"
              : "positive"
          }
        />

        <MetricCard
          label="Blended CPA"
          value={
            output.totals
              .purchases > 0
              ? formatINRCompact(
                  output.totals.cpa
                )
              : "No sale"
          }
          tone="negative"
        />
      </div>

      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              CPA Threshold
            </CardTitle>

            <CardDescription>
              Overall qualification uses lifetime CPA at or above the threshold. Action states compare strict lifetime and L7D CPA performance.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-threshold-controls">
            <div className="mos-button-row">
              {[
                2000,
                3000,
                5000,
                10000,
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
                  {formatINRCompact(
                    value
                  )}
                </Button>
              ))}
            </div>

            <label className="mos-number-control">
              <span>
                Custom threshold
              </span>

              <input
                type="number"
                min={0}
                step={500}
                value={threshold}
                aria-label="Custom high CPA threshold"
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
            "Search ad, campaign, state, or action",
          ariaLabel:
            "Search High CPA ads",
        }}
        filters={
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            ariaLabel="High CPA state"
            options={[
              {
                value: "all",
                label: "All",
              },
              {
                value:
                  "persistent",
                label:
                  "Still High",
              },
              {
                value:
                  "improving",
                label:
                  "Improving",
              },
              {
                value:
                  "no_recent_purchase",
                label:
                  "No L7D Sale",
              },
              {
                value:
                  "threshold_match",
                label:
                  "At Threshold",
              },
            ]}
          />
        }
        summary={`${sortedItems.length.toLocaleString(
          "en-IN"
        )} ads`}
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
        ariaLabel="High CPA control queue"
        caption="Active ads above the selected lifetime CPA threshold"
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
          <HighCpaDetail
            item={item}
          />
        )}
        emptyTitle="No High CPA ads found"
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
              Qualified High CPA ads aggregated back to campaign level.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <EconomicCampaignTable
            rows={output.campaigns}
            mode="cpa"
          />
        </CardBody>
      </Card>
    </div>
  );
}
