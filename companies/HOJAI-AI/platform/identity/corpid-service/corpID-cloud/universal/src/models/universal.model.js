/**
 * CorpID Cloud - Universal Profile Model
 * Single profile view aggregated across all platforms
 */

import { v4 as uuidv4 } from 'uuid';
import { getConsumerByUserId } from '../../../consumer/src/models/consumer.model.js';

// ============ IN-MEMORY STORES ============

export const universalProfiles = new Map();
export const profileBadges = new Map();

// ============ DEFAULT BADGES ============

export const BADGES = {
  verified: { name: 'Verified', icon: '✓', color: '#22c55e' },
  premium: { name: 'Premium', icon: '★', color: '#f59e0b' },
  trusted: { name: 'Trusted', icon: '🛡️', color: '#3b82f6' },
  top_rated: { name: 'Top Rated', icon: '⭐', color: '#eab308' },
  early_adopter: { name: 'Early Adopter', icon: '🌟', color: '#8b5cf6' },
  founder: { name: 'Founder', icon: '👑', color: '#dc2626' },
  contributor: { name: 'Contributor', icon: '💎', color: '#06b6d4' },
  vip: { name: 'VIP', icon: '💫', color: '#ec4899' }
};

// ============ MODEL FACTORY ============

/**
 * Build universal profile from various sources
 */
export function buildUniversalProfile(userId, userData = {}) {
  // Get consumer profile
  const consumer = getConsumerByUserId(userId);

  const now = new Date().toISOString();
  const profileId = `uprof-${uuidv4().slice(0, 12)}`;

  // Aggregate from all sources
  const profile = {
    id: profileId,
    userId,
    version: 1,

    // Core Identity
    identity: {
      displayName: consumer?.displayName || userData.name || 'User',
      firstName: consumer?.firstName || null,
      lastName: consumer?.lastName || null,
      avatar: consumer?.avatar || null,
      bio: consumer?.bio || null,
      pronouns: userData.pronouns || null
    },

    // Contact
    contact: {
      primaryEmail: userData.email || consumer?.email,
      emailVerified: consumer?.emailVerified || false,
      phones: consumer?.phone ? [consumer.phone] : [],
      websites: userData.websites || [],
      socials: userData.socials || {}
    },

    // Location
    location: {
      current: {
        country: consumer?.country || null,
        state: consumer?.state || null,
        city: consumer?.city || null,
        timezone: consumer?.timezone || 'UTC'
      },
      home: null,
      previous: []
    },

    // Aggregated Platform Profiles
    platformProfiles: {
      rez: consumer?.rezProfile ? {
        customerId: consumer.rezProfile.customerId,
        tier: consumer.rezProfile.tier,
        points: consumer.rezProfile.points,
        lifetimeValue: consumer.rezProfile.lifetimeValue,
        joinedAt: consumer.rezProfile.joinedAt,
        referralCode: consumer.rezProfile.referralCode
      } : null,

      genie: consumer?.genieProfile ? {
        voiceEnabled: consumer.genieProfile.voiceEnabled,
        wakeWord: consumer.genieProfile.wakeWord,
        listeningMode: consumer.genieProfile.listeningMode,
        language: consumer.genieProfile.language
      } : null,

      corperks: null,    // Would integrate with CorpPerks
      adbazaar: null,    // Would integrate with AdBazaar
      bizora: null       // Would integrate with Bizora
      // Note: RisaCare is an external client (not an internal platform). External
      // client integrations are handled by their own corpid wrappers + the
      // healthcare-vertical-intelligence service (HOJAI port 4160).
    },

    // Aggregated Stats
    aggregatedStats: {
      totalOrders: consumer?.stats?.totalOrders || 0,
      totalSpent: consumer?.stats?.totalSpent || 0,
      totalSaved: consumer?.stats?.totalSaved || 0,
      favoriteCategories: consumer?.stats?.favoriteCategories || [],
      lifetimeValue: 0,
      loyaltyPoints: consumer?.rezProfile?.points || 0,
      reputation: 0,
      engagement: 'active'
    },

    // Preferences (aggregated)
    preferences: consumer?.preferences || {
      language: 'en',
      currency: 'INR',
      notifications: {},
      privacy: {}
    },

    // Badges & Achievements
    badges: [],

    // Privacy
    privacy: {
      profileVisibility: 'public', // public, connections, private
      showEmail: false,
      showPhone: false,
      showActivity: true,
      showStats: true,
      allowMessages: true,
      allowConnectionRequests: true
    },

    // Connections
    connections: {
      followers: 0,
      following: 0,
      mutualConnections: 0
    },

    // Status
    status: 'active',
    lastAggregatedAt: now,

    // Metadata
    metadata: {},

    // Timestamps
    createdAt: now,
    updatedAt: now
  };

  // Calculate lifetime value from various sources
  profile.aggregatedStats.lifetimeValue = calculateLifetimeValue(profile);

  universalProfiles.set(userId, profile);
  return profile;
}

/**
 * Calculate lifetime value
 */
function calculateLifetimeValue(profile) {
  let ltv = 0;
  if (profile.platformProfiles.rez) {
    ltv += profile.platformProfiles.rez.lifetimeValue || 0;
  }
  return ltv;
}

/**
 * Get universal profile
 */
export function getUniversalProfile(userId) {
  let profile = universalProfiles.get(userId);

  if (!profile) {
    profile = buildUniversalProfile(userId);
  } else {
    // Refresh aggregated data
    profile = refreshProfile(profile);
  }

  return profile;
}

/**
 * Refresh profile from sources
 */
export function refreshProfile(profile) {
  const consumer = getConsumerByUserId(profile.userId);

  if (consumer) {
    profile.identity.displayName = consumer.displayName || profile.identity.displayName;
    profile.identity.avatar = consumer.avatar || profile.identity.avatar;
    profile.location.current.country = consumer.country;
    profile.location.current.city = consumer.city;
    profile.platformProfiles.rez = consumer.rezProfile ? {
      customerId: consumer.rezProfile.customerId,
      tier: consumer.rezProfile.tier,
      points: consumer.rezProfile.points,
      lifetimeValue: consumer.rezProfile.lifetimeValue,
      joinedAt: consumer.rezProfile.joinedAt,
      referralCode: consumer.rezProfile.referralCode
    } : null;
    profile.platformProfiles.genie = consumer.genieProfile ? {
      voiceEnabled: consumer.genieProfile.voiceEnabled,
      wakeWord: consumer.genieProfile.wakeWord,
      listeningMode: consumer.genieProfile.listeningMode,
      language: consumer.genieProfile.language
    } : null;
    profile.preferences = consumer.preferences;
    profile.aggregatedStats.loyaltyPoints = consumer.rezProfile?.points || 0;
  }

  profile.aggregatedStats.lifetimeValue = calculateLifetimeValue(profile);
  profile.lastAggregatedAt = new Date().toISOString();
  profile.updatedAt = new Date().toISOString();

  universalProfiles.set(profile.userId, profile);
  return profile;
}

/**
 * Update privacy settings
 */
export function updatePrivacy(userId, privacy) {
  let profile = universalProfiles.get(userId) || buildUniversalProfile(userId);

  profile.privacy = { ...profile.privacy, ...privacy };
  profile.updatedAt = new Date().toISOString();
  universalProfiles.set(userId, profile);

  return profile;
}

/**
 * Add badge
 */
export function addBadge(userId, badgeType) {
  const badge = BADGES[badgeType];
  if (!badge) return null;

  let profile = universalProfiles.get(userId) || buildUniversalProfile(userId);

  if (!profile.badges.find(b => b.type === badgeType)) {
    profile.badges.push({
      type: badgeType,
      ...badge,
      issuedAt: new Date().toISOString()
    });
    profile.updatedAt = new Date().toISOString();
    universalProfiles.set(userId, profile);
  }

  return profile;
}

/**
 * Update connection count
 */
export function updateConnectionCount(userId, type, count) {
  let profile = universalProfiles.get(userId) || buildUniversalProfile(userId);
  profile.connections[type] = count;
  universalProfiles.set(userId, profile);
  return profile;
}
