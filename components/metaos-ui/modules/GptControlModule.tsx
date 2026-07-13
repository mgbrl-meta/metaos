"use client";

import {
  Copy,
  MinusCircle,
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
} from "@/components/metaos-ui/table";

import {
  copyUniqueLines,
} from "@/components/metaos-ui/modules/EconomicControlShared";

import {
  buildMetaV2GptControl,
  type MetaV2GptRiskItem,
} from "@/lib/meta-v2/engines/gptControlEngine";

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

import {
  useMetaV2SettingsStore,
} from "@/store/metaV2SettingsStore";

function sortValue(
  item: MetaV2GptRiskItem,
  key: string
): string | number {
  switch (key) {
    case "ad":
      return item.adName;

    case "latestSpend":
      return item.yesterday.spend;

    case "spend":
      return item.lifetime.spend;

    case "cpa":
      return item.lifetime.cpa;

    case "aov":
      return item.lifetime.aov;

    case "gpt":
      return item.lifetime.gpt;

    case "campaignCpa":
      return item.campaignAverage.cpa;

    case "campaignGpt":
      return item.campaignAverage.gpt;

    case "last7Gpt":
      return item.last7.gpt;

    default:
      return item.lifetime.gpt;
  }
}

function GptDetail({
  item,
  threshold,
}: {
  item: MetaV2GptRiskItem;
  threshold: number;
}) {
  return (
    <div className="mos-economic-detail">
      <div className="mos-gpt-detail-grid">
        <Card
          density="compact"
          tone="negative"
        >
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Why It Is At Risk
              </CardTitle>

              <CardDescription>
                {item.reason}
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-badge-stack">
              <Badge
                tone="negative"
              >
                CPA above campaign
              </Badge>

              <Badge
                tone="negative"
              >
                GPT below campaign
              </Badge>

              <Badge
                tone="negative"
              >
                GPT below target
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
                Economic Comparison
              </CardTitle>

              <CardDescription>
                Ad economics versus the active campaign and selected GPT target.
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-economic-window-grid">
              <MetricCard
                compact
                label="Ad CPA"
                value={formatINRCompact(
                  item.lifetime.cpa
                )}
                tone="negative"
              />

              <MetricCard
                compact
                label="Campaign CPA"
                value={formatINRCompact(
                  item.campaignAverage
                    .cpa
                )}
              />

              <MetricCard
                compact
                label="Ad GPT"
                value={formatINRCompact(
                  item.lifetime.gpt
                )}
                tone="negative"
              />

              <MetricCard
                compact
                label="Campaign GPT"
                value={formatINRCompact(
                  item.campaignAverage
                    .gpt
                )}
              />

              <MetricCard
                compact
                label="GPT Target"
                value={formatINRCompact(
                  threshold
                )}
              />

              <MetricCard
                compact
                label="L7D GPT"
                value={
                  item.last7
                    .purchases > 0
                    ? formatINRCompact(
                        item.last7.gpt
                      )
                    : "No sale"
                }
                tone={
                  item.last7
                    .purchases > 0
                    ? item.last7.gpt >=
                      threshold
                      ? "positive"
                      : "negative"
                    : "warning"
                }
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export function GptControlModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const configuredTarget =
    useMetaV2SettingsStore(
      (state) =>
        state.settings.targetGpt
    );

  const [threshold, setThreshold] =
    useState(
      configuredTarget
    );

  const [search, setSearch] =
    useState("");

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [sort, setSort] =
    useState<DataTableSortState>({
      key: "gpt",
      direction: "asc",
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
      buildMetaV2GptControl(
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

      if (!query) {
        return output.items;
      }

      return output.items.filter(
        (item) =>
          [
            item.adName,
            item.campaignName,
            item.adSetName,
            item.reason,
            item.action,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      output.items,
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
  }, [threshold, search]);

  const columns =
    useMemo<
      DataTableColumn<MetaV2GptRiskItem>[]
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
              <div className="mos-badge-stack">
                <Badge
                  tone="negative"
                >
                  GPT Risk
                </Badge>

                <Badge>
                  Active ad
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
          id: "cpa",
          header: "Ad CPA",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.lifetime.cpa
            ),
          tone: () =>
            "negative",
        },
        {
          id: "campaignCpa",
          header: "Campaign CPA",
          align: "right",
          numeric: true,
          minWidth: 124,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.campaignAverage
                .cpa
            ),
        },
        {
          id: "aov",
          header: "AOV",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.lifetime.aov
            ),
        },
        {
          id: "gpt",
          header: "Ad GPT",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.lifetime.gpt
            ),
          tone: () =>
            "negative",
        },
        {
          id: "campaignGpt",
          header: "Campaign GPT",
          align: "right",
          numeric: true,
          minWidth: 124,
          sortable: true,
          cell: (item) =>
            formatINRCompact(
              item.campaignAverage
                .gpt
            ),
        },
        {
          id: "last7Gpt",
          header: "L7D GPT",
          align: "right",
          numeric: true,
          minWidth: 104,
          sortable: true,
          cell: (item) =>
            item.last7
              .purchases > 0
              ? formatINRCompact(
                  item.last7.gpt
                )
              : "No sale",
          tone: (item) =>
            item.last7
              .purchases > 0
              ? item.last7.gpt >=
                threshold
                ? "positive"
                : "negative"
              : "warning",
        },
        {
          id: "purchases",
          header: "Purchases",
          align: "right",
          numeric: true,
          minWidth: 96,
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
          cell: (item) =>
            `${formatRoas(
              item.lifetime
                .roas
            )}x`,
        },
      ],
      [threshold]
    );

  async function copyRiskQueue() {
    try {
      const count =
        await copyUniqueLines(
          output.items.map(
            (item) =>
              `${item.adName} — ${item.action}`
          )
        );

      setClipboardStatus(
        `${count} risk actions copied`
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
        title="GPT Control is ready"
        description="Refresh Meta data to activate gross-profit-after-traffic risk control."
      />
    );
  }

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Contribution economics"
        title="GPT Risk Control"
        description="Active ads where CPA is above the active-campaign benchmark and GPT is below both the campaign benchmark and selected target."
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
                output.items.length ===
                0
              }
              onClick={
                copyRiskQueue
              }
            >
              Copy Risk Queue
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
              L7D{" "}
              {formatDate(
                output.last7StartDate
              )}{" "}
              to{" "}
              {formatDate(
                output.last7EndDate
              )}
            </Badge>

            <Badge
              tone="negative"
            >
              Target{" "}
              {formatINRCompact(
                threshold
              )}
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Risk Ads"
          value={
            output.items.length
          }
          tone={
            output.items.length
              ? "negative"
              : "positive"
          }
          icon={
            <MinusCircle />
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
          label="Lifetime Spend"
          value={formatINRCompact(
            output.totalSpend
          )}
        />

        <MetricCard
          label="Weighted GPT"
          value={formatINRCompact(
            output.weightedAverageGpt
          )}
          tone={
            output.weightedAverageGpt >=
            threshold
              ? "positive"
              : "negative"
          }
        />

        <MetricCard
          label="Configured GPT"
          value={formatINRCompact(
            configuredTarget
          )}
        />
      </div>

      <Card density="compact">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              GPT Target
            </CardTitle>

            <CardDescription>
              The engine compares each active ad against both its active campaign and this selected GPT target.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-threshold-controls">
            <div className="mos-button-row">
              {[
                -500,
                0,
                100,
                500,
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
                Custom GPT target
              </span>

              <input
                type="number"
                step={100}
                value={threshold}
                aria-label="Custom GPT target"
                onChange={(event) =>
                  setThreshold(
                    Number(
                      event.target
                        .value || 0
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
            "Search ad, campaign, ad set, or action",
          ariaLabel:
            "Search GPT risk ads",
        }}
        summary={`${sortedItems.length.toLocaleString(
          "en-IN"
        )} risk ads`}
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
        ariaLabel="GPT risk control queue"
        caption="Active ads below GPT target and campaign benchmark"
        density={density}
        sort={sort}
        onSortChange={
          setSort
        }
        rowTone={() =>
          "negative"
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
          <GptDetail
            item={item}
            threshold={threshold}
          />
        )}
        emptyTitle="No GPT risk ads found"
        emptyDescription="No active ad is simultaneously below the GPT target and campaign benchmark."
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
