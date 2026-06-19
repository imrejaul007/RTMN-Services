/**
 * CorpID Cloud - Identity Timeline
 * Complete activity history across all identity interactions
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const timelineEvents = []; // Append-only
const MAX_EVENTS = 50000;

// ============ CATEGORIES ============

export const TIMELINE_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  TRANSACTION: 'transaction',
  PROFILE: 'profile',
  SECURITY: 'security',
  AI_INTERACTION: 'ai_interaction',
  ORGANIZATION: 'organization',
  SOCIAL: 'social',
  DEVICE: 'device',
  API: 'api'
};

// ============ EVENT TYPES ============

export const EVENT_TYPES = {
  // Authentication
  'auth.login': TIMELINE_CATEGORIES.AUTHENTICATION,
  'auth.logout': TIMELINE_CATEGORIES.AUTHENTICATION,
  'auth.failed': TIMELINE_CATEGORIES.AUTHENTICATION,
  'auth.mfa_enabled': TIMELINE_CATEGORIES.AUTHENTICATION,
  'auth.password_changed': TIMELINE_CATEGORIES.AUTHENTICATION,

  // Profile
  'profile.updated': TIMELINE_CATEGORIES.PROFILE,
  'profile.avatar_changed': TIMELINE_CATEGORIES.PROFILE,
  'profile.preferences_changed': TIMELINE_CATEGORIES.PROFILE,

  // Transactions
  'transaction.order_placed': TIMELINE_CATEGORIES.TRANSACTION,
  'transaction.payment_made': TIMELINE_CATEGORIES.TRANSACTION,

  // Security
  'security.device_added': TIMELINE_CATEGORIES.SECURITY,
  'security.api_key_created': TIMELINE_CATEGORIES.SECURITY,
  'security.suspicious_activity': TIMELINE_CATEGORIES.SECURITY,

  // AI
  'ai.agent_created': TIMELINE_CATEGORIES.AI_INTERACTION,
  'ai.interaction': TIMELINE_CATEGORIES.AI_INTERACTION,
  'ai.memory_stored': TIMELINE_CATEGORIES.AI_INTERACTION,

  // Organization
  'org.joined': TIMELINE_CATEGORIES.ORGANIZATION,
  'org.left': TIMELINE_CATEGORIES.ORGANIZATION,
  'org.role_changed': TIMELINE_CATEGORIES.ORGANIZATION,

  // Device
  'device.registered': TIMELINE_CATEGORIES.DEVICE,
  'device.trusted': TIMELINE_CATEGORIES.DEVICE,
  'device.blocked': TIMELINE_CATEGORIES.DEVICE
};

// ============ MODEL FACTORY ============

/**
 * Record a timeline event
 */
export function recordEvent(data) {
  const event = {
    id: `evt-${uuidv4().slice(0, 12)}`,
    userId: data.userId,
    timestamp: new Date().toISOString(),

    // Classification
    type: data.type,
    category: data.category || EVENT_TYPES[data.type] || 'system',

    // Action details
    title: data.title || data.type,
    description: data.description || '',

    // Actor
    actor: {
      type: data.actor?.type || 'user', // user, agent, system
      id: data.actor?.id || data.userId,
      name: data.actor?.name || null
    },

    // Target/Resource
    target: {
      type: data.target?.type || null,
      id: data.target?.id || null,
      name: data.target?.name || null
    },

    // Context
    context: {
      ip: data.context?.ip || null,
      deviceId: data.context?.deviceId || null,
      userAgent: data.context?.userAgent || null,
      location: data.context?.location || null
    },

    // Content (for AI interactions)
    content: data.content || null,

    // Result
    result: {
      status: data.result?.status || 'success',
      outcome: data.result?.outcome || null,
      metadata: data.result?.metadata || {}
    },

    // Visibility
    visibility: data.visibility || 'user', // user, admin, system
    sensitive: data.sensitive || false,

    // Retention
    retentionDays: data.retentionDays || 365
  };

  timelineEvents.push(event);

  // Trim if exceeds max
  if (timelineEvents.length > MAX_EVENTS) {
    timelineEvents.shift();
  }

  return event;
}

// ============ QUERY FUNCTIONS ============

/**
 * Get timeline for user
 */
export function getUserTimeline(userId, options = {}) {
  let events = timelineEvents.filter(e => e.userId === userId);

  if (options.category) {
    events = events.filter(e => e.category === options.category);
  }
  if (options.type) {
    events = events.filter(e => e.type === options.type);
  }
  if (options.startDate) {
    events = events.filter(e => e.timestamp >= options.startDate);
  }
  if (options.endDate) {
    events = events.filter(e => e.timestamp <= options.endDate);
  }

  // Sort descending
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Apply limit
  if (options.limit) {
    events = events.slice(0, options.limit);
  }

  return events;
}

/**
 * Get event by ID
 */
export function getEventById(eventId) {
  return timelineEvents.find(e => e.id === eventId) || null;
}

/**
 * Get timeline statistics
 */
export function getTimelineStats(userId, options = {}) {
  let events = timelineEvents.filter(e => e.userId === userId);

  if (options.startDate) {
    events = events.filter(e => e.timestamp >= options.startDate);
  }
  if (options.endDate) {
    events = events.filter(e => e.timestamp <= options.endDate);
  }

  const byCategory = {};
  const byType = {};
  const byDate = {};
  const byHour = {};

  for (const event of events) {
    byCategory[event.category] = (byCategory[event.category] || 0) + 1;
    byType[event.type] = (byType[event.type] || 0) + 1;

    const date = event.timestamp.slice(0, 10);
    byDate[date] = (byDate[date] || 0) + 1;

    const hour = event.timestamp.slice(0, 13);
    byHour[hour] = (byHour[hour] || 0) + 1;
  }

  return {
    totalEvents: events.length,
    byCategory,
    byType,
    byDate,
    byHour,
    dateRange: events.length > 0 ? {
      earliest: events[events.length - 1].timestamp,
      latest: events[0].timestamp
    } : null
  };
}

/**
 * Get recent activity
 */
export function getRecentActivity(userId, limit = 10) {
  return getUserTimeline(userId, { limit });
}

/**
 * Search timeline
 */
export function searchTimeline(userId, query, options = {}) {
  let events = timelineEvents.filter(e => e.userId === userId);

  if (query) {
    const lowerQuery = query.toLowerCase();
    events = events.filter(e =>
      e.type.toLowerCase().includes(lowerQuery) ||
      e.title.toLowerCase().includes(lowerQuery) ||
      e.description.toLowerCase().includes(lowerQuery)
    );
  }

  if (options.category) {
    events = events.filter(e => e.category === options.category);
  }

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
