/**
 * SUTAR Negotiation Engine - ZOPA (Zone of Possible Agreement) Calculator
 *
 * Pure functions for computing the zone where a deal is mathematically
 * possible, and for generating counter-offers that move both parties
 * toward agreement without giving away value unnecessarily.
 *
 * Strategy: integrative bargaining with ZOPA midpoint anchoring,
 * concession decay, and trust-weighted flexibility.
 *
 * References:
 *   - Fisher & Ury, "Getting to Yes" (principled negotiation)
 *   - Lax & Sebenius, "3-D Negotiation"
 *   - Thompson & Hastie, "Social Perception in Negotiation"
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Each party's private reservation values. The buyer will not pay more than
 * `buyerMax`; the seller will not accept less than `sellerMin`. These are
 * typically learned from past behavior or set by the user, and represent
 * true walk-away points (not opening offers).
 */
export interface PartyReservations {
  buyerMax: number;
  sellerMin: number;
}

/**
 * Strategy preset controlling how aggressive or accommodating the algorithm
 * is when generating counter-offers.
 */
export type Strategy = 'competitive' | 'collaborative' | 'accommodating' | 'compromising' | 'principled';

export interface StrategyParams {
  /** Initial concession as a fraction of the gap (0..1). Default 0.5. */
  initialConcession: number;
  /** Decay rate per round (multiplicative; 0.5 means halve the concession each round). Default 0.5. */
  decayRate: number;
  /** Minimum concession as a fraction of the gap. Default 0.01. */
  minConcession: number;
  /** Maximum rounds before walking away. Default 10. */
  maxRounds: number;
  /** Trust score (0..100) of the counterparty; higher trust → larger concessions. Default 50. */
  trustScore: number;
}

export const STRATEGY_PRESETS: Record<Strategy, StrategyParams> = {
  // Hard bargaining: small initial concession, slow decay, walk away quickly.
  competitive:    { initialConcession: 0.20, decayRate: 0.5, minConcession: 0.01, maxRounds: 6,  trustScore: 50 },
  // Find mutual gain: moderate concession, principled, generous on non-price terms.
  collaborative:  { initialConcession: 0.50, decayRate: 0.6, minConcession: 0.02, maxRounds: 12, trustScore: 60 },
  // Yield to preserve relationship: large concession, fast decay, very patient.
  accommodating:  { initialConcession: 0.70, decayRate: 0.7, minConcession: 0.05, maxRounds: 15, trustScore: 70 },
  // Meet in the middle quickly: large initial, fast decay, low round count.
  compromising:   { initialConcession: 0.50, decayRate: 0.4, minConcession: 0.02, maxRounds: 5,  trustScore: 50 },
  // BATNA-focused: principled, objective, slow but firm.
  principled:     { initialConcession: 0.30, decayRate: 0.6, minConcession: 0.01, maxRounds: 10, trustScore: 65 },
};

export interface ZOPAResult {
  /** Whether a deal is mathematically possible (true if sellerMin < buyerMax). */
  hasOverlap: boolean;
  /** Lower bound of the ZOPA (always = sellerMin). */
  zopaLow: number;
  /** Upper bound of the ZOPA (always = buyerMax). */
  zopaHigh: number;
  /** Width of the ZOPA; small gap → harder to close. */
  zopaWidth: number;
  /** Fair midpoint: (sellerMin + buyerMax) / 2. Useful for principled negotiation. */
  zopaMidpoint: number;
  /** Buyer's initial ask as a fraction above sellerMin (0..N). */
  buyerHeadroomRatio: number;
  /** Seller's initial offer as a fraction below buyerMax (0..N). */
  sellerHeadroomRatio: number;
  /** Reason when hasOverlap is false. */
  noOverlapReason?: 'buyer_below_seller' | 'buyer_equals_seller';
}

export interface CounterOfferResult {
  /** The proposed counter-offer amount. */
  amount: number;
  /** Which round this would be (1-indexed). */
  round: number;
  /** Concession size in absolute currency. */
  concessionAmount: number;
  /** Concession as a fraction of the original gap (0..1). */
  concessionFraction: number;
  /** Whether this offer is within the ZOPA (should always be true if computed correctly). */
  isWithinZOPA: boolean;
  /** Reasoning shown to the user explaining the algorithm's choice. */
  reasoning: string;
  /** Should the agent walk away after this round? (true if rounds >= maxRounds) */
  shouldWalkAway: boolean;
  /** Confidence in the recommendation (0..1). */
  confidence: number;
}

export interface ConcessionSchedule {
  /** Amount to offer at each round. */
  schedule: Array<{ round: number; amount: number; concessionFraction: number }>;
  /** The last round where a counter-offer is below the ZOPA midpoint (still good for the proposer). */
  favorableRounds: number;
}

// ============================================================================
// ZOPA Calculation
// ============================================================================

/**
 * Compute the Zone of Possible Agreement given both parties' reservation
 * values. A deal is possible iff seller's minimum < buyer's maximum.
 *
 * @example
 *   computeZOPA({ buyerMax: 100, sellerMin: 60 })
 *   // → { hasOverlap: true, zopaLow: 60, zopaHigh: 100, zopaWidth: 40, zopaMidpoint: 80 }
 *
 *   computeZOPA({ buyerMax: 50, sellerMin: 60 })
 *   // → { hasOverlap: false, zopaLow: 60, zopaHigh: 50, zopaWidth: -10, noOverlapReason: 'buyer_below_seller' }
 */
export function computeZOPA(reservations: PartyReservations): ZOPAResult {
  const { buyerMax, sellerMin } = reservations;

  if (buyerMax <= 0 || sellerMin <= 0) {
    throw new Error('Reservation values must be positive');
  }

  const zopaWidth = buyerMax - sellerMin;
  const hasOverlap = zopaWidth > 0;
  const zopaMidpoint = (buyerMax + sellerMin) / 2;
  const initialGap = Math.max(buyerMax, sellerMin) - Math.min(buyerMax, sellerMin);
  const buyerHeadroomRatio = initialGap > 0 ? (buyerMax - sellerMin) / initialGap : 0;
  const sellerHeadroomRatio = initialGap > 0 ? (buyerMax - sellerMin) / initialGap : 0;

  if (!hasOverlap) {
    return {
      hasOverlap: false,
      zopaLow: sellerMin,
      zopaHigh: buyerMax,
      zopaWidth,
      zopaMidpoint,
      buyerHeadroomRatio,
      sellerHeadroomRatio,
      noOverlapReason: buyerMax < sellerMin ? 'buyer_below_seller' : 'buyer_equals_seller',
    };
  }

  return {
    hasOverlap: true,
    zopaLow: sellerMin,
    zopaHigh: buyerMax,
    zopaWidth,
    zopaMidpoint,
    buyerHeadroomRatio,
    sellerHeadroomRatio,
  };
}

// ============================================================================
// Counter-Offer Generation
// ============================================================================

/**
 * Generate a counter-offer for a buyer, given:
 *  - The current offer from the seller
 *  - The buyer's reservation (max they will pay)
 *  - The seller's reservation (min they will accept) — needed for ZOPA
 *  - The strategy preset
 *  - The current round number
 *
 * The algorithm:
 *  1. If current offer ≤ buyerMax, ACCEPT (return recommended action: 'accept').
 *  2. If current offer > buyerMax, compute a counter:
 *     a. Compute ZOPA midpoint.
 *     b. Compute concession = (currentOffer - buyerMax) * initialConcession * (decayRate ^ (round-1)).
 *     c. Clamp concession to [minConcession * gap, gap].
 *     d. counter = currentOffer - concession.
 *     e. If counter < sellerMin, walk away.
 *  3. Adjust for trust: high trust → larger concession (more collaborative).
 *
 * @returns The counter-offer, or signals accept/walk-away.
 */
export function generateBuyerCounter(args: {
  currentOffer: number;
  buyerMax: number;
  sellerMin: number;
  strategy?: Strategy;
  round?: number;
  customParams?: Partial<StrategyParams>;
}): CounterOfferResult {
  const { currentOffer, buyerMax, sellerMin } = args;
  const round = args.round ?? 1;
  const strategy = args.strategy ?? 'collaborative';
  const baseParams = STRATEGY_PRESETS[strategy];
  const params: StrategyParams = { ...baseParams, ...(args.customParams ?? {}) };

  // Sanity checks
  if (currentOffer <= 0) throw new Error('currentOffer must be positive');
  if (buyerMax <= 0) throw new Error('buyerMax must be positive');
  if (sellerMin <= 0) throw new Error('sellerMin must be positive');
  if (round < 1) throw new Error('round must be >= 1');

  const zopa = computeZOPA({ buyerMax, sellerMin });

  // If current offer is acceptable, recommend accept
  if (currentOffer <= buyerMax) {
    return {
      amount: currentOffer,
      round,
      concessionAmount: 0,
      concessionFraction: 0,
      isWithinZOPA: true,
      reasoning: `Current offer of ${currentOffer} is at or below buyer's max of ${buyerMax}. Recommend accept.`,
      shouldWalkAway: false,
      confidence: 0.95,
    };
  }

  // No ZOPA — cannot close
  if (!zopa.hasOverlap) {
    return {
      amount: currentOffer,
      round,
      concessionAmount: 0,
      concessionFraction: 0,
      isWithinZOPA: false,
      reasoning: `No zone of possible agreement. Buyer's max (${buyerMax}) is at or below seller's min (${sellerMin}). Recommend walk away.`,
      shouldWalkAway: true,
      confidence: 0.99,
    };
  }

  // Beyond max rounds
  if (round > params.maxRounds) {
    return {
      amount: currentOffer,
      round,
      concessionAmount: 0,
      concessionFraction: 0,
      isWithinZOPA: false,
      reasoning: `Exceeded max rounds (${params.maxRounds}). Recommend walk away.`,
      shouldWalkAway: true,
      confidence: 0.85,
    };
  }

  // Compute concession with exponential decay.
  // The buyer's gap to close is from currentOffer down to sellerMin (ZOPA low).
  // The buyer wants to counter toward buyerMax (their walk-away), but the
  // counter should land at or below buyerMax to be acceptable.
  const gap = currentOffer - sellerMin;
  const decayFactor = Math.pow(params.decayRate, round - 1);
  let concessionFraction = params.initialConcession * decayFactor;
  // Trust adjustment: ±20% based on trust score
  const trustAdjustment = (params.trustScore - 50) / 250; // -0.2 .. +0.2
  concessionFraction = Math.max(0, Math.min(1, concessionFraction + trustAdjustment));
  // Clamp
  concessionFraction = Math.max(params.minConcession, Math.min(0.95, concessionFraction));
  const concessionAmount = gap * concessionFraction;

  const counter = currentOffer - concessionAmount;

  // If counter would go below buyerMax, cap it there (buyer cannot pay more than max).
  // Also ensure it doesn't go below sellerMin.
  const finalAmount = Math.max(sellerMin, Math.min(buyerMax, counter));
  const isWithinZOPA = finalAmount >= sellerMin && finalAmount <= buyerMax;

  // Confidence drops as rounds increase (we're less sure of closing)
  const confidence = Math.max(0.3, 0.95 - (round - 1) * 0.1);

  const reasoning = isWithinZOPA
    ? `Round ${round}: counter at ${finalAmount.toFixed(2)} (concession ${(concessionFraction * 100).toFixed(1)}% of gap, trust-adjusted). Within ZOPA.`
    : `Round ${round}: counter capped at seller's min (${sellerMin}). Outside buyer's comfort zone.`;

  return {
    amount: Math.round(finalAmount * 100) / 100,
    round,
    concessionAmount: Math.round(concessionAmount * 100) / 100,
    concessionFraction: Math.round(concessionFraction * 1000) / 1000,
    isWithinZOPA,
    reasoning,
    shouldWalkAway: round >= params.maxRounds,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Symmetric to generateBuyerCounter but for the seller side. The seller
 * receives an offer and counters downward toward their minimum.
 */
export function generateSellerCounter(args: {
  currentOffer: number;
  buyerMax: number;
  sellerMin: number;
  strategy?: Strategy;
  round?: number;
  customParams?: Partial<StrategyParams>;
}): CounterOfferResult {
  const { currentOffer, buyerMax, sellerMin } = args;
  const round = args.round ?? 1;
  const strategy = args.strategy ?? 'collaborative';
  const baseParams = STRATEGY_PRESETS[strategy];
  const params: StrategyParams = { ...baseParams, ...(args.customParams ?? {}) };

  if (currentOffer <= 0) throw new Error('currentOffer must be positive');
  if (buyerMax <= 0) throw new Error('buyerMax must be positive');
  if (sellerMin <= 0) throw new Error('sellerMin must be positive');
  if (round < 1) throw new Error('round must be >= 1');

  const zopa = computeZOPA({ buyerMax, sellerMin });

  // If current offer is acceptable to seller, recommend accept
  if (currentOffer >= sellerMin) {
    return {
      amount: currentOffer,
      round,
      concessionAmount: 0,
      concessionFraction: 0,
      isWithinZOPA: true,
      reasoning: `Current offer of ${currentOffer} is at or above seller's min of ${sellerMin}. Recommend accept.`,
      shouldWalkAway: false,
      confidence: 0.95,
    };
  }

  if (!zopa.hasOverlap) {
    return {
      amount: currentOffer,
      round,
      concessionAmount: 0,
      concessionFraction: 0,
      isWithinZOPA: false,
      reasoning: `No ZOPA. Seller's min (${sellerMin}) is at or above buyer's max (${buyerMax}). Recommend walk away.`,
      shouldWalkAway: true,
      confidence: 0.99,
    };
  }

  if (round > params.maxRounds) {
    return {
      amount: currentOffer,
      round,
      concessionAmount: 0,
      concessionFraction: 0,
      isWithinZOPA: false,
      reasoning: `Exceeded max rounds (${params.maxRounds}). Recommend walk away.`,
      shouldWalkAway: true,
      confidence: 0.85,
    };
  }

  // Seller's gap to close is from currentOffer up to buyerMax (ZOPA high).
  const gap = buyerMax - currentOffer;
  const decayFactor = Math.pow(params.decayRate, round - 1);
  let concessionFraction = params.initialConcession * decayFactor;
  const trustAdjustment = (params.trustScore - 50) / 250;
  concessionFraction = Math.max(0, Math.min(1, concessionFraction + trustAdjustment));
  concessionFraction = Math.max(params.minConcession, Math.min(0.95, concessionFraction));
  const concessionAmount = gap * concessionFraction;

  const counter = currentOffer + concessionAmount;
  // Clamp: counter must be between sellerMin and buyerMax to be within ZOPA
  const finalAmount = Math.max(sellerMin, Math.min(buyerMax, counter));
  const isWithinZOPA = finalAmount >= sellerMin && finalAmount <= buyerMax;
  const confidence = Math.max(0.3, 0.95 - (round - 1) * 0.1);

  const reasoning = isWithinZOPA
    ? `Round ${round}: counter at ${finalAmount.toFixed(2)} (concession ${(concessionFraction * 100).toFixed(1)}% of gap, trust-adjusted). Within ZOPA.`
    : `Round ${round}: counter capped at buyer's max (${buyerMax}). Outside seller's comfort zone.`;

  return {
    amount: Math.round(finalAmount * 100) / 100,
    round,
    concessionAmount: Math.round(concessionAmount * 100) / 100,
    concessionFraction: Math.round(concessionFraction * 1000) / 1000,
    isWithinZOPA,
    reasoning,
    shouldWalkAway: round >= params.maxRounds,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ============================================================================
// Concession Schedule (for showing a buyer/seller the planned path)
// ============================================================================

/**
 * Pre-compute the full concession schedule over `maxRounds`. Useful for
 * UI: "If the other side doesn't move, here's where I'll go next."
 */
export function buildConcessionSchedule(args: {
  openingOffer: number;
  buyerMax: number;
  sellerMin: number;
  side: 'buyer' | 'seller';
  strategy?: Strategy;
}): ConcessionSchedule {
  const { openingOffer, buyerMax, sellerMin, side } = args;
  const strategy = args.strategy ?? 'collaborative';
  const params = STRATEGY_PRESETS[strategy];
  const zopa = computeZOPA({ buyerMax, sellerMin });

  const schedule: Array<{ round: number; amount: number; concessionFraction: number }> = [];

  if (!zopa.hasOverlap) {
    return { schedule, favorableRounds: 0 };
  }

  for (let round = 1; round <= params.maxRounds; round++) {
    const result = side === 'buyer'
      ? generateBuyerCounter({ currentOffer: openingOffer, buyerMax, sellerMin, strategy, round })
      : generateSellerCounter({ currentOffer: openingOffer, buyerMax, sellerMin, strategy, round });
    schedule.push({
      round,
      amount: result.amount,
      concessionFraction: result.concessionFraction,
    });
  }

  // Favorable rounds = rounds where amount is at or below the ZOPA midpoint
  // (for the buyer, lower is better; for the seller, higher is better)
  const favorableRounds = schedule.filter(s =>
    side === 'buyer' ? s.amount <= zopa.zopaMidpoint : s.amount >= zopa.zopaMidpoint
  ).length;

  return { schedule, favorableRounds };
}

// ============================================================================
// Sanity / Diagnostics
// ============================================================================

/**
 * Quick health check: is the ZOPA configuration sensible?
 * Used by the /health/ready endpoint.
 */
export function diagnostics(reservations: PartyReservations): {
  healthy: boolean;
  checks: Record<string, { pass: boolean; message: string }>;
} {
  const checks: Record<string, { pass: boolean; message: string }> = {};

  checks['positive_values'] = {
    pass: reservations.buyerMax > 0 && reservations.sellerMin > 0,
    message: 'Both buyerMax and sellerMin must be positive',
  };

  checks['reasonable_buyer_max'] = {
    pass: reservations.buyerMax < 1e12,
    message: 'buyerMax is within reasonable bounds (< 1 trillion)',
  };

  checks['reasonable_seller_min'] = {
    pass: reservations.sellerMin < 1e12,
    message: 'sellerMin is within reasonable bounds (< 1 trillion)',
  };

  const allPass = Object.values(checks).every(c => c.pass);
  return { healthy: allPass, checks };
}
