/**
 * Hojai Data Models - Customer Entity
 * Version: 1.0.0 | Date: May 30, 2026
 *
 * Customer is the primary entity for all B2C operations.
 * Links to Identity Platform for cross-channel resolution.
 */

import { z } from 'zod';

// ============================================
// CUSTOMER TYPES
// ============================================

/**
 * Customer type
 */
export type CustomerType = 'individual' | 'business';

/**
 * Gender options
 */
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/**
 * Customer status
 */
export type CustomerStatus = 'active' | 'inactive' | 'blocked' | 'deleted';

/**
 * Geo point for location
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Customer entity
 */
export interface Customer {
  // Core identification
  id: string;
  tenant_id: string;
  type: CustomerType;

  // Identifiers (multiple channels)
  phone?: string;
  email?: string;
  device_ids: string[];
  external_ids: Record<string, string>; // channel → id

  // Identity resolution (links across channels)
  unified_identity_id?: string;

  // Profile
  name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  birthday?: string;
  gender?: Gender;
  anniversary?: string;

  // Location
  current_location?: GeoPoint;
  home_location?: GeoPoint;
  work_location?: GeoPoint;

  // Business (if type = business)
  business_name?: string;
  business_type?: string;
  gstin?: string;
  pan?: string;

  // Metrics
  lifetime_value: number;
  order_count: number;
  avg_order_value: number;
  total_savings?: number;
  last_order_date?: string;
  first_order_date?: string;
  first_interaction_at?: string;
  last_interaction_at?: string;

  // Engagement & Risk
  churn_risk: 'low' | 'medium' | 'high';
  engagement_score: number; // 0-100
  nps_score?: number;
  satisfaction_score?: number;

  // Segmentation
  segments: string[];
  tags: string[];
  preferences: CustomerPreferences;

  // Consent
  consent_status: CustomerConsentStatus;

  // Status
  status: CustomerStatus;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
}

/**
 * Customer preferences
 */
export interface CustomerPreferences {
  language: string;
  notification_channel: 'whatsapp' | 'sms' | 'email' | 'app';
  communication_tone: 'formal' | 'friendly' | 'casual';
  timezone: string;
  currency: string;
}

/**
 * Customer consent status
 */
export interface CustomerConsentStatus {
  marketing: boolean;
  communication: boolean;
  third_party: boolean;
  data_processing: boolean;
  health?: boolean;
  location?: boolean;
  last_consent_update?: string;
}

/**
 * Customer summary (for lists)
 */
export interface CustomerSummary {
  id: string;
  tenant_id: string;
  type: CustomerType;
  name: string;
  phone?: string;
  email?: string;
  lifetime_value: number;
  engagement_score: number;
  churn_risk: 'low' | 'medium' | 'high';
  status: CustomerStatus;
  last_interaction_at?: string;
}

/**
 * Customer 360 view
 */
export interface Customer360 {
  customer: Customer;

  // Identity
  unified_identity?: UnifiedIdentity;

  // Conversations
  conversations: ConversationSummary[];

  // Orders
  orders: OrderSummary[];

  // Memory
  memory: MemorySummary[];

  // Predictions
  predictions?: PredictionSummary;

  // Engagement
  segments: string[];
  tags: string[];

  // Metrics
  lifetime_value: number;
  engagement_score: number;
  risk_assessment: RiskAssessment;

  // Timeline
  timeline: TimelineEvent[];
}

/**
 * Unified identity info
 */
export interface UnifiedIdentity {
  id: string;
  linked_channels: string[];
  link_count: number;
  last_linked_at?: string;
}

/**
 * Conversation summary
 */
export interface ConversationSummary {
  id: string;
  channel: string;
  last_message: string;
  message_count: number;
  status: string;
  last_message_at: string;
}

/**
 * Order summary
 */
export interface OrderSummary {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

/**
 * Memory summary
 */
export interface MemorySummary {
  type: string;
  key: string;
  value: string;
  confidence: number;
  updated_at: string;
}

/**
 * Prediction summary
 */
export interface PredictionSummary {
  churn_probability?: number;
  ltv_prediction?: number;
  next_purchase_days?: number;
  conversion_probability?: number;
  risk_level?: 'low' | 'medium' | 'high';
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  churn_risk: 'low' | 'medium' | 'high';
  churn_probability: number;
  factors: string[];
  recommended_actions: string[];
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// ZOD SCHEMAS
// ============================================

export const CustomerCreateSchema = z.object({
  type: z.enum(['individual', 'business']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  birthday: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  business_name: z.string().optional(),
  business_type: z.string().optional(),
  preferences: z.object({
    language: z.string().default('en'),
    notification_channel: z.enum(['whatsapp', 'sms', 'email', 'app']).default('whatsapp'),
    communication_tone: z.enum(['formal', 'friendly', 'casual']).default('friendly'),
    timezone: z.string().default('Asia/Kolkata'),
    currency: z.string().default('INR'),
  }).optional(),
});

export const CustomerUpdateSchema = z.object({
  name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  birthday: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  preferences: z.object({
    language: z.string().optional(),
    notification_channel: z.enum(['whatsapp', 'sms', 'email', 'app']).optional(),
    communication_tone: z.enum(['formal', 'friendly', 'casual']).optional(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createCustomer(
  tenantId: string,
  data: z.infer<typeof CustomerCreateSchema>
): Customer {
  const now = new Date().toISOString();

  return {
    id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    type: data.type,
    phone: data.phone,
    email: data.email,
    device_ids: [],
    external_ids: {},
    name: data.name,
    first_name: data.first_name,
    last_name: data.last_name,
    birthday: data.birthday,
    gender: data.gender,
    business_name: data.business_name,
    business_type: data.business_type,
    lifetime_value: 0,
    order_count: 0,
    avg_order_value: 0,
    churn_risk: 'low',
    engagement_score: 50,
    segments: [],
    tags: [],
    preferences: {
      language: data.preferences?.language || 'en',
      notification_channel: data.preferences?.notification_channel || 'whatsapp',
      communication_tone: data.preferences?.communication_tone || 'friendly',
      timezone: data.preferences?.timezone || 'Asia/Kolkata',
      currency: data.preferences?.currency || 'INR',
    },
    consent_status: {
      marketing: false,
      communication: true,
      third_party: false,
      data_processing: true,
    },
    status: 'active',
    created_at: now,
    updated_at: now,
    first_interaction_at: now,
    last_interaction_at: now,
  };
}

export function updateCustomerMetrics(
  customer: Customer,
  metrics: {
    lifetime_value?: number;
    order_count?: number;
    last_order_date?: string;
  }
): Customer {
  const avgOrderValue = metrics.order_count && metrics.lifetime_value
    ? metrics.lifetime_value / metrics.order_count
    : customer.avg_order_value;

  return {
    ...customer,
    lifetime_value: metrics.lifetime_value ?? customer.lifetime_value,
    order_count: metrics.order_count ?? customer.order_count,
    avg_order_value: avgOrderValue,
    last_order_date: metrics.last_order_date ?? customer.last_order_date,
    updated_at: new Date().toISOString(),
  };
}

export function updateCustomerRisk(
  customer: Customer,
  risk: 'low' | 'medium' | 'high',
  engagement_score: number
): Customer {
  return {
    ...customer,
    churn_risk: risk,
    engagement_score,
    updated_at: new Date().toISOString(),
  };
}

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  Customer,
  CustomerPreferences,
  CustomerConsentStatus,
  CustomerSummary,
  Customer360,
  UnifiedIdentity,
  ConversationSummary,
  OrderSummary,
  MemorySummary,
  PredictionSummary,
  RiskAssessment,
  TimelineEvent,
  GeoPoint,
};
