// REST Client for Cosmic Twin Service
const COSMIC_TWIN_SERVICE_URL = process.env.COSMIC_TWIN_SERVICE_URL || 'http://localhost:5005';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

export interface TwinState {
  id: string;
  name: string;
  type: 'user' | 'product' | 'system' | 'process';
  attributes: Record<string, unknown>;
  relationships: Array<{
    targetId: string;
    type: string;
    strength: number;
  }>;
  lastUpdated: string;
  version: number;
}

export interface TwinCreate {
  name: string;
  type: 'user' | 'product' | 'system' | 'process';
  attributes: Record<string, unknown>;
}

export interface Relationship {
  sourceId: string;
  targetId: string;
  type: string;
  strength?: number;
  metadata?: Record<string, unknown>;
}

export interface Snapshot {
  id: string;
  twinId: string;
  state: TwinState;
  createdAt: string;
  label?: string;
}

export interface HistoryEntry {
  timestamp: string;
  action: string;
  previousState?: TwinState;
  newState?: TwinState;
  actor?: string;
}

export async function fetchFromCosmicTwin<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${COSMIC_TWIN_SERVICE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as T;
  } catch (error) {
    console.error(`Cosmic Twin API error (${endpoint}):`, error);
    return null;
  }
}

export async function createTwin(twin: TwinCreate): Promise<TwinState | null> {
  return fetchFromCosmicTwin<TwinState>('/api/twins', {
    method: 'POST',
    body: JSON.stringify(twin)
  });
}

export async function getTwinState(twinId: string): Promise<TwinState | null> {
  return fetchFromCosmicTwin<TwinState>(`/api/twins/${twinId}`);
}

export async function updateTwin(twinId: string, attributes: Record<string, unknown>): Promise<TwinState | null> {
  return fetchFromCosmicTwin<TwinState>(`/api/twins/${twinId}`, {
    method: 'PATCH',
    body: JSON.stringify({ attributes })
  });
}

export async function getHistory(twinId: string, limit?: number): Promise<HistoryEntry[] | null> {
  return fetchFromCosmicTwin<HistoryEntry[]>(`/api/twins/${twinId}/history?limit=${limit || 50}`);
}

export async function addRelationship(relationship: Relationship): Promise<Relationship | null> {
  return fetchFromCosmicTwin<Relationship>('/api/twins/relationships', {
    method: 'POST',
    body: JSON.stringify(relationship)
  });
}

export async function restoreSnapshot(snapshotId: string): Promise<TwinState | null> {
  return fetchFromCosmicTwin<TwinState>(`/api/snapshots/${snapshotId}/restore`, {
    method: 'POST'
  });
}
