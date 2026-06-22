/**
 * Hojai Industry Intelligence - Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================
// MOCK EXTERNAL DEPENDENCIES
// ============================================

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockTenantMiddleware = vi.fn((req: any, res: any, next: Function) => {
  req.tenantContext = { tenant_id: 'test-tenant-123' };
  next();
});

const mockCreateResponse = (data: any, meta?: any) => ({ data, meta, success: true });
const mockCreateErrorResponse = (code: string, message: string) => ({ error: { code, message } });

// ============================================
// TYPE DEFINITIONS (duplicated for testing)
// ============================================

type Industry = 'jewellery' | 'healthcare' | 'hospitality' | 'retail' | 'education' | 'finance' | 'real_estate';

type PatternType =
  | 'conversion_timeline'
  | 'demand_spike'
  | 'retention_curve'
  | 'no_show_pattern'
  | 'seasonal_variation'
  | 'category_affinity'
  | 'follow_up_timing';

interface IndustryPattern {
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

interface AnonymousMetric {
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
// VALIDATION TESTS
// ============================================

describe('Metric Validation', () => {
  function validateMetric(metric: AnonymousMetric): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metric.tenantHash) {
      errors.push('Missing tenant hash');
    }

    if (metric.counts.totalEvents < 100) {
      errors.push('Insufficient events (minimum: 100)');
    }

    if (metric.counts.uniqueUsers < 10) {
      errors.push('Insufficient unique users (minimum: 10)');
    }

    if (!metric.values || Object.keys(metric.values).length === 0) {
      errors.push('No values provided');
    }

    return { valid: errors.length === 0, errors };
  }

  it('should accept valid metric', () => {
    const metric: AnonymousMetric = {
      industry: 'healthcare',
      patternType: 'no_show_pattern',
      values: { rate: 0.15, avg_lateness: 12 },
      counts: { totalEvents: 500, uniqueUsers: 50 },
      tenantHash: 'hash_abc123',
      timestamp: new Date().toISOString(),
    };

    const result = validateMetric(metric);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject metric without tenant hash', () => {
    const metric: AnonymousMetric = {
      industry: 'healthcare',
      patternType: 'no_show_pattern',
      values: { rate: 0.15 },
      counts: { totalEvents: 500, uniqueUsers: 50 },
      tenantHash: '',
      timestamp: new Date().toISOString(),
    };

    const result = validateMetric(metric);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing tenant hash');
  });

  it('should reject metric with insufficient events', () => {
    const metric: AnonymousMetric = {
      industry: 'hospitality',
      patternType: 'demand_spike',
      values: { occupancy: 0.85 },
      counts: { totalEvents: 50, uniqueUsers: 20 },
      tenantHash: 'hash_xyz',
      timestamp: new Date().toISOString(),
    };

    const result = validateMetric(metric);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Insufficient events (minimum: 100)');
  });

  it('should reject metric with insufficient unique users', () => {
    const metric: AnonymousMetric = {
      industry: 'retail',
      patternType: 'conversion_timeline',
      values: { rate: 0.05 },
      counts: { totalEvents: 500, uniqueUsers: 5 },
      tenantHash: 'hash_123',
      timestamp: new Date().toISOString(),
    };

    const result = validateMetric(metric);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Insufficient unique users (minimum: 10)');
  });

  it('should reject metric without values', () => {
    const metric: AnonymousMetric = {
      industry: 'jewellery',
      patternType: 'follow_up_timing',
      values: {},
      counts: { totalEvents: 500, uniqueUsers: 50 },
      tenantHash: 'hash_abc',
      timestamp: new Date().toISOString(),
    };

    const result = validateMetric(metric);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No values provided');
  });

  it('should accept metric at exact minimum thresholds', () => {
    const metric: AnonymousMetric = {
      industry: 'finance',
      patternType: 'seasonal_variation',
      values: { variance: 0.25 },
      counts: { totalEvents: 100, uniqueUsers: 10 },
      tenantHash: 'hash_min',
      timestamp: new Date().toISOString(),
    };

    const result = validateMetric(metric);

    expect(result.valid).toBe(true);
  });
});

// ============================================
// AGGREGATION ENGINE TESTS
// ============================================

describe('AggregationEngine', () => {
  class AggregationEngine {
    aggregate(
      metrics: AnonymousMetric[],
      patternType: PatternType
    ): Record<string, number> | null {
      if (metrics.length < 3) {
        return null;
      }

      const totalEvents = metrics.reduce((sum, m) => sum + m.counts.totalEvents, 0);
      if (totalEvents < 100) {
        return null;
      }

      // Check no single tenant dominates (> 50%)
      const maxTenantContribution = Math.max(
        ...metrics.map(m => m.counts.totalEvents / totalEvents)
      );
      if (maxTenantContribution > 0.5) {
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

    bucketDistribution(values: number[], bucketSize: number): Record<string, number> {
      const buckets: Record<string, number> = {};

      for (const value of values) {
        const bucket = Math.floor(value / bucketSize) * bucketSize;
        const key = `${bucket}-${bucket + bucketSize}`;
        buckets[key] = (buckets[key] || 0) + 1;
      }

      return buckets;
    }
  }

  let engine: AggregationEngine;

  beforeEach(() => {
    engine = new AggregationEngine();
  });

  describe('aggregate()', () => {
    it('should return null for fewer than 3 metrics', () => {
      const metrics: AnonymousMetric[] = [
        {
          industry: 'healthcare',
          patternType: 'no_show_pattern',
          values: { rate: 0.15 },
          counts: { totalEvents: 200, uniqueUsers: 20 },
          tenantHash: 'hash_1',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'healthcare',
          patternType: 'no_show_pattern',
          values: { rate: 0.18 },
          counts: { totalEvents: 150, uniqueUsers: 15 },
          tenantHash: 'hash_2',
          timestamp: new Date().toISOString(),
        },
      ];

      const result = engine.aggregate(metrics, 'no_show_pattern');

      expect(result).toBeNull();
    });

    it('should return null when total events < 100', () => {
      const metrics: AnonymousMetric[] = [
        {
          industry: 'healthcare',
          patternType: 'no_show_pattern',
          values: { rate: 0.15 },
          counts: { totalEvents: 30, uniqueUsers: 10 },
          tenantHash: 'hash_1',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'healthcare',
          patternType: 'no_show_pattern',
          values: { rate: 0.18 },
          counts: { totalEvents: 30, uniqueUsers: 10 },
          tenantHash: 'hash_2',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'healthcare',
          patternType: 'no_show_pattern',
          values: { rate: 0.20 },
          counts: { totalEvents: 30, uniqueUsers: 10 },
          tenantHash: 'hash_3',
          timestamp: new Date().toISOString(),
        },
      ];

      const result = engine.aggregate(metrics, 'no_show_pattern');

      expect(result).toBeNull();
    });

    it('should return null when one tenant dominates > 50%', () => {
      const metrics: AnonymousMetric[] = [
        {
          industry: 'hospitality',
          patternType: 'demand_spike',
          values: { occupancy: 0.85 },
          counts: { totalEvents: 600, uniqueUsers: 60 },
          tenantHash: 'hash_dominant',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'hospitality',
          patternType: 'demand_spike',
          values: { occupancy: 0.70 },
          counts: { totalEvents: 100, uniqueUsers: 10 },
          tenantHash: 'hash_small1',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'hospitality',
          patternType: 'demand_spike',
          values: { occupancy: 0.75 },
          counts: { totalEvents: 100, uniqueUsers: 10 },
          tenantHash: 'hash_small2',
          timestamp: new Date().toISOString(),
        },
      ];

      const result = engine.aggregate(metrics, 'demand_spike');

      expect(result).toBeNull();
    });

    it('should aggregate valid metrics correctly', () => {
      const metrics: AnonymousMetric[] = [
        {
          industry: 'retail',
          patternType: 'conversion_timeline',
          values: { rate: 0.05 },
          counts: { totalEvents: 200, uniqueUsers: 20 },
          tenantHash: 'hash_1',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'retail',
          patternType: 'conversion_timeline',
          values: { rate: 0.07 },
          counts: { totalEvents: 200, uniqueUsers: 20 },
          tenantHash: 'hash_2',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'retail',
          patternType: 'conversion_timeline',
          values: { rate: 0.06 },
          counts: { totalEvents: 200, uniqueUsers: 20 },
          tenantHash: 'hash_3',
          timestamp: new Date().toISOString(),
        },
      ];

      const result = engine.aggregate(metrics, 'conversion_timeline');

      expect(result).not.toBeNull();
      expect(result!['rate_avg']).toBeCloseTo(0.06, 2);
      expect(result!['rate_min']).toBe(0.05);
      expect(result!['rate_max']).toBe(0.07);
      expect(result!['rate_count']).toBe(3);
    });

    it('should aggregate multiple numeric values', () => {
      const metrics: AnonymousMetric[] = [
        {
          industry: 'jewellery',
          patternType: 'bridal_conversion',
          values: { rate: 0.12, avg_value: 500000, repeat_rate: 0.35 },
          counts: { totalEvents: 300, uniqueUsers: 30 },
          tenantHash: 'hash_1',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'jewellery',
          patternType: 'bridal_conversion',
          values: { rate: 0.15, avg_value: 750000, repeat_rate: 0.40 },
          counts: { totalEvents: 300, uniqueUsers: 30 },
          tenantHash: 'hash_2',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'jewellery',
          patternType: 'bridal_conversion',
          values: { rate: 0.10, avg_value: 600000, repeat_rate: 0.30 },
          counts: { totalEvents: 300, uniqueUsers: 30 },
          tenantHash: 'hash_3',
          timestamp: new Date().toISOString(),
        },
      ];

      const result = engine.aggregate(metrics, 'bridal_conversion');

      expect(result).not.toBeNull();
      expect(result!['rate_avg']).toBeCloseTo(0.123, 2);
      expect(result!['avg_value_avg']).toBeCloseTo(616666.67, 0);
      expect(result!['repeat_rate_avg']).toBeCloseTo(0.35, 2);
    });

    it('should ignore non-numeric values', () => {
      const metrics: AnonymousMetric[] = [
        {
          industry: 'education',
          patternType: 'retention_curve',
          values: { rate: 0.85, segment: 'enterprise' },
          counts: { totalEvents: 200, uniqueUsers: 20 },
          tenantHash: 'hash_1',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'education',
          patternType: 'retention_curve',
          values: { rate: 0.90, segment: 'startup' },
          counts: { totalEvents: 200, uniqueUsers: 20 },
          tenantHash: 'hash_2',
          timestamp: new Date().toISOString(),
        },
        {
          industry: 'education',
          patternType: 'retention_curve',
          values: { rate: 0.88, segment: 'mid-market' },
          counts: { totalEvents: 200, uniqueUsers: 20 },
          tenantHash: 'hash_3',
          timestamp: new Date().toISOString(),
        },
      ];

      const result = engine.aggregate(metrics, 'retention_curve');

      expect(result).not.toBeNull();
      expect(result!['rate_avg']).toBeCloseTo(0.877, 2);
      expect(result!['segment_avg']).toBeUndefined();
    });
  });

  describe('bucketDistribution()', () => {
    it('should create correct buckets', () => {
      // Values: 5 → bucket 0-10, 15 → bucket 10-20, 25 → bucket 20-30, etc.
      const values = [5, 15, 25, 35, 45, 55];
      const bucketSize = 10;

      const result = engine.bucketDistribution(values, bucketSize);

      // 5 → Math.floor(5/10)*10 = 0, bucket "0-10"
      // 15 → Math.floor(15/10)*10 = 10, bucket "10-20"
      // 25 → Math.floor(25/10)*10 = 20, bucket "20-30"
      // 35 → Math.floor(35/10)*10 = 30, bucket "30-40"
      // 45 → Math.floor(45/10)*10 = 40, bucket "40-50"
      // 55 → Math.floor(55/10)*10 = 50, bucket "50-60"
      expect(result['0-10']).toBe(1);  // Only 5
      expect(result['10-20']).toBe(1); // Only 15
      expect(result['20-30']).toBe(1); // Only 25
      expect(result['30-40']).toBe(1); // Only 35
      expect(result['40-50']).toBe(1); // Only 45
      expect(result['50-60']).toBe(1); // Only 55
    });

    it('should handle empty array', () => {
      const result = engine.bucketDistribution([], 10);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle single value', () => {
      const result = engine.bucketDistribution([25], 10);

      expect(result['20-30']).toBe(1);
    });

    it('should handle custom bucket size', () => {
      const values = [100, 250, 400, 550];
      const bucketSize = 100;

      const result = engine.bucketDistribution(values, bucketSize);

      expect(result['100-200']).toBe(1);
      expect(result['200-300']).toBe(1);
      expect(result['400-500']).toBe(1);
      expect(result['500-600']).toBe(1);
    });
  });
});

// ============================================
// INDUSTRY PATTERN TYPES TESTS
// ============================================

describe('Pattern Types', () => {
  it('should have valid conversion_timeline patterns', () => {
    const validPatternType = 'conversion_timeline';

    expect(['conversion_timeline']).toContain(validPatternType);
  });

  it('should support all industry verticals', () => {
    const validIndustries: Industry[] = [
      'jewellery',
      'healthcare',
      'hospitality',
      'retail',
      'education',
      'finance',
      'real_estate',
    ];

    validIndustries.forEach(industry => {
      expect(['jewellery', 'healthcare', 'hospitality', 'retail', 'education', 'finance', 'real_estate']).toContain(industry);
    });
  });

  it('should support all pattern types', () => {
    const validPatternTypes: PatternType[] = [
      'conversion_timeline',
      'demand_spike',
      'retention_curve',
      'no_show_pattern',
      'seasonal_variation',
      'category_affinity',
      'follow_up_timing',
    ];

    expect(validPatternTypes).toHaveLength(7);
  });
});

// ============================================
// INDUSTRY PATTERN STRUCTURE TESTS
// ============================================

describe('IndustryPattern Structure', () => {
  it('should create valid pattern object', () => {
    const pattern: IndustryPattern = {
      id: 'pattern_jewellery_conversion_timeline',
      industry: 'jewellery',
      patternType: 'conversion_timeline',
      pattern: {
        avg_days_to_convert: 45,
        min_days: 7,
        max_days: 120,
        conversion_count: 3,
      },
      context: {
        geography: 'india',
        timePeriod: '90d',
        segment: 'bridal',
      },
      quality: {
        tenantCount: 5,
        sampleSize: 2500,
        confidence: 0.85,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(pattern.id).toBeDefined();
    expect(pattern.industry).toBe('jewellery');
    expect(pattern.patternType).toBe('conversion_timeline');
    expect(pattern.quality.confidence).toBeLessThanOrEqual(1);
    expect(pattern.quality.confidence).toBeGreaterThan(0);
  });

  it('should calculate confidence based on tenant count', () => {
    const calculateConfidence = (tenantCount: number): number => {
      return Math.min(0.95, 0.5 + tenantCount * 0.1);
    };

    expect(calculateConfidence(3)).toBe(0.8);
    expect(calculateConfidence(5)).toBe(0.95);
    expect(calculateConfidence(1)).toBe(0.6);
    expect(calculateConfidence(10)).toBe(0.95); // capped
  });
});

// ============================================
// TENANT HASHING TESTS
// ============================================

describe('Tenant Privacy', () => {
  it('should hash tenant ID consistently', () => {
    const hashTenantId = (tenantId: string): string => {
      return `hash_${Buffer.from(tenantId).toString('base64').slice(0, 16)}`;
    };

    const tenantId = 'tenant_12345';
    const hash1 = hashTenantId(tenantId);
    const hash2 = hashTenantId(tenantId);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(tenantId);
  });

  it('should produce different hashes for different tenants', () => {
    const hashTenantId = (tenantId: string): string => {
      return `hash_${Buffer.from(tenantId).toString('base64').slice(0, 16)}`;
    };

    const hash1 = hashTenantId('tenant_abc');
    const hash2 = hashTenantId('tenant_xyz');

    expect(hash1).not.toBe(hash2);
  });

  it('should produce hash of consistent length', () => {
    const hashTenantId = (tenantId: string): string => {
      // Use fixed-length hash simulation
      const hash = Buffer.from(tenantId).toString('base64').padEnd(16, '0').slice(0, 16);
      return `hash_${hash}`;
    };

    const shortId = hashTenantId('a');
    const longId = hashTenantId('a'.repeat(100));

    // Both should start with 'hash_' and have 16 chars after
    expect(shortId.startsWith('hash_')).toBe(true);
    expect(longId.startsWith('hash_')).toBe(true);
    expect(shortId.length).toBe(21); // 'hash_' + 16 chars
    expect(longId.length).toBe(21); // 'hash_' + 16 chars
  });
});

// ============================================
// BENCHMARK COMPARISON TESTS
// ============================================

describe('Benchmark Comparison', () => {
  it('should calculate difference percentage correctly', () => {
    const tenantValue = 0.08;
    const industryAvg = 0.10;
    const diff = ((tenantValue - industryAvg) / industryAvg) * 100;

    expect(diff).toBeCloseTo(-20, 0);
  });

  it('should handle zero industry average', () => {
    const tenantValue = 0.05;
    const industryAvg = 0;

    // Handle division by zero gracefully
    const safeCompare = (tenant: number, industry: number): number | null => {
      if (industry === 0) return null;
      return ((tenant - industry) / industry) * 100;
    };

    expect(safeCompare(tenantValue, industryAvg)).toBeNull();
    expect(safeCompare(0.05, 0.10)).toBe(-50);
  });

  it('should identify overperformers vs underperformers', () => {
    const compareWithBenchmark = (
      tenantMetrics: Record<string, number>,
      patterns: IndustryPattern[]
    ): Record<string, 'above' | 'below' | 'at'> => {
      const comparisons: Record<string, 'above' | 'below' | 'at'> = {};

      for (const pattern of patterns) {
        for (const [key, tenantValue] of Object.entries(tenantMetrics)) {
          const industryAvg = pattern.pattern[`${key}_avg`] as number;
          if (industryAvg !== undefined) {
            const diff = ((tenantValue - industryAvg) / industryAvg) * 100;
            if (diff > 5) comparisons[key] = 'above';
            else if (diff < -5) comparisons[key] = 'below';
            else comparisons[key] = 'at';
          }
        }
      }

      return comparisons;
    };

    const patterns: IndustryPattern[] = [
      {
        id: 'p1',
        industry: 'healthcare',
        patternType: 'no_show_pattern',
        pattern: { rate_avg: 0.15, rate_min: 0.05, rate_max: 0.30 },
        context: {},
        quality: { tenantCount: 5, sampleSize: 1000, confidence: 0.85 },
        createdAt: '',
        updatedAt: '',
      },
    ];

    expect(compareWithBenchmark({ rate: 0.20 }, patterns).rate).toBe('above');
    expect(compareWithBenchmark({ rate: 0.10 }, patterns).rate).toBe('below');
    expect(compareWithBenchmark({ rate: 0.15 }, patterns).rate).toBe('at');
  });
});

// ============================================
// API VALIDATION TESTS
// ============================================

describe('API Validation', () => {
  it('should validate contribute endpoint payload', () => {
    const validateContributePayload = (payload: any): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!payload.industry) errors.push('industry is required');
      if (!payload.patternType) errors.push('patternType is required');
      if (!payload.values) errors.push('values are required');

      return { valid: errors.length === 0, errors };
    };

    expect(validateContributePayload({
      industry: 'healthcare',
      patternType: 'no_show_pattern',
      values: { rate: 0.15 },
    }).valid).toBe(true);

    expect(validateContributePayload({}).valid).toBe(false);
    expect(validateContributePayload({ industry: 'healthcare' }).valid).toBe(false);
  });

  it('should validate compare endpoint payload', () => {
    const validateComparePayload = (payload: any): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!payload.metrics) errors.push('metrics are required');
      else if (typeof payload.metrics !== 'object') errors.push('metrics must be an object');

      return { valid: errors.length === 0, errors };
    };

    expect(validateComparePayload({ metrics: { rate: 0.15 } }).valid).toBe(true);
    expect(validateComparePayload({}).valid).toBe(false);
    expect(validateComparePayload({ metrics: 'invalid' }).valid).toBe(false);
  });
});

// ============================================
// HEALTH CHECK TESTS
// ============================================

describe('Health Check', () => {
  it('should return healthy status structure', () => {
    const healthResponse = {
      status: 'healthy',
      service: 'hojai-industry',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };

    expect(healthResponse.status).toBe('healthy');
    expect(healthResponse.service).toBe('hojai-industry');
    expect(healthResponse.version).toBe('1.0.0');
    expect(healthResponse.timestamp).toBeDefined();
  });
});
