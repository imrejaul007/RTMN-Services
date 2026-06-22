// ============================================================================
// SUTAR Memory Bridge - Type Definitions
// ============================================================================

export type MemoryStatus = 'active' | 'archived' | 'deleted' | 'expired';
export type MemoryType = 'context' | 'fact' | 'preference' | 'history' | 'session';

export interface Memory {
  id: string;
  entityId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  ttl?: number;
  metadata: Record<string, unknown>;
  tags: string[];
  status: MemoryStatus;
  accessCount: number;
  lastAccessed: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CreateMemoryOptions {
  entityId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  ttl?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
  expiresAt?: string;
}

export interface UpdateMemoryOptions {
  content?: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  tags?: string[];
  status?: MemoryStatus;
}

export interface MemoryFilter {
  entityId?: string;
  type?: MemoryType;
  tags?: string[];
  status?: MemoryStatus;
}

export interface MemorySort {
  field: 'createdAt' | 'updatedAt' | 'accessCount';
  order: 'asc' | 'desc';
}

export interface MemoryStats {
  total: number;
  byType: Record<MemoryType, number>;
  byStatus: Record<MemoryStatus, number>;
  avgAccessCount: number;
}

// Analytics
export interface MemoryAnalytics {
  totalMemories: number;
  totalAccessCount?: number;
  storageSize?: number;
  byType: Record<MemoryType, number>;
  byStatus: Record<MemoryStatus, number>;
  topEntities: EntityStat[];
  recentActivity: number;
}

export interface MemoryAccessStat {
  entityId: string;
  accessCount: number;
  lastAccess: string;
}

export interface EntityStat {
  entityId: string;
  count: number;
}

// Versions
export interface MemoryVersion {
  id: string;
  memoryId: string;
  version: number;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  createdBy?: string;
  changeReason?: string;
}

// Shares
export interface MemoryShare {
  id: string;
  memoryId: string;
  sharedWith: string;
  permission: SharePermission;
  createdAt: string;
}

export type SharePermission = 'read' | 'write' | 'admin';

// TTL
export interface MemoryTTL {
  memoryId: string;
  expiresAt: string;
  remainingMs: number;
}

export interface TTLConfig {
  defaultTTL: number;
  maxTTL: number;
  cleanupInterval: number;
}

// Backup
export interface BackupData {
  memories: Memory[];
  version: string;
  createdAt: string;
  entityCount: number;
}

export interface BackupMetadata {
  id: string;
  version: string;
  size: number;
  memoryCount: number;
  createdAt: string;
}

// Search
export interface SemanticSearchResult {
  memory: Memory;
  similarity: number;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  minSimilarity?: number;
}

// Analytics types
export interface MemoryAccessPattern {
  hour: number;
  count: number;
}

export interface MemoryTrend {
  date: string;
  count: number;
}

export const DEFAULT_BACKUP_VERSION = '1.0.0';
