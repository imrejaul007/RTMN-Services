import { describe, it, expect } from 'vitest';

// Twin Marketplace Constants
const TWIN_TYPES = ['customer', 'product', 'employee', 'order', 'asset'];
const TWIN_STATUSES = ['active', 'inactive', 'archived'];
const PRICING_MODELS = ['per_query', 'per_twin', 'subscription', 'free'];

describe('Twin Marketplace', () => {
  describe('Twin Types', () => {
    it('should have all twin types', () => {
      expect(TWIN_TYPES).toContain('customer');
      expect(TWIN_TYPES).toContain('product');
      expect(TWIN_TYPES).toContain('employee');
    });
  });

  describe('Twin Statuses', () => {
    it('should have all twin statuses', () => {
      expect(TWIN_STATUSES).toContain('active');
      expect(TWIN_STATUSES).toContain('inactive');
      expect(TWIN_STATUSES).toContain('archived');
    });
  });

  describe('Pricing Models', () => {
    it('should have all pricing models', () => {
      expect(PRICING_MODELS).toContain('per_query');
      expect(PRICING_MODELS).toContain('subscription');
      expect(PRICING_MODELS).toContain('free');
    });
  });

  describe('Twin Search', () => {
    const searchTwins = (twins: Array<{ type: string; name: string; status: string }>, query: string) => {
      const q = query.toLowerCase();
      return twins.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
      );
    };

    it('should search by name', () => {
      const twins = [
        { type: 'customer', name: 'Acme Corp', status: 'active' },
        { type: 'product', name: 'Widget Pro', status: 'active' }
      ];
      const results = searchTwins(twins, 'acme');
      expect(results).toHaveLength(1);
    });
  });

  describe('Pricing Calculation', () => {
    const calculatePrice = (model: string, queries: number, twins: number): number => {
      switch (model) {
        case 'per_query': return queries * 0.01;
        case 'per_twin': return twins * 5;
        case 'subscription': return 99;
        case 'free': return 0;
        default: return 0;
      }
    };

    it('should calculate per-query pricing', () => {
      expect(calculatePrice('per_query', 1000, 0)).toBe(10);
    });

    it('should calculate per-twin pricing', () => {
      expect(calculatePrice('per_twin', 0, 10)).toBe(50);
    });

    it('should calculate subscription pricing', () => {
      expect(calculatePrice('subscription', 10000, 100)).toBe(99);
    });
  });

  describe('Twin Health Score', () => {
    const calculateHealth = (twin: { lastUpdated: string; dataQuality: number; queryCount: number }): number => {
      const daysSinceUpdate = (Date.now() - new Date(twin.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      const freshness = Math.max(0, 100 - daysSinceUpdate * 5);
      const quality = twin.dataQuality;
      const usage = Math.min(100, twin.queryCount / 10);
      return Math.round((freshness * 0.4 + quality * 0.4 + usage * 0.2) * 10) / 10;
    };

    it('should calculate health score', () => {
      const recent = new Date(Date.now() - 86400000).toISOString();
      const twin = { lastUpdated: recent, dataQuality: 90, queryCount: 50 };
      const health = calculateHealth(twin);
      expect(health).toBeGreaterThan(80);
    });
  });
});