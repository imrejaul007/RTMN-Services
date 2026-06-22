/**
 * Executive Assistant - Memory Tool
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Long-term memory storage and retrieval for personal assistant
 */

import { z } from 'zod';
import type { Tool, ToolResult } from '../../core/src/BaseAgent.js';

// ============================================================================
// Memory Data Store (In-Memory)
// ============================================================================

interface MemoryEntry {
  id: string;
  type: 'fact' | 'preference' | 'conversation' | 'event' | 'person';
  content: string;
  category?: string;
  importance: 'low' | 'medium' | 'high';
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  accessedAt?: Date;
  accessCount: number;
}

class MemoryStore {
  private memories: Map<string, MemoryEntry> = new Map();
  private index: Map<string, Set<string>> = new Map(); // word -> memory IDs

  add(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): MemoryEntry {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const newEntry: MemoryEntry = {
      ...entry,
      id,
      accessCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.memories.set(id, newEntry);
    this.indexEntry(newEntry);
    return newEntry;
  }

  get(id: string): MemoryEntry | undefined {
    const entry = this.memories.get(id);
    if (entry) {
      entry.accessedAt = new Date();
      entry.accessCount++;
    }
    return entry;
  }

  recall(query: string, limit = 10): MemoryEntry[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const scored = new Map<string, { entry: MemoryEntry; score: number }>();

    for (const entry of this.memories.values()) {
      let score = 0;
      const contentLower = entry.content.toLowerCase();

      // Check for exact matches
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 10;
        }
      }

      // Check category match
      if (entry.category && query.toLowerCase().includes(entry.category.toLowerCase())) {
        score += 5;
      }

      // Check tags
      if (entry.tags) {
        for (const tag of entry.tags) {
          if (queryWords.some(w => tag.toLowerCase().includes(w))) {
            score += 3;
          }
        }
      }

      // Boost for recent access
      if (entry.accessedAt) {
        const hoursSinceAccess = (Date.now() - entry.accessedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceAccess < 24) {
          score += 5;
        } else if (hoursSinceAccess < 168) { // 1 week
          score += 2;
        }
      }

      // Boost for importance
      if (entry.importance === 'high') {
        score *= 1.5;
      }

      if (score > 0) {
        scored.set(entry.id, { entry, score });
      }
    }

    // Sort by score descending
    const results = Array.from(scored.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.entry);

    // Update access stats
    for (const entry of results) {
      entry.accessedAt = new Date();
      entry.accessCount++;
    }

    return results;
  }

  searchByCategory(category: string, limit = 10): MemoryEntry[] {
    return Array.from(this.memories.values())
      .filter(e => e.category?.toLowerCase() === category.toLowerCase())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  searchByType(type: MemoryEntry['type'], limit = 10): MemoryEntry[] {
    return Array.from(this.memories.values())
      .filter(e => e.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  update(id: string, updates: Partial<MemoryEntry>): MemoryEntry | undefined {
    const entry = this.memories.get(id);
    if (!entry) return undefined;

    // Remove old index
    this.deindexEntry(entry);

    const updated: MemoryEntry = {
      ...entry,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.memories.set(id, updated);
    this.indexEntry(updated);

    return updated;
  }

  delete(id: string): boolean {
    const entry = this.memories.get(id);
    if (entry) {
      this.deindexEntry(entry);
    }
    return this.memories.delete(id);
  }

  getRecent(limit = 10): MemoryEntry[] {
    return Array.from(this.memories.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getMostAccessed(limit = 10): MemoryEntry[] {
    return Array.from(this.memories.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  getStats(): { total: number; byType: Record<string, number>; totalAccesses: number } {
    const byType: Record<string, number> = {};
    let totalAccesses = 0;

    for (const entry of this.memories.values()) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      totalAccesses += entry.accessCount;
    }

    return {
      total: this.memories.size,
      byType,
      totalAccesses,
    };
  }

  private indexEntry(entry: MemoryEntry): void {
    const words = entry.content.toLowerCase().split(/\s+/);
    for (const word of words) {
      const cleaned = word.replace(/[^a-z0-9]/g, '');
      if (cleaned.length > 2) {
        if (!this.index.has(cleaned)) {
          this.index.set(cleaned, new Set());
        }
        this.index.get(cleaned)!.add(entry.id);
      }
    }
    // Index category
    if (entry.category) {
      const cat = entry.category.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!this.index.has(cat)) {
        this.index.set(cat, new Set());
      }
      this.index.get(cat)!.add(entry.id);
    }
  }

  private deindexEntry(entry: MemoryEntry): void {
    const words = entry.content.toLowerCase().split(/\s+/);
    for (const word of words) {
      const cleaned = word.replace(/[^a-z0-9]/g, '');
      this.index.get(cleaned)?.delete(entry.id);
    }
    if (entry.category) {
      const cat = entry.category.toLowerCase().replace(/[^a-z0-9]/g, '');
      this.index.get(cat)?.delete(entry.id);
    }
  }

  clear(): void {
    this.memories.clear();
    this.index.clear();
  }
}

const memoryStore = new MemoryStore();

// ============================================================================
// Parameter Schemas
// ============================================================================

const SaveMemorySchema = z.object({
  content: z.string().min(1).describe('Memory content to save'),
  type: z.enum(['fact', 'preference', 'conversation', 'event', 'person']).describe('Memory type'),
  category: z.string().optional().describe('Memory category'),
  importance: z.enum(['low', 'medium', 'high']).optional().describe('Memory importance'),
  tags: z.array(z.string()).optional().describe('Memory tags'),
  metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
});

const RecallMemorySchema = z.object({
  query: z.string().min(1).describe('Search query'),
  limit: z.number().min(1).max(100).optional().describe('Max results'),
});

const GetMemorySchema = z.object({
  memoryId: z.string().describe('Memory ID to retrieve'),
});

const UpdateMemorySchema = z.object({
  memoryId: z.string().describe('Memory ID to update'),
  content: z.string().optional(),
  category: z.string().optional(),
  importance: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string()).optional(),
});

const DeleteMemorySchema = z.object({
  memoryId: z.string().describe('Memory ID to delete'),
});

const GetMemoriesByCategorySchema = z.object({
  category: z.string().describe('Category to filter by'),
  limit: z.number().min(1).max(100).optional(),
});

const GetMemoriesByTypeSchema = z.object({
  type: z.enum(['fact', 'preference', 'conversation', 'event', 'person']).describe('Type to filter by'),
  limit: z.number().min(1).max(100).optional(),
});

const GetRecentMemoriesSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
});

const GetMostAccessedMemoriesSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
});

const GetMemoryStatsSchema = z.object({});

// ============================================================================
// Tool Implementations
// ============================================================================

async function saveMemoryHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = SaveMemorySchema.parse(params);

    const memory = memoryStore.add({
      content: args.content,
      type: args.type,
      category: args.category,
      importance: args.importance || 'medium',
      tags: args.tags,
      metadata: args.metadata,
    });

    return {
      success: true,
      data: {
        memoryId: memory.id,
        type: memory.type,
        content: memory.content,
        message: `Memory saved successfully (${memory.type})`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save memory',
    };
  }
}

async function recallMemoryHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = RecallMemorySchema.parse(params);
    const memories = memoryStore.recall(args.query, args.limit || 10);

    return {
      success: true,
      data: {
        memories: memories.map(m => ({
          id: m.id,
          type: m.type,
          content: m.content,
          category: m.category,
          importance: m.importance,
          tags: m.tags,
          createdAt: m.createdAt.toISOString(),
          accessedAt: m.accessedAt?.toISOString(),
        })),
        count: memories.length,
        query: args.query,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to recall memories',
    };
  }
}

async function getMemoryHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetMemorySchema.parse(params);
    const memory = memoryStore.get(args.memoryId);

    if (!memory) {
      return {
        success: false,
        error: `Memory with ID "${args.memoryId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        id: memory.id,
        type: memory.type,
        content: memory.content,
        category: memory.category,
        importance: memory.importance,
        tags: memory.tags,
        metadata: memory.metadata,
        createdAt: memory.createdAt.toISOString(),
        updatedAt: memory.updatedAt.toISOString(),
        accessedAt: memory.accessedAt?.toISOString(),
        accessCount: memory.accessCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get memory',
    };
  }
}

async function updateMemoryHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = UpdateMemorySchema.parse(params);
    const updates: Partial<MemoryEntry> = {};

    if (args.content) updates.content = args.content;
    if (args.category) updates.category = args.category;
    if (args.importance) updates.importance = args.importance;
    if (args.tags) updates.tags = args.tags;

    const memory = memoryStore.update(args.memoryId, updates);

    if (!memory) {
      return {
        success: false,
        error: `Memory with ID "${args.memoryId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        memoryId: memory.id,
        message: 'Memory updated successfully',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update memory',
    };
  }
}

async function deleteMemoryHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = DeleteMemorySchema.parse(params);
    const deleted = memoryStore.delete(args.memoryId);

    if (!deleted) {
      return {
        success: false,
        error: `Memory with ID "${args.memoryId}" not found`,
      };
    }

    return {
      success: true,
      data: {
        memoryId: args.memoryId,
        message: 'Memory deleted successfully',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete memory',
    };
  }
}

async function getMemoriesByCategoryHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetMemoriesByCategorySchema.parse(params);
    const memories = memoryStore.searchByCategory(args.category, args.limit || 10);

    return {
      success: true,
      data: {
        category: args.category,
        memories: memories.map(m => ({
          id: m.id,
          type: m.type,
          content: m.content,
          importance: m.importance,
          createdAt: m.createdAt.toISOString(),
        })),
        count: memories.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get memories by category',
    };
  }
}

async function getMemoriesByTypeHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetMemoriesByTypeSchema.parse(params);
    const memories = memoryStore.searchByType(args.type, args.limit || 10);

    return {
      success: true,
      data: {
        type: args.type,
        memories: memories.map(m => ({
          id: m.id,
          content: m.content,
          category: m.category,
          importance: m.importance,
          createdAt: m.createdAt.toISOString(),
        })),
        count: memories.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get memories by type',
    };
  }
}

async function getRecentMemoriesHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetRecentMemoriesSchema.parse(params);
    const memories = memoryStore.getRecent(args.limit || 10);

    return {
      success: true,
      data: {
        memories: memories.map(m => ({
          id: m.id,
          type: m.type,
          content: m.content,
          category: m.category,
          createdAt: m.createdAt.toISOString(),
        })),
        count: memories.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get recent memories',
    };
  }
}

async function getMostAccessedMemoriesHandler(params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const args = GetMostAccessedMemoriesSchema.parse(params);
    const memories = memoryStore.getMostAccessed(args.limit || 10);

    return {
      success: true,
      data: {
        memories: memories.map(m => ({
          id: m.id,
          type: m.type,
          content: m.content,
          category: m.category,
          accessCount: m.accessCount,
        })),
        count: memories.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get most accessed memories',
    };
  }
}

async function getMemoryStatsHandler(_params: Record<string, unknown>): Promise<ToolResult> {
  try {
    const stats = memoryStore.getStats();

    return {
      success: true,
      data: {
        totalMemories: stats.total,
        byType: stats.byType,
        totalAccesses: stats.totalAccesses,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get memory stats',
    };
  }
}

// ============================================================================
// Memory Tools Export
// ============================================================================

export const memoryTools: Tool[] = [
  {
    name: 'save_memory',
    description: 'Save information to long-term memory',
    parameters: [
      { name: 'content', description: 'Content to remember', schema: z.string().min(1) },
      { name: 'type', description: 'Type of memory (fact, preference, conversation, event, person)', schema: z.enum(['fact', 'preference', 'conversation', 'event', 'person']) },
      { name: 'category', description: 'Category (optional)', schema: z.string().optional() },
      { name: 'importance', description: 'Importance level (optional)', schema: z.enum(['low', 'medium', 'high']).optional() },
      { name: 'tags', description: 'Tags for organization (optional)', schema: z.array(z.string()).optional() },
    ],
    execute: saveMemoryHandler,
  },
  {
    name: 'recall_memory',
    description: 'Search and retrieve memories by query',
    parameters: [
      { name: 'query', description: 'Search query', schema: z.string().min(1) },
      { name: 'limit', description: 'Max results (optional)', schema: z.number().min(1).max(100).optional() },
    ],
    execute: recallMemoryHandler,
  },
  {
    name: 'get_memory',
    description: 'Get a specific memory by ID',
    parameters: [
      { name: 'memoryId', description: 'Memory ID', schema: z.string() },
    ],
    execute: getMemoryHandler,
  },
  {
    name: 'update_memory',
    description: 'Update an existing memory',
    parameters: [
      { name: 'memoryId', description: 'Memory ID to update', schema: z.string() },
      { name: 'content', description: 'New content (optional)', schema: z.string().optional() },
      { name: 'category', description: 'New category (optional)', schema: z.string().optional() },
      { name: 'importance', description: 'New importance (optional)', schema: z.enum(['low', 'medium', 'high']).optional() },
      { name: 'tags', description: 'New tags (optional)', schema: z.array(z.string()).optional() },
    ],
    execute: updateMemoryHandler,
  },
  {
    name: 'delete_memory',
    description: 'Delete a memory',
    parameters: [
      { name: 'memoryId', description: 'Memory ID to delete', schema: z.string() },
    ],
    execute: deleteMemoryHandler,
  },
  {
    name: 'get_memories_by_category',
    description: 'Get all memories in a category',
    parameters: [
      { name: 'category', description: 'Category name', schema: z.string() },
      { name: 'limit', description: 'Max results (optional)', schema: z.number().min(1).max(100).optional() },
    ],
    execute: getMemoriesByCategoryHandler,
  },
  {
    name: 'get_memories_by_type',
    description: 'Get all memories of a specific type',
    parameters: [
      { name: 'type', description: 'Memory type', schema: z.enum(['fact', 'preference', 'conversation', 'event', 'person']) },
      { name: 'limit', description: 'Max results (optional)', schema: z.number().min(1).max(100).optional() },
    ],
    execute: getMemoriesByTypeHandler,
  },
  {
    name: 'get_recent_memories',
    description: 'Get recently saved memories',
    parameters: [
      { name: 'limit', description: 'Max results (optional)', schema: z.number().min(1).max(100).optional() },
    ],
    execute: getRecentMemoriesHandler,
  },
  {
    name: 'get_most_accessed_memories',
    description: 'Get most frequently accessed memories',
    parameters: [
      { name: 'limit', description: 'Max results (optional)', schema: z.number().min(1).max(100).optional() },
    ],
    execute: getMostAccessedMemoriesHandler,
  },
  {
    name: 'get_memory_stats',
    description: 'Get memory statistics',
    parameters: [],
    execute: getMemoryStatsHandler,
  },
];

// Export the store for testing
export { MemoryStore, memoryStore };
