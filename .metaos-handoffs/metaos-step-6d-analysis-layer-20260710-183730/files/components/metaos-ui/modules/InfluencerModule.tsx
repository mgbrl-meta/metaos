"use client";

import {
  Download,
  ShieldCheck,
  Users,
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
  buildMetaV2InfluencerQueue,
  type MetaV2InfluencerItem,
} from "@/lib/meta-v2/engines/influencerEngine";

import {
  formatDate,
  formatINRCompact,
  formatRoas,
} from "@/lib/meta-v2/formatters";

import {
  normalizeMetaV2Rows,
} from "@/lib/meta-v2/normalize";

import {
  useMetaStore,
} from "@/store/metaStore";

function escapeHtml(
  value: unknown
) {
  return String(value ?? "")
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    );
}

function cpaText(
  item: {
    purchases: number;
    cpa: number;
  }
) {
  return item.purchases > 0
    ? formatINRCompact(
        item.cpa
      )
    : "No sale";
}

export function exportInfluencerExcel(
  rows: readonly MetaV2InfluencerItem[],
  latestDate: string
) {
  const headers = [
    "Creative / Video",
    "Ad Name",
    "Campaign",
    "Ad Set",
    "Risk",
    "Yesterday Spend",
    "Yesterday CPA",
    "Yesterday ROAS",
    "Last 7D Spend",
    "Last 7D CPA",
    "Last 7D ROAS",
    "Last 14D Spend",
    "Last 14D CPA",
    "Last 14D ROAS",
    "Last 30D Spend",
    "Last 30D CPA",
    "Last 30D ROAS",
  ];

  const body = rows.map(
    (row) => [
      row.creativeName,
      row.adName,
      row.campaignName,
      row.adSetName,
      row.risk,

      Math.round(
        row.yesterday.spend
      ),

      row.yesterday
        .purchases > 0
        ? Math.round(
            row.yesterday.cpa
          )
        : "No sale",

      formatRoas(
        row.yesterday.roas
      ),

      Math.round(
        row.last7.spend
      ),

      row.last7.purchases >
      0
        ? Math.round(
            row.last7.cpa
          )
        : "No sale",

      formatRoas(
        row.last7.roas
      ),

      Math.round(
        row.last14.spend
      ),

      row.last14
        .purchases > 0
        ? Math.round(
            row.last14.cpa
          )
        : "No sale",

      formatRoas(
        row.last14.roas
      ),

      Math.round(
        row.last30.spend
      ),

      row.last30
        .purchases > 0
        ? Math.round(
            row.last30.cpa
          )
        : "No sale",

      formatRoas(
        row.last30.roas
      ),
    ]
  );

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>

      <body>
        <table border="1">
          <thead>
            <tr>
              ${headers
                .map(
                  (header) =>
                    `<th>${escapeHtml(
                      header
                    )}</th>`
                )
                .join("")}
            </tr>
          </thead>

          <tbody>
            ${body
              .map(
                (row) =>
                  `<tr>${row
                    .map(
                      (cell) =>
                        `<td>${escapeHtml(
                          cell
                        )}</td>`
                    )
                    .join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(
    [html],
    {
      type:
        "application/vnd.ms-excel;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;

  anchor.download =
    `influencer-ads-approval-queue-${
      latestDate ||
      "latest"
    }.xls`;

  document.body.appendChild(
    anchor
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function influencerSortValue(
  item: MetaV2InfluencerItem,
  key: string
): string | number {
  switch (key) {
    case "creative":
      return item.creativeName;

    case "risk":
      return item.risk ===
        "Top Spender"
        ? 3
        : item.risk ===
            "Approval Check"
          ? 2
          : 1;

    case "ySpend":
      return item.yesterday
        .spend;

    case "yCpa":
      return item.yesterday
        .cpa;

    case "yRoas":
      return item.yesterday
        .roas;

    case "l7Spend":
      return item.last7.spend;

    case "l7Cpa":
      return item.last7.cpa;

    case "l7Roas":
      return item.last7.roas;

    case "l14Spend":
      return item.last14.spend;

    case "l30Spend":
      return item.last30.spend;

    default:
      return item.yesterday
        .spend;
  }
}

function influencerTone(
  item: MetaV2InfluencerItem
): DataTableTone {
  if (
    item.risk ===
    "Top Spender"
  ) {
    return "negative";
  }

  if (
    item.risk ===
    "Approval Check"
  ) {
    return "warning";
  }

  return "neutral";
}

function InfluencerDetail({
  item,
}: {
  item: MetaV2InfluencerItem;
}) {
  return (
    <div className="mos-influencer-detail">
      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Full Placement
            </CardTitle>

            <CardDescription>
              Campaign and ad-set context for approval review.
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

            <span>
              Ad Name:{" "}
              <strong>
                {item.adName}
              </strong>
            </span>
          </div>
        </CardBody>
      </Card>

      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Last 14 Days
            </CardTitle>

            <CardDescription>
              Medium-window creator efficiency.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-influencer-window-grid">
            <MetricCard
              compact
              label="Spend"
              value={formatINRCompact(
                item.last14.spend
              )}
            />

            <MetricCard
              compact
              label="CPA"
              value={cpaText(
                item.last14
              )}
              tone={
                item.last14
                  .purchases > 0
                  ? "neutral"
                  : "negative"
              }
            />

            <MetricCard
              compact
              label="ROAS"
              value={`${formatRoas(
                item.last14.roas
              )}x`}
              tone={
                item.last14
                  .roas >= 1
                  ? "positive"
                  : "negative"
              }
            />
          </div>
        </CardBody>
      </Card>

      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Last 30 Days
            </CardTitle>

            <CardDescription>
              Longer-window creator and partnership context.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-influencer-window-grid">
            <MetricCard
              compact
              label="Spend"
              value={formatINRCompact(
                item.last30.spend
              )}
            />

            <MetricCard
              compact
              label="CPA"
              value={cpaText(
                item.last30
              )}
              tone={
                item.last30
                  .purchases > 0
                  ? "neutral"
                  : "negative"
              }
            />

            <MetricCard
              compact
              label="ROAS"
              value={`${formatRoas(
                item.last30.roas
              )}x`}
              tone={
                item.last30
                  .roas >= 1
                  ? "positive"
                  : "negative"
              }
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export function InfluencerModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const [threshold, setThreshold] =
    useState(5000);

  const [query, setQuery] =
    useState("");

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [sort, setSort] =
    useState<DataTableSortState>({
      key: "ySpend",
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

  const [exportStatus, setExportStatus] =
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
      buildMetaV2InfluencerQueue(
        cleanRows,
        threshold,
        query
      ),
    [
      cleanRows,
      threshold,
      query,
    ]
  );

  const sortedItems =
    useMemo(
      () =>
        output.items
          .slice()
          .sort((left, right) => {
            const leftValue =
              influencerSortValue(
                left,
                sort.key
              );

            const rightValue =
              influencerSortValue(
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
          }),
      [output.items, sort]
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
  }, [threshold, query]);

  const columns =
    useMemo<
      DataTableColumn<MetaV2InfluencerItem>[]
    >(
      () => [
        {
          id: "creative",
          header: "Video / Creator",
          minWidth: 330,
          sticky: "left",
          truncate: true,
          sortable: true,
          cell: (item) => (
            <div className="mos-entity-cell">
              <strong
                className="mos-entity-title"
                title={
                  item.creativeName
                }
              >
                {
                  item.creativeName
                }
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
          minWidth: 120,
          sortable: true,
          cell: (item) => (
            <Badge
              tone={
                item.risk ===
                "Top Spender"
                  ? "negative"
                  : item.risk ===
                      "Approval Check"
                    ? "warning"
                    : "neutral"
              }
              dot
            >
              {item.risk}
            </Badge>
          ),
        },
        {
          id: "ySpend",
          header: "Y Spend",
          align: "right",
          numeric: true,
          minWidth: 105,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.yesterday
                .spend
            ),
          tone: (item) =>
            item.yesterday
              .spend >= 25000
              ? "negative"
              : item.yesterday
                    .spend >=
                  5000
                ? "warning"
                : "neutral",
        },
        {
          id: "yCpa",
          header: "Y CPA",
          align: "right",
          numeric: true,
          minWidth: 100,
          sortable: true,
          cell: (item) =>
            cpaText(
              item.yesterday
            ),
          tone: (item) =>
            item.yesterday
              .purchases > 0
              ? "neutral"
              : "negative",
        },
        {
          id: "yRoas",
          header: "Y ROAS",
          align: "right",
          numeric: true,
          minWidth: 92,
          sortable: true,
          cell: (item) =>
            `${formatRoas(
              item.yesterday
                .roas
            )}x`,
          tone: (item) =>
            item.yesterday
              .roas >= 1
              ? "positive"
              : "negative",
        },
        {
          id: "l7Spend",
          header: "L7D Spend",
          align: "right",
          numeric: true,
          minWidth: 110,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.last7.spend
            ),
        },
        {
          id: "l7Cpa",
          header: "L7D CPA",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (item) =>
            cpaText(
              item.last7
            ),
          tone: (item) =>
            item.last7
              .purchases > 0
              ? "neutral"
              : "negative",
        },
        {
          id: "l7Roas",
          header: "L7D ROAS",
          align: "right",
          numeric: true,
          minWidth: 100,
          sortable: true,
          cell: (item) =>
            `${formatRoas(
              item.last7.roas
            )}x`,
          tone: (item) =>
            item.last7.roas >=
            1
              ? "positive"
              : "negative",
        },
        {
          id: "l14Spend",
          header: "L14D Spend",
          align: "right",
          numeric: true,
          minWidth: 116,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.last14.spend
            ),
        },
        {
          id: "l30Spend",
          header: "L30D Spend",
          align: "right",
          numeric: true,
          minWidth: 116,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.last30.spend
            ),
        },
      ],
      []
    );

  function handleExport() {
    try {
      exportInfluencerExcel(
        sortedItems,
        output.latestDate
      );

      setExportStatus(
        `${sortedItems.length} rows exported`
      );
    } catch {
      setExportStatus(
        "Export failed"
      );
    }

    window.setTimeout(
      () =>
        setExportStatus(""),
      1800
    );
  }

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="Influencer queue is ready"
        description="Refresh Meta data to activate creator and collaboration approval control."
      />
    );
  }

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Creator approval control"
        title="Influencer Ads Approval Queue"
        description="Active creator, collaboration, partnership, and influencer videos spending on the latest date."
        actions={
          <>
            {exportStatus ? (
              <Badge
                tone={
                  exportStatus.includes(
                    "failed"
                  )
                    ? "negative"
                    : "positive"
                }
              >
                {exportStatus}
              </Badge>
            ) : null}

            <Button
              variant="secondary"
              size="sm"
              leadingIcon={
                <Download />
              }
              disabled={
                sortedItems.length ===
                0
              }
              onClick={
                handleExport
              }
            >
              Export Excel
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
          label="Approval Rows"
          value={
            output.items.length
          }
          tone={
            output.items.length >
            0
              ? "warning"
              : "positive"
          }
          icon={<Users />}
        />

        <MetricCard
          label="Yesterday Spend"
          value={formatINRCompact(
            output.totalYesterdaySpend
          )}
        />

        <MetricCard
          label="Top Spenders"
          value={
            output.topSpenders
          }
          tone={
            output.topSpenders >
            0
              ? "negative"
              : "positive"
          }
          icon={
            <ShieldCheck />
          }
        />
      </div>

      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Approval Threshold
            </CardTitle>

            <CardDescription>
              Filter videos using latest-day spend before approval review or escalation.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-threshold-controls">
            <div className="mos-button-row">
              <Button
                size="xs"
                variant={
                  threshold ===
                  5000
                    ? "primary"
                    : "secondary"
                }
                onClick={() =>
                  setThreshold(
                    5000
                  )
                }
              >
                ₹5K Approval
              </Button>

              <Button
                size="xs"
                variant={
                  threshold ===
                  25000
                    ? "primary"
                    : "secondary"
                }
                onClick={() =>
                  setThreshold(
                    25000
                  )
                }
              >
                ₹25K Top Spender
              </Button>
            </div>

            <label className="mos-number-control">
              <span>
                Custom threshold
              </span>

              <input
                type="number"
                min={0}
                step={1000}
                value={threshold}
                aria-label="Custom influencer spend threshold"
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
          value: query,
          onChange: setQuery,
          placeholder:
            "Search creator, video, campaign, or ad set",
          ariaLabel:
            "Search influencer approval queue",
        }}
        summary={`${sortedItems.length.toLocaleString(
          "en-IN"
        )} approval rows`}
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
        ariaLabel="Influencer ads approval queue"
        caption="Creator and influencer videos above the latest-day spend threshold"
        density={density}
        sort={sort}
        onSortChange={
          setSort
        }
        rowTone={
          influencerTone
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
          <InfluencerDetail
            item={item}
          />
        )}
        emptyTitle="No active influencer videos found"
        emptyDescription={`No creator or collaboration videos crossed ${formatINRCompact(
          threshold
        )} on the latest date.`}
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
