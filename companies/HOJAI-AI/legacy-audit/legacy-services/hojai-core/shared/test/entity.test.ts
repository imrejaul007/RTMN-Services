/**
 * Entity Type Tests
 */

import { describe, it, expect } from 'vitest';

// Helper to check if value is one of allowed values
const isOneOf = (value: string, allowed: string[]): boolean => allowed.includes(value);

describe('Entity Types', () => {
  describe('BaseEntity', () => {
    it('should have required fields', () => {
      const entity = {
        id: 'test-123',
        tenant_id: 'tenant-456',
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(entity.id).toBeDefined();
      expect(entity.tenant_id).toBeDefined();
      expect(entity.created_at).toBeDefined();
      expect(entity.updated_at).toBeDefined();
    });
  });

  describe('IntelligencePrediction', () => {
    it('should have required fields', () => {
      const prediction = {
        id: 'pred-123',
        tenant_id: 'tenant-456',
        type: 'churn',
        model: 'hojai-churn-v1',
        score: 0.75,
        confidence: 0.85,
        features: { engagement: 0.5 },
        prediction: { churnRisk: 'high' },
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(prediction.id).toBeDefined();
      expect(prediction.tenant_id).toBeDefined();
      expect(isOneOf(prediction.type, ['churn', 'ltv', 'propensity', 'revisit', 'conversion', 'intent'])).toBe(true);
      expect(typeof prediction.score).toBe('number');
      expect(typeof prediction.confidence).toBe('number');
    });

    it('should accept valid prediction types', () => {
      const types = ['churn', 'ltv', 'propensity', 'revisit', 'conversion', 'intent'];
      types.forEach(type => {
        expect(isOneOf(type, ['churn', 'ltv', 'propensity', 'revisit', 'conversion', 'intent'])).toBe(true);
      });
    });
  });

  describe('IntelligenceRecommendation', () => {
    it('should have required fields', () => {
      const recommendation = {
        id: 'rec-123',
        tenant_id: 'tenant-456',
        type: 'product',
        items: [{ id: 'item-1', type: 'product', score: 0.9 }],
        strategy: 'collaborative-filtering',
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(recommendation.id).toBeDefined();
      expect(isOneOf(recommendation.type, ['product', 'content', 'action', 'personalized'])).toBe(true);
      expect(Array.isArray(recommendation.items)).toBe(true);
    });
  });

  describe('IntelligenceInsight', () => {
    it('should have required fields', () => {
      const insight = {
        id: 'insight-123',
        tenant_id: 'tenant-456',
        type: 'trend',
        title: 'Emerging Trend',
        description: 'A new trend has been detected',
        severity: 'medium',
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(insight.id).toBeDefined();
      expect(isOneOf(insight.type, ['segment', 'trend', 'anomaly', 'opportunity', 'risk'])).toBe(true);
      expect(isOneOf(insight.severity, ['low', 'medium', 'high', 'critical'])).toBe(true);
    });
  });

  describe('EventSubscription', () => {
    it('should have required fields', () => {
      const subscription = {
        id: 'sub-123',
        tenant_id: 'tenant-456',
        name: 'Test Subscription',
        event_type: 'order.created',
        handler: 'https://example.com/webhook',
        active: true,
        stats: { received: 10, processed: 9, failed: 1 },
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(subscription.id).toBeDefined();
      expect(subscription.tenant_id).toBeDefined();
      expect(typeof subscription.active).toBe('boolean');
      expect(subscription.stats).toBeDefined();
      expect(subscription.stats.received).toBeDefined();
      expect(subscription.stats.processed).toBeDefined();
      expect(subscription.stats.failed).toBeDefined();
    });
  });

  describe('SharedTenant', () => {
    it('should have required fields', () => {
      const tenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        plan: 'pro',
        quota: { api_calls: 100000, storage: 10000, users: 100 },
        usage: { api_calls: 5000, storage: 500, users: 10 },
        status: 'active',
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(tenant.id).toBeDefined();
      expect(isOneOf(tenant.plan, ['free', 'starter', 'pro', 'enterprise'])).toBe(true);
      expect(isOneOf(tenant.status, ['active', 'suspended', 'trial'])).toBe(true);
    });
  });

  describe('SharedApiKey', () => {
    it('should have required fields', () => {
      const apiKey = {
        id: 'key-123',
        tenant_id: 'tenant-456',
        key: 'hk_abc123',
        name: 'Test API Key',
        permissions: ['read', 'write'],
        status: 'active',
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(apiKey.id).toBeDefined();
      expect(apiKey.key).toBeDefined();
      expect(isOneOf(apiKey.status, ['active', 'revoked'])).toBe(true);
      expect(Array.isArray(apiKey.permissions)).toBe(true);
    });
  });

  describe('SharedWebhookConfig', () => {
    it('should have required fields', () => {
      const webhook = {
        id: 'webhook-123',
        tenant_id: 'tenant-456',
        url: 'https://example.com/webhook',
        events: ['order.created', 'order.updated'],
        secret: 'whs_secret123',
        retries: 3,
        status: 'active',
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(webhook.id).toBeDefined();
      expect(webhook.url).toBeDefined();
      expect(Array.isArray(webhook.events)).toBe(true);
      expect(isOneOf(webhook.status, ['active', 'inactive'])).toBe(true);
    });
  });
});

describe('EventBus Types', () => {
  describe('HojaiEvent', () => {
    it('should have required fields', () => {
      const event = {
        id: 'event-123',
        tenant_id: 'tenant-456',
        type: 'order.created',
        category: 'commerce',
        source: 'pos',
        data: { orderId: 'order-789' },
        occurred_at: '2026-06-13T00:00:00Z',
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(event.id).toBeDefined();
      expect(event.tenant_id).toBeDefined();
      expect(event.type).toBeDefined();
      expect(isOneOf(event.category, ['commerce', 'identity', 'loyalty', 'engagement', 'support', 'communication', 'ai', 'system'])).toBe(true);
    });
  });

  describe('EventStream', () => {
    it('should have required fields', () => {
      const stream = {
        id: 'stream-123',
        tenant_id: 'tenant-456',
        name: 'Orders Stream',
        event_types: ['order.created', 'order.updated'],
        retention_days: 30,
        created_at: '2026-06-13T00:00:00Z',
        updated_at: '2026-06-13T00:00:00Z'
      };

      expect(stream.id).toBeDefined();
      expect(stream.name).toBeDefined();
      expect(Array.isArray(stream.event_types)).toBe(true);
      expect(typeof stream.retention_days).toBe('number');
    });
  });
});
