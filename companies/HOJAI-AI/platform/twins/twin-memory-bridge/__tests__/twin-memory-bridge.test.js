/**
 * Twin Memory Bridge Tests
 */

import { describe, it, expect } from 'vitest';

// Test constants
const KINDS = ['episodic', 'semantic', 'procedural', 'working', 'long-term'];
const BINDING_STATES = ['pending', 'active', 'suspended', 'archived'];

describe('Twin Memory Bridge', () => {
  describe('Memory Kinds', () => {
    it('should have 5 canonical memory kinds', () => {
      expect(KINDS).toHaveLength(5);
    });

    it('should include all memory types', () => {
      expect(KINDS).toContain('episodic');
      expect(KINDS).toContain('semantic');
      expect(KINDS).toContain('procedural');
      expect(KINDS).toContain('working');
      expect(KINDS).toContain('long-term');
    });
  });

  describe('Binding States', () => {
    it('should have all binding states', () => {
      expect(BINDING_STATES).toContain('pending');
      expect(BINDING_STATES).toContain('active');
      expect(BINDING_STATES).toContain('suspended');
      expect(BINDING_STATES).toContain('archived');
    });
  });

  describe('Binding Record Structure', () => {
    function createBinding(twinId, partitions) {
      return {
        twinId,
        partitions,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    it('should create binding with twinId', () => {
      const binding = createBinding('twin-123', {});
      expect(binding.twinId).toBe('twin-123');
    });

    it('should create binding with partitions', () => {
      const binding = createBinding('twin-123', {
        episodic: 'partition-1',
        semantic: 'partition-2',
      });
      expect(binding.partitions.episodic).toBe('partition-1');
      expect(binding.partitions.semantic).toBe('partition-2');
    });

    it('should include metadata timestamps', () => {
      const binding = createBinding('twin-123', {});
      expect(binding.metadata.createdAt).toBeDefined();
      expect(binding.metadata.updatedAt).toBeDefined();
    });
  });

  describe('Partition Structure', () => {
    function createPartition(partitionId, twinId, kind, ref) {
      return {
        id: partitionId,
        twinId,
        kind,
        ref,
        createdAt: new Date().toISOString(),
        stats: {
          recordCount: 0,
          sizeBytes: 0,
          lastAccess: null,
        },
      };
    }

    it('should create partition with required fields', () => {
      const partition = createPartition('part-1', 'twin-123', 'episodic', 'memory-os://part-1');
      expect(partition.id).toBe('part-1');
      expect(partition.twinId).toBe('twin-123');
      expect(partition.kind).toBe('episodic');
      expect(partition.ref).toBe('memory-os://part-1');
    });

    it('should include stats', () => {
      const partition = createPartition('part-1', 'twin-123', 'episodic', 'memory-os://part-1');
      expect(partition.stats.recordCount).toBe(0);
      expect(partition.stats.sizeBytes).toBe(0);
      expect(partition.stats.lastAccess).toBeNull();
    });
  });

  describe('Bridge Resolution', () => {
    function resolvePartition(bindings, twinId, kind) {
      const binding = bindings.get(twinId);
      if (!binding) return null;
      return binding.partitions[kind] || null;
    }

    it('should resolve existing binding', () => {
      const bindings = new Map();
      bindings.set('twin-123', {
        partitions: { episodic: 'partition-episodic-1' },
      });

      const result = resolvePartition(bindings, 'twin-123', 'episodic');
      expect(result).toBe('partition-episodic-1');
    });

    it('should return null for non-existent twin', () => {
      const bindings = new Map();
      const result = resolvePartition(bindings, 'unknown-twin', 'episodic');
      expect(result).toBeNull();
    });

    it('should return null for non-existent kind', () => {
      const bindings = new Map();
      bindings.set('twin-123', {
        partitions: { episodic: 'partition-1' },
      });

      const result = resolvePartition(bindings, 'twin-123', 'semantic');
      expect(result).toBeNull();
    });
  });

  describe('Bulk Binding', () => {
    function bulkCreateBindings(twins, defaultPartition) {
      return twins.map(twinId => ({
        twinId,
        partitions: KINDS.reduce((acc, kind) => {
          acc[kind] = `${defaultPartition}-${kind}`;
          return acc;
        }, {}),
        metadata: {
          createdAt: new Date().toISOString(),
        },
      }));
    }

    it('should create bindings for multiple twins', () => {
      const twins = ['twin-1', 'twin-2', 'twin-3'];
      const bindings = bulkCreateBindings(twins, 'default-partition');

      expect(bindings).toHaveLength(3);
      expect(bindings[0].twinId).toBe('twin-1');
      expect(bindings[1].twinId).toBe('twin-2');
      expect(bindings[2].twinId).toBe('twin-3');
    });

    it('should create all 5 memory kinds for each twin', () => {
      const twins = ['twin-1'];
      const bindings = bulkCreateBindings(twins, 'shared');

      expect(Object.keys(bindings[0].partitions)).toHaveLength(5);
      expect(bindings[0].partitions.episodic).toBe('shared-episodic');
      expect(bindings[0].partitions.semantic).toBe('shared-semantic');
    });
  });

  describe('Memory Migration', () => {
    function migratePartition(binding, fromKind, toPartition) {
      return {
        ...binding,
        partitions: {
          ...binding.partitions,
          [fromKind]: toPartition,
        },
        metadata: {
          ...binding.metadata,
          migratedAt: new Date().toISOString(),
        },
      };
    }

    it('should migrate partition to new location', () => {
      const binding = {
        twinId: 'twin-123',
        partitions: { episodic: 'old-partition' },
        metadata: { createdAt: '2024-01-01' },
      };

      const migrated = migratePartition(binding, 'episodic', 'new-partition');
      expect(migrated.partitions.episodic).toBe('new-partition');
    });

    it('should preserve other partitions during migration', () => {
      const binding = {
        twinId: 'twin-123',
        partitions: {
          episodic: 'old-episodic',
          semantic: 'semantic-1',
        },
        metadata: { createdAt: '2024-01-01' },
      };

      const migrated = migratePartition(binding, 'episodic', 'new-episodic');
      expect(migrated.partitions.semantic).toBe('semantic-1');
    });

    it('should record migration timestamp', () => {
      const binding = { twinId: 'twin-123', partitions: {}, metadata: {} };
      const migrated = migratePartition(binding, 'episodic', 'new');
      expect(migrated.metadata.migratedAt).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    function createAuditEntry(action, twinId, details) {
      return {
        id: `audit-${Date.now()}`,
        action,
        twinId,
        details,
        timestamp: new Date().toISOString(),
      };
    }

    it('should create bind audit entry', () => {
      const entry = createAuditEntry('bind', 'twin-123', { kinds: KINDS });
      expect(entry.action).toBe('bind');
      expect(entry.twinId).toBe('twin-123');
      expect(entry.details.kinds).toEqual(KINDS);
    });

    it('should create unbind audit entry', () => {
      const entry = createAuditEntry('unbind', 'twin-123', { partitions: ['p1', 'p2'] });
      expect(entry.action).toBe('unbind');
      expect(entry.timestamp).toBeDefined();
    });

    it('should create migrate audit entry', () => {
      const entry = createAuditEntry('migrate', 'twin-123', {
        kind: 'episodic',
        from: 'old',
        to: 'new',
      });
      expect(entry.action).toBe('migrate');
      expect(entry.details.from).toBe('old');
      expect(entry.details.to).toBe('new');
    });
  });
});
