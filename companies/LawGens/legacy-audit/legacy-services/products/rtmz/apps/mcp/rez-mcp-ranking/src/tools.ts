// Tool definitions for Ranking Service MCP Server
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface RankItemsParams {
  items: Array<{
    id: string;
    features: Record<string, number>;
  }>;
  userId?: string;
  context?: Record<string, unknown>;
  algorithm?: string;
}

export interface CreateExperimentParams {
  name: string;
  algorithm: string;
  features: string[];
  weights?: Record<string, number>;
}

export interface LogFeedbackParams {
  itemId: string;
  userId: string;
  interaction: 'click' | 'view' | 'purchase' | 'skip';
  context?: Record<string, unknown>;
}

function generateExperimentId(): string {
  return `EXP_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function generateRankingId(): string {
  return `RANK_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

function calculateScore(features: Record<string, number>, weights?: Record<string, number>): number {
  let score = 0;
  const w = weights || {
    relevance: 0.4,
    popularity: 0.3,
    recency: 0.2,
    quality: 0.1
  };
  
  for (const [key, value] of Object.entries(features)) {
    const weight = w[key] || 0.25;
    score += value * weight;
  }
  
  return Math.min(1, Math.max(0, score));
}

function generateMockRanking(params: RankItemsParams): {
  rankingId: string;
  experimentId?: string;
  rankedItems: Array<{
    id: string;
    score: number;
    rank: number;
    features: Record<string, number>;
  }>;
  timestamp: string;
  algorithm: string;
} {
  const weights = params.algorithm ? undefined : undefined;
  
  const itemsWithScores = params.items.map(item => ({
    id: item.id,
    score: calculateScore(item.features, weights),
    originalFeatures: item.features
  }));
  
  const sortedItems = itemsWithScores.sort((a, b) => b.score - a.score);
  
  const rankedItems = sortedItems.map((item, index) => ({
    id: item.id,
    score: Math.round(item.score * 1000) / 1000,
    rank: index + 1,
    features: item.originalFeatures
  }));
  
  return {
    rankingId: generateRankingId(),
    experimentId: params.context?.experimentId as string | undefined,
    rankedItems,
    timestamp: new Date().toISOString(),
    algorithm: params.algorithm || 'default_weighted'
  };
}

function generateMockExperiment(params: CreateExperimentParams): {
  id: string;
  name: string;
  algorithm: string;
  status: string;
  createdAt: string;
  metrics?: {
    ndcg: number;
    precision: number;
    recall: number;
  };
} {
  return {
    id: generateExperimentId(),
    name: params.name,
    algorithm: params.algorithm,
    status: 'training',
    createdAt: new Date().toISOString(),
    metrics: {
      ndcg: 0.75 + Math.random() * 0.15,
      precision: 0.65 + Math.random() * 0.2,
      recall: 0.60 + Math.random() * 0.25
    }
  };
}

function generateMockStats(): {
  totalItems: number;
  totalRankings: number;
  averageNDCG: number;
  activeExperiments: number;
  lastUpdated: string;
  performance: {
    p50Latency: number;
    p99Latency: number;
    throughput: number;
  };
  topFeatures: Array<{
    name: string;
    importance: number;
    impact: number;
  }>;
} {
  return {
    totalItems: 45678,
    totalRankings: 1234567,
    averageNDCG: 0.823,
    activeExperiments: 5,
    lastUpdated: new Date().toISOString(),
    performance: {
      p50Latency: 12,
      p99Latency: 45,
      throughput: 15420
    },
    topFeatures: [
      { name: 'relevance_score', importance: 0.42, impact: 0.89 },
      { name: 'popularity', importance: 0.28, impact: 0.76 },
      { name: 'recency', importance: 0.18, impact: 0.65 },
      { name: 'quality_score', importance: 0.12, impact: 0.54 }
    ]
  };
}

export const tools: Tool[] = [
  {
    name: "rank_items",
    description: "Rank items using ML-based ranking algorithm",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              features: {
                type: "object",
                additionalProperties: { type: "number" }
              }
            },
            required: ["id", "features"]
          },
          minItems: 1,
          maxItems: 100,
          description: "Items to rank with their feature values"
        },
        userId: {
          type: "string",
          description: "User ID for personalization (optional)"
        },
        context: {
          type: "object",
          description: "Additional context for ranking (optional)"
        },
        algorithm: {
          type: "string",
          enum: ["default", "personalized", "collaborative", "content_based", "hybrid"],
          description: "Ranking algorithm to use"
        }
      },
      required: ["items"]
    }
  },
  {
    name: "create_experiment",
    description: "Create a new ranking experiment",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the experiment"
        },
        algorithm: {
          type: "string",
          enum: ["random_forest", "lightgbm", "neural_network", "linear", "hybrid"],
          description: "Algorithm for the experiment"
        },
        features: {
          type: "array",
          items: { type: "string" },
          description: "List of features to use"
        },
        weights: {
          type: "object",
          additionalProperties: { type: "number" },
          description: "Feature weights (optional)"
        }
      },
      required: ["name", "algorithm", "features"]
    }
  },
  {
    name: "log_feedback",
    description: "Log user feedback for ranking improvement",
    inputSchema: {
      type: "object",
      properties: {
        itemId: {
          type: "string",
          description: "ID of the item"
        },
        userId: {
          type: "string",
          description: "ID of the user"
        },
        interaction: {
          type: "string",
          enum: ["click", "view", "purchase", "skip"],
          description: "Type of user interaction"
        },
        context: {
          type: "object",
          description: "Additional context (optional)"
        }
      },
      required: ["itemId", "userId", "interaction"]
    }
  },
  {
    name: "get_stats",
    description: "Get ranking service statistics and metrics",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

export const toolHandlers: Record<string, (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>> = {
  rank_items: async (params) => {
    const ranking = generateMockRanking(params as RankItemsParams);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          ranking,
          summary: {
            totalItems: ranking.rankedItems.length,
            topItem: ranking.rankedItems[0],
            averageScore: ranking.rankedItems.reduce((sum, item) => sum + item.score, 0) / ranking.rankedItems.length,
            scoreRange: {
              min: ranking.rankedItems[ranking.rankedItems.length - 1]?.score,
              max: ranking.rankedItems[0]?.score
            }
          },
          message: `Ranked ${ranking.rankedItems.length} items successfully`
        }, null, 2)
      }]
    };
  },

  create_experiment: async (params) => {
    const experiment = generateMockExperiment(params as CreateExperimentParams);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          experiment,
          message: `Experiment '${experiment.name}' created successfully`
        }, null, 2)
      }]
    };
  },

  log_feedback: async (params) => {
    const { itemId, userId, interaction } = params as LogFeedbackParams;
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          feedback: {
            id: `FB_${Date.now()}`,
            itemId,
            userId,
            interaction,
            timestamp: new Date().toISOString(),
            status: 'recorded'
          },
          message: 'Feedback logged successfully'
        }, null, 2)
      }]
    };
  },

  get_stats: async () => {
    const stats = generateMockStats();
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          stats,
          message: 'Ranking statistics retrieved successfully'
        }, null, 2)
      }]
    };
  }
};
