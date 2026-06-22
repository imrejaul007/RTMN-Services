/**
 * SUTAR Decision Engine - Multi-Option Ranker
 *
 * Given a set of N candidate options, score each across 4 dimensions
 * (cost, time, risk, trust) and return a ranked list with per-dimension
 * breakdowns and a confidence score.
 *
 * Algorithm (per ROADMAP-TO-VISION.md Phase B.2):
 *   1. Validate the option set (min 2, dimensions present)
 *   2. For each dimension, normalize values to [0, 1] across all options
 *      using min-max normalization
 *      - cost, time, risk: lower is better → invert (1 - normalized)
 *      - trust: higher is better → keep as-is
 *   3. Compute weighted score: sum(normalized[i] * weight[i])
 *   4. Rank by score (descending)
 *   5. Compute confidence based on score spread (more spread → higher confidence)
 *   6. Return ranked list with per-option breakdown
 *
 * Why not just hand-rolled scoring:
 *   - Need to handle heterogeneous dimensions (different units/scales)
 *   - Need to handle missing values (some options may not have all dimensions)
 *   - Need to produce auditable per-dimension scores (so the agent can explain)
 *   - Need stable behavior under edge cases (single option, all-equal, etc.)
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

/**
 * A single option to be ranked. All four dimensions are optional;
 * missing dimensions are excluded from that option's score.
 *
 * Direction matters:
 *   - cost / time / risk: lower is better
 *   - trust: higher is better
 */
export interface RankableOption {
  /** Unique identifier for the option (within the request). */
  id: string;
  /** Human-readable name (for explanations). */
  name: string;
  /** Cost in some currency-agnostic units (lower is better). Optional. */
  cost?: number;
  /** Time in seconds/minutes/hours — whatever the caller uses (lower is better). Optional. */
  time?: number;
  /** Risk score 0-100, where 0 = no risk, 100 = critical (lower is better). Optional. */
  risk?: number;
  /** Trust score 0-100, where 0 = no trust, 100 = complete trust (higher is better). Optional. */
  trust?: number;
  /** Free-form metadata to surface in the response. */
  metadata?: Record<string, unknown>;
}

export interface RankingWeights {
  /** Weight for cost dimension (0..1). Default 0.30. */
  cost?: number;
  /** Weight for time dimension (0..1). Default 0.20. */
  time?: number;
  /** Weight for risk dimension (0..1). Default 0.30. */
  risk?: number;
  /** Weight for trust dimension (0..1). Default 0.20. */
  trust?: number;
}

export interface DimensionScore {
  /** Raw value provided by the caller (or null if missing). */
  raw: number | null;
  /** Normalized value 0..1 (after direction correction). 0 = worst, 1 = best. */
  normalized: number;
  /** Weight actually applied to this dimension (0 if not provided). */
  weight: number;
  /** Contribution to the total score (normalized * weight). */
  contribution: number;
}

export interface RankedOption {
  /** Echoed from input. */
  id: string;
  /** Echoed from input. */
  name: string;
  /** Rank position 1 = best. */
  rank: number;
  /** Final weighted score 0..1 (sum of dimension contributions, re-normalized to available weight). */
  score: number;
  /** Per-dimension breakdown. */
  breakdown: {
    cost: DimensionScore;
    time: DimensionScore;
    risk: DimensionScore;
    trust: DimensionScore;
  };
  /** Echoed metadata. */
  metadata?: Record<string, unknown>;
}

export interface RankingResult {
  /** Request id, useful for log correlation. */
  id: string;
  /** All options in rank order (1 = best). */
  ranked: RankedOption[];
  /** The best option (rank=1) — convenience field. */
  winner: RankedOption;
  /** Confidence in the ranking 0..1.
   *  Higher when the spread between top and bottom scores is large. */
  confidence: number;
  /** Which dimensions were actually used (omits dimensions where no option provided a value). */
  dimensionsUsed: Array<'cost' | 'time' | 'risk' | 'trust'>;
  /** Wall-clock time of the ranking (ms). */
  processingTimeMs: number;
  /** Echoed weights (with defaults filled in). */
  weights: Required<RankingWeights>;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_WEIGHTS: Required<RankingWeights> = {
  cost: 0.30,
  time: 0.20,
  risk: 0.30,
  trust: 0.20,
};

const DIMENSIONS = ['cost', 'time', 'risk', 'trust'] as const;
type Dimension = typeof DIMENSIONS[number];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract a dimension value from an option, or null if not provided.
 * Distinguishes "not provided" (null) from "explicit zero" (0).
 */
function getValue(opt: RankableOption, dim: Dimension): number | null {
  const v = opt[dim];
  if (v === undefined || v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/**
 * Min-max normalize a list of numbers to [0, 1].
 *   - If all values are the same, returns 1.0 for all (everyone is "best on this dim").
 *   - If only one value, returns 1.0 for that one.
 *   - null entries are returned as null.
 */
function normalizeMinMax(values: Array<number | null>): Array<number | null> {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return values.map(() => null);
  if (present.length === 1) return values.map(v => (v === null ? null : 1.0));
  const min = Math.min(...present);
  const max = Math.max(...present);
  if (max === min) return values.map(() => 1.0); // all equal
  return values.map(v => (v === null ? null : (v - min) / (max - min)));
}

/**
 * Invert a normalized value (1 - x). For "lower is better" dimensions
 * (cost/time/risk), we invert so 1 = best, 0 = worst.
 */
function invert(n: number | null): number | null {
  return n === null ? null : 1 - n;
}

/**
 * Sanitize weights: replace negatives, fill defaults, normalize so they
 * sum to 1 over the dimensions that have data.
 */
function resolveWeights(
  requested: RankingWeights | undefined,
  used: Dimension[]
): Required<RankingWeights> {
  const w: Required<RankingWeights> = { ...DEFAULT_WEIGHTS, ...(requested ?? {}) };
  for (const d of DIMENSIONS) {
    if (typeof w[d] !== 'number' || !Number.isFinite(w[d]) || w[d] < 0) w[d] = 0;
  }
  // If no requested weights AND we have defaults, just use them.
  // If a custom weight set was passed in, normalize to sum=1 across the
  // dimensions that actually have data.
  if (requested) {
    const sum = used.reduce((s, d) => s + w[d], 0);
    if (sum > 0) {
      for (const d of used) w[d] = w[d] / sum;
    }
  }
  return w;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Score and rank a set of options.
 *
 * Throws on invalid input (less than 2 options, all dimensions missing).
 * Returns a RankingResult with the options in best-first order.
 */
export function rankOptions(
  options: RankableOption[],
  weights?: RankingWeights
): RankingResult {
  const startTime = Date.now();

  if (!Array.isArray(options)) {
    throw new Error('options must be an array');
  }
  if (options.length < 2) {
    throw new Error('rankOptions requires at least 2 options');
  }
  // Verify all options have an id
  for (const o of options) {
    if (!o || typeof o !== 'object' || !o.id) {
      throw new Error('every option must have an id');
    }
  }

  // Find which dimensions have data
  const dimensionsUsed: Dimension[] = DIMENSIONS.filter(dim =>
    options.some(o => getValue(o, dim) !== null)
  );
  if (dimensionsUsed.length === 0) {
    throw new Error('at least one dimension (cost, time, risk, trust) must be provided across the options');
  }

  // Resolve weights (normalize to sum=1 over used dims if custom)
  const w = resolveWeights(weights, dimensionsUsed);

  // For each dimension, normalize across options.
  // For "lower is better" (cost, time, risk), invert so 1 = best.
  const normByDim: Record<Dimension, Array<number | null>> = {
    cost: normalizeMinMax(options.map(o => getValue(o, 'cost'))),
    time: normalizeMinMax(options.map(o => getValue(o, 'time'))),
    risk: normalizeMinMax(options.map(o => getValue(o, 'risk'))),
    trust: normalizeMinMax(options.map(o => getValue(o, 'trust'))),
  };
  for (const d of ['cost', 'time', 'risk'] as Dimension[]) {
    normByDim[d] = normByDim[d].map(invert);
  }

  // Compute per-option scores
  const scored: RankedOption[] = options.map((opt, i) => {
    const breakdown: RankedOption['breakdown'] = {
      cost:    { raw: getValue(opt, 'cost'),  normalized: normByDim.cost[i] ?? 0, weight: w.cost,    contribution: 0 },
      time:    { raw: getValue(opt, 'time'),  normalized: normByDim.time[i] ?? 0, weight: w.time,    contribution: 0 },
      risk:    { raw: getValue(opt, 'risk'),  normalized: normByDim.risk[i] ?? 0, weight: w.risk,    contribution: 0 },
      trust:   { raw: getValue(opt, 'trust'), normalized: normByDim.trust[i] ?? 0, weight: w.trust, contribution: 0 },
    };
    // Only count contribution for dimensions that are both used AND have a value
    let usedWeightSum = 0;
    let totalContribution = 0;
    for (const d of dimensionsUsed) {
      const raw = breakdown[d].raw;
      if (raw === null) continue;
      breakdown[d].contribution = breakdown[d].normalized * breakdown[d].weight;
      totalContribution += breakdown[d].contribution;
      usedWeightSum += breakdown[d].weight;
    }
    // Re-normalize score so 1.0 = perfect on all used dimensions
    const score = usedWeightSum > 0 ? totalContribution / usedWeightSum : 0;
    return {
      id: opt.id,
      name: opt.name,
      rank: 0, // filled in after sort
      score: Math.round(score * 10000) / 10000, // 4 dp
      breakdown,
      metadata: opt.metadata,
    };
  });

  // Sort by score desc; tie-break by id (stable, deterministic)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id.localeCompare(b.id);
  });
  scored.forEach((o, i) => { o.rank = i + 1; });

  // Confidence: how decisive is the ranking? Range of top vs bottom
  // normalized to [0, 1] (0 = everyone tied, 1 = total separation).
  const top = scored[0].score;
  const bottom = scored[scored.length - 1].score;
  const spread = Math.max(0, top - bottom);
  // Soft scaling: spread of 0.5+ is "very confident", 0.1 is "barely"
  const confidence = Math.min(1, Math.round((spread * 1.5) * 100) / 100);

  return {
    id: uuidv4(),
    ranked: scored,
    winner: scored[0],
    confidence,
    dimensionsUsed,
    processingTimeMs: Date.now() - startTime,
    weights: w,
  };
}

// ============================================================================
// Diagnostics (for /health/ready)
// ============================================================================

/**
 * Quick health check for the ranker.
 * Returns OK if the algorithm produces a valid result for a basic input.
 */
export function rankerDiagnostics(): {
  healthy: boolean;
  checks: Record<string, { pass: boolean; message: string }>;
} {
  const checks: Record<string, { pass: boolean; message: string }> = {};
  try {
    const r = rankOptions([
      { id: 'a', name: 'A', cost: 10, time: 5,  risk: 20, trust: 80 },
      { id: 'b', name: 'B', cost: 20, time: 10, risk: 30, trust: 70 },
      { id: 'c', name: 'C', cost: 5,  time: 8,  risk: 25, trust: 90 },
    ]);
    // 'a' is best on time and risk; 'c' is best on cost and trust.
    // With default weights (cost=0.3, time=0.2, risk=0.3, trust=0.2),
    // a's score = 0.8, c's = 0.73. So 'a' wins.
    checks['produces_winner'] = {
      pass: !!r.winner && r.winner.id === 'a',
      message: `Expected winner 'a', got '${r.winner?.id}'`,
    };
    checks['ranks_count'] = {
      pass: r.ranked.length === 3,
      message: `Expected 3 ranked options, got ${r.ranked.length}`,
    };
    checks['confidence_in_range'] = {
      pass: r.confidence >= 0 && r.confidence <= 1,
      message: `confidence=${r.confidence} (must be 0..1)`,
    };
  } catch (err) {
    checks['produces_winner'] = { pass: false, message: `threw: ${(err as Error).message}` };
  }
  const allPass = Object.values(checks).every(c => c.pass);
  return { healthy: allPass, checks };
}
