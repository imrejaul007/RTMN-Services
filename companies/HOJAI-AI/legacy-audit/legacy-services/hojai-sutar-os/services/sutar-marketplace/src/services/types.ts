// ============================================================================
// SUTAR Marketplace - Type Definitions
// ============================================================================

// Service Status Types
export type ServiceStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'archived';
export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'failed';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | 'bank_transfer' | 'crypto';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'trial';
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
export type PlanType = 'free' | 'basic' | 'standard' | 'premium' | 'enterprise';
export type CategoryStatus = 'active' | 'inactive' | 'hidden';

// Base API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Service Types
export interface Service {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  provider: string;
  providerId: string;
  category: string;
  categoryId: string;
  subcategory?: string;
  price: number;
  currency: string;
  priceType: 'fixed' | 'per_user' | 'per_usage' | 'tiered';
  rating: number;
  reviewCount: number;
  downloadCount: number;
  viewCount: number;
  status: ServiceStatus;
  featured: boolean;
  trending: boolean;
  tags: string[];
  images: string[];
  thumbnail: string;
  demoUrl?: string;
  documentationUrl?: string;
  supportUrl?: string;
  termsUrl?: string;
  privacyUrl?: string;
  metadata: Record<string, unknown>;
  features: ServiceFeature[];
  requirements: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ServiceFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: string;
  icon?: string;
}

// Review Types
export interface Review {
  id: string;
  serviceId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: ReviewRating;
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  helpful: number;
  notHelpful: number;
  verified: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: string;
  updatedAt: string;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  parentId?: string;
  parent?: Category;
  children: CategoryTree[];
  order: number;
  status: CategoryStatus;
  serviceCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTree {
  id: string;
  name: string;
  slug: string;
  icon: string;
  children: CategoryTree[];
  serviceCount: number;
}

// Pricing Plan Types
export interface PricingPlan {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  type: PlanType;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  billingPeriod: number;
  trialDays: number;
  features: PlanFeature[];
  limits: PlanLimits;
  isActive: boolean;
  isRecommended: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: string;
  unit?: string;
}

export interface PlanLimits {
  maxUsers?: number;
  maxStorage?: number;
  maxApiCalls?: number;
  maxProjects?: number;
  rateLimit?: number;
  customLimits: Record<string, number>;
}

// Order Types
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  billingAddress?: Address;
  shippingAddress?: Address;
  notes?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface OrderItem {
  id: string;
  serviceId: string;
  serviceName: string;
  planId: string;
  planName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'active' | 'cancelled' | 'refunded';
  metadata: Record<string, unknown>;
}

// Payment Types
export interface Payment {
  id: string;
  orderId: string;
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string;
  providerTransactionId?: string;
  providerResponse?: Record<string, unknown>;
  failureReason?: string;
  refundAmount?: number;
  refundReason?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PaymentMethodInfo {
  type: PaymentMethod;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  walletName?: string;
}

// Subscription Types
export interface Subscription {
  id: string;
  userId: string;
  userEmail: string;
  serviceId: string;
  serviceName: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  pauseAt?: string;
  paymentMethod?: PaymentMethodInfo;
  defaultPaymentMethodId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsage {
  id: string;
  subscriptionId: string;
  metric: string;
  value: number;
  limit: number;
  period: string;
  resetAt: string;
  createdAt: string;
  updatedAt: string;
}

// Favorites Types
export interface Favorite {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  serviceThumbnail: string;
  servicePrice: number;
  notes?: string;
  createdAt: string;
}

// Recommendation Types
export interface Recommendation {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  serviceThumbnail: string;
  servicePrice: number;
  score: number;
  reason: RecommendationReason;
  reasons: string[];
  position: number;
  viewed: boolean;
  clicked: boolean;
  createdAt: string;
}

export type RecommendationReason =
  | 'similar_to_purchased'
  | 'popular_in_category'
  | 'trending'
  | 'highly_rated'
  | 'frequently_bought_together'
  | 'new_release'
  | 'personalized'
  | 'based_on_browsing';

// Analytics Types
export interface MarketplaceAnalytics {
  totalServices: number;
  activeServices: number;
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  averageRating: number;
  topCategories: CategoryAnalytics[];
  topServices: ServiceAnalytics[];
  revenueByDay: RevenueByDay[];
  ordersByDay: OrdersByDay[];
  subscriptionsByPlan: SubscriptionsByPlan[];
  recentActivity: ActivityItem[];
  growth: GrowthMetrics;
}

export interface CategoryAnalytics {
  categoryId: string;
  categoryName: string;
  serviceCount: number;
  revenue: number;
  orderCount: number;
  averageRating: number;
}

export interface ServiceAnalytics {
  serviceId: string;
  serviceName: string;
  revenue: number;
  orderCount: number;
  viewCount: number;
  conversionRate: number;
  averageRating: number;
}

export interface RevenueByDay {
  date: string;
  revenue: number;
  orders: number;
}

export interface OrdersByDay {
  date: string;
  orders: number;
  completed: number;
  cancelled: number;
}

export interface SubscriptionsByPlan {
  planId: string;
  planName: string;
  activeCount: number;
  trialCount: number;
  cancelledCount: number;
  revenue: number;
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'review' | 'subscription' | 'payment' | 'service_added';
  description: string;
  userId: string;
  userName: string;
  serviceId?: string;
  serviceName?: string;
  amount?: number;
  createdAt: string;
}

export interface GrowthMetrics {
  revenueGrowth: number;
  orderGrowth: number;
  userGrowth: number;
  serviceGrowth: number;
}

// Address Types
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Economy OS Integration Types
export interface EconomyBalance {
  userId: string;
  balance: number;
  currency: string;
  frozenBalance: number;
  updatedAt: string;
}

export interface EconomyTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit' | 'freeze' | 'unfreeze' | 'refund';
  amount: number;
  currency: string;
  description: string;
  referenceId?: string;
  referenceType?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

// Service Statistics
export interface ServiceStatistics {
  serviceId: string;
  views: number;
  uniqueViews: number;
  purchases: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  conversionRate: number;
  favorites: number;
  cartAdds: number;
  abandons: number;
}

// Search and Filter Types
export interface ServiceSearchParams {
  query?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  status?: ServiceStatus;
  featured?: boolean;
  trending?: boolean;
  provider?: string;
  sortBy?: 'rating' | 'price' | 'newest' | 'popular' | 'trending';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CategorySearchParams {
  parentId?: string;
  status?: CategoryStatus;
  includeChildren?: boolean;
  limit?: number;
  offset?: number;
}

// Cart Types
export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  serviceId: string;
  serviceName: string;
  planId: string;
  planName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedAt: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'order_placed' | 'order_completed' | 'payment_received' | 'subscription_renewed' | 'subscription_cancelled' | 'review_received' | 'service_featured';
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Webhook Types
export interface Webhook {
  id: string;
  serviceId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: string;
  createdAt: string;
}
