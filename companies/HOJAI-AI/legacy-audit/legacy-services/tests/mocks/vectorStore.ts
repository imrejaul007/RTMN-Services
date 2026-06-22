/**
 * Mock Vector Store for Testing
 *
 * Provides an in-memory mock implementation of the vector store interface
 * for use in unit tests without needing a real vector database.
 *
 * @example
 * ```typescript
 * import { createMockVectorStore } from './mocks/vectorStore';
 *
 * describe('Vector Store Tests', () => {
 *   it('should store and retrieve embeddings', async () => {
 *     const store = createMockVectorStore();
 *     await store.insert({ id: '1', vector: [0.1, 0.2], text: 'hello' });
 *     const results = await store.search([0.1, 0.2], 1);
 *     expect(results).toHaveLength(1);
 *   });
 * });
 * ```
 */

import { vi, SpyInstance } from 'vitest';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Vector embedding with metadata
 */
export interface EmbeddingRecord {
  id: string;
  vector: number[];
  text: string;
  metadata?: Record<string, unknown>;
  namespace?: string;
  createdAt?: Date;
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for mock vector store
 */
export interface MockVectorStoreConfig {
  /** Default dimension for embeddings */
  dimension?: number;
  /** Simulate search latency */
  latencyMs?: number;
  /** Enable similarity calculations */
  enableSimilarity?: boolean;
  /** Pre-populate with sample data */
  sampleData?: EmbeddingRecord[];
}

/**
 * Mock vector store instance
 */
export interface MockVectorStore {
  /** Insert an embedding */
  insert: (record: EmbeddingRecord) => Promise<void>;
  /** Insert multiple embeddings */
  insertMany: (records: EmbeddingRecord[]) => Promise<void>;
  /** Search for similar embeddings */
  search: (query: number[], topK?: number, namespace?: string) => Promise<SearchResult[]>;
  /** Delete an embedding by ID */
  delete: (id: string) => Promise<boolean>;
  /** Get embedding by ID */
  getById: (id: string) => Promise<EmbeddingRecord | null>;
  /** Get all embeddings in a namespace */
  getByNamespace: (namespace: string) => Promise<EmbeddingRecord[]>;
  /** Clear all data */
  clear: () => Promise<void>;
  /** Upsert (insert or update) */
  upsert: (record: EmbeddingRecord) => Promise<void>;
  /** Count total embeddings */
  count: (namespace?: string) => Promise<number>;
  /** Spies for tracking calls */
  spies: {
    insert: SpyInstance;
    search: SpyInstance;
    delete: SpyInstance;
  };
}

// ============================================================================
// COSINE SIMILARITY
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }

  return Math.sqrt(sum);
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an in-memory mock vector store
 */
export function createMockVectorStore(config: MockVectorStoreConfig = {}): MockVectorStore {
  const {
    dimension = 1536,
    latencyMs = 0,
    enableSimilarity = true,
    sampleData = [],
  } = config;

  // In-memory storage
  const embeddings = new Map<string, EmbeddingRecord>();

  // Create spies
  const insertSpy = vi.fn();
  const searchSpy = vi.fn();
  const deleteSpy = vi.fn();

  // Initialize with sample data
  for (const record of sampleData) {
    embeddings.set(record.id, {
      ...record,
      createdAt: record.createdAt || new Date(),
    });
  }

  /**
   * Insert a single embedding
   */
  const insert = async (record: EmbeddingRecord): Promise<void> => {
    insertSpy(record);

    // Simulate latency
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    // Validate dimension
    if (record.vector.length !== dimension) {
      throw new Error(
        `Vector dimension mismatch: expected ${dimension}, got ${record.vector.length}`
      );
    }

    embeddings.set(record.id, {
      ...record,
      createdAt: new Date(),
    });
  };

  /**
   * Insert multiple embeddings
   */
  const insertMany = async (records: EmbeddingRecord[]): Promise<void> => {
    for (const record of records) {
      await insert(record);
    }
  };

  /**
   * Search for similar embeddings
   */
  const search = async (
    query: number[],
    topK = 10,
    namespace?: string
  ): Promise<SearchResult[]> => {
    searchSpy(query, topK, namespace);

    // Simulate latency
    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    // Filter by namespace if specified
    let results = Array.from(embeddings.values());
    if (namespace) {
      results = results.filter((r) => r.namespace === namespace);
    }

    // Calculate similarity scores
    if (enableSimilarity) {
      results = results.map((record) => ({
        id: record.id,
        score: cosineSimilarity(query, record.vector),
        text: record.text,
        metadata: record.metadata,
      }));

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);
    } else {
      // Just return with dummy scores
      results = results.map((record) => ({
        id: record.id,
        score: 1.0,
        text: record.text,
        metadata: record.metadata,
      }));
    }

    // Return top K results
    return results.slice(0, topK);
  };

  /**
   * Delete an embedding by ID
   */
  const deleteRecord = async (id: string): Promise<boolean> => {
    deleteSpy(id);
    return embeddings.delete(id);
  };

  /**
   * Get an embedding by ID
   */
  const getById = async (id: string): Promise<EmbeddingRecord | null> => {
    return embeddings.get(id) || null;
  };

  /**
   * Get all embeddings in a namespace
   */
  const getByNamespace = async (namespace: string): Promise<EmbeddingRecord[]> => {
    return Array.from(embeddings.values()).filter((r) => r.namespace === namespace);
  };

  /**
   * Clear all embeddings
   */
  const clear = async (): Promise<void> => {
    embeddings.clear();
  };

  /**
   * Upsert (insert or update) an embedding
   */
  const upsert = async (record: EmbeddingRecord): Promise<void> => {
    if (embeddings.has(record.id)) {
      const existing = embeddings.get(record.id)!;
      embeddings.set(record.id, {
        ...existing,
        ...record,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      });
    } else {
      await insert(record);
    }
  };

  /**
   * Count embeddings
   */
  const count = async (namespace?: string): Promise<number> => {
    if (namespace) {
      return Array.from(embeddings.values()).filter(
        (r) => r.namespace === namespace
      ).length;
    }
    return embeddings.size;
  };

  return {
    insert,
    insertMany,
    search,
    delete: deleteRecord,
    getById,
    getByNamespace,
    clear,
    upsert,
    count,
    spies: {
      insert: insertSpy,
      search: searchSpy,
      delete: deleteSpy,
    },
  };
}

// ============================================================================
// PRE-BUILT MOCK STORES
// ============================================================================

/**
 * Create a vector store with sample data
 */
export function createPopulatedVectorStore(): MockVectorStore {
  const sampleEmbeddings: EmbeddingRecord[] = [
    {
      id: 'doc-1',
      vector: normalizeVector([0.1, 0.2, 0.3, 0.4]),
      text: 'The quick brown fox jumps over the lazy dog',
      metadata: { source: 'sample', category: 'animals' },
      namespace: 'documents',
    },
    {
      id: 'doc-2',
      vector: normalizeVector([0.5, 0.6, 0.7, 0.8]),
      text: 'Machine learning is a subset of artificial intelligence',
      metadata: { source: 'sample', category: 'tech' },
      namespace: 'documents',
    },
    {
      id: 'doc-3',
      vector: normalizeVector([0.2, 0.3, 0.4, 0.5]),
      text: 'Natural language processing deals with text understanding',
      metadata: { source: 'sample', category: 'tech' },
      namespace: 'documents',
    },
    {
      id: 'user-1',
      vector: normalizeVector([0.9, 0.1, 0.1, 0.1]),
      text: 'User preference for sports content',
      metadata: { userId: 'user-123' },
      namespace: 'user-preferences',
    },
    {
      id: 'user-2',
      vector: normalizeVector([0.1, 0.9, 0.1, 0.1]),
      text: 'User preference for technology content',
      metadata: { userId: 'user-456' },
      namespace: 'user-preferences',
    },
  ];

  return createMockVectorStore({
    dimension: 4,
    sampleData: sampleEmbeddings,
  });
}

/**
 * Normalize a vector to unit length
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((val) => val / magnitude);
}

/**
 * Create an empty vector store with spies
 */
export function createEmptyVectorStore(): MockVectorStore {
  return createMockVectorStore();
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that insert was called with expected record
 */
export function assertInserted(
  spy: SpyInstance,
  expectedId: string,
  expectedText?: string
): void {
  expect(spy).toHaveBeenCalled();
  const calls = spy.mock.calls;
  const lastCall = calls[calls.length - 1] as [EmbeddingRecord];
  expect(lastCall[0].id).toBe(expectedId);
  if (expectedText) {
    expect(lastCall[0].text).toBe(expectedText);
  }
}

/**
 * Assert search returned expected results
 */
export function assertSearchResults(
  results: SearchResult[],
  expectedCount: number,
  expectedIds?: string[]
): void {
  expect(results).toHaveLength(expectedCount);
  if (expectedIds) {
    const resultIds = results.map((r) => r.id);
    expect(resultIds).toEqual(expect.arrayContaining(expectedIds));
  }
}

/**
 * Assert valid similarity scores
 */
export function assertValidScores(results: SearchResult[]): void {
  for (const result of results) {
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  }
}

/**
 * Assert results are sorted by score descending
 */
export function assertSortedByScore(results: SearchResult[]): void {
  for (let i = 0; i < results.length - 1; i++) {
    expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createMockVectorStore,
  createPopulatedVectorStore,
  createEmptyVectorStore,
  cosineSimilarity,
  euclideanDistance,
  dotProduct,
  assertInserted,
  assertSearchResults,
  assertValidScores,
  assertSortedByScore,
};
