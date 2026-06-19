/**
 * CorpID Cloud - Consumer Identity Model
 * Extended user profile for consumers (REZ, Genie users)
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const consumers = new Map(); // consumerId -> Consumer
export const consumerWallets = new Map(); // consumerId -> Wallet
export const consumerSubscriptions = new Map(); // consumerId -> [Subscription]
export const consumerDevices = new Map(); // consumerId -> [Device]
export const consumerActivity = []; // Activity timeline

// ============ MODEL FACTORY ============

/**
 * Create a consumer profile
 */
export function createConsumer(data) {
  const now = new Date().toISOString();
  const consumerId = `cons-${uuidv4().slice(0, 12)}`;

  const consumer = {
    id: consumerId,
    userId: data.userId, // Link to CorpID user

    // Basic profile
    displayName: data.displayName || data.name || 'Consumer',
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    avatar: data.avatar || null,
    bio: data.bio || null,
    dateOfBirth: data.dateOfBirth || null,
    gender: data.gender || null,

    // Contact
    email: data.email,
    emailVerified: data.emailVerified || false,
    phone: data.phone || null,
    phoneVerified: data.phoneVerified || false,
    alternateEmails: data.alternateEmails || [],
    alternatePhones: data.alternatePhones || [],

    // Location
    country: data.country || null,
    state: data.state || null,
    city: data.city || null,
    postalCode: data.postalCode || null,
    timezone: data.timezone || 'UTC',
    coordinates: data.coordinates || null,

    // Preferences
    preferences: {
      language: data.preferences?.language || 'en',
      currency: data.preferences?.currency || 'INR',
      dateFormat: data.preferences?.dateFormat || 'DD/MM/YYYY',
      theme: data.preferences?.theme || 'system',

      notifications: {
        email: data.preferences?.notifications?.email ?? true,
        sms: data.preferences?.notifications?.sms ?? true,
        push: data.preferences?.notifications?.push ?? true,
        whatsapp: data.preferences?.notifications?.whatsapp ?? false,
        inApp: data.preferences?.notifications?.inApp ?? true
      },

      privacy: {
        dataSharing: data.preferences?.privacy?.dataSharing ?? false,
        marketingConsent: data.preferences?.privacy?.marketingConsent ?? false,
        analyticsConsent: data.preferences?.privacy?.analyticsConsent ?? true,
        aiConsent: data.preferences?.privacy?.aiConsent ?? false,
        thirdPartyConsent: data.preferences?.privacy?.thirdPartyConsent ?? false
      },

      communication: {
        channel: data.preferences?.communication?.channel || 'email',
        frequency: data.preferences?.communication?.frequency || 'normal',
        quietHours: data.preferences?.communication?.quietHours || null
      }
    },

    // Connected Accounts
    connectedAccounts: data.connectedAccounts || [],

    // Platform Profiles
    rezProfile: data.rezProfile ? {
      customerId: data.rezProfile.customerId || `rez-${uuidv4().slice(0, 8)}`,
      tier: data.rezProfile.tier || 'bronze', // bronze, silver, gold, platinum
      points: data.rezProfile.points || 0,
      lifetimeValue: data.rezProfile.lifetimeValue || 0,
      joinedAt: data.rezProfile.joinedAt || now,
      referralCode: data.rezProfile.referralCode || generateReferralCode(),
      referredBy: data.rezProfile.referredBy || null
    } : null,

    genieProfile: data.genieProfile ? {
      voiceEnabled: data.genieProfile.voiceEnabled ?? false,
      wakeWord: data.genieProfile.wakeWord || 'Hey Genie',
      listeningMode: data.genieProfile.listeningMode || 'manual', // manual, continuous, passive, smart
      accent: data.genieProfile.accent || 'en-IN',
      language: data.genieProfile.language || 'en',
      voiceId: data.genieProfile.voiceId || null,
      personalitiesEnabled: data.genieProfile.personalitiesEnabled || []
    } : null,

    // Wallet link
    walletId: data.walletId || null,

    // Activity
    firstActivityAt: now,
    lastActivityAt: now,
    activityCount: 0,

    // Stats
    stats: {
      totalOrders: 0,
      totalSpent: 0,
      totalSaved: 0,
      favoriteCategories: [],
      averageRating: 0
    },

    // Segments
    segments: data.segments || [],

    // Status
    status: 'active', // active, inactive, suspended, churned
    suspendedAt: null,
    suspendedReason: null,
    churnedAt: null,
    churnReason: null,

    // Privacy & Compliance
    dataRetentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    exportRequestedAt: null,
    deletionRequestedAt: null,
    gdprCompliant: true,

    // Tags & Metadata
    tags: data.tags || [],
    metadata: data.metadata || {},

    // Timestamps
    createdAt: now,
    updatedAt: now
  };

  consumers.set(consumerId, consumer);

  // Create wallet if requested
  if (data.createWallet) {
    createConsumerWallet(consumerId, {
      currency: consumer.preferences.currency
    });
  }

  return consumer;
}

/**
 * Create consumer wallet
 */
export function createConsumerWallet(consumerId, data) {
  const wallet = {
    id: `wallet-${uuidv4().slice(0, 12)}`,
    consumerId,
    balance: 0,
    currency: data?.currency || 'INR',
    points: 0,
    tier: 'bronze',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  consumerWallets.set(consumerId, wallet);
  return wallet;
}

/**
 * Create consumer subscription
 */
export function createSubscription(data) {
  const subscription = {
    id: `sub-${uuidv4().slice(0, 12)}`,
    consumerId: data.consumerId,
    service: data.service,
    plan: data.plan || 'basic',
    status: 'active', // active, cancelled, expired, paused
    startDate: data.startDate || new Date().toISOString(),
    endDate: data.endDate || null,
    renewalDate: data.renewalDate || null,
    price: data.price || 0,
    currency: data.currency || 'INR',
    autoRenew: data.autoRenew ?? true,
    paymentMethod: data.paymentMethod || null,
    metadata: data.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existing = consumerSubscriptions.get(data.consumerId) || [];
  existing.push(subscription);
  consumerSubscriptions.set(data.consumerId, existing);

  return subscription;
}

// ============ QUERY HELPERS ============

export function getConsumerById(id) {
  return consumers.get(id) || null;
}

export function getConsumerByUserId(userId) {
  for (const consumer of consumers.values()) {
    if (consumer.userId === userId) return consumer;
  }
  return null;
}

export function getConsumerByEmail(email) {
  for (const consumer of consumers.values()) {
    if (consumer.email === email.toLowerCase()) return consumer;
  }
  return null;
}

export function getConsumerWallet(consumerId) {
  return consumerWallets.get(consumerId) || null;
}

export function getConsumerSubscriptions(consumerId) {
  return consumerSubscriptions.get(consumerId) || [];
}

/**
 * Update consumer
 */
export function updateConsumer(id, data) {
  const consumer = consumers.get(id);
  if (!consumer) return null;

  const allowedFields = [
    'displayName', 'firstName', 'lastName', 'avatar', 'bio',
    'dateOfBirth', 'gender', 'phone', 'alternateEmails', 'alternatePhones',
    'country', 'state', 'city', 'postalCode', 'timezone', 'coordinates',
    'preferences', 'segments', 'tags', 'metadata', 'status'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      consumer[field] = data[field];
    }
  }

  consumer.updatedAt = new Date().toISOString();
  consumers.set(id, consumer);
  return consumer;
}

/**
 * Update consumer preferences
 */
export function updatePreferences(consumerId, preferences) {
  const consumer = consumers.get(consumerId);
  if (!consumer) return null;

  consumer.preferences = {
    ...consumer.preferences,
    ...preferences,
    notifications: { ...consumer.preferences.notifications, ...(preferences.notifications || {}) },
    privacy: { ...consumer.preferences.privacy, ...(preferences.privacy || {}) },
    communication: { ...consumer.preferences.communication, ...(preferences.communication || {}) }
  };

  consumer.updatedAt = new Date().toISOString();
  consumers.set(consumerId, consumer);
  return consumer;
}

/**
 * Connect external account
 */
export function connectAccount(consumerId, provider, providerId, permissions = []) {
  const consumer = consumers.get(consumerId);
  if (!consumer) return null;

  // Check if already connected
  const existing = consumer.connectedAccounts.find(a => a.provider === provider);
  if (existing) {
    existing.providerId = providerId;
    existing.permissions = permissions;
    existing.updatedAt = new Date().toISOString();
  } else {
    consumer.connectedAccounts.push({
      provider,
      providerId,
      permissions,
      linkedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  consumer.updatedAt = new Date().toISOString();
  consumers.set(consumerId, consumer);
  return consumer;
}

/**
 * Disconnect account
 */
export function disconnectAccount(consumerId, provider) {
  const consumer = consumers.get(consumerId);
  if (!consumer) return null;

  consumer.connectedAccounts = consumer.connectedAccounts.filter(a => a.provider !== provider);
  consumer.updatedAt = new Date().toISOString();
  consumers.set(consumerId, consumer);
  return consumer;
}

/**
 * Record activity
 */
export function recordActivity(consumerId, activity) {
  const entry = {
    id: uuidv4(),
    consumerId,
    type: activity.type,
    action: activity.action,
    metadata: activity.metadata || {},
    timestamp: new Date().toISOString()
  };

  consumerActivity.push(entry);

  // Update consumer stats
  const consumer = consumers.get(consumerId);
  if (consumer) {
    consumer.lastActivityAt = entry.timestamp;
    consumer.activityCount = (consumer.activityCount || 0) + 1;
    consumers.set(consumerId, consumer);
  }

  return entry;
}

/**
 * Request data export (GDPR)
 */
export function requestDataExport(consumerId) {
  const consumer = consumers.get(consumerId);
  if (!consumer) return null;

  consumer.exportRequestedAt = new Date().toISOString();
  consumers.set(consumerId, consumer);

  return {
    exportRequestedAt: consumer.exportRequestedAt,
    message: 'Data export will be available within 30 days'
  };
}

/**
 * Request account deletion (GDPR)
 */
export function requestDeletion(consumerId) {
  const consumer = consumers.get(consumerId);
  if (!consumer) return null;

  consumer.deletionRequestedAt = new Date().toISOString();
  // Schedule deletion for 30 days from now (cooling-off period)
  consumer.status = 'pending_deletion';
  consumers.set(consumerId, consumer);

  return {
    deletionRequestedAt: consumer.deletionRequestedAt,
    scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    message: 'Account will be permanently deleted in 30 days'
  };
}

// ============ HELPERS ============

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
