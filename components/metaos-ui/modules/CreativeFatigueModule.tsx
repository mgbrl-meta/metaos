"use client";

import {
  Copy,
  RefreshCw,
  ShieldAlert,
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
  copyUniqueLines,
} from "@/components/metaos-ui/modules/EconomicControlShared";

import {
  buildMetaV2CreativeFatigue,
  type MetaV2CreativeFatigueItem,
} from "@/lib/meta-v2/engines/creativeFatigueEngine";

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

type CreativeFilter =
  | "all"
  | "fatigued"
  | "refresh_priority"
  | "watch"
  | "healthy";

function riskLabel(
  item:
    MetaV2CreativeFatigueItem
): string {
  if (
    item.risk ===
    "refresh_priority"
  ) {
    return "Refresh Priority";
  }

  if (item.risk === "watch") {
    return "Watch";
  }

  return "Healthy";
}

function riskTone(
  item:
    MetaV2CreativeFatigueItem
) {
  if (
    item.risk ===
    "refresh_priority"
  ) {
    return "negative" as const;
  }

  if (item.risk === "watch") {
    return "warning" as const;
  }

  return "positive" as const;
}

function creativeRowTone(
  item:
    MetaV2CreativeFatigueItem
): DataTableTone {
  if (
    item.risk ===
    "refresh_priority"
  ) {
    return "negative";
  }

  if (item.risk === "watch") {
    return "warning";
  }

  return "positive";
}

function sortValue(
  item:
    MetaV2CreativeFatigueItem,
  key: string
): string | number {
  switch (key) {
    case "ad":
      return item.adName;

    case "risk":
      return item.signalCount;

    case "spend":
      return item.current.spend;

    case "latestSpend":
      return item.yesterday.spend;

    case "signals":
      return item.signalCount;

    case "cpmChange":
      return item.cpmChange;

    case "ctrChange":
      return item.ctrChange;

    case "thumbstop":
      return item.current
        .thumbstop;

    case "frequency":
      return item.current
        .frequency;

    case "cpa":
      return item.current.cpa;

    case "roas":
      return item.current.roas;

    default:
      return item.signalCount;
  }
}

function CreativeFatigueDetail({
  item,
}: {
  item:
    MetaV2CreativeFatigueItem;
}) {
  return (
    <div className="mos-analysis-detail">
      <div className="mos-analysis-detail-grid">
        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Fatigue Signals
              </CardTitle>

              <CardDescription>
                Signals triggered during the current seven-day window.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-badge-stack">
              {item.signals.length ? (
                item.signals.map(
                  (signal) => (
                    <Badge
                      key={signal}
                      tone="negative"
                    >
                      {signal}
                    </Badge>
                  )
                )
              ) : (
                <Badge tone="positive">
                  No fatigue signals
                </Badge>
              )}
            </div>
          </CardBody>
        </Card>

        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Current 7D
              </CardTitle>

              <CardDescription>
                Latest inclusive seven-day performance.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-analysis-mini-grid">
              <MetricCard
                compact
                label="Spend"
                value={formatINRCompact(
                  item.current.spend
                )}
              />

              <MetricCard
                compact
                label="CPA"
                value={
                  item.current
                    .purchases > 0
                    ? formatINRCompact(
                        item.current.cpa
                      )
                    : "No sale"
                }
              />

              <MetricCard
                compact
                label="ROAS"
                value={`${formatRoas(
                  item.current.roas
                )}x`}
              />

              <MetricCard
                compact
                label="Frequency"
                value={
                  item.current
                    .frequency.toFixed(
                      2
                    )
                }
              />
            </div>
          </CardBody>
        </Card>

        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Previous 7D
              </CardTitle>

              <CardDescription>
                Baseline used for CPM and CTR deterioration.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-analysis-mini-grid">
              <MetricCard
                compact
                label="CPM"
                value={formatINRCompact(
                  item.previous.cpm
                )}
              />

              <MetricCard
                compact
                label="CTR"
                value={formatPct(
                  item.previous.ctr,
                  2
                )}
              />

              <MetricCard
                compact
                label="Spend"
                value={formatINRCompact(
                  item.previous.spend
                )}
              />

              <MetricCard
                compact
                label="Purchases"
                value={formatNumberCompact(
                  item.previous
                    .purchases
                )}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export function CreativeFatigueModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const [
    minSignals,
    setMinSignals,
  ] = useState("2");

  const [filter, setFilter] =
    useState<CreativeFilter>(
      "fatigued"
    );

  const [search, setSearch] =
    useState("");

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [sort, setSort] =
    useState<DataTableSortState>({
      key: "signals",
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
  ] = useState("");

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
      buildMetaV2CreativeFatigue(
        cleanRows,
        Number(minSignals)
      ),
    [cleanRows, minSignals]
  );

  const filteredItems =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return output.items.filter(
        (item) => {
          if (
            filter ===
              "fatigued" &&
            item.signalCount <
              output.minSignals
          ) {
            return false;
          }

          if (
            filter !== "all" &&
            filter !==
              "fatigued" &&
            item.risk !== filter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            item.adName,
            item.handle,
            item.campaignName,
            item.adSetName,
            ...item.signals,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      output.items,
      output.minSignals,
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
    minSignals,
    filter,
    search,
  ]);

  const columns =
    useMemo<
      DataTableColumn<MetaV2CreativeFatigueItem>[]
    >(
      () => [
        {
          id: "ad",
          header: "Creative",
          minWidth: 340,
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
          id: "risk",
          header: "Risk",
          minWidth: 146,
          sortable: true,
          cell: (item) => (
            <Badge
              tone={
                riskTone(item)
              }
              dot
            >
              {riskLabel(item)}
            </Badge>
          ),
        },
        {
          id: "signals",
          header: "Signals",
          align: "right",
          numeric: true,
          minWidth: 86,
          sortable: true,
          cell: (item) =>
            `${item.signalCount}/4`,
          tone: (item) =>
            item.signalCount >= 3
              ? "negative"
              : item.signalCount > 0
                ? "warning"
                : "positive",
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
          header: "Current 7D Spend",
          align: "right",
          numeric: true,
          minWidth: 134,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.current.spend
            ),
        },
        {
          id: "cpmChange",
          header: "CPM Change",
          align: "right",
          numeric: true,
          minWidth: 112,
          sortable: true,
          cell: (item) =>
            formatPct(
              item.cpmChange,
              1
            ),
          tone: (item) =>
            item.cpmFatigue
              ? "negative"
              : "neutral",
        },
        {
          id: "ctrChange",
          header: "CTR Change",
          align: "right",
          numeric: true,
          minWidth: 112,
          sortable: true,
          cell: (item) =>
            formatPct(
              item.ctrChange,
              1
            ),
          tone: (item) =>
            item.ctrFatigue
              ? "negative"
              : "neutral",
        },
        {
          id: "thumbstop",
          header: "Thumbstop",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (item) =>
            formatPct(
              item.current
                .thumbstop,
              1
            ),
          tone: (item) =>
            item.thumbstopFatigue
              ? "negative"
              : "positive",
        },
        {
          id: "frequency",
          header: "Frequency",
          align: "right",
          numeric: true,
          minWidth: 92,
          sortable: true,
          cell: (item) =>
            item.current
              .frequency.toFixed(
                2
              ),
          tone: (item) =>
            item.frequencyFatigue
              ? "negative"
              : "positive",
        },
        {
          id: "cpa",
          header: "Current CPA",
          align: "right",
          numeric: true,
          minWidth: 112,
          sortable: true,
          cell: (item) =>
            item.current
              .purchases > 0
              ? formatINRCompact(
                  item.current.cpa
                )
              : "No sale",
        },
        {
          id: "roas",
          header: "Current ROAS",
          align: "right",
          numeric: true,
          minWidth: 114,
          sortable: true,
          cell: (item) =>
            `${formatRoas(
              item.current.roas
            )}x`,
        },
      ],
      []
    );

  async function copyHandles() {
    try {
      const count =
        await copyUniqueLines(
          output.fatigued.map(
            (item) =>
              item.handle
          )
        );

      setClipboardStatus(
        `${count} handles copied`
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

  async function copyFullNames() {
    try {
      const count =
        await copyUniqueLines(
          output.fatigued.map(
            (item) =>
              item.adName
          )
        );

      setClipboardStatus(
        `${count} names copied`
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
        title="Creative Analysis is ready"
        description="Refresh Meta data to activate four-signal creative fatigue monitoring."
      />
    );
  }

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Creative intelligence"
        title="Creative Fatigue"
        description="Active creatives assessed on CPM inflation, CTR decline, thumbstop weakness and frequency pressure."
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
              size="sm"
              variant="secondary"
              leadingIcon={
                <Copy />
              }
              disabled={
                output.fatigued
                  .length === 0
              }
              onClick={
                copyHandles
              }
            >
              Copy Handles
            </Button>

            <Button
              size="sm"
              variant="secondary"
              leadingIcon={
                <Copy />
              }
              disabled={
                output.fatigued
                  .length === 0
              }
              onClick={
                copyFullNames
              }
            >
              Copy Full Names
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

            <Badge>
              Current{" "}
              {formatDate(
                output.currentRange
                  .startDate
              )}{" "}
              to{" "}
              {formatDate(
                output.currentRange
                  .endDate
              )}
            </Badge>

            <Badge>
              Baseline{" "}
              {formatDate(
                output.previousRange
                  .startDate
              )}{" "}
              to{" "}
              {formatDate(
                output.previousRange
                  .endDate
              )}
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Fatigued Creatives"
          value={
            output.fatigued
              .length
          }
          tone={
            output.fatigued
              .length
              ? "negative"
              : "positive"
          }
          icon={
            <ShieldAlert />
          }
        />

        <MetricCard
          label="Refresh Priority"
          value={
            output.highRisk.length
          }
          tone={
            output.highRisk.length
              ? "negative"
              : "positive"
          }
          icon={
            <RefreshCw />
          }
        />

        <MetricCard
          label="Monitored"
          value={
            output.monitored
              .length
          }
          tone={
            output.monitored
              .length
              ? "warning"
              : "positive"
          }
        />

        <MetricCard
          label="Active Creatives"
          value={
            output.items.length
          }
        />

        <MetricCard
          label="Fatigued Spend"
          value={formatINRCompact(
            output.totalFatiguedSpend
          )}
          tone={
            output.totalFatiguedSpend >
            0
              ? "negative"
              : "positive"
          }
        />

        <MetricCard
          label="Minimum Signals"
          value={`${output.minSignals}/4`}
        />
      </div>

      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Fatigue Qualification
            </CardTitle>

            <CardDescription>
              Select how many of the four signals are required before a creative enters the fatigue queue.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <SegmentedControl
            value={minSignals}
            onChange={
              setMinSignals
            }
            ariaLabel="Minimum creative fatigue signals"
            options={[
              {
                value: "1",
                label: "1 Signal",
              },
              {
                value: "2",
                label: "2 Signals",
              },
              {
                value: "3",
                label: "3 Signals",
              },
              {
                value: "4",
                label: "4 Signals",
              },
            ]}
          />
        </CardBody>
      </Card>

      <div className="mos-analysis-signal-grid">
        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                CPM Inflation
              </CardTitle>

              <CardDescription>
                Current CPM is at least 20% above the previous seven days.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>
        </Card>

        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                CTR Decline
              </CardTitle>

              <CardDescription>
                Current CTR is at least 15% below the previous seven days.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>
        </Card>

        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Weak Thumbstop
              </CardTitle>

              <CardDescription>
                Three-second video-play rate is below 25%.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>
        </Card>

        <Card density="compact">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Frequency Pressure
              </CardTitle>

              <CardDescription>
                Current seven-day frequency is above 3.0.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>
        </Card>
      </div>

      <TableToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder:
            "Search creative, campaign, ad set or signal",
          ariaLabel:
            "Search creative fatigue",
        }}
        filters={
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            ariaLabel="Creative fatigue filter"
            options={[
              {
                value:
                  "fatigued",
                label:
                  "Qualified",
              },
              {
                value:
                  "refresh_priority",
                label:
                  "Refresh",
              },
              {
                value: "watch",
                label: "Watch",
              },
              {
                value: "healthy",
                label: "Healthy",
              },
              {
                value: "all",
                label: "All",
              },
            ]}
          />
        }
        summary={`${sortedItems.length.toLocaleString(
          "en-IN"
        )} creatives`}
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
        ariaLabel="Creative fatigue table"
        caption="Four-signal creative fatigue assessment"
        density={density}
        sort={sort}
        onSortChange={
          setSort
        }
        rowTone={
          creativeRowTone
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
          <CreativeFatigueDetail
            item={item}
          />
        )}
        emptyTitle="No creatives found"
        emptyDescription="Reduce the signal threshold, clear filters or refresh Meta data."
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
