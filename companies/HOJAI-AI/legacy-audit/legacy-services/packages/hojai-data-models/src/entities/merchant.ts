/**
 * Hojai Data Models - Merchant Entity
 * Version: 1.0.0 | Date: May 30, 2026
 *
 * Merchant is the primary entity for B2B operations.
 * Links to Identity Platform for verification.
 * Maps to REZ Merchant services.
 */

import { z } from 'zod';

// ============================================
// MERCHANT TYPES
// ============================================

/**
 * Merchant type
 */
export type MerchantType = 'retailer' | 'wholesaler' | 'distributor' | 'franchise' | 'brand' | 'manufacturer';

/**
 * Merchant status
 */
export type MerchantStatus = 'active' | 'pending' | 'suspended' | 'blocked' | 'churned';

/**
 * Business category
 */
export type BusinessCategory =
  | 'jewellery'
  | 'restaurant'
  | 'hotel'
  | 'salon'
  | 'fitness'
  | 'retail'
  | 'healthcare'
  | 'education'
  | 'ecommerce'
  | 'other';

/**
 * Geo point
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Operating hours
 */
export interface OperatingHours {
  day: number; // 0-6 (Sunday-Saturday)
  open: string; // "09:00"
  close: string; // "21:00"
  is_closed: boolean;
}

/**
 * Merchant entity
 */
export interface Merchant {
  // Core identification
  id: string;
  tenant_id: string;

  // Profile
  name: string;
  slug: string;
  type: MerchantType;
  business_category: BusinessCategory;

  // Branding
  logo_url?: string;
  banner_url?: string;
  description?: string;
  tagline?: string;

  // Contact
  phone: string;
  email: string;
  website?: string;
  social_links?: SocialLinks;

  // Location
  addresses: MerchantAddress[];
  coordinates?: GeoPoint;
  primary_address_id?: string;

  // Business verification
  gstin?: string;
  pan?: string;
  cin?: string;
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;

  // Business details
  categories: string[];
  tags: string[];
  specialties?: string[];

  // Metrics
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  total_customers: number;
  rating?: number;
  review_count: number;

  // Settings
  operating_hours: OperatingHours[];
  timezone: string;
  currency: string;
  language: string;

  // Subscription
  plan?: 'basic' | 'standard' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'trial' | 'expired' | 'cancelled';

  // Integrations
  integrations: string[];
  api_key?: string;
  webhook_url?: string;

  // Status
  status: MerchantStatus;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  suspended_at?: string;
}

/**
 * Social links
 */
export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
}

/**
 * Merchant address
 */
export interface MerchantAddress {
  id: string;
  type: 'billing' | 'shipping' | 'business' | 'warehouse';
  is_primary: boolean;

  // Address
  address_line1: string;
  address_line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;

  // Geo
  coordinates?: GeoPoint;

  // Contact
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;

  // Status
  is_active: boolean;
}

/**
 * Merchant summary (for lists)
 */
export interface MerchantSummary {
  id: string;
  tenant_id: string;
  name: string;
  type: MerchantType;
  business_category: BusinessCategory;
  city: string;
  status: MerchantStatus;
  total_revenue: number;
  total_orders: number;
  rating?: number;
}

/**
 * Merchant metrics
 */
export interface MerchantMetrics {
  merchant_id: string;
  tenant_id: string;

  // Revenue
  total_revenue: number;
  revenue_growth_percent: number;
  avg_order_value: number;

  // Orders
  total_orders: number;
  orders_this_month: number;
  orders_growth_percent: number;

  // Customers
  total_customers: number;
  new_customers_this_month: number;
  returning_customer_rate: number;

  // Performance
  rating: number;
  review_count: number;
  response_rate: number;
  avg_response_time_minutes: number;

  // Engagement
  last_order_date?: string;
  last_activity_date?: string;

  // Period
  period_start: string;
  period_end: string;
}

/**
 * Merchant onboarding
 */
export interface MerchantOnboarding {
  merchant_id: string;
  steps: OnboardingStep[];
  completed_at?: string;
}

export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at?: string;
  data?: Record<string, any>;
}

// ============================================
// ZOD SCHEMAS
// ============================================

export const MerchantCreateSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  type: z.enum(['retailer', 'wholesaler', 'distributor', 'franchise', 'brand', 'manufacturer']),
  business_category: z.enum([
    'jewellery', 'restaurant', 'hotel', 'salon', 'fitness',
    'retail', 'healthcare', 'education', 'ecommerce', 'other'
  ]),
  phone: z.string().min(10).max(15),
  email: z.string().email(),
  website: z.string().url().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const MerchantUpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  logo_url: z.string().url().optional(),
  banner_url: z.string().url().optional(),
  description: z.string().optional(),
  tagline: z.string().optional(),
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  social_links: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    youtube: z.string().optional(),
  }).optional(),
  operating_hours: z.array(z.object({
    day: z.number().min(0).max(6),
    open: z.string(),
    close: z.string(),
    is_closed: z.boolean(),
  })).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  status: z.enum(['active', 'pending', 'suspended', 'blocked', 'churned']).optional(),
});

export const MerchantAddressSchema = z.object({
  type: z.enum(['billing', 'shipping', 'business', 'warehouse']),
  is_primary: z.boolean().default(false),
  address_line1: z.string().min(5),
  address_line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  postal_code: z.string().min(4).max(10),
  country: z.string().default('India'),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional(),
});

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_OPERATING_HOURS: OperatingHours[] = [
  { day: 0, open: '10:00', close: '20:00', is_closed: true },  // Sunday
  { day: 1, open: '09:00', close: '21:00', is_closed: false }, // Monday
  { day: 2, open: '09:00', close: '21:00', is_closed: false }, // Tuesday
  { day: 3, open: '09:00', close: '21:00', is_closed: false }, // Wednesday
  { day: 4, open: '09:00', close: '21:00', is_closed: false }, // Thursday
  { day: 5, open: '09:00', close: '21:00', is_closed: false }, // Friday
  { day: 6, open: '10:00', close: '22:00', is_closed: false }, // Saturday
];

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create merchant
 */
export function createMerchant(
  tenantId: string,
  data: z.infer<typeof MerchantCreateSchema>
): Merchant {
  const now = new Date().toISOString();

  return {
    id: `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    name: data.name,
    slug: data.slug,
    type: data.type,
    business_category: data.business_category,
    phone: data.phone,
    email: data.email,
    website: data.website,
    gstin: data.gstin,
    pan: data.pan,
    categories: data.categories,
    tags: data.tags,
    addresses: [],
    social_links: {},
    total_revenue: 0,
    total_orders: 0,
    avg_order_value: 0,
    total_customers: 0,
    rating: 0,
    review_count: 0,
    operating_hours: DEFAULT_OPERATING_HOURS,
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    language: 'en',
    subscription_status: 'trial',
    integrations: [],
    is_verified: false,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Add address to merchant
 */
export function addMerchantAddress(
  merchant: Merchant,
  addressData: z.infer<typeof MerchantAddressSchema>
): Merchant {
  const address: MerchantAddress = {
    id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...addressData,
    is_active: true,
  };

  // If this is primary, unset other primary addresses
  if (address.is_primary) {
    merchant.addresses = merchant.addresses.map(a => ({ ...a, is_primary: false }));
  }

  merchant.addresses.push(address);

  if (address.is_primary) {
    merchant.primary_address_id = address.id;
  }

  // Set coordinates from primary address
  if (address.coordinates) {
    merchant.coordinates = address.coordinates;
  }

  merchant.updated_at = new Date().toISOString();

  return merchant;
}

/**
 * Update merchant metrics
 */
export function updateMerchantMetrics(
  merchant: Merchant,
  metrics: {
    total_revenue?: number;
    total_orders?: number;
    total_customers?: number;
    rating?: number;
  }
): Merchant {
  const newRevenue = metrics.total_revenue ?? merchant.total_revenue;
  const newOrders = metrics.total_orders ?? merchant.total_orders;

  return {
    ...merchant,
    total_revenue: newRevenue,
    total_orders: newOrders,
    avg_order_value: newOrders > 0 ? newRevenue / newOrders : 0,
    total_customers: metrics.total_customers ?? merchant.total_customers,
    rating: metrics.rating ?? merchant.rating,
    review_count: merchant.review_count,
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };
}

/**
 * Verify merchant
 */
export function verifyMerchant(
  merchant: Merchant,
  verifiedBy: string
): Merchant {
  return {
    ...merchant,
    is_verified: true,
    verified_at: new Date().toISOString(),
    verified_by: verifiedBy,
    status: 'active',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Suspend merchant
 */
export function suspendMerchant(merchant: Merchant): Merchant {
  return {
    ...merchant,
    status: 'suspended',
    suspended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Reactivate merchant
 */
export function reactivateMerchant(merchant: Merchant): Merchant {
  return {
    ...merchant,
    status: 'active',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Get merchant summary
 */
export function getMerchantSummary(merchant: Merchant): MerchantSummary {
  const primaryAddress = merchant.addresses.find(a => a.is_primary) || merchant.addresses[0];

  return {
    id: merchant.id,
    tenant_id: merchant.tenant_id,
    name: merchant.name,
    type: merchant.type,
    business_category: merchant.business_category,
    city: primaryAddress?.city || 'Unknown',
    status: merchant.status,
    total_revenue: merchant.total_revenue,
    total_orders: merchant.total_orders,
    rating: merchant.rating,
  };
}

/**
 * Calculate merchant health score
 */
export function calculateMerchantHealth(merchant: Merchant): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: { factor: string; impact: number; description: string }[];
} {
  const factors: { factor: string; impact: number; description: string }[] = [];
  let score = 50; // Start at 50

  // Revenue factor
  if (merchant.total_revenue > 100000) {
    factors.push({ factor: 'high_revenue', impact: 10, description: 'Revenue > ₹1L' });
    score += 10;
  } else if (merchant.total_revenue > 50000) {
    factors.push({ factor: 'medium_revenue', impact: 5, description: 'Revenue > ₹50K' });
    score += 5;
  }

  // Orders factor
  if (merchant.total_orders > 100) {
    factors.push({ factor: 'high_orders', impact: 10, description: 'Orders > 100' });
    score += 10;
  } else if (merchant.total_orders > 50) {
    factors.push({ factor: 'medium_orders', impact: 5, description: 'Orders > 50' });
    score += 5;
  }

  // Rating factor
  if (merchant.rating && merchant.rating > 4.5) {
    factors.push({ factor: 'excellent_rating', impact: 15, description: 'Rating > 4.5' });
    score += 15;
  } else if (merchant.rating && merchant.rating > 4.0) {
    factors.push({ factor: 'good_rating', impact: 10, description: 'Rating > 4.0' });
    score += 10;
  } else if (merchant.rating && merchant.rating < 3.0) {
    factors.push({ factor: 'poor_rating', impact: -10, description: 'Rating < 3.0' });
    score -= 10;
  }

  // Verification factor
  if (merchant.is_verified) {
    factors.push({ factor: 'verified', impact: 5, description: 'Verified merchant' });
    score += 5;
  }

  // Status factor
  if (merchant.status === 'active') {
    factors.push({ factor: 'active', impact: 5, description: 'Active status' });
    score += 5;
  } else if (merchant.status === 'suspended') {
    factors.push({ factor: 'suspended', impact: -20, description: 'Suspended' });
    score -= 20;
  }

  // Calculate grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 80) grade = 'A';
  else if (score >= 60) grade = 'B';
  else if (score >= 40) grade = 'C';
  else if (score >= 20) grade = 'D';
  else grade = 'F';

  return { score: Math.max(0, Math.min(100, score)), grade, factors };
}

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  Merchant,
  MerchantType,
  MerchantStatus,
  BusinessCategory,
  GeoPoint,
  OperatingHours,
  SocialLinks,
  MerchantAddress,
  MerchantSummary,
  MerchantMetrics,
  MerchantOnboarding,
  OnboardingStep,
};
