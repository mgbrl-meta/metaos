"use client";

import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Filter,
  Layers3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
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
  IconButton,
  MetricCard,
  PageHeader,
} from "@/components/metaos-ui/primitives";

import {
  DataTable,
  TableDensityControl,
  type DataTableColumn,
  type DataTableDensity,
  type DataTableTone,
} from "@/components/metaos-ui/table";

import {
  buildMetaV2Funnel,
  type MetaV2FunnelRow,
} from "@/lib/meta-v2/engines/funnelEngine";

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

function funnelRowTone(
  row: MetaV2FunnelRow,
  targetRoas: number
): DataTableTone {
  if (row.level === "week") {
    return "muted";
  }

  if (row.totals.spend <= 0) {
    return "neutral";
  }

  return row.totals.roas >=
    targetRoas
    ? "positive"
    : "negative";
}

export function FunnelModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const settings =
    useMetaV2SettingsStore(
      (state) => state.settings
    );

  const [density, setDensity] =
    useState<DataTableDensity>(
      "compact"
    );

  const [
    expandedMonthIds,
    setExpandedMonthIds,
  ] =
    useState<string[]>([]);

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
      buildMetaV2Funnel(
        cleanRows
      ),
    [cleanRows]
  );

  const allMonthIds =
    useMemo(
      () =>
        output.rows
          .filter(
            (row) =>
              (
                row.children ??
                []
              ).length > 0
          )
          .map((row) => row.id),
      [output.rows]
    );

  const expandedSet =
    useMemo(
      () =>
        new Set(
          expandedMonthIds
        ),
      [expandedMonthIds]
    );

  const visibleRows =
    useMemo(() => {
      const rows: MetaV2FunnelRow[] =
        [];

      for (const month of output.rows) {
        rows.push(month);

        if (
          expandedSet.has(
            month.id
          )
        ) {
          rows.push(
            ...(month.children ??
              [])
          );
        }
      }

      return rows;
    }, [
      output.rows,
      expandedSet,
    ]);

  function toggleMonth(
    monthId: string
  ) {
    setExpandedMonthIds(
      (current) =>
        current.includes(
          monthId
        )
          ? current.filter(
              (id) =>
                id !== monthId
            )
          : [
              ...current,
              monthId,
            ]
    );
  }

  function expandAll() {
    setExpandedMonthIds(
      allMonthIds
    );
  }

  function collapseAll() {
    setExpandedMonthIds([]);
  }

  const columns =
    useMemo<
      DataTableColumn<MetaV2FunnelRow>[]
    >(
      () => [
        {
          id: "period",
          header: "Period",
          minWidth: 220,
          sticky: "left",
          cell: (row) => (
            <div
              className={[
                "mos-funnel-period",
                row.level ===
                "week"
                  ? "is-week"
                  : "is-month",
              ].join(" ")}
            >
              <strong>
                {row.label}
              </strong>

              <span>
                {formatDate(
                  row.startDate
                )}{" "}
                to{" "}
                {formatDate(
                  row.endDate
                )}
              </span>
            </div>
          ),
        },
        {
          id: "clicks",
          header: "Clicks",
          align: "right",
          numeric: true,
          minWidth: 88,
          cell: (row) =>
            formatNumberCompact(
              row.totals.clicks
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
              row.totals.lpv
            ),
        },
        {
          id: "lpvRate",
          header: "LPV Rate",
          align: "right",
          numeric: true,
          minWidth: 94,
          cell: (row) =>
            formatPct(
              row.totals.lpvRate
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
              row.totals.atc
            ),
        },
        {
          id: "atcRate",
          header: "ATC Rate",
          align: "right",
          numeric: true,
          minWidth: 94,
          cell: (row) =>
            formatPct(
              row.totals.atcRate
            ),
        },
        {
          id: "checkout",
          header: "Checkout",
          align: "right",
          numeric: true,
          minWidth: 96,
          cell: (row) =>
            formatNumberCompact(
              row.totals.checkout
            ),
        },
        {
          id: "checkoutRate",
          header:
            "Checkout Rate",
          align: "right",
          numeric: true,
          minWidth: 112,
          cell: (row) =>
            formatPct(
              row.totals
                .checkoutRate
            ),
        },
        {
          id: "payment",
          header: "Payment",
          align: "right",
          numeric: true,
          minWidth: 92,
          cell: (row) =>
            formatNumberCompact(
              row.totals.payment
            ),
        },
        {
          id: "paymentRate",
          header:
            "Payment Rate",
          align: "right",
          numeric: true,
          minWidth: 108,
          cell: (row) =>
            formatPct(
              row.totals
                .paymentRate
            ),
        },
        {
          id: "purchases",
          header: "Purchases",
          align: "right",
          numeric: true,
          minWidth: 98,
          cell: (row) =>
            formatNumberCompact(
              row.totals
                .purchases
            ),
          tone: (row) =>
            row.totals
              .purchases > 0
              ? "positive"
              : "negative",
        },
        {
          id: "purchaseRate",
          header:
            "Purchase Rate",
          align: "right",
          numeric: true,
          minWidth: 112,
          cell: (row) =>
            formatPct(
              row.totals
                .purchaseRate
            ),
        },
        {
          id: "cpa",
          header: "CPA",
          align: "right",
          numeric: true,
          minWidth: 104,
          cell: (row) =>
            formatINRCompact(
              row.totals.cpa
            ),
          tone: (row) =>
            row.totals
              .purchases <= 0
              ? "negative"
              : row.totals.cpa <=
                  settings.targetCpa
                ? "positive"
                : "negative",
        },
        {
          id: "roas",
          header: "ROAS",
          align: "right",
          numeric: true,
          minWidth: 82,
          cell: (row) =>
            `${formatRoas(
              row.totals.roas
            )}x`,
          tone: (row) =>
            row.totals.roas >=
            settings.targetRoas
              ? "positive"
              : "negative",
        },
        {
          id: "gpt",
          header: "GPT",
          align: "right",
          numeric: true,
          minWidth: 104,
          cell: (row) =>
            formatINRCompact(
              row.totals.gpt
            ),
          tone: (row) =>
            row.totals.gpt >=
            settings.targetGpt
              ? "positive"
              : "negative",
        },
        {
          id: "expand",
          header: "Weeks",
          align: "center",
          minWidth: 72,
          sticky: "right",
          cell: (row) => {
            if (
              row.level !==
              "month" ||
              !row.children?.length
            ) {
              return (
                <span className="mos-table-muted-dash">
                  —
                </span>
              );
            }

            const expanded =
              expandedSet.has(
                row.id
              );

            return (
              <IconButton
                label={
                  expanded
                    ? `Collapse ${row.label}`
                    : `Expand ${row.label}`
                }
                size="xs"
                variant="ghost"
                icon={
                  expanded ? (
                    <ChevronDown />
                  ) : (
                    <ChevronRight />
                  )
                }
                aria-expanded={
                  expanded
                }
                onClick={() =>
                  toggleMonth(
                    row.id
                  )
                }
              />
            );
          },
        },
      ],
      [
        expandedSet,
        settings.targetCpa,
        settings.targetGpt,
        settings.targetRoas,
      ]
    );

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="Funnel is ready"
        description="Refresh Meta data to activate month and week funnel movement."
      />
    );
  }

  const roasHealthy =
    output.summary.roas >=
    settings.targetRoas;

  const cpaHealthy =
    output.summary.purchases >
      0 &&
    output.summary.cpa <=
      settings.targetCpa;

  const gptHealthy =
    output.summary.gpt >=
    settings.targetGpt;

  const allExpanded =
    allMonthIds.length > 0 &&
    allMonthIds.every(
      (id) =>
        expandedSet.has(id)
    );

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Conversion movement"
        title="Funnel Performance"
        description={
          output.verdict
        }
        actions={
          <>
            <Badge>
              {output.monthCount}{" "}
              months
            </Badge>

            <Badge>
              {output.weekCount}{" "}
              weeks
            </Badge>

            <Badge
              tone={
                roasHealthy
                  ? "positive"
                  : "negative"
              }
            >
              ROAS{" "}
              {formatRoas(
                output.summary.roas
              )}
              x
            </Badge>
          </>
        }
        meta={
          <>
            <Badge>
              Strongest{" "}
              {
                output.strongestMonth
              }
            </Badge>

            <Badge
              tone="negative"
            >
              Weakest{" "}
              {
                output.weakestMonth
              }
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Spend"
          value={formatINRCompact(
            output.summary.spend
          )}
        />

        <MetricCard
          label="Revenue"
          value={formatINRCompact(
            output.summary.revenue
          )}
          tone="positive"
        />

        <MetricCard
          label="Purchases"
          value={formatNumberCompact(
            output.summary
              .purchases
          )}
          tone={
            output.summary
              .purchases > 0
              ? "positive"
              : "negative"
          }
        />

        <MetricCard
          label="CPA"
          value={formatINRCompact(
            output.summary.cpa
          )}
          tone={
            cpaHealthy
              ? "positive"
              : "negative"
          }
          note={`Target ${formatINRCompact(
            settings.targetCpa
          )}`}
        />

        <MetricCard
          label="ROAS"
          value={`${formatRoas(
            output.summary.roas
          )}x`}
          tone={
            roasHealthy
              ? "positive"
              : "negative"
          }
          note={`Target ${formatRoas(
            settings.targetRoas
          )}x`}
        />

        <MetricCard
          label="GPT"
          value={formatINRCompact(
            output.summary.gpt
          )}
          tone={
            gptHealthy
              ? "positive"
              : "negative"
          }
          note={`Target ${formatINRCompact(
            settings.targetGpt
          )}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Conversion Stage Health
            </CardTitle>

            <CardDescription>
              Engine-calculated movement between landing-page view, cart, checkout, payment and purchase.
            </CardDescription>
          </CardHeaderText>

          <Filter
            size={17}
            aria-hidden="true"
          />
        </CardHeader>

        <CardBody>
          <div className="mos-funnel-stage-grid">
            <MetricCard
              compact
              label="Clicks"
              value={formatNumberCompact(
                output.summary.clicks
              )}
            />

            <MetricCard
              compact
              label="LPV Rate"
              value={formatPct(
                output.summary
                  .lpvRate
              )}
            />

            <MetricCard
              compact
              label="ATC Rate"
              value={formatPct(
                output.summary
                  .atcRate
              )}
            />

            <MetricCard
              compact
              label="Checkout Rate"
              value={formatPct(
                output.summary
                  .checkoutRate
              )}
            />

            <MetricCard
              compact
              label="Payment Rate"
              value={formatPct(
                output.summary
                  .paymentRate
              )}
            />

            <MetricCard
              compact
              label="Purchase Rate"
              value={formatPct(
                output.summary
                  .purchaseRate
              )}
            />
          </div>
        </CardBody>
      </Card>

      <div className="mos-funnel-highlight-grid">
        <Card tone="positive">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Strongest Month
              </CardTitle>

              <CardDescription>
                Highest ROAS month in the protected Funnel engine output.
              </CardDescription>
            </CardHeaderText>

            <TrendingUp
              size={17}
              aria-hidden="true"
            />
          </CardHeader>

          <CardBody>
            <div className="mos-funnel-highlight-value mos-positive">
              {output.strongestMonth}
            </div>
          </CardBody>
        </Card>

        <Card tone="negative">
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Weakest Month
              </CardTitle>

              <CardDescription>
                Lowest ROAS month with recorded spend.
              </CardDescription>
            </CardHeaderText>

            <TrendingDown
              size={17}
              aria-hidden="true"
            />
          </CardHeader>

          <CardBody>
            <div className="mos-funnel-highlight-value mos-negative">
              {output.weakestMonth}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mos-screen-controls">
        <div className="mos-funnel-control-copy">
          <Layers3
            size={15}
            aria-hidden="true"
          />

          <span>
            Month rows remain visible. Expand any month to inspect its protected weekly breakdown.
          </span>
        </div>

        <div className="mos-button-row">
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
              allExpanded ? (
                <ChevronsDownUp />
              ) : (
                <ChevronsUpDown />
              )
            }
            disabled={
              allMonthIds.length ===
              0
            }
            onClick={
              allExpanded
                ? collapseAll
                : expandAll
            }
          >
            {allExpanded
              ? "Collapse All"
              : "Expand All"}
          </Button>
        </div>
      </div>

      <DataTable
        rows={visibleRows}
        columns={columns}
        getRowId={(row) =>
          row.id
        }
        ariaLabel="Meta month and week funnel performance"
        caption="Protected month and week funnel movement table"
        density={density}
        stickyHeader
        rowTone={(row) =>
          funnelRowTone(
            row,
            settings.targetRoas
          )
        }
        rowClassName={(row) =>
          row.level ===
          "month"
            ? "is-funnel-month"
            : "is-funnel-week"
        }
        emptyTitle="No funnel rows found"
        emptyDescription="Refresh Meta data to rebuild the month and week funnel output."
      />
    </div>
  );
}
