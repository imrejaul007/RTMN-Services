/**
 * HOJAI Agent SDK - Memory
 * Memory layer integration for agents
 */

import type { MemoryEntry, MemoryContext } from './index.js';
import { v4 as uuid } from 'uuid';

// ============================================================================
// MEMORY CLIENT
// ============================================================================

export class MemoryClient {
  private entries: Map<string, MemoryEntry> = new Map();
  private userEntries: Map<string, Set<string>> = new Map();

  /**
   * Store a new memory entry
   */
  async store(
    content: string,
    type: MemoryEntry['type'],
    userId: string,
    options?: {
      category?: string;
      importance?: MemoryEntry['importance'];
      tags?: string[];
      metadata?: Record<string, unknown>;
      expiresAt?: Date;
    }
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: uuid(),
      type,
      content,
      category: options?.category,
      importance: options?.importance || 'medium',
      tags: options?.tags,
      metadata: options?.metadata,
      createdAt: new Date(),
      expiresAt: options?.expiresAt,
    };

    this.entries.set(entry.id, entry);

    if (!this.userEntries.has(userId)) {
      this.userEntries.set(userId, new Set());
    }
    this.userEntries.get(userId)!.add(entry.id);

    return entry;
  }

  /**
   * Retrieve memories by query
   */
  async recall(query: string, userId?: string, limit = 10): Promise<MemoryEntry[]> {
    const queryLower = query.toLowerCase();
    const relevant: { entry: MemoryEntry; score: number }[] = [];

    const entriesToSearch = userId ? this.getUserEntries(userId) : Array.from(this.entries.values());

    for (const entry of entriesToSearch) {
      // Skip expired entries
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        continue;
      }

      let score = 0;

      // Content match
      if (entry.content.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Category match
      if (entry.category?.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Tag match
      if (entry.tags?.some((tag) => tag.toLowerCase().includes(queryLower))) {
        score += 5;
      }

      // Importance boost
      if (entry.importance === 'high') score += 2;

      if (score > 0) {
        relevant.push({ entry, score });
      }
    }

    // Sort by score, then by date
    relevant.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.entry.createdAt.getTime() - a.entry.createdAt.getTime();
    });

    return relevant.slice(0, limit).map((r) => r.entry);
  }

  /**
   * Get all memories for a user
   */
  async getContext(userId: string): Promise<MemoryContext> {
    const entries = this.getUserEntries(userId);
    const summary = this.generateSummary(entries);

    return {
      userId,
      entries,
      summary,
    };
  }

  /**
   * Update a memory entry
   */
  async update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry | null> {
    const entry = this.entries.get(id);
    if (!entry) return null;

    const updated: MemoryEntry = {
      ...entry,
      ...updates,
      id: entry.id, // Don't allow ID change
      createdAt: entry.createdAt, // Don't allow creation date change
      updatedAt: new Date(),
    };

    this.entries.set(id, updated);
    return updated;
  }

  /**
   * Delete a memory entry
   */
  async delete(id: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) return false;

    this.entries.delete(id);

    const userSet = this.userEntries.get(entry.metadata?.userId as string);
    if (userSet) {
      userSet.delete(id);
    }

    return true;
  }

  /**
   * Clear all memories for a user
   */
  async clear(userId: string): Promise<void> {
    const userEntryIds = this.userEntries.get(userId);
    if (userEntryIds) {
      for (const id of userEntryIds) {
        this.entries.delete(id);
      }
      this.userEntries.delete(userId);
    }
  }

  /**
   * Clear expired memories
   */
  async clearExpired(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const [id, entry] of this.entries.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.entries.delete(id);
        count++;
      }
    }

    return count;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private getUserEntries(userId: string): MemoryEntry[] {
    const entryIds = this.userEntries.get(userId);
    if (!entryIds) return [];

    return Array.from(entryIds)
      .map((id) => this.entries.get(id))
      .filter((e): e is MemoryEntry => e !== undefined);
  }

  private generateSummary(entries: MemoryEntry[]): string {
    if (entries.length === 0) return '';

    const byType: Record<string, number> = {};
    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    }

    const facts = entries.filter((e) => e.type === 'fact').slice(0, 5);
    const prefs = entries.filter((e) => e.type === 'preference');

    let summary = `Memory summary: ${entries.length} entries (${Object.entries(byType).map(([t, c]) => `${c} ${t}`).join(', ')})`;

    if (facts.length > 0) {
      summary += '\n\nRecent facts:\n';
      facts.forEach((f) => {
        summary += `- ${f.content}\n`;
      });
    }

    if (prefs.length > 0) {
      summary += '\nPreferences:\n';
      prefs.slice(0, 3).forEach((p) => {
        summary += `- ${p.content}\n`;
      });
    }

    return summary;
  }
}

// ============================================================================
// GLOBAL MEMORY CLIENT (for single-instance agents)
// ============================================================================

export const globalMemory = new MemoryClient();

// Types are already imported from './index.js' at the top of the file

// ============================================================================
// MEMORY FACTORIES
// ============================================================================

/**
 * Create a fact memory
 */
export function createFactMemory(userId: string, content: string, category?: string): Promise<MemoryEntry> {
  return globalMemory.store(content, 'fact', userId, { category, importance: 'medium' });
}

/**
 * Create a preference memory
 */
export function createPreferenceMemory(userId: string, content: string, importance: MemoryEntry['importance'] = 'high'): Promise<MemoryEntry> {
  return globalMemory.store(content, 'preference', userId, { importance });
}

/**
 * Create a context memory
 */
export function createContextMemory(userId: string, content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
  return globalMemory.store(content, 'context', userId, { metadata });
}

/**
 * Create a decision memory
 */
export function createDecisionMemory(
  userId: string,
  content: string,
  context: string,
  outcome: string
): Promise<MemoryEntry> {
  return globalMemory.store(content, 'decision', userId, {
    importance: 'high',
    metadata: { context, outcome },
  });
}

/**
 * Create a conversation memory
 */
export function createConversationMemory(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  sessionId: string
): Promise<MemoryEntry> {
  return globalMemory.store(content, 'conversation', userId, {
    metadata: { role, sessionId },
  });
}
