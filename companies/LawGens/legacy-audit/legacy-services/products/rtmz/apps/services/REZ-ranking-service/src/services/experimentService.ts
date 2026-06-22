import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { RankingExperiment, IRankingExperiment } from '../models/RankingExperiment';
import logger from '../utils/logger';

const log = logger.child({ service: 'ExperimentService' });

export interface CreateExperimentInput {
  name: string;
  description?: string;
  variants: Array<{
    name: string;
    description?: string;
    config: {
      weights: Record<string, number>;
      diversityWeight?: number;
      personalizationWeight?: number;
      modelVersion?: string;
    };
    traffic: number;
  }>;
  targeting?: {
    userSegments?: string[];
    countries?: string[];
    platforms?: string[];
    minImpressions?: number;
  };
}

export interface VariantAssignment {
  variantId: string;
  config: {
    weights: Record<string, number>;
    diversityWeight: number;
    personalizationWeight: number;
    modelVersion?: string;
  };
}

export interface ExperimentStats {
  experimentId: string;
  name: string;
  status: string;
  variants: Array<{
    id: string;
    name: string;
    traffic: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    conversionRate: number;
    avgOrderValue: number;
    significance?: {
      isSignificant: boolean;
      pValue?: number;
      confidence?: number;
      winner?: boolean;
    };
  }>;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  startDate?: Date;
  runningDuration?: number;
}

export class ExperimentService {
  private redis: Redis | null = null;
  private banditTtl: number;
  private minSampleSize: number;
  private confidenceLevel: number;

  constructor() {
    this.banditTtl = parseInt(process.env.BANDIT_TTL || '3600', 10);
    this.minSampleSize = parseInt(process.env.MIN_SAMPLE_SIZE || '100', 10);
    this.confidenceLevel = parseFloat(process.env.STATISTICAL_CONFIDENCE || '0.95');
    this.initRedis();
  }

  private initRedis(): void {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            log.warn('Redis connection failed for experiments');
            return null;
          }
          return Math.min(times * 100, 3000);
        }
      });

      this.redis.on('error', (err) => {
        log.error('Redis error in experiment service', { error: err.message });
      });
    } catch (error) {
      log.warn('Redis initialization failed for experiments');
      this.redis = null;
    }
  }

  private getAssignmentKey(experimentId: string, userId: string): string {
    return `experiment:${experimentId}:user:${userId}`;
  }

  async createExperiment(input: CreateExperimentInput): Promise<IRankingExperiment> {
    const experimentId = `exp_${uuidv4().substring(0, 12)}`;

    // Validate traffic allocation
    const totalTraffic = input.variants.reduce((sum, v) => sum + v.traffic, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error(`Traffic allocation must sum to 100%, got ${totalTraffic}%`);
    }

    const experiment = new RankingExperiment({
      experimentId,
      name: input.name,
      description: input.description || '',
      status: 'draft',
      variants: input.variants.map((v, idx) => ({
        id: `variant_${idx + 1}`,
        name: v.name,
        description: v.description || '',
        config: {
          weights: v.config.weights,
          diversityWeight: v.config.diversityWeight ?? 0.3,
          personalizationWeight: v.config.personalizationWeight ?? 0.5,
          modelVersion: v.config.modelVersion
        },
        traffic: v.traffic,
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          ctr: 0,
          conversionRate: 0,
          avgOrderValue: 0
        }
      })),
      targeting: input.targeting || {}
    });

    await experiment.save();

    log.info('Experiment created', { experimentId, name: input.name });
    return experiment;
  }

  async getExperiment(experimentId: string): Promise<IRankingExperiment | null> {
    return RankingExperiment.findOne({ experimentId });
  }

  async startExperiment(experimentId: string): Promise<IRankingExperiment> {
    const experiment = await RankingExperiment.findOne({ experimentId });

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.status !== 'draft' && experiment.status !== 'paused') {
      throw new Error(`Cannot start experiment in ${experiment.status} status`);
    }

    experiment.status = 'running';
    experiment.startDate = experiment.startDate || new Date();

    await experiment.save();

    log.info('Experiment started', { experimentId });
    return experiment;
  }

  async pauseExperiment(experimentId: string): Promise<IRankingExperiment> {
    const experiment = await RankingExperiment.findOne({ experimentId });

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.status !== 'running') {
      throw new Error(`Cannot pause experiment in ${experiment.status} status`);
    }

    experiment.status = 'paused';
    await experiment.save();

    log.info('Experiment paused', { experimentId });
    return experiment;
  }

  async completeExperiment(experimentId: string): Promise<IRankingExperiment> {
    const experiment = await RankingExperiment.findOne({ experimentId });

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    experiment.status = 'completed';
    experiment.endDate = new Date();

    await experiment.save();

    log.info('Experiment completed', { experimentId });
    return experiment;
  }

  async getVariantForUser(
    experimentId: string,
    userId: string
  ): Promise<VariantAssignment | null> {
    const experiment = await RankingExperiment.findOne({
      experimentId,
      status: 'running'
    });

    if (!experiment) {
      return null;
    }

    // Check targeting rules
    if (!this.matchesTargeting(experiment, userId)) {
      return null;
    }

    // Check Redis cache for existing assignment
    const cacheKey = this.getAssignmentKey(experimentId, userId);
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        log.warn('Cache read error', { error });
      }
    }

    // Determine variant using weighted random selection
    const variant = this.selectVariant(experiment);

    const assignment: VariantAssignment = {
      variantId: variant.id,
      config: {
        weights: Object.fromEntries(new Map(Object.entries(variant.config.weights || {}))),
        diversityWeight: variant.config.diversityWeight,
        personalizationWeight: variant.config.personalizationWeight,
        modelVersion: variant.config.modelVersion
      }
    };

    // Cache assignment
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, this.banditTtl, JSON.stringify(assignment));
      } catch (error) {
        log.warn('Cache write error', { error });
      }
    }

    return assignment;
  }

  private matchesTargeting(experiment: IRankingExperiment, userId: string): boolean {
    const targeting = experiment.targeting;

    // If no targeting rules, match all users
    if (!targeting || Object.keys(targeting).length === 0) {
      return true;
    }

    // Check minimum impressions (placeholder - would need user context)
    if (targeting.minImpressions && targeting.minImpressions > 0) {
      // This would need integration with user service
      // For now, always return true
    }

    return true;
  }

  private selectVariant(experiment: IRankingExperiment): typeof experiment.variants[0] {
    const variants = experiment.variants;
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.traffic;
      if (random < cumulative) {
        return variant;
      }
    }

    // Fallback to first variant
    return variants[0];
  }

  async recordImpression(
    experimentId: string,
    variantId: string,
    userId: string
  ): Promise<void> {
    await RankingExperiment.updateOne(
      { experimentId, 'variants.id': variantId },
      {
        $inc: { 'variants.$.metrics.impressions': 1 }
      }
    );
  }

  async recordClick(
    experimentId: string,
    variantId: string,
    userId: string,
    itemId: string
  ): Promise<void> {
    await RankingExperiment.updateOne(
      { experimentId, 'variants.id': variantId },
      {
        $inc: {
          'variants.$.metrics.clicks': 1,
          'variants.$.metrics.impressions': 0 // Click already counted in impression
        }
      }
    );
  }

  async recordConversion(
    experimentId: string,
    variantId: string,
    revenue?: number
  ): Promise<void> {
    const update: any = {
      $inc: { 'variants.$.metrics.conversions': 1 }
    };

    if (revenue !== undefined) {
      update.$inc['variants.$.metrics.revenue'] = revenue;
    }

    await RankingExperiment.updateOne(
      { experimentId, 'variants.id': variantId },
      update
    );
  }

  async getStats(experimentId: string): Promise<ExperimentStats | null> {
    const experiment = await RankingExperiment.findOne({ experimentId });

    if (!experiment) {
      return null;
    }

    const variantStats = experiment.variants.map(variant => {
      const { metrics } = variant;
      const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : 0;
      const conversionRate = metrics.clicks > 0 ? metrics.conversions / metrics.clicks : 0;
      const avgOrderValue = metrics.conversions > 0 ? metrics.revenue / metrics.conversions : 0;

      // Calculate statistical significance if we have enough data
      let significance: ExperimentStats['variants'][0]['significance'] = undefined;

      if (metrics.impressions >= this.minSampleSize) {
        significance = this.calculateSignificance(experiment.variants, variant.id);
      }

      return {
        id: variant.id,
        name: variant.name,
        traffic: variant.traffic,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        conversions: metrics.conversions,
        revenue: metrics.revenue,
        ctr,
        conversionRate,
        avgOrderValue,
        significance
      };
    });

    const totalImpressions = variantStats.reduce((sum, v) => sum + v.impressions, 0);
    const totalClicks = variantStats.reduce((sum, v) => sum + v.clicks, 0);
    const totalConversions = variantStats.reduce((sum, v) => sum + v.conversions, 0);

    let runningDuration: number | undefined;
    if (experiment.startDate) {
      runningDuration = Math.floor((Date.now() - experiment.startDate.getTime()) / (1000 * 60 * 60));
    }

    return {
      experimentId: experiment.experimentId,
      name: experiment.name,
      status: experiment.status,
      variants: variantStats,
      totalImpressions,
      totalClicks,
      totalConversions,
      startDate: experiment.startDate,
      runningDuration
    };
  }

  private calculateSignificance(
    variants: IRankingExperiment['variants'],
    targetVariantId: string
  ): ExperimentStats['variants'][0]['significance'] {
    const targetVariant = variants.find(v => v.id === targetVariantId);
    if (!targetVariant || variants.length < 2) {
      return { isSignificant: false };
    }

    // Control variant is first one
    const controlVariant = variants[0];
    if (controlVariant.id === targetVariantId) {
      return { isSignificant: false };
    }

    // Calculate z-score for CTR
    const p1 = controlVariant.metrics.impressions > 0
      ? controlVariant.metrics.clicks / controlVariant.metrics.impressions
      : 0;
    const p2 = targetVariant.metrics.impressions > 0
      ? targetVariant.metrics.clicks / targetVariant.metrics.impressions
      : 0;

    const n1 = controlVariant.metrics.impressions;
    const n2 = targetVariant.metrics.impressions;

    if (n1 < this.minSampleSize || n2 < this.minSampleSize) {
      return { isSignificant: false };
    }

    const pooledP = (controlVariant.metrics.clicks + targetVariant.metrics.clicks) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    if (se === 0) {
      return { isSignificant: false };
    }

    const zScore = (p2 - p1) / se;
    const pValue = this.normalCDF(-Math.abs(zScore)) * 2; // Two-tailed test
    const confidence = 1 - pValue;
    const isSignificant = pValue < (1 - this.confidenceLevel);

    // Check if this variant is the winner
    const maxCtr = Math.max(...variants.map(v =>
      v.metrics.impressions > 0 ? v.metrics.clicks / v.metrics.impressions : 0
    ));
    const winner = isSignificant && p2 === maxCtr;

    return {
      isSignificant,
      pValue,
      confidence,
      winner
    };
  }

  private normalCDF(x: number): number {
    // Approximation of the normal cumulative distribution function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  async listExperiments(status?: string): Promise<IRankingExperiment[]> {
    const query: any = {};
    if (status) {
      query.status = status;
    }
    return RankingExperiment.find(query).sort({ createdAt: -1 });
  }

  async adaptiveTrafficAllocation(experimentId: string): Promise<void> {
    const experiment = await RankingExperiment.findOne({ experimentId });

    if (!experiment || experiment.status !== 'running') {
      return;
    }

    const variants = experiment.variants;
    if (variants.length < 2) {
      return;
    }

    // Check if we have enough data for Epsilon-Greedy
    const totalImpressions = variants.reduce((sum, v) => sum + v.metrics.impressions, 0);
    if (totalImpressions < this.minSampleSize * 2) {
      return;
    }

    // Calculate CTR for each variant
    const ctrs = variants.map(v =>
      v.metrics.impressions > 0 ? v.metrics.clicks / v.metrics.impressions : 0
    );

    const maxCtr = Math.max(...ctrs);
    const explorationRate = 0.1; // 10% exploration

    // Reallocate traffic based on performance
    const newTraffic: number[] = variants.map((v, idx) => {
      if (idx === 0) return 50; // Keep control at 50% minimum

      const ctr = ctrs[idx];
      if (ctr >= maxCtr * 0.9) {
        return 30; // High performer
      } else if (ctr >= maxCtr * 0.7) {
        return 15; // Medium performer
      } else {
        return 5; // Low performer
      }
    });

    // Ensure traffic sums to 100
    const sum = newTraffic.reduce((a, b) => a + b, 0);
    const adjusted = newTraffic.map(t => (t / sum) * 100);

    // Update variants with new traffic allocation
    variants.forEach((v, idx) => {
      v.traffic = adjusted[idx];
    });

    experiment.markModified('variants');
    await experiment.save();

    log.info('Traffic reallocated', { experimentId, newTraffic: adjusted });
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

export const experimentService = new ExperimentService();
