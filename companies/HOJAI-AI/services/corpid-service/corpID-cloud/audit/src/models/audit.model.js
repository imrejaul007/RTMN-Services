/**
 * CorpID Cloud - Audit Model
 * Immutable audit logging system
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const auditEvents = []; // Append-only
export const auditExports = new Map();

// ============ MAXIMUM STORED EVENTS ============

const MAX_EVENTS = 100000;

// ============ MODEL FACTORY ============

/**
 * Create an audit event (immutable)
 */
export function createAuditEvent(data) {
  const event = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),

    // Actor
    actor: {
      type: data.actor?.type || 'system', // user, api-key, oauth-client, system, anonymous
      id: data.actor?.id || null,
      email: data.actor?.email || null,
      organizationId: data.actor?.organizationId || null,
      role: data.actor?.role || null,
      ip: data.actor?.ip || null,
      userAgent: data.actor?.userAgent || null,
      sessionId: data.actor?.sessionId || null,
      deviceId: data.actor?.deviceId || null
    },

    // Action
    action: data.action,
    category: data.category || 'system',

    // Resource
    resource: {
      type: data.resource?.type || null,
      id: data.resource?.id || null,
      name: data.resource?.name || null
    },

    // Result
    result: data.result || 'success', // success, failure, denied
    reason: data.reason || null,

    // Changes
    changes: data.changes || null,

    // Request
    request: {
      method: data.request?.method || null,
      path: data.request?.path || null,
      requestId: data.request?.requestId || null
    },

    // Metadata
    metadata: data.metadata || {},

    // Retention
    retentionDays: data.retentionDays || 90,
    expiresAt: new Date(Date.now() + (data.retentionDays || 90) * 24 * 60 * 60 * 1000).toISOString()
  };

  auditEvents.push(event);

  // Trim if exceeds max
  if (auditEvents.length > MAX_EVENTS) {
    auditEvents.shift();
  }

  return event;
}

// ============ QUERY FUNCTIONS ============

/**
 * Query audit events
 */
export function queryAuditEvents(filters = {}) {
  let results = [...auditEvents];

  // Filter by actor
  if (filters.actorId) {
    results = results.filter(e => e.actor.id === filters.actorId);
  }
  if (filters.actorEmail) {
    results = results.filter(e => e.actor.email === filters.actorEmail);
  }
  if (filters.organizationId) {
    results = results.filter(e => e.actor.organizationId === filters.organizationId);
  }

  // Filter by action
  if (filters.action) {
    results = results.filter(e => e.action === filters.action);
  }
  if (filters.category) {
    results = results.filter(e => e.category === filters.category);
  }
  if (filters.actions) {
    results = results.filter(e => filters.actions.includes(e.action));
  }

  // Filter by resource
  if (filters.resourceType) {
    results = results.filter(e => e.resource.type === filters.resourceType);
  }
  if (filters.resourceId) {
    results = results.filter(e => e.resource.id === filters.resourceId);
  }

  // Filter by result
  if (filters.result) {
    results = results.filter(e => e.result === filters.result);
  }

  // Filter by date range
  if (filters.startDate) {
    results = results.filter(e => e.timestamp >= filters.startDate);
  }
  if (filters.endDate) {
    results = results.filter(e => e.timestamp <= filters.endDate);
  }

  // Sort by timestamp descending
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return results;
}

/**
 * Get audit event by ID
 */
export function getAuditEventById(id) {
  return auditEvents.find(e => e.id === id) || null;
}

/**
 * Get events for a specific user
 */
export function getUserAuditTrail(userId, options = {}) {
  return queryAuditEvents({
    actorId: userId,
    ...options
  });
}

/**
 * Get events for a specific resource
 */
export function getResourceAuditTrail(resourceType, resourceId, options = {}) {
  return queryAuditEvents({
    resourceType,
    resourceId,
    ...options
  });
}

// ============ STATISTICS ============

/**
 * Get audit statistics
 */
export function getAuditStats(filters = {}) {
  const events = queryAuditEvents(filters);

  const byCategory = {};
  const byResult = {};
  const byAction = {};
  const byHour = {};

  for (const event of events) {
    byCategory[event.category] = (byCategory[event.category] || 0) + 1;
    byResult[event.result] = (byResult[event.result] || 0) + 1;
    byAction[event.action] = (byAction[event.action] || 0) + 1;

    const hour = event.timestamp.slice(0, 13);
    byHour[hour] = (byHour[hour] || 0) + 1;
  }

  return {
    totalEvents: events.length,
    byCategory,
    byResult,
    byAction,
    byHour,
    dateRange: events.length > 0 ? {
      earliest: events[events.length - 1].timestamp,
      latest: events[0].timestamp
    } : null
  };
}

// ============ EXPORTS ============

/**
 * Create an audit export
 */
export function createAuditExport(data) {
  const exportRecord = {
    id: `export-${uuidv4().slice(0, 12)}`,
    requestedBy: data.requestedBy,

    // Filter criteria
    filters: data.filters || {},

    // Format
    format: data.format || 'json', // json, csv

    // Status
    status: 'pending', // pending, processing, completed, failed

    // Result
    eventCount: 0,
    fileSize: 0,
    downloadUrl: null,
    expiresAt: null,

    // Timestamps
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  auditExports.set(exportRecord.id, exportRecord);

  // In production, this would be async
  // For now, process immediately
  const events = queryAuditEvents(data.filters || {});

  exportRecord.eventCount = events.length;
  exportRecord.status = 'completed';
  exportRecord.completedAt = new Date().toISOString();
  exportRecord.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  auditExports.set(exportRecord.id, exportRecord);

  return { export: exportRecord, events };
}

/**
 * Get export by ID
 */
export function getExportById(id) {
  return auditExports.get(id) || null;
}

// ============ CLEANUP ============

/**
 * Clean up expired events
 */
export function cleanupExpiredEvents() {
  const now = new Date().toISOString();
  const before = auditEvents.length;

  // Note: in JS we can't truly remove from array while filtering
  // This is a simplified cleanup for the in-memory implementation
  // In production with a database, this would be a proper DELETE query
  for (let i = auditEvents.length - 1; i >= 0; i--) {
    if (auditEvents[i].expiresAt < now) {
      auditEvents.splice(i, 1);
    }
  }

  return {
    removed: before - auditEvents.length,
    remaining: auditEvents.length
  };
}

// Run cleanup every hour
setInterval(cleanupExpiredEvents, 60 * 60 * 1000);
