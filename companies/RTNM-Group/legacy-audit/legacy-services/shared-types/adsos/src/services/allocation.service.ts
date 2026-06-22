/**
 * AdOS - Budget Allocation Service
 * Intelligently distributes budget across listings
 */

import {
  Listing,
  ListingMetrics,
  ScoredListing,
  BudgetAllocation,
  AllocationRecommendation,
  AllocationWarning,
  DEFAULT_GUARDRAILS,
  GuardrailConfig
} from '../types'
import { ScoringEngine } from './scoring.service'
import { ROIEngine } from './roi.service'

/**
 * Budget Allocation Engine - Production Ready
 *
 * Distributes budget across listings based on:
 * - Score ranking
 * - Proportional to score weight
 * - Guardrail enforcement
 */
export class AllocationEngine {
  private scoringEngine: ScoringEngine
  private roiEngine: ROIEngine
  private guardrails: GuardrailConfig

  constructor(guardrails?: Partial<GuardrailConfig>) {
    this.scoringEngine = new ScoringEngine()
    this.roiEngine = new ROIEngine()
    this.guardrails = { ...DEFAULT_GUARDRAILS, ...guardrails }
  }

  /**
   * Allocate budget across listings
   */
  allocate(
    listings: Listing[],
    metricsMap: Map<string, ListingMetrics>,
    totalBudget: number,
    durationDays?: number
  ): AllocationRecommendation {

    const startTime = Date.now()

    // Step 1: Score all listings
    const scored = this.scoringEngine.scoreListings(
      listings,
      metricsMap,
      totalBudget / listings.length, // Per-listing budget estimate
      durationDays
    )

    // Step 2: Filter by guardrails
    const filtered = this.enforceGuardrails(scored)

    // Step 3: Calculate score weights
    const totalScore = filtered.reduce((sum, s) => sum + s.score, 0) || 1

    // Step 4: Allocate budget proportionally
    let allocatedBudget = 0
    const allocations: BudgetAllocation[] = []

    for (const scoredListing of filtered) {
      // Calculate proportional allocation
      const percentage = totalScore > 0 ? scoredListing.score / totalScore : 0
      const allocation = Math.round(totalBudget * percentage)

      // Enforce minimum budget per listing
      const finalAllocation = Math.max(
        allocation,
        this.guardrails.min_budget_per_listing
      )

      // Check if we have budget remaining
      if (allocatedBudget + finalAllocation > totalBudget) {
        break // Can't allocate more
      }

      // Calculate expected results
      const expected = this.calculateExpected(
        scoredListing,
        finalAllocation,
        durationDays
      )

      // Check for warnings
      const warnings = this.checkWarnings(scoredListing, finalAllocation)

      allocations.push({
        listing_id: scoredListing.listing.id,
        listing_name: scoredListing.listing.name,
        allocated_budget: finalAllocation,
        percentage_of_total: Math.round((allocation / totalBudget) * 10000) / 100,
        expected_visits: expected.visits,
        expected_purchases: expected.purchases,
        expected_roas: expected.roas,
        confidence: scoredListing.roi.confidence,
        warnings
      })

      allocatedBudget += finalAllocation
    }

    // Step 5: Calculate totals
    const totals = this.calculateTotals(allocations)

    // Step 6: Calculate unallocated
    const unallocated = totalBudget - allocatedBudget
    const unallocatedPercentage = (unallocated / totalBudget) * 100

    return {
      total_budget: totalBudget,
      listings: scored,
      allocations,
      totals,
      unallocated,
      unallocated_percentage: Math.round(unallocatedPercentage * 100) / 100
    }
  }

  /**
   * Enforce guardrails on scored listings
   */
  private enforceGuardrails(scored: ScoredListing[]): ScoredListing[] {
    return scored.filter(s => {
      // Check confidence threshold
      if (s.roi.confidence < this.guardrails.min_confidence_threshold) {
        return false
      }

      // Check ROAS threshold
      if (s.roi.roas < this.guardrails.min_roas_threshold) {
        return false
      }

      return true
    })
  }

  /**
   * Calculate expected results for an allocation
   */
  private calculateExpected(
    scored: ScoredListing,
    budget: number,
    durationDays?: number
  ): { visits: number; purchases: number; roas: number } {

    const roi = scored.roi

    // Scale ROI results by budget ratio
    const budgetRatio = budget / 10000 // Normalize to ₹10k baseline

    const visits = Math.round(roi.breakdown.expected_visits * budgetRatio)
    const purchases = Math.round(roi.breakdown.expected_purchases * budgetRatio)
    const roas = roi.roas // ROAS doesn't scale with budget

    return { visits, purchases, roas }
  }

  /**
   * Check for allocation warnings
   */
  private checkWarnings(
    scored: ScoredListing,
    budget: number
  ): AllocationWarning[] {
    const warnings: AllocationWarning[] = []

    // Low confidence warning
    if (scored.roi.confidence < 0.4) {
      warnings.push({
        type: 'low_confidence',
        message: `Low data confidence (${Math.round(scored.roi.confidence * 100)}%)`,
        severity: scored.roi.confidence < 0.2 ? 'critical' : 'warning'
      })
    }

    // New listing warning
    if (scored.roi.used_fallback) {
      warnings.push({
        type: 'new_listing',
        message: 'Using estimated data (no real performance yet)',
        severity: 'info'
      })
    }

    // Low ROI warning
    if (scored.roi.roas < 1) {
      warnings.push({
        type: 'low_roi',
        message: `Below average ROAS (${scored.roi.roas}x)`,
        severity: scored.roi.roas < 0.5 ? 'critical' : 'warning'
      })
    }

    // High cost per visit
    if (scored.roi.cpv > this.guardrails.max_cost_per_visit) {
      warnings.push({
        type: 'high_cpv',
        message: `Cost per visit (₹${scored.roi.cpv}) exceeds threshold`,
        severity: 'warning'
      })
    }

    // Low budget warning
    if (budget < this.guardrails.min_budget_per_listing * 2) {
      warnings.push({
        type: 'budget_low',
        message: 'Budget may be too low for meaningful results',
        severity: 'info'
      })
    }

    return warnings
  }

  /**
   * Calculate total metrics
   */
  private calculateTotals(allocations: BudgetAllocation[]): {
    allocated: number
    expected_visits: number
    expected_purchases: number
    expected_roas: number
    weighted_confidence: number
  } {
    if (allocations.length === 0) {
      return {
        allocated: 0,
        expected_visits: 0,
        expected_purchases: 0,
        expected_roas: 0,
        weighted_confidence: 0
      }
    }

    const totalBudget = allocations.reduce((sum, a) => sum + a.allocated_budget, 0)
    const totalVisits = allocations.reduce((sum, a) => sum + a.expected_visits, 0)
    const totalPurchases = allocations.reduce((sum, a) => sum + a.expected_purchases, 0)
    const totalRevenue = allocations.reduce((sum, a) => sum + (a.expected_purchases * a.expected_roas * 100), 0)

    // Weighted confidence (by budget)
    const weightedConf = allocations.reduce((sum, a) =>
      sum + (a.confidence * a.allocated_budget), 0) / totalBudget

    return {
      allocated: totalBudget,
      expected_visits: totalVisits,
      expected_purchases: totalPurchases,
      expected_roas: totalBudget > 0 ? Math.round((totalRevenue / totalBudget) * 100) / 100 : 0,
      weighted_confidence: Math.round(weightedConf * 100) / 100
    }
  }

  /**
   * Optimize allocation for specific goal
   */
  optimizeForGoal(
    listings: Listing[],
    metricsMap: Map<string, ListingMetrics>,
    totalBudget: number,
    goal: 'max_visits' | 'max_purchases' | 'max_roas',
    durationDays?: number
  ): AllocationRecommendation {

    // Adjust scoring weights based on goal
    const weights = this.scoringEngine.getWeights()

    switch (goal) {
      case 'max_visits':
        this.scoringEngine.setWeights({
          ...weights,
          roas: 0.3,
          volume: 0.4
        })
        break

      case 'max_purchases':
        this.scoringEngine.setWeights({
          ...weights,
          roas: 0.4,
          confidence: 0.3
        })
        break

      case 'max_roas':
        this.scoringEngine.setWeights({
          ...weights,
          roas: 0.7,
          confidence: 0.2
        })
        break
    }

    return this.allocate(listings, metricsMap, totalBudget, durationDays)
  }

  /**
   * Reallocate from poor performers to good performers
   */
  reallocate(
    current: AllocationRecommendation,
    reallocationPercentage: number = 0.2
  ): AllocationRecommendation {

    // Find poor performers (bottom 20% by ROAS)
    const sorted = [...current.allocations].sort((a, b) => a.expected_roas - b.expected_roas)
    const cutoff = Math.floor(sorted.length * 0.2)

    const poorPerformers = sorted.slice(0, cutoff)
    const goodPerformers = sorted.slice(cutoff)

    // Calculate reallocation amount
    const poorBudget = poorPerformers.reduce((sum, a) => sum + a.allocated_budget, 0)
    const reallocationAmount = poorBudget * reallocationPercentage

    // Apply reallocation
    const reallocated = current.allocations.map(allocation => {
      const isGood = goodPerformers.some(g => g.listing_id === allocation.listing_id)

      if (isGood && reallocationAmount > 0) {
        const extraBudget = (allocation.allocated_budget / goodPerformers.reduce((s, g) => s + g.allocated_budget, 0)) * reallocationAmount
        return {
          ...allocation,
          allocated_budget: Math.round(allocation.allocated_budget + extraBudget),
          warnings: [
            ...allocation.warnings,
            {
              type: 'budget_low' as const,
              message: 'Budget increased due to reallocation',
              severity: 'info' as const
            }
          ]
        }
      }

      if (!isGood) {
        const reduction = allocation.allocated_budget * reallocationPercentage
        return {
          ...allocation,
          allocated_budget: Math.round(allocation.allocated_budget - reduction),
          warnings: [
            ...allocation.warnings,
            {
              type: 'budget_low' as const,
              message: 'Budget reduced due to reallocation',
              severity: 'warning' as const
            }
          ]
        }
      }

      return allocation
    })

    // Recalculate totals
    const totals = this.calculateTotals(reallocated)

    return {
      ...current,
      allocations: reallocated,
      totals
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create allocation engine
 */
export function createAllocationEngine(
  guardrails?: Partial<GuardrailConfig>
): AllocationEngine {
  return new AllocationEngine(guardrails)
}

/**
 * Quick allocation
 */
export function allocateBudget(
  listings: Listing[],
  metricsMap: Map<string, ListingMetrics>,
  totalBudget: number,
  durationDays?: number
): AllocationRecommendation {
  const engine = new AllocationEngine()
  return engine.allocate(listings, metricsMap, totalBudget, durationDays)
}
