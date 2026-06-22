import axios from 'axios';
import { featureService, EntityFeatures } from './featureService';
import { experimentService } from './experimentService';
import logger from '../utils/logger';

const log = logger.child({ service: 'RankingService' });

export interface RankItem {
  id: string;
  type: string;
  score?: number;
  features: Record<string, number>;
}

export interface RankRequest {
  experimentId?: string;
  userId: string;
  context?: {
    location?: string;
    device?: string;
    timeOfDay?: string;
  };
  items: RankItem[];
  options?: {
    limit?: number;
    diversity?: number;
    personalization?: number;
  };
}

export interface RankedResult {
  id: string;
  score: number;
  explanation: string[];
  type: string;
}

export interface RankResponse {
  ranked: RankedResult[];
  experiment?: {
    id: string;
    variant: string;
    arm: string;
  };
  latencyMs: number;
}

interface VariantConfig {
  weights: Record<string, number>;
  diversityWeight: number;
  personalizationWeight: number;
  modelVersion?: string;
}

export class RankingService {
  private mlServiceUrl: string;
  private mlServiceEnabled: boolean;

  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5007';
    this.mlServiceEnabled = process.env.ML_SERVICE_ENABLED !== 'false';
  }

  async rank(request: RankRequest): Promise<RankResponse> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!request.items || request.items.length === 0) {
        return { ranked: [], latencyMs: Date.now() - startTime };
      }

      const limit = Math.min(
        request.options?.limit || parseInt(process.env.DEFAULT_LIMIT || '20', 10),
        parseInt(process.env.MAX_LIMIT || '100', 10)
      );

      // Get experiment variant if experimentId provided
      let variantConfig: VariantConfig | null = null;
      let variantId: string | undefined;
      let experimentId: string | undefined;

      if (request.experimentId) {
        const experimentResult = await experimentService.getVariantForUser(
          request.experimentId,
          request.userId
        );
        if (experimentResult) {
          variantConfig = experimentResult.config;
          variantId = experimentResult.variantId;
          experimentId = request.experimentId;
        }
      }

      // Use default config if no experiment
      if (!variantConfig) {
        variantConfig = {
          weights: {
            relevance: 0.3,
            popularity: 0.3,
            recency: 0.2,
            quality: 0.1,
            personalization: 0.1
          },
          diversityWeight: request.options?.diversity || parseFloat(process.env.DEFAULT_DIVERSITY || '0.3'),
          personalizationWeight: request.options?.personalization || parseFloat(process.env.DEFAULT_PERSONALIZATION || '0.5')
        };
      }

      // Fetch features for all items
      const itemTypes = [...new Set(request.items.map(item => item.type))];
      const featuresMap = new Map<string, EntityFeatures>();

      for (const itemType of itemTypes) {
        const typeFeatures = await featureService.getFeaturesForItems(
          request.items.filter(i => i.type === itemType).map(i => i.id),
          itemType
        );
        typeFeatures.forEach((value, key) => featuresMap.set(key, value));
      }

      // Score items using multiple signals
      const scoredItems = await this.scoreItems(
        request.items,
        featuresMap,
        variantConfig,
        request.context
      );

      // Apply diversity if enabled
      let rankedItems = scoredItems;
      if (variantConfig.diversityWeight > 0) {
        rankedItems = this.applyDiversity(scoredItems, variantConfig.diversityWeight);
      }

      // Apply personalization boost
      if (variantConfig.personalizationWeight > 0 && request.context) {
        rankedItems = this.applyPersonalization(
          rankedItems,
          featuresMap,
          variantConfig.personalizationWeight
        );
      }

      // Sort by final score
      rankedItems.sort((a, b) => b.score - a.score);

      // Take top results
      const topResults = rankedItems.slice(0, limit).map(item => ({
        id: item.id,
        score: item.score,
        explanation: item.explanation,
        type: item.type
      }));

      const latencyMs = Date.now() - startTime;

      log.info('Ranking completed', {
        userId: request.userId,
        inputCount: request.items.length,
        outputCount: topResults.length,
        latencyMs,
        experimentId
      });

      return {
        ranked: topResults,
        experiment: variantId && experimentId ? {
          id: experimentId,
          variant: variantId,
          arm: 'treatment'
        } : undefined,
        latencyMs
      };
    } catch (error) {
      log.error('Ranking failed', { error, userId: request.userId });
      throw error;
    }
  }

  private async scoreItems(
    items: RankItem[],
    featuresMap: Map<string, EntityFeatures>,
    config: VariantConfig,
    context?: RankRequest['context']
  ): Promise<RankedResult[]> {
    // Try ML service first if enabled
    if (this.mlServiceEnabled) {
      try {
        const mlScores = await this.callMLService(items, featuresMap, context);
        if (mlScores) {
          return this.combineScores(items, featuresMap, mlScores, config);
        }
      } catch (error) {
        log.warn('ML service unavailable, using rule-based scoring', { error });
      }
    }

    // Fallback to rule-based scoring
    return this.ruleBasedScoring(items, featuresMap, config, context);
  }

  private async callMLService(
    items: RankItem[],
    featuresMap: Map<string, EntityFeatures>,
    context?: RankRequest['context']
  ): Promise<Record<string, number> | null> {
    try {
      const response = await axios.post(
        `${this.mlServiceUrl}/predict`,
        {
          items: items.map(item => ({
            id: item.id,
            type: item.type,
            features: this.extractFeatureVector(item, featuresMap.get(item.id))
          })),
          context: context || {}
        },
        { timeout: 100 }
      );

      return response.data.scores;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        log.warn('ML service timeout');
      }
      return null;
    }
  }

  private extractFeatureVector(item: RankItem, features?: EntityFeatures): number[] {
    const featureVec: number[] = [];

    if (features) {
      const f = features.features;
      featureVec.push(f.popularity?.views || 0);
      featureVec.push(f.popularity?.clicks || 0);
      featureVec.push(f.popularity?.avgRating || 0);
      featureVec.push(f.quality?.reviewCount || 0);
      featureVec.push(f.trending?.trendScore || 0);
      featureVec.push(f.personalization?.userAffinity || 0);
      featureVec.push(f.relevance?.textMatch || 0);
      featureVec.push(f.relevance?.semanticScore || 0);
    }

    // Add custom features from request
    Object.values(item.features).forEach(val => featureVec.push(val));

    return featureVec;
  }

  private combineScores(
    items: RankItem[],
    featuresMap: Map<string, EntityFeatures>,
    mlScores: Record<string, number>,
    config: VariantConfig
  ): RankedResult[] {
    const mlWeight = 0.7;
    const ruleWeight = 0.3;

    return items.map(item => {
      const features = featuresMap.get(item.id);
      const ruleScore = this.computeRuleScore(item, features, config);
      const mlScore = mlScores[item.id] || 0;

      const combinedScore = mlWeight * mlScore + ruleWeight * ruleScore;

      return {
        id: item.id,
        score: combinedScore,
        explanation: [
          `ML score: ${mlScore.toFixed(3)}`,
          `Rule score: ${ruleScore.toFixed(3)}`,
          `Combined: ${combinedScore.toFixed(3)}`
        ],
        type: item.type
      };
    });
  }

  private ruleBasedScoring(
    items: RankItem[],
    featuresMap: Map<string, EntityFeatures>,
    config: VariantConfig,
    context?: RankRequest['context']
  ): RankedResult[] {
    return items.map(item => {
      const features = featuresMap.get(item.id);
      const score = this.computeRuleScore(item, features, config);
      const explanation: string[] = [];

      if (features) {
        const f = features.features;
        if (f.popularity?.views) {
          explanation.push(`Views: ${f.popularity.views}`);
        }
        if (f.trending?.trendScore) {
          explanation.push(`Trending: ${f.trending.trendScore.toFixed(2)}`);
        }
        if (f.personalization?.userAffinity) {
          explanation.push(`Affinity: ${f.personalization.userAffinity.toFixed(2)}`);
        }
      }

      explanation.push(`Total score: ${score.toFixed(3)}`);

      return {
        id: item.id,
        score,
        explanation,
        type: item.type
      };
    });
  }

  private computeRuleScore(
    item: RankItem,
    features: EntityFeatures | undefined,
    config: VariantConfig
  ): number {
    const weights = config.weights;

    // Relevance score
    let relevanceScore = 0;
    if (features) {
      const f = features.features;
      relevanceScore =
        (f.relevance?.textMatch || 0) * (weights.relevance || 0.3) +
        (f.relevance?.semanticScore || 0) * (weights.relevance || 0.3) * 0.5 +
        (f.relevance?.categoryMatch || 0) * (weights.relevance || 0.3) * 0.2;
    }
    if (item.score !== undefined) {
      relevanceScore += item.score * (weights.relevance || 0.3);
    }

    // Popularity score (log-scaled)
    let popularityScore = 0;
    if (features) {
      const views = features.features.popularity?.views || 0;
      const clicks = features.features.popularity?.clicks || 0;
      popularityScore = Math.log1p(views) * 0.5 + Math.log1p(clicks) * 0.5;
      popularityScore = (popularityScore / 20) * (weights.popularity || 0.3); // Normalize
    }

    // Recency score (exponential decay)
    let recencyScore = 0;
    if (features) {
      const hoursSinceUpdate = features.features.recency?.hoursSinceUpdate || 0;
      recencyScore = Math.exp(-0.01 * hoursSinceUpdate) * (weights.recency || 0.2);
    }

    // Quality score
    let qualityScore = 0;
    if (features) {
      const avgRating = features.features.quality?.avgRating || 0;
      const reviewCount = features.features.quality?.reviewCount || 0;
      qualityScore = (avgRating / 5) * 0.7 + Math.min(1, reviewCount / 100) * 0.3;
      qualityScore *= (weights.quality || 0.1);
    }

    // Trending score
    let trendingScore = 0;
    if (features) {
      trendingScore = (features.features.trending?.trendScore || 0) / 100 * (weights.trending || 0.1);
    }

    // Personalization score
    let personalizationScore = 0;
    if (features) {
      const userAffinity = features.features.personalization?.userAffinity || 0;
      personalizationScore = userAffinity * (weights.personalization || 0.1);
    }

    // Combine scores
    const totalScore =
      relevanceScore +
      popularityScore +
      recencyScore +
      qualityScore +
      trendingScore +
      personalizationScore;

    return Math.max(0, Math.min(1, totalScore));
  }

  private applyDiversity(items: RankedResult[], diversityWeight: number): RankedResult[] {
    if (items.length <= 1) return items;

    const result: RankedResult[] = [];
    const typeCounts = new Map<string, number>();

    // Sort by type diversity first, then by score
    const sorted = [...items].sort((a, b) => {
      const countA = typeCounts.get(a.type) || 0;
      const countB = typeCounts.get(b.type) || 0;

      // Prefer less-seen types
      if (countA !== countB) {
        return countA - countB;
      }

      // Then by score
      return b.score - a.score;
    });

    // Apply MMR (Maximal Marginal Relevance) style diversification
    for (const item of items) {
      const typeCount = typeCounts.get(item.type) || 0;
      const diversityBonus = 1 - (typeCount / Math.max(1, items.length * 0.3));

      result.push({
        ...item,
        score: item.score * (1 - diversityWeight) + item.score * diversityBonus * diversityWeight,
        explanation: [...item.explanation, `Diversity adjusted by ${(diversityBonus * diversityWeight).toFixed(2)}`]
      });

      typeCounts.set(item.type, typeCount + 1);
    }

    return result;
  }

  private applyPersonalization(
    items: RankedResult[],
    featuresMap: Map<string, EntityFeatures>,
    personalizationWeight: number
  ): RankedResult[] {
    return items.map(item => {
      const features = featuresMap.get(item.id);
      const personalizationScore = features?.features.personalization?.userAffinity || 0;

      if (personalizationScore > 0) {
        return {
          ...item,
          score: item.score * (1 - personalizationWeight) + personalizationScore * personalizationWeight,
          explanation: [...item.explanation, `Personalized (boost: ${(personalizationScore * personalizationWeight).toFixed(3)})`]
        };
      }

      return item;
    });
  }

  async batchRank(requests: RankRequest[]): Promise<RankResponse[]> {
    const results = await Promise.all(requests.map(req => this.rank(req)));
    return results;
  }
}

export const rankingService = new RankingService();
