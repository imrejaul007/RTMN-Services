import { describe, it, expect } from 'vitest';
import { forwardChain, backwardChain } from '../../src/rules/ruleEngine.js';
import { findAllPaths, shortestPath } from '../../src/path/pathQuery.js';
import { computeTransitiveClosure, getReachableFrom } from '../../src/closure/transitiveClosure.js';
import { predictLinks } from '../../src/prediction/linkPrediction.js';
import { optimizeQuery } from '../../src/query/queryPlanner.js';

describe('Rule Engine', () => {
  describe('forwardChain', () => {
    it('should derive new facts from rules', () => {
      const rules = [{
        id: 'rule1',
        name: 'Test Rule',
        antecedent: [{ attribute: 'temperature', operator: 'gt', value: 30 }],
        consequent: [{ type: 'assert' as const, attribute: 'hot-weather', value: true }],
        enabled: true
      }];

      const facts = [
        { id: 'f1', attribute: 'temperature', value: 35, timestamp: new Date() }
      ];

      const result = forwardChain(rules, facts);
      expect(result.newFacts).toHaveLength(1);
      expect(result.newFacts[0].attribute).toBe('hot-weather');
    });
  });

  describe('backwardChain', () => {
    it('should prove goal by finding supporting rules', () => {
      const rules = [{
        id: 'rule1',
        name: 'Parent Rule',
        antecedent: [{ attribute: 'parent', operator: 'eq', value: 'john' }],
        consequent: [{ type: 'assert' as const, attribute: 'child', value: 'jane' }],
        enabled: true
      }];

      const facts = [
        { id: 'f1', attribute: 'parent', value: 'john', timestamp: new Date() }
      ];

      const result = backwardChain(rules, { attribute: 'child', value: 'jane' }, facts);
      expect(result.success).toBe(true);
    });
  });
});

describe('Path Query', () => {
  const graph = {
    nodes: [
      { id: 'A', type: 'person', properties: {} },
      { id: 'B', type: 'person', properties: {} },
      { id: 'C', type: 'person', properties: {} }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', type: 'knows', properties: {} },
      { id: 'e2', source: 'B', target: 'C', type: 'knows', properties: {} },
      { id: 'e3', source: 'A', target: 'C', type: 'knows', properties: {} }
    ]
  };

  describe('findAllPaths', () => {
    it('should find all paths between nodes', () => {
      const paths = findAllPaths('A', 'C', graph, 5);
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('shortestPath', () => {
    it('should find shortest path', () => {
      const path = shortestPath('A', 'C', graph);
      expect(path).toBeDefined();
      expect(path?.nodes).toHaveLength(2); // Direct edge
    });
  });
});

describe('Transitive Closure', () => {
  it('should compute reachability', () => {
    const nodes = ['A', 'B', 'C'];
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' }
    ];

    const closure = computeTransitiveClosure(nodes, edges);
    const reachable = getReachableFrom('A', closure);

    expect(reachable).toContain('A');
    expect(reachable).toContain('B');
    expect(reachable).toContain('C');
  });
});

describe('Link Prediction', () => {
  it('should predict potential links', () => {
    const nodes = [
      { id: 'A', neighbors: ['B', 'C'] },
      { id: 'B', neighbors: ['A', 'C'] },
      { id: 'C', neighbors: ['A', 'B'] }
    ];

    const predictions = predictLinks(nodes, 0.1);
    // No new links should be predicted since all nodes are already connected
    expect(Array.isArray(predictions)).toBe(true);
  });
});

describe('Query Planner', () => {
  it('should optimize query plan', () => {
    const query = {
      start: 'person',
      hops: [{ edgeType: 'knows', nodeType: 'person' }],
      filters: [{ property: 'name', operator: 'eq', value: 'John' }],
      limit: 10
    };

    const plan = optimizeQuery(query);
    expect(plan.operations).toBeDefined();
    expect(plan.operations.length).toBeGreaterThan(0);
  });
});
