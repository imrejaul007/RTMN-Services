/**
 * Federation Routes
 * Cross-twin queries and relationship management
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, TWIN_TYPES, RELATIONSHIP_TYPES } from '../index.js';

const router = Router();

/**
 * Federated query across twin types
 * POST /api/relationships/federate
 */
router.post('/federate', async (req, res) => {
  try {
    const {
      query,
      types = Object.values(TWIN_TYPES),
      filters = {},
      limit = 50
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const searchLower = query.toLowerCase();
    const results = { twins: [], byType: {} };

    // Search each type
    for (const type of types) {
      const typeIds = await redis.smembers(`twins:type:${type}`);
      const typeResults = [];

      for (const id of typeIds) {
        const data = await redis.get(`twin:${id}`);
        if (data) {
          const twin = JSON.parse(data);

          // Apply filters
          if (filters.industry && twin.industry !== filters.industry) continue;
          if (filters.subtype && twin.subtype !== filters.subtype) continue;

          // Search in name and data
          const nameMatch = twin.name.toLowerCase().includes(searchLower);
          const dataMatch = JSON.stringify(twin.data).toLowerCase().includes(searchLower);
          const metaMatch = JSON.stringify(twin.metadata).toLowerCase().includes(searchLower);

          if (nameMatch || dataMatch || metaMatch) {
            typeResults.push(twin);
          }
        }
      }

      results.byType[type] = typeResults.length;
      results.twins.push(...typeResults);
    }

    // Sort by relevance (name matches first)
    results.twins.sort((a, b) => {
      const aName = a.name.toLowerCase().includes(searchLower);
      const bName = b.name.toLowerCase().includes(searchLower);
      return bName - aName;
    });

    results.twins = results.twins.slice(0, Number(limit));

    res.json({
      query,
      total: results.twins.length,
      byType: results.byType,
      twins: results.twins
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get relationship graph for a twin
 * GET /api/relationships/graph/:id
 */
router.get('/graph/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { depth = 2 } = req.query;

    const twin = await redis.get(`twin:${id}`);
    if (!twin) {
      return res.status(404).json({ error: 'Twin not found' });
    }

    const visited = new Set([id]);
    const graph = {
      nodes: [],
      edges: []
    };

    // BFS to build graph
    const queue = [{ id, depth: 0 }];

    while (queue.length > 0) {
      const { id: currentId, depth: currentDepth } = queue.shift();

      if (currentDepth >= Number(depth)) continue;

      const currentData = await redis.get(`twin:${currentId}`);
      if (!currentData) continue;

      const currentTwin = JSON.parse(currentData);
      graph.nodes.push({
        id: currentTwin.id,
        name: currentTwin.name,
        type: currentTwin.type,
        subtype: currentTwin.subtype
      });

      // Get relationships
      const relatedIds = await redis.smembers(`relationships:from:${currentId}`);

      for (const relatedId of relatedIds) {
        if (!visited.has(relatedId)) {
          visited.add(relatedId);
          queue.push({ id: relatedId, depth: currentDepth + 1 });

          const relatedData = await redis.get(`twin:${relatedId}`);
          if (relatedData) {
            const relatedTwin = JSON.parse(relatedData);
            graph.nodes.push({
              id: relatedTwin.id,
              name: relatedTwin.name,
              type: relatedTwin.type,
              subtype: relatedTwin.subtype
            });
          }

          graph.edges.push({
            from: currentId,
            to: relatedId,
            type: 'RELATES_TO'
          });
        }
      }
    }

    res.json({
      rootId: id,
      depth: Number(depth),
      nodes: graph.nodes,
      edges: graph.edges,
      stats: {
        totalNodes: graph.nodes.length,
        totalEdges: graph.edges.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create relationship type
 * POST /api/relationships/types
 */
router.post('/types', async (req, res) => {
  try {
    const { name, description, inverseType } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const relationshipType = {
      id: `rel_${uuidv4()}`,
      name,
      description: description || '',
      inverseType,
      createdAt: new Date().toISOString()
    };

    await redis.set(`relationship:type:${name}`, JSON.stringify(relationshipType));
    await redis.sadd('relationships:types:all', name);

    res.status(201).json(relationshipType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all relationship types
 * GET /api/relationships/types
 */
router.get('/types', async (req, res) => {
  try {
    const typeNames = await redis.smembers('relationships:types:all');

    const types = await Promise.all(
      typeNames.map(async (name) => {
        const data = await redis.get(`relationship:type:${name}`);
        return data ? JSON.parse(data) : null;
      })
    );

    // Add predefined types
    const allTypes = [
      ...types.filter(t => t),
      ...Object.values(RELATIONSHIP_TYPES).map(name => ({
        name,
        predefined: true
      }))
    ];

    res.json({
      types: allTypes,
      total: allTypes.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get twins by relationship
 * GET /api/relationships/type/:type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const twinIds = await redis.smembers(`relationships:type:${type}`);

    const twins = await Promise.all(
      twinIds.map(async (id) => {
        const data = await redis.get(`twin:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    res.json({
      relationshipType: type,
      twins: twins.filter(t => t),
      total: twinIds.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get connection path between two twins
 * GET /api/relationships/path/:fromId/:toId
 */
router.get('/path/:fromId/:toId', async (req, res) => {
  try {
    const { fromId, toId } = req.params;
    const { maxDepth = 5 } = req.query;

    // BFS to find shortest path
    const queue = [[fromId]];
    const visited = new Set([fromId]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === toId) {
        // Get full twin data for path
        const pathTwins = await Promise.all(
          path.map(async (id) => {
            const data = await redis.get(`twin:${id}`);
            return data ? JSON.parse(data) : null;
          })
        );

        return res.json({
          found: true,
          distance: path.length - 1,
          path,
          twins: pathTwins.filter(t => t)
        });
      }

      if (path.length >= Number(maxDepth)) continue;

      const relatedIds = await redis.smembers(`relationships:from:${current}`);

      for (const relatedId of relatedIds) {
        if (!visited.has(relatedId)) {
          visited.add(relatedId);
          queue.push([...path, relatedId]);
        }
      }
    }

    res.json({
      found: false,
      path: null,
      message: 'No path found within max depth'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analyze twin network
 * GET /api/relationships/analyze/:id
 */
router.get('/analyze/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const twin = await redis.get(`twin:${id}`);
    if (!twin) {
      return res.status(404).json({ error: 'Twin not found' });
    }

    const twinData = JSON.parse(twin);

    // Count relationships
    const outgoing = await redis.scard(`relationships:from:${id}`);
    const incoming = await redis.scard(`relationships:to:${id}`);
    const totalRelationships = outgoing + incoming;

    // Get relationship types distribution
    const types = await redis.smembers('relationships:types:all');
    const typeDistribution = {};

    for (const type of types) {
      const typeIds = await redis.smembers(`relationships:type:${type}`);
      if (typeIds.includes(id)) {
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;
      }
    }

    // Get children count
    const children = await redis.smembers(`twins:child:${id}`);
    const parents = await redis.smembers(`twins:parent:${id}`);

    res.json({
      twinId: id,
      twinName: twinData.name,
      twinType: twinData.type,
      analysis: {
        relationships: {
          total: totalRelationships,
          outgoing,
          incoming,
          byType: typeDistribution
        },
        inheritance: {
          children: children.length,
          parents: parents.length
        },
        centrality: totalRelationships > 10 ? 'HIGH' : totalRelationships > 5 ? 'MEDIUM' : 'LOW'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
