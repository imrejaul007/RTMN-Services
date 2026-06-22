/**
 * Hojai Data Models - Tenant Entity
 * Version: 1.0.0 | Date: May 30, 2026
 * Priority: #1 - Most important entity
 *
 * The Tenant is the root entity for all multi-tenant operations.
 * Every other entity in Hojai belongs to a Tenant.
 */

import { z } from 'zod';

// ============================================
// TENANT TYPES
// ============================================

/**
 * Tenant types supported by Hojai
 */
export type TenantType = 'rez' | 'merchant' | 'enterprise' | 'rabtul';

/**
 * Tenant plan levels
 */
export type TenantPlan = 'starter' | 'professional' | 'enterprise';

/**
 * Tenant status
 */
export type TenantStatus = 'active' | 'suspended' | 'churned' | 'trial';

/**
 * Supported industries
 */
export type Industry =
  | 'jewellery'
  | 'healthcare'
  | 'hospitality'
  | 'retail'
  | 'restaurant'
  | 'salon'
  | 'fitness'
  | 'education'
  | 'finance'
  | 'real_estate'
  | 'automotive'
  | 'travel'
  | 'ecommerce'
  | 'other';

/**
 * Tenant entity - the root of all multi-tenant operations
 */
export interface Tenant {
  // Core identification
  id: string;
  name: string;
  slug: string;

  // Classification
  type: TenantType;
  industry: Industry;

  // Namespace for database isolation
  namespace: string;

  // Plan and limits
  plan: TenantPlan;
  limits: TenantLimits;

  // Contact information
  contact: TenantContact;

  // Branding
  branding: TenantBranding;

  // Settings
  settings: TenantSettings;

  // Billing
  billing: TenantBilling;

  // Status
  status: TenantStatus;

  // Metadata
  metadata: Record<string, unknown>;

  // Timestamps
  created_at: string;
  updated_at: string;
  suspended_at?: string;
  churned_at?: string;
}

/**
 * Tenant resource limits
 */
export interface TenantLimits {
  // Users
  max_users: number;

  // API
  max_api_calls_per_month: number;

  // Storage
  max_storage_bytes: number;

  // Rate limiting
  rate_limit_per_minute: number;

  // Resources
  max_agents: number;
  max_workflows: number;
  max_campaigns: number;
  max_conversations_per_month: number;

  // Advanced
  max_segments: number;
  max_integrations: number;
  max_knowledge_articles: number;
}

/**
 * Tenant contact information
 */
export interface TenantContact {
  email: string;
  phone?: string;
  website?: string;
  address?: Address;
}

/**
 * Address structure
 */
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  landmark?: string;
}

/**
 * Tenant branding customization
 */
export interface TenantBranding {
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
}

/**
 * Tenant settings
 */
export interface TenantSettings {
  timezone: string;
  language: string;
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  time_format: '12h' | '24h';
  currency: string;
  currency_symbol: string;

  // Feature flags
  features: Record<string, boolean>;

  // Communication preferences
  communication: TenantCommunicationSettings;

  // Security settings
  security: TenantSecuritySettings;
}

/**
 * Communication settings
 */
export interface TenantCommunicationSettings {
  default_channel: 'whatsapp' | 'email' | 'sms';
  email_from_name?: string;
  email_from_address?: string;
  sms_sender_id?: string;
}

/**
 * Security settings
 */
export interface TenantSecuritySettings {
  mfa_required: boolean;
  session_timeout_minutes: number;
  password_policy: PasswordPolicy;
  ip_whitelist?: string[];
  allowed_origins?: string[];
}

/**
 * Password policy
 */
export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
}

/**
 * Tenant billing information
 */
export interface TenantBilling {
  billing_email: string;
  billing_contact_name?: string;
  billing_address?: Address;

  // Subscription
  subscription_id?: string;
  billing_cycle: 'monthly' | 'yearly';

  // Payment
  payment_method?: string;
  auto_charge: boolean;

  // Status
  last_payment_date?: string;
  next_payment_date?: string;
  payment_status: 'active' | 'past_due' | 'cancelled';

  // Invoices
  invoice_prefix: string;
  invoice_email?: string;
}

// ============================================
// ZOD SCHEMAS (Validation)
// ============================================

/**
 * Tenant creation schema
 */
export const TenantCreateSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  type: z.enum(['rez', 'merchant', 'enterprise', 'rabtul']),
  industry: z.enum([
    'jewellery', 'healthcare', 'hospitality', 'retail', 'restaurant',
    'salon', 'fitness', 'education', 'finance', 'real_estate',
    'automotive', 'travel', 'ecommerce', 'other'
  ]),
  contact: z.object({
    email: z.string().email(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
  }),
  plan: z.enum(['starter', 'professional', 'enterprise']).default('starter'),
});

/**
 * Tenant update schema
 */
export const TenantUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
  }).optional(),
  branding: z.object({
    logo_url: z.string().url().optional(),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }).optional(),
  settings: z.object({
    timezone: z.string().optional(),
    language: z.string().optional(),
  }).optional(),
});

/**
 * Tenant limits by plan
 */
export const DEFAULT_TENANT_LIMITS: Record<TenantPlan, TenantLimits> = {
  starter: {
    max_users: 5,
    max_api_calls_per_month: 10000,
    max_storage_bytes: 1 * 1024 * 1024 * 1024, // 1GB
    rate_limit_per_minute: 60,
    max_agents: 3,
    max_workflows: 10,
    max_campaigns: 5,
    max_conversations_per_month: 1000,
    max_segments: 5,
    max_integrations: 3,
    max_knowledge_articles: 100,
  },
  professional: {
    max_users: 25,
    max_api_calls_per_month: 100000,
    max_storage_bytes: 10 * 1024 * 1024 * 1024, // 10GB
    rate_limit_per_minute: 300,
    max_agents: 15,
    max_workflows: 50,
    max_campaigns: 25,
    max_conversations_per_month: 10000,
    max_segments: 25,
    max_integrations: 15,
    max_knowledge_articles: 1000,
  },
  enterprise: {
    max_users: -1, // Unlimited
    max_api_calls_per_month: -1,
    max_storage_bytes: -1,
    rate_limit_per_minute: 1000,
    max_agents: -1,
    max_workflows: -1,
    max_campaigns: -1,
    max_conversations_per_month: -1,
    max_segments: -1,
    max_integrations: -1,
    max_knowledge_articles: -1,
  },
};

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a new tenant
 */
export function createTenant(data: z.infer<typeof TenantCreateSchema>): Tenant {
  const now = new Date().toISOString();
  const plan = data.plan || 'starter';

  return {
    id: `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: data.name,
    slug: data.slug,
    type: data.type,
    industry: data.industry,
    namespace: `tenant_${data.slug}`,
    plan,
    limits: DEFAULT_TENANT_LIMITS[plan],
    contact: {
      email: data.contact.email,
      phone: data.contact.phone,
      website: data.contact.website,
    },
    branding: {
      primary_color: '#3B82F6',
      secondary_color: '#60A5FA',
    },
    settings: {
      timezone: 'Asia/Kolkata',
      language: 'en',
      date_format: 'DD/MM/YYYY',
      time_format: '12h',
      currency: 'INR',
      currency_symbol: '₹',
      features: getDefaultFeatures(plan),
      communication: {
        default_channel: 'whatsapp',
      },
      security: {
        mfa_required: false,
        session_timeout_minutes: 30,
        password_policy: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_special_chars: false,
        },
      },
    },
    billing: {
      billing_email: data.contact.email,
      billing_cycle: 'monthly',
      payment_status: 'active',
      invoice_prefix: `INV-${data.slug.toUpperCase()}-`,
    },
    status: 'trial',
    metadata: {},
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get default features based on plan
 */
function getDefaultFeatures(plan: TenantPlan): Record<string, boolean> {
  const base = {
    // Core
    customers: true,
    conversations: true,
    agents: true,
    workflows: true,

    // Intelligence
    predictions: plan !== 'starter',
    recommendations: plan !== 'starter',
    segments: plan !== 'starter',

    // Communications
    whatsapp: true,
    email: true,
    sms: plan === 'enterprise',

    // Analytics
    analytics: true,
    exports: plan !== 'starter',

    // Advanced
    api_access: true,
    webhooks: plan !== 'starter',
    custom_integrations: plan === 'enterprise',
  };

  return base;
}

/**
 * Upgrade tenant plan
 */
export function upgradeTenantPlan(
  tenant: Tenant,
  newPlan: TenantPlan
): Tenant {
  return {
    ...tenant,
    plan: newPlan,
    limits: DEFAULT_TENANT_LIMITS[newPlan],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Suspend tenant
 */
export function suspendTenant(tenant: Tenant): Tenant {
  return {
    ...tenant,
    status: 'suspended',
    suspended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Reactivate suspended tenant
 */
export function reactivateTenant(tenant: Tenant): Tenant {
  return {
    ...tenant,
    status: 'active',
    suspended_at: undefined,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Mark tenant as churned
 */
export function churnTenant(tenant: Tenant): Tenant {
  return {
    ...tenant,
    status: 'churned',
    churned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  Tenant,
  TenantLimits,
  TenantContact,
  TenantBranding,
  TenantSettings,
  TenantCommunicationSettings,
  TenantSecuritySettings,
  PasswordPolicy,
  TenantBilling,
};

export {
  TenantCreateSchema,
  TenantUpdateSchema,
  DEFAULT_TENANT_LIMITS,
};
