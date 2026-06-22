/**
 * GENIE Memory Service - Memory Service
 * Version: 1.0.0 | Date: May 31, 2026
 * Purpose: Business logic for memory operations
 */

import { v4 as uuidv4 } from 'uuid';
import { MemoryModel, IMemoryDocument } from '../models/index.js';
import {
  Memory,
  MemoryInput,
  MemoryUpdateInput,
  MemorySearchOptions,
  CreateMemoryInput,
  UpdateMemoryInput,
  ListMemoriesQuery,
} from '../types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('memory-service');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert Mongoose document to Memory interface
 */
function documentToMemory(doc: IMemoryDocument): Memory {
  return {
    id: doc.id,
    user_id: doc.user_id,
    content: doc.content,
    summary: doc.summary,
    category: doc.category,
    tags: doc.tags,
    entities: doc.entities,
    importance: doc.importance,
    emotional_tone: doc.emotional_tone,
    source: doc.source,
    context: doc.context,
    related_memory_ids: doc.related_memory_ids,
    recall_count: doc.recall_count,
    last_recalled: doc.last_recalled?.toISOString(),
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at?.toISOString(),
    expires_at: doc.expires_at?.toISOString(),
  };
}

/**
 * Extract entities from content (simple implementation)
 */
function extractEntities(content: string): string[] {
  // Simple entity extraction - in production, use NLP
  const entities: string[] = [];
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}/g;
  const urlRegex = /https?:\/\/[^\s]+/g;

  const emails = content.match(emailRegex);
  const phones = content.match(phoneRegex);
  const urls = content.match(urlRegex);

  if (emails) entities.push(...emails);
  if (phones) entities.push(...phones);
  if (urls) entities.push(...urls);

  return [...new Set(entities)];
}

/**
 * Generate a summary from content
 */
function generateSummary(content: string): string {
  // Simple summarization - take first 100 chars
  if (content.length <= 100) return content;
  return content.substring(0, 97) + '...';
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new memory
 */
export async function createMemory(
  userId: string,
  input: CreateMemoryInput
): Promise<Memory> {
  logger.info('create_memory', { userId, category: input.category });

  const id = uuidv4();
  const entities = extractEntities(input.content);

  const memoryData = {
    id,
    user_id: userId,
    content: input.content,
    summary: input.summary || generateSummary(input.content),
    category: input.category,
    tags: input.tags || [],
    entities,
    importance: input.importance || 'medium',
    emotional_tone: input.emotional_tone,
    source: input.source || 'user_input',
    context: input.context,
    related_memory_ids: [],
    recall_count: 0,
    expires_at: input.expires_at ? new Date(input.expires_at) : undefined,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const doc = new MemoryModel(memoryData);
  await doc.save();

  logger.info('memory_created', { id, userId });

  return documentToMemory(doc);
}

/**
 * Get a memory by ID
 */
export async function getMemoryById(
  memoryId: string,
  userId: string
): Promise<Memory | null> {
  logger.info('get_memory_by_id', { memoryId, userId });

  const doc = await MemoryModel.findOne({ id: memoryId, user_id: userId }).exec();
  if (!doc) {
    return null;
  }

  return documentToMemory(doc);
}

/**
 * List memories with pagination
 */
export async function listMemories(
  userId: string,
  query: ListMemoriesQuery
): Promise<{ memories: Memory[]; total: number; page: number; pageSize: number }> {
  logger.info('list_memories', { userId, query });

  const { page, pageSize, category, importance, sort_by, order } = query;
  const skip = (page - 1) * pageSize;

  const filter: Record<string, unknown> = { user_id: userId };

  if (category) {
    filter.category = category;
  }

  if (importance) {
    filter.importance = importance;
  }

  // Build sort object
  const sort: Record<string, 1 | -1> = {};
  sort[sort_by] = order === 'asc' ? 1 : -1;

  const [docs, total] = await Promise.all([
    MemoryModel.find(filter).sort(sort).skip(skip).limit(pageSize).exec(),
    MemoryModel.countDocuments(filter).exec(),
  ]);

  return {
    memories: docs.map(documentToMemory),
    total,
    page,
    pageSize,
  };
}

/**
 * Update a memory
 */
export async function updateMemory(
  memoryId: string,
  userId: string,
  input: UpdateMemoryInput
): Promise<Memory | null> {
  logger.info('update_memory', { memoryId, userId });

  const doc = await MemoryModel.findOne({ id: memoryId, user_id: userId }).exec();
  if (!doc) {
    return null;
  }

  // Update fields if provided
  if (input.content !== undefined) {
    doc.content = input.content;
    doc.summary = input.summary || generateSummary(input.content);
    doc.entities = extractEntities(input.content);
  }
  if (input.summary !== undefined) doc.summary = input.summary;
  if (input.category !== undefined) doc.category = input.category;
  if (input.tags !== undefined) doc.tags = input.tags;
  if (input.importance !== undefined) doc.importance = input.importance;
  if (input.emotional_tone !== undefined) doc.emotional_tone = input.emotional_tone;
  if (input.related_memory_ids !== undefined) doc.related_memory_ids = input.related_memory_ids;
  if (input.expires_at !== undefined) {
    doc.expires_at = input.expires_at ? new Date(input.expires_at) : undefined;
  }

  await doc.save();

  logger.info('memory_updated', { memoryId, userId });

  return documentToMemory(doc);
}

/**
 * Delete a memory
 */
export async function deleteMemory(
  memoryId: string,
  userId: string
): Promise<boolean> {
  logger.info('delete_memory', { memoryId, userId });

  const result = await MemoryModel.deleteOne({ id: memoryId, user_id: userId }).exec();
  return result.deletedCount > 0;
}

/**
 * Search memories
 */
export async function searchMemories(
  userId: string,
  options: MemorySearchOptions
): Promise<Memory[]> {
  logger.info('search_memories', { userId, options });

  const { query, category, tags, importance, start_date, end_date, limit = 20, offset = 0 } = options;

  const filter: Record<string, unknown> = { user_id: userId };

  // Text search
  if (query) {
    filter.$text = { $search: query };
  }

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Tags filter
  if (tags && tags.length > 0) {
    filter.tags = { $all: tags };
  }

  // Importance filter
  if (importance) {
    filter.importance = importance;
  }

  // Date range
  if (start_date || end_date) {
    filter.created_at = {};
    if (start_date) {
      (filter.created_at as Record<string, Date>).$gte = new Date(start_date);
    }
    if (end_date) {
      (filter.created_at as Record<string, Date>).$lte = new Date(end_date);
    }
  }

  // Query with text score if searching
  let docs;
  if (query) {
    docs = await MemoryModel.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(offset)
      .limit(limit)
      .exec();
  } else {
    docs = await MemoryModel.find(filter)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
  }

  return docs.map(documentToMemory);
}

/**
 * Recall memories (increment recall count)
 */
export async function recallMemories(
  memoryIds: string[],
  userId: string
): Promise<Memory[]> {
  logger.info('recall_memories', { userId, count: memoryIds.length });

  const now = new Date();

  const docs = await MemoryModel.find({
    id: { $in: memoryIds },
    user_id: userId
  }).exec();

  const recalled: Memory[] = [];

  for (const doc of docs) {
    doc.recall_count += 1;
    doc.last_recalled = now;
    await doc.save();
    recalled.push(documentToMemory(doc));
  }

  logger.info('memories_recalled', { userId, count: recalled.length });

  return recalled;
}

/**
 * Add tags to a memory
 */
export async function addTags(
  memoryId: string,
  userId: string,
  tags: string[]
): Promise<Memory | null> {
  logger.info('add_tags', { memoryId, userId, tags });

  const doc = await MemoryModel.findOne({ id: memoryId, user_id: userId }).exec();
  if (!doc) {
    return null;
  }

  // Add unique tags
  const existingTags = new Set(doc.tags);
  for (const tag of tags) {
    if (!existingTags.has(tag)) {
      doc.tags.push(tag);
    }
  }

  await doc.save();

  logger.info('tags_added', { memoryId, userId, added: tags.length });

  return documentToMemory(doc);
}

/**
 * Remove tags from a memory
 */
export async function removeTags(
  memoryId: string,
  userId: string,
  tags: string[]
): Promise<Memory | null> {
  logger.info('remove_tags', { memoryId, userId, tags });

  const doc = await MemoryModel.findOne({ id: memoryId, user_id: userId }).exec();
  if (!doc) {
    return null;
  }

  doc.tags = doc.tags.filter(t => !tags.includes(t));
  await doc.save();

  logger.info('tags_removed', { memoryId, userId, removed: tags.length });

  return documentToMemory(doc);
}

/**
 * Link memories together
 */
export async function linkMemories(
  memoryId: string,
  userId: string,
  relatedMemoryIds: string[]
): Promise<Memory | null> {
  logger.info('link_memories', { memoryId, userId, relatedCount: relatedMemoryIds.length });

  const doc = await MemoryModel.findOne({ id: memoryId, user_id: userId }).exec();
  if (!doc) {
    return null;
  }

  // Add unique related memory IDs
  const existingIds = new Set(doc.related_memory_ids);
  for (const id of relatedMemoryIds) {
    if (!existingIds.has(id)) {
      doc.related_memory_ids.push(id);
    }
  }

  await doc.save();

  logger.info('memories_linked', { memoryId, userId });

  return documentToMemory(doc);
}

/**
 * Get memory statistics for a user
 */
export async function getMemoryStats(userId: string): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byImportance: Record<string, number>;
  recentCount: number;
}> {
  logger.info('get_memory_stats', { userId });

  const [total, categoryStats, importanceStats] = await Promise.all([
    MemoryModel.countDocuments({ user_id: userId }),
    MemoryModel.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]),
    MemoryModel.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: '$importance', count: { $sum: 1 } } }
    ]),
  ]);

  // Calculate recent count (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentCount = await MemoryModel.countDocuments({
    user_id: userId,
    created_at: { $gte: sevenDaysAgo }
  });

  const byCategory: Record<string, number> = {};
  for (const stat of categoryStats) {
    byCategory[stat._id] = stat.count;
  }

  const byImportance: Record<string, number> = {};
  for (const stat of importanceStats) {
    byImportance[stat._id] = stat.count;
  }

  return {
    total,
    byCategory,
    byImportance,
    recentCount,
  };
}

/**
 * Get timeline of memories (chronological view)
 */
export async function getMemoryTimeline(
  userId: string,
  limit: number = 50
): Promise<{ date: string; memories: Memory[] }[]> {
  logger.info('get_memory_timeline', { userId, limit });

  const docs = await MemoryModel.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(limit)
    .exec();

  // Group by date
  const timelineMap = new Map<string, Memory[]>();

  for (const doc of docs) {
    const date = doc.created_at.toISOString().split('T')[0];
    const existing = timelineMap.get(date) || [];
    existing.push(documentToMemory(doc));
    timelineMap.set(date, existing);
  }

  // Convert to array
  const timeline: { date: string; memories: Memory[] }[] = [];
  for (const [date, memories] of timelineMap.entries()) {
    timeline.push({ date, memories });
  }

  return timeline.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Delete expired memories
 */
export async function deleteExpiredMemories(): Promise<number> {
  logger.info('delete_expired_memories');

  const now = new Date();
  const result = await MemoryModel.deleteMany({
    expires_at: { $lt: now }
  }).exec();

  logger.info('expired_memories_deleted', { count: result.deletedCount });

  return result.deletedCount;
}
