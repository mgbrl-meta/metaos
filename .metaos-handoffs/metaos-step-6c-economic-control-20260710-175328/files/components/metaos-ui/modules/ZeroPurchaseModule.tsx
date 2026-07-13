"use client";

import {
  Copy,
  ShieldAlert,
  SlidersHorizontal,
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
  buildMetaV2ZeroPurchase,
  type MetaV2ZeroPurchaseItem,
  type MetaV2ZeroPurchaseTrendRow,
} from "@/lib/meta-v2/engines/zeroPurchaseEngine";

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

type SeverityFilter =
  | "all"
  | "critical"
  | "high"
  | "medium";

function handleOnly(
  adName: string
): string {
  const value = String(
    adName || ""
  ).trim();

  const handle = value.match(
    /@[a-zA-Z0-9._]+/
  );

  if (handle?.[0]) {
    return handle[0];
  }

  return value
    .split(/\s+-\s+/)[0]
    .replace(
      /[|·,\s]+$/g,
      ""
    )
    .trim();
}

async function copyLines(
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

function severityTone(
  severity: MetaV2ZeroPurchaseItem["severity"]
) {
  if (severity === "critical") {
    return "negative" as const;
  }

  if (severity === "high") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function rowTone(
  item: MetaV2ZeroPurchaseItem
): DataTableTone {
  if (
    item.severity ===
    "critical"
  ) {
    return "negative";
  }

  if (
    item.severity === "high"
  ) {
    return "warning";
  }

  return "muted";
}

function sortValue(
  item: MetaV2ZeroPurchaseItem,
  key: string
): string | number {
  switch (key) {
    case "ad":
      return item.adName;

    case "lifetimeSpend":
      return item.lifetime.spend;

    case "latestSpend":
      return item.latest.spend;

    case "last7Spend":
      return item.last7.spend;

    case "clicks":
      return item.lifetime.clicks;

    case "lpv":
      return item.lifetime.lpv;

    case "atc":
      return item.lifetime.atc;

    case "severity":
      return item.severity ===
        "critical"
        ? 3
        : item.severity ===
            "high"
          ? 2
          : 1;

    default:
      return item.lifetime.spend;
  }
}

const trendColumns: readonly DataTableColumn<MetaV2ZeroPurchaseTrendRow>[] =
  [
    {
      id: "date",
      header: "Date",
      minWidth: 110,
      cell: (row) =>
        formatDate(row.date),
    },
    {
      id: "spend",
      header: "Spend",
      align: "right",
      numeric: true,
      minWidth: 105,
      cell: (row) =>
        formatINRCompact(
          row.spend
        ),
      tone: (row) =>
        row.spend > 0
          ? "negative"
          : "neutral",
    },
    {
      id: "clicks",
      header: "Clicks",
      align: "right",
      numeric: true,
      minWidth: 82,
      cell: (row) =>
        formatNumberCompact(
          row.clicks
        ),
    },
    {
      id: "lpv",
      header: "LPV",
      align: "right",
      numeric: true,
      minWidth: 82,
      cell: (row) =>
        formatNumberCompact(
          row.lpv
        ),
    },
    {
      id: "atc",
      header: "ATC",
      align: "right",
      numeric: true,
      minWidth: 82,
      cell: (row) =>
        formatNumberCompact(
          row.atc
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
          row.purchases
        ),
      tone: (row) =>
        row.purchases <= 0
          ? "negative"
          : "positive",
    },
    {
      id: "roas",
      header: "ROAS",
      align: "right",
      numeric: true,
      minWidth: 80,
      cell: (row) =>
        `${formatRoas(
          row.roas
        )}x`,
      tone: (row) =>
        row.roas <= 0
          ? "negative"
          : "positive",
    },
  ];

function ZeroPurchaseDetail({
  item,
}: {
  item: MetaV2ZeroPurchaseItem;
}) {
  return (
    <div className="mos-detail-layout">
      <Card
        density="compact"
        tone="negative"
      >
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Why This Is Critical
            </CardTitle>

            <CardDescription>
              {item.reason}
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-detail-list">
            <span>
              Lifetime spend:{" "}
              <strong>
                {formatINRCompact(
                  item.lifetime
                    .spend
                )}
              </strong>
            </span>

            <span>
              Last 7-day spend:{" "}
              <strong>
                {formatINRCompact(
                  item.last7.spend
                )}
              </strong>
            </span>

            <span>
              Latest-day spend:{" "}
              <strong>
                {formatINRCompact(
                  item.latest.spend
                )}
              </strong>
            </span>
          </div>
        </CardBody>
      </Card>

      <Card
        density="compact"
      >
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Operator Action
            </CardTitle>

            <CardDescription>
              {item.action}
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-detail-list">
            <span>
              LPV:{" "}
              <strong>
                {formatNumberCompact(
                  item.lifetime
                    .lpv
                )}
              </strong>
            </span>

            <span>
              ATC:{" "}
              <strong>
                {formatNumberCompact(
                  item.lifetime
                    .atc
                )}
              </strong>
            </span>

            <span>
              Clicks:{" "}
              <strong>
                {formatNumberCompact(
                  item.lifetime
                    .clicks
                )}
              </strong>
            </span>
          </div>
        </CardBody>
      </Card>

      <div className="mos-detail-trend">
        <div className="mos-detail-heading">
          Latest Seven-Day Trend
        </div>

        <DataTable
          rows={item.trend}
          columns={trendColumns}
          getRowId={(row) =>
            row.date
          }
          ariaLabel={`${item.adName} seven-day trend`}
          density="compact"
          emptyTitle="No trend data"
          emptyDescription="No daily trend rows are available for this ad."
        />
      </div>
    </div>
  );
}

export function ZeroPurchaseModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const [threshold, setThreshold] =
    useState(3000);

  const [search, setSearch] =
    useState("");

  const [
    severityFilter,
    setSeverityFilter,
  ] =
    useState<SeverityFilter>(
      "all"
    );

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [sort, setSort] =
    useState<DataTableSortState>({
      key: "lifetimeSpend",
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

  const [copied, setCopied] =
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
      buildMetaV2ZeroPurchase(
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
            severityFilter !==
              "all" &&
            item.severity !==
              severityFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            item.adName,
            item.adSetName,
            item.campaignName,
            item.reason,
            item.action,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      output.items,
      search,
      severityFilter,
    ]);

  const sortedItems =
    useMemo(() => {
      return filteredItems
        .slice()
        .sort((a, b) => {
          const left =
            sortValue(
              a,
              sort.key
            );

          const right =
            sortValue(
              b,
              sort.key
            );

          const comparison =
            typeof left ===
              "number" &&
            typeof right ===
              "number"
              ? left - right
              : String(
                  left
                ).localeCompare(
                  String(right)
                );

          return sort.direction ===
            "asc"
            ? comparison
            : -comparison;
        });
    }, [
      filteredItems,
      sort,
    ]);

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
    search,
    severityFilter,
  ]);

  const columns =
    useMemo<
      DataTableColumn<MetaV2ZeroPurchaseItem>[]
    >(
      () => [
        {
          id: "ad",
          header: "Ad",
          headerLabel: "Ad",
          minWidth: 330,
          sticky: "left",
          truncate: true,
          sortable: true,
          sortKey: "ad",
          cell: (item) => (
            <div className="mos-entity-cell">
              <div className="mos-badge-stack">
                <Badge
                  tone={severityTone(
                    item.severity
                  )}
                >
                  {item.severity}
                </Badge>

                <Badge
                  tone="negative"
                >
                  Zero purchase
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
          id: "severity",
          header: "Severity",
          align: "center",
          minWidth: 100,
          sortable: true,
          sortKey:
            "severity",
          cell: (item) => (
            <Badge
              tone={severityTone(
                item.severity
              )}
              dot
            >
              {item.severity}
            </Badge>
          ),
        },
        {
          id: "lifetimeSpend",
          header:
            "Lifetime Spend",
          align: "right",
          numeric: true,
          minWidth: 128,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.lifetime
                .spend
            ),
          tone: () =>
            "negative",
        },
        {
          id: "latestSpend",
          header:
            "Latest Spend",
          align: "right",
          numeric: true,
          minWidth: 118,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.latest.spend
            ),
          tone: (item) =>
            item.latest.spend >
            0
              ? "negative"
              : "neutral",
        },
        {
          id: "last7Spend",
          header: "L7D Spend",
          align: "right",
          numeric: true,
          minWidth: 112,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.last7.spend
            ),
          tone: (item) =>
            item.last7.spend >
            0
              ? "negative"
              : "neutral",
        },
        {
          id: "clicks",
          header: "Clicks",
          align: "right",
          numeric: true,
          minWidth: 86,
          sortable: true,
          cell: (item) =>
            formatNumberCompact(
              item.lifetime
                .clicks
            ),
        },
        {
          id: "lpv",
          header: "LPV",
          align: "right",
          numeric: true,
          minWidth: 82,
          sortable: true,
          cell: (item) =>
            formatNumberCompact(
              item.lifetime
                .lpv
            ),
        },
        {
          id: "atc",
          header: "ATC",
          align: "right",
          numeric: true,
          minWidth: 82,
          sortable: true,
          cell: (item) =>
            formatNumberCompact(
              item.lifetime
                .atc
            ),
          tone: (item) =>
            item.lifetime.atc >
            0
              ? "warning"
              : "neutral",
        },
        {
          id: "purchases",
          header: "Purchases",
          align: "right",
          numeric: true,
          minWidth: 96,
          cell: () => "0",
          tone: () =>
            "negative",
        },
        {
          id: "roas",
          header: "ROAS",
          align: "right",
          numeric: true,
          minWidth: 82,
          cell: (item) =>
            `${formatRoas(
              item.lifetime
                .roas
            )}x`,
          tone: () =>
            "negative",
        },
      ],
      []
    );

  async function copyHandles() {
    try {
      const count =
        await copyLines(
          sortedItems.map(
            (item) =>
              handleOnly(
                item.adName
              )
          )
        );

      setCopied(
        `${count} handles copied`
      );
    } catch {
      setCopied(
        "Clipboard access failed"
      );
    }

    window.setTimeout(
      () => setCopied(""),
      1800
    );
  }

  async function copyFullNames() {
    try {
      const count =
        await copyLines(
          sortedItems.map(
            (item) =>
              item.adName
          )
        );

      setCopied(
        `${count} ad names copied`
      );
    } catch {
      setCopied(
        "Clipboard access failed"
      );
    }

    window.setTimeout(
      () => setCopied(""),
      1800
    );
  }

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="Zero Purchase is ready"
        description="Refresh Meta data to activate zero-purchase waste control."
      />
    );
  }

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Waste recovery"
        title="Zero-Purchase Control"
        description={
          output.verdict
        }
        actions={
          copied ? (
            <Badge
              tone={
                copied.includes(
                  "failed"
                )
                  ? "negative"
                  : "positive"
              }
            >
              {copied}
            </Badge>
          ) : (
            <Badge
              tone={
                output.totalItems >
                0
                  ? "negative"
                  : "positive"
              }
            >
              {
                output.totalItems
              }{" "}
              active waste ads
            </Badge>
          )
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
          label="Ads"
          value={
            output.totalItems
          }
          tone={
            output.totalItems >
            0
              ? "negative"
              : "positive"
          }
          icon={
            <ShieldAlert />
          }
        />

        <MetricCard
          label="Lifetime Waste"
          value={formatINRCompact(
            output.totalLifetimeWaste
          )}
          tone={
            output.totalLifetimeWaste >
            0
              ? "negative"
              : "positive"
          }
        />

        <MetricCard
          label="Last 7-Day Waste"
          value={formatINRCompact(
            output.totalLast7Waste
          )}
          tone={
            output.totalLast7Waste >
            0
              ? "negative"
              : "positive"
          }
        />

        <MetricCard
          label="Latest-Day Waste"
          value={formatINRCompact(
            output.totalLatestWaste
          )}
          tone={
            output.totalLatestWaste >
            0
              ? "negative"
              : "positive"
          }
        />
      </div>

      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Lifetime Spend Threshold
            </CardTitle>

            <CardDescription>
              Include ads with zero lifetime purchases, spend above the selected threshold, and activity on the latest date or during the last seven days.
            </CardDescription>
          </CardHeaderText>

          <SlidersHorizontal
            size={17}
            aria-hidden="true"
          />
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
                aria-label="Custom lifetime spend threshold"
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
            "Search ad, campaign, ad set or action",
          ariaLabel:
            "Search zero-purchase ads",
        }}
        filters={
          <SegmentedControl
            value={
              severityFilter
            }
            onChange={
              setSeverityFilter
            }
            ariaLabel="Zero-purchase severity"
            options={[
              {
                value: "all",
                label: "All",
              },
              {
                value:
                  "critical",
                label:
                  "Critical",
              },
              {
                value: "high",
                label: "High",
              },
              {
                value: "medium",
                label:
                  "Medium",
              },
            ]}
          />
        }
        summary={`${sortedItems.length.toLocaleString(
          "en-IN"
        )} ads`}
        actions={
          <>
            <TableDensityControl
              value={density}
              onChange={
                setDensity
              }
            />

            <Button
              variant="secondary"
              size="xs"
              leadingIcon={
                <Copy />
              }
              disabled={
                sortedItems.length ===
                0
              }
              onClick={
                copyHandles
              }
            >
              Copy Handles
            </Button>

            <Button
              variant="secondary"
              size="xs"
              disabled={
                sortedItems.length ===
                0
              }
              onClick={
                copyFullNames
              }
            >
              Full Names
            </Button>
          </>
        }
      />

      <DataTable
        rows={visibleItems}
        columns={columns}
        getRowId={(item) =>
          item.id
        }
        ariaLabel="Zero-purchase waste ads"
        caption="Ads with zero lifetime purchases and active spend"
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
          <ZeroPurchaseDetail
            item={item}
          />
        )}
        emptyTitle="No zero-purchase ads found"
        emptyDescription="Lower the threshold, broaden the severity filter, clear the search, or refresh Meta data."
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
