/**
 * CorpID Cloud - API Identity Model
 * API keys, OAuth clients, webhooks, and scopes
 */

import { v4 as uuidv4 } from 'uuid';
import {
  generateAPIKey,
  generateAPISecret,
  hashAPIKey,
  generateToken
} from '../../../shared/utils/security.js';

// ============ IN-MEMORY STORES ============

export const apiKeys = new Map();
export const oauthClients = new Map();
export const webhooks = new Map();
export const scopes = new Map();
export const webhookDeliveries = new Map();
export const apiKeyUsage = new Map();

// ============ DEFAULT SCOPES ============

const DEFAULT_SCOPES = [
  {
    id: 'read:users',
    name: 'read:users',
    displayName: 'Read Users',
    description: 'Read user information',
    category: 'users',
    permissions: ['user:read', 'user:profile:read'],
    resourceTypes: ['user'],
    requiresConsent: false,
    isDefault: true,
    isInternal: false
  },
  {
    id: 'write:users',
    name: 'write:users',
    displayName: 'Write Users',
    description: 'Create and update users',
    category: 'users',
    permissions: ['user:read', 'user:write', 'user:profile:write'],
    resourceTypes: ['user'],
    requiresConsent: true,
    isDefault: false,
    isInternal: false
  },
  {
    id: 'read:organizations',
    name: 'read:organizations',
    displayName: 'Read Organizations',
    description: 'Read organization information',
    category: 'organizations',
    permissions: ['org:read', 'dept:read', 'team:read'],
    resourceTypes: ['organization', 'department', 'team'],
    requiresConsent: false,
    isDefault: true,
    isInternal: false
  },
  {
    id: 'write:organizations',
    name: 'write:organizations',
    displayName: 'Write Organizations',
    description: 'Create and update organizations',
    category: 'organizations',
    permissions: ['org:read', 'org:write', 'dept:write', 'team:write'],
    resourceTypes: ['organization', 'department', 'team'],
    requiresConsent: true,
    isDefault: false,
    isInternal: false
  },
  {
    id: 'read:roles',
    name: 'read:roles',
    displayName: 'Read Roles',
    description: 'Read role and permission information',
    category: 'rbac',
    permissions: ['role:read'],
    resourceTypes: ['role', 'permission'],
    requiresConsent: false,
    isDefault: true,
    isInternal: false
  },
  {
    id: 'manage:webhooks',
    name: 'manage:webhooks',
    displayName: 'Manage Webhooks',
    description: 'Create and manage webhooks',
    category: 'webhooks',
    permissions: ['webhook:read', 'webhook:write'],
    resourceTypes: ['webhook'],
    requiresConsent: true,
    isDefault: false,
    isInternal: false
  },
  {
    id: 'admin',
    name: 'admin',
    displayName: 'Full Access',
    description: 'Full administrative access',
    category: 'admin',
    permissions: ['*'],
    resourceTypes: ['*'],
    requiresConsent: true,
    isDefault: false,
    isInternal: true
  }
];

// ============ INITIALIZATION ============

export function initializeApiIdentity() {
  // Initialize default scopes
  for (const scope of DEFAULT_SCOPES) {
    scopes.set(scope.id, scope);
  }
}

initializeApiIdentity();

// ============ API KEY MODEL ============

/**
 * Create a new API key
 */
export function createApiKey(data) {
  const keyId = `ak-${uuidv4().slice(0, 12)}`;
  const rawKey = generateAPIKey('cpk');
  const keyHash = hashAPIKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12);

  const now = new Date().toISOString();

  const apiKey = {
    id: keyId,
    name: data.name,
    description: data.description || '',

    // Key info
    keyHash,
    keyPrefix,

    // Ownership
    userId: data.userId || null,
    organizationId: data.organizationId || null,
    serviceName: data.serviceName || null,

    // Scopes & permissions
    scopes: data.scopes || [],
    permissions: data.permissions || [],

    // Restrictions
    allowedIps: data.allowedIps || null,
    allowedOrigins: data.allowedOrigins || null,
    expiresAt: data.expiresAt || null,

    // Rate limits
    rateLimit: data.rateLimit || {
      requests: 1000,
      window: 'hour'
    },

    // Environment
    environment: data.environment || 'production',

    // Usage stats
    lastUsedAt: null,
    usageCount: 0,

    // Status
    status: 'active',
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,

    // Timestamps
    createdAt: now,
    createdBy: data.createdBy
  };

  apiKeys.set(keyId, apiKey);

  // Return the raw key only once (never stored)
  return {
    ...apiKey,
    key: rawKey,
    keyId: rawKey.substring(0, 12) + '...' // For display
  };
}

/**
 * Get API key by ID
 */
export function getApiKeyById(id) {
  return apiKeys.get(id) || null;
}

/**
 * Find API key by raw key
 */
export function findApiKeyByRawKey(rawKey) {
  const keyHash = hashAPIKey(rawKey);
  for (const apiKey of apiKeys.values()) {
    if (apiKey.keyHash === keyHash) return apiKey;
  }
  return null;
}

/**
 * Update API key
 */
export function updateApiKey(id, data) {
  const apiKey = apiKeys.get(id);
  if (!apiKey) return null;

  const allowedFields = ['name', 'description', 'scopes', 'allowedIps', 'allowedOrigins', 'rateLimit', 'expiresAt'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      apiKey[field] = data[field];
    }
  }

  apiKeys.set(id, apiKey);
  return apiKey;
}

/**
 * Revoke API key
 */
export function revokeApiKey(id, revokedBy, reason) {
  const apiKey = apiKeys.get(id);
  if (!apiKey) return false;

  apiKey.status = 'revoked';
  apiKey.revokedAt = new Date().toISOString();
  apiKey.revokedBy = revokedBy;
  apiKey.revokeReason = reason;

  apiKeys.set(id, apiKey);
  return true;
}

/**
 * Rotate API key (generate new key, keep ID and metadata)
 */
export function rotateApiKey(id) {
  const apiKey = apiKeys.get(id);
  if (!apiKey) return null;

  const rawKey = generateAPIKey('cpk');
  apiKey.keyHash = hashAPIKey(rawKey);
  apiKey.keyPrefix = rawKey.substring(0, 12);
  apiKey.rotatedAt = new Date().toISOString();

  apiKeys.set(id, apiKey);

  return { ...apiKey, key: rawKey };
}

/**
 * Record API key usage
 */
export function recordApiKeyUsage(apiKeyId) {
  const apiKey = apiKeys.get(apiKeyId);
  if (!apiKey) return;

  apiKey.lastUsedAt = new Date().toISOString();
  apiKey.usageCount = (apiKey.usageCount || 0) + 1;
  apiKeys.set(apiKeyId, apiKey);

  // Track usage stats
  const hour = new Date().toISOString().slice(0, 13);
  const usageKey = `${apiKeyId}:${hour}`;
  const current = apiKeyUsage.get(usageKey) || { count: 0, hour };
  current.count++;
  apiKeyUsage.set(usageKey, current);
}

// ============ OAUTH CLIENT MODEL ============

/**
 * Create OAuth client
 */
export function createOAuthClient(data) {
  const clientId = `client-${uuidv4().slice(0, 16)}`;
  const rawSecret = generateAPISecret();
  const secretHash = hashAPIKey(rawSecret);

  const now = new Date().toISOString();

  const client = {
    id: `oc-${uuidv4().slice(0, 12)}`,
    name: data.name,
    description: data.description || '',

    // Credentials
    clientId,
    clientSecretHash: secretHash,
    clientSecretExpiresAt: null,

    // Type
    type: data.type || 'confidential', // 'confidential' | 'public'
    applicationType: data.applicationType || 'web', // 'web' | 'native' | 'spa'

    // Ownership
    organizationId: data.organizationId,
    userId: data.userId,

    // URLs
    redirectUris: data.redirectUris || [],
    logoutUris: data.logoutUris || [],
    websiteUrl: data.websiteUrl || null,

    // Capabilities
    grantTypes: data.grantTypes || ['authorization_code'],
    responseTypes: data.responseTypes || ['code'],
    scopes: data.scopes || ['read:users'],

    // Token settings
    accessTokenLifetime: data.accessTokenLifetime || 3600,
    refreshTokenLifetime: data.refreshTokenLifetime || 604800,

    // Security
    requirePkce: data.requirePkce !== false,
    requireConsent: data.requireConsent !== false,
    allowedIps: data.allowedIps || null,

    // Branding
    logo: data.logo || null,
    privacyPolicyUrl: data.privacyPolicyUrl || null,
    termsOfServiceUrl: data.termsOfServiceUrl || null,

    // Status
    status: 'active',

    // Timestamps
    createdAt: now,
    updatedAt: now
  };

  oauthClients.set(client.id, client);

  // Return raw secret only once
  return { ...client, clientSecret: rawSecret };
}

/**
 * Get OAuth client
 */
export function getOAuthClientById(id) {
  return oauthClients.get(id) || null;
}

export function getOAuthClientByClientId(clientId) {
  for (const client of oauthClients.values()) {
    if (client.clientId === clientId) return client;
  }
  return null;
}

/**
 * Update OAuth client
 */
export function updateOAuthClient(id, data) {
  const client = oauthClients.get(id);
  if (!client) return null;

  const allowedFields = ['name', 'description', 'redirectUris', 'logoutUris', 'scopes', 'requirePkce', 'requireConsent', 'allowedIps', 'logo', 'privacyPolicyUrl', 'termsOfServiceUrl', 'status'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      client[field] = data[field];
    }
  }

  client.updatedAt = new Date().toISOString();
  oauthClients.set(id, client);
  return client;
}

/**
 * Rotate client secret
 */
export function rotateClientSecret(id) {
  const client = oauthClients.get(id);
  if (!client) return null;

  const rawSecret = generateAPISecret();
  client.clientSecretHash = hashAPIKey(rawSecret);
  client.clientSecretRotatedAt = new Date().toISOString();
  oauthClients.set(id, client);

  return { ...client, clientSecret: rawSecret };
}

// ============ WEBHOOK MODEL ============

/**
 * Create webhook
 */
export function createWebhook(data) {
  const now = new Date().toISOString();
  const secret = generateToken(32);

  const webhook = {
    id: `wh-${uuidv4().slice(0, 12)}`,
    name: data.name,
    organizationId: data.organizationId,

    // Target
    url: data.url,
    secret,

    // Events
    events: data.events || [],

    // Filters
    filters: {
      organizations: data.filters?.organizations || null,
      eventTypes: data.filters?.eventTypes || null,
      conditions: data.filters?.conditions || null
    },

    // Delivery
    enabled: data.enabled !== false,
    signingAlgorithm: data.signingAlgorithm || 'sha256',
    retryPolicy: {
      maxRetries: data.retryPolicy?.maxRetries || 3,
      backoffMultiplier: data.retryPolicy?.backoffMultiplier || 2,
      maxBackoffSeconds: data.retryPolicy?.maxBackoffSeconds || 300
    },

    // Stats
    successCount: 0,
    failureCount: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastDeliveryAt: null,

    // Status
    status: 'active',

    // Timestamps
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy
  };

  webhooks.set(webhook.id, webhook);

  // Return with secret (only shown once)
  return webhook;
}

export function getWebhookById(id) {
  return webhooks.get(id) || null;
}

export function updateWebhook(id, data) {
  const webhook = webhooks.get(id);
  if (!webhook) return null;

  const allowedFields = ['name', 'url', 'events', 'enabled', 'filters', 'retryPolicy', 'status'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      webhook[field] = data[field];
    }
  }

  webhook.updatedAt = new Date().toISOString();
  webhooks.set(id, webhook);
  return webhook;
}

export function deleteWebhook(id) {
  return webhooks.delete(id);
}

// ============ WEBHOOK DELIVERY ============

/**
 * Record a webhook delivery attempt
 */
export function recordWebhookDelivery(webhookId, status, response, duration) {
  const id = `wdel-${uuidv4().slice(0, 12)}`;
  const delivery = {
    id,
    webhookId,
    status, // 'success' | 'failure' | 'pending'
    responseCode: response?.statusCode || null,
    responseBody: response?.body || null,
    duration,
    attempts: 1,
    deliveredAt: new Date().toISOString()
  };

  webhookDeliveries.set(id, delivery);

  // Update webhook stats
  const webhook = webhooks.get(webhookId);
  if (webhook) {
    webhook.lastDeliveryAt = delivery.deliveredAt;
    if (status === 'success') {
      webhook.successCount++;
      webhook.lastSuccessAt = delivery.deliveredAt;
    } else {
      webhook.failureCount++;
      webhook.lastFailureAt = delivery.deliveredAt;
    }
    webhooks.set(webhookId, webhook);
  }

  return delivery;
}

export function getWebhookDeliveries(webhookId, limit = 50) {
  return Array.from(webhookDeliveries.values())
    .filter(d => d.webhookId === webhookId)
    .sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt))
    .slice(0, limit);
}

// ============ AVAILABLE WEBHOOK EVENTS ============

export const WEBHOOK_EVENTS = {
  // User events
  'user.created': 'User account created',
  'user.updated': 'User profile updated',
  'user.deleted': 'User account deleted',
  'user.suspended': 'User account suspended',

  // Organization events
  'organization.created': 'Organization created',
  'organization.updated': 'Organization updated',
  'organization.deleted': 'Organization deleted',

  // Membership events
  'member.invited': 'Member invited',
  'member.joined': 'Member joined organization',
  'member.removed': 'Member removed',
  'member.suspended': 'Member suspended',

  // Auth events
  'auth.login': 'User logged in',
  'auth.logout': 'User logged out',
  'auth.failed': 'Failed login attempt',
  'auth.mfa_enabled': 'MFA enabled',
  'auth.password_changed': 'Password changed',

  // Role events
  'role.created': 'Role created',
  'role.assigned': 'Role assigned to user',
  'role.revoked': 'Role revoked',

  // API Key events
  'api_key.created': 'API key created',
  'api_key.rotated': 'API key rotated',
  'api_key.revoked': 'API key revoked'
};
