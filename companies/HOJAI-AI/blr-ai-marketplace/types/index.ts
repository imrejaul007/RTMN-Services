/**
 * BAM Marketplace Type Definitions
 */

export interface Listing {
  _id?: string;
  listingId: string;
  tenantId: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: Category;
  tags: string[];
  pricingModel: PricingModel;
  price?: number;
  currency: string;
  visibility: Visibility;
  status: ListingStatus;
  rating?: number;
  reviewCount?: number;
  installCount?: number;
  viewCount?: number;
  publisherName: string;
  publisherUrl?: string;
  directoryCompanyId?: string;
  directoryAgentId?: string;
  trustScore?: number;
  sampleData?: Record<string, unknown>;
  assets?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id?: string;
  reviewId: string;
  listingId: string;
  tenantId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  title?: string;
  body?: string;
  dimensions?: ReviewDimensions;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewDimensions {
  easeOfUse?: number;
  documentation?: number;
  support?: number;
  valueForMoney?: number;
}

export interface Category {
  id: string;
  icon: string;
  name: string;
  description: string;
  featured?: boolean;
  killer?: boolean;
}

export interface CategoryWithCount extends Category {
  count: number;
}

export interface SearchFilters {
  q?: string;
  category?: string;
  tag?: string;
  pricingModel?: PricingModel;
  minRating?: number;
  publisherName?: string;
  sort?: SortOption;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  count: number;
  total: number;
  listings: Listing[];
  hasMore: boolean;
}

export interface Stats {
  totalListings: number;
  totalReviews: number;
  totalInstalls: number;
  averageRating: number;
  byCategory: Record<string, number>;
  byPricingModel: Record<string, number>;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  amount: number;
  currency: string;
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  status: string;
}

export interface PublisherRevenue {
  publisherId: string;
  totalSales: number;
  grossRevenue: number;
  commission: number;
  netRevenue: number;
  currency: string;
}

// Enums
export type PricingModel = 'free' | 'one-time' | 'subscription' | 'usage-based' | 'quote-only';
export type Visibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'SUSPENDED' | 'ARCHIVED';
export type ReviewStatus = 'published' | 'hidden' | 'flagged' | 'removed';
export type SortOption = 'recent' | 'rating' | 'popular';
