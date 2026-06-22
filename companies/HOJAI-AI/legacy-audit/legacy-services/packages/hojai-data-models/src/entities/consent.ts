/**
 * Hojai Data Models - Consent Entity
 * Version: 1.0.0 | Date: May 30, 2026
 * Priority: #2 - Critical for GDPR/PDPA compliance
 *
 * Consent is critical for regulated industries:
 * - Healthcare (HIPAA)
 * - Finance (DPDP Act)
 * - Employment
 * - Mobility
 */

import { z } from 'zod';

// ============================================
// CONSENT TYPES
// ============================================

/**
 * Consent purposes - what data is being consented to
 */
export type ConsentPurpose =
  // Marketing
  | 'marketing_communication'
  | 'personalized_offers'
  | 'third_party_sharing'
  // Data processing
  | 'data_processing'
  | 'analytics'
  | 'ai_processing'
  // Communication
  | 'whatsapp_communication'
  | 'email_communication'
  | 'sms_communication'
  | 'app_notification'
  // Industry-specific
  | 'health_data_processing'
  | 'financial_data_processing'
  | 'location_tracking'
  | 'employment_verification';

/**
 * How consent was obtained
 */
export type ConsentSource = 'explicit' | 'implicit' | 'legal_basis' | 'contractual';

/**
 * Consent status
 */
export type ConsentStatus = 'granted' | 'denied' | 'withdrawn' | 'expired';

/**
 * Channel through which consent was obtained
 */
export type ConsentChannel = 'whatsapp' | 'email' | 'sms' | 'app' | 'web' | 'in_person' | 'api';

/**
 * Individual consent record
 */
export interface Consent {
  // Core identification
  id: string;

  // Tenant context
  tenant_id: string;

  // Who granted consent
  customer_id: string;

  // What consent was given for
  purpose: ConsentPurpose;
  description?: string; // Human-readable description

  // Consent status
  status: ConsentStatus;

  // Validity period
  valid_from?: string;
  expires_at?: string;

  // How consent was obtained
  source: ConsentSource;
  channel: ConsentChannel;

  // For explicit consent
  consent_text?: string; // What the customer agreed to
  consent_version?: string; // Version of consent text

  // Verification
  verification?: ConsentVerification;

  // Audit trail
  ip_address?: string;
  user_agent?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  granted_at?: string;
  denied_at?: string;
  withdrawn_at?: string;
}

/**
 * Consent verification details
 */
export interface ConsentVerification {
  method: 'otp' | 'email_link' | 'sms_link' | 'biometric' | 'manual';
  verified: boolean;
  verified_at?: string;
  verified_by?: string; // For manual verification
}

/**
 * Consent preference for a customer
 */
export interface CustomerConsentPreference {
  customer_id: string;
  tenant_id: string;

  // Current consent status for each purpose
  consents: ConsentSummary[];

  // Global opt-out
  marketing_opt_out: boolean;
  all_communication_opt_out: boolean;

  // Last update
  last_updated: string;
  last_updated_by?: string;
}

/**
 * Summary of consent for a single purpose
 */
export interface ConsentSummary {
  purpose: ConsentPurpose;
  status: ConsentStatus;
  granted_at?: string;
  expires_at?: string;
}

/**
 * Consent request (for creating new consent)
 */
export interface ConsentRequest {
  customer_id: string;
  purpose: ConsentPurpose;
  description?: string;
  consent_text?: string;
  channel: ConsentChannel;
}

/**
 * Consent withdrawal request
 */
export interface ConsentWithdrawal {
  customer_id: string;
  purpose: ConsentPurpose;
  reason?: string;
}

// ============================================
// CONSENT CATEGORY
// ============================================

/**
 * Group related consent purposes
 */
export interface ConsentCategory {
  id: string;
  name: string; // e.g., "Marketing", "Data Processing"
  purposes: ConsentPurpose[];
  is_required: boolean;
  description?: string;
}

/**
 * Predefined consent categories
 */
export const CONSENT_CATEGORIES: ConsentCategory[] = [
  {
    id: 'marketing',
    name: 'Marketing Communication',
    purposes: ['marketing_communication', 'personalized_offers', 'third_party_sharing'],
    is_required: false,
    description: 'Receive promotional messages and personalized offers'
  },
  {
    id: 'communication',
    name: 'General Communication',
    purposes: ['whatsapp_communication', 'email_communication', 'sms_communication'],
    is_required: false,
    description: 'Receive transactional and service messages'
  },
  {
    id: 'data_processing',
    name: 'Data Processing',
    purposes: ['data_processing', 'analytics', 'ai_processing'],
    is_required: true,
    description: 'Process your data for service improvement'
  },
  {
    id: 'health',
    name: 'Health Data (HIPAA)',
    purposes: ['health_data_processing'],
    is_required: true,
    description: 'Process health-related data'
  },
  {
    id: 'finance',
    name: 'Financial Data',
    purposes: ['financial_data_processing'],
    is_required: true,
    description: 'Process financial information'
  },
  {
    id: 'location',
    name: 'Location Tracking',
    purposes: ['location_tracking'],
    is_required: false,
    description: 'Track location for delivery and safety'
  }
];

// ============================================
// ZOD SCHEMAS
// ============================================

/**
 * Consent creation schema
 */
export const ConsentCreateSchema = z.object({
  customer_id: z.string().min(1),
  purpose: z.enum([
    'marketing_communication',
    'personalized_offers',
    'third_party_sharing',
    'data_processing',
    'analytics',
    'ai_processing',
    'whatsapp_communication',
    'email_communication',
    'sms_communication',
    'app_notification',
    'health_data_processing',
    'financial_data_processing',
    'location_tracking',
    'employment_verification',
  ]),
  description: z.string().optional(),
  consent_text: z.string().optional(),
  channel: z.enum(['whatsapp', 'email', 'sms', 'app', 'web', 'in_person', 'api']).default('app'),
  valid_from: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
});

/**
 * Consent update schema
 */
export const ConsentUpdateSchema = z.object({
  status: z.enum(['granted', 'denied', 'withdrawn', 'expired']).optional(),
  expires_at: z.string().datetime().optional(),
  consent_text: z.string().optional(),
  consent_version: z.string().optional(),
});

/**
 * Consent withdrawal schema
 */
export const ConsentWithdrawalSchema = z.object({
  customer_id: z.string().min(1),
  purpose: z.string().min(1),
  reason: z.string().optional(),
});

// ============================================
// PURPOSE LABELS
// ============================================

/**
 * Human-readable labels for consent purposes
 */
export const CONSENT_PURPOSE_LABELS: Record<ConsentPurpose, string> = {
  marketing_communication: 'Marketing Communications',
  personalized_offers: 'Personalized Offers & Recommendations',
  third_party_sharing: 'Sharing with Partner Businesses',
  data_processing: 'General Data Processing',
  analytics: 'Analytics & Insights',
  ai_processing: 'AI-Powered Processing',
  whatsapp_communication: 'WhatsApp Messages',
  email_communication: 'Email Messages',
  sms_communication: 'SMS Messages',
  app_notification: 'App Notifications',
  health_data_processing: 'Health Data Processing',
  financial_data_processing: 'Financial Data Processing',
  location_tracking: 'Location Tracking',
  employment_verification: 'Employment Verification',
};

/**
 * Privacy policy text for each purpose
 */
export const CONSENT_TEXT_TEMPLATES: Record<ConsentPurpose, string> = {
  marketing_communication: 'I agree to receive marketing communications including promotions, offers, and updates from the business via various channels.',
  personalized_offers: 'I agree to receive personalized recommendations and offers based on my preferences and behavior.',
  third_party_sharing: 'I agree that my information may be shared with trusted partner businesses for promotional purposes.',
  data_processing: 'I understand and agree that my data will be processed for service delivery and improvement.',
  analytics: 'I agree that my data may be used for analytics to improve services.',
  ai_processing: 'I agree that AI systems may process my data to provide personalized services.',
  whatsapp_communication: 'I agree to receive messages on WhatsApp.',
  email_communication: 'I agree to receive emails.',
  sms_communication: 'I agree to receive SMS messages.',
  app_notification: 'I agree to receive push notifications through the app.',
  health_data_processing: 'I consent to the processing of my health-related data in accordance with applicable privacy laws.',
  financial_data_processing: 'I consent to the processing of my financial information for service delivery.',
  location_tracking: 'I agree to allow location tracking for delivery and safety purposes.',
  employment_verification: 'I authorize verification of my employment information.',
};

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Grant consent
 */
export function grantConsent(
  tenantId: string,
  data: z.infer<typeof ConsentCreateSchema>
): Consent {
  const now = new Date().toISOString();

  return {
    id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    customer_id: data.customer_id,
    purpose: data.purpose,
    description: data.description,
    status: 'granted',
    valid_from: data.valid_from || now,
    expires_at: data.expires_at,
    source: 'explicit',
    channel: data.channel,
    consent_text: data.consent_text || CONSENT_TEXT_TEMPLATES[data.purpose],
    verification: {
      method: 'otp',
      verified: true,
      verified_at: now,
    },
    granted_at: now,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Deny consent
 */
export function denyConsent(
  tenantId: string,
  data: z.infer<typeof ConsentCreateSchema>
): Consent {
  const now = new Date().toISOString();

  return {
    id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    customer_id: data.customer_id,
    purpose: data.purpose,
    description: data.description,
    status: 'denied',
    source: 'explicit',
    channel: data.channel,
    denied_at: now,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Withdraw consent
 */
export function withdrawConsent(consent: Consent, reason?: string): Consent {
  const now = new Date().toISOString();

  return {
    ...consent,
    status: 'withdrawn',
    withdrawn_at: now,
    updated_at: now,
    metadata: {
      ...consent.metadata as Record<string, unknown>,
      withdrawal_reason: reason,
    },
  };
}

/**
 * Check if consent is valid
 */
export function isConsentValid(consent: Consent): boolean {
  const now = new Date();

  // Check status
  if (consent.status !== 'granted') {
    return false;
  }

  // Check valid_from
  if (consent.valid_from && new Date(consent.valid_from) > now) {
    return false;
  }

  // Check expires_at
  if (consent.expires_at && new Date(consent.expires_at) < now) {
    return false;
  }

  return true;
}

/**
 * Get consent status for a customer
 */
export function getCustomerConsentPreference(
  customerId: string,
  tenantId: string,
  consents: Consent[]
): CustomerConsentPreference {
  const customerConsents = consents.filter(c => c.customer_id === customerId);

  const marketingOptOut = customerConsents.some(
    c => c.purpose === 'marketing_communication' && c.status === 'withdrawn'
  );

  const allOptOut = customerConsents.every(c => c.status === 'withdrawn');

  return {
    customer_id: customerId,
    tenant_id: tenantId,
    consents: customerConsents.map(c => ({
      purpose: c.purpose,
      status: c.status,
      granted_at: c.granted_at,
      expires_at: c.expires_at,
    })),
    marketing_opt_out: marketingOptOut,
    all_communication_opt_out: allOptOut,
    last_updated: new Date().toISOString(),
  };
}

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  Consent,
  ConsentVerification,
  CustomerConsentPreference,
  ConsentSummary,
  ConsentRequest,
  ConsentWithdrawal,
  ConsentCategory,
};

export {
  CONSENT_CATEGORIES,
  CONSENT_PURPOSE_LABELS,
  CONSENT_TEXT_TEMPLATES,
  ConsentCreateSchema,
  ConsentUpdateSchema,
  ConsentWithdrawalSchema,
  grantConsent,
  denyConsent,
  withdrawConsent,
  isConsentValid,
  getCustomerConsentPreference,
};
