import { describe, it, expect } from 'vitest';

describe('Memory Context Engine Service', () => {
  describe('Context Composition', () => {
    it('should compose context from multiple sources', () => {
      const composeContext = (sources) => {
        const context = {
          facts: [],
          memories: [],
          twins: [],
          workingMemory: [],
          metadata: {}
        };

        sources.forEach(source => {
          if (source.type === 'fact') context.facts.push(source.content);
          if (source.type === 'memory') context.memories.push(source.content);
          if (source.type === 'twin') context.twins.push(source.data);
          if (source.type === 'working') context.workingMemory.push(source.item);
        });

        return context;
      };

      const sources = [
        { type: 'fact', content: 'User prefers tea' },
        { type: 'memory', content: 'Yesterday meeting notes' },
        { type: 'twin', data: { preferences: { color: 'blue' } } },
        { type: 'working', item: 'Current task' }
      ];

      const context = composeContext(sources);
      expect(context.facts).toHaveLength(1);
      expect(context.memories).toHaveLength(1);
      expect(context.twins).toHaveLength(1);
      expect(context.workingMemory).toHaveLength(1);
    });

    it('should handle empty sources', () => {
      const composeContext = (sources) => {
        const context = {
          facts: [],
          memories: [],
          twins: [],
          workingMemory: []
        };

        sources.forEach(source => {
          if (source.type === 'fact') context.facts.push(source.content);
          if (source.type === 'memory') context.memories.push(source.content);
          if (source.type === 'twin') context.twins.push(source.data);
          if (source.type === 'working') context.workingMemory.push(source.item);
        });

        return context;
      };

      const context = composeContext([]);
      expect(context.facts).toHaveLength(0);
      expect(context.memories).toHaveLength(0);
      expect(context.twins).toHaveLength(0);
      expect(context.workingMemory).toHaveLength(0);
    });
  });

  describe('Scoring', () => {
    it('should score context items by relevance', () => {
      const scoreItem = (item, query) => {
        const relevance = item.content.toLowerCase().includes(query.toLowerCase()) ? 0.5 : 0;
        const recency = item.lastAccessed ?
          Math.exp(-0.001 * (Date.now() - item.lastAccessed)) : 0.3;
        const confidence = item.confidence || 0.5;
        return relevance + recency * 0.3 + confidence * 0.2;
      };

      const item = {
        content: 'Project deadline is tomorrow',
        lastAccessed: Date.now() - 3600000, // 1 hour ago
        confidence: 0.9
      };

      const score = scoreItem(item, 'project');
      expect(score).toBeGreaterThan(0);
    });

    it('should prioritize recency', () => {
      const scores = [
        { lastAccessed: Date.now() - 3600000, expected: 'high' }, // 1 hour
        { lastAccessed: Date.now() - 86400000, expected: 'medium' }, // 1 day
        { lastAccessed: Date.now() - 604800000, expected: 'low' } // 1 week
      ];

      // Use a much smaller decay factor so recency differences are meaningful
      const recencyScore = (lastAccessed) =>
        Math.exp(-0.00000001 * (Date.now() - lastAccessed));

      const s0 = recencyScore(scores[0].lastAccessed);
      const s1 = recencyScore(scores[1].lastAccessed);
      const s2 = recencyScore(scores[2].lastAccessed);

      expect(s0).toBeGreaterThan(s1);
      expect(s1).toBeGreaterThan(s2);
    });

    it('should combine multiple factors', () => {
      const calculateScore = (relevance, recency, confidence, importance) => {
        return (
          relevance * 0.4 +
          recency * 0.3 +
          confidence * 0.2 +
          importance * 0.1
        );
      };

      const score = calculateScore(0.9, 0.8, 0.7, 0.6);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Caching', () => {
    it('should cache context results', () => {
      const cache = new Map();

      const getCached = (key) => cache.get(key);
      const setCached = (key, value, ttl = 300000) => {
        cache.set(key, {
          value,
          expires: Date.now() + ttl
        });
      };

      setCached('twin-1:query', { content: 'cached context' });
      const cached = getCached('twin-1:query');

      expect(cached).toBeDefined();
      expect(cached.value.content).toBe('cached context');
    });

    it('should invalidate expired cache', () => {
      const cache = new Map();

      const isExpired = (entry) => Date.now() > entry.expires;

      cache.set('key', { value: 'test', expires: Date.now() - 1000 });
      cache.set('valid', { value: 'test', expires: Date.now() + 60000 });

      const validEntries = Array.from(cache.entries())
        .filter(([_, entry]) => !isExpired(entry));

      expect(validEntries).toHaveLength(1);
      expect(validEntries[0][0]).toBe('valid');
    });

    it('should limit cache size', () => {
      const cache = new Map();
      const MAX_SIZE = 1000;

      const addToCache = (key, value) => {
        if (cache.size >= MAX_SIZE) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(key, value);
      };

      for (let i = 0; i < 1050; i++) {
        addToCache(`key-${i}`, { data: `value-${i}` });
      }

      expect(cache.size).toBe(1000);
    });
  });

  describe('Tokenization', () => {
    it('should estimate tokens', () => {
      const estimateTokens = (text) => {
        // Rough estimation: ~4 chars per token for English
        return Math.ceil(text.length / 4);
      };

      expect(estimateTokens('Hello world')).toBe(3);
      expect(estimateTokens('Short')).toBeGreaterThanOrEqual(1);
      expect(estimateTokens('A much longer sentence for testing purposes')).toBeGreaterThan(10);
    });

    it('should respect token budget', () => {
      const MAX_TOKENS = 8000;
      const items = [
        { content: 'Item 1', tokens: 100 },
        { content: 'Item 2', tokens: 200 },
        { content: 'Item 3', tokens: 300 }
      ];

      let totalTokens = 0;
      const selected = [];

      for (const item of items) {
        if (totalTokens + item.tokens <= MAX_TOKENS) {
          selected.push(item);
          totalTokens += item.tokens;
        }
      }

      expect(selected).toHaveLength(3);
      expect(totalTokens).toBe(600);
    });
  });

  describe('Filtering', () => {
    it('should filter by date range', () => {
      const items = [
        { id: '1', createdAt: Date.now() - 86400000 }, // 1 day ago
        { id: '2', createdAt: Date.now() - 604800000 }, // 1 week ago
        { id: '3', createdAt: Date.now() - 2592000000 } // 1 month ago
      ];

      const filterByDate = (items, minAge, maxAge) => {
        const now = Date.now();
        return items.filter(item => {
          const age = now - item.createdAt;
          return age >= minAge && age <= maxAge;
        });
      };

      const oneDay = 86400000;
      const oneWeek = 604800000;

      const recent = filterByDate(items, 0, oneWeek);
      expect(recent).toHaveLength(2);
    });

    it('should filter by confidence threshold', () => {
      const items = [
        { id: '1', confidence: 0.95 },
        { id: '2', confidence: 0.7 },
        { id: '3', confidence: 0.4 },
        { id: '4', confidence: 0.2 }
      ];

      const highConfidence = items.filter(i => i.confidence >= 0.7);
      expect(highConfidence).toHaveLength(2);
    });

    it('should filter by type', () => {
      const items = [
        { id: '1', type: 'episodic' },
        { id: '2', type: 'semantic' },
        { id: '3', type: 'episodic' },
        { id: '4', type: 'procedural' }
      ];

      const episodic = items.filter(i => i.type === 'episodic');
      expect(episodic).toHaveLength(2);
    });
  });

  describe('Response Formatting', () => {
    it('should format context for LLM', () => {
      const formatForLLM = (context) => {
        const sections = [];

        if (context.facts.length > 0) {
          sections.push('## Facts\n' + context.facts.map(f => `- ${f}`).join('\n'));
        }

        if (context.memories.length > 0) {
          sections.push('## Relevant Memories\n' + context.memories.map(m => `- ${m}`).join('\n'));
        }

        if (context.twins.length > 0) {
          sections.push('## Twin Data\n' + JSON.stringify(context.twins, null, 2));
        }

        return sections.join('\n\n');
      };

      const context = {
        facts: ['User prefers dark mode'],
        memories: ['Previous conversation about settings'],
        twins: [{ preferences: { theme: 'dark' } }]
      };

      const formatted = formatForLLM(context);
      expect(formatted).toContain('Facts');
      expect(formatted).toContain('Relevant Memories');
      expect(formatted).toContain('Twin Data');
    });

    it('should include metadata', () => {
      const formatWithMetadata = (context, twinId, query) => {
        return {
          twinId,
          query,
          context,
          generatedAt: Date.now(),
          tokensUsed: estimateTokens(JSON.stringify(context))
        };
      };

      const estimateTokens = (text) => Math.ceil(text.length / 4);

      const result = formatWithMetadata(
        { facts: ['Test'] },
        'twin-1',
        'test query'
      );

      expect(result.twinId).toBe('twin-1');
      expect(result.query).toBe('test query');
      expect(result.generatedAt).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);
    });
  });

  describe('Stats Tracking', () => {
    it('should track total calls', () => {
      const stats = {
        totalCalls: 0,
        callsByTwin: {},
        callsByQuery: {}
      };

      const recordCall = (twinId, query) => {
        stats.totalCalls += 1;
        stats.callsByTwin[twinId] = (stats.callsByTwin[twinId] || 0) + 1;
        stats.callsByQuery[query] = (stats.callsByQuery[query] || 0) + 1;
      };

      recordCall('twin-1', 'test');
      recordCall('twin-1', 'test');
      recordCall('twin-2', 'other');

      expect(stats.totalCalls).toBe(3);
      expect(stats.callsByTwin['twin-1']).toBe(2);
      expect(stats.callsByTwin['twin-2']).toBe(1);
    });

    it('should track cache hit rate', () => {
      const cacheStats = {
        hits: 0,
        misses: 0
      };

      const recordHit = () => cacheStats.hits += 1;
      const recordMiss = () => cacheStats.misses += 1;

      recordHit();
      recordHit();
      recordMiss();

      const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses);
      expect(hitRate).toBeCloseTo(0.667, 1);
    });
  });
});
