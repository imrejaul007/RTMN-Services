/**
 * GENIE Sync Service - Business Logic
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
import {
  SyncJob,
  SyncRecord,
  SyncConfig,
  CreateSyncJobSchema,
  SyncSource,
  SyncDirection,
} from '../types.js';

const logger = createLogger('sync-service');

// In-memory storage (replace with Redis in production)
const syncJobs = new Map<string, SyncJob>();
const syncRecords = new Map<string, SyncRecord>();
const syncConfigs = new Map<string, SyncConfig>();

// Service endpoints for sync
const SERVICE_ENDPOINTS: Record<string, string> = {
  'genie-memory': process.env.GENIE_MEMORY || 'http://localhost:4703',
  'genie-relationship': process.env.GENIE_RELATIONSHIP || 'http://localhost:4704',
  'genie-briefing': process.env.GENIE_BRIEFING || 'http://localhost:4706',
  'genie-meeting': process.env.GENIE_MEETING || 'http://localhost:4713',
};

export async function createSyncJob(
  userId: string,
  input: { source: SyncSource; source_id: string; target_service: string; direction: SyncDirection; data: Record<string, unknown> }
): Promise<SyncJob> {
  const parseResult = CreateSyncJobSchema.safeParse(input);
  if (!parseResult.success) {
    throw new Error(`Validation failed: ${parseResult.error.message}`);
  }

  const job: SyncJob = {
    id: uuidv4(),
    user_id: userId,
    source: parseResult.data.source,
    source_id: parseResult.data.source_id,
    target_service: parseResult.data.target_service,
    direction: parseResult.data.direction,
    status: 'pending',
    data: parseResult.data.data,
    created_at: new Date().toISOString(),
  };

  syncJobs.set(job.id, job);
  logger.info('sync_job_created', { jobId: job.id, userId, target: job.target_service });

  // Execute sync asynchronously
  executeSyncJob(job.id).catch(err => logger.error('sync_execution_error', { error: err.message }));

  return job;
}

async function executeSyncJob(jobId: string): Promise<void> {
  const job = syncJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'in_progress';
    job.updated_at = new Date().toISOString();
    syncJobs.set(jobId, job);

    const targetUrl = SERVICE_ENDPOINTS[job.target_service];
    if (!targetUrl) {
      throw new Error(`Unknown target service: ${job.target_service}`);
    }

    // Execute sync based on direction
    if (job.direction === 'push' || job.direction === 'bidirectional') {
      await pushToTarget(job, targetUrl);
    }
    if (job.direction === 'pull' || job.direction === 'bidirectional') {
      await pullFromTarget(job, targetUrl);
    }

    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    logger.info('sync_job_completed', { jobId: job.id });
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.updated_at = new Date().toISOString();
    logger.error('sync_job_failed', { jobId: job.id, error: job.error });
  }

  syncJobs.set(jobId, job);
}

async function pushToTarget(job: SyncJob, targetUrl: string): Promise<void> {
  logger.info('push_to_target', { jobId: job.id, target: job.target_service });
  // In production, make HTTP call to target service
  // For now, just log
}

async function pullFromTarget(job: SyncJob, targetUrl: string): Promise<void> {
  logger.info('pull_from_target', { jobId: job.id, target: job.target_service });
  // In production, make HTTP call to target service
}

export async function getSyncJob(jobId: string, userId: string): Promise<SyncJob | null> {
  const job = syncJobs.get(jobId);
  if (!job || job.user_id !== userId) return null;
  return job;
}

export async function listSyncJobs(
  userId: string,
  query: { page: number; pageSize: number; status?: string; source?: string }
): Promise<{ jobs: SyncJob[]; total: number }> {
  let jobs = Array.from(syncJobs.values()).filter(j => j.user_id === userId);

  if (query.status) {
    jobs = jobs.filter(j => j.status === query.status);
  }
  if (query.source) {
    jobs = jobs.filter(j => j.source === query.source);
  }

  jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = jobs.length;
  const start = (query.page - 1) * query.pageSize;
  const paginatedJobs = jobs.slice(start, start + query.pageSize);

  return { jobs: paginatedJobs, total };
}

export async function getSyncConfig(userId: string): Promise<SyncConfig | null> {
  return syncConfigs.get(userId) || null;
}

export async function updateSyncConfig(userId: string, config: Partial<SyncConfig>): Promise<SyncConfig> {
  const existing = syncConfigs.get(userId) || {
    user_id: userId,
    services: [],
    sync_interval: 300000,
    auto_sync: true,
    conflict_resolution: 'latest' as const,
  };

  const updated = { ...existing, ...config };
  syncConfigs.set(userId, updated);
  return updated;
}

export async function getSyncHistory(
  userId: string,
  service: string,
  entityType: string,
  limit: number = 10
): Promise<SyncRecord[]> {
  return Array.from(syncRecords.values())
    .filter(r => r.user_id === userId && r.service === service && r.entity_type === entityType)
    .sort((a, b) => new Date(b.last_synced).getTime() - new Date(a.last_synced).getTime())
    .slice(0, limit);
}
