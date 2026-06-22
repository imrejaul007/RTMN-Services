/**
 * Integration Framework - Core Types
 */

import type { CloudEvent, AnyEvent } from '@rez/shared-types';

// ============================================================================
// Partner Types
// ============================================================================

export type PartnerCategory =
  | 'merchant'
  | 'restaurant'
  | 'retailer'
  | 'distributor'
  | 'supplier'
  | 'franchise'
  | 'manufacturer'
  | 'hotel'
  | 'fitness'
  | 'salon'
  | 'healthcare';

export type IntegrationStatus =
  | 'pending'
  | 'active'
  | 'inactive'
  | 'error'
  | 'suspended';

export interface PartnerConnection {
  id: string;
  partnerId: string;
  partnerName: string;
  category: PartnerCategory;
  integrationType: string;
  webhookUrl?: string;
  webhookSecret?: string;
  apiKey?: string;
  apiSecret?: string;
  status: IntegrationStatus;
  lastSyncAt?: Date;
  lastError?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Event Handler Types
// ============================================================================

export interface EventHandler<T = unknown> {
  /** Unique handler ID */
  id: string;
  /** Event types this handler processes */
  eventTypes: string[];
  /** Priority (lower = higher priority) */
  priority?: number;
  /** Whether to continue processing after this handler */
  stopPropagation?: boolean;
  /** Handle the event */
  handle: (event: CloudEvent<T>) => Promise<EventHandlerResult>;
}

export interface EventHandlerResult {
  success: boolean;
  action?: string;
  entityId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Sync Engine Types
// ============================================================================

export interface SyncConfig {
  /** Sync interval in ms */
  intervalMs: number;
  /** Batch size for sync operations */
  batchSize: number;
  /** Enable automatic retry on failure */
  autoRetry: boolean;
  /** Max retries before giving up */
  maxRetries: number;
}

export interface SyncJob {
  id: string;
  partnerId: string;
  entityType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  itemsProcessed: number;
  errors: SyncError[];
}

export interface SyncError {
  timestamp: Date;
  entityId?: string;
  message: string;
  retryable: boolean;
}

// ============================================================================
// Webhook Processing Types
// ============================================================================

export interface WebhookPayload {
  /** Raw body as string */
  rawBody: string;
  /** Parsed body */
  body: unknown;
  /** Request headers */
  headers: Record<string, string | string[] | undefined>;
  /** Source partner */
  source: string;
  /** Event type */
  eventType: string;
  /** Timestamp */
  timestamp: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  eventId?: string;
  handlersExecuted: number;
  error?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Entity Mapping Types
// ============================================================================

export interface EntityMapping {
  /** Local entity type */
  localType: string;
  /** Remote entity type */
  remoteType: string;
  /** Mapping rules */
  rules: {
    fieldMappings: Record<string, string>;
    transforms: Record<string, (value: unknown) => unknown>;
    defaults: Record<string, unknown>;
  };
}

export interface MappedEntity<T> {
  local: T;
  remote: unknown;
  mappings: Record<string, string>;
}

// ============================================================================
// Connector Configuration
// ============================================================================

export interface ConnectorConfig {
  /** Connector ID */
  id: string;
  /** Partner name */
  partnerName: string;
  /** Partner category */
  category: PartnerCategory;
  /** Webhook endpoint path */
  webhookPath: string;
  /** Supported event types */
  supportedEvents: string[];
  /** Entity mappings */
  entityMappings: EntityMapping[];
  /** Sync configuration */
  syncConfig: SyncConfig;
}
