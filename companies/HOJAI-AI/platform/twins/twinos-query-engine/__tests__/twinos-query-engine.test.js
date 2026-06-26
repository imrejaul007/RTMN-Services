/**
 * TwinOS Query Engine — NL parser, query builder, and formatter tests
 */

import { describe, it, expect } from 'vitest';
import { parseQuery, parseQueries } from '../src/graph/nl-parser.js';
import { buildGraphOperation, prepareQuery } from '../src/graph/query-builder.js';
import {
  formatConnections,
  formatPath,
  formatInfluencers,
  formatCommunities,
  formatStats,
  formatInfluenceScore,
  formatResult,
  formatQueryResponse
} from '../src/graph/response-formatter.js';

// ─────────────────────────────────────────────────────────────────────────────
// NL Parser tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseQuery', () => {
  it('should parse "who is connected to X"', () => {
    const result = parseQuery('who is connected to Acme Corp');
    expect(result.intent).toBe('find_connected');
    expect(result.entities.entity).toBe('Acme Corp');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should parse "show all relationships for X"', () => {
    const result = parseQuery('show all relationships for Alice');
    expect(result.intent).toBe('find_connected');
    expect(result.entities.entity).toBe('Alice');
  });

  it('should parse "find the shortest path from X to Y"', () => {
    const result = parseQuery('find the shortest path from Alice to Bob');
    expect(result.intent).toBe('shortest_path');
    expect(result.entities.from).toBe('Alice');
    expect(result.entities.to).toBe('Bob');
  });

  it('should parse "how many hops between X and Y"', () => {
    const result = parseQuery('how many hops between Acme and Globex');
    expect(result.intent).toBe('shortest_path');
    expect(result.entities.from).toBe('Acme');
    expect(result.entities.to).toBe('Globex');
  });

  it('should parse "who are the top influencers"', () => {
    const result = parseQuery('who are the top influencers');
    expect(result.intent).toBe('top_influencers');
  });

  it('should parse "what is the influence score of X"', () => {
    const result = parseQuery('what is the influence score of Alice');
    expect(result.intent).toBe('influence_score');
    expect(result.entities.entity).toBe('Alice');
  });

  it('should parse "how important is X"', () => {
    const result = parseQuery('how important is Acme Corp');
    expect(result.intent).toBe('influence_score');
    expect(result.entities.entity).toBe('Acme Corp');
  });

  it('should parse "which nodes are in the same community as X"', () => {
    const result = parseQuery('which nodes are in the same community as Alice');
    expect(result.intent).toBe('community');
    expect(result.entities.entity).toBe('Alice');
  });

  it('should parse "tell me about X"', () => {
    const result = parseQuery('tell me about Alice');
    expect(result.intent).toBe('entity_info');
    expect(result.entities.entity).toBe('Alice');
  });

  it('should parse "what is the relationship between X and Y"', () => {
    const result = parseQuery('what is the relationship between Alice and Bob');
    expect(result.intent).toBe('relationship_between');
    expect(result.entities.from).toBe('Alice');
    expect(result.entities.to).toBe('Bob');
  });

  it('should parse entity search fallback', () => {
    const result = parseQuery('Acme Corporation');
    expect(result.intent).toBe('entity_search');
    expect(result.entities.entity).toBe('Acme Corporation');
  });

  it('should handle empty input', () => {
    const result = parseQuery('');
    expect(result.intent).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('should handle null/undefined', () => {
    expect(parseQuery(null).intent).toBe('unknown');
    expect(parseQuery(undefined).intent).toBe('unknown');
  });

  it('should preserve original query', () => {
    const q = 'who manages Acme Corp';
    const result = parseQuery(q);
    expect(result.original).toBe(q);
  });
});

describe('parseQueries (batch)', () => {
  it('should parse multiple queries', () => {
    const queries = [
      'who is connected to Alice',
      'find the shortest path from Bob to Carol',
      'who are the top influencers'
    ];
    const results = parseQueries(queries);
    expect(results.length).toBe(3);
    expect(results[0].intent).toBe('find_connected');
    expect(results[1].intent).toBe('shortest_path');
    expect(results[2].intent).toBe('top_influencers');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Query Builder tests
// ─────────────────────────────────────────────────────────────────────────────

describe('buildGraphOperation', () => {
  it('should build traverse operation for find_connected', () => {
    const parsed = parseQuery('who is connected to Alice');
    const op = buildGraphOperation(parsed);
    expect(op.operation).toBe('traverse');
    expect(op.endpoint).toContain('localhost:4715');
    expect(op.endpoint).toContain('Alice');
  });

  it('should build path operation for shortest_path', () => {
    const parsed = parseQuery('find the shortest path from Alice to Bob');
    const op = buildGraphOperation(parsed);
    expect(op.operation).toBe('path');
    expect(op.params.from).toBe('Alice');
    expect(op.params.to).toBe('Bob');
  });

  it('should build centrality operation for top_influencers', () => {
    const parsed = parseQuery('who are the top influencers');
    const op = buildGraphOperation(parsed);
    expect(op.operation).toBe('centrality');
  });

  it('should build community operation for community intent', () => {
    const parsed = parseQuery('which nodes are in the same community as Alice');
    const op = buildGraphOperation(parsed);
    expect(op.operation).toBe('traverse');
  });

  it('should build influence operation for influence_score', () => {
    const parsed = parseQuery('how important is Alice');
    const op = buildGraphOperation(parsed);
    expect(op.operation).toBe('influence');
  });

  it('should return unknown for unrecognized queries', () => {
    const parsed = { intent: 'unknown', entities: {}, original: 'xyz' };
    const op = buildGraphOperation(parsed);
    expect(op.operation).toBe('unknown');
    expect(op.endpoint).toBeNull();
  });
});

describe('prepareQuery', () => {
  it('should parse and build in one step', () => {
    const { parsed, operation } = prepareQuery('who is connected to Alice');
    expect(parsed.intent).toBe('find_connected');
    expect(operation.operation).toBe('traverse');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Response Formatter tests
// ─────────────────────────────────────────────────────────────────────────────

describe('formatConnections', () => {
  it('should format connections result', () => {
    const result = {
      nodes: [
        { id: 'Alice', depth: 0 },
        { id: 'Bob', depth: 1 },
        { id: 'Carol', depth: 1 }
      ],
      edges: [
        { id: 'e1', type: 'knows' },
        { id: 'e2', type: 'manages' }
      ]
    };
    const formatted = formatConnections(result, { entity: 'Alice' });
    expect(formatted).toContain('Alice');
    expect(formatted).toContain('Bob');
    expect(formatted).toContain('Carol');
    expect(formatted).toContain('directly connected');
  });

  it('should handle no connections', () => {
    const result = { nodes: [{ id: 'Alice', depth: 0 }], edges: [] };
    const formatted = formatConnections(result, { entity: 'Alice' });
    expect(formatted).toContain('no connections');
  });

  it('should group by depth', () => {
    const result = {
      nodes: [
        { id: 'Alice', depth: 0 },
        { id: 'Bob', depth: 1 },
        { id: 'Carol', depth: 2 }
      ],
      edges: []
    };
    const formatted = formatConnections(result, { entity: 'Alice' });
    expect(formatted).toContain('directly connected');
    expect(formatted).toContain('2-hop');
  });
});

describe('formatPath', () => {
  it('should format a valid path', () => {
    const result = {
      path: ['Alice', 'Bob', 'Carol'],
      distance: 2.5,
      hops: 2
    };
    const formatted = formatPath(result, { from: 'Alice', to: 'Carol' });
    expect(formatted).toContain('Alice → Bob → Carol');
    expect(formatted).toContain('2 hops');
  });

  it('should handle no path found', () => {
    const result = { path: [] };
    const formatted = formatPath(result, { from: 'Alice', to: 'Carol' });
    expect(formatted).toContain('not connected');
  });

  it('should handle same entity', () => {
    const result = { path: ['Alice'] };
    const formatted = formatPath(result, { from: 'Alice', to: 'Alice' });
    expect(formatted).toContain('same');
  });
});

describe('formatInfluencers', () => {
  it('should format top influencers', () => {
    const result = {
      nodes: [
        { id: 'Alice', rank: 1, influence: 0.95, tier: 'top-3' },
        { id: 'Bob', rank: 2, influence: 0.80, tier: 'top-3' }
      ]
    };
    const formatted = formatInfluencers(result);
    expect(formatted).toContain('Alice');
    expect(formatted).toContain('Bob');
    expect(formatted).toContain('top-3');
  });

  it('should handle empty result', () => {
    const formatted = formatInfluencers({ nodes: [] });
    expect(formatted).toContain('No influential');
  });
});

describe('formatCommunities', () => {
  it('should format communities', () => {
    const result = {
      communities: [
        { community: 0, members: ['A', 'B', 'C'] },
        { community: 1, members: ['D', 'E'] }
      ]
    };
    const formatted = formatCommunities(result);
    expect(formatted).toContain('2 community');
    expect(formatted).toContain('A, B, C');
    expect(formatted).toContain('D, E');
  });

  it('should handle empty result', () => {
    const formatted = formatCommunities({ communities: [] });
    expect(formatted).toContain('No communities');
  });
});

describe('formatStats', () => {
  it('should format graph statistics', () => {
    const result = {
      nodes: 100,
      edges: 450,
      density: 0.045,
      connected_components: 3
    };
    const formatted = formatStats(result);
    expect(formatted).toContain('100');
    expect(formatted).toContain('450');
    expect(formatted).toContain('3');
  });
});

describe('formatInfluenceScore', () => {
  it('should format influence score', () => {
    const result = {
      influence: 0.85,
      rank: 3,
      pagerank: 0.12,
      betweenness: 0.05,
      tier: 'top-10'
    };
    const formatted = formatInfluenceScore(result, { entity: 'Alice' });
    expect(formatted).toContain('Alice');
    expect(formatted).toContain('Rank: 3');
    expect(formatted).toContain('top-10');
  });
});

describe('formatResult (dispatch)', () => {
  it('should dispatch to formatConnections for traverse operation', () => {
    const result = {
      nodes: [{ id: 'A' }],
      edges: []
    };
    const formatted = formatResult(result, { operation: 'traverse' });
    expect(formatted).toBeTruthy();
  });

  it('should dispatch to formatPath for path operation', () => {
    const result = { path: ['A', 'B'] };
    const formatted = formatResult(result, { operation: 'path' });
    expect(formatted).toContain('A → B');
  });

  it('should handle unknown operation', () => {
    const result = { data: 'test' };
    const formatted = formatResult(result, { operation: 'unknown' });
    expect(formatted).toContain('test');
  });
});

describe('formatQueryResponse', () => {
  it('should format complete query response', () => {
    const parsed = {
      original: 'who is connected to Alice',
      intent: 'find_connected',
      confidence: 0.8,
      entities: { entity: 'Alice' }
    };
    const operation = {
      operation: 'traverse',
      description: 'Find all entities connected to "Alice"'
    };
    const result = {
      nodes: [{ id: 'Alice' }, { id: 'Bob' }],
      edges: []
    };

    const formatted = formatQueryResponse({ parsed, operation, result });
    expect(formatted).toContain('who is connected to Alice');
    expect(formatted).toContain('Intent: find_connected');
    expect(formatted).toContain('Alice');
  });
});
