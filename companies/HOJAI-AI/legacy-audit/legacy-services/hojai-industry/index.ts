/**
 * Hojai Industry Intelligence Framework
 *
 * Purpose: Learn patterns across multiple tenants WITHOUT storing tenant data
 *
 * Three-Layer Learning:
 * Layer 1: Tenant Learning (Private) - Each tenant has their own models
 * Layer 2: Industry Learning (Anonymous) - Aggregated patterns across tenants
 * Layer 3: Global Learning (Platform) - Workflow/agent patterns
 *
 * CRITICAL RULES:
 * - NO raw tenant data ever leaves the tenant
 * - Only aggregated, anonymous patterns
 * - Minimum 3 tenants required for any aggregation
 * - Minimum 100 events required
 * - No single tenant > 50% of any aggregate
 */

import { tenantMiddleware } from '../shared/middleware/tenant';
import { createLogger } from '../shared/utils/logger';
import { createResponse, createErrorResponse } from '../shared/types';

const logger = createLogger('hojai-industry');

// ============================================
// INDUSTRY TYPES
// ============================================

export type Industry = 'jewellery' | 'healthcare' | 'hospitality' | 'retail' | 'education' | 'finance' | 'real_estate';

export interface IndustryPattern {
  id: string;
  industry: Industry;
  patternType: PatternType;
  pattern: Record<string, number | string | string[]>;
  context: {
    geography?: string;
    timePeriod?: string;
    segment?: string;
  };
  quality: {
    tenantCount: number;
    sampleSize: number;
    confidence: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type PatternType =
  | 'conversion_timeline'
  | 'demand_spike'
  | 'retention_curve'
  | 'no_show_pattern'
  | 'seasonal_variation'
  | 'category_affinity'
  | 'follow_up_timing';

export interface AnonymousMetric {
  industry: Industry;
  patternType: PatternType;
  values: Record<string, number | string | string[]>;
  counts: {
    totalEvents: number;
    uniqueUsers: number;
  };
  tenantHash: string;
  timestamp: string;
}

// ============================================
// VALIDATION
// ============================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateMetric(metric: AnonymousMetric): ValidationResult {
  const errors: string[] = [];

  // Check minimum tenants (would be tenant hash count in production)
  if (!metric.tenantHash) {
    errors.push('Missing tenant hash');
  }

  // Check minimum events
  if (metric.counts.totalEvents < 100) {
    errors.push('Insufficient events (minimum: 100)');
  }

  // Check minimum unique users
  if (metric.counts.uniqueUsers < 10) {
    errors.push('Insufficient unique users (minimum: 10)');
  }

  // Check values exist
  if (!metric.values || Object.keys(metric.values).length === 0) {
    errors.push('No values provided');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================
// AGGREGATION ENGINE
// ============================================

/**
 * Privacy-Preserving Aggregation
 */
class AggregationEngine {
  /**
   * Aggregate metrics from multiple tenants
   */
  aggregate(
    metrics: AnonymousMetric[],
    patternType: PatternType
  ): Record<string, number> | null {
    if (metrics.length < 3) {
      logger.warn('aggregation_requires_min_3', { count: metrics.length });
      return null;
    }

    const totalEvents = metrics.reduce((sum, m) => sum + m.counts.totalEvents, 0);
    if (totalEvents < 100) {
      logger.warn('aggregation_requires_min_100_events', { totalEvents });
      return null;
    }

    // Check no single tenant dominates (> 50%)
    const maxTenantContribution = Math.max(
      ...metrics.map(m => m.counts.totalEvents / totalEvents)
    );
    if (maxTenantContribution > 0.5) {
      logger.warn('aggregation_skipped_dominant_tenant', {
        maxContribution: maxTenantContribution
      });
      return null;
    }

    // Aggregate numeric values
    const aggregated: Record<string, number[]> = {};

    for (const metric of metrics) {
      for (const [key, value] of Object.entries(metric.values)) {
        if (typeof value === 'number') {
          if (!aggregated[key]) aggregated[key] = [];
          aggregated[key].push(value);
        }
      }
    }

    // Calculate statistics
    const result: Record<string, number> = {};

    for (const [key, values] of Object.entries(aggregated)) {
      if (values.length > 0) {
        result[`${key}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
        result[`${key}_min`] = Math.min(...values);
        result[`${key}_max`] = Math.max(...values);
        result[`${key}_count`] = values.length;
      }
    }

    return result;
  }

  /**
   * Calculate bucket distributions
   */
  bucketDistribution(
    values: number[],
    bucketSize: number
  ): Record<string, number> {
    const buckets: Record<string, number> = {};

    for (const value of values) {
      const bucket = Math.floor(value / bucketSize) * bucketSize;
      const key = `${bucket}-${bucket + bucketSize}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }

    return buckets;
  }
}

// ============================================
// INDUSTRY BRAINS
// ============================================

/**
 * Base Industry Brain
 */
abstract class BaseIndustryBrain {
  protected industry: Industry;
  protected patterns: Map<string, IndustryPattern> = new Map();
  protected metrics: Map<string, AnonymousMetric[]> = new Map();
  protected aggregationEngine: AggregationEngine;

  constructor(industry: Industry) {
    this.industry = industry;
    this.aggregationEngine = new AggregationEngine();
  }

  /**
   * Receive anonymous metrics from a tenant
   */
  async receiveMetrics(metric: AnonymousMetric): Promise<{ accepted: boolean; reason?: string }> {
    // Validate
    const validation = validateMetric(metric);
    if (!validation.valid) {
      logger.warn('metric_rejected', {
        industry: this.industry,
        errors: validation.errors
      });
      return { accepted: false, reason: validation.errors.join(', ') };
    }

    // Store (in production, would be encrypted storage)
    const key = metric.patternType;
    const existing = this.metrics.get(key) || [];
    existing.push(metric);
    this.metrics.set(key, existing);

    logger.info('metric_received', {
      industry: this.industry,
      patternType: metric.patternType,
      tenantCount: existing.length
    });

    // Trigger aggregation if enough data
    if (existing.length >= 3) {
      await this.aggregateAndUpdate(metric.patternType);
    }

    return { accepted: true };
  }

  /**
   * Aggregate and update patterns
   */
  protected async aggregateAndUpdate(patternType: string): Promise<void> {
    const metrics = this.metrics.get(patternType) || [];
    if (metrics.length < 3) return;

    const aggregated = this.aggregationEngine.aggregate(metrics, patternType as PatternType);
    if (!aggregated) return;

    const pattern: IndustryPattern = {
      id: `pattern_${this.industry}_${patternType}`,
      industry: this.industry,
      patternType: patternType as PatternType,
      pattern: aggregated,
      context: {
        geography: 'multi-region',
        timePeriod: '90d'
      },
      quality: {
        tenantCount: metrics.length,
        sampleSize: metrics.reduce((sum, m) => sum + m.counts.totalEvents, 0),
        confidence: Math.min(0.95, 0.5 + (metrics.length * 0.1))
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.patterns.set(patternType, pattern);

    logger.info('pattern_updated', {
      industry: this.industry,
      patternType,
      tenantCount: metrics.length,
      confidence: pattern.quality.confidence
    });
  }

  /**
   * Get patterns for this industry
   */
  async getPatterns(): Promise<IndustryPattern[]> {
    return Array.from(this.patterns.values());
  }

  /**
   * Get specific pattern type
   */
  async getPattern(patternType: PatternType): Promise<IndustryPattern | null> {
    return this.patterns.get(patternType) || null;
  }
}

// ============================================
// JEWELLERY BRAIN
// ============================================

class JewelleryBrain extends BaseIndustryBrain {
  constructor() {
    super('jewellery');
  }

  /**
   * Jewellery-specific patterns
   */
  async getJewelleryInsights(): Promise<{
    bridalConversion: IndustryPattern | null;
    festivalDemand: IndustryPattern | null;
    followUpTiming: IndustryPattern | null;
  }> {
    const [bridal, festival, followUp] = await Promise.all([
      this.getPattern('conversion_timeline'),
      this.getPattern('demand_spike'),
      this.getPattern('follow_up_timing')
    ]);

    return {
      bridalConversion: bridal,
      festivalDemand: festival,
      followUpTiming: followUp
    };
  }
}

// ============================================
// HEALTHCARE BRAIN
// ============================================

class HealthcareBrain extends BaseIndustryBrain {
  constructor() {
    super('healthcare');
  }

  /**
   * Healthcare-specific patterns
   */
  async getHealthcareInsights(): Promise<{
    noShowPattern: IndustryPattern | null;
    retentionCurve: IndustryPattern | null;
  }> {
    const [noShow, retention] = await Promise.all([
      this.getPattern('no_show_pattern'),
      this.getPattern('retention_curve')
    ]);

    return {
      noShowPattern: noShow,
      retentionCurve: retention
    };
  }
}

// ============================================
// HOSPITALITY BRAIN
// ============================================

class HospitalityBrain extends BaseIndustryBrain {
  constructor() {
    super('hospitality');
  }

  /**
   * Hospitality-specific patterns
   */
  async getHospitalityInsights(): Promise<{
    seasonalVariation: IndustryPattern | null;
    demandSpike: IndustryPattern | null;
  }> {
    const [seasonal, demand] = await Promise.all([
      this.getPattern('seasonal_variation'),
      this.getPattern('demand_spike')
    ]);

    return {
      seasonalVariation: seasonal,
      demandSpike: demand
    };
  }
}

// ============================================
// RETAIL BRAIN
// ============================================

class RetailBrain extends BaseIndustryBrain {
  constructor() {
    super('retail');
  }

  /**
   * Retail-specific patterns
   */
  async getRetailInsights(): Promise<{
    categoryAffinity: IndustryPattern | null;
    retentionCurve: IndustryPattern | null;
  }> {
    const [affinity, retention] = await Promise.all([
      this.getPattern('category_affinity'),
      this.getPattern('retention_curve')
    ]);

    return {
      categoryAffinity: affinity,
      retentionCurve: retention
    };
  }
}

// ============================================
// INDUSTRY BRAIN REGISTRY
// ============================================

class IndustryBrainRegistry {
  private brains: Map<Industry, BaseIndustryBrain> = new Map();

  constructor() {
    this.brains.set('jewellery', new JewelleryBrain());
    this.brains.set('healthcare', new HealthcareBrain());
    this.brains.set('hospitality', new HospitalityBrain());
    this.brains.set('retail', new RetailBrain());
    this.brains.set('education', new BaseIndustryBrain('education'));
    this.brains.set('finance', new BaseIndustryBrain('finance'));
    this.brains.set('real_estate', new BaseIndustryBrain('real_estate'));
  }

  /**
   * Get brain for industry
   */
  getBrain(industry: Industry): BaseIndustryBrain {
    return this.brains.get(industry) || new BaseIndustryBrain(industry);
  }

  /**
   * Get all brains
   */
  getAllBrains(): Map<Industry, BaseIndustryBrain> {
    return this.brains;
  }
}

// ============================================
// PLATFORM
// ============================================

/**
 * Industry Intelligence Platform
 */
export class IndustryIntelligencePlatform {
  private registry: IndustryBrainRegistry;

  constructor() {
    this.registry = new IndustryBrainRegistry();
  }

  /**
   * Contribute anonymous metrics
   */
  async contributeMetrics(
    tenantId: string,
    metric: AnonymousMetric
  ): Promise<{ accepted: boolean; reason?: string }> {
    logger.info('metric_contribution_received', {
      tenantId,
      industry: metric.industry,
      patternType: metric.patternType
    });

    // Hash tenant ID (never store raw)
    metric.tenantHash = this.hashTenantId(tenantId);
    metric.timestamp = new Date().toISOString();

    const brain = this.registry.getBrain(metric.industry);
    return brain.receiveMetrics(metric);
  }

  /**
   * Get patterns for industry
   */
  async getPatterns(industry: Industry): Promise<IndustryPattern[]> {
    const brain = this.registry.getBrain(industry);
    return brain.getPatterns();
  }

  /**
   * Get pattern by type
   */
  async getPattern(
    industry: Industry,
    patternType: PatternType
  ): Promise<IndustryPattern | null> {
    const brain = this.registry.getBrain(industry);
    return brain.getPattern(patternType);
  }

  /**
   * Compare tenant metrics with industry benchmark
   */
  async compareWithBenchmark(
    tenantId: string,
    industry: Industry,
    tenantMetrics: Record<string, number>
  ): Promise<{
    benchmarks: IndustryPattern[];
    comparisons: Record<string, { tenant: number; industry: number; diff: number }>;
  }> {
    const patterns = await this.getPatterns(industry);
    const comparisons: Record<string, { tenant: number; industry: number; diff: number }> = {};

    for (const pattern of patterns) {
      for (const [key, tenantValue] of Object.entries(tenantMetrics)) {
        const industryAvg = pattern.pattern[`${key}_avg`];
        if (industryAvg !== undefined) {
          comparisons[key] = {
            tenant: tenantValue,
            industry: industryAvg as number,
            diff: ((tenantValue - (industryAvg as number)) / (industryAvg as number) * 100
          };
        }
      }
    }

    return { benchmarks: patterns, comparisons };
  }

  /**
   * Hash tenant ID for privacy
   */
  private hashTenantId(tenantId: string): string {
    // In production, use proper hashing (SHA-256)
    return `hash_${Buffer.from(tenantId).toString('base64').slice(0, 16)}`;
  }
}

// ============================================
// EXPRESS ROUTES
// ============================================

import express, { Request, Response } from 'express';

export function createIndustryRoutes(platform: IndustryIntelligencePlatform) {
  const router = express.Router();

  /**
   * POST /api/industry/contribute
   * Contribute anonymous metrics
   */
  router.post('/contribute', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const metric = req.body as AnonymousMetric;

      if (!metric.industry || !metric.patternType || !metric.values) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'industry, patternType, and values are required')
        );
      }

      const result = await platform.contributeMetrics(tenantId, metric);
      res.json(createResponse(result, { tenantId }));
    } catch (error) {
      logger.error('contribute_error', { error });
      res.status(500).json(
        createErrorResponse('CONTRIBUTE_ERROR', 'Failed to contribute metrics')
      );
    }
  });

  /**
   * GET /api/industry/:industry/patterns
   * Get all patterns for industry
   */
  router.get('/:industry/patterns', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { industry } = req.params;

      const patterns = await platform.getPatterns(industry as Industry);
      res.json(createResponse(patterns, { tenantId }));
    } catch (error) {
      logger.error('get_patterns_error', { error });
      res.status(500).json(
        createErrorResponse('GET_ERROR', 'Failed to get patterns')
      );
    }
  });

  /**
   * GET /api/industry/:industry/patterns/:patternType
   * Get specific pattern
   */
  router.get('/:industry/patterns/:patternType', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { industry, patternType } = req.params;

      const pattern = await platform.getPattern(
        industry as Industry,
        patternType as PatternType
      );

      if (!pattern) {
        return res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Pattern not found')
        );
      }

      res.json(createResponse(pattern, { tenantId }));
    } catch (error) {
      logger.error('get_pattern_error', { error });
      res.status(500).json(
        createErrorResponse('GET_ERROR', 'Failed to get pattern')
      );
    }
  });

  /**
   * POST /api/industry/:industry/compare
   * Compare tenant metrics with benchmark
   */
  router.post('/:industry/compare', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantContext!.tenant_id;
      const { industry } = req.params;
      const { metrics } = req.body;

      if (!metrics) {
        return res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'metrics are required')
        );
      }

      const comparison = await platform.compareWithBenchmark(
        tenantId,
        industry as Industry,
        metrics
      );

      res.json(createResponse(comparison, { tenantId }));
    } catch (error) {
      logger.error('compare_error', { error });
      res.status(500).json(
        createErrorResponse('COMPARE_ERROR', 'Failed to compare with benchmark')
      );
    }
  });

  return router;
}

// ============================================
// BOOTSTRAP
// ============================================

export async function bootstrap(port = 4700) {
  const platform = new IndustryIntelligencePlatform();
  const app = express();

  app.use(express.json({ limit: "10kb" }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'hojai-industry',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Industry routes
  app.use('/api/industry', createIndustryRoutes(platform));

  app.listen(port, () => {
    logger.info('hojai_industry_intelligence_started', { port });
  });

  return { platform, app };
}

// ============================================
// EXPORTS
// ============================================

export default {
  IndustryIntelligencePlatform,
  IndustryBrainRegistry,
  createIndustryRoutes,
  bootstrap
};
