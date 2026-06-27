import { z } from 'zod';

// ============================================================================
// Market Simulation Models - Data structures for market-level simulations
// ============================================================================

/**
 * Market types
 */
export enum MarketType {
  B2B = 'b2b',
  B2C = 'b2c',
  C2C = 'c2c',
  B2G = 'b2g',
  MARKETPLACE = 'marketplace'
}

/**
 * Competitor positioning types
 */
export enum CompetitorPositioning {
  LEADER = 'leader',
  CHALLENGER = 'challenger',
  NICHE = 'niche',
  FOLLOWER = 'follower'
}

/**
 * Product category
 */
export interface ProductCategory {
  id: string;
  name: string;
  parentId?: string;
  growthRate: number; // Annual growth rate percentage
  marketSize: number; // In dollars
  seasonality: {
    peakMonths: number[]; // 1-12
    troughMonths: number[];
  };
}

/**
 * Competitor model
 */
export interface Competitor {
  id: string;
  name: string;
  marketShare: number; // Percentage
  pricingStrategy: 'premium' | 'mid-market' | 'budget' | 'dynamic';
  strengths: string[];
  weaknesses: string[];
  recentStrategies: Array<{
    strategy: string;
    impact: number; // -1 to 1
    timeframe: string;
  }>;
  financialHealth: {
    revenue: number;
    growth: number;
    profitability: number;
  };
}

/**
 * Customer segment
 */
export interface CustomerSegment {
  id: string;
  name: string;
  size: number; // Number of customers
  demographics: {
    ageRange: [number, number];
    incomeLevel: 'low' | 'middle' | 'high';
    location: string[];
  };
  behavior: {
    avgPurchaseFrequency: number; // Per year
    avgOrderValue: number;
    priceSensitivity: number; // 0-100
    brandLoyalty: number; // 0-100
    digitalAdoption: number; // 0-100
  };
  needs: string[];
  painPoints: string[];
}

/**
 * Market simulation request
 */
export interface MarketSimulationRequest {
  marketId: string;
  marketType: MarketType;
  productCategory: ProductCategory;
  yourCompany: {
    currentMarketShare: number;
    currentPricing: number;
    brandStrength: number; // 0-100
    customerSatisfaction: number; // 0-100
  };
  competitors: Competitor[];
  customerSegments: CustomerSegment[];
  parameters?: {
    iterations?: number;
    timeHorizon?: number; // Months
    confidenceLevel?: number;
  };
}

/**
 * Demand forecast
 */
export interface DemandForecast {
  period: string; // Month/Quarter/Year
  baseline: number;
  projected: number;
  optimistic: number;
  pessimistic: number;
  drivers: Array<{
    factor: string;
    impact: number; // -1 to 1
    confidence: number; // 0-1
  }>;
}

/**
 * Price elasticity analysis
 */
export interface PriceElasticityAnalysis {
  categoryElasticity: number; // Base elasticity for category
  segmentElasticities: Map<string, number>;
  optimalPriceRange: {
    min: number;
    max: number;
    recommended: number;
  };
  volumeImpact: Map<string, {
    priceChange: number;
    volumeChange: number;
    revenueChange: number;
  }>;
}

/**
 * Market share projection
 */
export interface MarketShareProjection {
  period: string;
  yourCompany: {
    current: number;
    projected: number;
    confidenceInterval: [number, number];
  };
  competitors: Map<string, {
    current: number;
    projected: number;
    momentum: 'growing' | 'stable' | 'declining';
  }>;
}

/**
 * Competitive response modeling
 */
export interface CompetitiveResponse {
  competitorId: string;
  responseProbability: number; // 0-1
  responseType: 'price_war' | 'feature_race' | 'marketing_blitz' | 'partnership' | 'acquisition';
  expectedTimeline: number; // Months
  impactOnMarket: {
    marketShareShift: number;
    priceImpact: number;
    demandImpact: number;
  };
  yourCounterStrategies: string[];
}

/**
 * Scenario outcomes
 */
export interface ScenarioOutcome {
  scenarioName: string;
  probability: number; // 0-1
  metrics: {
    marketSize: number;
    marketGrowth: number;
    yourMarketShare: number;
    yourRevenue: number;
    yourProfitability: number;
    competitiveIntensity: number;
  };
  timeline: DemandForecast[];
  keyEvents: Array<{
    period: number;
    event: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
}

/**
 * Market simulation result
 */
export interface MarketSimulationResult {
  id: string;
  marketId: string;
  status: 'running' | 'completed' | 'failed';

  // Demand analysis
  demandForecast: DemandForecast[];
  peakDemand: {
    month: number;
    volume: number;
    intensity: number;
  };

  // Price analysis
  priceElasticity: PriceElasticityAnalysis;

  // Market share
  marketShareProjection: MarketShareProjection[];

  // Competitive analysis
  competitiveResponses: CompetitiveResponse[];
  threatAssessment: {
    newEntrants: number; // 0-100
    substitutes: number; // 0-100
    supplierPower: number; // 0-100
    buyerPower: number; // 0-100
    competitiveRivalry: number; // 0-100
  };

  // Scenario analysis
  scenarios: ScenarioOutcome[];

  // Recommendations
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    rationale: string;
    expectedImpact: string;
    timeframe: string;
  }>;

  metadata: {
    createdAt: Date;
    completedAt?: Date;
    executionTimeMs: number;
    iterations: number;
  };
}

/**
 * Market trends
 */
export interface MarketTrend {
  id: string;
  name: string;
  category: 'technology' | 'regulatory' | 'economic' | 'social' | 'demographic' | 'environmental';
  impact: number; // -1 to 1
  probability: number; // 0-1
  timeframe: 'short' | 'medium' | 'long';
  description: string;
  businessImplications: string[];
}

/**
 * Competitor behavior model
 */
export interface CompetitorBehaviorModel {
  competitorId: string;
  aggressiveness: number; // 0-100
  resourceLevel: number; // 0-100
  strategicFocus: 'growth' | 'profitability' | 'market_share' | 'survival';
  likelyMoves: Array<{
    move: string;
    probability: number;
    impact: number;
    timeline: number; // Months
  }>;
}

/**
 * Zod validation schemas
 */
export const ProductCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().optional(),
  growthRate: z.number().min(-50).max(100),
  marketSize: z.number().positive(),
  seasonality: z.object({
    peakMonths: z.array(z.number().int().min(1).max(12)),
    troughMonths: z.array(z.number().int().min(1).max(12))
  })
});

export const CompetitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  marketShare: z.number().min(0).max(100),
  pricingStrategy: z.enum(['premium', 'mid-market', 'budget', 'dynamic']),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recentStrategies: z.array(z.object({
    strategy: z.string(),
    impact: z.number().min(-1).max(1),
    timeframe: z.string()
  })),
  financialHealth: z.object({
    revenue: z.number().nonnegative(),
    growth: z.number(),
    profitability: z.number()
  })
});

export const CustomerSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().int().positive(),
  demographics: z.object({
    ageRange: z.tuple([z.number(), z.number()]),
    incomeLevel: z.enum(['low', 'middle', 'high']),
    location: z.array(z.string())
  }),
  behavior: z.object({
    avgPurchaseFrequency: z.number().positive(),
    avgOrderValue: z.number().positive(),
    priceSensitivity: z.number().min(0).max(100),
    brandLoyalty: z.number().min(0).max(100),
    digitalAdoption: z.number().min(0).max(100)
  }),
  needs: z.array(z.string()),
  painPoints: z.array(z.string())
});

export const MarketSimulationRequestSchema = z.object({
  marketId: z.string(),
  marketType: z.nativeEnum(MarketType),
  productCategory: ProductCategorySchema,
  yourCompany: z.object({
    currentMarketShare: z.number().min(0).max(100),
    currentPricing: z.number().positive(),
    brandStrength: z.number().min(0).max(100),
    customerSatisfaction: z.number().min(0).max(100)
  }),
  competitors: z.array(CompetitorSchema),
  customerSegments: z.array(CustomerSegmentSchema),
  parameters: z.object({
    iterations: z.number().int().min(100).max(10000).default(1000),
    timeHorizon: z.number().int().min(1).max(60).default(12),
    confidenceLevel: z.number().min(0).max(1).default(0.95)
  }).optional()
});

export const MarketTrendSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['technology', 'regulatory', 'economic', 'social', 'demographic', 'environmental']),
  impact: z.number().min(-1).max(1),
  probability: z.number().min(0).max(1),
  timeframe: z.enum(['short', 'medium', 'long']),
  description: z.string(),
  businessImplications: z.array(z.string())
});
