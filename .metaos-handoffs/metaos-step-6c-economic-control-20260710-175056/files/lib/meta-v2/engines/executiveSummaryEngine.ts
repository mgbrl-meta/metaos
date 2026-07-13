import {
  addMetaV2Days,
  filterMetaV2RowsByDateRange,
  getMetaV2DateRange,
  getMetaV2InclusiveDateRange,
  getMetaV2RelativeChange,
  groupMetaV2RowsByAd,
  groupMetaV2RowsByKey,
} from "@/lib/meta-v2/engineUtils";

import {
  getMetaV2SpendShare,
} from "@/lib/meta-v2/decisionRules";

import {
  calculateMetaV2Totals,
} from "@/lib/meta-v2/metrics";

import type {
  MetaV2CleanRow,
  MetaV2Totals,
} from "@/lib/meta-v2/schema";

export type MetaV2SummaryMetricName =
  | "Spend"
  | "Impressions"
  | "Reach"
  | "Frequency"
  | "CTR"
  | "CPM"
  | "CPA"
  | "ROAS"
  | "Purchases";

export type MetaV2SummaryStatus =
  | "Critical"
  | "Declining"
  | "Rising"
  | "Watch"
  | "Healthy"
  | "Stable";

export type MetaV2SummaryIssueSeverity =
  | "critical"
  | "warning"
  | "positive";

export type MetaV2CampaignStatus =
  | "Fatigue"
  | "Low ROAS"
  | "Healthiest"
  | `Pareto #${number}`;

export type MetaV2FatigueStatus =
  | "Confirmed Fatigue"
  | "Early Signal"
  | "Healthiest"
  | "No Fatigue";

export interface MetaV2SummaryMetricRow {
  metric: MetaV2SummaryMetricName;
  current: number;
  prior: number;
  last7: number;
  delta: number;
  lowerIsBetter: boolean;
  status: MetaV2SummaryStatus;
}

export interface MetaV2SummaryCampaignRow
  extends MetaV2Totals {
  id: string;
  campaign: string;
  rank: number;
  status: MetaV2CampaignStatus;
}

export interface MetaV2SummaryIssue {
  id: string;
  title: string;
  detail: string;
  severity: MetaV2SummaryIssueSeverity;
}

export interface MetaV2SummaryFatigueRow
  extends MetaV2Totals {
  id: string;
  campaign: string;
  ctrTrend: number;
  cpaTrend: number;
  status: MetaV2FatigueStatus;
  action: string;
}

export interface MetaV2ExecutiveSummaryOutput {
  latestDate: string;

  current: MetaV2Totals;
  prior: MetaV2Totals;
  last7: MetaV2Totals;

  snapshotMetrics:
    MetaV2SummaryMetricRow[];

  campaigns:
    MetaV2SummaryCampaignRow[];

  issues:
    MetaV2SummaryIssue[];

  fatigue:
    MetaV2SummaryFatigueRow[];
}

const SUMMARY_METRICS: readonly MetaV2SummaryMetricName[] =
  [
    "Spend",
    "Impressions",
    "Reach",
    "Frequency",
    "CTR",
    "CPM",
    "CPA",
    "ROAS",
    "Purchases",
  ];

function getMetricValue(
  metric: MetaV2SummaryMetricName,
  totals: MetaV2Totals
): number {
  switch (metric) {
    case "Spend":
      return totals.spend;

    case "Impressions":
      return totals.impressions;

    case "Reach":
      return totals.reach;

    case "Frequency":
      return totals.frequency;

    case "CTR":
      return totals.ctr;

    case "CPM":
      return totals.cpm;

    case "CPA":
      return totals.cpa;

    case "ROAS":
      return totals.roas;

    case "Purchases":
      return totals.purchases;
  }
}

function isLowerBetterMetric(
  metric: MetaV2SummaryMetricName
): boolean {
  return [
    "Frequency",
    "CPM",
    "CPA",
  ].includes(metric);
}

function getMetricStatus(
  metric: MetaV2SummaryMetricName,
  value: number,
  delta: number
): MetaV2SummaryStatus {
  if (metric === "Frequency") {
    if (
      value >= 4 ||
      delta > 0.25
    ) {
      return "Critical";
    }

    if (
      value >= 2.5 ||
      delta > 0.1
    ) {
      return "Watch";
    }

    return "Healthy";
  }

  if (
    [
      "ROAS",
      "CTR",
      "Reach",
      "Purchases",
    ].includes(metric)
  ) {
    if (delta <= -0.25) {
      return "Critical";
    }

    if (delta <= -0.1) {
      return "Declining";
    }

    return "Stable";
  }

  if (
    [
      "CPA",
      "CPM",
    ].includes(metric)
  ) {
    if (delta >= 0.25) {
      return "Critical";
    }

    if (delta >= 0.1) {
      return "Rising";
    }

    return "Stable";
  }

  if (delta <= -0.2) {
    return "Declining";
  }

  return "Stable";
}

function buildCampaignRows(
  rows: MetaV2CleanRow[]
): MetaV2SummaryCampaignRow[] {
  const groups =
    groupMetaV2RowsByKey(
      rows,
      (row) =>
        row.campaignName
    );

  return Array.from(
    groups.entries()
  )
    .map(
      ([
        campaign,
        campaignRows,
      ]) => ({
        id: campaign,
        campaign,
        rank: 0,
        status:
          "Pareto #1" as MetaV2CampaignStatus,
        ...calculateMetaV2Totals(
          campaignRows
        ),
      })
    )
    .sort(
      (left, right) =>
        right.spend -
        left.spend
    )
    .map(
      (campaign, index) => {
        let status:
          MetaV2CampaignStatus =
          `Pareto #${index + 1}`;

        if (
          campaign.frequency >=
          6
        ) {
          status = "Fatigue";
        } else if (
          campaign.roas < 0.7 &&
          campaign.spend >
            1000
        ) {
          status = "Low ROAS";
        } else if (
          campaign.frequency <=
            2.5 &&
          campaign.roas >= 1
        ) {
          status = "Healthiest";
        }

        return {
          ...campaign,
          rank: index + 1,
          status,
        };
      }
    );
}

function buildAdTotals(
  rows: MetaV2CleanRow[]
): MetaV2Totals[] {
  return Array.from(
    groupMetaV2RowsByAd(
      rows
    ).values()
  ).map(
    (adRows) =>
      calculateMetaV2Totals(
        adRows
      )
  );
}

function buildIssues(
  current: MetaV2Totals,
  prior: MetaV2Totals,
  campaigns:
    MetaV2SummaryCampaignRow[],
  ads: MetaV2Totals[]
): MetaV2SummaryIssue[] {
  const issues:
    MetaV2SummaryIssue[] = [];

  const topFrequencyCampaign =
    campaigns
      .slice()
      .sort(
        (left, right) =>
          right.frequency -
          left.frequency
      )
      .at(0);

  const zeroConversionSpend =
    ads
      .filter(
        (ad) =>
          ad.spend > 1000 &&
          ad.purchases <= 0
      )
      .reduce(
        (sum, ad) =>
          sum + ad.spend,
        0
      );

  if (
    current.frequency >= 3
  ) {
    issues.push({
      id: "audience-saturation",
      title:
        "Audience Saturation",
      detail:
        `Frequency is ${current.frequency.toFixed(
          2
        )}x. If reach is declining while frequency rises, the account is recycling the same audience.`,
      severity: "critical",
    });
  }

  if (
    topFrequencyCampaign &&
    topFrequencyCampaign.frequency >=
      4
  ) {
    issues.push({
      id: "creative-fatigue",
      title:
        "Creative Fatigue",
      detail:
        `${topFrequencyCampaign.campaign} has frequency ${topFrequencyCampaign.frequency.toFixed(
          2
        )}x. Check CTR and CPA movement before scaling.`,
      severity:
        topFrequencyCampaign.frequency >=
        6
          ? "critical"
          : "warning",
    });
  }

  if (
    zeroConversionSpend > 0
  ) {
    issues.push({
      id: "zero-conversion-spend",
      title:
        "Zero-Conversion Spend",
      detail:
        `₹${Math.round(
          zeroConversionSpend
        ).toLocaleString(
          "en-IN"
        )} was spent on ads with zero purchases during the current 30-day window.`,
      severity: "critical",
    });
  }

  const roasChange =
    getMetaV2RelativeChange(
      current.roas,
      prior.roas
    );

  if (roasChange <= -0.1) {
    issues.push({
      id: "performance-decline",
      title:
        "Performance Decline",
      detail:
        `ROAS is down ${Math.abs(
          roasChange * 100
        ).toFixed(
          0
        )}% versus the prior 30 days. Audit budget shifts, winner concentration and offer fatigue.`,
      severity: "warning",
    });
  }

  const totalSpend =
    campaigns.reduce(
      (sum, campaign) =>
        sum +
        campaign.spend,
      0
    );

  const topFourSpend =
    campaigns
      .slice(0, 4)
      .reduce(
        (sum, campaign) =>
          sum +
          campaign.spend,
        0
      );

  const topFourShare =
    getMetaV2SpendShare(
      topFourSpend,
      totalSpend
    );

  if (topFourShare >= 75) {
    issues.push({
      id: "budget-concentration",
      title:
        "Budget Concentration",
      detail:
        `The top four campaigns control ${topFourShare.toFixed(
          0
        )}% of spend, creating dependency risk if one winner fatigues.`,
      severity: "warning",
    });
  }

  const prospectingSpend =
    campaigns
      .filter(
        (campaign) =>
          /tof|prospecting|broad|catalog|cold/i.test(
            campaign.campaign
          )
      )
      .reduce(
        (sum, campaign) =>
          sum +
          campaign.spend,
        0
      );

  const prospectingShare =
    getMetaV2SpendShare(
      prospectingSpend,
      totalSpend
    );

  if (
    prospectingShare > 0 &&
    prospectingShare < 25
  ) {
    issues.push({
      id: "prospecting-deficit",
      title:
        "Prospecting Deficit",
      detail:
        `Only ${prospectingShare.toFixed(
          0
        )}% of spend appears prospecting-led. A retargeting-heavy mix can deplete reach.`,
      severity: "warning",
    });
  }

  if (!issues.length) {
    issues.push({
      id: "no-critical-issue",
      title:
        "No Critical Structural Issue",
      detail:
        "The current 30-day window does not show a major structural failure. Continue daily monitoring.",
      severity: "positive",
    });
  }

  return issues.slice(0, 6);
}

function buildFatigueRows(
  currentCampaigns:
    MetaV2SummaryCampaignRow[],
  priorRows: MetaV2CleanRow[]
): MetaV2SummaryFatigueRow[] {
  const priorCampaigns =
    buildCampaignRows(
      priorRows
    );

  const priorMap = new Map(
    priorCampaigns.map(
      (campaign) => [
        campaign.campaign,
        campaign,
      ]
    )
  );

  return currentCampaigns
    .map((campaign) => {
      const prior =
        priorMap.get(
          campaign.campaign
        );

      const ctrTrend =
        prior
          ? getMetaV2RelativeChange(
              campaign.ctr,
              prior.ctr
            )
          : 0;

      const cpaTrend =
        prior
          ? getMetaV2RelativeChange(
              campaign.cpa,
              prior.cpa
            )
          : 0;

      let status:
        MetaV2FatigueStatus =
        "No Fatigue";

      let action =
        "Monitor daily";

      if (
        campaign.frequency >=
          6 &&
        ctrTrend < -0.08 &&
        cpaTrend > 0.08
      ) {
        status =
          "Confirmed Fatigue";

        action =
          "Reduce 30–50% today";
      } else if (
        campaign.frequency >=
          4 ||
        (
          ctrTrend < -0.08 &&
          cpaTrend > 0.08
        )
      ) {
        status =
          "Early Signal";

        action =
          "Refresh within 48 hours";
      } else if (
        campaign.frequency <=
          2.5 &&
        campaign.roas >= 1
      ) {
        status =
          "Healthiest";

        action =
          "Consider budget increase";
      }

      return {
        ...campaign,
        ctrTrend,
        cpaTrend,
        status,
        action,
      };
    })
    .sort(
      (left, right) => {
        const score = (
          status:
            MetaV2FatigueStatus
        ) => {
          if (
            status ===
            "Confirmed Fatigue"
          ) {
            return 3;
          }

          if (
            status ===
            "Early Signal"
          ) {
            return 2;
          }

          if (
            status ===
            "Healthiest"
          ) {
            return -1;
          }

          return 1;
        };

        return (
          score(right.status) -
            score(left.status) ||
          right.spend -
            left.spend
        );
      }
    )
    .slice(0, 8);
}

export function buildMetaV2ExecutiveSummary(
  rows: MetaV2CleanRow[]
): MetaV2ExecutiveSummaryOutput {
  const latestDate =
    getMetaV2DateRange(
      rows
    ).endDate;

  const currentRange =
    getMetaV2InclusiveDateRange(
      latestDate,
      30
    );

  const priorEnd =
    addMetaV2Days(
      latestDate,
      -30
    );

  const priorRange =
    getMetaV2InclusiveDateRange(
      priorEnd,
      30
    );

  const last7Range =
    getMetaV2InclusiveDateRange(
      latestDate,
      7
    );

  const currentRows =
    filterMetaV2RowsByDateRange(
      rows,
      currentRange
    );

  const priorRows =
    filterMetaV2RowsByDateRange(
      rows,
      priorRange
    );

  const last7Rows =
    filterMetaV2RowsByDateRange(
      rows,
      last7Range
    );

  const current =
    calculateMetaV2Totals(
      currentRows
    );

  const prior =
    calculateMetaV2Totals(
      priorRows
    );

  const last7 =
    calculateMetaV2Totals(
      last7Rows
    );

  const campaigns =
    buildCampaignRows(
      currentRows
    );

  const ads =
    buildAdTotals(
      currentRows
    );

  const snapshotMetrics =
    SUMMARY_METRICS.map(
      (metric) => {
        const currentValue =
          getMetricValue(
            metric,
            current
          );

        const priorValue =
          getMetricValue(
            metric,
            prior
          );

        const last7Value =
          getMetricValue(
            metric,
            last7
          );

        const delta =
          getMetaV2RelativeChange(
            currentValue,
            priorValue
          );

        return {
          metric,
          current:
            currentValue,
          prior:
            priorValue,
          last7:
            last7Value,
          delta,
          lowerIsBetter:
            isLowerBetterMetric(
              metric
            ),
          status:
            getMetricStatus(
              metric,
              currentValue,
              delta
            ),
        };
      }
    );

  return {
    latestDate,
    current,
    prior,
    last7,
    snapshotMetrics,
    campaigns,
    issues:
      buildIssues(
        current,
        prior,
        campaigns,
        ads
      ),
    fatigue:
      buildFatigueRows(
        campaigns,
        priorRows
      ),
  };
}
