// Statistical analysis utilities for A/B testing

// Normal distribution CDF approximation using error function
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// Inverse normal CDF (probit function) approximation
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// Calculate Z-score for two-proportion z-test
function calculateZScore(
  treatmentImpressions: number,
  treatmentConversions: number,
  controlImpressions: number,
  controlConversions: number
): number {
  const p1 = treatmentConversions / treatmentImpressions;
  const p2 = controlConversions / controlImpressions;
  const p = (treatmentConversions + controlConversions) / (treatmentImpressions + controlImpressions);

  const se = Math.sqrt(p * (1 - p) * (1 / treatmentImpressions + 1 / controlImpressions));

  if (se === 0) return 0;

  return (p1 - p2) / se;
}

export interface SignificanceResult {
  zScore: number;
  pValue: number;
  confidence: number;
  isSignificant: boolean;
  significanceLevel: number;
}

// Calculate statistical significance using two-proportion z-test
export function calculateStatisticalSignificance(
  treatmentImpressions: number,
  treatmentConversions: number,
  controlImpressions: number,
  controlConversions: number,
  controlRate: number = 0,
  significanceLevel: number = 0.05
): SignificanceResult {
  // If control rate is provided and treatment equals control, skip z-test
  if (treatmentImpressions === controlImpressions &&
      treatmentConversions === controlConversions) {
    return {
      zScore: 0,
      pValue: 1,
      confidence: 0,
      isSignificant: false,
      significanceLevel,
    };
  }

  // Calculate z-score
  const zScore = calculateZScore(
    treatmentImpressions,
    treatmentConversions,
    controlImpressions,
    controlConversions
  );

  // Calculate two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  // Calculate confidence level
  const confidence = (1 - pValue) * 100;

  // Determine significance
  const isSignificant = pValue < significanceLevel;

  return {
    zScore,
    pValue,
    confidence,
    isSignificant,
    significanceLevel,
  };
}

export interface UpliftResult {
  absoluteUplift: number;
  relativeUplift: number; // percentage
  isPositive: boolean;
}

// Calculate uplift relative to control
export function calculateUplift(treatmentRate: number, controlRate: number): UpliftResult {
  const absoluteUplift = treatmentRate - controlRate;
  const relativeUplift = controlRate > 0
    ? ((treatmentRate - controlRate) / controlRate) * 100
    : treatmentRate > 0 ? 100 : 0;

  return {
    absoluteUplift,
    relativeUplift,
    isPositive: absoluteUplift > 0,
  };
}

// Chi-squared test for multiple variants
export interface ChiSquaredResult {
  chiSquared: number;
  degreesOfFreedom: number;
  pValue: number;
  isSignificant: boolean;
}

export function chiSquaredTest(
  observed: number[],
  expected: number[]
): ChiSquaredResult {
  if (observed.length !== expected.length) {
    throw new Error('Observed and expected arrays must have same length');
  }

  let chiSquared = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      chiSquared += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
  }

  const degreesOfFreedom = observed.length - 1;

  // Approximate p-value using chi-squared distribution
  // Using Wilson-Hilferty transformation
  const pValue = 1 - normalCDF(Math.pow(chiSquared / degreesOfFreedom, 1/3) * 2.242 - 0.707);

  return {
    chiSquared,
    degreesOfFreedom,
    pValue: Math.max(0, Math.min(1, pValue)),
    isSignificant: pValue < 0.05,
  };
}

// Minimum sample size calculator
export function calculateMinimumSampleSize(
  baselineConversionRate: number,
  minimumDetectableEffect: number, // relative, e.g., 0.1 for 10% improvement
  significanceLevel: number = 0.05,
  power: number = 0.8
): number {
  const p1 = baselineConversionRate;
  const p2 = baselineConversionRate * (1 + minimumDetectableEffect);

  const effect = Math.abs(p2 - p1);
  const zAlpha = normalQuantile(1 - significanceLevel / 2);
  const zBeta = normalQuantile(power);

  const pooledP = (p1 + p2) / 2;
  const se = Math.sqrt(2 * pooledP * (1 - pooledP));

  if (se === 0) return Infinity;

  const n = Math.pow((zAlpha + zBeta) * se / effect, 2);

  return Math.ceil(n);
}

// Calculate confidence interval for conversion rate
export interface ConfidenceInterval {
  lower: number;
  upper: number;
  marginOfError: number;
}

export function calculateConfidenceInterval(
  conversions: number,
  impressions: number,
  confidenceLevel: number = 0.95
): ConfidenceInterval {
  if (impressions === 0) {
    return { lower: 0, upper: 1, marginOfError: 1 };
  }

  const p = conversions / impressions;
  const z = normalQuantile(1 - (1 - confidenceLevel) / 2);

  const marginOfError = z * Math.sqrt(p * (1 - p) / impressions);

  return {
    lower: Math.max(0, p - marginOfError),
    upper: Math.min(1, p + marginOfError),
    marginOfError,
  };
}

// Bayesian probability of being best
export function calculateProbabilityOfBest(
  variantResults: Array<{
    impressions: number;
    conversions: number;
  }>,
  iterations: number = 10000
): number[] {
  if (variantResults.length < 2) {
    return variantResults.map(() => 1);
  }

  const wins = new Array(variantResults.length).fill(0);

  for (let i = 0; i < iterations; i++) {
    let bestRate = -1;
    let bestIndex = -1;

    for (let j = 0; j < variantResults.length; j++) {
      const { impressions, conversions } = variantResults[j];
      // Sample from beta distribution approximation
      const alpha = conversions + 1;
      const beta = impressions - conversions + 1;
      const sample = sampleBeta(alpha, beta);

      if (sample > bestRate) {
        bestRate = sample;
        bestIndex = j;
      }
    }

    if (bestIndex >= 0) {
      wins[bestIndex]++;
    }
  }

  return wins.map(w => w / iterations);
}

// Beta distribution sampling using approximation
function sampleBeta(alpha: number, beta: number): number {
  // Using gamma distribution method
  const sampleGamma1 = sampleGamma(alpha);
  const sampleGamma2 = sampleGamma(beta);
  return sampleGamma1 / (sampleGamma1 + sampleGamma2);
}

function sampleGamma(shape: number): number {
  // Using Marsaglia and Tsang's method for gamma distribution
  if (shape < 1) {
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = normalRandom();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

function normalRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
