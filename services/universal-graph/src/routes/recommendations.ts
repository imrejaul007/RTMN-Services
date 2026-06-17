import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GraphNode } from '../models/Node';
import { GraphEdge } from '../models/Edge';
import { GraphResponse, EntityType, Recommendation } from '../types';
import { RecommendationService } from '../services/recommendation';

const router = Router();
const recommendationService = new RecommendationService();

// Recommendation query schema
const recommendationQuerySchema = z.object({
  nodeId: z.string().min(1),
  types: z.array(z.string()).optional(),
  maxResults: z.coerce.number().min(1).max(50).optional().default(10),
  minWeight: z.coerce.number().min(0).max(1).optional().default(0),
  includeReason: z.boolean().optional().default(true),
});

// Collaborative filtering recommendations based on similar users/items
router.post('/collaborative', async (req: Request, res: Response) => {
  try {
    const params = recommendationQuerySchema.parse(req.body);

    const recommendations = await recommendationService.collaborativeFiltering({
      nodeId: params.nodeId,
      types: params.types as EntityType[] | undefined,
      maxResults: params.maxResults,
      minWeight: params.minWeight,
    });

    res.json({
      success: true,
      data: recommendations,
      meta: {
        timestamp: new Date(),
        count: recommendations.length,
      },
    } as GraphResponse<Recommendation[]>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        meta: { timestamp: new Date() },
      } as GraphResponse<null>);
    }
    console.error('Error getting collaborative recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Content-based recommendations (similar properties)
router.post('/content', async (req: Request, res: Response) => {
  try {
    const { nodeId, maxResults, properties } = req.body;

    if (!nodeId) {
      return res.status(400).json({
        success: false,
        error: 'nodeId is required',
      } as GraphResponse<null>);
    }

    const recommendations = await recommendationService.contentBasedFiltering({
      nodeId,
      maxResults: maxResults || 10,
      propertyKeys: properties,
    });

    res.json({
      success: true,
      data: recommendations,
      meta: {
        timestamp: new Date(),
        count: recommendations.length,
      },
    } as GraphResponse<Recommendation[]>);
  } catch (error) {
    console.error('Error getting content recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Find related entities (direct relationships)
router.get('/related/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { types, maxDepth, minWeight } = req.query;

    const related = await recommendationService.findRelatedEntities({
      nodeId,
      types: types ? (types as string).split(',') as EntityType[] : undefined,
      maxDepth: Number(maxDepth) || 2,
      minWeight: Number(minWeight) || 0,
    });

    res.json({
      success: true,
      data: related,
      meta: {
        timestamp: new Date(),
        count: related.length,
      },
    } as GraphResponse<Recommendation[]>);
  } catch (error) {
    console.error('Error finding related entities:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Entity-based recommendations (users who bought X also bought Y)
router.get('/also-bought/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { maxResults } = req.query;

    // Find entities that have the same incoming edges
    // (e.g., customers who purchased this also purchased...)
    const incomingEdges = await GraphEdge.find({
      targetNodeId: nodeId,
      edgeType: { $in: ['purchased', 'owns', 'bought'] },
    });

    if (incomingEdges.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: { timestamp: new Date(), count: 0 },
      } as GraphResponse<[]>);
    }

    // Get the source nodes (e.g., customers)
    const sourceIds = incomingEdges.map(e => e.sourceNodeId);

    // Find other entities these sources connect to
    const relatedEdges = await GraphEdge.find({
      sourceNodeId: { $in: sourceIds },
      targetNodeId: { $ne: nodeId },
      edgeType: { $in: ['purchased', 'owns', 'bought'] },
    });

    // Count occurrences
    const entityCounts = new Map<string, { count: number; sources: Set<string> }>();
    for (const edge of relatedEdges) {
      if (!entityCounts.has(edge.targetNodeId)) {
        entityCounts.set(edge.targetNodeId, { count: 0, sources: new Set() });
      }
      const entry = entityCounts.get(edge.targetNodeId)!;
      entry.count++;
      entry.sources.add(edge.sourceNodeId);
    }

    // Sort by count and get nodes
    const sortedEntities = [...entityCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, Number(maxResults) || 10);

    const nodeIds = sortedEntities.map(([id]) => id);
    const nodes = await GraphNode.find({ nodeId: { $in: nodeIds } });

    const nodeMap = new Map(nodes.map(n => [n.nodeId, n]));
    const recommendations: Recommendation[] = sortedEntities.map(([nodeId, data]) => ({
      node: nodeMap.get(nodeId)!,
      score: data.count / incomingEdges.length,
      reason: `Frequently purchased together (${data.count} co-occurrences)`,
    })).filter(r => r.node);

    res.json({
      success: true,
      data: recommendations,
      meta: {
        timestamp: new Date(),
        count: recommendations.length,
      },
    } as GraphResponse<Recommendation[]>);
  } catch (error) {
    console.error('Error getting also-bought recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Entity type recommendations
router.get('/for-entity/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { targetType, maxResults } = req.query;

    const nodeId = `${entityType}_${entityId}`;

    // Check if node exists
    const node = await GraphNode.findOne({ nodeId });
    if (!node) {
      return res.status(404).json({
        success: false,
        error: 'Entity not found',
      } as GraphResponse<null>);
    }

    const recommendations = await recommendationService.getRecommendationsForEntity({
      nodeId,
      targetType: targetType as EntityType | undefined,
      maxResults: Number(maxResults) || 10,
    });

    res.json({
      success: true,
      data: recommendations,
      meta: {
        timestamp: new Date(),
        count: recommendations.length,
      },
    } as GraphResponse<Recommendation[]>);
  } catch (error) {
    console.error('Error getting entity recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Popular entities in a category
router.get('/popular/:entityType', async (req: Request, res: Response) => {
  try {
    const { entityType } = req.params;
    const { limit, excludeNodeId } = req.query;

    // Get all nodes of this type
    const query: Record<string, unknown> = { entityType };

    if (excludeNodeId) {
      query.nodeId = { $ne: excludeNodeId };
    }

    const nodes = await GraphNode.find(query).limit(Number(limit) || 20);

    // Count connections for each node
    const popularityScores = await Promise.all(
      nodes.map(async (node) => {
        const connectionCount = await GraphEdge.countDocuments({
          $or: [
            { sourceNodeId: node.nodeId },
            { targetNodeId: node.nodeId },
          ],
        });
        return { node, score: connectionCount };
      })
    );

    // Sort by popularity
    const popular = popularityScores
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(limit) || 10);

    const recommendations: Recommendation[] = popular.map(p => ({
      node: p.node,
      score: p.score,
      reason: `Popular ${entityType} with ${p.score} connections`,
    }));

    res.json({
      success: true,
      data: recommendations,
      meta: {
        timestamp: new Date(),
        count: recommendations.length,
      },
    } as GraphResponse<Recommendation[]>);
  } catch (error) {
    console.error('Error getting popular entities:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Cross-sell recommendations
router.get('/cross-sell/:nodeId', async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const { maxResults } = req.query;

    const crossSell = await recommendationService.crossSellRecommendations({
      nodeId,
      maxResults: Number(maxResults) || 5,
    });

    res.json({
      success: true,
      data: crossSell,
      meta: {
        timestamp: new Date(),
        count: crossSell.length,
      },
    } as GraphResponse<Recommendation[]>);
  } catch (error) {
    console.error('Error getting cross-sell recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

// Trending connections
router.get('/trending/:entityType', async (req: Request, res: Response) => {
  try {
    const { entityType } = req.params;
    const { limit, days } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (Number(days) || 30));

    // Find edges created recently
    const recentEdges = await GraphEdge.find({
      'metadata.createdAt': { $gte: cutoffDate },
    });

    // Count edges per target entity
    const entityScores = new Map<string, number>();
    for (const edge of recentEdges) {
      const count = entityScores.get(edge.targetNodeId) || 0;
      entityScores.set(edge.targetNodeId, count + 1);
    }

    // Filter by entity type and get top entities
    const topEntityIds = [...entityScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Number(limit) || 10)
      .map(([id]) => id);

    const nodes = await GraphNode.find({
      nodeId: { $in: topEntityIds },
      entityType,
    });

    const nodeMap = new Map(nodes.map(n => [n.nodeId, n]));
    const trending: Recommendation[] = topEntityIds
      .filter(id => nodeMap.has(id))
      .map(id => ({
        node: nodeMap.get(id)!,
        score: entityScores.get(id)!,
        reason: `Trending - ${entityScores.get(id)} new connections in last ${days || 30} days`,
      }));

    res.json({
      success: true,
      data: trending,
      meta: {
        timestamp: new Date(),
        count: trending.length,
      },
    } as GraphResponse<Recommendation[]>);
  } catch (error) {
    console.error('Error getting trending entities:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GraphResponse<null>);
  }
});

export default router;
