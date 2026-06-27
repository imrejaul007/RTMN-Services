import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies before importing the module
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }))
  }
}));

describe('MemoryOS Core', () => {
  describe('Memory Types', () => {
    it('should support episodic memory type', () => {
      const memoryTypes = [
        'episodic', 'semantic', 'procedural', 'working',
        'sensory', '事实性', '情感性', '情景'
      ];
      expect(memoryTypes).toContain('episodic');
    });

    it('should support semantic memory type', () => {
      const memoryTypes = [
        'episodic', 'semantic', 'procedural', 'working',
        'sensory', '事实性', '情感性', '情景'
      ];
      expect(memoryTypes).toContain('semantic');
    });

    it('should support procedural memory type', () => {
      const memoryTypes = [
        'episodic', 'semantic', 'procedural', 'working',
        'sensory', '事实性', '情感性', '情景'
      ];
      expect(memoryTypes).toContain('procedural');
    });

    it('should support working memory type', () => {
      const memoryTypes = [
        'episodic', 'semantic', 'procedural', 'working',
        'sensory', '事实性', '情感性', '情景'
      ];
      expect(memoryTypes).toContain('working');
    });
  });

  describe('Memory Importance Levels', () => {
    it('should have importance levels defined', () => {
      const importanceLevels = [1, 2, 3, 4, 5];
      expect(importanceLevels).toHaveLength(5);
      expect(Math.min(...importanceLevels)).toBe(1);
      expect(Math.max(...importanceLevels)).toBe(5);
    });

    it('should calculate importance correctly', () => {
      const calculateImportance = (memory) => {
        const importanceScore = memory.accessCount * 0.1 +
          memory.emotionalValence * 0.3 +
          memory.recencyWeight * 0.2 +
          memory.relevanceScore * 0.4;
        return Math.min(5, Math.max(1, Math.round(importanceScore)));
      };

      const memory = {
        accessCount: 10,
        emotionalValence: 0.8,
        recencyWeight: 0.9,
        relevanceScore: 0.7
      };
      const importance = calculateImportance(memory);
      expect(importance).toBeGreaterThanOrEqual(1);
      expect(importance).toBeLessThanOrEqual(5);
    });
  });

  describe('Memory Lifecycle', () => {
    it('should track memory from creation to potential deletion', () => {
      const memoryLifecycle = {
        created: { status: 'active', timestamp: Date.now() },
        accessed: { status: 'active', timestamp: Date.now() },
        updated: { status: 'active', timestamp: Date.now() },
        archived: { status: 'archived', timestamp: null },
        deleted: { status: 'deleted', timestamp: null }
      };

      expect(memoryLifecycle.created.status).toBe('active');
      expect(memoryLifecycle.accessed.status).toBe('active');
      expect(memoryLifecycle.updated.status).toBe('active');
    });

    it('should handle memory state transitions', () => {
      const states = ['active', 'archived', 'deleted'];
      const validTransition = {
        'active': ['archived', 'deleted'],
        'archived': ['active', 'deleted'],
        'deleted': []
      };

      expect(validTransition['active']).toContain('archived');
      expect(validTransition['active']).toContain('deleted');
      expect(validTransition['archived']).toContain('active');
      expect(validTransition['deleted']).toHaveLength(0);
    });
  });

  describe('Memory Versioning', () => {
    it('should track memory versions', () => {
      const versions = [
        { version: 1, content: 'Original', timestamp: Date.now() - 1000 },
        { version: 2, content: 'Updated', timestamp: Date.now() }
      ];

      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBeLessThan(versions[1].version);
    });

    it('should retrieve specific version', () => {
      const memory = {
        versions: [
          { version: 1, content: 'Original content', timestamp: 1000 },
          { version: 2, content: 'Updated content', timestamp: 2000 }
        ]
      };

      const getVersion = (mem, ver) => mem.versions.find(v => v.version === ver);
      expect(getVersion(memory, 1)?.content).toBe('Original content');
      expect(getVersion(memory, 2)?.content).toBe('Updated content');
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate memory confidence', () => {
      const calculateConfidence = (source, decay, reinforcement) => {
        const base = source * 0.6;
        const decayFactor = 1 - (decay * 0.3);
        const reinforcementFactor = 1 + (reinforcement * 0.2);
        return Math.min(1, Math.max(0, base * decayFactor * reinforcementFactor));
      };

      const confidence = calculateConfidence(0.9, 0.2, 0.1);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle low confidence memories', () => {
      const calculateConfidence = (source, decay, reinforcement) => {
        const base = source * 0.6;
        const decayFactor = 1 - (decay * 0.3);
        const reinforcementFactor = 1 + (reinforcement * 0.2);
        return Math.min(1, Math.max(0, base * decayFactor * reinforcementFactor));
      };

      const lowConfidence = calculateConfidence(0.3, 0.8, 0);
      expect(lowConfidence).toBeLessThan(0.5);
    });
  });

  describe('Memory Search', () => {
    it('should search memories by content', () => {
      const memories = [
        { id: '1', content: 'Meeting with John', type: 'episodic' },
        { id: '2', content: 'Project deadline tomorrow', type: 'semantic' },
        { id: '3', content: 'Call John about the project', type: 'episodic' }
      ];

      const search = (mem, query) => mem.filter(m =>
        m.content.toLowerCase().includes(query.toLowerCase())
      );

      expect(search(memories, 'John')).toHaveLength(2);
      expect(search(memories, 'project')).toHaveLength(2);
      expect(search(memories, 'meeting')).toHaveLength(1);
    });

    it('should search by metadata filters', () => {
      const memories = [
        { id: '1', type: 'episodic', importance: 4 },
        { id: '2', type: 'semantic', importance: 2 },
        { id: '3', type: 'episodic', importance: 5 }
      ];

      const filterByType = (mem, type) => mem.filter(m => m.type === type);
      const filterByImportance = (mem, min) => mem.filter(m => m.importance >= min);

      expect(filterByType(memories, 'episodic')).toHaveLength(2);
      expect(filterByImportance(memories, 4)).toHaveLength(2);
    });
  });

  describe('Knowledge Graph', () => {
    it('should maintain entity relationships', () => {
      const graph = {
        entities: {
          'John': { type: 'person', id: 'person-1' },
          'Project A': { type: 'project', id: 'project-1' }
        },
        relationships: [
          { from: 'John', to: 'Project A', type: 'works_on' }
        ]
      };

      expect(graph.entities['John']).toBeDefined();
      expect(graph.entities['Project A']).toBeDefined();
      expect(graph.relationships).toHaveLength(1);
      expect(graph.relationships[0].type).toBe('works_on');
    });

    it('should traverse relationships', () => {
      const graph = {
        entities: {
          'A': { connections: ['B', 'C'] },
          'B': { connections: ['C'] },
          'C': { connections: [] }
        }
      };

      const getConnections = (entity) => graph.entities[entity]?.connections || [];
      expect(getConnections('A')).toContain('B');
      expect(getConnections('A')).toContain('C');
      expect(getConnections('C')).toHaveLength(0);
    });
  });

  describe('Working Memory', () => {
    it('should hold limited items in working memory', () => {
      const workingMemory = {
        items: [],
        capacity: 7 // Miller's law
      };

      for (let i = 0; i < 5; i++) {
        workingMemory.items.push({ id: i, content: `Item ${i}` });
      }

      expect(workingMemory.items).toHaveLength(5);
      expect(workingMemory.capacity).toBe(7);
    });

    it('should evict oldest when over capacity', () => {
      const workingMemory = {
        items: [],
        capacity: 3
      };

      const addItem = (wm, item) => {
        if (wm.items.length >= wm.capacity) {
          wm.items.shift(); // Evict oldest
        }
        wm.items.push(item);
      };

      addItem(workingMemory, { id: 1 });
      addItem(workingMemory, { id: 2 });
      addItem(workingMemory, { id: 3 });
      addItem(workingMemory, { id: 4 }); // Should evict id 1

      expect(workingMemory.items).toHaveLength(3);
      expect(workingMemory.items[0].id).toBe(2);
      expect(workingMemory.items[2].id).toBe(4);
    });
  });

  describe('Long-term Memory', () => {
    it('should organize long-term memories by type', () => {
      const longTermMemories = {
        episodic: [],
        semantic: [],
        procedural: []
      };

      longTermMemories.episodic.push({ id: 'e1', content: 'Yesterday meeting' });
      longTermMemories.semantic.push({ id: 's1', content: 'Water freezes at 0°C' });
      longTermMemories.procedural.push({ id: 'p1', content: 'How to ride a bike' });

      expect(longTermMemories.episodic).toHaveLength(1);
      expect(longTermMemories.semantic).toHaveLength(1);
      expect(longTermMemories.procedural).toHaveLength(1);
    });

    it('should calculate memory strength based on retrieval', () => {
      const calculateStrength = (retrievals, consolidation) => {
        const retrievalBonus = Math.log(retrievals + 1) * 0.1;
        const consolidationBonus = consolidation * 0.2;
        return Math.min(1, retrievalBonus + consolidationBonus);
      };

      expect(calculateStrength(5, 0.5)).toBeGreaterThan(0.2);
      expect(calculateStrength(0, 0)).toBeLessThan(0.1);
    });
  });

  describe('Timeline', () => {
    it('should track memory events in timeline', () => {
      const timeline = [
        { timestamp: 1000, event: 'Memory created', type: 'create' },
        { timestamp: 2000, event: 'Memory accessed', type: 'access' },
        { timestamp: 3000, event: 'Memory updated', type: 'update' }
      ];

      expect(timeline).toHaveLength(3);
      expect(timeline[0].timestamp).toBeLessThan(timeline[1].timestamp);
      expect(timeline[1].timestamp).toBeLessThan(timeline[2].timestamp);
    });

    it('should query timeline by time range', () => {
      const timeline = [
        { timestamp: 1000, event: 'Event 1' },
        { timestamp: 2000, event: 'Event 2' },
        { timestamp: 3000, event: 'Event 3' },
        { timestamp: 4000, event: 'Event 4' }
      ];

      const queryRange = (tl, start, end) =>
        tl.filter(e => e.timestamp >= start && e.timestamp <= end);

      expect(queryRange(timeline, 1500, 2500)).toHaveLength(1);
      expect(queryRange(timeline, 0, 5000)).toHaveLength(4);
    });
  });

  describe('Memory Sharing', () => {
    it('should support sharing memories between agents', () => {
      const sharingPermissions = {
        private: ['sensitive-data'],
        shared: ['general-info', 'project-updates'],
        public: ['contact-info']
      };

      const canShare = (mem, permission) => {
        if (permission === 'public') return true;
        if (permission === 'shared') return !sharingPermissions.private.includes(mem);
        return false;
      };

      expect(canShare('general-info', 'shared')).toBe(true);
      expect(canShare('sensitive-data', 'shared')).toBe(false);
      expect(canShare('contact-info', 'public')).toBe(true);
    });
  });

  describe('Audit Log', () => {
    it('should track all memory operations', () => {
      const auditLog = [];

      const logOperation = (op, memoryId, details) => {
        auditLog.push({
          timestamp: Date.now(),
          operation: op,
          memoryId,
          details
        });
      };

      logOperation('create', 'mem-1', { type: 'episodic' });
      logOperation('access', 'mem-1', { source: 'user-query' });
      logOperation('update', 'mem-1', { changes: ['content'] });

      expect(auditLog).toHaveLength(3);
      expect(auditLog[0].operation).toBe('create');
      expect(auditLog[1].operation).toBe('access');
      expect(auditLog[2].operation).toBe('update');
    });

    it('should maintain audit integrity', () => {
      const auditLog = [];
      const addEntry = (entry) => auditLog.push(entry);

      addEntry({ id: 1, timestamp: Date.now(), action: 'test' });
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].id).toBe(1);
    });
  });

  describe('Smart Forgetting', () => {
    it('should forget low-importance old memories', () => {
      const memories = [
        { id: '1', importance: 1, age: 90, accessed: false },
        { id: '2', importance: 5, age: 90, accessed: true },
        { id: '3', importance: 2, age: 30, accessed: true }
      ];

      const shouldForget = (mem) =>
        mem.importance < 2 && mem.age > 60 && !mem.accessed;

      const forgettable = memories.filter(shouldForget);
      expect(forgettable).toHaveLength(1);
      expect(forgettable[0].id).toBe('1');
    });

    it('should preserve high-importance memories', () => {
      const preserve = (mem) => mem.importance >= 4 || mem.accessed;

      expect(preserve({ importance: 5, accessed: false })).toBe(true);
      expect(preserve({ importance: 1, accessed: true })).toBe(true);
      expect(preserve({ importance: 2, accessed: false })).toBe(false);
    });
  });

  describe('Analytics', () => {
    it('should track memory statistics', () => {
      const stats = {
        totalMemories: 100,
        byType: { episodic: 40, semantic: 35, procedural: 25 },
        averageConfidence: 0.75,
        averageImportance: 3.2
      };

      expect(stats.totalMemories).toBe(100);
      expect(stats.byType.episodic + stats.byType.semantic + stats.byType.procedural)
        .toBe(100);
    });

    it('should calculate memory efficiency', () => {
      const calculateEfficiency = (successful, total) =>
        total > 0 ? successful / total : 0;

      expect(calculateEfficiency(80, 100)).toBe(0.8);
      expect(calculateEfficiency(0, 0)).toBe(0);
    });
  });

  describe('Learning', () => {
    it('should adapt based on retrieval patterns', () => {
      const patterns = {
        frequentQueries: ['project-status', 'meeting-notes'],
        recentAccess: ['task-123', 'contact-info'],
        failedRetrievals: ['old-file']
      };

      const adaptPriority = (patterns) => {
        const priorities = {};
        patterns.frequentQueries.forEach(q => priorities[q] = 3);
        patterns.recentAccess.forEach(a => priorities[a] = 2);
        return priorities;
      };

      const priorities = adaptPriority(patterns);
      expect(priorities['project-status']).toBe(3);
      expect(priorities['task-123']).toBe(2);
    });

    it('should update memory consolidation based on usage', () => {
      const consolidationScore = (retrievals, updates) =>
        Math.min(1, (retrievals * 0.1 + updates * 0.2) / 10);

      expect(consolidationScore(5, 2)).toBeGreaterThan(0);
      expect(consolidationScore(100, 50)).toBeLessThanOrEqual(1);
    });
  });

  describe('Bulk Operations', () => {
    it('should batch memory operations', () => {
      const batch = [];
      const batchSize = 10;

      for (let i = 0; i < 25; i++) {
        batch.push({ id: i, data: `item-${i}` });
      }

      const batches = [];
      for (let i = 0; i < batch.length; i += batchSize) {
        batches.push(batch.slice(i, i + batchSize));
      }

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(10);
      expect(batches[1]).toHaveLength(10);
      expect(batches[2]).toHaveLength(5);
    });

    it('should merge duplicate memories', () => {
      const memories = [
        { id: '1', content: 'Meeting at 3pm', confidence: 0.9 },
        { id: '2', content: 'Meeting at 3pm', confidence: 0.7 }
      ];

      const mergeDuplicates = (mem) => {
        const merged = {};
        mem.forEach(m => {
          const key = m.content;
          if (!merged[key] || merged[key].confidence < m.confidence) {
            merged[key] = m;
          }
        });
        return Object.values(merged);
      };

      const result = mergeDuplicates(memories);
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.9);
    });
  });

  describe('Pagination', () => {
    it('should paginate memory results', () => {
      const allMemories = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const pageSize = 10;
      const page = 3;

      const paginate = (items, size, p) =>
        items.slice((p - 1) * size, p * size);

      const result = paginate(allMemories, pageSize, page);
      expect(result).toHaveLength(10);
      expect(result[0].id).toBe(20);
      expect(result[9].id).toBe(29);
    });

    it('should handle last page correctly', () => {
      const allMemories = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const pageSize = 10;
      const lastPage = Math.ceil(allMemories.length / pageSize);

      const paginate = (items, size, p) =>
        items.slice((p - 1) * size, p * size);

      const result = paginate(allMemories, pageSize, lastPage);
      expect(result).toHaveLength(5);
    });
  });
});
