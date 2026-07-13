const SQRT_TWO_PI = Math.sqrt(
  2 * Math.PI
);

function normalCdf(value: number) {
  const sign =
    value < 0 ? -1 : 1;

  const x =
    Math.abs(value) /
    Math.sqrt(2);

  const t =
    1 /
    (1 + 0.3275911 * x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const erf =
    1 -
    (
      (
        (
          (
            a5 * t + a4
          ) *
            t +
          a3
        ) *
          t +
        a2
      ) *
        t +
      a1
    ) *
      t *
      Math.exp(-x * x);

  return 0.5 * (1 + sign * erf);
}

function poissonCdfNormalApproximation(
  count: number,
  lambda: number
) {
  const corrected =
    count + 0.5;

  const z =
    (corrected - lambda) /
    Math.sqrt(lambda);

  return normalCdf(z);
}

export function poissonCdf(
  count: number,
  lambda: number
) {
  if (
    !Number.isFinite(lambda) ||
    lambda <= 0
  ) {
    return count >= 0 ? 1 : 0;
  }

  const integerCount =
    Math.floor(count);

  if (integerCount < 0) {
    return 0;
  }

  if (lambda > 100) {
    return Math.min(
      1,
      Math.max(
        0,
        poissonCdfNormalApproximation(
          integerCount,
          lambda
        )
      )
    );
  }

  let probability =
    Math.exp(-lambda);

  let total = probability;

  for (
    let index = 1;
    index <= integerCount;
    index += 1
  ) {
    probability *=
      lambda / index;

    total += probability;
  }

  return Math.min(
    1,
    Math.max(0, total)
  );
}

export function poissonUpperTail(
  count: number,
  lambda: number
) {
  if (count <= 0) {
    return 1;
  }

  return Math.min(
    1,
    Math.max(
      0,
      1 -
        poissonCdf(
          count - 1,
          lambda
        )
    )
  );
}

export function poissonKillPurchaseBoundary(
  lambda: number,
  alpha: number
) {
  let boundary = -1;

  const maximum =
    Math.max(
      10,
      Math.ceil(
        lambda +
          8 * Math.sqrt(lambda)
      )
    );

  for (
    let purchases = 0;
    purchases <= maximum;
    purchases += 1
  ) {
    if (
      poissonCdf(
        purchases,
        lambda
      ) <= alpha
    ) {
      boundary = purchases;
    } else {
      break;
    }
  }

  return boundary;
}

export function poissonScalePurchaseBoundary(
  lambda: number,
  alpha: number
) {
  const maximum =
    Math.max(
      20,
      Math.ceil(
        lambda +
          10 * Math.sqrt(lambda) +
          10
      )
    );

  for (
    let purchases = 1;
    purchases <= maximum;
    purchases += 1
  ) {
    if (
      poissonUpperTail(
        purchases,
        lambda
      ) <= alpha
    ) {
      return purchases;
    }
  }

  return maximum;
}

export function poissonPmf(
  count: number,
  lambda: number
) {
  if (
    count < 0 ||
    lambda < 0
  ) {
    return 0;
  }

  if (lambda === 0) {
    return count === 0 ? 1 : 0;
  }

  if (lambda > 100) {
    const z =
      (count - lambda) /
      Math.sqrt(lambda);

    return (
      Math.exp(
        -(z * z) / 2
      ) /
      (
        SQRT_TWO_PI *
        Math.sqrt(lambda)
      )
    );
  }

  let result =
    Math.exp(-lambda);

  for (
    let index = 1;
    index <= count;
    index += 1
  ) {
    result *=
      lambda / index;
  }

  return result;
}
