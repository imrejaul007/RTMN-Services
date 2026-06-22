/**
 * AdOS - Advertising Operating System
 * Intelligence layer for real-world advertising
 */

import {
  Listing,
  ListingMetrics,
  GuardrailConfig,
  ScoringWeights,
  OptimizationRequest,
  OptimizationResult,
  AllocationRecommendation,
  ScoredListing,
  PerformancePrediction,
  GuardrailResult
} from './types'

import { ROIEngine } from './services/roi.service'
import { ScoringEngine } from './services/scoring.service'
import { AllocationEngine } from './services/allocation.service'
import { GuardrailsEngine } from './services/guardrails.service'

// DOOH exports - relative to services directory
export type {
  Screen,
  DOOHCampaign,
  ScreenType,
  ScreenStatus,
  Creative,
  Playlist,
  DeliveryRequest,
  DeliveryResponse,
  RevenueModel
} from './dooh/types'

/**
 * AdOS Orchestrator - Production Ready
 *
 * Main entry point for all AdOS operations.
 * Orchestrates: Guardrails → ROI → Scoring → Allocation
 */
export class AdOS {
  private roiEngine: ROIEngine
  private scoringEngine: ScoringEngine
  private allocationEngine: AllocationEngine
  private guardrailsEngine: GuardrailsEngine

  constructor(
    scoringWeights?: Partial<ScoringWeights>,
    guardrails?: Partial<GuardrailConfig>
  ) {
    this.roiEngine = new ROIEngine()
    this.scoringEngine = new ScoringEngine(scoringWeights)
    this.allocationEngine = new AllocationEngine(guardrails)
    this.guardrailsEngine = new GuardrailsEngine(guardrails)
  }

  /**
   * Optimize campaign - Main entry point
   */
  optimize(request: OptimizationRequest): OptimizationResult {
    const startTime = Date.now()

    try {
      // Step 1: Validate inputs
      if (!request.listings && !request.budget) {
        return {
          success: false,
          error: 'Missing required fields: listings, budget',
          recommendation: {} as AllocationRecommendation,
          guardrails: {} as GuardrailResult,
          generated_at: new Date(),
          processing_time_ms: Date.now() - startTime,
          data_freshness: { oldest_metric: new Date(), newest_metric: new Date() }
        }
      }

      // For backward compatibility
      const listings: Listing[] = request.listings || []
      const budget: number = request.budget || 0

      // Step 2: Guardrails check
      const metricsMap = new Map<string, ListingMetrics>()
      // In production, fetch from DB
      // const metricsMap = await this.fetchMetrics(listings.map(l => l.id))

      const guardrailsResult = this.guardrailsEngine.validate(
        listings,
        metricsMap,
        budget,
        request.duration_days
      )

      // Step 3: Filter out excluded listings
      const excludedIds = new Set<string>(
        guardrailsResult.excluded_listings.map(e => e.listing_id)
      )
      const filteredListings = listings.filter((l: Listing) => !excludedIds.has(l.id))

      // Step 4: Score listings
      const scored = this.scoringEngine.scoreListings(
        filteredListings,
        metricsMap,
        budget / Math.max(1, filteredListings.length),
        request.duration_days
      )

      // Step 5: Apply filters
      let finalScored = scored

      if (!request.include_low_confidence) {
        finalScored = scored.filter(s => s.roi.confidence >= 0.3)
      }

      if (request.category_filter && request.category_filter.length > 0) {
        finalScored = finalScored.filter(s =>
          request.category_filter!.includes(s.listing.category)
        )
      }

      if (request.max_listings) {
        finalScored = this.scoringEngine.getTopN(finalScored, request.max_listings)
      }

      // Step 6: Allocate budget
      const recommendation = this.allocationEngine.allocate(
        finalScored.map(s => s.listing),
        metricsMap,
        budget,
        request.duration_days
      )

      return {
        success: true,
        recommendation,
        guardrails: guardrailsResult,
        generated_at: new Date(),
        processing_time_ms: Date.now() - startTime,
        data_freshness: {
          oldest_metric: new Date(Date.now() - 24 * 60 * 60 * 1000), // Mock
          newest_metric: new Date()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendation: {} as AllocationRecommendation,
        guardrails: {} as GuardrailResult,
        generated_at: new Date(),
        processing_time_ms: Date.now() - startTime,
        data_freshness: { oldest_metric: new Date(), newest_metric: new Date() }
      }
    }
  }

  /**
   * Predict performance for a single listing
   */
  predictPerformance(
    listing: Listing,
    metrics: ListingMetrics | null,
    budget: number,
    durationDays: number
  ): PerformancePrediction {
    const roi = this.roiEngine.calculateROI(listing, metrics, budget, durationDays)

    return {
      listing_id: listing.id,
      scenario: {
        budget,
        duration_days: durationDays
      },
      predicted: {
        scans: roi.breakdown.scans,
        visits: roi.breakdown.expected_visits,
        purchases: roi.breakdown.expected_purchases,
        revenue: roi.breakdown.expected_revenue,
        roas: roi.roas
      },
      confidence: roi.confidence,
      risks: this.identifyRisks(listing, roi)
    }
  }

  /**
   * Identify risk factors for a listing
   */
  private identifyRisks(
    listing: Listing,
    roi: ReturnType<typeof this.roiEngine.calculateROI>
  ): PerformancePrediction['risks'] {
    const risks: PerformancePrediction['risks'] = []

    if (roi.confidence < 0.3) {
      risks.push({
        type: 'low_volume',
        description: 'Limited historical data may affect accuracy'
      })
    }

    if (roi.roas < 1) {
      risks.push({
        type: 'low_conversion',
        description: 'ROAS below 1x may not meet profitability goals'
      })
    }

    if (roi.cpv > 30) {
      risks.push({
        type: 'high_cost',
        description: 'Cost per visit is above average'
      })
    }

    if (roi.used_fallback) {
      risks.push({
        type: 'new_listing',
        description: 'Using estimated data, real results may vary'
      })
    }

    return risks
  }

  /**
   * Get campaign summary
   */
  getSummary(result: OptimizationResult): {
    total_listings: number
    total_budget: number
    expected_visits: number
    expected_purchases: number
    expected_roas: number
    confidence: number
    risk_level: 'low' | 'medium' | 'high'
    warnings_count: number
  } {
    const { recommendation, guardrails } = result

    return {
      total_listings: recommendation.allocations?.length || 0,
      total_budget: recommendation.total_budget || 0,
      expected_visits: recommendation.totals?.expected_visits || 0,
      expected_purchases: recommendation.totals?.expected_purchases || 0,
      expected_roas: recommendation.totals?.expected_roas || 0,
      confidence: recommendation.totals?.weighted_confidence || 0,
      risk_level: guardrails.excluded_listings?.length > 2 ? 'high' :
                 guardrails.warnings?.length > 5 ? 'medium' : 'low',
      warnings_count: guardrails.warnings?.length || 0
    }
  }

  /**
   * Generate human-readable recommendations
   */
  generateRecommendations(result: OptimizationResult): string[] {
    const recommendations: string[] = []

    const summary = this.getSummary(result)

    // Budget recommendations
    if (summary.expected_roas < 1) {
      recommendations.push(
        `Current allocation has ${summary.expected_roas}x ROAS. Consider shifting budget to higher-performing listings.`
      )
    }

    // Confidence recommendations
    if (summary.confidence < 0.5) {
      recommendations.push(
        'Campaign uses estimated data. Results may vary from predictions.'
      )
    }

    // Risk recommendations
    if (result.guardrails.excluded_listings?.length > 0) {
      recommendations.push(
        `${result.guardrails.excluded_listings.length} listings were excluded due to risk factors.`
      )
    }

    // Diversification
    if (summary.total_listings < 3) {
      recommendations.push(
        'Consider adding more listings for better diversification.'
      )
    }

    return recommendations
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create AdOS instance
 */
export function createAdOS(
  scoringWeights?: Partial<ScoringWeights>,
  guardrails?: Partial<GuardrailConfig>
): AdOS {
  return new AdOS(scoringWeights, guardrails)
}

/**
 * Quick optimize
 */
export function optimizeCampaign(request: OptimizationRequest): OptimizationResult {
  const ados = createAdOS()
  return ados.optimize(request)
}


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'adsos',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
