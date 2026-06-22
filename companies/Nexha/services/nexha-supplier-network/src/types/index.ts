/**
 * Supplier Registry — Type Definitions
 * Phase C.1: Supplier Discovery & Capability Matching
 */

export type SupplierStatus = 'active' | 'pending' | 'suspended' | 'inactive';
export type SupplierTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type CapabilityCategory =
  | 'groceries'
  | 'medicine'
  | 'electronics'
  | 'apparel'
  | 'restaurant_supply'
  | 'hotel_supply'
  | 'raw_materials'
  | 'manufactured_goods'
  | 'services'
  | 'logistics'
  | 'other';

export interface SupplierCapability {
  category: CapabilityCategory;
  /** Specific product/service names within the category. */
  items: string[];
  /** Min order value in INR. */
  minOrderValue?: number;
  /** Delivery radius in km. */
  deliveryRadiusKm?: number;
}

export interface SupplierLocation {
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
  pincode?: string;
}

export interface SupplierRating {
  /** Aggregate rating 0..5 */
  overall: number;
  totalReviews: number;
  reliability: number;        // 0..100
  quality: number;            // 0..100
  deliverySpeed: number;      // 0..100
}

export interface SupplierPricing {
  currency: string;
  /** Average price for top item (for ranking). */
  avgPricePerUnit?: number;
  unit?: string;
  bulkDiscountPct?: number;
}

export interface Supplier {
  id: string;
  name: string;
  description?: string;
  status: SupplierStatus;
  tier: SupplierTier;
  corpId?: string;            // links to CorpID
  categories: CapabilityCategory[];
  capabilities: SupplierCapability[];
  location: SupplierLocation;
  rating: SupplierRating;
  pricing?: SupplierPricing;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  trustScore?: number;        // 0..100, from SADA
  totalOrders?: number;
  verifiedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierSearchQuery {
  /** Required: what is being sourced. */
  category?: CapabilityCategory;
  /** Optional: specific item name (matches capability.items). */
  item?: string;
  /** Optional: location filter (city or pincode). */
  location?: string;
  /** Max delivery distance in km (default 50). */
  maxDistanceKm?: number;
  /** Minimum overall rating (default 0). */
  minRating?: number;
  /** Minimum trust score (default 0). */
  minTrustScore?: number;
  /** Maximum price per unit. */
  maxPricePerUnit?: number;
  /** Maximum number of results (default 20). */
  limit?: number;
  /** Sort by field. */
  sortBy?: 'rating' | 'trustScore' | 'price' | 'distance' | 'orders';
}

export interface SupplierMatch {
  supplier: Supplier;
  /** Match score 0..100 — higher is better. */
  matchScore: number;
  /** Breakdown of how the score was computed. */
  scoreBreakdown: {
    category: number;
    item: number;
    location: number;
    rating: number;
    trust: number;
    price: number;
  };
  /** Distance from query location, if applicable. */
  distanceKm?: number;
}

export interface SupplierSearchResult {
  query: SupplierSearchQuery;
  total: number;
  matches: SupplierMatch[];
  generatedAt: string;
}
