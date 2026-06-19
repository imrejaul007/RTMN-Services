/**
 * CorpID Cloud - AI Agent Identity Model
 * Identity and trust for AI agents
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const agents = new Map();
export const agentKeys = new Map(); // API keys for agents
export const agentMemories = new Map();
export const agentInteractions = [];

// ============ DEFAULT CAPABILITIES ============

export const AGENT_CAPABILITIES = {
  'web-search': { name: 'Web Search', risk: 'low', requiresConsent: false },
  'code-execution': { name: 'Code Execution', risk: 'medium', requiresConsent: true },
  'file-read': { name: 'File Read', risk: 'low', requiresConsent: false },
  'file-write': { name: 'File Write', risk: 'medium', requiresConsent: true },
  'email-send': { name: 'Send Email', risk: 'high', requiresConsent: true },
  'sms-send': { name: 'Send SMS', risk: 'high', requiresConsent: true },
  'payment-initiate': { name: 'Initiate Payment', risk: 'critical', requiresConsent: true },
  'user-data-access': { name: 'Access User Data', risk: 'high', requiresConsent: true },
  'admin-actions': { name: 'Admin Actions', risk: 'critical', requiresConsent: true },
  'memory-access': { name: 'Memory Access', risk: 'medium', requiresConsent: true },
  'external-api': { name: 'External API Calls', risk: 'medium', requiresConsent: false }
};

// ============ MODEL FACTORY ============

/**
 * Create an AI agent
 */
export function createAgent(data) {
  const now = new Date().toISOString();
  const agentId = data.agentId || `agent-${uuidv4().slice(0, 12)}`;

  const agent = {
    id: `ag-${uuidv4().slice(0, 8)}`,
    agentId,
    name: data.name,
    displayName: data.displayName || data.name,
    description: data.description || '',
    avatar: data.avatar || null,

    // Classification
    type: data.type || 'assistant', // assistant, autonomous, hybrid, webhook
    category: data.category || 'personal', // personal, business, system, customer-service
    version: data.version || '1.0.0',
    previousVersion: data.previousVersion || null,

    // Owner
    owner: {
      type: data.owner?.type || 'user', // user, organization
      id: data.owner?.id
    },

    // Capabilities
    capabilities: data.capabilities || [],

    // Permissions
    permissions: {
      dataAccess: data.permissions?.dataAccess || [],
      actions: data.permissions?.actions || [],
      restrictions: data.permissions?.restrictions || []
    },

    // Memory Access
    memoryAccess: {
      allowed: data.memoryAccess?.allowed ?? true,
      types: data.memoryAccess?.types || ['short-term'],
      retentionDays: data.memoryAccess?.retentionDays || 30,
      encryptionRequired: data.memoryAccess?.encryptionRequired ?? false
    },

    // Behavior Profile
    behavior: {
      personality: data.behavior?.personality || {
        tone: 'helpful',
        style: 'professional',
        empathy: 'medium'
      },
      communicationStyle: data.behavior?.communicationStyle || 'casual',
      language: data.behavior?.language || ['en'],
      timezone: data.behavior?.timezone || 'UTC',
      responseLength: data.behavior?.responseLength || 'medium'
    },

    // Learning
    learning: {
      enabled: data.learning?.enabled ?? true,
      scope: {
        fromUserInput: data.learning?.scope?.fromUserInput ?? true,
        fromInteractions: data.learning?.scope?.fromInteractions ?? true,
        fromFeedback: data.learning?.scope?.fromFeedback ?? true
      }
    },

    // Trust & Safety
    trust: {
      score: 50, // 0-100
      grade: 'medium',
      riskLevel: 'medium', // low, medium, high, critical
      lastEvaluatedAt: now,
      flags: [],
      restrictions: []
    },

    // Stats
    stats: {
      totalInteractions: 0,
      successfulInteractions: 0,
      failedInteractions: 0,
      averageRating: 0,
      totalRatings: 0
    },

    // Limits
    limits: {
      requestsPerMinute: data.limits?.requestsPerMinute || 60,
      requestsPerHour: data.limits?.requestsPerHour || 1000,
      requestsPerDay: data.limits?.requestsPerDay || 10000,
      maxContextLength: data.limits?.maxContextLength || 8000,
      maxOutputLength: data.limits?.maxOutputLength || 4000
    },

    // Model info
    model: {
      provider: data.model?.provider || 'unknown',
      name: data.model?.name || 'unknown',
      temperature: data.model?.temperature || 0.7,
      topP: data.model?.topP || 1.0
    },

    // Status
    status: 'active', // active, paused, suspended, deprecated
    pausedAt: null,
    suspendedAt: null,
    deprecatedAt: null,

    // API Key (returned only on creation)
    apiKey: data.generateKey ? generateAgentKey() : null,

    // Metadata
    tags: data.tags || [],
    metadata: data.metadata || {},

    // Timestamps
    createdAt: now,
    updatedAt: now,
    lastActiveAt: null,
    lastInteractionAt: null
  };

  agents.set(agent.id, agent);

  if (agent.apiKey) {
    agentKeys.set(agent.id, {
      agentId: agent.id,
      keyId: agent.apiKey.keyId,
      keyHash: agent.apiKey.keyHash,
      createdAt: now
    });
  }

  return agent;
}

/**
 * Generate agent API key
 */
function generateAgentKey() {
  const keyId = `agk-${uuidv4().slice(0, 12)}`;
  const rawKey = `${keyId}.${uuidv4().replace(/-/g, '').substring(0, 32)}`;
  const crypto = require('crypto');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  return { keyId, keyHash, key: rawKey };
}

// ============ QUERY HELPERS ============

export function getAgentById(id) {
  return agents.get(id) || null;
}

export function getAgentByAgentId(agentId) {
  for (const agent of agents.values()) {
    if (agent.agentId === agentId) return agent;
  }
  return null;
}

export function getAgentsByOwner(ownerType, ownerId) {
  return Array.from(agents.values()).filter(a =>
    a.owner.type === ownerType && a.owner.id === ownerId
  );
}

/**
 * Update agent
 */
export function updateAgent(id, data) {
  const agent = agents.get(id);
  if (!agent) return null;

  const allowedFields = [
    'name', 'displayName', 'description', 'avatar',
    'capabilities', 'permissions', 'memoryAccess',
    'behavior', 'learning', 'limits', 'model',
    'status', 'tags', 'metadata', 'version'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      agent[field] = data[field];
    }
  }

  agent.updatedAt = new Date().toISOString();
  agents.set(id, agent);
  return agent;
}

/**
 * Update trust score
 */
export function updateTrust(id, score, flags = []) {
  const agent = agents.get(id);
  if (!agent) return null;

  agent.trust.score = Math.max(0, Math.min(100, score));
  agent.trust.grade = score >= 80 ? 'very_high' : score >= 60 ? 'high' : score >= 40 ? 'medium' : score >= 20 ? 'low' : 'very_low';
  agent.trust.riskLevel = score >= 80 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical';
  agent.trust.lastEvaluatedAt = new Date().toISOString();
  agent.trust.flags = flags;

  agent.updatedAt = new Date().toISOString();
  agents.set(id, agent);
  return agent;
}

/**
 * Record interaction
 */
export function recordInteraction(agentId, data) {
  const agent = agents.get(agentId);
  if (!agent) return null;

  const interaction = {
    id: uuidv4(),
    agentId,
    type: data.type, // query, action, command
    success: data.success !== false,
    userId: data.userId || null,
    duration: data.duration || 0,
    tokensUsed: data.tokensUsed || 0,
    metadata: data.metadata || {},
    timestamp: new Date().toISOString()
  };

  agentInteractions.push(interaction);

  // Update agent stats
  agent.stats.totalInteractions = (agent.stats.totalInteractions || 0) + 1;
  if (interaction.success) {
    agent.stats.successfulInteractions++;
  } else {
    agent.stats.failedInteractions++;
  }
  agent.lastInteractionAt = interaction.timestamp;
  agent.lastActiveAt = interaction.timestamp;

  agents.set(agentId, agent);

  return interaction;
}

/**
 * Pause agent
 */
export function pauseAgent(id, reason) {
  const agent = agents.get(id);
  if (!agent) return null;

  agent.status = 'paused';
  agent.pausedAt = new Date().toISOString();
  agent.pauseReason = reason;
  agent.updatedAt = new Date().toISOString();
  agents.set(id, agent);
  return agent;
}

/**
 * Resume agent
 */
export function resumeAgent(id) {
  const agent = agents.get(id);
  if (!agent) return null;

  agent.status = 'active';
  agent.pausedAt = null;
  agent.pauseReason = null;
  agent.updatedAt = new Date().toISOString();
  agents.set(id, agent);
  return agent;
}

/**
 * Deprecate agent
 */
export function deprecateAgent(id, replacementId = null) {
  const agent = agents.get(id);
  if (!agent) return null;

  agent.status = 'deprecated';
  agent.deprecatedAt = new Date().toISOString();
  agent.replacementAgentId = replacementId;
  agent.updatedAt = new Date().toISOString();
  agents.set(id, agent);
  return agent;
}
