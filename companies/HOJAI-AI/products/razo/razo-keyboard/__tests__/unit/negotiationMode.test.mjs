/**
 * Negotiation Mode Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import NegotiationMode from '../../src/modes/negotiation.js';

describe('NegotiationMode', () => {
  let negotiationMode;
  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  beforeEach(() => {
    negotiationMode = new NegotiationMode(mockLogger, {
      sutarGateway: 'http://localhost:4140',
      twinOS: 'http://localhost:4705',
      discoveryOS: 'http://localhost:4272',
      maxRounds: 5,
      defaultDiscountPercent: 15
    });
  });

  describe('getUIConfig()', () => {
    it('should return negotiation mode UI config', () => {
      const config = negotiationMode.getUIConfig();

      expect(config.id).toBe('negotiation_mode');
      expect(config.consumer.icon).toBe('💰');
      expect(config.consumer.label).toBe('Best Deal');
      expect(config.advanced.icon).toBe('🤝');
      expect(config.advanced.label).toBe('Negotiation Mode');
    });

    it('should include all categories', () => {
      const config = negotiationMode.getUIConfig();

      expect(config.categories).toHaveLength(6);
      expect(config.categories.map(c => c.id)).toEqual(
        expect.arrayContaining(['retail', 'food', 'transport', 'services', 'rentals', 'other'])
      );
    });

    it('should include all tactics', () => {
      const config = negotiationMode.getUIConfig();

      expect(config.tactics).toHaveLength(6);
    });
  });

  describe('startNegotiation()', () => {
    it('should start a new negotiation', async () => {
      const result = await negotiationMode.startNegotiation({
        userId: 'user-1',
        sellerPrice: 1000,
        item: 'jacket',
        category: 'retail'
      });

      expect(result.success).toBe(true);
      expect(result.negotiationId).toBeDefined();
      expect(result.currentOffer).toBeLessThan(1000);
      expect(result.sellerPrice).toBe(1000);
      expect(result.round).toBe(1);
      expect(result.maxRounds).toBe(5);
    });

    it('should calculate initial offer at discount percent', async () => {
      const result = await negotiationMode.startNegotiation({
        userId: 'user-1',
        sellerPrice: 1000,
        item: 'jacket',
        category: 'retail'
      });

      // 15% discount on 1000 = 850
      expect(result.currentOffer).toBe(850);
    });

    it('should track stats by category', async () => {
      await negotiationMode.startNegotiation({
        userId: 'user-1',
        sellerPrice: 1000,
        item: 'jacket',
        category: 'retail'
      });

      const stats = negotiationMode.getStats();
      expect(stats.byCategory.retail).toBe(1);
      expect(stats.totalNegotiations).toBe(1);
    });
  });

  describe('counterOffer()', () => {
    it('should process counter offer', async () => {
      const start = await negotiationMode.startNegotiation({
        userId: 'user-1',
        sellerPrice: 1000,
        item: 'jacket',
        category: 'retail'
      });

      // Make a counter offer that's not low enough to immediately agree
      // Initial offer is 850 (15% off). Counter with 860 to trigger a seller counter.
      const counter = await negotiationMode.counterOffer({
        negotiationId: start.negotiationId,
        yourOffer: 860,
        message: 'Final offer'
      });

      // Either agreed, countered, or rejected
      expect(['agreed', 'countered', 'rejected']).toContain(counter.status);
    });

    it('should return error for invalid negotiation', async () => {
      const result = await negotiationMode.counterOffer({
        negotiationId: 'invalid-id',
        yourOffer: 800
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Negotiation not found');
    });
  });

  describe('acceptOffer()', () => {
    it('should accept current offer', async () => {
      const start = await negotiationMode.startNegotiation({
        userId: 'user-1',
        sellerPrice: 1000,
        item: 'jacket',
        category: 'retail'
      });

      // Make a counter first to set sellerCounterOffer
      await negotiationMode.counterOffer({
        negotiationId: start.negotiationId,
        yourOffer: 800
      });

      const accept = await negotiationMode.acceptOffer({
        negotiationId: start.negotiationId
      });

      expect(accept.success).toBe(true);
      expect(accept.status).toBe('agreed');
      expect(accept.finalPrice).toBeDefined();
      expect(accept.discountPercent).toBeGreaterThan(0);
    });

    it('should return error for invalid negotiation', async () => {
      const result = negotiationMode.acceptOffer({
        negotiationId: 'invalid-id'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('walkAway()', () => {
    it('should walk away from negotiation', async () => {
      const start = await negotiationMode.startNegotiation({
        userId: 'user-1',
        sellerPrice: 1000,
        item: 'jacket',
        category: 'retail'
      });

      const walk = await negotiationMode.walkAway({
        negotiationId: start.negotiationId
      });

      expect(walk.success).toBe(true);
      expect(walk.status).toBe('walked_away');
      expect(walk.alternatives).toBeDefined();
    });
  });

  describe('getStatus()', () => {
    it('should return negotiation status', async () => {
      const start = await negotiationMode.startNegotiation({
        userId: 'user-1',
        sellerPrice: 1000,
        item: 'jacket',
        category: 'retail'
      });

      const status = negotiationMode.getStatus(start.negotiationId);

      expect(status.success).toBe(true);
      expect(status.negotiation).toBeDefined();
      expect(status.progress).toBeDefined();
    });
  });

  describe('getStats()', () => {
    it('should track negotiation statistics', async () => {
      await negotiationMode.startNegotiation({
        userId: 'user-1',
        sellerPrice: 1000,
        item: 'jacket',
        category: 'retail'
      });

      const stats = negotiationMode.getStats();

      expect(stats.totalNegotiations).toBe(1);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
    });
  });
});
