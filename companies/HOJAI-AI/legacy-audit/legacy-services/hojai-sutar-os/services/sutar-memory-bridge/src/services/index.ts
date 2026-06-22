import type { Memory } from '../types/index';
const memories = new Map<string, Memory>();

export const memoryService = {
  get: (id: string) => memories.get(id),
  set: (id: string, m: Memory) => memories.set(id, m),
  delete: (id: string) => memories.delete(id),
  list: () => Array.from(memories.values()),
};
export const semanticSearchService = { search: (q: string) => [] };
export const analyticsService = { getStats: () => ({ total: memories.size }) };
export const versionService = { getVersions: () => [] };
export const backupService = { backup: () => 'ok', restore: () => 'ok' };
export const ttlManager = { cleanup: () => {} };
