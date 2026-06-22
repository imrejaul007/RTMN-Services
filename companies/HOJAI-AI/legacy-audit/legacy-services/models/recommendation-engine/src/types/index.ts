/**
 * HOJAI AI Recommendation Engine - Type Definitions
 */

// Recommendation request types
export interface RecommendationRequest {
  userId?: string;
  productId?: string;
  limit?: number;
  type?: RecommendationType;
}

export type RecommendationType =
  | 'personalized'
  | 'trending'
  | 'similar'
  | 'frequently-bought';

// Recommendation response types
export interface RecommendationResponse {
  items: RecommendationItem[];
  type: RecommendationType;
  generatedAt: string;
}

export interface RecommendationItem {
  id: string;
  name: string;
  score: number;
  reason: string;
}

// Similar items request
export interface SimilarItemsRequest {
  productId: string;
  limit?: number;
}

// Trending request
export interface TrendingRequest {
  limit?: number;
  category?: string;
  timeframe?: number; // days
}

// User recommendations request
export interface UserRecommendationsRequest {
  userId: string;
  limit?: number;
  type?: RecommendationType;
}

// Internal data structures
export interface Product {
  id: string;
  name: string;
  category: string;
  embedding: number[];
  price: number;
  tags: string[];
  createdAt: string;
}

export interface UserPurchase {
  userId: string;
  productId: string;
  quantity: number;
  timestamp: string;
}

export interface PurchasePattern {
  productId: string;
  relatedProducts: Map<string, number>; // productId -> frequency
  totalPurchases: number;
}

export interface TrendingItem {
  productId: string;
  purchaseCount: number;
  recentPurchases: number;
  velocity: number; // purchases per day
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// Health check response
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    memory: boolean;
    data: boolean;
  };
}

// Query validation schemas (for Zod)
export const RecommendationRequestSchema = {
  limit: { min: 1, max: 100, default: 10 },
} as const;

export const SimilarItemsRequestSchema = {
  productId: { required: true },
  limit: { min: 1, max: 50, default: 10 },
} as const;

export const TrendingRequestSchema = {
  limit: { min: 1, max: 50, default: 10 },
  timeframe: { min: 1, max: 30, default: 7 },
} as const;
