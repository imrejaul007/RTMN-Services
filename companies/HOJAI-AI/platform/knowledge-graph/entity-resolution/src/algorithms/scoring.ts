/**
 * Probabilistic Scoring for Entity Resolution
 * Combines multiple signals into a confidence score
 */

import {
  jaroWinklerSimilarity,
  levenshteinSimilarity,
  jaccardSimilarity,
  diceCoefficient,
  overlapCoefficient,
} from './string-similarity';
import {
  soundexSimilarity,
  metaphoneSimilarity,
  doubleMetaphoneSimilarity,
} from './phonetic';
import {
  ResolutionConfig,
  SimilarityResult,
  MatchDetails,
} from '../types';

/**
 * Default configuration for probabilistic scoring
 */
export const DEFAULT_CONFIG: ResolutionConfig = {
  confidenceThreshold: {
    high: 0.85,
    medium: 0.70,
    low: 0.50,
  },
  algorithmWeights: {
    jaroWinkler: 0.30,
    levenshtein: 0.20,
    jaccard: 0.25,
    soundex: 0.125,
    metaphone: 0.125,
  },
  blockingStrategies: ['soundex', 'metaphone', 'token_set'],
  maxCandidates: 100,
  reviewThreshold: 0.65,
};

/**
 * Calculate comprehensive similarity score between two entity names
 */
export function calculateSimilarityScore(
  name1: string,
  name2: string,
  config: ResolutionConfig = DEFAULT_CONFIG
): SimilarityResult {
  const { algorithmWeights } = config;

  // String similarity algorithms
  const jaroWinkler = jaroWinklerSimilarity(name1, name2);
  const levenshtein = levenshteinSimilarity(name1, name2);
  const jaccard = jaccardSimilarity(name1, name2);
  const dice = diceCoefficient(name1, name2);
  const overlap = overlapCoefficient(name1, name2);

  // Phonetic algorithms
  const soundex = soundexSimilarity(name1, name2);
  const metaphone = metaphoneSimilarity(name1, name2);
  const doubleMetaphone = doubleMetaphoneSimilarity(name1, name2);

  // Calculate weighted average
  const totalWeight =
    algorithmWeights.jaroWinkler +
    algorithmWeights.levenshtein +
    algorithmWeights.jaccard +
    algorithmWeights.soundex +
    algorithmWeights.metaphone;

  const weightedScore =
    (algorithmWeights.jaroWinkler * jaroWinkler +
      algorithmWeights.levenshtein * levenshtein +
      algorithmWeights.jaccard * jaccard +
      algorithmWeights.soundex * soundex +
      algorithmWeights.metaphone * metaphone) /
    totalWeight;

  // Boost score if phonetic matches agree
  let phoneticBoost = 0;
  if (soundex >= 0.8 && metaphone >= 0.8) phoneticBoost = 0.1;
  else if (soundex >= 0.8 || metaphone >= 0.8) phoneticBoost = 0.05;

  // Boost for exact token match in different order
  if (overlap >= 0.9 && jaroWinkler >= 0.8) phoneticBoost += 0.1;

  // Adjust score within bounds
  const finalScore = Math.min(1.0, Math.max(0.0, weightedScore + phoneticBoost));

  return {
    score: finalScore,
    algorithm: 'combined',
    details: {
      jaroWinkler,
      levenshtein,
      jaccard,
      dice,
      overlap,
      soundex,
      metaphone,
      doubleMetaphone,
      phoneticBoost,
      weightedBase: weightedScore,
    },
  };
}

/**
 * Calculate attribute-based similarity
 */
export function calculateAttributeSimilarity(
  attrs1: Record<string, string>,
  attrs2: Record<string, string>,
  weights: Record<string, number> = {}
): number {
  const keys1 = new Set(Object.keys(attrs1));
  const keys2 = new Set(Object.keys(attrs2));
  const commonKeys = new Set([...keys1].filter((k) => keys2.has(k)));

  if (commonKeys.size === 0) return 0;

  let totalWeight = 0;
  let weightedScore = 0;

  for (const key of commonKeys) {
    const weight = weights[key] || 1;
    const sim = jaroWinklerSimilarity(attrs1[key], attrs2[key]);
    weightedScore += weight * sim;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

/**
 * Calculate entity match confidence
 */
export function calculateMatchConfidence(
  nameScore: number,
  attributeScore: number | null,
  sourceReliabilityBoost: number = 0
): { confidence: number; level: 'high' | 'medium' | 'low' | 'uncertain' } {
  // Weight name score higher
  const baseScore = attributeScore !== null
    ? 0.7 * nameScore + 0.3 * attributeScore
    : nameScore;

  // Apply source reliability boost (max 10%)
  const score = Math.min(1.0, baseScore + sourceReliabilityBoost * 0.1);

  let level: 'high' | 'medium' | 'low' | 'uncertain';
  if (score >= 0.85) level = 'high';
  else if (score >= 0.70) level = 'medium';
  else if (score >= 0.50) level = 'low';
  else level = 'uncertain';

  return { confidence: score, level };
}

/**
 * Build match details object
 */
export function buildMatchDetails(
  name1: string,
  name2: string,
  config: ResolutionConfig = DEFAULT_CONFIG
): MatchDetails {
  const stringSim = jaroWinklerSimilarity(name1, name2);
  const phoneticSim = Math.max(
    soundexSimilarity(name1, name2),
    metaphoneSimilarity(name1, name2)
  );
  const jaccard = jaccardSimilarity(name1, name2);

  const matchReasons: string[] = [];

  if (stringSim >= 0.9) matchReasons.push('Near-exact string match');
  else if (stringSim >= 0.8) matchReasons.push('High string similarity');
  else if (stringSim >= 0.7) matchReasons.push('Moderate string similarity');

  if (phoneticSim >= 1.0) matchReasons.push('Exact phonetic match');
  else if (phoneticSim >= 0.8) matchReasons.push('Phonetic similarity');

  if (jaccard >= 0.8) matchReasons.push('High token overlap');
  else if (jaccard >= 0.6) matchReasons.push('Moderate token overlap');

  return {
    stringSimilarity: stringSim,
    phoneticSimilarity: phoneticSim,
    attributeOverlap: jaccard,
    blockingKey: '',
    matchReasons,
  };
}

/**
 * Score candidate entities for a given query
 */
export function scoreCandidates(
  query: { name: string; attributes?: Record<string, string> },
  candidates: { id: string; name: string; attributes?: Record<string, string> }[],
  config: ResolutionConfig = DEFAULT_CONFIG
): { id: string; score: number; details: SimilarityResult }[] {
  const results: { id: string; score: number; details: SimilarityResult }[] = [];

  for (const candidate of candidates) {
    // Calculate name similarity
    const nameSim = calculateSimilarityScore(query.name, candidate.name, config);

    // Calculate attribute similarity if available
    let attrSim = null;
    if (query.attributes && candidate.attributes) {
      attrSim = calculateAttributeSimilarity(
        query.attributes,
        candidate.attributes
      );
    }

    // Combined score
    const finalScore = attrSim !== null
      ? 0.8 * nameSim.score + 0.2 * attrSim
      : nameSim.score;

    results.push({
      id: candidate.id,
      score: finalScore,
      details: nameSim,
    });
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Determine if a match requires manual review
 */
export function requiresReview(
  confidence: number,
  threshold: number = DEFAULT_CONFIG.reviewThreshold
): boolean {
  return confidence < threshold;
}

/**
 * Generate merge recommendations based on score
 */
export function generateMergeRecommendation(
  score: number,
  matchDetails: MatchDetails
): { action: 'merge' | 'review' | 'reject'; reason: string } {
  if (score >= 0.90) {
    return {
      action: 'merge',
      reason: `High confidence match (${(score * 100).toFixed(1)}%)`,
    };
  }

  if (score >= 0.75) {
    return {
      action: 'review',
      reason: `Medium confidence (${(score * 100).toFixed(1)}%) - requires verification`,
    };
  }

  if (score >= 0.60) {
    return {
      action: 'review',
      reason: `Low confidence (${(score * 100).toFixed(1)}%) - manual review needed`,
    };
  }

  return {
    action: 'reject',
    reason: `Insufficient similarity (${(score * 100).toFixed(1)}%)`,
  };
}

/**
 * Bayesian probability scoring
 * Estimates probability that two entities are the same
 */
export function bayesianMatchProbability(
  priorProbability: number,
  likelihoods: { score: number; weight: number }[]
): number {
  // Convert scores to likelihood ratios
  let numerator = priorProbability;
  let denominator = priorProbability;

  for (const { score, weight } of likelihoods) {
    // Likelihood ratio: P(evidence | same) / P(evidence | different)
    const likelihoodSame = score;
    const likelihoodDifferent = 1 - score;
    const ratio = likelihoodSame / Math.max(likelihoodDifferent, 0.001);

    numerator *= Math.pow(ratio, weight);
    denominator = denominator * Math.pow(ratio, weight) + (1 - priorProbability);
  }

  return Math.min(0.999, Math.max(0.001, numerator / Math.max(denominator, 0.001)));
}