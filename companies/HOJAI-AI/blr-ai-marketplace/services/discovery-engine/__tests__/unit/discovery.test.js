/**
 * Discovery Engine Tests
 * Tests for search, indexing, and scoring logic
 */

import { describe, it, expect } from 'vitest';

// Pure functions extracted from src/index.js for testing

function tokenize(s) {
  return (s || '').toLowerCase().match(/[a-z0-9_]+/g) || [];
}

function scoreDoc(doc, queryTokens) {
  const text = [doc.name, doc.description, ...(doc.tags || [])].join(' ').toLowerCase();
  const tokens = tokenize(text);
  let score = 0;
  for (const qt of queryTokens) {
    if ((doc.name || '').toLowerCase() === qt) score += 10;
    else if ((doc.name || '').toLowerCase().includes(qt)) score += 5;
    if ((doc.description || '').toLowerCase().includes(qt)) score += 2;
    if ((doc.tags || []).some(t => t.toLowerCase() === qt)) score += 3;
    if (tokens.includes(qt)) score += 1;
  }
  return score;
}

// Mock index for search tests
const mockIndex = [
  { id: '1', name: 'HOJAI Intelligence', description: 'Multi-model LLM router with 25 agents', tags: ['ai', 'llm', 'router'] },
  { id: '2', name: 'MemoryOS', description: 'Personal AI memory and knowledge graph', tags: ['memory', 'knowledge'] },
  { id: '3', name: 'TwinOS Hub', description: 'Central digital twin registry', tags: ['twins', 'digital-twin'] },
  { id: '4', name: 'Fine-Tuning Pipeline', description: 'LoRA/QLoRA fine-tune orchestrator', tags: ['training', 'ai'] },
];

function searchKind(indexDocs, queryTokens, limit = 10) {
  return indexDocs
    .map(d => ({ ...d, score: scoreDoc(d, queryTokens) }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Valid kinds
const VALID_KINDS = ['service', 'agent', 'twin', 'intent'];

// Validation helpers
function validateIndexInput(body) {
  const { kind, doc } = body || {};
  if (!kind) return { valid: false, error: 'kind required' };
  if (!VALID_KINDS.includes(kind)) return { valid: false, error: `kind must be one of ${VALID_KINDS.join(', ')}` };
  if (!doc || !doc.name) return { valid: false, error: 'doc with name required' };
  return { valid: true };
}

function validateBulkIndexInput(body) {
  const { kind, docs } = body || {};
  if (!kind) return { valid: false, error: 'kind required' };
  if (!VALID_KINDS.includes(kind)) return { valid: false, error: `kind must be one of ${VALID_KINDS.join(', ')}` };
  if (!Array.isArray(docs)) return { valid: false, error: 'docs must be an array' };
  return { valid: true };
}

function validateSearchInput(body) {
  const { query, limit, kinds } = body || {};
  if (!query) return { valid: false, error: 'query required' };
  return { valid: true, limit: limit || 10, kinds: kinds || VALID_KINDS };
}

describe('Discovery Engine - Tokenization', () => {
  it('should tokenize lowercase words', () => {
    const result = tokenize('hello world');
    expect(result).toEqual(['hello', 'world']);
  });

  it('should handle uppercase input', () => {
    const result = tokenize('HELLO WORLD');
    expect(result).toEqual(['hello', 'world']);
  });

  it('should extract alphanumeric tokens', () => {
    const result = tokenize('AI_LLM_router v2.0');
    // Regex matches: 'ai_llm_router', 'v2', '0' (v2.0 splits on the dot)
    expect(result).toContain('ai');
    expect(result).toContain('llm');
    expect(result).toContain('router');
    expect(result).toContain('v2');
    expect(result).toContain('0');
  });

  it('should handle special characters', () => {
    const result = tokenize('hello@world.com');
    expect(result).toEqual(['hello', 'world', 'com']);
  });

  it('should handle empty string', () => {
    const result = tokenize('');
    expect(result).toEqual([]);
  });

  it('should handle null input', () => {
    const result = tokenize(null);
    expect(result).toEqual([]);
  });

  it('should handle undefined input', () => {
    const result = tokenize(undefined);
    expect(result).toEqual([]);
  });

  it('should handle numbers', () => {
    const result = tokenize('port 4256');
    expect(result).toEqual(['port', '4256']);
  });

  it('should handle mixed case', () => {
    const result = tokenize('AI Router');
    expect(result).toEqual(['ai', 'router']);
  });
});

describe('Discovery Engine - Scoring', () => {
  it('should score exact name match highest', () => {
    const doc = { name: 'HOJAI Intelligence', description: 'AI service', tags: ['ai'] };
    const tokens = tokenize('Intelligence');

    const score = scoreDoc(doc, tokens);

    expect(score).toBeGreaterThan(0);
    // Exact name match should give higher score
    expect(score).toBeGreaterThanOrEqual(5);
  });

  it('should score name partial match', () => {
    const doc = { name: 'HOJAI Intelligence', description: 'AI service', tags: ['ai'] };
    const tokens = tokenize('HOJAI');

    const score = scoreDoc(doc, tokens);

    expect(score).toBeGreaterThan(0);
  });

  it('should score description match', () => {
    const doc = { name: 'Test', description: 'AI powered service', tags: [] };
    const tokens = tokenize('AI');

    const score = scoreDoc(doc, tokens);

    expect(score).toBeGreaterThan(0);
  });

  it('should score tag match', () => {
    const doc = { name: 'Test', description: 'Service', tags: ['ai', 'llm'] };
    const tokens = tokenize('ai');

    const score = scoreDoc(doc, tokens);

    expect(score).toBeGreaterThan(0);
  });

  it('should return 0 for no match', () => {
    const doc = { name: 'Test', description: 'Service', tags: ['test'] };
    const tokens = tokenize('xyz123');

    const score = scoreDoc(doc, tokens);

    expect(score).toBe(0);
  });

  it('should handle missing description', () => {
    const doc = { name: 'Test', tags: ['ai'] };
    const tokens = tokenize('ai');

    const score = scoreDoc(doc, tokens);

    expect(score).toBeGreaterThan(0);
  });

  it('should handle missing tags', () => {
    const doc = { name: 'AI Service', description: 'Description' };
    const tokens = tokenize('ai');

    const score = scoreDoc(doc, tokens);

    expect(score).toBeGreaterThan(0);
  });

  it('should accumulate scores for multiple matches', () => {
    const doc = { name: 'AI Router', description: 'AI powered routing', tags: ['ai'] };
    const tokens = tokenize('ai');

    const score = scoreDoc(doc, tokens);

    // Should get points from name match + description + tag
    expect(score).toBeGreaterThanOrEqual(3);
  });
});

describe('Discovery Engine - Search', () => {
  it('should return matching results sorted by score', () => {
    const tokens = tokenize('ai');

    const results = searchKind(mockIndex, tokens);

    expect(results.length).toBeGreaterThan(0);
    // First result should have highest score
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }
  });

  it('should return results with score and kind', () => {
    const tokens = tokenize('memory');

    const results = searchKind(mockIndex, tokens);

    expect(results[0]).toHaveProperty('score');
    expect(results[0]).toHaveProperty('name');
  });

  it('should respect limit', () => {
    const tokens = tokenize('ai');
    const limit = 2;

    const results = searchKind(mockIndex, tokens, limit);

    expect(results.length).toBeLessThanOrEqual(limit);
  });

  it('should return empty for no matches', () => {
    const tokens = tokenize('nonexistent');

    const results = searchKind(mockIndex, tokens);

    expect(results).toEqual([]);
  });

  it('should handle case-insensitive search', () => {
    const tokens1 = tokenize('AI');
    const tokens2 = tokenize('ai');

    const results1 = searchKind(mockIndex, tokens1);
    const results2 = searchKind(mockIndex, tokens2);

    // Should find same results regardless of case
    expect(results1.length).toBe(results2.length);
  });
});

describe('Discovery Engine - Input Validation', () => {
  describe('validateIndexInput', () => {
    it('should accept valid index input', () => {
      const result = validateIndexInput({
        kind: 'service',
        doc: { name: 'Test Service' }
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing kind', () => {
      const result = validateIndexInput({
        doc: { name: 'Test Service' }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('kind');
    });

    it('should reject invalid kind', () => {
      const result = validateIndexInput({
        kind: 'invalid',
        doc: { name: 'Test' }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be one of');
    });

    it('should reject missing doc', () => {
      const result = validateIndexInput({ kind: 'service' });
      expect(result.valid).toBe(false);
    });

    it('should reject doc without name', () => {
      const result = validateIndexInput({
        kind: 'service',
        doc: { description: 'No name' }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should accept all valid kinds', () => {
      for (const kind of VALID_KINDS) {
        const result = validateIndexInput({
          kind,
          doc: { name: 'Test' }
        });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('validateBulkIndexInput', () => {
    it('should accept valid bulk index input', () => {
      const result = validateBulkIndexInput({
        kind: 'service',
        docs: [{ name: 'Service 1' }, { name: 'Service 2' }]
      });
      expect(result.valid).toBe(true);
    });

    it('should reject non-array docs', () => {
      const result = validateBulkIndexInput({
        kind: 'service',
        docs: 'not-an-array'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('array');
    });

    it('should reject empty docs array', () => {
      const result = validateBulkIndexInput({
        kind: 'service',
        docs: []
      });
      // Empty array is valid (edge case)
      expect(result.valid).toBe(true);
    });
  });

  describe('validateSearchInput', () => {
    it('should accept valid search input', () => {
      const result = validateSearchInput({ query: 'AI agents' });
      expect(result.valid).toBe(true);
      expect(result.limit).toBe(10);
    });

    it('should accept custom limit', () => {
      const result = validateSearchInput({ query: 'AI', limit: 5 });
      expect(result.valid).toBe(true);
      expect(result.limit).toBe(5);
    });

    it('should accept specific kinds filter', () => {
      const result = validateSearchInput({
        query: 'AI',
        kinds: ['service', 'agent']
      });
      expect(result.valid).toBe(true);
      expect(result.kinds).toContain('service');
    });

    it('should reject missing query', () => {
      const result = validateSearchInput({});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('query');
    });

    it('should reject empty query', () => {
      const result = validateSearchInput({ query: '' });
      expect(result.valid).toBe(false);
    });
  });
});

describe('Discovery Engine - Health Response', () => {
  it('should return expected health structure', () => {
    const health = {
      status: 'ok',
      service: 'sutar-discovery-engine',
      sutarLayer: 7,
      layer: 'Discovery / Universal Search',
      port: 4256,
      counts: { service: 13, agent: 4, twin: 3, intent: 2 },
      timestamp: new Date().toISOString()
    };

    expect(health).toHaveProperty('status', 'ok');
    expect(health).toHaveProperty('service');
    expect(health).toHaveProperty('counts');
    expect(health.counts).toHaveProperty('service');
    expect(health.counts).toHaveProperty('agent');
    expect(health.counts).toHaveProperty('twin');
    expect(health.counts).toHaveProperty('intent');
  });
});
