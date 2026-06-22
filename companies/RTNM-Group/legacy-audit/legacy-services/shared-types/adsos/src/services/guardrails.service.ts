/**
 * AdOS - Guardrails Service
 * Enforces safety limits and prevents abuse
 */

import {
  Listing,
  ListingMetrics,
  GuardrailConfig,
  GuardrailResult,
  GuardrailModification,
  ExcludedListing,
  DEFAULT_GUARDRAILS
} from '../types'

/**
 * Guardrails Engine - Production Ready
 *
 * Enforces:
 * - Budget limits
 * - Performance thresholds
 * - Quality standards
 * - Fraud prevention
 */
export class GuardrailsEngine {
  private config: GuardrailConfig

  constructor(config?: Partial<GuardrailConfig>) {
    this.config = { ...DEFAULT_GUARDRAILS, ...config }
  }

  /**
   * Update guardrail configuration
   */
  setConfig(config: Partial<GuardrailConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): GuardrailConfig {
    return { ...this.config }
  }

  /**
   * Validate entire campaign request
   */
  validate(
    listings: Listing[],
    metricsMap: Map<string, ListingMetrics>,
    totalBudget: number,
    durationDays?: number
  ): GuardrailResult {

    const modifications: GuardrailModification[] = []
    const excluded: ExcludedListing[] = []
    const warnings: string[] = []

    // Check total budget
    if (totalBudget < this.config.min_total_budget) {
      warnings.push(
        `Total budget (₹${totalBudget}) is below minimum (₹${this.config.min_total_budget})`
      )
    }

    // Check duration
    if (durationDays && durationDays > this.config.max_campaign_duration_days) {
      warnings.push(
        `Campaign duration (${durationDays} days) exceeds maximum (${this.config.max_campaign_duration_days} days)`
      )
    }

    // Check listings count
    if (listings.length > this.config.max_listings_per_campaign) {
      warnings.push(
        `Too many listings (${listings.length}). Max is ${this.config.max_listings_per_campaign}`
      )
    }

    // Validate each listing
    const validated: Listing[] = []

    for (const listing of listings) {
      const metrics = metricsMap.get(listing.id) || null
      const result = this.validateListing(listing, metrics, totalBudget / listings.length)

      if (result.excluded) {
        excluded.push({
          listing_id: listing.id,
          reason: result.exclusionReason!,
          severity: result.exclusionSeverity!
        })
      } else {
        // Apply modifications
        if (result.modifications.length > 0) {
          modifications.push(...result.modifications)
          warnings.push(...result.warnings)
        }
        validated.push(listing)
      }
    }

    return {
      passed: excluded.length === 0 && warnings.filter(w => w.includes('critical')).length === 0,
      modifications,
      excluded_listings: excluded,
      warnings
    }
  }

  /**
   * Validate a single listing
   */
  validateListing(
    listing: Listing,
    metrics: ListingMetrics | null,
    estimatedBudget: number
  ): {
    excluded: boolean
    exclusionReason?: string
    exclusionSeverity?: 'warning' | 'critical'
    modifications: GuardrailModification[]
    warnings: string[]
  } {

    const modifications: GuardrailModification[] = []
    const warnings: string[] = []

    // 1. Check budget constraints
    if (estimatedBudget < this.config.min_budget_per_listing) {
      return {
        excluded: true,
        exclusionReason: `Budget (₹${estimatedBudget}) below minimum (₹${this.config.min_budget_per_listing})`,
        exclusionSeverity: 'warning',
        modifications: [],
        warnings: []
      }
    }

    if (estimatedBudget > this.config.max_budget_per_listing) {
      modifications.push({
        listing_id: listing.id,
        field: 'budget',
        original_value: estimatedBudget,
        new_value: this.config.max_budget_per_listing,
        reason: 'Exceeds maximum budget per listing'
      })
      estimatedBudget = this.config.max_budget_per_listing
    }

    // 2. Check ROI threshold
    if (metrics) {
      const roas = this.calculateROAS(metrics)
      if (roas < this.config.min_roas_threshold) {
        warnings.push(
          `Listing "${listing.name}" has low ROAS (${roas}x). Consider removing.`
        )
      }
    }

    // 3. Check confidence threshold
    if (metrics && metrics.data_points < this.config.min_data_points) {
      warnings.push(
        `Listing "${listing.name}" has insufficient data (${metrics.data_points} points)`
      )
    }

    // 4. Check for suspicious patterns
    if (metrics) {
      const fraudCheck = this.checkFraudPattern(listing, metrics)
      if (fraudCheck.suspicious) {
        warnings.push(fraudCheck.message!)
        if (fraudCheck.critical) {
          return {
            excluded: true,
            exclusionReason: fraudCheck.message!,
            exclusionSeverity: 'critical',
            modifications: [],
            warnings: []
          }
        }
      }
    }

    return {
      excluded: false,
      modifications,
      warnings
    }
  }

  /**
   * Check for fraud patterns
   */
  private checkFraudPattern(
    listing: Listing,
    metrics: ListingMetrics
  ): { suspicious: boolean; critical: boolean; message?: string } {

    // Check scan rate (too many scans per visit = suspicious)
    if (metrics.scans > 0 && metrics.visits > 0) {
      const scanRate = metrics.scans / metrics.visits
      if (scanRate > this.config.max_visit_rate_per_scan) {
        return {
          suspicious: true,
          critical: false,
          message: `Unusual scan/visit ratio (${scanRate.toFixed(1)}x). May indicate fake scans.`
        }
      }
    }

    // Check for 100% conversion (suspicious)
    if (metrics.visits > 0 && metrics.purchases >= metrics.visits) {
      return {
        suspicious: true,
        critical: true,
        message: '100% visit-to-purchase rate detected. Likely fraud.'
      }
    }

    // Check for zero visits with high scans (fake engagement)
    if (metrics.scans > 100 && metrics.visits === 0) {
      return {
        suspicious: true,
        critical: false,
        message: 'Many scans but no visits. May indicate scan farming.'
      }
    }

    return { suspicious: false, critical: false }
  }

  /**
   * Calculate ROAS from metrics
   */
  private calculateROAS(metrics: ListingMetrics): number {
    if (metrics.revenue === 0) return 0
    // Simplified - assumes cost is proportional to scans
    const estimatedCost = metrics.scans * 0.5 // ₹0.50 per scan
    return estimatedCost > 0 ? metrics.revenue / estimatedCost : 0
  }

  /**
   * Enforce modifications on a listing
   */
  enforce(listing: Listing, modifications: GuardrailModification[]): Listing {
    const enforced = { ...listing }

    for (const mod of modifications) {
      if (mod.listing_id !== listing.id) continue

      switch (mod.field) {
        case 'budget':
          // Can't modify budget on listing directly
          // This is handled in allocation
          break
        case 'status':
          // Downgrade suspicious listings
          if (listing.status === 'active') {
            enforced.status = 'paused'
          }
          break
      }
    }

    return enforced
  }

  /**
   * Get risk assessment for campaign
   */
  assessRisk(
    listings: Listing[],
    metricsMap: Map<string, ListingMetrics>
  ): {
    overall: 'low' | 'medium' | 'high' | 'critical'
    factors: { type: string; risk: string; severity: 'low' | 'medium' | 'high' }[]
  } {

    const factors: { type: string; risk: string; severity: 'low' | 'medium' | 'high' }[] = []

    // Check for new listings (no data)
    const newListings = listings.filter(l => {
      const m = metricsMap.get(l.id)
      return !m || m.data_points < 10
    })

    if (newListings.length > listings.length * 0.5) {
      factors.push({
        type: 'data_quality',
        risk: `${newListings.length} listings have no performance data`,
        severity: 'high'
      })
    }

    // Check for concentrated budget (1 listing gets most)
    // This would need budget data from allocation service

    // Check for category concentration
    const categoryCount = new Map<string, number>()
    listings.forEach(l => {
      const count = categoryCount.get(l.category) || 0
      categoryCount.set(l.category, count + 1)
    })

    const maxCategoryPct = Math.max(...categoryCount.values()) / listings.length
    if (maxCategoryPct > 0.6) {
      factors.push({
        type: 'diversification',
        risk: 'Campaign may be too concentrated in one category',
        severity: 'medium'
      })
    }

    // Calculate overall risk
    const severityScore = factors.reduce((sum, f) => {
      switch (f.severity) {
        case 'high': return sum + 2
        case 'medium': return sum + 1
        default: return sum
      }
    }, 0)

    let overall: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (severityScore > 5) overall = 'critical'
    else if (severityScore > 3) overall = 'high'
    else if (severityScore > 1) overall = 'medium'

    return { overall, factors }
  }

  /**
   * Get recommended adjustments to improve safety
   */
  getRecommendations(result: GuardrailResult): string[] {
    const recommendations: string[] = []

    if (result.excluded_listings.length > 0) {
      recommendations.push(
        `Remove ${result.excluded_listings.length} suspicious listings`
      )
    }

    const criticalWarnings = result.warnings.filter(w =>
      w.toLowerCase().includes('critical')
    )
    if (criticalWarnings.length > 0) {
      recommendations.push('Address critical warnings before proceeding')
    }

    const lowConfidence = result.warnings.filter(w =>
      w.toLowerCase().includes('confidence')
    )
    if (lowConfidence.length > 0) {
      recommendations.push('Collect more performance data before scaling')
    }

    const fraudWarnings = result.warnings.filter(w =>
      w.toLowerCase().includes('fraud') || w.toLowerCase().includes('fake')
    )
    if (fraudWarnings.length > 0) {
      recommendations.push('Review fraud indicators - may need investigation')
    }

    return recommendations
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create guardrails engine
 */
export function createGuardrailsEngine(
  config?: Partial<GuardrailConfig>
): GuardrailsEngine {
  return new GuardrailsEngine(config)
}

/**
 * Quick validation
 */
export function validateCampaign(
  listings: Listing[],
  metricsMap: Map<string, ListingMetrics>,
  totalBudget: number
): GuardrailResult {
  const engine = new GuardrailsEngine()
  return engine.validate(listings, metricsMap, totalBudget)
}
