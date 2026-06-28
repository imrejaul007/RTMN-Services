/**
 * Commerce Types for HOJAI Widget
 */

// Product Types
export interface Product {
  productId: string;
  companyId: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  category?: string;
  tags?: string[];
  images?: string[];
  inventory?: number;
  sku?: string;
  variants?: ProductVariant[];
  attributes?: Record<string, string>;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariant {
  variantId: string;
  name: string;
  price: number;
  inventory: number;
  sku?: string;
  options?: Record<string, string>;
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

// Cart Types
export interface CartItem {
  itemId: string;
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  sku?: string;
  maxQuantity?: number;
}

export interface Cart {
  cartId: string;
  companyId: string;
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CouponCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  expiresAt?: string;
}

// Checkout Types
export interface Address {
  name: string;
  phone: string;
  email?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays?: number;
}

export interface Order {
  orderId: string;
  orderNumber: string;
  companyId: string;
  customerId: string;
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  shippingAddress: Address;
  billingAddress?: Address;
  shippingMethod?: ShippingMethod;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  couponCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment Types
export interface PaymentInitiation {
  paymentId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface UPIQRData {
  qrData: string;
  qrDataBase64: string;
  upiId: string;
  amount: number;
  paymentId: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
  types?: string[];
}

// Loyalty Types
export interface LoyaltyProfile {
  customerId: string;
  points: number;
  lifetimePoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  tierPerks?: string[];
  tierDiscount?: number;
  redeemableValue: number;
  referralCode: string;
  memberSince: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  pointsRequired: number;
  type: 'discount' | 'shipping' | 'cashback' | 'giftcard';
  value: number;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  balance: number;
  createdAt: string;
}

// Review Types
export interface Review {
  reviewId: string;
  companyId: string;
  productId: string;
  orderId?: string;
  customerId: string;
  customerName: string;
  rating: number;
  title: string;
  content: string;
  images?: string[];
  verified: boolean;
  helpful: number;
  status: 'pending' | 'approved' | 'rejected';
  sentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: string;
}

export interface ReviewRequest {
  orderId: string;
  customerId: string;
  customerEmail?: string;
  productIds: string[];
  channel: 'email' | 'whatsapp';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Sales Pipeline Types
export type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export interface PipelineStageConfig {
  id: PipelineStage;
  name: string;
  probability: number;
  color: string;
}

export interface DealProduct {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface Activity {
  type: string;
  description: string;
  timestamp: string;
}

export interface Deal {
  dealId: string;
  title: string;
  description: string;
  value: number;
  currency: 'INR' | 'USD';
  stage: PipelineStage;
  probability: number;
  contactId?: string;
  contactName: string;
  contactEmail?: string;
  owner: string;
  products: DealProduct[];
  expectedCloseDate?: string;
  actualCloseDate?: string;
  lostReason?: string;
  notes: string[];
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
  commission?: number;
}

export interface QuoteItem {
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Quote {
  quoteId: string;
  quoteNumber: string;
  dealId?: string;
  contactId?: string;
  contactName: string;
  contactEmail?: string;
  items: QuoteItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  validUntil: string;
  terms: string;
  status: QuoteStatus;
  sentAt?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  sku: string;
  unitPrice: number;
  currency: 'INR' | 'USD';
  taxRate: number;
  category: string;
  active: boolean;
}

export interface PipelineSummary {
  totalValue: number;
  totalWeightedValue: number;
  dealCount: number;
  avgDealSize: number;
}

export interface PipelineData {
  stages: Record<PipelineStage, PipelineStageData>;
  summary: PipelineSummary;
}

export interface PipelineStageData extends PipelineStageConfig {
  deals: Deal[];
}