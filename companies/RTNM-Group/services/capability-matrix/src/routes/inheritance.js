/**
 * Inheritance Routes
 * Capability inheritance from Industry OS
 */

import { Router } from 'express';
import { redis, CAPABILITY_CATEGORIES, SOURCE_TYPES } from '../index.js';

const router = Router();

/**
 * Get inheritance chain for a capability
 * GET /api/inheritance/:capabilityId
 */
router.get('/:capabilityId', async (req, res) => {
  try {
    const { capabilityId } = req.params;

    // Get capability
    const capability = await redis.get(`capability:${capabilityId}`);
    if (!capability) {
      return res.status(404).json({ error: 'Capability not found' });
    }

    const cap = JSON.parse(capability);

    // Get inheritance chain
    const chain = [cap];

    // Get related capabilities (inheritance relationships)
    if (cap.relatedCapabilities && cap.relatedCapabilities.length > 0) {
      const related = await Promise.all(
        cap.relatedCapabilities.map(async (relId) => {
          const rel = await redis.get(`capability:${relId}`);
          return rel ? JSON.parse(rel) : null;
        })
      );
      chain.push(...related.filter(r => r));
    }

    // Get parent capabilities (prerequisites as inheritance)
    if (cap.prerequisites && cap.prerequisites.length > 0) {
      const parents = await Promise.all(
        cap.prerequisites.map(async (parentId) => {
          const parent = await redis.get(`capability:${parentId}`);
          return parent ? JSON.parse(parent) : null;
        })
      );
      chain.push(...parents.filter(p => p));
    }

    // Get child capabilities (capabilities that depend on this)
    const childIds = await redis.smembers(`inheritance:parent:${capabilityId}`);
    const children = await Promise.all(
      childIds.map(async (childId) => {
        const child = await redis.get(`capability:${childId}`);
        return child ? JSON.parse(child) : null;
      })
    );

    res.json({
      capability: cap,
      inheritanceChain: chain,
      children: children.filter(c => c),
      relationships: {
        related: cap.relatedCapabilities || [],
        prerequisites: cap.prerequisites || [],
        dependents: childIds
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create inheritance relationship
 * POST /api/inheritance/link
 */
router.post('/link', async (req, res) => {
  try {
    const { parentId, childId, relationshipType = 'related' } = req.body;

    if (!parentId || !childId) {
      return res.status(400).json({
        error: 'parentId and childId are required'
      });
    }

    // Verify both capabilities exist
    const [parent, child] = await Promise.all([
      redis.get(`capability:${parentId}`),
      redis.get(`capability:${childId}`)
    ]);

    if (!parent || !child) {
      return res.status(404).json({
        error: 'Parent or child capability not found'
      });
    }

    const parentCap = JSON.parse(parent);
    const childCap = JSON.parse(child);

    // Add to appropriate index based on relationship type
    if (relationshipType === 'related') {
      // Add to related capabilities
      if (!parentCap.relatedCapabilities.includes(childId)) {
        parentCap.relatedCapabilities.push(childId);
        await redis.set(`capability:${parentId}`, JSON.stringify(parentCap));
        await redis.sadd(`inheritance:related:${parentId}`, childId);
      }
      if (!childCap.relatedCapabilities.includes(parentId)) {
        childCap.relatedCapabilities.push(parentId);
        await redis.set(`capability:${childId}`, JSON.stringify(childCap));
        await redis.sadd(`inheritance:related:${childId}`, parentId);
      }
    } else if (relationshipType === 'prerequisite') {
      // Add to prerequisites
      if (!parentCap.relatedCapabilities.includes(childId)) {
        childCap.prerequisites.push(parentId);
        await redis.set(`capability:${childId}`, JSON.stringify(childCap));
        await redis.sadd(`inheritance:parent:${parentId}`, childId);
      }
    }

    res.json({
      message: 'Inheritance relationship created',
      parentId,
      childId,
      relationshipType
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Remove inheritance relationship
 * DELETE /api/inheritance/link
 */
router.delete('/link', async (req, res) => {
  try {
    const { parentId, childId, relationshipType = 'related' } = req.body;

    if (!parentId || !childId) {
      return res.status(400).json({
        error: 'parentId and childId are required'
      });
    }

    if (relationshipType === 'related') {
      await redis.srem(`inheritance:related:${parentId}`, childId);
      await redis.srem(`inheritance:related:${childId}`, parentId);
    } else if (relationshipType === 'prerequisite') {
      await redis.srem(`inheritance:parent:${parentId}`, childId);
    }

    res.json({
      message: 'Inheritance relationship removed',
      parentId,
      childId,
      relationshipType
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all capabilities that inherit from a source
 * GET /api/inheritance/source/:sourceId
 */
router.get('/source/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;

    // Get all capabilities
    const allCapabilityIds = await redis.smembers('capabilities:all');

    const sourceCapabilities = await Promise.all(
      allCapabilityIds.map(async (capId) => {
        const capData = await redis.get(`capability:${capId}`);
        if (capData) {
          const cap = JSON.parse(capData);
          if (cap.sourceId === sourceId) {
            return cap;
          }
        }
        return null;
      })
    );

    res.json({
      sourceId,
      capabilities: sourceCapabilities.filter(c => c),
      total: sourceCapabilities.filter(c => c).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get capability hierarchy by category
 * GET /api/inheritance/hierarchy/:category
 */
router.get('/hierarchy/:category', async (req, res) => {
  try {
    const { category } = req.params;

    if (!Object.values(CAPABILITY_CATEGORIES).includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Get all capabilities in category
    const categoryIds = await redis.smembers(`capabilities:category:${category}`);

    const capabilities = await Promise.all(
      categoryIds.map(async (capId) => {
        const capData = await redis.get(`capability:${capId}`);
        if (capData) {
          return JSON.parse(capData);
        }
        return null;
      })
    );

    // Build hierarchy
    const hierarchy = {
      category,
      roots: [],
      nodes: {}
    };

    const nodes = capabilities.filter(c => c);

    nodes.forEach(node => {
      hierarchy.nodes[node.id] = {
        ...node,
        children: [],
        parents: []
      };
    });

    nodes.forEach(node => {
      if (node.prerequisites) {
        node.prerequisites.forEach(prereqId => {
          if (hierarchy.nodes[prereqId]) {
            hierarchy.nodes[prereqId].children.push(node.id);
            hierarchy.nodes[node.id].parents.push(prereqId);
          }
        });
      }
    });

    // Find roots (nodes with no parents)
    hierarchy.roots = nodes
      .filter(node => !node.prerequisites || node.prerequisites.length === 0)
      .map(n => n.id);

    res.json(hierarchy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Calculate capability distance between two capabilities
 * GET /api/inheritance/distance/:capA/:capB
 */
router.get('/distance/:capA/:capB', async (req, res) => {
  try {
    const { capA, capB } = req.params;

    // BFS to find shortest path
    const findPath = async (start, end) => {
      const queue = [[start]];
      const visited = new Set([start]);

      while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];

        if (current === end) {
          return path;
        }

        const capData = await redis.get(`capability:${current}`);
        if (!capData) continue;

        const cap = JSON.parse(capData);
        const neighbors = [
          ...(cap.relatedCapabilities || []),
          ...(cap.prerequisites || [])
        ];

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push([...path, neighbor]);
          }
        }
      }

      return null; // No path found
    };

    const path = await findPath(capA, capB);

    if (path) {
      res.json({
        distance: path.length - 1,
        path,
        direct: path.length === 2
      });
    } else {
      res.json({
        distance: -1,
        path: null,
        direct: false,
        message: 'No inheritance relationship found'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
