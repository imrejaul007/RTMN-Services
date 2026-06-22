/**
 * AdOS - Intelligence Layer for Real-World Advertising
 * Types and Interfaces
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Pricing configuration for listings/campaigns
 */
export interface PricingConfig {
  type: 'owner' | 'platform' | 'hybrid'

  // Owner model
  base_price?: number
  commission_rate?: number

  // Platform model (AdsQr)
  coin_budget?: number
  cost_per_scan?: number
  cost_per_visit?: number

  // Hybrid model
  revenue_split?: {
    vendor: number
    platform: number
  }
}

/**
 * Raw metrics from attribution system
 */
export interface ListingMetrics {
  // Counts
  scans: number
  visits: number
  purchases: number
  revenue: number

  // Rates (0-1)
  scan_to_visit_rate: number
  visit_to_purchase_rate: number

  // Value
  avg_order_value: number

  // Metadata
  last_updated: Date
  data_points: number
}

/**
 * Category averages for fallback estimation
 */
export interface CategoryAverages {
  category: string
  avg_scan_to_visit_rate: number
  avg_visit_to_purchase_rate: number
  avg_order_value: number
  avg_cost_per_visit: number
  sample_size: number
}

/**
 * Listing or Campaign base type
 */
export interface Listing {
  id: string
  name: string
  category: string
  subcategory?: string

  // Location
  location?: {
    city: string
    area: string
    lat?: number
    lng?: number
  }

  // Pricing
  pricing: PricingConfig

  // Potential
  volume_potential: number // 0-1 score
  category_match: number // 0-1 score

  // Vendor
  vendor_id: string

  // Status
  status: 'active' | 'paused' | 'ended'

  // Timestamps
  created_at: Date
  updated_at: Date
}

// ============================================================================
// ROI ENGINE TYPES
// ============================================================================

/**
 * ROI calculation result with confidence
 */
export interface ROIResult {
  // Core metrics
  roas: number // Return on Ad Spend
  cpp: number // Cost per purchase
  cpv: number // Cost per visit

  // Confidence (0-1)
  confidence: number

  // Data quality
  data_points: number
  used_fallback: boolean
  fallback_source?: string // 'category_avg' | 'historical'

  // Ranges (for UX display)
  estimate: {
    roas: { min: number; max: number }
    visits: { min: number; max: number }
    purchases: { min: number; max: number }
  }

  // Breakdown
  breakdown: {
    scans: number
    expected_visits: number
    expected_purchases: number
    expected_revenue: number
    total_cost: number
  }
}

// ============================================================================
// SCORING ENGINE TYPES
// ============================================================================

/**
 * Scoring weights configuration
 */
export interface ScoringWeights {
  roas: number // Default: 0.5
  confidence: number // Default: 0.2
  volume: number // Default: 0.2
  category_match: number // Default: 0.1
}

/**
 * Scored listing with all metadata
 */
export interface ScoredListing {
  listing: Listing
  metrics: ListingMetrics | null

  // ROI data
  roi: ROIResult

  // Score
  score: number
  rank: number

  // Weights used
  weights: ScoringWeights
}

// ============================================================================
// BUDGET ALLOCATION TYPES
// ============================================================================

/**
 * Budget allocation for a single listing
 */
export interface BudgetAllocation {
  listing_id: string
  listing_name: string

  // Money
  allocated_budget: number
  percentage_of_total: number

  // Expected results
  expected_visits: number
  expected_purchases: number
  expected_roas: number

  // Confidence
  confidence: number

  // Warnings
  warnings: AllocationWarning[]
}

/**
 * Allocation warning type
 */
export interface AllocationWarning {
  type: 'low_confidence' | 'low_roi' | 'high_cpv' | 'budget_low' | 'new_listing'
  message: string
  severity: 'info' | 'warning' | 'critical'
}

/**
 * Complete allocation recommendation
 */
export interface AllocationRecommendation {
  // Input
  total_budget: number
  listings: ScoredListing[]

  // Output
  allocations: BudgetAllocation[]

  // Totals
  totals: {
    allocated: number
    expected_visits: number
    expected_purchases: number
    expected_roas: number
    weighted_confidence: number
  }

  // Unallocated
  unallocated: number
  unallocated_percentage: number
}

// ============================================================================
// GUARDRAILS TYPES
// ============================================================================

/**
 * Guardrail configuration
 */
export interface GuardrailConfig {
  // Budget constraints
  min_budget_per_listing: number // Default: ₹500
  min_total_budget: number // Default: ₹1000
  max_budget_per_listing: number // Default: ₹100000

  // Performance constraints
  max_cost_per_visit: number // Default: ₹50
  max_cost_per_purchase: number // Default: ₹200
  min_roas_threshold: number // Default: 0.5 (50% of spend as revenue)

  // Quality constraints
  min_confidence_threshold: number // Default: 0.2
  min_data_points: number // Default: 10

  // Fraud prevention
  max_scan_rate_per_hour: number // Default: 100
  max_visit_rate_per_scan: number // Default: 5 (visits can't be 5x scans)

  // Campaign limits
  max_listings_per_campaign: number // Default: 50
  max_campaign_duration_days: number // Default: 90
}

/**
 * Guardrail enforcement result
 */
export interface GuardrailResult {
  passed: boolean
  modifications: GuardrailModification[]
  excluded_listings: ExcludedListing[]
  warnings: string[]
}

export interface GuardrailModification {
  listing_id: string
  field: string
  original_value: any
  new_value: any
  reason: string
}

export interface ExcludedListing {
  listing_id: string
  reason: string
  severity: 'warning' | 'critical'
}

// ============================================================================
// ADOS ORCHESTRATOR TYPES
// ============================================================================

/**
 * Campaign optimization request
 */
export interface OptimizationRequest {
  // Input
  listings?: Listing[]
  budget: number
  duration_days?: number
  category_filter?: string[]
  location_filter?: {
    city?: string
    area?: string
    radius_km?: number
  }

  // Constraints
  guardrails?: Partial<GuardrailConfig>
  weights?: Partial<ScoringWeights>

  // Options
  include_low_confidence?: boolean
  max_listings?: number
}

/**
 * Campaign optimization result
 */
export interface OptimizationResult {
  // Status
  success: boolean
  error?: string

  // Recommendations
  recommendation: AllocationRecommendation

  // Guardrail status
  guardrails: GuardrailResult

  // Metadata
  generated_at: Date
  processing_time_ms: number
  data_freshness: {
    oldest_metric: Date
    newest_metric: Date
  }
}

/**
 * Performance prediction for a single listing
 */
export interface PerformancePrediction {
  listing_id: string

  // Input scenario
  scenario: {
    budget: number
    duration_days: number
  }

  // Predicted outcomes
  predicted: {
    scans: number
    visits: number
    purchases: number
    revenue: number
    roas: number
  }

  // Confidence
  confidence: number

  // Risk factors
  risks: {
    type: 'low_volume' | 'low_conversion' | 'high_cost' | 'new_listing'
    description: string
  }[]
}

// ============================================================================
// CATEGORY DATA
// ============================================================================

/**
 * Default category averages (India market)
 * These should be fetched from DB in production
 */
export const DEFAULT_CATEGORY_AVERAGES: CategoryAverages[] = [
  {
    category: 'restaurant',
    avg_scan_to_visit_rate: 0.35,
    avg_visit_to_purchase_rate: 0.45,
    avg_order_value: 350,
    avg_cost_per_visit: 15,
    sample_size: 0
  },
  {
    category: 'retail',
    avg_scan_to_visit_rate: 0.30,
    avg_visit_to_purchase_rate: 0.40,
    avg_order_value: 800,
    avg_cost_per_visit: 20,
    sample_size: 0
  },
  {
    category: 'gym',
    avg_scan_to_visit_rate: 0.25,
    avg_visit_to_purchase_rate: 0.15,
    avg_order_value: 2000,
    avg_cost_per_visit: 25,
    sample_size: 0
  },
  {
    category: 'auto',
    avg_scan_to_visit_rate: 0.40,
    avg_visit_to_purchase_rate: 0.10,
    avg_order_value: 500,
    avg_cost_per_visit: 8,
    sample_size: 0
  },
  {
    category: 'billboard',
    avg_scan_to_visit_rate: 0.20,
    avg_visit_to_purchase_rate: 0.05,
    avg_order_value: 1000,
    avg_cost_per_visit: 30,
    sample_size: 0
  },
  {
    category: 'influencer',
    avg_scan_to_visit_rate: 0.50,
    avg_visit_to_purchase_rate: 0.08,
    avg_order_value: 600,
    avg_cost_per_visit: 45,
    sample_size: 0
  },
  {
    category: 'event',
    avg_scan_to_visit_rate: 0.60,
    avg_visit_to_purchase_rate: 0.30,
    avg_order_value: 500,
    avg_cost_per_visit: 10,
    sample_size: 0
  },
  {
    category: 'other',
    avg_scan_to_visit_rate: 0.25,
    avg_visit_to_purchase_rate: 0.20,
    avg_order_value: 400,
    avg_cost_per_visit: 20,
    sample_size: 0
  }
]

/**
 * Default scoring weights
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  roas: 0.5,
  confidence: 0.2,
  volume: 0.2,
  category_match: 0.1
}

/**
 * Default guardrail configuration
 */
export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  min_budget_per_listing: 500,
  min_total_budget: 1000,
  max_budget_per_listing: 100000,
  max_cost_per_visit: 50,
  max_cost_per_purchase: 200,
  min_roas_threshold: 0.5,
  min_confidence_threshold: 0.2,
  min_data_points: 10,
  max_scan_rate_per_hour: 100,
  max_visit_rate_per_scan: 5,
  max_listings_per_campaign: 50,
  max_campaign_duration_days: 90
}
