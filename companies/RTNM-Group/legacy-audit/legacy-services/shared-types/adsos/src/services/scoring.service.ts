/**
 * AdOS - Scoring Engine Service
 * Scores listings based on ROI, confidence, volume, and category match
 */

import {
  Listing,
  ListingMetrics,
  ROIResult,
  ScoringWeights,
  ScoredListing,
  DEFAULT_SCORING_WEIGHTS
} from '../types'
import { ROIEngine } from './roi.service'

/**
 * Scoring Engine - Production Ready
 *
 * Scores listings using weighted factors:
 * - ROAS (50%) - Primary metric
 * - Confidence (20%) - Data quality
 * - Volume (20%) - Scale potential
 * - Category Match (10%) - Targeting precision
 */
export class ScoringEngine {
  private roiEngine: ROIEngine
  private weights: ScoringWeights

  constructor(weights?: Partial<ScoringWeights>) {
    this.roiEngine = new ROIEngine()
    this.weights = { ...DEFAULT_SCORING_WEIGHTS, ...weights }
  }

  /**
   * Update scoring weights
   */
  setWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights }
  }

  /**
   * Get current weights
   */
  getWeights(): ScoringWeights {
    return { ...this.weights }
  }

  /**
   * Score a single listing
   */
  scoreListing(
    listing: Listing,
    metrics: ListingMetrics | null,
    budget: number,
    durationDays?: number
  ): ScoredListing {

    // Calculate ROI
    const roi = this.roiEngine.calculateROI(listing, metrics, budget, durationDays)

    // Calculate score
    const score = this.calculateScore(roi, listing)

    return {
      listing,
      metrics,
      roi,
      score,
      rank: 0, // Set later during ranking
      weights: { ...this.weights }
    }
  }

  /**
   * Score multiple listings
   */
  scoreListings(
    listings: Listing[],
    metricsMap: Map<string, ListingMetrics>,
    budget: number,
    durationDays?: number
  ): ScoredListing[] {

    // Score each listing
    const scored = listings.map(listing =>
      this.scoreListing(listing, metricsMap.get(listing.id) || null, budget, durationDays)
    )

    // Rank by score
    return this.rankScoredListings(scored)
  }

  /**
   * Calculate composite score
   */
  private calculateScore(roi: ROIResult, listing: Listing): number {
    // Normalize each factor to 0-1 scale

    // ROAS score: 0-1 based on ROAS value
    // ROAS of 1 = 0.5, ROAS of 5 = 1.0, ROAS of 0 = 0
    const roasScore = this.normalizeROAS(roi.roas)

    // Confidence score: already 0-1
    const confidenceScore = roi.confidence

    // Volume score: 0-1 based on potential
    const volumeScore = listing.volume_potential || 0.5

    // Category match score: 0-1
    const categoryScore = listing.category_match || 0.5

    // Weighted sum
    const score =
      (roasScore * this.weights.roas) +
      (confidenceScore * this.weights.confidence) +
      (volumeScore * this.weights.volume) +
      (categoryScore * this.weights.category_match)

    return Math.round(score * 1000) / 1000 // Round to 3 decimals
  }

  /**
   * Normalize ROAS to 0-1 scale
   *
   * Scale:
   * - ROAS 0 = 0
   * - ROAS 1 = 0.5
   * - ROAS 3+ = 1.0 (capped)
   */
  private normalizeROAS(roas: number): number {
    if (roas <= 0) return 0
    if (roas >= 3) return 1

    // Linear scale from 0 to 3 = 0 to 1
    return roas / 3
  }

  /**
   * Rank scored listings by score (descending)
   */
  rankScoredListings(scored: ScoredListing[]): ScoredListing[] {
    // Sort by score descending
    const sorted = scored.sort((a, b) => b.score - a.score)

    // Assign ranks
    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1
    }))
  }

  /**
   * Get top N listings
   */
  getTopN(scored: ScoredListing[], n: number): ScoredListing[] {
    return scored.slice(0, n)
  }

  /**
   * Filter by minimum score threshold
   */
  filterByScore(scored: ScoredListing[], minScore: number): ScoredListing[] {
    return scored.filter(s => s.score >= minScore)
  }

  /**
   * Get score distribution summary
   */
  getScoreDistribution(scored: ScoredListing[]): {
    excellent: number
    good: number
    fair: number
    poor: number
  } {
    return {
      excellent: scored.filter(s => s.score >= 0.8).length,
      good: scored.filter(s => s.score >= 0.6 && s.score < 0.8).length,
      fair: scored.filter(s => s.score >= 0.4 && s.score < 0.6).length,
      poor: scored.filter(s => s.score < 0.4).length
    }
  }

  /**
   * Get score statistics
   */
  getScoreStats(scored: ScoredListing[]): {
    avg: number
    median: number
    min: number
    max: number
    total: number
  } {
    if (scored.length === 0) {
      return { avg: 0, median: 0, min: 0, max: 0, total: 0 }
    }

    const scores = scored.map(s => s.score).sort((a, b) => a - b)
    const sum = scores.reduce((a, b) => a + b, 0)

    return {
      avg: Math.round((sum / scores.length) * 100) / 100,
      median: scores[Math.floor(scores.length / 2)],
      min: scores[0],
      max: scores[scores.length - 1],
      total: scored.length
    }
  }

  /**
   * Explain score breakdown for a listing
   */
  explainScore(scored: ScoredListing): {
    component: string
    value: number
    weight: number
    contribution: number
    reason: string
  }[] {
    const roi = scored.roi
    const roasScore = this.normalizeROAS(roi.roas)

    return [
      {
        component: 'ROAS',
        value: roi.roas,
        weight: this.weights.roas,
        contribution: roasScore * this.weights.roas,
        reason: roi.used_fallback
          ? `Estimated from ${roi.fallback_source}`
          : 'Based on real performance data'
      },
      {
        component: 'Confidence',
        value: roi.confidence,
        weight: this.weights.confidence,
        contribution: roi.confidence * this.weights.confidence,
        reason: `${roi.data_points} data points`
      },
      {
        component: 'Volume',
        value: scored.listing.volume_potential || 0.5,
        weight: this.weights.volume,
        contribution: (scored.listing.volume_potential || 0.5) * this.weights.volume,
        reason: 'Estimated reach potential'
      },
      {
        component: 'Category Match',
        value: scored.listing.category_match || 0.5,
        weight: this.weights.category_match,
        contribution: (scored.listing.category_match || 0.5) * this.weights.category_match,
        reason: 'Audience targeting precision'
      }
    ]
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create Scoring Engine with custom weights
 */
export function createScoringEngine(
  weights?: Partial<ScoringWeights>
): ScoringEngine {
  return new ScoringEngine(weights)
}

/**
 * Quick score calculation
 */
export function scoreListing(
  listing: Listing,
  metrics: ListingMetrics | null,
  budget: number,
  weights?: Partial<ScoringWeights>
): ScoredListing {
  const engine = new ScoringEngine(weights)
  return engine.scoreListing(listing, metrics, budget)
}
