/**
 * Photo Intelligence Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import PhotoIntelligence from '../../src/modes/photoIntelligence.js';

describe('PhotoIntelligence', () => {
  let photoIntelligence;
  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  beforeEach(() => {
    photoIntelligence = new PhotoIntelligence(mockLogger, {
      genieGateway: 'http://localhost:4701',
      twinOS: 'http://localhost:4705',
      memoryOS: 'http://localhost:4703'
    });
  });

  describe('getUIConfig()', () => {
    it('should return photo intelligence UI config', () => {
      const config = photoIntelligence.getUIConfig();

      expect(config.id).toBe('photo_intelligence');
      expect(config.consumer.icon).toBe('📷');
      expect(config.consumer.label).toBe('Photo Helper');
      expect(config.advanced.icon).toBe('🖼️');
      expect(config.advanced.label).toBe('Photo Intelligence');
    });

    it('should include all photo types', () => {
      const config = photoIntelligence.getUIConfig();

      expect(config.photoTypes).toHaveLength(8);
      const typeIds = config.photoTypes.map(t => t.id);
      expect(typeIds).toContain('receipt');
      expect(typeIds).toContain('order');
      expect(typeIds).toContain('menu');
      expect(typeIds).toContain('business_card');
      expect(typeIds).toContain('document');
      expect(typeIds).toContain('product');
      expect(typeIds).toContain('price_tag');
      expect(typeIds).toContain('screenshot');
    });

    it('should include all actions', () => {
      const config = photoIntelligence.getUIConfig();

      expect(config.actions).toHaveLength(6);
    });
  });

  describe('analyze()', () => {
    it('should reject empty image data', async () => {
      const result = await photoIntelligence.analyze({
        imageData: null,
        photoType: 'receipt',
        userId: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No image');
    });

    it('should process receipt photo', async () => {
      // Mock image data (base64)
      const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      const result = await photoIntelligence.analyze({
        imageData: mockImageData,
        photoType: 'receipt',
        userId: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('receipt');
      expect(result.data).toBeDefined();
      expect(result.summary).toContain('Total');
    });

    it('should process order photo', async () => {
      const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      const result = await photoIntelligence.analyze({
        imageData: mockImageData,
        photoType: 'order',
        userId: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('order');
      expect(result.actions).toBeDefined();
    });

    it('should process business card photo', async () => {
      const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      const result = await photoIntelligence.analyze({
        imageData: mockImageData,
        photoType: 'business_card',
        userId: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe('business_card');
      expect(result.data.name).toBeDefined();
    });

    it('should track stats by photo type', async () => {
      const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      await photoIntelligence.analyze({
        imageData: mockImageData,
        photoType: 'receipt',
        userId: 'user-1'
      });

      const stats = photoIntelligence.getStats();
      expect(stats.byType.receipt).toBe(1);
      expect(stats.totalProcessed).toBe(1);
    });

    it('should execute action if provided', async () => {
      const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      const result = await photoIntelligence.analyze({
        imageData: mockImageData,
        photoType: 'receipt',
        action: 'save',
        userId: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.actionResult).toBeDefined();
    });
  });

  describe('getSuggestedActions()', () => {
    it('should suggest expense actions for receipt data', () => {
      const actions = photoIntelligence.getSuggestedActions({
        total: 500,
        amount: 500
      });

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.type === 'expense')).toBe(true);
    });

    it('should suggest list actions for items data', () => {
      const actions = photoIntelligence.getSuggestedActions({
        items: ['item1', 'item2']
      });

      expect(actions.some(a => a.type === 'list')).toBe(true);
    });

    it('should suggest contact actions for contact data', () => {
      const actions = photoIntelligence.getSuggestedActions({
        contact: { name: 'John' }
      });

      expect(actions.some(a => a.type === 'contact')).toBe(true);
    });

    it('should suggest product actions for product data', () => {
      const actions = photoIntelligence.getSuggestedActions({
        product: { name: 'Laptop' }
      });

      expect(actions.some(a => a.type === 'compare')).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('should track photo processing statistics', () => {
      const stats = photoIntelligence.getStats();

      expect(stats.totalProcessed).toBeDefined();
      expect(stats.byType).toBeDefined();
      expect(stats.cacheSize).toBeDefined();
    });
  });
});
