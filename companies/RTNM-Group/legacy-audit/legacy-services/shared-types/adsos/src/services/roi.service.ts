/**
 * AdOS - ROI Engine Service
 * Calculates Return on Ad Spend with confidence scoring
 */

import {
  Listing,
  ListingMetrics,
  CategoryAverages,
  ROIResult,
  DEFAULT_CATEGORY_AVERAGES
} from '../types'

/**
 * ROI Engine - Production Ready
 *
 * Calculates ROAS (Return on Ad Spend) with confidence scoring.
 * Uses real data when available, falls back to category averages.
 */
export class ROIEngine {
  private categoryAverages: Map<string, CategoryAverages>
  private minDataPoints: number

  constructor(categoryAverages?: CategoryAverages[], minDataPoints = 10) {
    this.minDataPoints = minDataPoints

    // Build category lookup map
    this.categoryAverages = new Map()
    const defaults = categoryAverages || DEFAULT_CATEGORY_AVERAGES
    defaults.forEach(cat => {
      this.categoryAverages.set(cat.category.toLowerCase(), cat)
    })
  }

  /**
   * Get category average for fallback
   */
  getCategoryAverage(category: string): CategoryAverages | null {
    return this.categoryAverages.get(category.toLowerCase()) || null
  }

  /**
   * Update category averages from real data
   */
  updateCategoryAverages(category: string, averages: CategoryAverages): void {
    this.categoryAverages.set(category.toLowerCase(), averages)
  }

  /**
   * Calculate ROI for a listing
   *
   * @param listing - The listing/campaign to analyze
   * @param metrics - Real metrics from attribution system (nullable)
   * @param budget - Campaign budget
   * @param durationDays - Campaign duration
   * @returns ROIResult with confidence scoring
   */
  calculateROI(
    listing: Listing,
    metrics: ListingMetrics | null,
    budget: number,
    durationDays: number = 30
  ): ROIResult {

    // Determine data quality
    const hasRealData = metrics && metrics.data_points >= this.minDataPoints
    const categoryAvg = this.getCategoryAverage(listing.category)

    // Get rates (real or fallback)
    const scanToVisitRate = hasRealData
      ? metrics!.scan_to_visit_rate
      : (categoryAvg?.avg_scan_to_visit_rate || 0.25)

    const visitToPurchaseRate = hasRealData
      ? metrics!.visit_to_purchase_rate
      : (categoryAvg?.avg_visit_to_purchase_rate || 0.20)

    const avgOrderValue = hasRealData
      ? metrics!.avg_order_value
      : (categoryAvg?.avg_order_value || 400)

    // Calculate expected values
    // Assume scans scale with budget and listing volume potential
    const baseScansPerMonth = this.estimateBaseScans(listing, durationDays)
    const totalScans = Math.round(baseScansPerMonth * (budget / 10000)) // Scale by budget

    const expectedVisits = totalScans * scanToVisitRate
    const expectedPurchases = expectedVisits * visitToPurchaseRate
    const expectedRevenue = expectedPurchases * avgOrderValue

    // Calculate costs
    const totalCost = this.calculateTotalCost(listing, budget)

    // ROAS = Revenue / Cost
    const roas = totalCost > 0 ? expectedRevenue / totalCost : 0

    // Cost per metrics
    const cpv = expectedVisits > 0 ? totalCost / expectedVisits : totalCost
    const cpp = expectedPurchases > 0 ? totalCost / expectedPurchases : totalCost

    // Confidence based on data points
    // More data = higher confidence
    const dataPoints = hasRealData ? metrics!.data_points : (categoryAvg?.sample_size || 0)
    const confidence = this.calculateConfidence(dataPoints, hasRealData || false)

    // Estimate ranges using confidence
    const uncertainty = 1 - confidence
    const estimate = {
      roas: {
        min: Math.max(0, roas * (1 - uncertainty)),
        max: roas * (1 + uncertainty)
      },
      visits: {
        min: Math.round(expectedVisits * (1 - uncertainty)),
        max: Math.round(expectedVisits * (1 + uncertainty))
      },
      purchases: {
        min: Math.round(expectedPurchases * (1 - uncertainty)),
        max: Math.round(expectedPurchases * (1 + uncertainty))
      }
    }

    return {
      roas: Math.round(roas * 100) / 100,
      cpp: Math.round(cpp * 100) / 100,
      cpv: Math.round(cpv * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      data_points: dataPoints,
      used_fallback: !hasRealData,
      fallback_source: !hasRealData ? (categoryAvg ? 'category_avg' : 'default') : undefined,
      estimate,
      breakdown: {
        scans: totalScans,
        expected_visits: Math.round(expectedVisits),
        expected_purchases: Math.round(expectedPurchases),
        expected_revenue: Math.round(expectedRevenue),
        total_cost: Math.round(totalCost)
      }
    }
  }

  /**
   * Estimate base monthly scans for a listing
   * Based on category, volume potential, and location
   */
  private estimateBaseScans(listing: Listing, durationDays: number): number {
    const baseScans = 500 // Base assumption

    // Adjust by volume potential (0-1)
    const volumeAdjusted = baseScans * (listing.volume_potential || 0.5)

    // Adjust by category
    const categoryMultiplier = this.getCategoryMultiplier(listing.category)

    // Adjust by duration
    const durationMultiplier = durationDays / 30

    return Math.round(volumeAdjusted * categoryMultiplier * durationMultiplier)
  }

  /**
   * Get scan multiplier by category
   */
  private getCategoryMultiplier(category: string): number {
    const multipliers: Record<string, number> = {
      'restaurant': 1.5,
      'retail': 1.3,
      'gym': 0.8,
      'auto': 2.0,
      'billboard': 0.5,
      'influencer': 2.5,
      'event': 3.0,
      'other': 1.0
    }
    return multipliers[category.toLowerCase()] || 1.0
  }

  /**
   * Calculate total cost for a campaign
   */
  private calculateTotalCost(listing: Listing, budget: number): number {
    switch (listing.pricing.type) {
      case 'owner':
        // Fixed cost + commission
        const basePrice = listing.pricing.base_price || 0
        const commission = listing.pricing.commission_rate || 0.15
        return basePrice + (basePrice * commission)

      case 'platform':
        // Performance-based cost
        return budget

      case 'hybrid':
        // Base + performance
        const hybridBase = listing.pricing.base_price || 0
        const hybridPerf = budget - hybridBase
        return hybridBase + Math.max(0, hybridPerf)

      default:
        return budget
    }
  }

  /**
   * Calculate confidence score (0-1)
   * Based on data points and whether real data is used
   */
  private calculateConfidence(dataPoints: number, hasRealData: boolean): number {
    if (!hasRealData) {
      // Lower confidence for fallback data
      return Math.min(0.3, dataPoints / 100)
    }

    // Real data - higher confidence
    // Formula: min(1, dataPoints / 200)
    // At 200 data points = 100% confidence
    return Math.min(1, dataPoints / 200)
  }

  /**
   * Compare two listings by ROI
   */
  compareROI(a: ROIResult, b: ROIResult): number {
    // Adjust by confidence (prefer high ROI + high confidence)
    const adjustedA = a.roas * a.confidence
    const adjustedB = b.roas * b.confidence
    return adjustedB - adjustedA
  }

  /**
   * Check if ROI meets minimum threshold
   */
  meetsThreshold(roi: ROIResult, minRoas: number = 0.5): boolean {
    return roi.roas >= minRoas
  }

  /**
   * Get ROI grade
   */
  getROIGrade(roi: ROIResult): 'excellent' | 'good' | 'fair' | 'poor' {
    if (roi.roas >= 3) return 'excellent'
    if (roi.roas >= 1.5) return 'good'
    if (roi.roas >= 0.8) return 'fair'
    return 'poor'
  }

  /**
   * Get confidence label
   */
  getConfidenceLabel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.7) return 'high'
    if (confidence >= 0.4) return 'medium'
    return 'low'
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create ROI Engine instance with defaults
 */
export function createROIEngine(
  categoryAverages?: CategoryAverages[],
  minDataPoints?: number
): ROIEngine {
  return new ROIEngine(categoryAverages, minDataPoints)
}

/**
 * Quick ROI calculation (singleton usage)
 */
export function calculateROI(
  listing: Listing,
  metrics: ListingMetrics | null,
  budget: number,
  durationDays?: number
): ROIResult {
  const engine = new ROIEngine()
  return engine.calculateROI(listing, metrics, budget, durationDays)
}
