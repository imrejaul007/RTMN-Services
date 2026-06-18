/**
 * Sync Models - Data structures for bidirectional sales system synchronization
 */

export type SyncSource = 'salesmind' | 'salesos' | 'customerops' | 'brandpulse';
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';
export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'conflict';
export type ConflictStrategy = 'last-write-wins' | 'source-wins' | 'target-wins' | 'manual';

export interface SyncRecord {
  id: string;
  source: SyncSource;
  target: SyncSource;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  direction: SyncDirection;
  status: SyncStatus;
  timestamp: Date;
  lastSyncedAt: Date | null;
  version: number;
  checksum: string;
  metadata: Record<string, unknown>;
}

export interface SyncBatch {
  id: string;
  source: SyncSource;
  target: SyncSource;
  records: SyncRecord[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date | null;
  completedAt: Date | null;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
}

export interface ConflictRecord {
  id: string;
  syncRecordId: string;
  sourceData: Record<string, unknown>;
  targetData: Record<string, unknown>;
  conflictFields: string[];
  detectedAt: Date;
  resolvedAt: Date | null;
  resolution: ConflictStrategy | null;
  resolvedData: Record<string, unknown> | null;
  resolvedBy: string | null;
}

export interface SyncEvent {
  id: string;
  type: 'sync.started' | 'sync.completed' | 'sync.failed' | 'sync.conflict' | 'sync.record_created' | 'sync.record_updated' | 'sync.record_deleted';
  source: SyncSource;
  target: SyncSource;
  entityType: string;
  entityId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface EntityMapping {
  localId: string;
  remoteId: string;
  source: SyncSource;
  remoteSource: SyncSource;
  entityType: string;
  createdAt: Date;
  updatedAt: Date;
  syncVersion: number;
}

export interface SyncQueue {
  id: string;
  source: SyncSource;
  target: SyncSource;
  items: SyncQueueItem[];
  priority: number;
  createdAt: Date;
  processingAt: Date | null;
  completedAt: Date | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  priority: number;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
}

export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictsDetected: number;
  conflictsResolved: number;
  recordsProcessed: number;
  lastSyncAt: Date | null;
  averageSyncDuration: number;
  bySource: Record<SyncSource, SyncSourceStats>;
}

export interface SyncSourceStats {
  inbound: number;
  outbound: number;
  bidirectional: number;
  lastSyncAt: Date | null;
  recordsProcessed: number;
  conflicts: number;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  source: SyncSource;
  target: SyncSource;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  status: 'success' | 'failure' | 'conflict';
  errorMessage: string | null;
  duration: number;
  requestId: string | null;
  userId: string | null;
}

// Sales-specific entity types
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  source: string;
  assignedTo: string | null;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Opportunity {
  id: string;
  name: string;
  leadId: string;
  stage: string;
  value: number;
  probability: number;
  expectedCloseDate: Date;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  industry: string;
  type: 'individual' | 'business';
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  customerId: string;
  opportunityId: string | null;
  items: SaleItem[];
  total: number;
  status: 'pending' | 'completed' | 'refunded' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task';
  subject: string;
  description: string;
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
  userId: string;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to generate checksum
export function generateChecksum(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
