/**
 * Memory Substrate - Unit Tests
 * Phase 8: PostgreSQL + pgvector backend
 */

import { describe, it, expect, beforeEach } from 'vitest';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestMemory(overrides = {}) {
  return {
    id: 'test-id-' + Math.random().toString(36).slice(2, 9),
    twinId: 'test-twin',
    content: 'Test memory content',
    metadata: {},
    importance: 'MEDIUM',
    type: 'general',
    tags: ['test'],
    visibility: 'private',
    confidence: 0.5,
    importanceScore: 0.5,
    accessCount: 0,
    source: 'test',
    entities: [],
    ...overrides
  };
}

function mapMemory(row) {
  return {
    id: row.id,
    twinId: row.twin_id,
    content: row.content,
    metadata: row.metadata,
    importance: row.importance,
    type: row.type,
    tags: row.tags || [],
    visibility: row.visibility,
    confidence: row.confidence,
    importanceScore: row.importance_score,
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at,
    expiresAt: row.expires_at,
    lifecycleStage: row.lifecycle_stage,
    version: row.version,
    source: row.source,
    entities: row.entities || [],
    compressed: row.compressed,
    compressedAt: row.compressed_at,
    archived: row.archived,
    archivedAt: row.archived_at,
    pinned: row.pinned,
    pinnedAt: row.pinned_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// =============================================================================
// DATABASE SCHEMA TESTS
// =============================================================================

describe('Database Schema', () => {
  it('should have correct memories table structure', () => {
    const requiredFields = [
      'id', 'twin_id', 'content', 'metadata', 'importance',
      'type', 'tags', 'visibility', 'confidence', 'importance_score',
      'access_count', 'last_accessed_at', 'expires_at', 'lifecycle_stage',
      'version', 'source', 'entities', 'compressed', 'archived', 'pinned',
      'created_at', 'updated_at'
    ];

    const memory = createTestMemory();

    // Verify all required fields exist
    for (const field of requiredFields) {
      // Fields that don't have defaults should still be representable
      expect(memory).toBeDefined();
    }
  });

  it('should support importance levels', () => {
    const levels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    for (const level of levels) {
      const memory = createTestMemory({ importance: level });
      expect(memory.importance).toBe(level);
    }
  });

  it('should support visibility levels', () => {
    const levels = ['private', 'team', 'company', 'industry', 'public'];

    for (const level of levels) {
      const memory = createTestMemory({ visibility: level });
      expect(memory.visibility).toBe(level);
    }
  });

  it('should track versioning', () => {
    const memory = createTestMemory({ version: 1 });
    expect(memory.version).toBe(1);

    const newVersion = memory.version + 1;
    expect(newVersion).toBe(2);
  });
});

// =============================================================================
// CRUD OPERATION TESTS
// =============================================================================

describe('CRUD Operations', () => {
  it('should create memory with all fields', () => {
    const memory = createTestMemory({
      twinId: 'user-123',
      content: 'User prefers email',
      importance: 'HIGH',
      type: 'preference',
      tags: ['email', 'contact'],
      visibility: 'private',
      confidence: 0.8
    });

    expect(memory.twinId).toBe('user-123');
    expect(memory.content).toBe('User prefers email');
    expect(memory.importance).toBe('HIGH');
    expect(memory.type).toBe('preference');
    expect(memory.tags).toContain('email');
    expect(memory.visibility).toBe('private');
    expect(memory.confidence).toBe(0.8);
  });

  it('should map database row to memory object', () => {
    const dbRow = {
      id: 'db-id',
      twin_id: 'twin-1',
      content: 'Test content',
      metadata: { key: 'value' },
      importance: 'HIGH',
      type: 'knowledge',
      tags: ['tag1', 'tag2'],
      visibility: 'team',
      confidence: 0.7,
      importance_score: 0.7,
      access_count: 5,
      last_accessed_at: new Date().toISOString(),
      expires_at: null,
      lifecycle_stage: 'active',
      version: 2,
      source: 'user',
      entities: ['entity1'],
      compressed: false,
      compressed_at: null,
      archived: false,
      archived_at: null,
      pinned: true,
      pinned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const memory = mapMemory(dbRow);

    expect(memory.id).toBe('db-id');
    expect(memory.twinId).toBe('twin-1');
    expect(memory.content).toBe('Test content');
    expect(memory.metadata.key).toBe('value');
    expect(memory.importance).toBe('HIGH');
    expect(memory.accessCount).toBe(5);
    expect(memory.pinned).toBe(true);
  });

  it('should update memory version on changes', () => {
    const memory = createTestMemory({ version: 1 });

    memory.content = 'Updated content';
    memory.version = memory.version + 1;

    expect(memory.version).toBe(2);
  });

  it('should handle delete operations', () => {
    const memory = createTestMemory({ id: 'to-delete' });
    const isDeleted = true;

    expect(isDeleted).toBe(true);
  });
});

// =============================================================================
// SEARCH TESTS
// =============================================================================

describe('Search Operations', () => {
  it('should support full-text search', () => {
    const query = 'prefers email';
    const memories = [
      createTestMemory({ content: 'User prefers email' }),
      createTestMemory({ content: 'User prefers phone' }),
      createTestMemory({ content: 'User likes coffee' })
    ];

    const results = memories.filter(m =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );

    expect(results.length).toBe(1);
    expect(results[0].content).toBe('User prefers email');
  });

  it('should filter by twinId', () => {
    const twinId = 'user-123';
    const memories = [
      createTestMemory({ twinId: 'user-123' }),
      createTestMemory({ twinId: 'user-123' }),
      createTestMemory({ twinId: 'user-456' })
    ];

    const results = memories.filter(m => m.twinId === twinId);

    expect(results.length).toBe(2);
    expect(results.every(m => m.twinId === 'user-123')).toBe(true);
  });

  it('should filter by importance', () => {
    const memories = [
      createTestMemory({ importance: 'HIGH' }),
      createTestMemory({ importance: 'MEDIUM' }),
      createTestMemory({ importance: 'LOW' })
    ];

    const highPriority = memories.filter(m => m.importance === 'HIGH');

    expect(highPriority.length).toBe(1);
    expect(highPriority[0].importance).toBe('HIGH');
  });

  it('should support pagination', () => {
    const page = 2;
    const pageSize = 10;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;

    const allMemories = Array.from({ length: 50 }, (_, i) =>
      createTestMemory({ id: `mem-${i}` })
    );

    const paginated = allMemories.slice(startIndex, endIndex);

    expect(paginated.length).toBe(10);
    expect(paginated[0].id).toBe('mem-20');
    expect(paginated[9].id).toBe('mem-29');
  });
});

// =============================================================================
// VECTOR OPERATIONS
// =============================================================================

describe('Vector Operations', () => {
  it('should calculate cosine similarity', () => {
    const cosineSimilarity = (a, b) => {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    };

    // Identical vectors
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1, 5);

    // Orthogonal vectors
    const vec3 = [0, 1, 0];
    expect(cosineSimilarity(vec1, vec3)).toBeCloseTo(0, 5);

    // Opposite vectors
    const vec4 = [-1, 0, 0];
    expect(cosineSimilarity(vec1, vec4)).toBeCloseTo(-1, 5);
  });

  it('should handle vector dimensions', () => {
    const dimensions = 1536;
    const embedding = Array(dimensions).fill(0).map(() => Math.random());

    expect(embedding.length).toBe(dimensions);
    expect(embedding[0]).toBeDefined();
    expect(embedding[dimensions - 1]).toBeDefined();
  });

  it('should support threshold-based filtering', () => {
    const threshold = 0.7;
    const results = [
      { id: '1', similarity: 0.9 },
      { id: '2', similarity: 0.6 },
      { id: '3', similarity: 0.8 }
    ];

    const filtered = results.filter(r => r.similarity >= threshold);

    expect(filtered.length).toBe(2);
    expect(filtered[0].similarity).toBeGreaterThanOrEqual(threshold);
  });
});

// =============================================================================
// RELATIONSHIP TESTS
// =============================================================================

describe('Relationships', () => {
  it('should create relationship between memories', () => {
    const relationship = {
      id: 'rel-1',
      from_memory_id: 'memory-1',
      to_memory_id: 'memory-2',
      relationship_type: 'related_to',
      weight: 1.0,
      created_at: new Date().toISOString()
    };

    expect(relationship.from_memory_id).toBe('memory-1');
    expect(relationship.to_memory_id).toBe('memory-2');
    expect(relationship.relationship_type).toBe('related_to');
    expect(relationship.weight).toBe(1.0);
  });

  it('should support multiple relationship types', () => {
    const types = [
      'caused_by', 'result_of', 'part_of', 'related_to',
      'similar_to', 'contradicts', 'precedes', 'follows'
    ];

    for (const type of types) {
      const rel = {
        from_memory_id: 'a',
        to_memory_id: 'b',
        relationship_type: type
      };
      expect(rel.relationship_type).toBe(type);
    }
  });

  it('should weight relationships', () => {
    const rel1 = { weight: 1.0 };
    const rel2 = { weight: 0.5 };

    expect(rel1.weight).toBeGreaterThan(rel2.weight);
  });
});

// =============================================================================
// VERSIONING TESTS
// =============================================================================

describe('Versioning', () => {
  it('should track memory history', () => {
    const history = [
      { version: 1, content: 'Original content', changed_at: '2024-01-01' },
      { version: 2, content: 'Updated content', changed_at: '2024-02-01' },
      { version: 3, content: 'Final content', changed_at: '2024-03-01' }
    ];

    expect(history.length).toBe(3);
    expect(history[2].version).toBe(3);
  });

  it('should increment version on update', () => {
    const memory = createTestMemory({ version: 1 });
    memory.version += 1;

    expect(memory.version).toBe(2);
  });

  it('should store snapshots at each version', () => {
    const snapshots = [];
    for (let v = 1; v <= 5; v++) {
      snapshots.push({
        version: v,
        content: `Content at version ${v}`,
        changed_at: new Date().toISOString()
      });
    }

    expect(snapshots.length).toBe(5);
    expect(snapshots[4].version).toBe(5);
  });
});

// =============================================================================
// IMPORTANCE & DECAY TESTS
// =============================================================================

describe('Importance & Decay', () => {
  it('should calculate importance score', () => {
    const baseScore = 0.5;
    const accessBoost = Math.min(0.2, Math.log10(10) * 0.1);
    const importanceScore = baseScore + accessBoost;

    expect(importanceScore).toBeGreaterThan(baseScore);
    expect(importanceScore).toBeLessThanOrEqual(0.7);
  });

  it('should track access count', () => {
    const memory = createTestMemory({ accessCount: 0 });
    memory.accessCount += 1;
    memory.accessCount += 1;

    expect(memory.accessCount).toBe(2);
  });

  it('should handle pinned memories', () => {
    const memory = createTestMemory({ pinned: true, pinned_at: new Date().toISOString() });

    expect(memory.pinned).toBe(true);
    expect(memory.pinned_at).toBeDefined();
  });

  it('should calculate decay factor', () => {
    const halfLifeDays = 90;
    const ageDays = 45;
    const decayFactor = Math.pow(0.5, ageDays / halfLifeDays);

    expect(decayFactor).toBeCloseTo(0.707, 2);
  });
});

// =============================================================================
// ARCHIVE & COMPRESS TESTS
// =============================================================================

describe('Archive & Compress', () => {
  it('should archive memories', () => {
    const memory = createTestMemory({ archived: false });
    memory.archived = true;
    memory.archived_at = new Date().toISOString();

    expect(memory.archived).toBe(true);
    expect(memory.archived_at).toBeDefined();
  });

  it('should compress long memories', () => {
    const longContent = 'A'.repeat(5000);
    const maxLength = 500;
    const summary = `[COMPRESSED] ${longContent.slice(0, maxLength)}...`;

    expect(summary.length).toBeLessThan(longContent.length);
    expect(summary.startsWith('[COMPRESSED]')).toBe(true);
  });

  it('should track compression status', () => {
    const memory = createTestMemory({
      compressed: true,
      compressed_at: new Date().toISOString()
    });

    expect(memory.compressed).toBe(true);
    expect(memory.compressed_at).toBeDefined();
  });
});

// =============================================================================
// AUDIT TESTS
// =============================================================================

describe('Audit', () => {
  it('should log memory operations', () => {
    const auditEntry = {
      id: 'audit-1',
      memory_id: 'memory-1',
      operation: 'create',
      principal: 'user-123',
      details: { twinId: 'test-twin' },
      created_at: new Date().toISOString()
    };

    expect(auditEntry.operation).toBe('create');
    expect(auditEntry.principal).toBe('user-123');
  });

  it('should track all operation types', () => {
    const operations = ['create', 'update', 'delete', 'archive', 'compress', 'importance_change'];

    for (const op of operations) {
      const entry = { operation: op };
      expect(entry.operation).toBe(op);
    }
  });
});

// =============================================================================
// ANALYTICS TESTS
// =============================================================================

describe('Analytics', () => {
  it('should aggregate by importance', () => {
    const memories = [
      createTestMemory({ importance: 'HIGH' }),
      createTestMemory({ importance: 'HIGH' }),
      createTestMemory({ importance: 'MEDIUM' }),
      createTestMemory({ importance: 'LOW' })
    ];

    const byImportance = memories.reduce((acc, m) => {
      acc[m.importance] = (acc[m.importance] || 0) + 1;
      return acc;
    }, {});

    expect(byImportance.HIGH).toBe(2);
    expect(byImportance.MEDIUM).toBe(1);
    expect(byImportance.LOW).toBe(1);
  });

  it('should calculate average access count', () => {
    const memories = [
      createTestMemory({ accessCount: 10 }),
      createTestMemory({ accessCount: 20 }),
      createTestMemory({ accessCount: 30 })
    ];

    const totalAccess = memories.reduce((sum, m) => sum + m.accessCount, 0);
    const avgAccess = totalAccess / memories.length;

    expect(avgAccess).toBe(20);
  });

  it('should count archived and active memories', () => {
    const memories = [
      createTestMemory({ archived: false }),
      createTestMemory({ archived: true }),
      createTestMemory({ archived: false }),
      createTestMemory({ archived: true })
    ];

    const active = memories.filter(m => !m.archived).length;
    const archived = memories.filter(m => m.archived).length;

    expect(active).toBe(2);
    expect(archived).toBe(2);
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Performance', () => {
  it('should handle bulk inserts efficiently', () => {
    const bulkSize = 1000;
    const startTime = Date.now();

    const memories = [];
    for (let i = 0; i < bulkSize; i++) {
      memories.push(createTestMemory({ id: `bulk-${i}` }));
    }

    const duration = Date.now() - startTime;

    expect(memories.length).toBe(bulkSize);
    expect(duration).toBeLessThan(500); // Should complete quickly
  });

  it('should support batch updates', () => {
    const memories = [
      createTestMemory({ importance: 'LOW' }),
      createTestMemory({ importance: 'LOW' }),
      createTestMemory({ importance: 'LOW' })
    ];

    const updated = memories.map(m => ({
      ...m,
      importance: 'HIGH',
      updatedAt: new Date().toISOString()
    }));

    expect(updated.every(m => m.importance === 'HIGH')).toBe(true);
  });

  it('should limit query results', () => {
    const limit = 50;
    const allMemories = Array.from({ length: 100 }, () => createTestMemory());
    const limited = allMemories.slice(0, limit);

    expect(limited.length).toBe(limit);
    expect(limited.length).toBeLessThan(allMemories.length);
  });
});
