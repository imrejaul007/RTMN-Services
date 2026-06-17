import { GraphNode, IGraphNode } from '../models/Node';
import { GraphEdge, IGraphEdge } from '../models/Edge';
import { EntityType, Recommendation, GraphNode } from '../types';

interface CollaborativeFilteringParams {
  nodeId: string;
  types?: EntityType[];
  maxResults?: number;
  minWeight?: number;
}

interface ContentBasedParams {
  nodeId: string;
  maxResults?: number;
  propertyKeys?: string[];
}

interface RelatedEntitiesParams {
  nodeId: string;
  types?: EntityType[];
  maxDepth?: number;
  minWeight?: number;
}

interface CrossSellParams {
  nodeId: string;
  maxResults?: number;
}

interface EntityRecommendationParams {
  nodeId: string;
  targetType?: EntityType;
  maxResults?: number;
}

export class RecommendationService {
  /**
   * Collaborative filtering - find similar entities based on common connections
   */
  async collaborativeFiltering(params: CollaborativeFilteringParams): Promise<Recommendation[]> {
    const {
      nodeId,
      types,
      maxResults = 10,
      minWeight = 0,
    } = params;

    // Get the target node
    const targetNode = await GraphNode.findOne({ nodeId });
    if (!targetNode) {
      return [];
    }

    // Get all connections of the target node
    const targetEdges = await GraphEdge.find({
      $or: [
        { sourceNodeId: nodeId },
        { targetNodeId: nodeId },
      ],
      weight: { $gte: minWeight },
    });

    // Find all neighbors
    const neighborIds = new Set<string>();
    for (const edge of targetEdges) {
      if (edge.sourceNodeId !== nodeId) {
        neighborIds.add(edge.sourceNodeId);
      }
      if (edge.targetNodeId !== nodeId) {
        neighborIds.add(edge.targetNodeId);
      }
    }

    // Build co-occurrence matrix
    const coOccurrence = new Map<string, number>();

    for (const neighborId of neighborIds) {
      const neighborEdges = await GraphEdge.find({
        $or: [
          { sourceNodeId: neighborId },
          { targetNodeId: neighborId },
        ],
      });

      for (const edge of neighborEdges) {
        const otherId = edge.sourceNodeId === neighborId ? edge.targetNodeId : edge.sourceNodeId;

        if (otherId !== nodeId && neighborIds.has(otherId)) {
          coOccurrence.set(otherId, (coOccurrence.get(otherId) || 0) + 1);
        }
      }
    }

    // Score and rank
    const scores = new Map<string, { score: number; edges: IGraphEdge[] }>();

    for (const [candidateId, coCount] of coOccurrence.entries()) {
      const candidateEdges = await GraphEdge.find({
        $or: [
          { sourceNodeId: candidateId, targetNodeId: nodeId },
          { sourceNodeId: nodeId, targetNodeId: candidateId },
        ],
      });

      const avgWeight = candidateEdges.length > 0
        ? candidateEdges.reduce((sum, e) => sum + e.weight, 0) / candidateEdges.length
        : 0;

      // Jaccard-like similarity
      const score = coCount / (neighborIds.size + (coOccurrence.size - coCount));

      scores.set(candidateId, {
        score: score * avgWeight,
        edges: candidateEdges,
      });
    }

    // Get candidate nodes
    const candidateIds = [...scores.keys()];
    const candidates = await GraphNode.find({
      nodeId: { $in: candidateIds },
      ...(types && types.length > 0 ? { entityType: { $in: types } } : {}),
    });

    // Build recommendations
    const recommendations: Recommendation[] = candidates
      .map(node => {
        const scoreData = scores.get(node.nodeId)!;
        return {
          node: this.nodeToGraphNode(node),
          score: scoreData.score,
          reason: `Similar to ${targetNode.name} via ${scoreData.edges.length} shared connections`,
          path: [this.nodeToGraphNode(targetNode), this.nodeToGraphNode(node)],
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return recommendations;
  }

  /**
   * Content-based filtering - find similar entities based on properties
   */
  async contentBasedFiltering(params: ContentBasedParams): Promise<Recommendation[]> {
    const {
      nodeId,
      maxResults = 10,
      propertyKeys,
    } = params;

    // Get the target node
    const targetNode = await GraphNode.findOne({ nodeId });
    if (!targetNode) {
      return [];
    }

    // Get properties to compare
    const compareKeys = propertyKeys || Object.keys(targetNode.properties);
    const targetProperties = targetNode.properties;

    // Find candidates of the same entity type
    const candidates = await GraphNode.find({
      entityType: targetNode.entityType,
      nodeId: { $ne: nodeId },
    });

    // Calculate similarity scores
    const scoredCandidates: { node: IGraphNode; score: number }[] = [];

    for (const candidate of candidates) {
      let matchCount = 0;
      let totalScore = 0;

      for (const key of compareKeys) {
        const targetValue = targetProperties[key];
        const candidateValue = candidate.properties[key];

        if (targetValue !== undefined && candidateValue !== undefined) {
          if (targetValue === candidateValue) {
            matchCount += 2;
          } else if (typeof targetValue === 'number' && typeof candidateValue === 'number') {
            // Numerical similarity
            const diff = Math.abs(targetValue - candidateValue);
            const maxVal = Math.max(Math.abs(targetValue), Math.abs(candidateValue));
            matchCount += maxVal > 0 ? 1 - (diff / maxVal) : 1;
          }
          totalScore++;
        }
      }

      if (totalScore > 0) {
        scoredCandidates.push({
          node: candidate,
          score: matchCount / compareKeys.length,
        });
      }
    }

    // Build recommendations
    const recommendations: Recommendation[] = scoredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ node, score }) => ({
        node: this.nodeToGraphNode(node),
        score,
        reason: `Similar properties to ${targetNode.name}`,
      }));

    return recommendations;
  }

  /**
   * Find related entities through graph traversal
   */
  async findRelatedEntities(params: RelatedEntitiesParams): Promise<Recommendation[]> {
    const {
      nodeId,
      types,
      maxDepth = 2,
      minWeight = 0,
    } = params;

    const targetNode = await GraphNode.findOne({ nodeId });
    if (!targetNode) {
      return [];
    }

    // BFS to find related entities
    const visited = new Set<string>([nodeId]);
    const queue: { nodeId: string; depth: number; path: string[] }[] = [
      { nodeId, depth: 0, path: [nodeId] },
    ];
    const relatedEntities: { nodeId: string; depth: number; path: string[]; weight: number }[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= maxDepth) continue;

      const edges = await GraphEdge.find({
        $or: [
          { sourceNodeId: current.nodeId },
          { targetNodeId: current.nodeId },
        ],
        weight: { $gte: minWeight },
      });

      for (const edge of edges) {
        const neighborId = edge.sourceNodeId === current.nodeId
          ? edge.targetNodeId
          : edge.sourceNodeId;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const newPath = [...current.path, neighborId];
          queue.push({ nodeId: neighborId, depth: current.depth + 1, path: newPath });

          relatedEntities.push({
            nodeId: neighborId,
            depth: current.depth + 1,
            path: newPath,
            weight: edge.weight,
          });
        }
      }
    }

    // Get node details and filter by types
    const relatedNodeIds = relatedEntities.map(e => e.nodeId);
    const relatedNodes = await GraphNode.find({
      nodeId: { $in: relatedNodeIds },
      ...(types && types.length > 0 ? { entityType: { $in: types } } : {}),
    });

    // Build recommendations
    const recommendations: Recommendation[] = relatedNodes.map(node => {
      const entityData = relatedEntities.find(e => e.nodeId === node.nodeId)!;
      return {
        node: this.nodeToGraphNode(node),
        score: 1 / entityData.depth, // Closer = higher score
        reason: `${entityData.depth} hop${entityData.depth > 1 ? 's' : ''} away`,
        path: entityData.path.map(id => this.nodeToGraphNode({ nodeId: id } as IGraphNode)),
      };
    });

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Cross-sell recommendations based on complementary products/services
   */
  async crossSellRecommendations(params: CrossSellParams): Promise<Recommendation[]> {
    const { nodeId, maxResults = 5 } = params;

    const node = await GraphNode.findOne({ nodeId });
    if (!node) {
      return [];
    }

    // Get what this entity has relationships with
    const currentEdges = await GraphEdge.find({
      $or: [
        { sourceNodeId: nodeId },
        { targetNodeId: nodeId },
      ],
    });

    // Get nodes that have similar relationships but with different nodes
    const recommendations: Recommendation[] = [];
    const scoredNodes = new Map<string, number>();

    for (const edge of currentEdges) {
      const neighborId = edge.sourceNodeId === nodeId ? edge.targetNodeId : edge.sourceNodeId;

      // Find neighbors of neighbors
      const neighborEdges = await GraphEdge.find({
        $or: [
          { sourceNodeId: neighborId },
          { targetNodeId: neighborId },
        ],
      });

      for (const neighborEdge of neighborEdges) {
        const secondDegreeId = neighborEdge.sourceNodeId === neighborId
          ? neighborEdge.targetNodeId
          : neighborEdge.sourceNodeId;

        if (secondDegreeId !== nodeId && secondDegreeId !== neighborId) {
          scoredNodes.set(
            secondDegreeId,
            (scoredNodes.get(secondDegreeId) || 0) + neighborEdge.weight
          );
        }
      }
    }

    // Get node details
    const topScored = [...scoredNodes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults);

    const topNodeIds = topScored.map(([id]) => id);
    const topNodes = await GraphNode.find({ nodeId: { $in: topNodeIds } });

    const nodeMap = new Map(topNodes.map(n => [n.nodeId, n]));

    for (const [nodeId, score] of topScored) {
      const targetNode = nodeMap.get(nodeId);
      if (targetNode) {
        recommendations.push({
          node: this.nodeToGraphNode(targetNode),
          score: score / scoredNodes.size,
          reason: `Customers who engaged with similar entities also engaged with this`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Get recommendations for a specific entity type
   */
  async getRecommendationsForEntity(params: EntityRecommendationParams): Promise<Recommendation[]> {
    const { nodeId, targetType, maxResults = 10 } = params;

    const node = await GraphNode.findOne({ nodeId });
    if (!node) {
      return [];
    }

    // Find entities of the target type that are related
    const targetQuery: Record<string, unknown> = {};
    if (targetType) {
      targetQuery.entityType = targetType;
    }

    const relatedEdges = await GraphEdge.find({
      $or: [
        { sourceNodeId: nodeId },
        { targetNodeId: nodeId },
      ],
    });

    const relatedIds = new Set<string>();
    for (const edge of relatedEdges) {
      if (edge.sourceNodeId !== nodeId) {
        relatedIds.add(edge.sourceNodeId);
      }
      if (edge.targetNodeId !== nodeId) {
        relatedIds.add(edge.targetNodeId);
      }
    }

    // Get entities of target type that are related
    const candidates = await GraphNode.find({
      nodeId: { $in: Array.from(relatedIds) },
      ...targetQuery,
    });

    // Score based on connection weight
    const recommendations: Recommendation[] = await Promise.all(
      candidates.map(async (candidate) => {
        const connectionEdge = await GraphEdge.findOne({
          $or: [
            { sourceNodeId: nodeId, targetNodeId: candidate.nodeId },
            { sourceNodeId: candidate.nodeId, targetNodeId: nodeId },
          ],
        });

        return {
          node: this.nodeToGraphNode(candidate),
          score: connectionEdge?.weight || 0.5,
          reason: `Directly related to ${node.name}`,
        };
      })
    );

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Personalized recommendations for a user/customer
   */
  async personalizedRecommendations(nodeId: string, maxResults: number = 10): Promise<Recommendation[]> {
    const node = await GraphNode.findOne({ nodeId });
    if (!node) {
      return [];
    }

    // Get direct connections
    const directEdges = await GraphEdge.find({
      $or: [
        { sourceNodeId: nodeId },
        { targetNodeId: nodeId },
      ],
    }).sort({ weight: -1 });

    // Get second-degree connections
    const recommendations: Recommendation[] = [];
    const seenNodes = new Set<string>();

    for (const edge of directEdges) {
      const neighborId = edge.sourceNodeId === nodeId ? edge.targetNodeId : edge.sourceNodeId;

      if (seenNodes.has(neighborId)) continue;

      const neighborEdges = await GraphEdge.find({
        $or: [
          { sourceNodeId: neighborId },
          { targetNodeId: neighborId },
        ],
      }).sort({ weight: -1 });

      for (const neighborEdge of neighborEdges) {
        const secondDegreeId = neighborEdge.sourceNodeId === neighborId
          ? neighborEdge.targetNodeId
          : neighborEdge.sourceNodeId;

        if (secondDegreeId === nodeId || seenNodes.has(secondDegreeId)) continue;

        seenNodes.add(secondDegreeId);
        const secondDegreeNode = await GraphNode.findOne({ nodeId: secondDegreeId });

        if (secondDegreeNode) {
          recommendations.push({
            node: this.nodeToGraphNode(secondDegreeNode),
            score: edge.weight * neighborEdge.weight,
            reason: `Recommended based on ${neighborId} (${neighborEdge.edgeType})`,
          });
        }
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * "Also viewed" recommendations
   */
  async alsoViewedRecommendations(nodeId: string, maxResults: number = 10): Promise<Recommendation[]> {
    // Find entities that share viewers/owners with this entity
    const incomingEdges = await GraphEdge.find({
      targetNodeId: nodeId,
      edgeType: { $in: ['viewed', 'purchased', 'owns', 'reviewed'] },
    });

    if (incomingEdges.length === 0) {
      return [];
    }

    const sourceIds = incomingEdges.map(e => e.sourceNodeId);

    // Find other entities these sources interacted with
    const relatedEdges = await GraphEdge.find({
      sourceNodeId: { $in: sourceIds },
      targetNodeId: { $ne: nodeId },
      edgeType: { $in: ['viewed', 'purchased', 'owns', 'reviewed'] },
    });

    // Count co-occurrences
    const entityCounts = new Map<string, number>();
    for (const edge of relatedEdges) {
      entityCounts.set(edge.targetNodeId, (entityCounts.get(edge.targetNodeId) || 0) + 1);
    }

    // Get top entities
    const topEntities = [...entityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults);

    const topNodeIds = topEntities.map(([id]) => id);
    const nodes = await GraphNode.find({ nodeId: { $in: topNodeIds } });

    const nodeMap = new Map(nodes.map(n => [n.nodeId, n]));

    return topEntities
      .filter(([id]) => nodeMap.has(id))
      .map(([id, count]) => ({
        node: this.nodeToGraphNode(nodeMap.get(id)!),
        score: count / incomingEdges.length,
        reason: `Also viewed by users who viewed this entity`,
      }));
  }

  private nodeToGraphNode(node: IGraphNode) {
    return {
      id: node.nodeId,
      entityType: node.entityType as EntityType,
      entityId: node.entityId,
      name: node.name,
      properties: node.properties as Record<string, unknown>,
      metadata: node.metadata,
      labels: node.labels,
    };
  }
}
