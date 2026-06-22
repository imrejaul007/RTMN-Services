/**
 * CorpID Cloud - Developer Identity Model
 * External developer platform with API access, projects, and billing
 */

import { v4 as uuidv4 } from 'uuid';
import { generateAPIKey, hashAPIKey } from '../../../../shared/utils/security.js';

// ============ IN-MEMORY STORES ============

export const developers = new Map();   // userId -> DeveloperProfile
export const projects = new Map();      // projectId -> Project
export const developerApps = new Map(); // appId -> App
export const developerKeys = new Map(); // keyId -> DeveloperKey
export const developerUsage = new Map(); // keyId -> Usage

// ============ PLANS ============

export const DEVELOPER_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    requestsPerMonth: 1000,
    rateLimit: { requests: 10, window: 'minute' },
    features: ['basic_api', 'community_support']
  },
  payg: {
    name: 'Pay As You Go',
    pricePerCall: 0.001,
    requestsPerMonth: 'unlimited',
    rateLimit: { requests: 100, window: 'minute' },
    features: ['full_api', 'email_support', 'webhooks']
  },
  startup: {
    name: 'Startup',
    price: 49,
    requestsPerMonth: 100000,
    rateLimit: { requests: 1000, window: 'minute' },
    features: ['full_api', 'priority_support', 'webhooks', 'custom_domains']
  },
  enterprise: {
    name: 'Enterprise',
    price: 'custom',
    requestsPerMonth: 'unlimited',
    rateLimit: { requests: 10000, window: 'minute' },
    features: ['full_api', 'dedicated_support', 'webhooks', 'custom_domains', 'sla', 'audit_logs']
  }
};

// ============ MODEL FACTORY ============

/**
 * Create developer profile
 */
export function createDeveloper(userId, data) {
  const now = new Date().toISOString();
  const developerId = `dev-${uuidv4().slice(0, 12)}`;

  const developer = {
    id: developerId,
    userId,

    // Profile
    profile: {
      name: data.name,
      company: data.company || null,
      website: data.website || null,
      bio: data.bio || null,
      avatar: data.avatar || null
    },

    // Plan
    plan: 'free',
    planStartedAt: now,

    // Billing
    billing: {
      method: null,
      currentUsage: 0,
      lastBilledAt: null,
      totalSpent: 0
    },

    // API access
    apiAccess: {
      approved: true,
      scopes: ['read:users', 'read:organizations'],
      quotas: DEVELOPER_PLANS.free
    },

    // Stats
    stats: {
      totalCalls: 0,
      activeProjects: 0,
      registeredApps: 0,
      supportTickets: 0
    },

    // Trust
    trustLevel: 'new', // new, verified, trusted, premium
    verifiedAt: null,

    createdAt: now,
    updatedAt: now
  };

  developers.set(userId, developer);
  return developer;
}

/**
 * Get developer by userId
 */
export function getDeveloper(userId) {
  return developers.get(userId) || null;
}

/**
 * Create project
 */
export function createProject(userId, data) {
  const projectId = `proj-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const project = {
    id: projectId,
    ownerId: userId,
    name: data.name,
    description: data.description || '',
    homepage: data.homepage || null,
    repository: data.repository || null,
    type: data.type || 'web', // web, mobile, backend, cli
    visibility: data.visibility || 'private', // private, public

    // Settings
    settings: {
      webhooksEnabled: true,
      ssoRequired: false,
      ipWhitelist: []
    },

    // Members
    members: [{
      userId,
      role: 'owner',
      addedAt: now
    }],

    // Stats
    stats: {
      apiCalls: 0,
      activeKeys: 0,
      apps: 0
    },

    createdAt: now,
    updatedAt: now
  };

  projects.set(projectId, project);

  // Update developer stats
  const developer = developers.get(userId);
  if (developer) {
    developer.stats.activeProjects++;
    developers.set(userId, developer);
  }

  return project;
}

/**
 * Create developer app
 */
export function createApp(userId, projectId, data) {
  const appId = `app-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  // Generate OAuth client credentials
  const clientId = `app_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const clientSecret = generateAPIKey('appsec').substring(4);

  const app = {
    id: appId,
    projectId,
    ownerId: userId,
    name: data.name,
    description: data.description || '',

    // OAuth config
    clientId,
    clientSecret: clientSecret, // Returned only once
    clientSecretHash: hashAPIKey(clientSecret),

    // App config
    type: data.type || 'web', // web, native, spa
    redirectUris: data.redirectUris || [],
    homepage: data.homepage || null,
    logo: data.logo || null,

    // Settings
    scopes: data.scopes || ['read:users'],
    grantTypes: data.grantTypes || ['authorization_code'],
    pkce: data.pkce !== false,

    // Status
    status: 'active',
    verified: false,

    // Timestamps
    createdAt: now,
    updatedAt: now
  };

  developerApps.set(appId, app);
  return app;
}

/**
 * Create developer key
 */
export function createDeveloperKey(userId, projectId, data) {
  const keyId = `dkey-${uuidv4().slice(0, 12)}`;
  const rawKey = generateAPIKey('cpk_live');
  const keyHash = hashAPIKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12);

  const now = new Date().toISOString();

  const key = {
    id: keyId,
    ownerId: userId,
    projectId,
    name: data.name,
    description: data.description || '',

    // Key
    keyHash,
    keyPrefix,
    environment: data.environment || 'production',

    // Scopes
    scopes: data.scopes || [],

    // Limits
    rateLimit: data.rateLimit || { requests: 100, window: 'minute' },

    // Usage
    lastUsedAt: null,
    usageCount: 0,

    // Status
    status: 'active',
    revokedAt: null,
    revokedReason: null,

    createdAt: now
  };

  developerKeys.set(keyId, key);

  return { ...key, key: rawKey }; // Return raw key only once
}

/**
 * Record API usage
 */
export function recordUsage(keyId, endpoint, statusCode, responseTime) {
  const key = developerKeys.get(keyId);
  if (!key) return;

  key.usageCount++;
  key.lastUsedAt = new Date().toISOString();
  developerKeys.set(keyId, key);

  // Aggregate usage by day
  const today = new Date().toISOString().slice(0, 10);
  const usageKey = `${keyId}:${today}`;

  const usage = developerUsage.get(usageKey) || {
    keyId,
    date: today,
    calls: 0,
    errors: 0,
    totalResponseTime: 0
  };

  usage.calls++;
  if (statusCode >= 400) usage.errors++;
  usage.totalResponseTime += responseTime;

  developerUsage.set(usageKey, usage);
}

/**
 * Get developer projects
 */
export function getDeveloperProjects(userId) {
  return Array.from(projects.values()).filter(p =>
    p.ownerId === userId || p.members.some(m => m.userId === userId)
  );
}

/**
 * Get project apps
 */
export function getProjectApps(projectId) {
  return Array.from(developerApps.values()).filter(a => a.projectId === projectId);
}

/**
 * Get project keys
 */
export function getProjectKeys(projectId) {
  return Array.from(developerKeys.values()).filter(k => k.projectId === projectId);
}

/**
 * Get usage stats
 */
export function getUsageStats(userId, period = '30d') {
  const projectList = getDeveloperProjects(userId);
  const projectIds = projectList.map(p => p.id);
  const keyList = Array.from(developerKeys.values()).filter(k => projectIds.includes(k.projectId));

  let totalCalls = 0;
  let totalErrors = 0;
  const dailyUsage = {};

  for (const [usageKey, usage] of developerUsage.entries()) {
    const keyId = usageKey.split(':')[0];
    if (keyList.find(k => k.id === keyId)) {
      totalCalls += usage.calls;
      totalErrors += usage.errors;
      if (!dailyUsage[usage.date]) {
        dailyUsage[usage.date] = { calls: 0, errors: 0 };
      }
      dailyUsage[usage.date].calls += usage.calls;
      dailyUsage[usage.date].errors += usage.errors;
    }
  }

  return {
    totalCalls,
    totalErrors,
    errorRate: totalCalls > 0 ? (totalErrors / totalCalls * 100).toFixed(2) : 0,
    dailyUsage,
    projectCount: projectList.length,
    appCount: projectList.reduce((sum, p) => sum + getProjectApps(p.id).length, 0),
    keyCount: keyList.length
  };
}

/**
 * Upgrade plan
 */
export function upgradePlan(userId, plan) {
  const developer = developers.get(userId);
  if (!developer) return null;
  if (!DEVELOPER_PLANS[plan]) return null;

  developer.plan = plan;
  developer.planStartedAt = new Date().toISOString();
  developer.apiAccess.quotas = DEVELOPER_PLANS[plan];
  developer.updatedAt = new Date().toISOString();
  developers.set(userId, developer);

  return developer;
}
