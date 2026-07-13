"use client";

import {
  AlertTriangle,
  BarChart3,
  Megaphone,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  useMemo,
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
} from "@/components/metaos-ui/primitives";

import {
  DataTable,
  type DataTableColumn,
  type DataTableTone,
} from "@/components/metaos-ui/table";

import {
  buildMetaV2ExecutiveSummary,
  type MetaV2SummaryCampaignRow,
  type MetaV2SummaryFatigueRow,
  type MetaV2SummaryIssue,
  type MetaV2SummaryMetricName,
  type MetaV2SummaryMetricRow,
  type MetaV2SummaryStatus,
} from "@/lib/meta-v2/engines/executiveSummaryEngine";

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

function statusTone(
  status: MetaV2SummaryStatus
) {
  if (status === "Critical") {
    return "negative" as const;
  }

  if (
    status === "Declining" ||
    status === "Rising"
  ) {
    return "warning" as const;
  }

  if (status === "Healthy") {
    return "positive" as const;
  }

  return "neutral" as const;
}

function issueTone(
  issue: MetaV2SummaryIssue
) {
  if (issue.severity === "critical") {
    return "negative" as const;
  }

  if (issue.severity === "warning") {
    return "warning" as const;
  }

  return "positive" as const;
}

function campaignTone(
  row: MetaV2SummaryCampaignRow
): DataTableTone {
  if (
    row.status === "Fatigue" ||
    row.status === "Low ROAS"
  ) {
    return "negative";
  }

  if (row.status === "Healthiest") {
    return "positive";
  }

  return "neutral";
}

function fatigueTone(
  row: MetaV2SummaryFatigueRow
): DataTableTone {
  if (
    row.status ===
    "Confirmed Fatigue"
  ) {
    return "negative";
  }

  if (
    row.status ===
    "Early Signal"
  ) {
    return "warning";
  }

  if (
    row.status ===
    "Healthiest"
  ) {
    return "positive";
  }

  return "neutral";
}

function formatSummaryMetric(
  metric: MetaV2SummaryMetricName,
  value: number
): string {
  switch (metric) {
    case "Spend":
    case "CPM":
    case "CPA":
      return formatINRCompact(value);

    case "Impressions":
    case "Reach":
    case "Purchases":
      return formatNumberCompact(value);

    case "Frequency":
      return `${formatRoas(value)}x`;

    case "CTR":
      return formatPct(value, 2);

    case "ROAS":
      return `${formatRoas(value)}x`;
  }
}

function movementTone(
  row: MetaV2SummaryMetricRow
) {
  const good = row.lowerIsBetter
    ? row.delta <= 0
    : row.delta >= 0;

  return good
    ? "positive"
    : "negative";
}

function movementText(
  row: MetaV2SummaryMetricRow
) {
  if (
    Math.abs(row.delta) <
    0.005
  ) {
    return "Stable";
  }

  const direction =
    row.delta > 0
      ? "↑"
      : "↓";

  return `${direction} ${formatPct(
    Math.abs(row.delta) * 100,
    1
  )}`;
}

export function SummaryModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

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
      buildMetaV2ExecutiveSummary(
        cleanRows
      ),
    [cleanRows]
  );

  const snapshotColumns =
    useMemo<
      DataTableColumn<MetaV2SummaryMetricRow>[]
    >(
      () => [
        {
          id: "metric",
          header: "Metric",
          minWidth: 130,
          sticky: "left",
          cell: (row) => (
            <strong className="mos-entity-title">
              {row.metric}
            </strong>
          ),
        },
        {
          id: "current",
          header: "Current 30D",
          align: "right",
          numeric: true,
          minWidth: 120,
          cell: (row) =>
            formatSummaryMetric(
              row.metric,
              row.current
            ),
          tone: (row) =>
            row.status ===
            "Critical"
              ? "negative"
              : "neutral",
        },
        {
          id: "prior",
          header: "Prior 30D",
          align: "right",
          numeric: true,
          minWidth: 120,
          cell: (row) =>
            formatSummaryMetric(
              row.metric,
              row.prior
            ),
        },
        {
          id: "last7",
          header: "Last 7D",
          align: "right",
          numeric: true,
          minWidth: 110,
          cell: (row) =>
            formatSummaryMetric(
              row.metric,
              row.last7
            ),
        },
        {
          id: "movement",
          header: "Change",
          align: "right",
          minWidth: 100,
          cell: (row) =>
            movementText(row),
          tone: (row) =>
            movementTone(row),
        },
        {
          id: "status",
          header: "Status",
          minWidth: 120,
          cell: (row) => (
            <Badge
              tone={statusTone(
                row.status
              )}
              dot
            >
              {row.status}
            </Badge>
          ),
        },
      ],
      []
    );

  const campaignColumns =
    useMemo<
      DataTableColumn<MetaV2SummaryCampaignRow>[]
    >(
      () => [
        {
          id: "campaign",
          header: "Campaign",
          minWidth: 300,
          sticky: "left",
          truncate: true,
          cell: (row) => (
            <div className="mos-entity-cell">
              <strong
                className="mos-entity-title"
                title={row.campaign}
              >
                {row.campaign}
              </strong>

              <span className="mos-entity-subtitle">
                Spend rank #{row.rank}
              </span>
            </div>
          ),
        },
        {
          id: "spend",
          header: "Spend",
          align: "right",
          numeric: true,
          minWidth: 110,
          cell: (row) =>
            formatINRCompact(
              row.spend
            ),
        },
        {
          id: "impressions",
          header: "Impressions",
          align: "right",
          numeric: true,
          minWidth: 112,
          cell: (row) =>
            formatNumberCompact(
              row.impressions
            ),
        },
        {
          id: "reach",
          header: "Reach",
          align: "right",
          numeric: true,
          minWidth: 100,
          cell: (row) =>
            formatNumberCompact(
              row.reach
            ),
        },
        {
          id: "ctr",
          header: "CTR",
          align: "right",
          numeric: true,
          minWidth: 82,
          cell: (row) =>
            formatPct(
              row.ctr,
              2
            ),
        },
        {
          id: "cpa",
          header: "CPA",
          align: "right",
          numeric: true,
          minWidth: 105,
          cell: (row) =>
            row.purchases > 0
              ? formatINRCompact(
                  row.cpa
                )
              : "No sale",
          tone: (row) =>
            row.purchases > 0
              ? "neutral"
              : "negative",
        },
        {
          id: "roas",
          header: "ROAS",
          align: "right",
          numeric: true,
          minWidth: 84,
          cell: (row) =>
            `${formatRoas(
              row.roas
            )}x`,
          tone: (row) =>
            row.status ===
            "Low ROAS"
              ? "negative"
              : row.status ===
                  "Healthiest"
                ? "positive"
                : "neutral",
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
        },
        {
          id: "frequency",
          header: "Frequency",
          align: "right",
          numeric: true,
          minWidth: 96,
          cell: (row) =>
            `${formatRoas(
              row.frequency
            )}x`,
          tone: (row) =>
            row.frequency >= 4
              ? "negative"
              : "positive",
        },
        {
          id: "status",
          header: "Status",
          minWidth: 120,
          cell: (row) => (
            <Badge
              tone={
                row.status ===
                  "Fatigue" ||
                row.status ===
                  "Low ROAS"
                  ? "negative"
                  : row.status ===
                      "Healthiest"
                    ? "positive"
                    : "neutral"
              }
            >
              {row.status}
            </Badge>
          ),
        },
      ],
      []
    );

  const fatigueColumns =
    useMemo<
      DataTableColumn<MetaV2SummaryFatigueRow>[]
    >(
      () => [
        {
          id: "campaign",
          header: "Campaign",
          minWidth: 300,
          sticky: "left",
          truncate: true,
          cell: (row) => (
            <strong
              className="mos-entity-title"
              title={row.campaign}
            >
              {row.campaign}
            </strong>
          ),
        },
        {
          id: "frequency",
          header: "Frequency",
          align: "right",
          numeric: true,
          minWidth: 100,
          cell: (row) =>
            `${formatRoas(
              row.frequency
            )}x`,
          tone: (row) =>
            row.frequency >= 4
              ? "negative"
              : "positive",
        },
        {
          id: "ctrTrend",
          header: "CTR Trend",
          align: "right",
          minWidth: 108,
          cell: (row) =>
            row.ctrTrend <
            -0.08
              ? `↓ ${formatPct(
                  Math.abs(
                    row.ctrTrend
                  ) * 100
                )}`
              : "Stable",
          tone: (row) =>
            row.ctrTrend <
            -0.08
              ? "negative"
              : "positive",
        },
        {
          id: "cpaTrend",
          header: "CPA Trend",
          align: "right",
          minWidth: 108,
          cell: (row) =>
            row.cpaTrend >
            0.08
              ? `↑ ${formatPct(
                  row.cpaTrend *
                    100
                )}`
              : "Stable",
          tone: (row) =>
            row.cpaTrend >
            0.08
              ? "negative"
              : "positive",
        },
        {
          id: "status",
          header: "Status",
          minWidth: 140,
          cell: (row) => (
            <Badge
              tone={
                row.status ===
                "Confirmed Fatigue"
                  ? "negative"
                  : row.status ===
                      "Early Signal"
                    ? "warning"
                    : row.status ===
                        "Healthiest"
                      ? "positive"
                      : "neutral"
              }
            >
              {row.status}
            </Badge>
          ),
        },
        {
          id: "action",
          header: "Action Required",
          minWidth: 220,
          cell: (row) =>
            row.action,
        },
      ],
      []
    );

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="Summary is ready"
        description="Refresh Meta data to activate the executive performance control room."
      />
    );
  }

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Executive control room"
        title="Meta Performance Summary"
        description="Current 30 days versus the prior 30 days, with campaign concentration, critical issues, fatigue signals, and immediate operator direction."
        actions={
          <>
            <Badge>
              Latest{" "}
              {formatDate(
                output.latestDate
              )}
            </Badge>

            <Badge
              tone={
                output.current
                  .roas >= 1
                  ? "positive"
                  : "negative"
              }
            >
              ROAS{" "}
              {formatRoas(
                output.current
                  .roas
              )}
              x
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Spend"
          value={formatINRCompact(
            output.current.spend
          )}
        />

        <MetricCard
          label="Revenue"
          value={formatINRCompact(
            output.current.revenue
          )}
          tone="positive"
        />

        <MetricCard
          label="Purchases"
          value={formatNumberCompact(
            output.current
              .purchases
          )}
        />

        <MetricCard
          label="CPA"
          value={formatINRCompact(
            output.current.cpa
          )}
          tone={
            output.current
              .purchases > 0
              ? "neutral"
              : "negative"
          }
        />

        <MetricCard
          label="ROAS"
          value={`${formatRoas(
            output.current.roas
          )}x`}
          tone={
            output.current
              .roas >= 1
              ? "positive"
              : "negative"
          }
        />

        <MetricCard
          label="Frequency"
          value={`${formatRoas(
            output.current
              .frequency
          )}x`}
          tone={
            output.current
              .frequency >= 3
              ? "negative"
              : "positive"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Performance Snapshot
            </CardTitle>

            <CardDescription>
              Current 30 days, prior 30 days, and the most recent seven days.
            </CardDescription>
          </CardHeaderText>

          <TrendingDown
            size={17}
            aria-hidden="true"
          />
        </CardHeader>

        <CardBody>
          <DataTable
            rows={
              output.snapshotMetrics
            }
            columns={
              snapshotColumns
            }
            getRowId={(row) =>
              row.metric
            }
            ariaLabel="Meta performance snapshot"
            caption="Current, prior and last-seven-day Meta performance"
            rowTone={(row) =>
              row.status ===
              "Critical"
                ? "negative"
                : row.status ===
                      "Declining" ||
                    row.status ===
                      "Rising"
                  ? "warning"
                  : row.status ===
                      "Healthy"
                    ? "positive"
                    : "neutral"
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Critical Issues
            </CardTitle>

            <CardDescription>
              Structural risks identified by the executive summary engine.
            </CardDescription>
          </CardHeaderText>

          <AlertTriangle
            size={17}
            aria-hidden="true"
          />
        </CardHeader>

        <CardBody>
          <div className="mos-summary-issue-grid">
            {output.issues.map(
              (issue) => (
                <Card
                  key={issue.id}
                  density="compact"
                  tone={issueTone(
                    issue
                  )}
                >
                  <CardHeader>
                    <CardHeaderText>
                      <CardTitle>
                        {issue.title}
                      </CardTitle>

                      <CardDescription>
                        {issue.detail}
                      </CardDescription>
                    </CardHeaderText>
                  </CardHeader>
                </Card>
              )
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Campaign Performance
            </CardTitle>

            <CardDescription>
              Top campaigns ranked by spend with efficiency and fatigue status.
            </CardDescription>
          </CardHeaderText>

          <BarChart3
            size={17}
            aria-hidden="true"
          />
        </CardHeader>

        <CardBody>
          <DataTable
            rows={output.campaigns.slice(
              0,
              12
            )}
            columns={
              campaignColumns
            }
            getRowId={(row) =>
              row.id
            }
            ariaLabel="Campaign performance breakdown"
            caption="Top 12 Meta campaigns by spend"
            rowTone={
              campaignTone
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Creative Fatigue Assessment
            </CardTitle>

            <CardDescription>
              Campaign-level frequency, CTR deterioration, CPA inflation, and action urgency.
            </CardDescription>
          </CardHeaderText>

          <Zap
            size={17}
            aria-hidden="true"
          />
        </CardHeader>

        <CardBody>
          <DataTable
            rows={output.fatigue}
            columns={
              fatigueColumns
            }
            getRowId={(row) =>
              row.id
            }
            ariaLabel="Campaign fatigue assessment"
            caption="Campaign fatigue and action recommendations"
            rowTone={
              fatigueTone
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Operator Direction
            </CardTitle>

            <CardDescription>
              Immediate account-level actions before allocating additional budget.
            </CardDescription>
          </CardHeaderText>

          <Megaphone
            size={17}
            aria-hidden="true"
          />
        </CardHeader>

        <CardBody>
          <div className="mos-summary-direction-grid">
            <Card
              density="compact"
              tone="negative"
            >
              <CardHeader>
                <CardHeaderText>
                  <CardTitle>
                    Cut First
                  </CardTitle>

                  <CardDescription>
                    Pause or reduce zero-conversion spend and high-frequency fatigue pockets before moving more budget.
                  </CardDescription>
                </CardHeaderText>

                <TrendingDown
                  size={16}
                  aria-hidden="true"
                />
              </CardHeader>
            </Card>

            <Card
              density="compact"
              tone="positive"
            >
              <CardHeader>
                <CardHeaderText>
                  <CardTitle>
                    Protect Winners
                  </CardTitle>

                  <CardDescription>
                    Keep stable ROAS campaigns untouched. Do not edit winning ads unless fatigue is visible.
                  </CardDescription>
                </CardHeaderText>

                <ShieldCheck
                  size={16}
                  aria-hidden="true"
                />
              </CardHeader>
            </Card>

            <Card
              density="compact"
              tone="warning"
            >
              <CardHeader>
                <CardHeaderText>
                  <CardTitle>
                    Refresh Creatives
                  </CardTitle>

                  <CardDescription>
                    For campaigns with rising frequency and declining CTR, create new first-three-second hooks within 48 hours.
                  </CardDescription>
                </CardHeaderText>

                <TrendingUp
                  size={16}
                  aria-hidden="true"
                />
              </CardHeader>
            </Card>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
