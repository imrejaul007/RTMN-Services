/**
 * Product Intelligence - Type Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ProductSchema,
  ProductFeatureSchema,
  ProductFeedbackSchema,
  RoadmapItemSchema,
  ProductMetricSchema,
  CreateProductRequestSchema,
  CreateFeatureRequestSchema,
  CreateFeedbackRequestSchema,
  RecordMetricRequestSchema,
  calculateRiceScore,
  getRiceRecommendation,
} from '../types';

describe('Product Schema Validation', () => {
  it('should validate a valid product', () => {
    const validProduct = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Product',
      category: 'SaaS',
      status: 'active',
    };
    const result = ProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('should reject product without name', () => {
    const invalidProduct = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      category: 'SaaS',
    };
    const result = ProductSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
  });

  it('should reject product with name exceeding max length', () => {
    const invalidProduct = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'A'.repeat(201), // max is 200
      category: 'SaaS',
    };
    const result = ProductSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
  });

  it('should accept valid product statuses', () => {
    const statuses = ['active', 'draft', 'archived', 'discontinued'];
    statuses.forEach(status => {
      const product = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        category: 'SaaS',
        status,
      };
      const result = ProductSchema.safeParse(product);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid status', () => {
    const product = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test',
      category: 'SaaS',
      status: 'invalid',
    };
    const result = ProductSchema.safeParse(product);
    expect(result.success).toBe(false);
  });
});

describe('Product Feature Schema Validation', () => {
  it('should validate a valid feature', () => {
    const validFeature = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      productId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'User Authentication',
      priority: 'high',
      status: 'planned',
    };
    const result = ProductFeatureSchema.safeParse(validFeature);
    expect(result.success).toBe(true);
  });

  it('should accept valid priorities', () => {
    const priorities = ['critical', 'high', 'medium', 'low'];
    priorities.forEach(priority => {
      const feature = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Feature',
        priority,
      };
      const result = ProductFeatureSchema.safeParse(feature);
      expect(result.success).toBe(true);
    });
  });

  it('should accept valid statuses', () => {
    const statuses = ['planned', 'in_progress', 'completed', 'cancelled'];
    statuses.forEach(status => {
      const feature = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Feature',
        status,
      };
      const result = ProductFeatureSchema.safeParse(feature);
      expect(result.success).toBe(true);
    });
  });
});

describe('Product Feedback Schema Validation', () => {
  it('should validate a valid feedback', () => {
    const validFeedback = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      productId: '550e8400-e29b-41d4-a716-446655440001',
      content: 'Great product! Love the new features.',
      sentiment: 'positive',
    };
    const result = ProductFeedbackSchema.safeParse(validFeedback);
    expect(result.success).toBe(true);
  });

  it('should reject feedback without content', () => {
    const invalidFeedback = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      productId: '550e8400-e29b-41d4-a716-446655440001',
    };
    const result = ProductFeedbackSchema.safeParse(invalidFeedback);
    expect(result.success).toBe(false);
  });

  it('should accept valid sentiments', () => {
    const sentiments = ['positive', 'neutral', 'negative'];
    sentiments.forEach(sentiment => {
      const feedback = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        content: 'Test feedback',
        sentiment,
      };
      const result = ProductFeedbackSchema.safeParse(feedback);
      expect(result.success).toBe(true);
    });
  });

  it('should accept valid sources', () => {
    const sources = ['in_app', 'email', 'support_ticket', 'social', 'review', 'survey', 'other'];
    sources.forEach(source => {
      const feedback = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        content: 'Test feedback',
        source,
      };
      const result = ProductFeedbackSchema.safeParse(feedback);
      expect(result.success).toBe(true);
    });
  });

  it('should validate rating between 1 and 5', () => {
    const feedback = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      productId: '550e8400-e29b-41d4-a716-446655440001',
      content: 'Test feedback',
      rating: 4,
    };
    const result = ProductFeedbackSchema.safeParse(feedback);
    expect(result.success).toBe(true);
  });

  it('should reject rating below 1', () => {
    const feedback = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      productId: '550e8400-e29b-41d4-a716-446655440001',
      content: 'Test feedback',
      rating: 0,
    };
    const result = ProductFeedbackSchema.safeParse(feedback);
    expect(result.success).toBe(false);
  });

  it('should reject rating above 5', () => {
    const feedback = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      productId: '550e8400-e29b-41d4-a716-446655440001',
      content: 'Test feedback',
      rating: 6,
    };
    const result = ProductFeedbackSchema.safeParse(feedback);
    expect(result.success).toBe(false);
  });
});

describe('Roadmap Item Schema Validation', () => {
  it('should validate a valid roadmap item', () => {
    const validItem = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      productId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Q1 Release',
      targetDate: new Date('2026-03-31'),
      type: 'release',
      status: 'planned',
    };
    const result = RoadmapItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it('should accept valid types', () => {
    const types = ['feature', 'improvement', 'bug_fix', 'milestone', 'release'];
    types.forEach(type => {
      const item = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test',
        targetDate: new Date(),
        type,
      };
      const result = RoadmapItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });
  });
});

describe('Product Metric Schema Validation', () => {
  it('should validate a valid metric', () => {
    const validMetric = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      productId: '550e8400-e29b-41d4-a716-446655440001',
      metricType: 'daily_active_users',
      value: 1000,
      period: 'daily',
    };
    const result = ProductMetricSchema.safeParse(validMetric);
    expect(result.success).toBe(true);
  });

  it('should accept all valid metric types', () => {
    const metricTypes = [
      'daily_active_users',
      'monthly_active_users',
      'sessions',
      'retention_rate',
      'churn_rate',
      'nps_score',
      'csat_score',
      'revenue',
      'conversions',
    ];
    metricTypes.forEach(metricType => {
      const metric = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        productId: '550e8400-e29b-41d4-a716-446655440001',
        metricType,
        value: 100,
      };
      const result = ProductMetricSchema.safeParse(metric);
      expect(result.success).toBe(true);
    });
  });
});

describe('RICE Scoring', () => {
  it('should calculate RICE score correctly', () => {
    const score = calculateRiceScore(100, 2, 0.8, 10);
    // (100 * 2 * 0.8) / 10 = 16
    expect(score).toBe(16);
  });

  it('should return 0 for zero effort', () => {
    const score = calculateRiceScore(100, 2, 0.8, 0);
    expect(score).toBe(0);
  });

  it('should return implement recommendation for high scores', () => {
    const recommendation = getRiceRecommendation(75);
    expect(recommendation).toBe('implement');
  });

  it('should return schedule recommendation for medium scores', () => {
    const recommendation = getRiceRecommendation(35);
    expect(recommendation).toBe('schedule');
  });

  it('should return reconsider recommendation for low scores', () => {
    const recommendation = getRiceRecommendation(10);
    expect(recommendation).toBe('reconsider');
  });

  it('should return reject recommendation for very low scores', () => {
    const recommendation = getRiceRecommendation(3);
    expect(recommendation).toBe('reject');
  });

  it('should handle boundary values', () => {
    expect(getRiceRecommendation(50)).toBe('implement');
    expect(getRiceRecommendation(49)).toBe('schedule');
    expect(getRiceRecommendation(20)).toBe('schedule');
    expect(getRiceRecommendation(19)).toBe('reconsider');
    expect(getRiceRecommendation(5)).toBe('reconsider');
    expect(getRiceRecommendation(4)).toBe('reject');
  });
});

describe('Create Request Schemas', () => {
  it('should validate CreateProductRequest', () => {
    const request = {
      name: 'New Product',
      category: 'SaaS',
    };
    const result = CreateProductRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should validate CreateFeatureRequest', () => {
    const request = {
      name: 'New Feature',
      priority: 'high',
    };
    const result = CreateFeatureRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should validate CreateFeedbackRequest', () => {
    const request = {
      productId: '550e8400-e29b-41d4-a716-446655440001',
      content: 'User feedback',
    };
    const result = CreateFeedbackRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should validate RecordMetricRequest', () => {
    const request = {
      metricType: 'nps_score',
      value: 45,
    };
    const result = RecordMetricRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });
});
