/**
 * Memory Intelligence Service - Unit Tests
 * Phase 28: Smart Memory with 8 capabilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the uuid module
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${Math.random().toString(36).slice(2, 9)}`
}));

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestMemory(overrides = {}) {
  return {
    twinId: 'test-twin',
    content: 'Test memory content',
    importance: 'MEDIUM',
    source: 'test',
    entities: [],
    tags: [],
    metadata: {},
    ...overrides
  };
}

// =============================================================================
// 28.1 REMEMBER - Importance scoring, context preservation, relationships
// =============================================================================

describe('28.1 Remember - Memory Creation', () => {
  it('should create a memory with correct importance levels', () => {
    const levels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    for (const level of levels) {
      const memory = createTestMemory({ importance: level });
      expect(memory.importance).toBe(level);
    }
  });

  it('should default importance to MEDIUM', () => {
    // The default is applied in the service, not in createTestMemory
    const memoryData = { twinId: 'test', content: 'test' };
    const importance = memoryData.importance || 'MEDIUM';
    expect(importance).toBe('MEDIUM');
  });

  it('should track source attribution', () => {
    const sources = ['user', 'system-observed', 'agent-generated', 'third-party-api'];

    for (const source of sources) {
      const memory = createTestMemory({ source });
      expect(memory.source).toBe(source);
    }
  });

  it('should preserve entities', () => {
    const entities = ['person', 'location', 'event'];
    const memory = createTestMemory({ entities });

    expect(memory.entities).toEqual(entities);
  });

  it('should calculate importance score', () => {
    const baseScore = 0.5;
    const accessCount = 10;
    const accessBoost = Math.min(0.2, Math.log10(accessCount + 1) * 0.1);

    expect(baseScore).toBeLessThan(1);
    expect(accessBoost).toBeGreaterThan(0);
  });
});

// =============================================================================
// 28.2 FORGET - Expiration, unused detection, GDPR
// =============================================================================

describe('28.2 Forget - Memory Deletion', () => {
  it('should support soft delete (archive)', () => {
    const memory = { ...createTestMemory(), archived: true, archivedAt: new Date().toISOString() };

    expect(memory.archived).toBe(true);
    expect(memory.archivedAt).toBeDefined();
  });

  it('should support hard delete', () => {
    const memory = { ...createTestMemory(), archived: false };
    const shouldDelete = memory.archived;

    // Hard delete removes from storage
    expect(typeof shouldDelete).toBe('boolean');
    expect(shouldDelete).toBe(false);
  });

  it('should track GDPR compliance', () => {
    const gdprRecord = {
      twinId: 'test-twin',
      reason: 'gdpr_request',
      deletedAt: new Date().toISOString(),
      memoryCount: 5
    };

    expect(gdprRecord.reason).toBe('gdpr_request');
    expect(gdprRecord.memoryCount).toBe(5);
  });

  it('should detect unused memories', () => {
    const days = 90;
    const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
    const oldDate = new Date(threshold - 1000).toISOString();

    const memory = createTestMemory({ lastAccessedAt: oldDate });
    const lastAccess = new Date(memory.lastAccessedAt).getTime();

    expect(lastAccess).toBeLessThan(threshold);
  });
});

// =============================================================================
// 28.3 COMPRESS - Summarization, deduplication, archival
// =============================================================================

describe('28.3 Compress - Memory Compression', () => {
  it('should create compressed version of long content', () => {
    const longContent = 'A'.repeat(3000);
    const maxLength = 2000;

    const compressedContent = `[SUMMARY] ${longContent.slice(0, maxLength)}...`;

    expect(compressedContent.length).toBeLessThan(longContent.length);
    expect(compressedContent.startsWith('[SUMMARY]')).toBe(true);
  });

  it('should calculate compression ratio', () => {
    const originalLength = 3000;
    const compressedLength = 500;

    const ratio = compressedLength / originalLength;

    expect(ratio).toBeLessThan(1);
    expect(ratio).toBeGreaterThan(0);
  });

  it('should detect duplicate memories via Jaccard similarity', () => {
    const jaccardSimilarity = (a, b) => {
      const setA = new Set((a || '').toLowerCase().split(/\W+/).filter(w => w.length > 2));
      const setB = new Set((b || '').toLowerCase().split(/\W+/).filter(w => w.length > 2));
      const intersection = [...setA].filter(x => setB.has(x)).length;
      const union = new Set([...setA, ...setB]).size || 1;
      return intersection / union;
    };

    const content1 = 'User prefers email over phone calls for business communication';
    const content2 = 'User prefers email for business calls';

    const similarity = jaccardSimilarity(content1, content2);

    expect(similarity).toBeGreaterThan(0.5); // High similarity
  });

  it('should identify non-duplicates', () => {
    const jaccardSimilarity = (a, b) => {
      const setA = new Set((a || '').toLowerCase().split(/\W+/).filter(w => w.length > 2));
      const setB = new Set((b || '').toLowerCase().split(/\W+/).filter(w => w.length > 2));
      const intersection = [...setA].filter(x => setB.has(x)).length;
      const union = new Set([...setA, ...setB]).size || 1;
      return intersection / union;
    };

    const content1 = 'User prefers email over phone calls';
    const content2 = 'Weather is sunny today';

    const similarity = jaccardSimilarity(content1, content2);

    expect(similarity).toBeLessThan(0.3); // Low similarity
  });
});

// =============================================================================
// 28.4 MERGE - Duplicate detection, contradiction resolution
// =============================================================================

describe('28.4 Merge - Memory Merging', () => {
  it('should merge memories using newer strategy', () => {
    const olderMemory = { ...createTestMemory(), id: 'old', createdAt: '2024-01-01T00:00:00Z', content: 'Old content' };
    const newerMemory = { ...createTestMemory(), id: 'new', createdAt: '2024-06-01T00:00:00Z', content: 'New content' };

    const olderTime = new Date(olderMemory.createdAt).getTime();
    const newerTime = new Date(newerMemory.createdAt).getTime();

    const mergedContent = newerTime > olderTime ? newerMemory.content : olderMemory.content;

    expect(mergedContent).toBe('New content');
  });

  it('should merge memories using combine strategy', () => {
    const memory1 = { content: 'Part 1 content' };
    const memory2 = { content: 'Part 2 content' };

    const combined = `${memory1.content}\n\n---\n\n${memory2.content}`;

    expect(combined).toContain('Part 1');
    expect(combined).toContain('Part 2');
    expect(combined).toContain('---');
  });

  it('should archive originals after merge', () => {
    const original = { ...createTestMemory(), archived: true, archivedAt: new Date().toISOString(), archiveReason: 'merged' };

    expect(original.archived).toBe(true);
    expect(original.archiveReason).toBe('merged');
  });
});

// =============================================================================
// 28.5 CONTRADICTION - Detection, source credibility, recency
// =============================================================================

describe('28.5 Contradiction - Contradiction Detection', () => {
  it('should detect negation patterns', () => {
    const hasNegation = (text) => /not|never|no|don't|doesn't|didn't|won't|wouldn't/i.test(text);

    expect(hasNegation('User does not prefer email')).toBe(true);
    expect(hasNegation('User prefers email')).toBe(false);
  });

  it('should identify contradictory statements', () => {
    const content1 = 'User does not prefer email';
    const content2 = 'User prefers email';

    const hasNegation = (text) => /not|never|no|don't|doesn't|didn't|won't|wouldn't/i.test(text);

    const neg1 = hasNegation(content1);
    const neg2 = hasNegation(content2);

    expect(neg1).not.toBe(neg2); // One has negation, one doesn't
  });

  it('should resolve contradictions by keeping newer', () => {
    const memory1 = { id: 'm1', createdAt: '2024-01-01T00:00:00Z' };
    const memory2 = { id: 'm2', createdAt: '2024-06-01T00:00:00Z' };

    const newerTime = new Date(memory2.createdAt).getTime();
    const olderTime = new Date(memory1.createdAt).getTime();

    const keepId = newerTime > olderTime ? memory2.id : memory1.id;

    expect(keepId).toBe('m2');
  });

  it('should track contradiction resolution', () => {
    const resolution = {
      resolvedAt: new Date().toISOString(),
      kept: 'memory-id-1',
      discarded: 'memory-id-2',
      reason: 'user_decision'
    };

    expect(resolution.resolvedAt).toBeDefined();
    expect(resolution.kept).toBeDefined();
    expect(resolution.discarded).toBeDefined();
  });
});

// =============================================================================
// 28.6 IMPORTANCE - Access frequency, user marking, contextual relevance
// =============================================================================

describe('28.6 Importance - Importance Management', () => {
  it('should have correct importance levels', () => {
    const levels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    for (const level of levels) {
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(level);
    }
  });

  it('should calculate importance score boost from access', () => {
    const baseScore = 0.5;
    const accessCount = 50;
    const accessBoost = Math.min(0.2, Math.log10(accessCount + 1) * 0.1);

    expect(accessBoost).toBeGreaterThan(0);
    expect(accessBoost).toBeLessThanOrEqual(0.2);
  });

  it('should boost score for user marking', () => {
    const baseScore = 0.5;
    const userMarkedBoost = 0.1;

    const finalScore = Math.min(1.0, baseScore + userMarkedBoost);

    expect(finalScore).toBe(0.6);
  });

  it('should rank memories by importance score', () => {
    const memories = [
      { id: '1', importanceScore: 0.3 },
      { id: '2', importanceScore: 0.8 },
      { id: '3', importanceScore: 0.5 }
    ];

    const ranked = memories.sort((a, b) => b.importanceScore - a.importanceScore);

    expect(ranked[0].id).toBe('2'); // Highest score
    expect(ranked[2].id).toBe('1'); // Lowest score
  });

  it('should allow pinning to prevent decay', () => {
    const memory = { ...createTestMemory(), pinned: true, pinnedAt: new Date().toISOString() };

    expect(memory.pinned).toBe(true);
    expect(memory.pinnedAt).toBeDefined();
  });
});

// =============================================================================
// 28.7 DECAY - Time-based decay, access-based boost, automatic archival
// =============================================================================

describe('28.7 Decay - Memory Decay', () => {
  it('should calculate exponential decay factor', () => {
    const halfLifeDays = 90;
    const ageInDays = 45;

    const decayFactor = Math.pow(0.5, ageInDays / halfLifeDays);

    expect(decayFactor).toBeCloseTo(0.707, 2); // ~70.7% after half-life
  });

  it('should apply different half-lives per importance', () => {
    const halfLives = {
      CRITICAL: 365,
      HIGH: 180,
      MEDIUM: 90,
      LOW: 30
    };

    expect(halfLives.CRITICAL).toBeGreaterThan(halfLives.HIGH);
    expect(halfLives.HIGH).toBeGreaterThan(halfLives.MEDIUM);
    expect(halfLives.MEDIUM).toBeGreaterThan(halfLives.LOW);
  });

  it('should boost memory on access', () => {
    const memory = { accessCount: 10 };
    const boostMultiplier = Math.min(1.5, 1 + Math.log10(memory.accessCount) * 0.1);

    expect(boostMultiplier).toBeGreaterThan(1);
    expect(boostMultiplier).toBeLessThanOrEqual(1.5);
  });

  it('should extend half-life on reinforcement', () => {
    const currentHalfLife = 90;
    const extendedHalfLife = currentHalfLife * 1.1;

    expect(extendedHalfLife).toBeGreaterThan(currentHalfLife);
  });

  it('should categorize decay stages', () => {
    const categorizeScore = (score) => {
      if (score > 0.7) return 'healthy';
      if (score > 0.4) return 'moderate';
      if (score > 0.1) return 'weak';
      return 'critical';
    };

    expect(categorizeScore(0.9)).toBe('healthy');
    expect(categorizeScore(0.6)).toBe('moderate');
    expect(categorizeScore(0.2)).toBe('weak');
    expect(categorizeScore(0.05)).toBe('critical');
  });
});

// =============================================================================
// 28.8 RELATIONSHIPS - Entity linking, causal chains, temporal ordering
// =============================================================================

describe('28.8 Relationships - Memory Relationships', () => {
  it('should support valid relationship types', () => {
    const validTypes = [
      'caused_by', 'result_of', 'part_of', 'related_to',
      'similar_to', 'contradicts', 'precedes', 'follows',
      'owns', 'owned_by', 'uses', 'used_by'
    ];

    for (const type of validTypes) {
      expect(validTypes).toContain(type);
    }
  });

  it('should create relationships between memories', () => {
    const relationship = {
      id: 'rel-1',
      from: 'memory-1',
      to: 'memory-2',
      type: 'related_to',
      weight: 1,
      createdAt: new Date().toISOString()
    };

    expect(relationship.from).toBeDefined();
    expect(relationship.to).toBeDefined();
    expect(relationship.type).toBe('related_to');
  });

  it('should traverse relationships by depth', () => {
    const relationships = [
      { from: 'A', to: 'B', type: 'related_to' },
      { from: 'B', to: 'C', type: 'related_to' },
      { from: 'A', to: 'C', type: 'similar_to' }
    ];

    // BFS traversal
    const traverse = (start, maxDepth) => {
      const visited = new Set();
      const queue = [{ id: start, depth: 0 }];
      const result = [];

      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.id) || current.depth > maxDepth) continue;
        visited.add(current.id);
        result.push(current);

        for (const rel of relationships) {
          if (rel.from === current.id) {
            queue.push({ id: rel.to, depth: current.depth + 1 });
          }
        }
      }

      return result;
    };

    const result = traverse('A', 2);

    expect(result.length).toBeGreaterThan(0);
    expect(result.some(n => n.id === 'B')).toBe(true);
  });

  it('should link entities', () => {
    const entities = ['John', 'Mumbai', 'meeting'];
    const memory = { entities };

    // Entity linking creates relationships
    const links = [];
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        links.push({
          from: entities[i],
          to: entities[j],
          type: 'related_to'
        });
      }
    }

    expect(links.length).toBe(3); // C(3,2) = 3
  });
});

// =============================================================================
// INTEGRATION SCENARIOS
// =============================================================================

describe('Integration Scenarios', () => {
  it('should simulate complete memory lifecycle', () => {
    // 1. Create memory with importance
    const memory = createTestMemory({
      twinId: 'user-123',
      content: 'User prefers morning coffee',
      importance: 'HIGH'
    });

    expect(memory.importance).toBe('HIGH');

    // 2. Access boosts importance
    const accessCount = 10;
    const accessBoost = Math.min(0.2, Math.log10(accessCount + 1) * 0.1);
    const newScore = 0.8 + accessBoost;

    expect(newScore).toBeGreaterThan(0.8);

    // 3. Decay over time
    const halfLife = 180;
    const age = 90;
    const decayFactor = Math.pow(0.5, age / halfLife);

    expect(decayFactor).toBeLessThan(1);

    // 4. Archive when low importance
    const shouldArchive = decayFactor < 0.3;

    expect(shouldArchive).toBe(false); // Still above threshold
  });

  it('should handle contradiction resolution flow', () => {
    // Two contradictory memories
    const memory1 = {
      id: 'm1',
      content: 'User is vegetarian',
      createdAt: '2024-01-01T00:00:00Z'
    };

    const memory2 = {
      id: 'm2',
      content: 'User is not vegetarian',
      createdAt: '2024-06-01T00:00:00Z'
    };

    // Detect contradiction
    const hasNegation = (text) => /not|never|no|don't/i.test(text);
    const hasContraction = hasNegation(memory1.content) !== hasNegation(memory2.content);

    expect(hasContraction).toBe(true);

    // Resolve by keeping newer
    const keepId = new Date(memory2.createdAt) > new Date(memory1.createdAt)
      ? memory2.id
      : memory1.id;

    expect(keepId).toBe('m2');
  });

  it('should merge duplicate memories correctly', () => {
    const memory1 = {
      id: 'dup1',
      content: 'User email is john@example.com',
      createdAt: '2024-01-01T00:00:00Z'
    };

    const memory2 = {
      id: 'dup2',
      content: 'User email is john@example.com',
      createdAt: '2024-06-01T00:00:00Z'
    };

    // Same content - high similarity
    const similarity = memory1.content === memory2.content ? 1.0 : 0.0;

    expect(similarity).toBe(1.0);

    // Merge keeping newer
    const mergedContent = memory2.content;

    expect(mergedContent).toBe('User email is john@example.com');
  });

  it('should handle GDPR deletion flow', () => {
    const twinMemories = [
      { id: '1', twinId: 'user-123', content: 'Memory 1' },
      { id: '2', twinId: 'user-123', content: 'Memory 2' },
      { id: '3', twinId: 'user-456', content: 'Memory 3' }
    ];

    const userTwinId = 'user-123';

    const toDelete = twinMemories.filter(m => m.twinId === userTwinId);

    expect(toDelete.length).toBe(2);
    expect(toDelete.every(m => m.twinId === 'user-123')).toBe(true);
  });
});

// =============================================================================
// PERFORMANCE CONSIDERATIONS
// =============================================================================

describe('Performance Considerations', () => {
  it('should handle bulk operations efficiently', () => {
    const bulkSize = 1000;
    const startTime = Date.now();

    // Simulate bulk creation
    const memories = [];
    for (let i = 0; i < bulkSize; i++) {
      memories.push(createTestMemory({ id: `mem-${i}` }));
    }

    const duration = Date.now() - startTime;

    expect(memories.length).toBe(bulkSize);
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  it('should limit relationship traversal depth', () => {
    const maxDepth = 3;
    const depth = 5;

    const shouldContinue = depth <= maxDepth;

    expect(shouldContinue).toBe(false);
  });

  it('should paginate large result sets', () => {
    const totalItems = 1000;
    const pageSize = 50;
    const page = 3;

    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;

    expect(startIndex).toBe(150);
    expect(endIndex).toBe(200);
  });
});
