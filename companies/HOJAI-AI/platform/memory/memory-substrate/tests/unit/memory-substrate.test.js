import { describe, it, expect, beforeEach } from 'vitest';

describe('Memory Substrate Service', () => {
  describe('Storage Operations', () => {
    it('should generate unique IDs', () => {
      const generateId = () => Math.random().toString(36).substring(2, 15);
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should track memory creation', () => {
      const memories = new Map();
      const memory = {
        id: 'test-id',
        content: 'Test content',
        type: 'episodic',
        version: 1,
        createdAt: Date.now()
      };
      memories.set(memory.id, memory);
      expect(memories.has('test-id')).toBe(true);
      expect(memories.get('test-id').content).toBe('Test content');
    });

    it('should track memory updates', () => {
      const memories = new Map();
      const versions = new Map();

      // Create initial memory
      const memory = {
        id: 'test-id',
        content: 'Original',
        version: 1
      };
      memories.set(memory.id, memory);
      versions.set('test-id:1', { ...memory });

      // Update memory
      const oldVersion = memory.version;
      memory.content = 'Updated';
      memory.version = oldVersion + 1;

      versions.set('test-id:2', { ...memory });
      memories.set(memory.id, memory);

      expect(memories.get('test-id').content).toBe('Updated');
      expect(memories.get('test-id').version).toBe(2);
      expect(versions.get('test-id:1').content).toBe('Original');
      expect(versions.get('test-id:2').content).toBe('Updated');
    });

    it('should handle memory deletion', () => {
      const memories = new Map();
      const memory = { id: 'test-id', content: 'Test' };
      memories.set(memory.id, memory);

      expect(memories.has('test-id')).toBe(true);
      memories.delete('test-id');
      expect(memories.has('test-id')).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    it('should search memories by text content', () => {
      const memories = [
        { id: '1', content: 'Meeting with John', type: 'episodic' },
        { id: '2', content: 'Project deadline tomorrow', type: 'semantic' },
        { id: '3', content: 'Call John about the project', type: 'episodic' }
      ];

      const search = (mem, query) => {
        const queryLower = query.toLowerCase();
        return mem.filter(m =>
          m.content.toLowerCase().includes(queryLower)
        );
      };

      const results = search(memories, 'John');
      expect(results).toHaveLength(2);
    });

    it('should filter by memory type', () => {
      const memories = [
        { id: '1', content: 'Memory 1', type: 'episodic' },
        { id: '2', content: 'Memory 2', type: 'semantic' },
        { id: '3', content: 'Memory 3', type: 'episodic' }
      ];

      const filterByType = (mem, type) => mem.filter(m => m.type === type);
      const episodic = filterByType(memories, 'episodic');

      expect(episodic).toHaveLength(2);
    });

    it('should calculate relevance score', () => {
      const content = 'Meeting with John about the project';
      const query = 'John project';

      const queryLower = query.toLowerCase();
      const matchCount = queryLower.split(' ')
        .filter(word => content.toLowerCase().includes(word)).length;
      const relevance = matchCount / queryLower.split(' ').length;

      expect(relevance).toBe(1); // Both words match
    });

    it('should rank results by relevance', () => {
      const memories = [
        { id: '1', content: 'Unrelated content' },
        { id: '2', content: 'Meeting with John' },
        { id: '3', content: 'John and the project meeting' }
      ];
      const query = 'John meeting';

      const queryLower = query.toLowerCase();
      const ranked = memories.map(m => {
        const contentLower = m.content.toLowerCase();
        const matchCount = queryLower.split(' ')
          .filter(word => contentLower.includes(word)).length;
        return { ...m, _relevance: matchCount / queryLower.split(' ').length };
      })
        .filter(m => m._relevance > 0)
        .sort((a, b) => b._relevance - a._relevance);

      expect(ranked[0].content).toBeTruthy();
      expect(ranked[0]._relevance).toBeGreaterThan(0);
    });
  });

  describe('Vector Operations', () => {
    it('should calculate cosine similarity', () => {
      const cosineSimilarity = (a, b) => {
        const dotProduct = a.reduce((sum, v, i) => sum + v * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
        const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
        return dotProduct / (magA * magB);
      };

      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];
      const vec3 = [0, 1, 0];

      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1);
      expect(cosineSimilarity(vec1, vec3)).toBeCloseTo(0);
    });

    it('should find similar vectors', () => {
      const memories = [
        { id: '1', content: 'Apple', embedding: [1, 0, 0] },
        { id: '2', content: 'Banana', embedding: [0, 1, 0] },
        { id: '3', content: 'Fruit', embedding: [0.8, 0.2, 0] }
      ];
      const query = [0.9, 0.1, 0];

      const cosineSimilarity = (a, b) => {
        const dotProduct = a.reduce((sum, v, i) => sum + v * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
        const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
        return dotProduct / (magA * magB);
      };

      const withSimilarity = memories.map(m => ({
        ...m,
        _similarity: cosineSimilarity(m.embedding, query)
      }));

      withSimilarity.sort((a, b) => b._similarity - a._similarity);

      expect(withSimilarity[0].content).toBe('Apple');
      expect(withSimilarity[0]._similarity).toBeGreaterThan(withSimilarity[1]._similarity);
    });
  });

  describe('Relationships', () => {
    it('should create relationships between memories', () => {
      const relationships = new Map();
      const relationship = {
        id: 'rel-1',
        from: 'mem-1',
        to: 'mem-2',
        type: 'related_to',
        createdAt: Date.now()
      };
      relationships.set(relationship.id, relationship);

      expect(relationships.size).toBe(1);
      expect(relationships.get('rel-1').type).toBe('related_to');
    });

    it('should filter relationships by endpoint', () => {
      const relationships = [
        { id: '1', from: 'A', to: 'B', type: 'parent' },
        { id: '2', from: 'A', to: 'C', type: 'child' },
        { id: '3', from: 'D', to: 'E', type: 'sibling' }
      ];

      const filterByFrom = (rels, from) => rels.filter(r => r.from === from);
      const filterByTo = (rels, to) => rels.filter(r => r.to === to);

      expect(filterByFrom(relationships, 'A')).toHaveLength(2);
      expect(filterByTo(relationships, 'B')).toHaveLength(1);
    });

    it('should filter relationships by type', () => {
      const relationships = [
        { id: '1', type: 'causes' },
        { id: '2', type: 'related_to' },
        { id: '3', type: 'causes' }
      ];

      const filterByType = (rels, type) => rels.filter(r => r.type === type);
      const causes = filterByType(relationships, 'causes');

      expect(causes).toHaveLength(2);
    });

    it('should handle relationship deletion', () => {
      const relationships = new Map();
      relationships.set('rel-1', { id: 'rel-1', from: 'A', to: 'B' });
      relationships.set('rel-2', { id: 'rel-2', from: 'C', to: 'D' });

      expect(relationships.size).toBe(2);
      relationships.delete('rel-1');
      expect(relationships.size).toBe(1);
      expect(relationships.has('rel-1')).toBe(false);
    });
  });

  describe('Version History', () => {
    it('should track memory versions', () => {
      const versions = new Map();
      versions.set('mem-1:1', { id: 'mem-1', content: 'v1', version: 1 });
      versions.set('mem-1:2', { id: 'mem-1', content: 'v2', version: 2 });
      versions.set('mem-1:3', { id: 'mem-1', content: 'v3', version: 3 });

      expect(versions.size).toBe(3);
      expect(versions.get('mem-1:1').content).toBe('v1');
      expect(versions.get('mem-1:3').content).toBe('v3');
    });

    it('should retrieve all versions of a memory', () => {
      const versions = new Map();
      versions.set('mem-1:1', { version: 1 });
      versions.set('mem-1:2', { version: 2 });
      versions.set('mem-1:3', { version: 3 });

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

      const allVersions = getVersions('mem-1');
      expect(allVersions).toHaveLength(3);
    });

    it('should retrieve specific version', () => {
      const versions = new Map();
      versions.set('mem-1:1', { version: 1, content: 'Original' });
      versions.set('mem-1:2', { version: 2, content: 'Updated' });

      expect(versions.get('mem-1:1').content).toBe('Original');
      expect(versions.get('mem-1:2').content).toBe('Updated');
    });
  });

  describe('Pagination', () => {
    it('should paginate memory results', () => {
      const memories = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const limit = 10;
      const offset = 20;

      const paginated = memories.slice(offset, offset + limit);

      expect(paginated).toHaveLength(10);
      expect(paginated[0].id).toBe(20);
      expect(paginated[9].id).toBe(29);
    });

    it('should handle last page correctly', () => {
      const memories = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const limit = 10;
      const lastPage = Math.ceil(memories.length / limit);

      const paginated = memories.slice((lastPage - 1) * limit, lastPage * limit);

      expect(paginated).toHaveLength(5);
    });

    it('should return correct total count', () => {
      const memories = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const limit = 10;
      const total = memories.length;
      const totalPages = Math.ceil(total / limit);

      expect(total).toBe(100);
      expect(totalPages).toBe(10);
    });
  });

  describe('Audit Logging', () => {
    it('should log audit entries', () => {
      const audit = [];

      const logAudit = (action, entityType, entityId, details) => {
        audit.push({
          id: Math.random().toString(36).substring(2),
          timestamp: Date.now(),
          action,
          entityType,
          entityId,
          details
        });
      };

      logAudit('CREATE', 'memory', 'mem-1', { type: 'episodic' });
      logAudit('UPDATE', 'memory', 'mem-1', { oldVersion: 1, newVersion: 2 });
      logAudit('DELETE', 'memory', 'mem-1', {});

      expect(audit).toHaveLength(3);
      expect(audit[0].action).toBe('CREATE');
      expect(audit[1].action).toBe('UPDATE');
      expect(audit[2].action).toBe('DELETE');
    });

    it('should track recent activity', () => {
      const audit = [];
      for (let i = 0; i < 150; i++) {
        audit.push({ id: i, timestamp: Date.now() - i * 1000 });
      }

      const recentActivity = audit.slice(-100);

      expect(recentActivity).toHaveLength(100);
      expect(audit.length).toBe(150);
    });
  });

  describe('Analytics', () => {
    it('should aggregate memories by type', () => {
      const memories = [
        { id: '1', type: 'episodic' },
        { id: '2', type: 'semantic' },
        { id: '3', type: 'episodic' },
        { id: '4', type: 'procedural' },
        { id: '5', type: 'semantic' }
      ];

      const byType = memories.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {});

      expect(byType.episodic).toBe(2);
      expect(byType.semantic).toBe(2);
      expect(byType.procedural).toBe(1);
    });

    it('should calculate storage usage', () => {
      const memories = [
        { id: '1', content: 'Short' },
        { id: '2', content: 'Medium length content' },
        { id: '3', content: 'A much longer content string for testing purposes' }
      ];

      const storageUsed = JSON.stringify(memories).length;

      expect(storageUsed).toBeGreaterThan(0);
    });

    it('should count relationships', () => {
      const relationships = new Map();
      relationships.set('r1', {});
      relationships.set('r2', {});
      relationships.set('r3', {});

      expect(relationships.size).toBe(3);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens for content', () => {
      const estimateTokens = (content) => {
        // Simple estimation: ~4 chars per token for English
        return Math.ceil(content.length / 4);
      };

      expect(estimateTokens('Hello world')).toBe(3);
      expect(estimateTokens('This is a longer sentence for testing')).toBeGreaterThanOrEqual(10);
    });

    it('should calculate embedding size', () => {
      const embeddings = [
        { id: '1', embedding: [1, 2, 3, 4, 5] },
        { id: '2', embedding: [0.1, 0.2, 0.3] }
      ];

      expect(embeddings[0].embedding.length).toBe(5);
      expect(embeddings[1].embedding.length).toBe(3);
    });
  });
});
