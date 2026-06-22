/**
 * CorpID Cloud - Consent Platform Model
 * GDPR/DPDP compliant consent management
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const consentRecords = new Map(); // userId -> ConsentSettings
export const consentHistory = []; // Audit trail of all consent changes
export const cookieConsents = new Map(); // visitorId -> CookieConsent
export const dataRequests = new Map(); // requestId -> DataRequest

// ============ CONSENT TYPES ============

export const CONSENT_TYPES = {
  PRIVACY: 'privacy',
  MARKETING: 'marketing',
  COOKIES: 'cookies',
  DATA_PROCESSING: 'data_processing',
  AI_USAGE: 'ai_usage',
  LOCATION: 'location',
  BIOMETRIC: 'biometric',
  THIRD_PARTY_SHARING: 'third_party_sharing',
  PROFILING: 'profiling',
  AUTOMATED_DECISIONS: 'automated_decisions'
};

// ============ LEGAL BASIS ============

export const LEGAL_BASIS = {
  CONSENT: 'consent',
  CONTRACT: 'contract',
  LEGAL_OBLIGATION: 'legal_obligation',
  LEGITIMATE_INTEREST: 'legitimate_interest',
  VITAL_INTEREST: 'vital_interest',
  PUBLIC_TASK: 'public_task'
};

// ============ DEFAULT CONSENT ============

const DEFAULT_CONSENT = {
  // Data Processing
  dataProcessing: {
    analytics: true,
    profiling: false,
    automatedDecisions: false
  },

  // Marketing
  marketing: {
    email: false,
    sms: false,
    push: true,
    whatsapp: false,
    inApp: true,
    thirdParty: false
  },

  // Cookies
  cookies: {
    necessary: true, // Always required
    functional: true,
    analytics: false,
    advertising: false,
    socialMedia: false
  },

  // AI
  aiUsage: {
    personalization: true,
    behaviorLearning: false,
    voiceRecording: false,
    imageRecognition: false
  },

  // Location
  location: {
    precise: false,
    approximate: true,
    background: false
  },

  // Biometric
  biometric: {
    faceId: false,
    fingerprint: false,
    voiceId: false,
    iris: false
  },

  // Third Party
  thirdPartySharing: {
    partners: false,
    advertisers: false,
    analytics: false
  }
};

// ============ MODEL FACTORY ============

/**
 * Get or create consent record
 */
export function getOrCreateConsent(userId) {
  let consent = consentRecords.get(userId);

  if (!consent) {
    consent = {
      id: `consent-${uuidv4().slice(0, 12)}`,
      userId,
      // SECURITY FIX (CORPID L-3): use structuredClone() instead of
      // JSON.parse(JSON.stringify(...)). structuredClone preserves Date, Map,
      // and undefined values; is faster; and is built into Node 17+.
      consents: structuredClone(DEFAULT_CONSENT),

      // Legal info
      policyVersion: '1.0.0',
      policyAcceptedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),

      // Data subject rights
      rightsExercised: [],

      // Privacy
      dataRetention: {
        until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        customDays: 365
      },

      // Compliance
      gdprCompliant: true,
      dpdpCompliant: true,
      ccpaCompliant: true,

      createdAt: new Date().toISOString()
    };

    consentRecords.set(userId, consent);
  }

  return consent;
}

/**
 * Update consent
 */
export function updateConsent(userId, category, permissions) {
  const consent = getOrCreateConsent(userId);

  if (!consent.consents[category]) {
    consent.consents[category] = {};
  }

  consent.consents[category] = { ...consent.consents[category], ...permissions };
  consent.lastUpdated = new Date().toISOString();

  // Log the change
  consentHistory.push({
    id: uuidv4(),
    userId,
    type: 'consent_updated',
    category,
    permissions,
    timestamp: consent.lastUpdated
  });

  consentRecords.set(userId, consent);
  return consent;
}

/**
 * Grant consent
 */
export function grantConsent(userId, type, purpose, legalBasis = LEGAL_BASIS.CONSENT) {
  const consent = getOrCreateConsent(userId);

  const record = {
    id: uuidv4(),
    userId,
    type,
    purpose,
    legalBasis,
    granted: true,
    grantedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    withdrawable: true
  };

  consentHistory.push(record);
  consentRecords.set(userId, consent);

  return record;
}

/**
 * Withdraw consent
 */
export function withdrawConsent(userId, type) {
  const consent = getOrCreateConsent(userId);

  const record = {
    id: uuidv4(),
    userId,
    type,
    granted: false,
    withdrawnAt: new Date().toISOString()
  };

  consentHistory.push(record);
  consentRecords.set(userId, consent);

  return record;
}

/**
 * Get consent history
 */
export function getConsentHistory(userId, options = {}) {
  let history = consentHistory.filter(h => h.userId === userId);

  if (options.type) {
    history = history.filter(h => h.type === options.type);
  }

  return history.sort((a, b) => {
    const aTime = a.timestamp || a.grantedAt || a.withdrawnAt;
    const bTime = b.timestamp || b.grantedAt || b.withdrawnAt;
    return bTime.localeCompare(aTime);
  });
}

/**
 * Accept cookie consent
 */
export function setCookieConsent(visitorId, consent) {
  const record = {
    id: `cookie-${uuidv4().slice(0, 8)}`,
    visitorId,
    consent: {
      necessary: true, // Always required
      functional: consent.functional || false,
      analytics: consent.analytics || false,
      advertising: consent.advertising || false,
      socialMedia: consent.socialMedia || false
    },
    ip: consent.ip || null,
    userAgent: consent.userAgent || null,
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  };

  cookieConsents.set(visitorId, record);
  return record;
}

/**
 * Get cookie consent
 */
export function getCookieConsent(visitorId) {
  return cookieConsents.get(visitorId) || null;
}

/**
 * Request data export
 */
export function createDataExportRequest(userId) {
  const requestId = `export-${uuidv4().slice(0, 12)}`;

  const request = {
    id: requestId,
    userId,
    type: 'data_export',
    status: 'pending',
    requestedAt: new Date().toISOString(),
    completedAt: null,
    downloadUrl: null,
    expiresAt: null
  };

  dataRequests.set(requestId, request);

  // Log consent action
  consentHistory.push({
    id: uuidv4(),
    userId,
    type: 'data_export_requested',
    requestId,
    timestamp: request.requestedAt
  });

  return request;
}

/**
 * Request data deletion
 */
export function createDataDeletionRequest(userId) {
  const requestId = `deletion-${uuidv4().slice(0, 12)}`;

  const request = {
    id: requestId,
    userId,
    type: 'data_deletion',
    status: 'pending',
    requestedAt: new Date().toISOString(),
    scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days cooling off
    completedAt: null
  };

  dataRequests.set(requestId, request);

  consentHistory.push({
    id: uuidv4(),
    userId,
    type: 'data_deletion_requested',
    requestId,
    timestamp: request.requestedAt
  });

  return request;
}

/**
 * Request data portability
 */
export function createDataPortabilityRequest(userId, format = 'json') {
  const requestId = `portability-${uuidv4().slice(0, 12)}`;

  const request = {
    id: requestId,
    userId,
    type: 'data_portability',
    format,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    completedAt: null
  };

  dataRequests.set(requestId, request);
  return request;
}

/**
 * Exercise right to rectification
 */
export function createRectificationRequest(userId, corrections) {
  const requestId = `rectify-${uuidv4().slice(0, 12)}`;

  const request = {
    id: requestId,
    userId,
    type: 'rectification',
    corrections,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  dataRequests.set(requestId, request);

  const consent = getOrCreateConsent(userId);
  consent.rightsExercised.push({
    type: 'rectification',
    requestId,
    requestedAt: request.requestedAt
  });
  consentRecords.set(userId, consent);

  return request;
}

/**
 * Get data requests
 */
export function getDataRequests(userId) {
  return Array.from(dataRequests.values())
    .filter(r => r.userId === userId)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

/**
 * Accept privacy policy
 */
export function acceptPolicy(userId, version) {
  const consent = getOrCreateConsent(userId);
  consent.policyVersion = version;
  consent.policyAcceptedAt = new Date().toISOString();
  consent.lastUpdated = consent.policyAcceptedAt;
  consentRecords.set(userId, consent);

  consentHistory.push({
    id: uuidv4(),
    userId,
    type: 'policy_accepted',
    version,
    timestamp: consent.policyAcceptedAt
  });

  return consent;
}

/**
 * Get consent statistics
 */
export function getConsentStats() {
  const allConsents = Array.from(consentRecords.values());

  const byCategory = {};
  for (const consent of allConsents) {
    for (const category of Object.keys(consent.consents || {})) {
      byCategory[category] = (byCategory[category] || 0) + 1;
    }
  }

  return {
    totalUsers: allConsents.length,
    byCategory,
    totalConsentEvents: consentHistory.length,
    dataRequests: dataRequests.size,
    cookieConsents: cookieConsents.size
  };
}
