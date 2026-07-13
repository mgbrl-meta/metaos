"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Cell,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Download,
} from "lucide-react";

import {
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardHeaderText,
  CardTitle,
  EmptyState,
  PageHeader,
  SegmentedControl,
} from "@/components/metaos-ui/primitives";

import {
  normalizeMetaV2Rows,
} from "@/lib/meta-v2/normalize";

import {
  buildCreativeScalingOutput,
} from "@/lib/meta-v2/creative-scaling/creativeScalingEngine";

import {
  buildCreativeScalingCsv,
} from "@/lib/meta-v2/creative-scaling/creativeScalingExport";

import type {
  CreativeScalingDecision,
  CreativeScalingPoint,
  CreativeScalingWindow,
} from "@/lib/meta-v2/creative-scaling/schema";

import {
  useMetaStore,
} from "@/store/metaStore";

import {
  useMetaV2SettingsStore,
} from "@/store/metaV2SettingsStore";

const WINDOW_OPTIONS = [
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
    value: "90",
    label: "90D",
  },
  {
    value: "0",
    label: "All",
  },
] as const;

const DECISION_COLORS = {
  scale: "var(--mos-positive)",
  watch: "#4f83cc",
  kill: "var(--mos-negative)",
} as const;

function money(value: number) {
  return `₹${Math.round(
    value || 0
  ).toLocaleString("en-IN")}`;
}

function number(
  value: number
) {
  return Number(
    value || 0
  ).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function percent(
  value: number
) {
  return `${(
    value * 100
  ).toFixed(1)}%`;
}

function CreativeScalingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: CreativeScalingPoint;
  }>;
}) {
  const point =
    payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="mos-scaling-tooltip">
      <strong>
        {point.adName ||
          point.adId}
      </strong>

      <span>
        {point.campaignName}
      </span>

      <dl>
        <div>
          <dt>Decision</dt>
          <dd>
            {point.decision.toUpperCase()}
          </dd>
        </div>

        <div>
          <dt>Spend</dt>
          <dd>
            {money(point.spend)}
          </dd>
        </div>

        <div>
          <dt>CPA</dt>
          <dd>
            {point.cpa === null
              ? "No purchases"
              : money(point.cpa)}
          </dd>
        </div>

        <div>
          <dt>Purchases</dt>
          <dd>
            {number(
              point.purchases
            )}
          </dd>
        </div>

        <div>
          <dt>ROAS</dt>
          <dd>
            {point.roas.toFixed(
              2
            )}
            x
          </dd>
        </div>

        <div>
          <dt>Yesterday spend</dt>
          <dd>
            {money(
              point.yesterdaySpend
            )}
          </dd>
        </div>

        <div>
          <dt>Confidence</dt>
          <dd>
            {
              point.confidenceLabel
            }
          </dd>
        </div>
      </dl>
    </div>
  );
}

function downloadCsv(
  csv: string,
  filename: string
) {
  const blob =
    new Blob([csv], {
      type:
        "text/csv;charset=utf-8",
    });

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function CreativeScalingModule() {
  const performanceRows =
    useMetaStore(
      (state) =>
        state.performanceRows
    );

  const defaultTargetCpa =
    useMetaV2SettingsStore(
      (state) =>
        state.settings.targetCpa
    );

  const [targetCpa, setTargetCpa] =
    useState(
      Math.max(
        1,
        defaultTargetCpa
      )
    );

  const [
    selectedWindow,
    setSelectedWindow,
  ] = useState<CreativeScalingWindow>(
    30
  );

  const [
    selectedDecision,
    setSelectedDecision,
  ] = useState<
    CreativeScalingDecision | "all"
  >("all");

  const cleanRows = useMemo(
    () =>
      normalizeMetaV2Rows(
        (
          performanceRows || []
        ) as unknown as Record<
          string,
          unknown
        >[]
      ),
    [performanceRows]
  );

  const output = useMemo(
    () =>
      buildCreativeScalingOutput(
        cleanRows,
        {
          targetCpa:
            Math.max(
              1,
              targetCpa
            ),

          confidence: 0.9,

          windowDays:
            selectedWindow,

          minPurchasesToScale:
            3,

          minEvidenceMultiple:
            2,
        }
      ),
    [
      cleanRows,
      selectedWindow,
      targetCpa,
    ]
  );

  const visiblePoints =
    useMemo(
      () =>
        selectedDecision ===
        "all"
          ? output.points
          : output.points.filter(
              (point) =>
                point.decision ===
                selectedDecision
            ),
      [
        output.points,
        selectedDecision,
      ]
    );

  const graphPoints =
    useMemo(() => {
      const cap =
        Math.max(
          targetCpa * 8,
          ...output.points.map(
            (point) =>
              point.cpa ??
              targetCpa * 8
          )
        );

      return output.points.map(
        (point) => ({
          ...point,
          graphCpa:
            point.cpa ??
            cap,
        })
      );
    }, [
      output.points,
      targetCpa,
    ]);

  if (!performanceRows.length) {
    return (
      <EmptyState
        title="Creative Scaling is ready"
        description="Refresh Meta data to classify ads that were live on the latest reporting date."
      />
    );
  }

  const exportPoints =
    visiblePoints;

  return (
    <div className="mos-scaling-page">
      <PageHeader
        eyebrow="Creative intelligence"
        title="Creative Scaling"
        description="Statistical scale, watch and kill classification for ads that were live on the latest reporting date."
        meta={
          <span>
            Eligibility date:{" "}
            {output.latestDate ||
              "No date"}
          </span>
        }
        actions={
          <Button
            size="sm"
            leadingIcon={
              <Download size={13} />
            }
            onClick={() =>
              downloadCsv(
                buildCreativeScalingCsv(
                  exportPoints
                ),
                `creative-scaling-${output.latestDate || "export"}.csv`
              )
            }
            disabled={
              exportPoints.length ===
              0
            }
          >
            Export{" "}
            {selectedDecision ===
            "all"
              ? "all"
              : selectedDecision}
          </Button>
        }
      />

      <Card className="mos-scaling-control-card">
        <CardBody>
          <div className="mos-scaling-controls">
            <label className="mos-scaling-cpa-field">
              <span>
                Target CPA
              </span>

              <div>
                <b>₹</b>

                <input
                  type="number"
                  min="1"
                  step="50"
                  value={targetCpa}
                  onChange={(
                    event
                  ) =>
                    setTargetCpa(
                      Math.max(
                        1,
                        Number(
                          event
                            .target
                            .value
                        ) || 1
                      )
                    )
                  }
                />
              </div>
            </label>

            <div className="mos-scaling-window">
              <span>
                Analysis window
              </span>

              <SegmentedControl
                ariaLabel="Creative scaling analysis window"
                value={String(
                  selectedWindow
                )}
                options={
                  WINDOW_OPTIONS
                }
                onChange={(
                  value
                ) =>
                  setSelectedWindow(
                    Number(
                      value
                    ) as CreativeScalingWindow
                  )
                }
              />
            </div>

            <div className="mos-scaling-model-note">
              <strong>
                90% Poisson confidence
              </strong>

              <span>
                Eligibility is always based on ads that delivered on {output.latestDate || "the latest date"}.
              </span>
            </div>
          </div>

          <div className="mos-scaling-thresholds">
            {output.thresholds.map(
              (threshold) => (
                <div
                  key={
                    threshold.spend
                  }
                >
                  <strong>
                    At{" "}
                    {money(
                      threshold.spend
                    )}{" "}
                    spend
                  </strong>

                  <span className="is-scale">
                    Scale ≤{" "}
                    {money(
                      threshold.scaleCpa
                    )}
                  </span>

                  <span className="is-watch">
                    Watch between
                  </span>

                  <span className="is-kill">
                    Kill ≥{" "}
                    {money(
                      threshold.killCpa
                    )}
                  </span>
                </div>
              )
            )}
          </div>
        </CardBody>
      </Card>

      <div className="mos-scaling-summary">
        <button
          type="button"
          className={[
            "mos-scaling-summary-item",
            "is-scale",
            selectedDecision ===
            "scale"
              ? "is-selected"
              : "",
          ].join(" ")}
          onClick={() =>
            setSelectedDecision(
              selectedDecision ===
                "scale"
                ? "all"
                : "scale"
            )
          }
        >
          <span>SCALE</span>
          <strong>
            {
              output.summary
                .scaleAds
            }{" "}
            ads
          </strong>
          <small>
            {money(
              output.summary
                .scaleSpend
            )}
          </small>
        </button>

        <button
          type="button"
          className={[
            "mos-scaling-summary-item",
            "is-watch",
            selectedDecision ===
            "watch"
              ? "is-selected"
              : "",
          ].join(" ")}
          onClick={() =>
            setSelectedDecision(
              selectedDecision ===
                "watch"
                ? "all"
                : "watch"
            )
          }
        >
          <span>WATCH</span>
          <strong>
            {
              output.summary
                .watchAds
            }{" "}
            ads
          </strong>
          <small>
            {money(
              output.summary
                .watchSpend
            )}
          </small>
        </button>

        <button
          type="button"
          className={[
            "mos-scaling-summary-item",
            "is-kill",
            selectedDecision ===
            "kill"
              ? "is-selected"
              : "",
          ].join(" ")}
          onClick={() =>
            setSelectedDecision(
              selectedDecision ===
                "kill"
                ? "all"
                : "kill"
            )
          }
        >
          <span>KILL</span>
          <strong>
            {
              output.summary
                .killAds
            }{" "}
            ads
          </strong>
          <small>
            {money(
              output.summary
                .killSpend
            )}
          </small>
        </button>
      </div>

      <Card className="mos-scaling-chart-card">
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              CPA confidence map
            </CardTitle>

            <CardDescription>
              X-axis is selected-window spend on a logarithmic scale. Y-axis is CPA. Green is statistically scalable, red is statistically unlikely to recover, and blue requires more evidence.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-scaling-chart">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <ComposedChart
                margin={{
                  top: 20,
                  right: 28,
                  bottom: 18,
                  left: 12,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--mos-border)"
                  strokeDasharray="3 4"
                />

                <XAxis
                  type="number"
                  dataKey="spend"
                  scale="log"
                  domain={["auto", "auto"]}
                  allowDataOverflow
                  tickFormatter={money}
                  tick={{
                    fill:
                      "var(--mos-text-tertiary)",
                    fontSize: 9,
                  }}
                  name="Spend"
                />

                <YAxis
                  type="number"
                  dataKey="graphCpa"
                  domain={[0, "auto"]}
                  tickFormatter={money}
                  tick={{
                    fill:
                      "var(--mos-text-tertiary)",
                    fontSize: 9,
                  }}
                  name="CPA"
                />

                <Tooltip
                  content={
                    <CreativeScalingTooltip />
                  }
                />

                <Legend
                  wrapperStyle={{
                    fontSize: 10,
                  }}
                />

                <Line
                  data={
                    output.curves
                  }
                  type="monotone"
                  dataKey="scaleCpa"
                  name="Scale boundary"
                  stroke="var(--mos-positive)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={
                    false
                  }
                />

                <Line
                  data={
                    output.curves
                  }
                  type="monotone"
                  dataKey="killCpa"
                  name="Kill boundary"
                  stroke="var(--mos-negative)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={
                    false
                  }
                />

                <Scatter
                  name="Live ads"
                  data={graphPoints}
                  dataKey="graphCpa"
                  isAnimationActive={
                    true
                  }
                  animationDuration={
                    500
                  }
                >
                  {graphPoints.map(
                    (point) => (
                      <Cell
                        key={
                          point.adId
                        }
                        fill={
                          DECISION_COLORS[
                            point
                              .decision
                          ]
                        }
                        fillOpacity={
                          point.evidence ===
                          "insufficient"
                            ? 0.56
                            : 0.88
                        }
                        stroke="var(--mos-surface)"
                        strokeWidth={
                          1.2
                        }
                      />
                    )
                  )}
                </Scatter>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardHeaderText>
            <CardTitle>
              Export-ready ad evidence
            </CardTitle>

            <CardDescription>
              Only ads that delivered on the latest reporting date are included. The table reflects the active decision filter.
            </CardDescription>
          </CardHeaderText>
        </CardHeader>

        <CardBody>
          <div className="mos-scaling-table-wrap">
            <table className="mos-scaling-table">
              <thead>
                <tr>
                  <th>Decision</th>
                  <th>Ad</th>
                  <th>Campaign</th>
                  <th>Spend</th>
                  <th>Purchases</th>
                  <th>CPA</th>
                  <th>ROAS</th>
                  <th>Yesterday</th>
                  <th>Confidence</th>
                </tr>
              </thead>

              <tbody>
                {visiblePoints.map(
                  (point) => (
                    <tr
                      key={
                        point.adId
                      }
                    >
                      <td>
                        <span
                          className={`mos-scaling-decision is-${point.decision}`}
                        >
                          {
                            point.decision
                          }
                        </span>
                      </td>

                      <td>
                        <strong>
                          {point.adName ||
                            point.adId}
                        </strong>
                        <small>
                          {
                            point.adSetName
                          }
                        </small>
                      </td>

                      <td>
                        {
                          point.campaignName
                        }
                      </td>

                      <td>
                        {money(
                          point.spend
                        )}
                      </td>

                      <td>
                        {number(
                          point.purchases
                        )}
                      </td>

                      <td>
                        {point.cpa ===
                        null
                          ? "No purchase"
                          : money(
                              point.cpa
                            )}
                      </td>

                      <td>
                        {point.roas.toFixed(
                          2
                        )}
                        x
                      </td>

                      <td>
                        {money(
                          point.yesterdaySpend
                        )}
                      </td>

                      <td>
                        <span>
                          {
                            point.confidenceLabel
                          }
                        </span>
                        <small>
                          Kill{" "}
                          {percent(
                            point.killProbability
                          )}
                        </small>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
