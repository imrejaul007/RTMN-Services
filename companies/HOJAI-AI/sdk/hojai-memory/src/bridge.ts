/**
 * Twin Memory Bridge Client (port 4704) — twin ↔ memory partition links.
 *
 * Each TwinOS twin owns its memory partition. This service manages the
 * binding of twins to memory partitions, supports bulk binding, and
 * provides read/write through the bridge.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type MemoryKind = 'episodic' | 'semantic' | 'procedural' | 'working' | 'long-term' | 'preference' | 'fact';

export interface Binding {
  twinId: string;
  kind: MemoryKind;
  partitionId: string;
  /** Whether this binding is currently active */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryStat {
  twinId: string;
  kind: MemoryKind;
  count: number;
  sizeBytes: number;
  lastAccessedAt?: string;
}

export class TwinMemoryBridgeClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) { this.config = { ...config, baseUrl: `http://localhost:4704` }; }

  async bind(twinId: string, input: { kind: MemoryKind; partitionId: string }): Promise<Binding> {
    return request<Binding>(this.config, 'POST', `/api/twins/${encodeURIComponent(twinId)}/bind`, input);
  }
  async bulkBind(input: { bindings: Array<{ twinId: string; kind: MemoryKind; partitionId: string }> }): Promise<{ count: number }> {
    return request<{ count: number }>(this.config, 'POST', '/api/bulk-bind', input);
  }
  async unbind(twinId: string, kind: MemoryKind): Promise<{ unbound: boolean }> {
    return request<{ unbound: boolean }>(this.config, 'DELETE', `/api/twins/${encodeURIComponent(twinId)}/bind/${encodeURIComponent(kind)}`);
  }
  async unbindAll(twinId: string): Promise<{ unbound: number }> {
    return request<{ unbound: number }>(this.config, 'DELETE', `/api/twins/${encodeURIComponent(twinId)}/bind`);
  }
  async getBindings(twinId: string, kind?: MemoryKind): Promise<Binding | Binding[]> {
    if (kind) return request<Binding>(this.config, 'GET', `/api/twins/${encodeURIComponent(twinId)}/binding/${encodeURIComponent(kind)}`);
    return request<Binding[]>(this.config, 'GET', `/api/twins/${encodeURIComponent(twinId)}/binding`);
  }
  async listAllBindings(input: { limit?: number } = {}): Promise<Binding[]> {
    return request<Binding[]>(this.config, 'GET', `/api/bindings${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getMemory(twinId: string, input: { kind: MemoryKind; query?: string; limit?: number }): Promise<Array<Record<string, unknown>>> {
    return request(this.config, 'GET', `/api/twins/${encodeURIComponent(twinId)}/memory${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async readMemory(twinId: string, input: { kind: MemoryKind; memoryId: string }): Promise<Record<string, unknown>> {
    return request(this.config, 'POST', `/api/twins/${encodeURIComponent(twinId)}/memory/read`, input);
  }
  async writeMemory(twinId: string, input: { kind: MemoryKind; content: Record<string, unknown> }): Promise<{ id: string }> {
    return request<{ id: string }>(this.config, 'POST', `/api/twins/${encodeURIComponent(twinId)}/memory/write`, input);
  }
  async getMemoryStat(twinId: string): Promise<MemoryStat[]> {
    return request<MemoryStat[]>(this.config, 'GET', `/api/twins/${encodeURIComponent(twinId)}/memory-stat`);
  }
  async recordPartitionAccess(partitionId: string, input: { twinId: string; kind: MemoryKind }): Promise<{ recorded: boolean }> {
    return request<{ recorded: boolean }>(this.config, 'POST', `/api/partitions/${encodeURIComponent(partitionId)}/record`, input);
  }
  async migrateMemory(twinId: string, input: { fromPartition: string; toPartition: string; kind: MemoryKind }): Promise<{ migrated: number }> {
    return request<{ migrated: number }>(this.config, 'POST', `/api/twins/${encodeURIComponent(twinId)}/migrate`, input);
  }
  async bulkResolve(input: { queries: Array<{ twinId: string; kind: MemoryKind }> }): Promise<Array<{ twinId: string; partitionId: string }>> {
    return request(this.config, 'POST', '/api/bulk-resolve', input);
  }
}
