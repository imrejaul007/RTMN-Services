import { describe, it, expect } from 'vitest';

// Memory Substrate Constants
const MEMORY_TYPES = ['fact', 'preference', 'skill', 'experience', 'relationship', 'goal', 'belief'];
const EMBEDDING_DIMENSIONS = 1536;

describe('Memory Substrate', () => {
  describe('Memory Types', () => {
    it('should have all memory types', () => {
      expect(MEMORY_TYPES).toContain('fact');
      expect(MEMORY_TYPES).toContain('preference');
      expect(MEMORY_TYPES).toContain('skill');
      expect(MEMORY_TYPES).toContain('experience');
      expect(MEMORY_TYPES).toContain('relationship');
      expect(MEMORY_TYPES).toContain('goal');
      expect(MEMORY_TYPES).toContain('belief');
    });
  });

  describe('Memory Validation', () => {
    const validateMemory = (memory: { content?: string; type?: string; metadata?: Record<string, any>; embedding?: number[] }) => {
      const errors: string[] = [];
      if (!memory.content) errors.push('content required');
      if (!memory.type) errors.push('type required');
      if (memory.type && !MEMORY_TYPES.includes(memory.type)) errors.push('invalid type');
      if (memory.embedding && memory.embedding.length !== EMBEDDING_DIMENSIONS) {
        errors.push(`embedding must be ${EMBEDDING_DIMENSIONS} dimensions`);
      }
      return { valid: errors.length === 0, errors };
    };

    it('should validate correct memory', () => {
      const result = validateMemory({
        content: 'User prefers dark mode',
        type: 'preference',
        metadata: { source: 'settings' }
      });
      expect(result.valid).toBe(true);
    });

    it('should require content and type', () => {
      const result = validateMemory({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('content required');
      expect(result.errors).toContain('type required');
    });

    it('should validate embedding dimensions', () => {
      const result = validateMemory({
        content: 'Test',
        type: 'fact',
        embedding: new Array(768).fill(0.1) // Wrong dimension
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('dimensions'))).toBe(true);
    });
  });

  describe('Relationship Validation', () => {
    const validateRelationship = (rel: { from?: string; to?: string; type?: string; strength?: number }) => {
      const errors: string[] = [];
      if (!rel.from) errors.push('from required');
      if (!rel.to) errors.push('to required');
      if (!rel.type) errors.push('type required');
      if (rel.strength !== undefined && (rel.strength < 0 || rel.strength > 1)) {
        errors.push('strength must be 0-1');
      }
      return { valid: errors.length === 0, errors };
    };

    it('should validate correct relationship', () => {
      const result = validateRelationship({
        from: 'entity-1',
        to: 'entity-2',
        type: 'knows',
        strength: 0.8
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Semantic Search', () => {
    const cosineSimilarity = (a: number[], b: number[]): number => {
      if (a.length !== b.length) return 0;
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
    };

    it('should calculate cosine similarity', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];
      const c = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1);
      expect(cosineSimilarity(a, c)).toBeCloseTo(0);
    });
  });

  describe('Version Tracking', () => {
    const createVersion = (memoryId: string, version: number, changes: string[]) => {
      return {
        id: `ver-${Date.now()}`,
        memoryId,
        version,
        changes,
        createdAt: new Date().toISOString()
      };
    };

    it('should create version with correct structure', () => {
      const version = createVersion('mem-1', 2, ['updated content', 'added metadata']);
      expect(version.memoryId).toBe('mem-1');
      expect(version.version).toBe(2);
      expect(version.changes).toHaveLength(2);
    });
  });

  describe('Memory TTL', () => {
    const isExpired = (createdAt: string, ttlMs: number): boolean => {
      return Date.now() - new Date(createdAt).getTime() > ttlMs;
    };

    it('should detect expired memories', () => {
      const old = new Date(Date.now() - 60000).toISOString();
      expect(isExpired(old, 30000)).toBe(true);
      expect(isExpired(old, 120000)).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    const createAuditEntry = (action: string, entityType: string, entityId: string) => {
      return {
        id: `audit-${Date.now()}`,
        timestamp: Date.now(),
        action,
        entityType,
        entityId
      };
    };

    it('should create audit entry', () => {
      const entry = createAuditEntry('CREATE', 'memory', 'mem-123');
      expect(entry.action).toBe('CREATE');
      expect(entry.entityType).toBe('memory');
    });
  });
});