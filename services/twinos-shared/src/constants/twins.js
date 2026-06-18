/**
 * RTMN TwinOS - Twin Constants
 * Defines all twin types, categories, and statuses
 */

// Twin Types
export const TWIN_TYPES = {
  // Core Types
  ENTITY: 'entity',
  EVENT: 'event',
  METRIC: 'metric',
  DOCUMENT: 'document',
  RELATIONSHIP: 'relationship',

  // Domain Types
  CATALOG: 'catalog',
  ORDER: 'order',
  RESOURCE: 'resource',
  WORKFORCE: 'workforce',
  TRANSACTION: 'transaction',
  SERVICE: 'service',

  // Special Types
  PERSON: 'person',
  PLACE: 'place',
  THING: 'thing',
  CONCEPT: 'concept'
};

// Twin Categories
export const TWIN_CATEGORIES = {
  // Foundation
  FOUNDATION: 'foundation',
  IDENTITY: 'identity',
  MEMORY: 'memory',
  AI: 'ai',

  // Business
  COMMERCE: 'commerce',
  FINANCE: 'finance',
  HR: 'hr',
  MARKETING: 'marketing',
  OPERATIONS: 'operations',

  // Industry
  HEALTHCARE: 'healthcare',
  HOSPITALITY: 'hospitality',
  MANUFACTURING: 'manufacturing',
  REAL_ESTATE: 'real_estate',
  RETAIL: 'retail',

  // Personal
  PERSONAL: 'personal',
  SOCIAL: 'social'
};

// Twin Status
export const TWIN_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  DRAFT: 'draft',
  PENDING: 'pending',
  SYNCING: 'syncing'
};

// Health Status
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical',
  UNKNOWN: 'unknown',
  DEGRADED: 'degraded'
};

// Sync Status
export const SYNC_STATUS = {
  IN_SYNC: 'in_sync',
  PENDING: 'pending',
  FAILED: 'failed',
  CONFLICT: 'conflict'
};

// Twin Relationships
export const TWIN_RELATIONSHIPS = {
  // Hierarchy
  PARENT: 'parent',
  CHILD: 'child',
  SIBLING: 'sibling',

  // Ownership
  OWNS: 'owns',
  OWNED_BY: 'owned_by',

  // Associations
  ASSOCIATED_WITH: 'associated_with',
  RELATED_TO: 'related_to',

  // Dependencies
  DEPENDS_ON: 'depends_on',
  REQUIRED_BY: 'required_by',

  // Transactions
  PART_OF: 'part_of',
  CONTAINS: 'contains',

  // Communication
  COMMUNICATES_WITH: 'communicates_with',
  FOLLOWS: 'follows',
  FOLLOWED_BY: 'followed_by'
};

// Standard Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// Standard Sort Options
const SORT_OPTIONS_VALUES = {
  ASC: 'asc',
  DESC: 'desc'
};

export const SORT_OPTIONS = {
  ASC: SORT_OPTIONS_VALUES.ASC,
  DESC: SORT_OPTIONS_VALUES.DESC,
  DEFAULT: SORT_OPTIONS_VALUES.DESC
};

// Audit Actions
export const AUDIT_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  SYNC: 'sync',
  EXPORT: 'export',
  IMPORT: 'import'
};

// Event Types for Twin Events
export const TWIN_EVENTS = {
  CREATED: 'twin.created',
  UPDATED: 'twin.updated',
  DELETED: 'twin.deleted',
  SYNCED: 'twin.synced',
  STATE_CHANGED: 'twin.state_changed',
  HEALTH_CHANGED: 'twin.health_changed',
  RELATIONSHIP_ADDED: 'twin.relationship_added',
  RELATIONSHIP_REMOVED: 'twin.relationship_removed'
};

export default {
  TWIN_TYPES,
  TWIN_CATEGORIES,
  TWIN_STATUS,
  HEALTH_STATUS,
  SYNC_STATUS,
  TWIN_RELATIONSHIPS,
  PAGINATION,
  SORT_OPTIONS,
  AUDIT_ACTIONS,
  TWIN_EVENTS
};
