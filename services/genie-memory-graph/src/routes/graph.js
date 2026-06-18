/**
 * Graph Routes - Unified graph operations
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /graph/:userId/full
 * Get complete graph for user
 */
router.get('/graph/:userId/full', async (req, res) => {
  const { userId } = req.params;
  const storage = req.app.locals.graphStorage;

  const identity = storage.identities.get(userId);
  const knowledge = storage.knowledgeTriples.get(userId) || [];
  const relationships = storage.relationships.get(userId) || [];
  const goals = storage.goals.get(userId) || [];
  const events = storage.events.get(userId) || [];
  const preferences = storage.preferences.get(userId);

  res.json({
    success: true,
    userId,
    graph: {
      identity,
      knowledgeCount: knowledge.length,
      relationshipsCount: relationships.length,
      goalsCount: goals.length,
      eventsCount: events.length,
      hasPreferences: !!preferences
    }
  });
});

/**
 * POST /graph/:userId/connect
 * Create connection between entities
 */
router.post('/graph/:userId/connect', async (req, res) => {
  const { userId, source, target, relation, strength, metadata } = req.body;
  const storage = req.app.locals.graphStorage;

  if (!storage.edges.has(userId)) {
    storage.edges.set(userId, new Map());
  }

  if (!storage.edges.get(userId).has(source)) {
    storage.edges.get(userId).set(source, []);
  }

  const edge = {
    id: uuidv4(),
    source,
    target,
    relation,
    strength: strength || 5,
    metadata,
    createdAt: new Date().toISOString()
  };

  storage.edges.get(userId).get(source).push(edge);

  res.json({ success: true, edge });
});

/**
 * GET /graph/:userId/path
 * Find path between two entities
 */
router.get('/graph/:userId/path', async (req, res) => {
  const { userId } = req.params;
  const { from, to, maxDepth } = req.query;
  const storage = req.app.locals.graphStorage;

  const edges = storage.edges.get(userId) || new Map();
  const max = parseInt(maxDepth) || 3;

  // Simple BFS to find path
  const path = findPath(edges, from, to, max);

  res.json({
    success: true,
    path,
    found: path.length > 0
  });
});

/**
 * GET /graph/:userId/neighbors
 * Get neighboring entities
 */
router.get('/graph/:userId/neighbors', async (req, res) => {
  const { userId } = req.params;
  const { entity, depth } = req.query;
  const storage = req.app.locals.graphStorage;

  const edges = storage.edges.get(userId) || new Map();
  const d = parseInt(depth) || 1;

  const neighbors = getNeighbors(edges, entity, d);

  res.json({
    success: true,
    entity,
    depth: d,
    neighbors
  });
});

/**
 * GET /graph/:userId/centrality
 * Get most connected entities
 */
router.get('/graph/:userId/centrality', async (req, res) => {
  const { userId } = req.params;
  const { limit } = req.query;
  const storage = req.app.locals.graphStorage;

  const edges = storage.edges.get(userId) || new Map();

  // Count connections
  const counts = {};
  edges.forEach((nodeEdges, node) => {
    counts[node] = nodeEdges.length;
    nodeEdges.forEach(e => {
      counts[e.target] = (counts[e.target] || 0) + 1;
    });
  });

  // Sort by connection count
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, parseInt(limit) || 10)
    .map(([entity, connections]) => ({ entity, connections }));

  res.json({
    success: true,
    centralEntities: sorted
  });
});

// Helper functions
function findPath(edges, from, to, maxDepth) {
  const visited = new Set();
  const queue = [[from, [from]]];

  while (queue.length > 0) {
    const [current, path] = queue.shift();

    if (current === to) {
      return path;
    }

    if (path.length > maxDepth) continue;

    const nodeEdges = edges.get(current) || [];
    for (const edge of nodeEdges) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push([edge.target, [...path, edge.target]]);
      }
    }
  }

  return [];
}

function getNeighbors(edges, entity, depth) {
  const neighbors = new Set();
  const queue = [[entity, 0]];
  const visited = new Set([entity]);

  while (queue.length > 0) {
    const [current, d] = queue.shift();

    if (d >= depth) continue;

    const nodeEdges = edges.get(current) || [];
    for (const edge of nodeEdges) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        neighbors.add(edge.target);
        queue.push([edge.target, d + 1]);
      }
    }
  }

  return Array.from(neighbors);
}

export default router;
