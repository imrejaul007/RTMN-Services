/**
 * Competitive Intelligence - Type Validation Tests
 */
import { describe, it, expect } from 'vitest';
import {
  CompetitorSchema,
  CompetitorProductSchema,
  FundingRoundSchema,
  NewsArticleSchema,
  AlertSchema,
  CreateCompetitorRequestSchema,
  detectThreatFromPricing,
  detectThreatFromNews,
  detectOpportunityFromNews,
} from '../types';

describe('Competitor Schema Validation', () => {
  it('should validate a valid competitor', () => {
    const valid = { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Acme Corp', industry: 'SaaS', website: 'https://acme.com' };
    const result = CompetitorSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
  it('should reject competitor without name', () => {
    const invalid = { id: '550e8400-e29b-41d4-a716-446655440000', industry: 'SaaS' };
    const result = CompetitorSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
  it('should accept valid statuses', () => {
    ['active', 'inactive', 'acquired', 'defunct'].forEach(status => {
      const c = { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Test', industry: 'SaaS', status };
      expect(CompetitorSchema.safeParse(c).success).toBe(true);
    });
  });
  it('should accept valid sizes', () => {
    ['startup', 'small', 'medium', 'large', 'enterprise'].forEach(size => {
      const c = { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Test', industry: 'SaaS', size };
      expect(CompetitorSchema.safeParse(c).success).toBe(true);
    });
  });
});

describe('Funding Round Schema Validation', () => {
  it('should validate a valid funding round', () => {
    const valid = { id: '550e8400-e29b-41d4-a716-446655440000', competitorId: '550e8400-e29b-41d4-a716-446655440001', roundType: 'series_a', amount: 10000000, announcedDate: new Date() };
    const result = FundingRoundSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
  it('should accept all round types', () => {
    ['seed', 'series_a', 'series_b', 'series_c', 'series_d', 'series_e', 'ipo', 'acquisition', 'other'].forEach(type => {
      const f = { id: '550e8400-e29b-41d4-a716-446655440000', competitorId: '550e8400-e29b-41d4-a716-446655440001', roundType: type, amount: 1000000, announcedDate: new Date() };
      expect(FundingRoundSchema.safeParse(f).success).toBe(true);
    });
  });
});

describe('News Article Schema Validation', () => {
  it('should validate a valid news article', () => {
    const valid = { id: '550e8400-e29b-41d4-a716-446655440000', competitorId: '550e8400-e29b-41d4-a716-446655440001', title: 'Company raises $10M', source: 'TechCrunch', url: 'https://example.com/news', publishedAt: new Date() };
    const result = NewsArticleSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
  it('should accept valid sentiments', () => {
    ['positive', 'neutral', 'negative'].forEach(s => {
      const n = { id: '550e8400-e29b-41d4-a716-446655440000', competitorId: '550e8400-e29b-41d4-a716-446655440001', title: 'Test', source: 'Test', url: 'https://example.com', publishedAt: new Date(), sentiment: s };
      expect(NewsArticleSchema.safeParse(n).success).toBe(true);
    });
  });
});

describe('Alert Schema Validation', () => {
  it('should validate a valid alert', () => {
    const valid = { id: '550e8400-e29b-41d4-a716-446655440000', type: 'threat', severity: 'high', title: 'Price drop detected', description: 'Competitor lowered prices by 30%' };
    const result = AlertSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
  it('should accept all alert types', () => {
    ['threat', 'opportunity', 'milestone', 'crisis'].forEach(type => {
      const a = { id: '550e8400-e29b-41d4-a716-446655440000', type, severity: 'high', title: 'Test', description: 'Test' };
      expect(AlertSchema.safeParse(a).success).toBe(true);
    });
  });
  it('should accept all severities', () => {
    ['critical', 'high', 'medium', 'low', 'info'].forEach(severity => {
      const a = { id: '550e8400-e29b-41d4-a716-446655440000', type: 'threat', severity, title: 'Test', description: 'Test' };
      expect(AlertSchema.safeParse(a).success).toBe(true);
    });
  });
});

describe('Threat Detection', () => {
  it('should detect threat from pricing drop', () => {
    expect(detectThreatFromPricing(100, 70)).toBe(true);  // 30% drop
    expect(detectThreatFromPricing(100, 85)).toBe(false); // 15% drop
  });
  it('should detect threat from negative news', () => {
    expect(detectThreatFromNews('negative')).toBe(true);
    expect(detectThreatFromNews('positive')).toBe(false);
  });
  it('should detect opportunity from positive news', () => {
    expect(detectOpportunityFromNews('positive')).toBe(true);
    expect(detectOpportunityFromNews('negative')).toBe(false);
  });
});
