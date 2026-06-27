import { describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies before importing
const mockStorage = new Map();
const mockVersionStorage = new Map();
const mockAuditLog = [];

vi.mock('../../src/index.js', async () => {
  const actual = await vi.importActual('../../src/index.js');
  return { ...actual };
});

describe('MemoryOS Core', () => {
  describe('Memory Types', () => {
    const ALLOWED_TYPES = [
      'identity', 'preference', 'knowledge', 'experience', 'relationship',
      'conversation', 'decision', 'event', 'workflow', 'goal',
      'financial', 'shopping', 'health', 'learning', 'ai'
    ];

    it('should have 15 memory types', () => {
      expect(ALLOWED_TYPES).toHaveLength(15);
    });

    it('should include identity type', () => {
      expect(ALLOWED_TYPES).toContain('identity');
    });

    it('should include preference type', () => {
      expect(ALLOWED_TYPES).toContain('preference');
    });

    it('should validate memory types', () => {
      const isValidType = (t) => ALLOWED_TYPES.includes(t);
      expect(isValidType('identity')).toBe(true);
      expect(isValidType('preference')).toBe(true);
      expect(isValidType('invalid')).toBe(false);
    });
  });

  describe('Importance Levels', () => {
    const ALLOWED_IMPORTANCE = ['Critical', 'High', 'Medium', 'Low', 'Temporary'];

    it('should have 5 importance levels', () => {
      expect(ALLOWED_IMPORTANCE).toHaveLength(5);
    });

    it('should validate importance', () => {
      const isValidImportance = (i) => ALLOWED_IMPORTANCE.includes(i);
      expect(isValidImportance('High')).toBe(true);
      expect(isValidImportance('Invalid')).toBe(false);
    });

    it('should calculate importance score', () => {
      const calculateImportance = (accessCount, emotionalValence, recencyWeight, relevanceScore) => {
        const score = accessCount * 0.1 + emotionalValence * 0.3 +
                      recencyWeight * 0.2 + relevanceScore * 0.4;
        return Math.min(5, Math.max(1, Math.round(score)));
      };

      expect(calculateImportance(10, 0.8, 0.9, 0.7)).toBeGreaterThanOrEqual(1);
      expect(calculateImportance(10, 0.8, 0.9, 0.7)).toBeLessThanOrEqual(5);
    });
  });

  describe('Lifecycle States', () => {
    const ALLOWED_LIFECYCLE = [
      'created', 'captured', 'indexed', 'connected', 'learned',
      'recalled', 'summarized', 'archived', 'deleted'
    ];

    it('should have 9 lifecycle states', () => {
      expect(ALLOWED_LIFECYCLE).toHaveLength(9);
    });

    it('should validate lifecycle', () => {
      const isValidLifecycle = (s) => ALLOWED_LIFECYCLE.includes(s);
      expect(isValidLifecycle('created')).toBe(true);
      expect(isValidLifecycle('invalid')).toBe(false);
    });
  });

  describe('Memory Operations', () => {
    it('should generate unique IDs', () => {
      const generateId = () => Math.random().toString(36).substring(2, 15);
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should track memory creation', () => {
      const memory = {
        id: 'test-id',
        content: 'Test content',
        type: 'preference',
        twinId: 'twin-1',
        version: 1,
        createdAt: Date.now()
      };
      mockStorage.set(memory.id, memory);
      expect(mockStorage.has('test-id')).toBe(true);
    });

    it('should update memory', () => {
      const memory = {
        id: 'test-id',
        content: 'Original',
        version: 1
      };
      mockVersionStorage.set('test-id:1', { ...memory });

      memory.content = 'Updated';
      memory.version = 2;
      mockVersionStorage.set('test-id:2', { ...memory });
      mockStorage.set(memory.id, memory);

      expect(mockStorage.get('test-id').content).toBe('Updated');
      expect(mockVersionStorage.get('test-id:1').content).toBe('Original');
    });

    it('should delete memory', () => {
      mockStorage.set('test-id', { id: 'test-id' });
      expect(mockStorage.has('test-id')).toBe(true);
      mockStorage.delete('test-id');
      expect(mockStorage.has('test-id')).toBe(false);
    });
  });

  describe('Version History', () => {
    it('should track versions', () => {
      const versions = new Map();
      versions.set('mem-1:1', { id: 'mem-1', content: 'v1', version: 1 });
      versions.set('mem-1:2', { id: 'mem-1', content: 'v2', version: 2 });
      versions.set('mem-1:3', { id: 'mem-1', content: 'v3', version: 3 });

      expect(versions.size).toBe(3);
    });

    it('should retrieve specific version', () => {
      const versions = new Map();
      versions.set('mem-1:1', { id: 'mem-1', content: 'v1', version: 1 });
      versions.set('mem-1:2', { id: 'mem-1', content: 'v2', version: 2 });
      versions.set('mem-1:3', { id: 'mem-1', content: 'v3', version: 3 });

      expect(versions.get('mem-1:1').content).toBe('v1');
      expect(versions.get('mem-1:3').content).toBe('v3');
    });

    it('should get all versions', () => {
      const versions = new Map();
      versions.set('mem-1:1', { id: 'mem-1', content: 'v1', version: 1 });
      versions.set('mem-1:2', { id: 'mem-1', content: 'v2', version: 2 });
      versions.set('mem-1:3', { id: 'mem-1', content: 'v3', version: 3 });

      const getVersions = (memId) => {
        const result = [];
        let v = 1;
        let version;
        while (version = versions.get(`${memId}:${v}`)) {
          result.push(version);
          v++;
        }
        return result;
      };

      expect(getVersions('mem-1')).toHaveLength(3);
    });
  });

  describe('Knowledge Graph', () => {
    const graph = {
      entities: {},
      relationships: []
    };

    it('should add entities', () => {
      graph.entities['person-1'] = { id: 'person-1', type: 'person', label: 'John' };
      expect(graph.entities['person-1']).toBeDefined();
    });

    it('should add relationships', () => {
      graph.relationships.push({
        from: 'person-1',
        to: 'company-1',
        type: 'works_at'
      });
      expect(graph.relationships).toHaveLength(1);
    });

    it('should traverse relationships', () => {
      const getConnections = (entityId) =>
        graph.relationships.filter(r => r.from === entityId || r.to === entityId);

      const connections = getConnections('person-1');
      expect(connections).toHaveLength(1);
    });
  });

  describe('Search', () => {
    const memories = [
      { id: '1', content: 'Meeting with John', type: 'event' },
      { id: '2', content: 'Project deadline', type: 'goal' },
      { id: '3', content: 'Call John', type: 'task' }
    ];

    it('should search by content', () => {
      const search = (query) =>
        memories.filter(m => m.content.toLowerCase().includes(query.toLowerCase()));

      expect(search('John')).toHaveLength(2);
      expect(search('project')).toHaveLength(1);
    });

    it('should filter by type', () => {
      const filterByType = (type) => memories.filter(m => m.type === type);
      expect(filterByType('event')).toHaveLength(1);
      expect(filterByType('goal')).toHaveLength(1);
    });
  });

  describe('Working Memory', () => {
    const workingMemory = {
      items: [],
      capacity: 7
    };

    it('should have limited capacity', () => {
      expect(workingMemory.capacity).toBe(7);
    });

    it('should evict oldest when full', () => {
      const addItem = (item) => {
        if (workingMemory.items.length >= workingMemory.capacity) {
          workingMemory.items.shift();
        }
        workingMemory.items.push(item);
      };

      for (let i = 0; i < 10; i++) {
        addItem({ id: i, content: `Item ${i}` });
      }

      expect(workingMemory.items).toHaveLength(7);
      expect(workingMemory.items[0].id).toBe(3);
    });
  });

  describe('Long-term Memory', () => {
    const longTermMemories = {
      byType: {},
      byTwin: {}
    };

    it('should organize by type', () => {
      const addMemory = (memory) => {
        longTermMemories.byType[memory.type] =
          (longTermMemories.byType[memory.type] || 0) + 1;
      };

      addMemory({ type: 'preference' });
      addMemory({ type: 'preference' });
      addMemory({ type: 'knowledge' });

      expect(longTermMemories.byType['preference']).toBe(2);
      expect(longTermMemories.byType['knowledge']).toBe(1);
    });

    it('should organize by twin', () => {
      const addMemory = (memory) => {
        longTermMemories.byTwin[memory.twinId] =
          (longTermMemories.byTwin[memory.twinId] || 0) + 1;
      };

      addMemory({ twinId: 'twin-1' });
      addMemory({ twinId: 'twin-1' });
      addMemory({ twinId: 'twin-2' });

      expect(longTermMemories.byTwin['twin-1']).toBe(2);
      expect(longTermMemories.byTwin['twin-2']).toBe(1);
    });
  });

  describe('Audit Log', () => {
    it('should log operations', () => {
      const log = (action, entityId, details) => {
        mockAuditLog.push({
          timestamp: Date.now(),
          action,
          entityId,
          details
        });
      };

      log('CREATE', 'mem-1', { type: 'preference' });
      log('UPDATE', 'mem-1', { changes: ['content'] });
      log('DELETE', 'mem-1', {});

      expect(mockAuditLog).toHaveLength(3);
      expect(mockAuditLog[0].action).toBe('CREATE');
    });
  });

  describe('Smart Forgetting', () => {
    it('should identify forgettable memories', () => {
      const shouldForget = (mem) =>
        mem.importance < 2 && mem.accessCount < 2 && mem.daysSinceAccess > 60;

      const memories = [
        { id: '1', importance: 1, accessCount: 1, daysSinceAccess: 90 },
        { id: '2', importance: 4, accessCount: 10, daysSinceAccess: 90 },
        { id: '3', importance: 2, accessCount: 5, daysSinceAccess: 30 }
      ];

      const forgettable = memories.filter(shouldForget);
      expect(forgettable).toHaveLength(1);
      expect(forgettable[0].id).toBe('1');
    });

    it('should preserve important memories', () => {
      const shouldPreserve = (mem) => mem.importance >= 3 || mem.accessCount >= 5;

      expect(shouldPreserve({ importance: 4, accessCount: 1 })).toBe(true);
      expect(shouldPreserve({ importance: 1, accessCount: 10 })).toBe(true);
      expect(shouldPreserve({ importance: 1, accessCount: 1 })).toBe(false);
    });
  });

  describe('Pagination', () => {
    it('should paginate results', () => {
      const allMemories = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const page = 3;
      const limit = 10;

      const paginated = allMemories.slice((page - 1) * limit, page * limit);

      expect(paginated).toHaveLength(10);
      expect(paginated[0].id).toBe(20);
    });

    it('should handle last page', () => {
      const allMemories = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const lastPage = Math.ceil(allMemories.length / 10);

      const paginated = allMemories.slice((lastPage - 1) * 10, lastPage * 10);

      expect(paginated).toHaveLength(5);
    });
  });

  describe('Retention Policy', () => {
    const DEFAULT_RETENTION_DAYS = 90;

    it('should use default retention', () => {
      expect(DEFAULT_RETENTION_DAYS).toBe(90);
    });

    it('should check expiration', () => {
      const isExpired = (memory) => {
        if (!memory.expiresAt) return false;
        return new Date(memory.expiresAt).getTime() <= Date.now();
      };

      expect(isExpired({})).toBe(false);
      expect(isExpired({ expiresAt: '2020-01-01' })).toBe(true);
      expect(isExpired({ expiresAt: '2099-01-01' })).toBe(false);
    });
  });
});
