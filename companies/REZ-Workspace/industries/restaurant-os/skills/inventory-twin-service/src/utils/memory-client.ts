/**
 * MemoryOS Client
 *
 * Bridges inventory-twin-service to HOJAI MemoryOS (port 4703).
 * Every reorder event writes a memory record so the restaurant's memory
 * captures patterns (e.g. "we reorder rice every 14 days on average",
 * "supplier X consistently delivers late").
 *
 * This is the implementation of the vision's "Memory" pillar. The memory
 * records are searchable later via MemoryOS /api/memories/search and
 * inform the SUTAR agent's future negotiations.
 *
 * Auth: MemoryOS uses CorpID JWT auth (see HOJAI/platform/memory/memory-os/src/auth.js).
 * Service-to-service callers should either:
 *   1. Set REQUIRE_AUTH=false on MemoryOS in dev, OR
 *   2. Issue a system CorpID token via the corpID /auth/system endpoint
 *      and set MEMORY_OS_SYSTEM_TOKEN here.
 *
 * Fail-open: if MemoryOS is unreachable, the memory write is skipped
 * (logged as a warning) but the reorder proceeds.
 */

import { logger } from './logger';

const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';
const MEMORY_OS_SYSTEM_TOKEN = process.env.MEMORY_OS_SYSTEM_TOKEN || '';
const REQUEST_TIMEOUT_MS = 3000;

export type MemoryImportance = 'Critical' | 'High' | 'Medium' | 'Low' | 'Trivial';
export type MemoryType =
  | 'general'
  | 'factual'
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'preference'
  | 'observational';

export interface MemoryRecord {
  twinId: string;
  type: MemoryType;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  importance?: MemoryImportance;
}

export interface MemoryWriteResult {
  ok: boolean;
  memoryId?: string;
  error?: string;
  skipped: boolean;
}

export class MemoryOsClient {
  /**
   * Write a memory record. If MemoryOS is unreachable or auth fails,
   * returns ok=false with skipped=true so callers can continue.
   */
  async writeMemory(record: MemoryRecord): Promise<MemoryWriteResult> {
    const url = `${MEMORY_OS_URL}/api/memories`;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (MEMORY_OS_SYSTEM_TOKEN) {
      headers['authorization'] = `Bearer ${MEMORY_OS_SYSTEM_TOKEN}`;
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          twinId: record.twinId,
          type: record.type,
          content: record.content,
          tags: record.tags || [],
          metadata: record.metadata || {},
          importance: record.importance || 'Medium',
          visibility: 'private',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutHandle);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.warn('MemoryOS write failed', {
          status: res.status,
          body: text.slice(0, 200),
        });
        return { ok: false, error: `HTTP ${res.status}`, skipped: true };
      }

      const json = (await res.json()) as { success?: boolean; data?: { id?: string }; error?: string };
      if (!json.success || !json.data?.id) {
        logger.warn('MemoryOS write returned non-success', { json });
        return { ok: false, error: json.error || 'unknown error', skipped: true };
      }

      logger.info('Memory written', {
        memoryId: json.data.id,
        twinId: record.twinId,
        type: record.type,
      });
      return { ok: true, memoryId: json.data.id, skipped: false };
    } catch (err) {
      clearTimeout(timeoutHandle);
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('MemoryOS write threw', { error: message });
      return { ok: false, error: message, skipped: true };
    }
  }

  /**
   * Search memories for a twin. Used by agents to recall past reorder patterns.
   */
  async searchMemories(opts: {
    twinId: string;
    query?: string;
    tags?: string[];
    limit?: number;
  }): Promise<unknown[]> {
    const params = new URLSearchParams({ twinId: opts.twinId });
    if (opts.query) params.append('q', opts.query);
    if (opts.tags && opts.tags.length > 0) params.append('tags', opts.tags.join(','));
    if (opts.limit) params.append('limit', String(opts.limit));

    const url = `${MEMORY_OS_URL}/api/memories/search?${params.toString()}`;
    const headers: Record<string, string> = {};
    if (MEMORY_OS_SYSTEM_TOKEN) {
      headers['authorization'] = `Bearer ${MEMORY_OS_SYSTEM_TOKEN}`;
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutHandle);
      if (!res.ok) return [];
      const json = (await res.json()) as { success?: boolean; data?: unknown[] };
      return json.data || [];
    } catch (err) {
      clearTimeout(timeoutHandle);
      return [];
    }
  }
}

export const memoryOsClient = new MemoryOsClient();