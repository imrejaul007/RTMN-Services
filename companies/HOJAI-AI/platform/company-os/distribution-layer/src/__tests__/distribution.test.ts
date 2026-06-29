/**
 * Distribution Layer Tests
 */

import { describe, it, expect } from 'vitest';
import { channelRegistry, distributionOrchestrator } from '../index';

describe('Distribution Layer', () => {
  describe('Channel Registry', () => {
    it('should have default channels registered', () => {
      const channels = channelRegistry.list();
      expect(channels.length).toBeGreaterThan(0);
    });

    it('should include major consumer apps', () => {
      expect(channelRegistry.get('do')).toBeDefined();
      expect(channelRegistry.get('rez')).toBeDefined();
      expect(channelRegistry.get('nuqta')).toBeDefined();
    });

    it('should include B2B platforms', () => {
      expect(channelRegistry.get('indiamart')).toBeDefined();
      expect(channelRegistry.get('tradeindia')).toBeDefined();
    });

    it('should include agentic commerce (Nexha)', () => {
      expect(channelRegistry.get('nexha')).toBeDefined();
      expect(channelRegistry.get('nexha')?.type).toBe('agentic_commerce');
    });

    it('should include Global Nexus', () => {
      expect(channelRegistry.get('global_nexus')).toBeDefined();
      expect(channelRegistry.get('global_nexus')?.type).toBe('global_nexus');
    });

    it('should filter channels by industry', () => {
      const restaurantChannels = channelRegistry.getChannelsForIndustry('restaurant');
      expect(restaurantChannels.length).toBeGreaterThan(0);
      expect(restaurantChannels.some(c => c.id === 'do')).toBe(true);
      expect(restaurantChannels.some(c => c.id === 'rez')).toBe(true);
    });

    it('should filter channels by type', () => {
      const consumerApps = channelRegistry.getChannelsByType('consumer_app');
      expect(consumerApps.length).toBeGreaterThan(0);
      expect(consumerApps.every(c => c.type === 'consumer_app')).toBe(true);
    });

    it('should register custom channel', () => {
      channelRegistry.register({
        id: 'custom_test',
        name: 'Custom Test Channel',
        type: 'direct',
        baseUrl: 'http://test.com',
        capabilities: ['test'],
        industries: ['*'],
        isActive: true,
      });

      expect(channelRegistry.get('custom_test')).toBeDefined();
    });
  });

  describe('Distribution Orchestrator', () => {
    it('should sync a single product', async () => {
      const sync = await distributionOrchestrator.syncProduct({
        companyId: 'company_001',
        channelId: 'do',
        product: {
          productId: 'prod_001',
          name: 'Test Pizza',
          description: 'Delicious pizza',
          price: 299,
          currency: 'INR',
          category: 'food',
          inStock: true,
        },
      });

      expect(sync.status).toBe('synced');
      expect(sync.channelProductId).toBeDefined();
    });

    it('should sync multiple products', async () => {
      const syncs = await distributionOrchestrator.syncAllProducts({
        companyId: 'company_002',
        channelId: 'rez',
        products: [
          { productId: 'p1', name: 'Product 1', description: 'd1', price: 100, currency: 'INR', category: 'c1' },
          { productId: 'p2', name: 'Product 2', description: 'd2', price: 200, currency: 'INR', category: 'c2' },
        ],
      });

      expect(syncs.length).toBe(2);
      expect(syncs.every(s => s.status === 'synced')).toBe(true);
    });

    it('should receive an order', () => {
      const order = distributionOrchestrator.receiveOrder({
        channelId: 'do',
        companyId: 'company_003',
        channelOrderId: 'ch_order_001',
        customer: {
          name: 'John Doe',
          phone: '+919876543210',
        },
        items: [
          { productId: 'p1', quantity: 2, price: 100 },
        ],
        currency: 'INR',
      });

      expect(order.externalOrderId).toBeDefined();
      expect(order.total).toBe(200);
      expect(order.status).toBe('received');
    });

    it('should update order status', () => {
      const order = distributionOrchestrator.receiveOrder({
        channelId: 'do',
        companyId: 'company_004',
        channelOrderId: 'ch_order_002',
        customer: { name: 'Test' },
        items: [{ productId: 'p1', quantity: 1, price: 100 }],
        currency: 'INR',
      });

      const updated = distributionOrchestrator.updateOrderStatus(order.externalOrderId, 'completed');
      expect(updated?.status).toBe('completed');
    });

    it('should setup company on channels for industry', async () => {
      const connected = await distributionOrchestrator.setupForIndustry('company_005', 'restaurant');
      expect(connected.length).toBeGreaterThan(0);
    });

    it('should provide sync status', async () => {
      await distributionOrchestrator.syncProduct({
        companyId: 'company_006',
        channelId: 'do',
        product: { productId: 'p1', name: 'Test', description: 'd', price: 100, currency: 'INR', category: 'c' },
      });

      const status = distributionOrchestrator.getSyncStatus('company_006');
      expect(status.channels).toContain('do');
      expect(status.productsSynced).toBeGreaterThan(0);
    });
  });
});