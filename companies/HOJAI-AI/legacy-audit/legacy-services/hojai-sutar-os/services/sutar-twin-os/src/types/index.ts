// ============================================================================
// SUTAR Twin OS - Type Definitions
// ============================================================================

export type TwinType = 'employee' | 'customer' | 'company' | 'merchant';
export type TwinStatus = 'active' | 'inactive' | 'suspended' | 'archived';
export type RelationshipType = 'owns' | 'manages' | 'belongs_to' | 'related_to' | 'reports_to' | 'partners_with';

export interface TwinProperty {
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  lastUpdated: string;
  source: string;
}

export interface TwinRelationship {
  id: string;
  targetTwinId: string;
  type: RelationshipType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface StateChange {
  id: string;
  timestamp: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
  changedFields: string[];
  trigger: 'update' | 'sync' | 'system' | 'manual';
  source: string;
}

export interface SyncStatus {
  lastSyncedAt: string;
  status: 'synced' | 'pending' | 'failed' | 'conflict';
  source: string;
  version: number;
  checksum?: string;
}

export interface Twin {
  id: string;
  type: TwinType;
  name: string;
  description?: string;
  status: TwinStatus;
  properties: Record<string, TwinProperty>;
  relationships: TwinRelationship[];
  stateHistory: StateChange[];
  syncStatus: SyncStatus;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateTwinRequest {
  type: TwinType;
  name: string;
  description?: string;
  properties?: Record<string, { value: unknown; type?: TwinProperty['type']; source?: string }>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateTwinRequest {
  name?: string;
  description?: string;
  status?: TwinStatus;
  properties?: Record<string, { value: unknown; type?: TwinProperty['type']; source?: string }>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface AddPropertyRequest {
  key: string;
  value: unknown;
  type?: TwinProperty['type'];
  source?: string;
}

export interface CreateRelationshipRequest {
  targetTwinId: string;
  type: RelationshipType;
  metadata?: Record<string, unknown>;
}

export interface SyncRequest {
  source: string;
  force?: boolean;
  properties?: string[];
}

export interface Config {
  port: number;
  environment: string;
  memoryBridgeUrl: string;
  identityOsUrl: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
