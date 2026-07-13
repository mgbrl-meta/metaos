"use client";

import {
  Download,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
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
  MetricCard,
  PageHeader,
  SegmentedControl,
} from "@/components/metaos-ui/primitives";

import {
  DataTable,
  TablePagination,
  TableToolbar,
  type DataTableColumn,
  type DataTableTone,
} from "@/components/metaos-ui/table";

import {
  buildMetaV2DataQc,
  type MetaV2QcIssue,
  type MetaV2QcSeverity,
} from "@/lib/meta-v2/engines/dataQcEngine";

import {
  formatDate,
  formatINRCompact,
  formatINRFull,
  formatNumberFull,
  formatPct,
  formatRoas,
} from "@/lib/meta-v2/formatters";

import {
  normalizeMetaV2Rows,
} from "@/lib/meta-v2/normalize";

import type {
  MetaQcFlag,
  MetaQcRow,
} from "@/lib/metaDataQuality";

import {
  useMetaStore,
} from "@/store/metaStore";

type DataQcView =
  | "checks"
  | "source_rows";

type SourceSeverityFilter =
  | "all"
  | "critical"
  | "warning";

function safeText(
  value: unknown
): string {
  return String(value ?? "").trim();
}

function safeNumber(
  value: unknown
): number {
  const normalized = String(
    value ?? ""
  )
    .replaceAll(",", "")
    .replaceAll("₹", "")
    .replaceAll("%", "")
    .trim();

  const number = Number(normalized);

  return Number.isFinite(number)
    ? number
    : 0;
}

function issueTone(
  severity: MetaV2QcSeverity
) {
  if (severity === "critical") {
    return "negative" as const;
  }

  if (severity === "warning") {
    return "warning" as const;
  }

  if (severity === "pass") {
    return "positive" as const;
  }

  return "neutral" as const;
}

function sourceRowTone(
  row: MetaQcRow
): DataTableTone {
  const flags =
    row.__qc?.flags ?? [];

  if (
    flags.some(
      (flag) =>
        flag.severity === "critical"
    )
  ) {
    return "negative";
  }

  if (
    flags.some(
      (flag) =>
        flag.severity === "warning"
    )
  ) {
    return "warning";
  }

  return "neutral";
}

function exportQcRows(
  rows: readonly MetaQcRow[]
) {
  const headers = [
    "Date",
    "Campaign",
    "Ad Set",
    "Ad",
    "Creative",
    "Spend",
    "Purchases",
    "Revenue",
    "CPA",
    "ROAS",
    "QC Flags",
  ];

  const body = rows.map(
    (row) => [
      safeText(row.date),
      safeText(row.campaignName),
      safeText(row.adSetName),
      safeText(row.adName),
      safeText(row.creativeName),
      safeNumber(row.spend),
      safeNumber(row.purchases),
      safeNumber(row.revenue),
      safeNumber(row.cpa),
      safeNumber(row.roas),

      (row.__qc?.flags ?? [])
        .map(
          (flag) =>
            `${flag.code}: ${flag.message}`
        )
        .join(" | "),
    ]
  );

  const csv = [
    headers,
    ...body,
  ]
    .map((line) =>
      line
        .map(
          (cell) =>
            `"${String(
              cell ?? ""
            ).replaceAll(
              '"',
              '""'
            )}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob(
    [csv],
    {
      type:
        "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download =
    "meta-data-qc-report.csv";

  document.body.appendChild(
    anchor
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function QcFlagList({
  flags,
}: {
  flags: readonly MetaQcFlag[];
}) {
  return (
    <div className="mos-badge-stack">
      {flags.map((flag) => (
        <Badge
          key={`${flag.code}-${flag.field ?? ""}`}
          tone={
            flag.severity === "critical"
              ? "negative"
              : flag.severity ===
                  "warning"
                ? "warning"
                : "neutral"
          }
          title={flag.message}
        >
          {flag.code}
        </Badge>
      ))}
    </div>
  );
}

export function DataQcModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const qcSummary =
    useMetaStore(
      (state) =>
        state.metaQcSummary
    );

  const [view, setView] =
    useState<DataQcView>(
      "checks"
    );

  const [
    sourceSeverity,
    setSourceSeverity,
  ] =
    useState<SourceSeverityFilter>(
      "all"
    );

  const [search, setSearch] =
    useState("");

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
      buildMetaV2DataQc(
        cleanRows
      ),
    [cleanRows]
  );

  const suspiciousRows =
    useMemo(
      () =>
        (
          qcSummary
            ?.suspiciousRows ??
          []
        ) as MetaQcRow[],
      [qcSummary]
    );

  const filteredSourceRows =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      return suspiciousRows.filter(
        (row) => {
          const flags =
            row.__qc?.flags ?? [];

          const severityMatches =
            sourceSeverity ===
              "all" ||
            flags.some(
              (flag) =>
                flag.severity ===
                sourceSeverity
            );

          if (!severityMatches) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            row.date,
            row.campaignName,
            row.adSetName,
            row.adName,
            row.creativeName,
            ...flags.flatMap(
              (flag) => [
                flag.code,
                flag.message,
              ]
            ),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      suspiciousRows,
      search,
      sourceSeverity,
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredSourceRows.length /
        pageSize
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const visibleSourceRows =
    filteredSourceRows.slice(
      (safePage - 1) *
        pageSize,
      safePage * pageSize
    );

  const issueColumns =
    useMemo<
      DataTableColumn<MetaV2QcIssue>[]
    >(
      () => [
        {
          id: "severity",
          header: "Severity",
          minWidth: 130,
          cell: (issue) => (
            <Badge
              tone={issueTone(
                issue.severity
              )}
              dot
            >
              {issue.severity}
            </Badge>
          ),
        },
        {
          id: "check",
          header: "Check",
          minWidth: 230,
          cell: (issue) => (
            <div className="mos-entity-cell">
              <strong className="mos-entity-title">
                {issue.title}
              </strong>

              <span className="mos-entity-subtitle">
                {issue.code}
              </span>
            </div>
          ),
        },
        {
          id: "detail",
          header: "Detail",
          minWidth: 360,
          cell: (issue) =>
            issue.detail,
        },
        {
          id: "action",
          header: "Required Action",
          minWidth: 340,
          cell: (issue) =>
            issue.action,
        },
      ],
      []
    );

  const sourceColumns =
    useMemo<
      DataTableColumn<MetaQcRow>[]
    >(
      () => [
        {
          id: "date",
          header: "Date",
          minWidth: 112,
          cell: (row) =>
            formatDate(
              safeText(row.date)
            ),
        },
        {
          id: "creative",
          header: "Creative / Ad",
          minWidth: 290,
          truncate: true,
          sticky: "left",
          cell: (row) => (
            <div className="mos-entity-cell">
              <strong
                className="mos-entity-title"
                title={
                  safeText(
                    row.creativeName
                  ) ||
                  safeText(
                    row.adName
                  )
                }
              >
                {safeText(
                  row.creativeName
                ) ||
                  safeText(
                    row.adName
                  ) ||
                  "Unnamed creative"}
              </strong>

              <span
                className="mos-entity-subtitle"
                title={safeText(
                  row.adName
                )}
              >
                {safeText(
                  row.adName
                )}
              </span>
            </div>
          ),
        },
        {
          id: "campaign",
          header: "Campaign",
          minWidth: 250,
          truncate: true,
          cell: (row) =>
            safeText(
              row.campaignName
            ) ||
            "Unknown campaign",
        },
        {
          id: "spend",
          header: "Spend",
          align: "right",
          numeric: true,
          minWidth: 112,
          cell: (row) =>
            formatINRFull(
              safeNumber(
                row.spend
              )
            ),
        },
        {
          id: "purchases",
          header: "Purchases",
          align: "right",
          numeric: true,
          minWidth: 100,
          cell: (row) =>
            formatNumberFull(
              safeNumber(
                row.purchases
              )
            ),
        },
        {
          id: "revenue",
          header: "Revenue",
          align: "right",
          numeric: true,
          minWidth: 120,
          cell: (row) =>
            formatINRFull(
              safeNumber(
                row.revenue
              )
            ),
        },
        {
          id: "cpa",
          header: "CPA",
          align: "right",
          numeric: true,
          minWidth: 112,
          cell: (row) => {
            const purchases =
              safeNumber(
                row.purchases
              );

            return purchases > 0
              ? formatINRFull(
                  safeNumber(
                    row.cpa
                  )
                )
              : "No sale";
          },
          tone: (row) =>
            safeNumber(
              row.purchases
            ) > 0
              ? "neutral"
              : "negative",
        },
        {
          id: "roas",
          header: "ROAS",
          align: "right",
          numeric: true,
          minWidth: 90,
          cell: (row) =>
            `${formatRoas(
              safeNumber(
                row.roas
              )
            )}x`,
        },
        {
          id: "flags",
          header: "QC Flags",
          minWidth: 210,
          cell: (row) => (
            <QcFlagList
              flags={
                row.__qc?.flags ??
                []
              }
            />
          ),
        },
      ],
      []
    );

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="Data QC is ready"
        description="Refresh Meta data to activate source-row validation and the protected V2 trust engine."
      />
    );
  }

  const scoreTone =
    output.score >= 80
      ? "positive"
      : output.score >= 60
        ? "warning"
        : "negative";

  const criticalRows =
    qcSummary
      ?.rowsWithCritical ?? 0;

  const warningRows =
    qcSummary
      ?.rowsWithWarnings ?? 0;

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Data trust layer"
        title="Meta Data Quality Control"
        description={
          output.verdict
        }
        actions={
          <>
            <Badge
              tone={scoreTone}
            >
              Score{" "}
              {output.score}/100
            </Badge>

            <Badge
              tone={scoreTone}
            >
              {output.grade}
            </Badge>

            <Badge
              tone={
                output.confidence ===
                "High"
                  ? "positive"
                  : output.confidence ===
                      "Medium"
                    ? "warning"
                    : "negative"
              }
            >
              Confidence{" "}
              {output.confidence}
            </Badge>
          </>
        }
        meta={
          <>
            <Badge>
              {formatDate(
                output.earliestDate
              )}{" "}
              to{" "}
              {formatDate(
                output.latestDate
              )}
            </Badge>

            <Badge>
              {
                output.activeRowCount
              }{" "}
              active rows
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Rows Checked"
          value={formatNumberFull(
            qcSummary
              ?.rowsChecked ??
              output.rowCount
          )}
        />

        <MetricCard
          label="Clean Rows"
          value={formatNumberFull(
            qcSummary
              ?.cleanRows ?? 0
          )}
          tone="positive"
        />

        <MetricCard
          label="Critical Rows"
          value={formatNumberFull(
            criticalRows
          )}
          tone={
            criticalRows > 0
              ? "negative"
              : "positive"
          }
        />

        <MetricCard
          label="Warnings"
          value={formatNumberFull(
            warningRows
          )}
          tone={
            warningRows > 0
              ? "warning"
              : "positive"
          }
        />

        <MetricCard
          label="Shifted Fixed"
          value={formatNumberFull(
            qcSummary
              ?.shiftedRowsFixed ??
              0
          )}
          tone={
            (
              qcSummary
                ?.shiftedRowsFixed ??
              0
            ) > 0
              ? "warning"
              : "positive"
          }
        />

        <MetricCard
          label="Column Confidence"
          value={`${output.totalColumnsConfidence}/100`}
          tone={
            output.totalColumnsConfidence >=
            75
              ? "positive"
              : "warning"
          }
        />
      </div>

      <div className="mos-metric-grid">
        <MetricCard
          label="Spend"
          value={formatINRCompact(
            output.totals.spend
          )}
        />

        <MetricCard
          label="Revenue"
          value={formatINRCompact(
            output.totals.revenue
          )}
          tone="positive"
        />

        <MetricCard
          label="ROAS"
          value={`${formatRoas(
            output.totals.roas
          )}x`}
          tone={
            output.totals.roas >
            0
              ? "positive"
              : "negative"
          }
        />

        <MetricCard
          label="Zero-Purchase Spend"
          value={formatINRCompact(
            output.zeroPurchaseSpend
          )}
          tone={
            output.zeroPurchaseSpend >
            0
              ? "negative"
              : "positive"
          }
        />

        <MetricCard
          label="Zero-Purchase Share"
          value={formatPct(
            output.zeroPurchaseSpendShare
          )}
          tone={
            output.zeroPurchaseSpendShare >=
            25
              ? "negative"
              : output.zeroPurchaseSpendShare >
                  0
                ? "warning"
                : "positive"
          }
        />

        <MetricCard
          label="Checks Passed"
          value={formatNumberFull(
            output.issueCounts.pass
          )}
          tone="positive"
        />
      </div>

      <Card
        tone={
          criticalRows > 0
            ? "negative"
            : warningRows > 0
              ? "warning"
              : "positive"
        }
      >
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Source QC Read
            </CardTitle>

            <CardDescription>
              {(
                qcSummary
                  ?.shiftedRowsFixed ??
                0
              ) > 0
                ? `${qcSummary?.shiftedRowsFixed ?? 0} shifted Meta export row(s) were corrected before calculations. The source sheet should still be fixed and re-synced.`
                : "No shifted purchase rows were detected in the current loaded data."}
            </CardDescription>
          </CardHeaderText>

          {criticalRows > 0 ? (
            <ShieldAlert
              size={18}
              aria-hidden="true"
            />
          ) : warningRows > 0 ? (
            <TriangleAlert
              size={18}
              aria-hidden="true"
            />
          ) : (
            <ShieldCheck
              size={18}
              aria-hidden="true"
            />
          )}
        </CardHeader>

        <CardBody>
          <div className="mos-badge-stack">
            <Badge
              tone={
                output.issueCounts.critical >
                0
                  ? "negative"
                  : "positive"
              }
            >
              {
                output.issueCounts
                  .critical
              }{" "}
              critical checks
            </Badge>

            <Badge
              tone={
                output.issueCounts.warning >
                0
                  ? "warning"
                  : "positive"
              }
            >
              {
                output.issueCounts
                  .warning
              }{" "}
              warnings
            </Badge>

            <Badge>
              {
                output.issueCounts.info
              }{" "}
              informational
            </Badge>
          </div>
        </CardBody>
      </Card>

      <div className="mos-screen-controls">
        <SegmentedControl
          value={view}
          onChange={setView}
          ariaLabel="Data QC view"
          options={[
            {
              value: "checks",
              label: "Trust Checks",
            },
            {
              value:
                "source_rows",
              label: `Flagged Rows (${suspiciousRows.length})`,
            },
          ]}
        />

        {view ===
        "source_rows" ? (
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={
              <Download />
            }
            disabled={
              filteredSourceRows.length ===
              0
            }
            onClick={() =>
              exportQcRows(
                filteredSourceRows
              )
            }
          >
            Export QC
          </Button>
        ) : null}
      </div>

      {view === "checks" ? (
        <DataTable
          rows={output.issues}
          columns={issueColumns}
          getRowId={(issue) =>
            issue.code
          }
          ariaLabel="Meta data trust checks"
          caption="Protected Data QC engine checks"
          rowTone={(issue) =>
            issue.severity ===
            "critical"
              ? "negative"
              : issue.severity ===
                  "warning"
                ? "warning"
                : issue.severity ===
                    "pass"
                  ? "positive"
                  : "neutral"
          }
        />
      ) : (
        <>
          <TableToolbar
            search={{
              value: search,
              onChange: (value) => {
                setSearch(value);
                setPage(1);
              },
              placeholder:
                "Search campaign, ad, creative or flag",
              ariaLabel:
                "Search flagged Meta rows",
            }}
            filters={
              <SegmentedControl
                value={
                  sourceSeverity
                }
                onChange={(value) => {
                  setSourceSeverity(
                    value
                  );

                  setPage(1);
                }}
                ariaLabel="Source QC severity"
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
                    value:
                      "warning",
                    label:
                      "Warnings",
                  },
                ]}
              />
            }
            summary={`${filteredSourceRows.length.toLocaleString(
              "en-IN"
            )} flagged rows`}
          />

          <DataTable
            rows={
              visibleSourceRows
            }
            columns={
              sourceColumns
            }
            getRowId={(
              row,
              index
            ) =>
              [
                safeText(
                  row.adId
                ),
                safeText(
                  row.adName
                ),
                safeText(
                  row.date
                ),
                String(index),
              ].join("-")
            }
            ariaLabel="Flagged Meta source rows"
            caption="Rows containing critical or warning QC flags"
            rowTone={
              sourceRowTone
            }
            emptyTitle="No flagged rows found"
            emptyDescription="No source rows match the current search and severity selection."
          />

          <TablePagination
            page={safePage}
            pageSize={pageSize}
            totalRows={
              filteredSourceRows.length
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
        </>
      )}
    </div>
  );
}
