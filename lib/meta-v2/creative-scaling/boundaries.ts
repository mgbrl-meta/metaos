import {
  poissonKillPurchaseBoundary,
  poissonScalePurchaseBoundary,
} from "@/lib/meta-v2/creative-scaling/poisson";

export interface CreativeScalingBoundary {
  spend: number;
  expectedPurchases: number;

  scalePurchases: number;
  killPurchases: number;

  scaleCpa: number | null;
  killCpa: number | null;
}

export function calculateCreativeScalingBoundary(
  spend: number,
  targetCpa: number,
  confidence: number
): CreativeScalingBoundary {
  const safeSpend =
    Math.max(0, spend);

  const safeTarget =
    Math.max(0.01, targetCpa);

  const alpha =
    Math.min(
      0.49,
      Math.max(
        0.001,
        1 - confidence
      )
    );

  const expectedPurchases =
    safeSpend / safeTarget;

  const scalePurchases =
    poissonScalePurchaseBoundary(
      expectedPurchases,
      alpha
    );

  const killPurchases =
    poissonKillPurchaseBoundary(
      expectedPurchases,
      alpha
    );

  return {
    spend: safeSpend,
    expectedPurchases,

    scalePurchases,
    killPurchases,

    scaleCpa:
      scalePurchases > 0
        ? safeSpend /
          scalePurchases
        : null,

    killCpa:
      killPurchases > 0
        ? safeSpend /
          killPurchases
        : null,
  };
}

export function buildCreativeScalingCurves(
  targetCpa: number,
  confidence: number,
  minimumSpend: number,
  maximumSpend: number,
  pointCount = 80
) {
  const minSpend =
    Math.max(
      targetCpa * 0.25,
      minimumSpend,
      1
    );

  const maxSpend =
    Math.max(
      minSpend * 2,
      maximumSpend
    );

  const minLog =
    Math.log10(minSpend);

  const maxLog =
    Math.log10(maxSpend);

  return Array.from(
    { length: pointCount },
    (_, index) => {
      const ratio =
        pointCount <= 1
          ? 0
          : index /
            (pointCount - 1);

      const spend =
        10 **
        (
          minLog +
          ratio *
            (maxLog - minLog)
        );

      const boundary =
        calculateCreativeScalingBoundary(
          spend,
          targetCpa,
          confidence
        );

      const graphCap =
        targetCpa * 8;

      return {
        spend,
        scaleCpa:
          boundary.scaleCpa ??
          0,

        killCpa:
          boundary.killCpa ??
          graphCap,
      };
    }
  );
}
