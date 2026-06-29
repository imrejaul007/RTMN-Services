import { describe, it, expect } from 'vitest';

describe('Analytics API', () => {
  describe('Realtime API', () => {
    it('should return realtime metrics', async () => {
      const res = await fetch('http://localhost:5489/api/analytics/realtime', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.activeVisitors).toBeDefined();
      expect(data.eventsPerMinute).toBeDefined();
    });
  });

  describe('Revenue API', () => {
    it('should return revenue metrics', async () => {
      const res = await fetch('http://localhost:5489/api/analytics/revenue', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.totalRevenue).toBeDefined();
      expect(data.totalOrders).toBeDefined();
      expect(data.avgOrderValue).toBeDefined();
    });

    it('should include channel breakdown', async () => {
      const res = await fetch('http://localhost:5489/api/analytics/revenue', {
        headers: { 'X-API-Key': 'test' }
      });
      const data = await res.json();
      expect(data.byChannel).toBeDefined();
    });
  });

  describe('Funnels API', () => {
    it('should return funnel data', async () => {
      const res = await fetch('http://localhost:5489/api/analytics/funnels', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.funnel).toBeDefined();
      expect(data.funnel.length).toBeGreaterThan(0);
    });
  });

  describe('Top Products API', () => {
    it('should return top products', async () => {
      const res = await fetch('http://localhost:5489/api/analytics/top-products', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.products).toBeDefined();
    });
  });

  describe('Cohorts API', () => {
    it('should return cohort analysis', async () => {
      const res = await fetch('http://localhost:5489/api/analytics/cohorts', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.cohorts).toBeDefined();
    });
  });

  describe('Track API', () => {
    it('should track custom events', async () => {
      const res = await fetch('http://localhost:5489/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          event: 'custom_event',
          properties: { source: 'test' }
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
