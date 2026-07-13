"use client";

import { useMemo } from "react";

import {
  AlertTriangle,
  Banknote,
  ShoppingBag,
  Target,
  TrendingUp,
} from "lucide-react";

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
  formatINRCompact,
  formatNumberCompact,
  formatRoas,
} from "@/lib/meta-v2/formatters";

import { buildMetaV2CommandCenter } from "@/lib/meta-v2/engines/commandCenterEngine";
import { normalizeMetaV2Rows } from "@/lib/meta-v2/normalize";

import { useMetaStore } from "@/store/metaStore";
import { useMetaV2SettingsStore } from "@/store/metaV2SettingsStore";

export function CommandCenterModule() {
  const performanceRows = useMetaStore(
    (state) => state.performanceRows
  );

  const fetchedAt = useMetaStore(
    (state) => state.metaFetchedAt
  );

  const settings =
    useMetaV2SettingsStore(
      (state) => state.settings
    );

  const cleanRows = useMemo(
    () =>
      normalizeMetaV2Rows(
        (performanceRows ||
          []) as unknown as Record<
          string,
          unknown
        >[]
      ),
    [performanceRows]
  );

  const output = useMemo(
    () =>
      buildMetaV2CommandCenter(
        cleanRows,
        settings,
        fetchedAt
      ),
    [cleanRows, settings, fetchedAt]
  );

  if (!cleanRows.length) {
    return (
      <EmptyState
        title="Command Center is ready"
        description="MetaOS is connecting to the complete Meta dataset. The account verdict will appear automatically after the refresh completes."
      />
    );
  }

  const roasPositive =
    output.totals.roas >=
    settings.targetRoas;

  const cpaPositive =
    output.totals.cpa > 0 &&
    output.totals.cpa <=
      settings.targetCpa;

  const healthTone =
    output.healthScore >= 70
      ? "positive"
      : output.healthScore < 50
        ? "negative"
        : "warning";

  const readinessTone =
    output.scaleReadiness === "High"
      ? "positive"
      : output.scaleReadiness === "Low"
        ? "negative"
        : "warning";

  return (
    <div className="mos-page-stack">
      <PageHeader
        eyebrow="Account verdict"
        title="Performance Command Center"
        description={output.verdict}
        actions={
          <>
            <Badge tone={healthTone}>
              Health {output.healthScore}/100
            </Badge>

            <Badge tone={readinessTone}>
              Scale readiness{" "}
              {output.scaleReadiness}
            </Badge>
          </>
        }
      />

      <div className="mos-metric-grid">
        <MetricCard
          label="Spend"
          value={formatINRCompact(
            output.totals.spend
          )}
          icon={<Banknote />}
        />

        <MetricCard
          label="Revenue"
          value={formatINRCompact(
            output.totals.revenue
          )}
          tone="positive"
          icon={<TrendingUp />}
        />

        <MetricCard
          label="ROAS"
          value={formatRoas(
            output.totals.roas
          )}
          tone={
            roasPositive
              ? "positive"
              : "negative"
          }
          note={`Target ${formatRoas(
            settings.targetRoas
          )}`}
          icon={<Target />}
        />

        <MetricCard
          label="CPA"
          value={formatINRCompact(
            output.totals.cpa
          )}
          tone={
            cpaPositive
              ? "positive"
              : "negative"
          }
          note={`Target ${formatINRCompact(
            settings.targetCpa
          )}`}
          icon={<ShoppingBag />}
        />

        <MetricCard
          label="Purchases"
          value={formatNumberCompact(
            output.totals.purchases
          )}
          icon={<ShoppingBag />}
        />

        <MetricCard
          label="GPT"
          value={formatINRCompact(
            output.totals.gpt
          )}
          tone={
            output.totals.gpt >=
            settings.targetGpt
              ? "positive"
              : "negative"
          }
          note={`Target ${formatINRCompact(
            settings.targetGpt
          )}`}
        />
      </div>

      <div className="mos-command-details">
        <Card>
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Immediate operating direction
              </CardTitle>

              <CardDescription>
                {output.biggestOpportunity}
              </CardDescription>
            </CardHeaderText>
          </CardHeader>

          <CardBody>
            <div className="mos-action-grid">
              <MetricCard
                compact
                label="Scale"
                value={
                  output.actionCounts.scale
                }
                tone="positive"
              />

              <MetricCard
                compact
                label="Reduce"
                value={
                  output.actionCounts.reduce
                }
                tone="negative"
              />

              <MetricCard
                compact
                label="Kill"
                value={
                  output.actionCounts.kill
                }
                tone="negative"
              />

              <MetricCard
                compact
                label="Refresh"
                value={
                  output.actionCounts.refresh
                }
              />

              <MetricCard
                compact
                label="Watch"
                value={
                  output.actionCounts.watch
                }
              />
            </div>
          </CardBody>
        </Card>

        <Card
          tone={
            output.scaleReadiness ===
            "Low"
              ? "negative"
              : output.scaleReadiness ===
                  "High"
                ? "positive"
                : "warning"
          }
        >
          <CardHeader>
            <CardHeaderText>
              <CardTitle>
                Primary account risk
              </CardTitle>

              <CardDescription>
                {output.biggestRisk}
              </CardDescription>
            </CardHeaderText>

            <AlertTriangle
              size={15}
              aria-hidden="true"
            />
          </CardHeader>

          <CardBody>
            <Badge tone={readinessTone}>
              {output.scaleReadiness} readiness
            </Badge>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
