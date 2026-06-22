import { z } from 'zod';

// ============================================
// Base Types
// ============================================

export interface RestaurantProfile {
  id: string;
  name: string;
  cuisine: string[];
  location: string;
  priceRange: 'budget' | 'mid' | 'premium' | 'luxury';
  seatingCapacity: number;
  avgOrderValue: number;
  monthlyRevenue: number;
  operatingHours: OperatingHours;
}

export interface OperatingHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}

// ============================================
// Menu Engineering Types
// ============================================

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  cost: number;
  popularity: number; // 1-100
  margin?: number; // Calculated from price and cost
  prepTime: number; // minutes
  imageUrl?: string;
}

export interface MenuAnalysis {
  stars: MenuItem[];      // High popularity, high margin
  plowhorses: MenuItem[]; // High popularity, low margin
  puzzles: MenuItem[];    // Low popularity, high margin
  dogs: MenuItem[];       // Low popularity, low margin
}

export interface MenuRecommendation {
  action: 'promote' | 'reprice' | 'reformulate' | 'remove';
  itemId: string;
  itemName: string;
  currentPrice?: number;
  recommendedPrice?: number;
  reason: string;
  expectedImpact: 'high' | 'medium' | 'low';
}

export interface MenuEngineRequest {
  restaurantId: string;
  menuItems: MenuItem[];
  targetFoodCostPercent?: number; // Default 28-32%
}

export interface MenuEngineResponse {
  analysis: MenuAnalysis;
  recommendations: MenuRecommendation[];
  averageMargin: number;
  currentFoodCostPercent: number;
  projectedFoodCostPercent: number;
  bestSellers: MenuItem[];
  lowPerformers: MenuItem[];
  newItemsToAdd: { name: string; category: string; priceRange: string; reason: string }[];
}

// ============================================
// Table Turnover Types
// ============================================

export interface TableMetrics {
  tableId: string;
  seats: number;
  avgTurnTime: number; // minutes
  coversPerTurn: number;
  revenuePerTurn: number;
  potentialRevenue: number;
  utilizationPercent: number;
}

export interface TurnoverAnalysis {
  peakHours: { hour: number; avgCovers: number; tableCount: number }[];
  avgTableTurnTime: number;
  targetTurnTime: number;
  currentUtilization: number;
  revenuePerSeatHour: number;
  tables: TableMetrics[];
  bottlenecks: { location: string; cause: string; impact: string }[];
}

export interface TurnoverRequest {
  restaurantId: string;
  operatingHours: OperatingHours;
  currentUtilization: number; // 0-100%
  avgOrderValue: number;
  peakHourCovers: { hour: number; covers: number }[];
  tableConfigs: { tableId: string; seats: number; avgTurnMinutes: number }[];
}

export interface TurnoverResponse {
  analysis: TurnoverAnalysis;
  recommendations: {
    action: string;
    target: string;
    reason: string;
    expectedImpact: { revenueIncrease: number; turnsIncrease: number };
  }[];
  scheduleOptimizations: {
    timeSlot: string;
    action: 'add_tables' | 'reduce_tables' | 'no_change';
    tableCount: number;
  }[];
  automation: { feature: string; description: string; priority: 'high' | 'medium' | 'low' }[];
}

// ============================================
// Food Cost Types
// ============================================

export interface Ingredient {
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  supplier: string;
  shelfLife: number; // days
  reorderPoint: number;
}

export interface DishRecipe {
  dishId: string;
  dishName: string;
  ingredients: { name: string; quantity: number; cost: number }[];
  totalCost: number;
  sellingPrice: number;
  foodCostPercent: number;
  yieldPercent: number;
}

export interface FoodCostAnalysis {
  overallFoodCostPercent: number;
  targetFoodCostPercent: number;
  monthlyFoodSpend: number;
  monthlyPotentialSavings: number;
  vendorAnalysis: {
    vendor: string;
    spend: number;
    savings: number;
    quality: 'poor' | 'average' | 'good' | 'excellent';
    items: string[];
  }[];
  wasteAnalysis: {
    category: string;
    amount: number;
    cost: number;
    percentOfTotal: number;
  }[];
  recipes: DishRecipe[];
}

export interface FoodCostRequest {
  restaurantId: string;
  monthlyRevenue: number;
  monthlyFoodSpend: number;
  targetFoodCostPercent: number;
  ingredients?: Ingredient[];
  recipes?: { dishId: string; dishName: string; ingredients: { name: string; quantity: number; unit: string }[]; sellingPrice: number }[];
  vendors?: { name: string; spend: number; leadTimeDays: number }[];
}

export interface FoodCostResponse {
  analysis: FoodCostAnalysis;
  recommendations: {
    category: 'vendor' | 'recipe' | 'waste' | 'pricing' | 'inventory';
    action: string;
    item?: string;
    savings: number;
    implementation: string;
  }[];
  costReduction: {
    immediate: number;
    shortTerm: number;
    longTerm: number;
  };
}

// ============================================
// Loyalty Program Types
// ============================================

export interface LoyaltyTier {
  name: string;
  pointsRequired: number;
  benefits: string[];
  multiplier: number;
  color: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  pointsCost: number;
  type: 'discount' | 'free_item' | 'experience' | 'discount_percent';
  minTier?: string;
  available: boolean;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
  pointsPerRupee: number;
  birthdayBonus: number;
  referralBonus: number;
}

export interface LoyaltyMetrics {
  totalMembers: number;
  activeMembers: number;
  avgVisitFrequency: number;
  avgOrderValue: number;
  redemptionRate: number;
  memberLifetimeValue: number;
  churnRate: number;
  tierDistribution: { tier: string; count: number; percent: number }[];
}

export interface LoyaltyRequest {
  restaurantId: string;
  restaurantName: string;
  avgOrderValue: number;
  monthlyCustomers: number;
  currentLoyalty?: LoyaltyProgram;
  goals: 'acquire' | 'retain' | 'increase_spend' | 'all';
}

export interface LoyaltyResponse {
  program: LoyaltyProgram;
  metrics: LoyaltyMetrics;
  recommendations: {
    action: string;
    reason: string;
    expectedLift: number;
  }[];
  tierStrategy: {
    tier: string;
    targetPercent: number;
    benefits: string[];
    upgradeCriteria: string;
  }[];
  campaigns: {
    name: string;
    type: 'welcome' | 'reactivation' | 'tier_upgrade' | 'referral';
    description: string;
    expectedResponse: number;
  }[];
}

// ============================================
// Review Management Types
// ============================================

export interface Review {
  id: string;
  platform: 'zomato' | 'swiggy' | 'google' | 'direct';
  rating: number; // 1-5
  title?: string;
  text: string;
  date: string;
  response?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  categories?: string[]; // food, service, ambiance, value, hygiene
}

export interface ReviewAnalysis {
  overallRating: number;
  ratingDistribution: { stars: number; count: number; percent: number }[];
  sentimentBreakdown: { sentiment: string; count: number; percent: number }[];
  categoryScores: { category: string; score: number; trend: 'up' | 'down' | 'stable'; reviewCount: number }[];
  responseRate: number;
  avgResponseTime: number; // hours
  recentTrends: { period: string; avgRating: number; reviewCount: number }[];
  competitorAvg?: number;
}

export interface ReviewRequest {
  restaurantId: string;
  platform?: 'zomato' | 'swiggy' | 'google' | 'all';
  reviews: Omit<Review, 'id'>[];
  responseTemplates?: { sentiment: string; template: string }[];
  competitorRatings?: { name: string; rating: number }[];
}

export interface ReviewResponse {
  analysis: ReviewAnalysis;
  responseSuggestions: {
    reviewId: string;
    suggestedResponse: string;
    sentiment: string;
  }[];
  strategy: {
    priority: 'urgent' | 'high' | 'medium' | 'low';
    action: string;
    reason: string;
  }[];
  campaigns: {
    name: string;
    trigger: string;
    action: string;
    expectedLift: number;
  }[];
  automation: { trigger: string; action: string; enabled: boolean }[];
}

// ============================================
// Platform Optimization Types (Zomato/Swiggy)
// ============================================

export interface PlatformListing {
  platform: 'zomato' | 'swiggy';
  listingId: string;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  photos?: string[];
  menuItems: { id: string; name: string; price: number; available: boolean }[];
  deliveryTime: number; // minutes
  packagingCharge: number;
  discount?: number;
}

export interface PlatformMetrics {
  platform: 'zomato' | 'swiggy';
  orders: number;
  gmV: number; // Gross Merchandise Value
  commission: number;
  netRevenue: number;
  avgOrderValue: number;
  avgRating: number;
  reviewCount: number;
  visibility?: number; // Search rank
  conversionRate?: number;
  repeatRate?: number;
}

export interface PlatformOptimizationRequest {
  restaurantId: string;
  platform: 'zomato' | 'swiggy' | 'both';
  listings: PlatformListing[];
  metrics: PlatformMetrics[];
  menuItems: { id: string; name: string; category: string; price: number; popularity?: number }[];
  competitorData?: { name: string; rating: number; priceRange: string; popularItems: string[] }[];
}

export interface PlatformOptimizationResponse {
  profileOptimization: {
    photoQuality: { score: number; recommendation: string };
    description: { score: number; recommendation: string };
    badges: { current: string[]; recommended: string[]; reason: string };
  };
  menuOptimization: {
    spotlightItems: { itemId: string; name: string; reason: string; action: string }[];
    pricingStrategy: { approach: string; rationale: string; expectedImpact: number };
    packagingRecommendation: { charge: number; suggestion: string };
  };
  operationalOptimization: {
    deliveryTime: { current: number; target: number; recommendations: string[] };
    availability: { itemsToEnable: string[]; itemsToDisable: string[] };
    busyHours: { strategy: string; items: { itemId: string; name: string; discount?: number }[] };
  };
  reviewStrategy: {
    targetRating: number;
    neededReviews: number;
    reviewSources: { source: string; weight: number; action: string }[];
  };
  commissionOptimization: {
    currentCommission: number;
    recommendedCommission: number;
    subsidyStrategy: { minimumOrder: number; maxSubsidy: number };
  };
  recommendations: {
    priority: number;
    action: string;
    effort: 'low' | 'medium' | 'high';
    impact: number;
    timeline: string;
  }[];
}

// ============================================
// Growth Recommendations Types
// ============================================

export interface GrowthMetrics {
  currentRevenue: number;
  targetRevenue: number;
  growthRate: number;
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  avgOrderValue: number;
  orderFrequency: number;
  repeatCustomerRate: number;
}

export interface GrowthRequest {
  restaurantId: string;
  restaurantProfile: RestaurantProfile;
  financialMetrics: { monthlyRevenue: number; monthlyOrders: number; avgOrderValue: number };
  customerMetrics: { totalCustomers: number; repeatRate: number; churnRate: number };
  platformMetrics?: { platform: string; orders: number; revenue: number }[];
}

export interface GrowthResponse {
  currentState: {
    revenue: number;
    customers: number;
    avgOrderValue: number;
    growthRate: number;
  };
  targetState: {
    revenue: number;
    customers: number;
    avgOrderValue: number;
    growthRate: number;
  };
  growthPillars: {
    pillar: string;
    weight: number;
    currentScore: number;
    targetScore: number;
    initiatives: { initiative: string; impact: number; timeline: string; effort: string }[];
  }[];
  quickWins: { action: string; impact: number; effort: string; timeline: string }[];
  investments: { category: string; amount: number; roi: number; paybackMonths: number }[];
  timeline: { month: string; focus: string; keyActions: string[]; expectedOutcome: string }[];
}

// ============================================
// Zod Schemas for Validation
// ============================================

export const MenuEngineSchema = z.object({
  restaurantId: z.string().min(1),
  menuItems: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    cost: z.number().nonnegative(),
    popularity: z.number().min(0).max(100).optional().default(50),
    prepTime: z.number().positive().optional().default(15),
    imageUrl: z.string().url().optional(),
  })),
  targetFoodCostPercent: z.number().min(10).max(60).optional(),
});

export const TurnoverSchema = z.object({
  restaurantId: z.string().min(1),
  operatingHours: z.record(z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean().optional(),
  })),
  currentUtilization: z.number().min(0).max(100),
  avgOrderValue: z.number().positive(),
  peakHourCovers: z.array(z.object({
    hour: z.number().min(0).max(23),
    covers: z.number().nonnegative(),
  })),
  tableConfigs: z.array(z.object({
    tableId: z.string().min(1),
    seats: z.number().positive(),
    avgTurnMinutes: z.number().positive(),
  })),
});

export const FoodCostSchema = z.object({
  restaurantId: z.string().min(1),
  monthlyRevenue: z.number().positive(),
  monthlyFoodSpend: z.number().nonnegative(),
  targetFoodCostPercent: z.number().min(10).max(60),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    unit: z.string().min(1),
    quantity: z.number().nonnegative(),
    costPerUnit: z.number().nonnegative(),
    supplier: z.string().min(1),
    shelfLife: z.number().positive(),
    reorderPoint: z.number().nonnegative(),
  })).optional(),
  recipes: z.array(z.object({
    dishId: z.string().min(1),
    dishName: z.string().min(1),
    ingredients: z.array(z.object({
      name: z.string().min(1),
      quantity: z.number().nonnegative(),
      unit: z.string().min(1),
    })),
    sellingPrice: z.number().positive(),
  })).optional(),
  vendors: z.array(z.object({
    name: z.string().min(1),
    spend: z.number().nonnegative(),
    leadTimeDays: z.number().positive(),
  })).optional(),
});

export const LoyaltySchema = z.object({
  restaurantId: z.string().min(1),
  restaurantName: z.string().min(1),
  avgOrderValue: z.number().positive(),
  monthlyCustomers: z.number().positive(),
  currentLoyalty: z.object({
    id: z.string(),
    name: z.string(),
    tiers: z.array(z.object({
      name: z.string(),
      pointsRequired: z.number(),
      benefits: z.array(z.string()),
      multiplier: z.number(),
      color: z.string(),
    })),
    rewards: z.array(z.object({
      id: z.string(),
      name: z.string(),
      pointsCost: z.number(),
      type: z.enum(['discount', 'free_item', 'experience', 'discount_percent']),
      minTier: z.string().optional(),
      available: z.boolean(),
    })),
    pointsPerRupee: z.number(),
    birthdayBonus: z.number(),
    referralBonus: z.number(),
  }).optional(),
  goals: z.enum(['acquire', 'retain', 'increase_spend', 'all']),
});

export const ReviewSchema = z.object({
  restaurantId: z.string().min(1),
  platform: z.enum(['zomato', 'swiggy', 'google', 'all']).optional(),
  reviews: z.array(z.object({
    platform: z.enum(['zomato', 'swiggy', 'google', 'direct']),
    rating: z.number().min(1).max(5),
    title: z.string().optional(),
    text: z.string().min(1),
    date: z.string(),
    response: z.string().optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    categories: z.array(z.string()).optional(),
  })),
  responseTemplates: z.array(z.object({
    sentiment: z.string(),
    template: z.string(),
  })).optional(),
  competitorRatings: z.array(z.object({
    name: z.string(),
    rating: z.number().min(1).max(5),
  })).optional(),
});

export const PlatformOptimizationSchema = z.object({
  restaurantId: z.string().min(1),
  platform: z.enum(['zomato', 'swiggy', 'both']),
  listings: z.array(z.object({
    platform: z.enum(['zomato', 'swiggy']),
    listingId: z.string().min(1),
    isActive: z.boolean(),
    rating: z.number().min(1).max(5),
    reviewCount: z.number().nonnegative(),
    photos: z.array(z.string()).optional(),
    menuItems: z.array(z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      available: z.boolean(),
    })),
    deliveryTime: z.number().positive(),
    packagingCharge: z.number().nonnegative(),
    discount: z.number().min(0).max(100).optional(),
  })),
  metrics: z.array(z.object({
    platform: z.enum(['zomato', 'swiggy']),
    orders: z.number().nonnegative(),
    gmV: z.number().nonnegative(),
    commission: z.number().nonnegative(),
    netRevenue: z.number().nonnegative(),
    avgOrderValue: z.number().positive(),
    avgRating: z.number().min(1).max(5),
    reviewCount: z.number().nonnegative(),
    visibility: z.number().min(1).max(100).optional(),
    conversionRate: z.number().min(0).max(100).optional(),
    repeatRate: z.number().min(0).max(100).optional(),
  })),
  menuItems: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    price: z.number(),
    popularity: z.number().min(0).max(100).optional(),
  })),
  competitorData: z.array(z.object({
    name: z.string(),
    rating: z.number().min(1).max(5),
    priceRange: z.string(),
    popularItems: z.array(z.string()),
  })).optional(),
});

export const GrowthSchema = z.object({
  restaurantId: z.string().min(1),
  restaurantProfile: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    cuisine: z.array(z.string()),
    location: z.string(),
    priceRange: z.enum(['budget', 'mid', 'premium', 'luxury']),
    seatingCapacity: z.number().positive(),
    avgOrderValue: z.number().positive(),
    monthlyRevenue: z.number().nonnegative(),
    operatingHours: z.record(z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean().optional(),
    })),
  }),
  financialMetrics: z.object({
    monthlyRevenue: z.number().nonnegative(),
    monthlyOrders: z.number().nonnegative(),
    avgOrderValue: z.number().positive(),
  }),
  customerMetrics: z.object({
    totalCustomers: z.number().nonnegative(),
    repeatRate: z.number().min(0).max(100),
    churnRate: z.number().min(0).max(100),
  }),
  platformMetrics: z.array(z.object({
    platform: z.string(),
    orders: z.number().nonnegative(),
    revenue: z.number().nonnegative(),
  })).optional(),
});

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    processingTime: number;
    model?: string;
    confidence?: number;
  };
}
