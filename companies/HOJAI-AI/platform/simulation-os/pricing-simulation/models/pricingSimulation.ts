import { z } from 'zod';

// ============================================================================
// Pricing Simulation Models - Data structures for pricing simulations
// ============================================================================

/**
 * Pricing strategy types
 */
export enum PricingStrategy {
  COST_PLUS = 'cost_plus',
  VALUE_BASED = 'value_based',
  COMPETITIVE = 'competitive',
  PENETRATION = 'penetration',
  PREMIUM = 'premium',
  DYNAMIC = 'dynamic',
  FREEMIUM = 'freemium',
  SUBSCRIPTION = 'subscription'
}

/**
 * Price test type
 */
export enum PriceTestType {
  A_B_TEST = 'a_b_test',
  MULTIVARIATE = 'multivariate',
  BAND_TEST = 'band_test',
  GEO_TEST = 'geo_test'
}

/**
 * Product or service model
 */
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentPrice: number;
  cost: number;
  margin: number;
  volume: number; // Units sold per period
  elasticity: number; // Price elasticity of demand
}

/**
 * Competitor price data
 */
export interface CompetitorPrice {
  competitorId: string;
  competitorName: string;
  price: number;
  lastUpdated: Date;
  reliability: number; // 0-1 confidence in data
}

/**
 * Customer segment for pricing
 */
export interface PricingSegment {
  id: string;
  name: string;
  size: number;
  willingnessToPay: number;
  priceSensitivity: number; // 0-100
  acquisitionCost: number;
  lifetimeValue: number;
}

/**
 * Value driver
 */
export interface ValueDriver {
  id: string;
  name: string;
  impact: number; // How much this driver affects willingness to pay (0-1)
  yourPerformance: number; // Your rating (0-100)
  competitorPerformance: number; // Competitor average rating (0-100)
}

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  id: string;
  name: string;
  testType: PriceTestType;
  controlPrice: number;
  variants: Array<{
    id: string;
    price: number;
    trafficPercentage: number;
  }>;
  duration: number; // Days
  targetMetrics: string[];
  minimumSampleSize: number;
}

/**
 * A/B test result
 */
export interface ABTestResult {
  testId: string;
  status: 'running' | 'completed' | 'paused';
  startDate: Date;
  endDate?: Date;
  variants: Array<{
    id: string;
    price: number;
    impressions: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    averageOrderValue: number;
  }>;
  winner?: {
    variantId: string;
    confidence: number;
    lift: number; // Percentage improvement over control
  };
  statisticalSignificance: number;
}

/**
 * Price recommendation
 */
export interface PriceRecommendation {
  id: string;
  strategy: PricingStrategy;
  recommendedPrice: number;
  confidence: number; // 0-1
  reasoning: string[];
  expectedImpact: {
    volumeChange: number;
    revenueChange: number;
    marginChange: number;
  };
  risks: string[];
  conditions: string[]; // When this recommendation applies
}

/**
 * Pricing simulation request
 */
export interface PricingSimulationRequest {
  simulationId: string;
  product: Product;
  competitors: CompetitorPrice[];
  segments: PricingSegment[];
  valueDrivers?: ValueDriver[];
  parameters?: {
    iterations?: number;
    confidenceLevel?: number;
    priceRange?: { min: number; max: number };
    step?: number;
  };
}

/**
 * Competitive pricing analysis
 */
export interface CompetitivePricingAnalysis {
  yourPrice: number;
  competitorPrices: Map<string, number>;
  pricePosition: 'lowest' | 'below_average' | 'average' | 'above_average' | 'highest';
  priceDifference: {
    vsLowest: number;
    vsAverage: number;
    vsHighest: number;
  };
  estimatedShareImpact: number; // -1 to 1, negative means losing share
}

/**
 * Value-based pricing analysis
 */
export interface ValueBasedAnalysis {
  totalValueScore: number; // 0-100
  willingnessToPay: {
    estimated: number;
    confidence: number;
    range: { min: number; max: number };
  };
  valueDrivers: Array<{
    driver: string;
    yourScore: number;
    impact: number;
    contribution: number;
  }>;
  optimalPrice: number;
  priceValueRatio: number;
}

/**
 * Price elasticity analysis
 */
export interface ElasticityAnalysis {
  baseElasticity: number;
  segmentElasticities: Map<string, number>;
  crossElasticities: Map<string, number>; // How your price affects competitor demand
  optimalPricePoint: {
    price: number;
    revenue: number;
    volume: number;
  };
  priceRange: {
    floor: number; // Minimum viable price
    ceiling: number; // Maximum viable price
  };
}

/**
 * Promotional impact analysis
 */
export interface PromotionalAnalysis {
  discountDepth: number; // Percentage off
  expectedLift: number; // Volume increase percentage
  breakEvenDiscount: number; // Max discount that doesn't hurt margin
  cannibalizationRisk: number; // 0-1
  brandDamageRisk: number; // 0-1
  optimalStrategy: {
    discount: number;
    duration: number;
    frequency: number;
  };
}

/**
 * Pricing simulation result
 */
export interface PricingSimulationResult {
  id: string;
  productId: string;
  status: 'running' | 'completed' | 'failed';

  // Analysis components
  competitiveAnalysis: CompetitivePricingAnalysis;
  valueBasedAnalysis: ValueBasedAnalysis;
  elasticityAnalysis: ElasticityAnalysis;
  promotionalAnalysis?: PromotionalAnalysis;

  // Recommendations
  recommendations: PriceRecommendation[];

  // A/B tests
  abTests: ABTestResult[];

  // Price ladder
  priceLadder: Array<{
    price: number;
    expectedVolume: number;
    expectedRevenue: number;
    expectedMargin: number;
    competitiveIndex: number;
  }>;

  metadata: {
    createdAt: Date;
    completedAt?: Date;
    executionTimeMs: number;
    iterations: number;
  };
}

/**
 * Zod validation schemas
 */
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  category: z.string(),
  currentPrice: z.number().positive(),
  cost: z.number().nonnegative(),
  margin: z.number(),
  volume: z.number().int().nonnegative(),
  elasticity: z.number()
});

export const CompetitorPriceSchema = z.object({
  competitorId: z.string(),
  competitorName: z.string(),
  price: z.number().positive(),
  lastUpdated: z.string().datetime(),
  reliability: z.number().min(0).max(1)
});

export const PricingSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().int().positive(),
  willingnessToPay: z.number().positive(),
  priceSensitivity: z.number().min(0).max(100),
  acquisitionCost: z.number().nonnegative(),
  lifetimeValue: z.number().nonnegative()
});

export const ValueDriverSchema = z.object({
  id: z.string(),
  name: z.string(),
  impact: z.number().min(0).max(1),
  yourPerformance: z.number().min(0).max(100),
  competitorPerformance: z.number().min(0).max(100)
});

export const PricingSimulationRequestSchema = z.object({
  simulationId: z.string(),
  product: ProductSchema,
  competitors: z.array(CompetitorPriceSchema),
  segments: z.array(PricingSegmentSchema),
  valueDrivers: z.array(ValueDriverSchema).optional(),
  parameters: z.object({
    iterations: z.number().int().min(100).max(10000).default(1000),
    confidenceLevel: z.number().min(0).max(1).default(0.95),
    priceRange: z.object({
      min: z.number().positive(),
      max: z.number().positive()
    }).optional(),
    step: z.number().positive().default(5)
  }).optional()
});

export const ABTestConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  testType: z.nativeEnum(PriceTestType),
  controlPrice: z.number().positive(),
  variants: z.array(z.object({
    id: z.string(),
    price: z.number().positive(),
    trafficPercentage: z.number().min(0).max(100)
  })),
  duration: z.number().int().positive(),
  targetMetrics: z.array(z.string()),
  minimumSampleSize: z.number().int().positive()
});
