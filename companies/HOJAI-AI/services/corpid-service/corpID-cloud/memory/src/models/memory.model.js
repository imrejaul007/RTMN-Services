/**
 * CorpID Cloud - Identity Memory Model
 * Integration with MemoryOS for personalized identity
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const memoryLinks = new Map(); // userId -> MemoryLink
export const memories = new Map(); // memoryId -> Memory
export const memoryCategories = ['preferences', 'behavioral', 'communication', 'security', 'social', 'professional', 'contextual'];

// ============ MODEL FACTORY ============

/**
 * Create or get memory link
 */
export function getOrCreateMemoryLink(userId) {
  let link = memoryLinks.get(userId);

  if (!link) {
    link = {
      id: `mlink-${uuidv4().slice(0, 12)}`,
      userId,
      memoryEnabled: true,

      // Memory types enabled
      memoryTypes: {
        preferences: true,
        behavioral: true,
        communication: true,
        security: true,
        social: false,
        professional: false,
        contextual: true
      },

      // Sync settings
      syncSettings: {
        autoSync: true,
        syncFrequency: 'realtime',
        lastSyncedAt: null,
        nextSyncAt: null
      },

      // Access control
      accessControl: {
        readBy: [],   // Agent IDs
        writeBy: ['user', 'system'],
        deleteBy: ['user']
      },

      // Privacy
      memoryPrivacy: {
        shareWithOrganizations: [],
        shareWithAgents: [],
        encryptionAtRest: true,
        encryptionInTransit: true
      },

      // Stats
      stats: {
        totalMemories: 0,
        activeMemories: 0,
        archivedMemories: 0,
        lastMemoryAt: null
      },

      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memoryLinks.set(userId, link);
  }

  return link;
}

/**
 * Store a memory
 */
export function storeMemory(userId, memory) {
  const memoryId = `mem-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const mem = {
    id: memoryId,
    userId,
    type: memory.type || 'contextual', // preferences, behavioral, communication, security, social, professional, contextual
    category: memory.category || 'general',

    // Content
    key: memory.key,
    value: memory.value,
    data: memory.data || null,

    // Metadata
    confidence: memory.confidence || 0.8, // 0-1
    source: memory.source || 'user', // user, agent, system, observed
    sourceAgentId: memory.sourceAgentId || null,

    // Context
    context: memory.context || {},

    // Lifecycle
    expiresAt: memory.expiresAt || null,
    archived: false,
    archivedAt: null,

    // Access
    visibility: memory.visibility || 'private', // private, shared, public
    sharedWith: memory.sharedWith || [],

    // Timestamps
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    accessCount: 0
  };

  memories.set(memoryId, mem);

  // Update link stats
  const link = getOrCreateMemoryLink(userId);
  link.stats.totalMemories++;
  link.stats.activeMemories++;
  link.stats.lastMemoryAt = now;
  link.updatedAt = now;
  memoryLinks.set(userId, link);

  return mem;
}

/**
 * Get memory by ID
 */
export function getMemoryById(memoryId) {
  return memories.get(memoryId) || null;
}

/**
 * Get user's memories
 */
export function getUserMemories(userId, options = {}) {
  let userMems = Array.from(memories.values()).filter(m => m.userId === userId);

  if (options.type) {
    userMems = userMems.filter(m => m.type === options.type);
  }
  if (options.category) {
    userMems = userMems.filter(m => m.category === options.category);
  }
  if (options.archived !== undefined) {
    userMems = userMems.filter(m => m.archived === options.archived);
  }
  if (options.source) {
    userMems = userMems.filter(m => m.source === options.source);
  }

  return userMems.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Update memory
 */
export function updateMemory(memoryId, updates) {
  const mem = memories.get(memoryId);
  if (!mem) return null;

  const allowedFields = ['key', 'value', 'data', 'confidence', 'visibility', 'context', 'expiresAt'];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      mem[field] = updates[field];
    }
  }

  mem.updatedAt = new Date().toISOString();
  mem.lastAccessedAt = new Date().toISOString();
  mem.accessCount++;
  memories.set(memoryId, mem);

  return mem;
}

/**
 * Archive memory
 */
export function archiveMemory(memoryId) {
  const mem = memories.get(memoryId);
  if (!mem) return null;

  mem.archived = true;
  mem.archivedAt = new Date().toISOString();
  mem.updatedAt = mem.archivedAt;
  memories.set(memoryId, mem);

  // Update link stats
  const link = memoryLinks.get(mem.userId);
  if (link) {
    link.stats.activeMemories = Math.max(0, link.stats.activeMemories - 1);
    link.stats.archivedMemories = (link.stats.archivedMemories || 0) + 1;
    memoryLinks.set(mem.userId, link);
  }

  return mem;
}

/**
 * Delete memory
 */
export function deleteMemory(memoryId) {
  const mem = memories.get(memoryId);
  if (!mem) return false;

  memories.delete(memoryId);

  // Update link stats
  const link = memoryLinks.get(mem.userId);
  if (link) {
    link.stats.totalMemories = Math.max(0, link.stats.totalMemories - 1);
    if (!mem.archived) {
      link.stats.activeMemories = Math.max(0, link.stats.activeMemories - 1);
    } else {
      link.stats.archivedMemories = Math.max(0, (link.stats.archivedMemories || 0) - 1);
    }
    memoryLinks.set(mem.userId, link);
  }

  return true;
}

/**
 * Search memories
 */
export function searchMemories(userId, query, options = {}) {
  let results = getUserMemories(userId, options);

  if (query) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(m =>
      m.key.toLowerCase().includes(lowerQuery) ||
      (m.value && typeof m.value === 'string' && m.value.toLowerCase().includes(lowerQuery))
    );
  }

  return results;
}

/**
 * Update memory link settings
 */
export function updateMemoryLink(userId, updates) {
  const link = getOrCreateMemoryLink(userId);

  const allowedFields = ['memoryEnabled', 'memoryTypes', 'syncSettings', 'accessControl', 'memoryPrivacy'];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      link[field] = { ...link[field], ...updates[field] };
    }
  }

  link.updatedAt = new Date().toISOString();
  memoryLinks.set(userId, link);

  return link;
}

/**
 * Get memory statistics
 */
export function getMemoryStats(userId) {
  const link = getOrCreateMemoryLink(userId);
  const userMems = getUserMemories(userId);

  const byType = {};
  const bySource = {};
  let oldestMemory = null;
  let newestMemory = null;

  for (const mem of userMems) {
    byType[mem.type] = (byType[mem.type] || 0) + 1;
    bySource[mem.source] = (bySource[mem.source] || 0) + 1;

    if (!oldestMemory || mem.createdAt < oldestMemory) oldestMemory = mem.createdAt;
    if (!newestMemory || mem.createdAt > newestMemory) newestMemory = mem.createdAt;
  }

  return {
    link,
    summary: {
      total: userMems.length,
      byType,
      bySource,
      oldestMemory,
      newestMemory,
      averageConfidence: userMems.length > 0
        ? userMems.reduce((sum, m) => sum + m.confidence, 0) / userMems.length
        : 0
    }
  };
}
