/**
 * GENIE Sync Service - Type Definitions
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: Cross-service data synchronization for Genie
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type SyncDirection = 'push' | 'pull' | 'bidirectional';
export type SyncSource = 'memory' | 'relationship' | 'briefing' | 'meeting' | 'external';

export interface SyncJob {
  id: string;
  user_id: string;
  source: SyncSource;
  source_id: string;
  target_service: string;
  direction: SyncDirection;
  status: SyncStatus;
  data: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface SyncRecord {
  id: string;
  user_id: string;
  service: string;
  entity_type: string;
  entity_id: string;
  last_synced: string;
  checksum: string;
  version: number;
}

export interface SyncConfig {
  user_id: string;
  services: string[];
  sync_interval: number;
  auto_sync: boolean;
  conflict_resolution: 'latest' | 'source' | 'manual';
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const CreateSyncJobSchema = z.object({
  source: z.enum(['memory', 'relationship', 'briefing', 'meeting', 'external']),
  source_id: z.string().min(1),
  target_service: z.string().min(1),
  direction: z.enum(['push', 'pull', 'bidirectional']).default('push'),
  data: z.record(z.unknown()),
});

export const SyncConfigSchema = z.object({
  services: z.array(z.string()).min(1),
  sync_interval: z.number().min(60000).max(86400000).default(300000),
  auto_sync: z.boolean().default(true),
  conflict_resolution: z.enum(['latest', 'source', 'manual']).default('latest'),
});

export const ListSyncJobsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
  source: z.enum(['memory', 'relationship', 'briefing', 'meeting', 'external']).optional(),
});

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
