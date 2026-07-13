import type {
  MetaV2CleanRow,
} from "@/lib/meta-v2/schema";

import {
  buildCreativeScalingCurves,
  calculateCreativeScalingBoundary,
} from "@/lib/meta-v2/creative-scaling/boundaries";

import {
  poissonCdf,
  poissonUpperTail,
} from "@/lib/meta-v2/creative-scaling/poisson";

import type {
  CreativeScalingDecision,
  CreativeScalingEvidence,
  CreativeScalingOutput,
  CreativeScalingPoint,
  CreativeScalingSettings,
} from "@/lib/meta-v2/creative-scaling/schema";

function isExplicitlyActive(
  deliveryStatus: string | undefined
) {
  const normalized =
    String(
      deliveryStatus || ""
    )
      .trim()
      .toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("active") ||
    normalized.includes("learning") ||
    normalized.includes("delivering")
  ) {
    return true;
  }

  if (
    normalized.includes("paused") ||
    normalized.includes("inactive") ||
    normalized.includes("deleted") ||
    normalized.includes("archived") ||
    normalized.includes("rejected") ||
    normalized.includes("off")
  ) {
    return false;
  }

  return null;
}

function isLiveOnLatestDate(
  row: MetaV2CleanRow
) {
  const explicit =
    isExplicitlyActive(
      row.deliveryStatus
    );

  if (explicit === false) {
    return false;
  }

  if (explicit === true) {
    return (
      row.impressions > 0 ||
      row.spend > 0
    );
  }

  return (
    row.impressions > 0 ||
    row.spend > 0
  );
}

function dateWindow(
  dates: string[],
  windowDays: number
) {
  if (
    windowDays === 0 ||
    dates.length <= windowDays
  ) {
    return dates;
  }

  return dates.slice(
    -windowDays
  );
}

function evidenceLevel(
  spend: number,
  targetCpa: number
): CreativeScalingEvidence {
  const multiple =
    spend /
    Math.max(
      targetCpa,
      0.01
    );

  if (multiple >= 10) {
    return "strong";
  }

  if (multiple >= 3) {
    return "developing";
  }

  return "insufficient";
}

function evidenceLabel(
  evidence: CreativeScalingEvidence,
  confidence: number
) {
  if (
    evidence ===
    "insufficient"
  ) {
    return "Insufficient evidence";
  }

  if (
    evidence ===
    "developing"
  ) {
    return "Developing evidence";
  }

  return `${Math.round(
    confidence * 100
  )}% confidence`;
}

function recommendedAction(
  decision: CreativeScalingDecision,
  evidence: CreativeScalingEvidence
) {
  if (decision === "scale") {
    return (
      "Scale in controlled increments while monitoring marginal CPA."
    );
  }

  if (decision === "kill") {
    return (
      "Pause or materially reduce; the ad is statistically unlikely to recover to target CPA."
    );
  }

  if (
    evidence ===
    "insufficient"
  ) {
    return (
      "Continue gathering evidence before taking a hard action."
    );
  }

  return (
    "Maintain spend and review movement against the scale and kill boundaries."
  );
}

function percentDistance(
  value: number | null,
  boundary: number | null
) {
  if (
    value === null ||
    boundary === null ||
    boundary <= 0
  ) {
    return null;
  }

  return (
    ((value - boundary) /
      boundary) *
    100
  );
}

export function buildCreativeScalingOutput(
  rows: MetaV2CleanRow[],
  settings: CreativeScalingSettings
): CreativeScalingOutput {
  const targetCpa =
    Math.max(
      1,
      settings.targetCpa
    );

  const confidence =
    Math.min(
      0.99,
      Math.max(
        0.51,
        settings.confidence
      )
    );

  const dates =
    Array.from(
      new Set(
        rows
          .map((row) => row.date)
          .filter(Boolean)
      )
    ).sort();

  const latestDate =
    dates.at(-1) || "";

  if (!latestDate) {
    return {
      latestDate: "",
      windowStart: "",
      windowEnd: "",
      settings: {
        ...settings,
        targetCpa,
        confidence,
      },
      points: [],
      curves: [],
      thresholds: [],
      summary: {
        eligibleAds: 0,
        scaleAds: 0,
        watchAds: 0,
        killAds: 0,
        scaleSpend: 0,
        watchSpend: 0,
        killSpend: 0,
        zeroPurchaseAds: 0,
        classifiedSpend: 0,
      },
    };
  }

  const latestRows =
    rows.filter(
      (row) =>
        row.date === latestDate
    );

  const liveRows =
    latestRows.filter(
      (row) =>
        row.adId &&
        isLiveOnLatestDate(row)
    );

  const liveAdIds =
    new Set(
      liveRows.map(
        (row) => row.adId
      )
    );

  const selectedDates =
    dateWindow(
      dates,
      settings.windowDays
    );

  const selectedDateSet =
    new Set(selectedDates);

  const eligibleRows =
    rows.filter(
      (row) =>
        liveAdIds.has(row.adId) &&
        selectedDateSet.has(
          row.date
        )
    );

  const yesterdayByAd =
    new Map<
      string,
      {
        spend: number;
        impressions: number;
      }
    >();

  for (const row of liveRows) {
    const current =
      yesterdayByAd.get(
        row.adId
      ) || {
        spend: 0,
        impressions: 0,
      };

    current.spend += row.spend;
    current.impressions +=
      row.impressions;

    yesterdayByAd.set(
      row.adId,
      current
    );
  }

  const aggregateByAd =
    new Map<
      string,
      {
        adId: string;
        adName: string;
        campaignName: string;
        adSetName: string;
        spend: number;
        revenue: number;
        purchases: number;
        impressions: number;
      }
    >();

  for (const row of eligibleRows) {
    const current =
      aggregateByAd.get(
        row.adId
      ) || {
        adId: row.adId,
        adName: row.adName,
        campaignName:
          row.campaignName,
        adSetName: row.adSetName,
        spend: 0,
        revenue: 0,
        purchases: 0,
        impressions: 0,
      };

    current.spend += row.spend;
    current.revenue +=
      row.revenue;

    current.purchases +=
      row.purchases;

    current.impressions +=
      row.impressions;

    aggregateByAd.set(
      row.adId,
      current
    );
  }

  const alpha =
    1 - confidence;

  const points:
    CreativeScalingPoint[] = [];

  for (
    const aggregate of
    aggregateByAd.values()
  ) {
    if (aggregate.spend <= 0) {
      continue;
    }

    const modelledPurchases =
      Math.max(
        0,
        Math.round(
          aggregate.purchases
        )
      );

    const expectedPurchases =
      aggregate.spend /
      targetCpa;

    const killProbability =
      poissonCdf(
        modelledPurchases,
        expectedPurchases
      );

    const scaleProbability =
      poissonUpperTail(
        modelledPurchases,
        expectedPurchases
      );

    const boundary =
      calculateCreativeScalingBoundary(
        aggregate.spend,
        targetCpa,
        confidence
      );

    const evidence =
      evidenceLevel(
        aggregate.spend,
        targetCpa
      );

    const minimumEvidenceSpend =
      targetCpa *
      settings.minEvidenceMultiple;

    let decision:
      CreativeScalingDecision =
      "watch";

    if (
      aggregate.spend >=
        minimumEvidenceSpend &&
      modelledPurchases >=
        settings.minPurchasesToScale &&
      scaleProbability <= alpha
    ) {
      decision = "scale";
    } else if (
      aggregate.spend >=
        minimumEvidenceSpend &&
      killProbability <= alpha
    ) {
      decision = "kill";
    }

    const cpa =
      aggregate.purchases > 0
        ? aggregate.spend /
          aggregate.purchases
        : null;

    const roas =
      aggregate.spend > 0
        ? aggregate.revenue /
          aggregate.spend
        : 0;

    const yesterday =
      yesterdayByAd.get(
        aggregate.adId
      ) || {
        spend: 0,
        impressions: 0,
      };

    points.push({
      adId: aggregate.adId,
      adName: aggregate.adName,
      campaignName:
        aggregate.campaignName,
      adSetName:
        aggregate.adSetName,

      decision,
      evidence,
      confidenceLabel:
        evidenceLabel(
          evidence,
          confidence
        ),

      latestDate,
      windowStart:
        selectedDates.at(0) ||
        latestDate,
      windowEnd: latestDate,
      windowDays:
        settings.windowDays,

      yesterdaySpend:
        yesterday.spend,
      yesterdayImpressions:
        yesterday.impressions,

      spend: aggregate.spend,
      revenue:
        aggregate.revenue,
      purchases:
        aggregate.purchases,
      modelledPurchases,
      impressions:
        aggregate.impressions,

      cpa,
      roas,

      targetCpa,
      expectedPurchases,

      killProbability,
      scaleProbability,

      scaleBoundaryCpa:
        boundary.scaleCpa,

      killBoundaryCpa:
        boundary.killCpa,

      scaleDistancePct:
        percentDistance(
          cpa,
          boundary.scaleCpa
        ),

      killDistancePct:
        percentDistance(
          cpa,
          boundary.killCpa
        ),

      recommendedAction:
        recommendedAction(
          decision,
          evidence
        ),
    });
  }

  points.sort((a, b) => {
    const rank = {
      kill: 0,
      scale: 1,
      watch: 2,
    };

    return (
      rank[a.decision] -
        rank[b.decision] ||
      b.spend - a.spend
    );
  });

  const spends =
    points.map(
      (point) => point.spend
    );

  const minSpend =
    Math.max(
      1,
      Math.min(
        ...(spends.length
          ? spends
          : [targetCpa])
      )
    );

  const maxSpend =
    Math.max(
      targetCpa * 20,
      ...(spends.length
        ? spends
        : [targetCpa * 20])
    );

  const curves =
    buildCreativeScalingCurves(
      targetCpa,
      confidence,
      minSpend,
      maxSpend
    );

  const thresholdMultiples =
    [5, 10, 20];

  const thresholds =
    thresholdMultiples.map(
      (multiple) => {
        const spend =
          targetCpa *
          multiple;

        const boundary =
          calculateCreativeScalingBoundary(
            spend,
            targetCpa,
            confidence
          );

        return {
          spend,
          scaleCpa:
            boundary.scaleCpa ??
            0,
          killCpa:
            boundary.killCpa ??
            targetCpa * 8,
        };
      }
    );

  const byDecision = (
    decision:
      CreativeScalingDecision
  ) =>
    points.filter(
      (point) =>
        point.decision ===
        decision
    );

  const scalePoints =
    byDecision("scale");

  const watchPoints =
    byDecision("watch");

  const killPoints =
    byDecision("kill");

  return {
    latestDate,
    windowStart:
      selectedDates.at(0) ||
      latestDate,
    windowEnd: latestDate,

    settings: {
      ...settings,
      targetCpa,
      confidence,
    },

    points,
    curves,
    thresholds,

    summary: {
      eligibleAds:
        points.length,

      scaleAds:
        scalePoints.length,

      watchAds:
        watchPoints.length,

      killAds:
        killPoints.length,

      scaleSpend:
        scalePoints.reduce(
          (sum, point) =>
            sum + point.spend,
          0
        ),

      watchSpend:
        watchPoints.reduce(
          (sum, point) =>
            sum + point.spend,
          0
        ),

      killSpend:
        killPoints.reduce(
          (sum, point) =>
            sum + point.spend,
          0
        ),

      zeroPurchaseAds:
        points.filter(
          (point) =>
            point.purchases <= 0
        ).length,

      classifiedSpend:
        points.reduce(
          (sum, point) =>
            sum + point.spend,
          0
        ),
    },
  };
}
