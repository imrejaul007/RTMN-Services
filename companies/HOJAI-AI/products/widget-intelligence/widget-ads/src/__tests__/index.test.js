/**
 * Widget Ads Service Tests
 */

import { jest } from '@jest/globals';

// Mock pino before importing the module
jest.unstable_mockModule('pino', () => ({
  default: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Widget Ads Service', () => {
  let adsService;
  let app;

  beforeAll(async () => {
    const module = await import('../index.js');
    adsService = module;
    app = module.app;
  });

  describe('Pixel Configuration', () => {
    test('should create a pixel configuration', () => {
      const config = adsService.createPixelConfig({
        pixelId: 'test-pixel-123',
        accessToken: 'test-token',
        enabled: true,
      });

      expect(config).toBeDefined();
      expect(config.id).toBeDefined();
      expect(config.pixelId).toBe('test-pixel-123');
      expect(config.accessToken).toBe('test-token');
      expect(config.enabled).toBe(true);
      expect(config.autoEvents).toBeDefined();
    });

    test('should get pixel configuration', () => {
      const created = adsService.createPixelConfig({
        pixelId: 'get-test-pixel',
        accessToken: 'token',
      });
      const retrieved = adsService.getPixelConfig(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.pixelId).toBe('get-test-pixel');
    });

    test('should get all pixel configurations', () => {
      adsService.createPixelConfig({
        pixelId: 'all-test-1',
        accessToken: 'token1',
      });
      adsService.createPixelConfig({
        pixelId: 'all-test-2',
        accessToken: 'token2',
      });

      const configs = adsService.getAllPixelConfigs();
      expect(configs.length).toBeGreaterThanOrEqual(2);
    });

    test('should update pixel configuration', () => {
      const created = adsService.createPixelConfig({
        pixelId: 'update-test',
        accessToken: 'token',
        enabled: false,
      });

      const updated = adsService.updatePixelConfig(created.id, {
        enabled: true,
        testMode: true,
      });

      expect(updated).toBeDefined();
      expect(updated.enabled).toBe(true);
      expect(updated.testMode).toBe(true);
    });
  });

  describe('Meta Events', () => {
    test('should have standard Meta event names', () => {
      const events = adsService.META_EVENTS;

      expect(events.PAGE_VIEW).toBe('PageView');
      expect(events.VIEW_CONTENT).toBe('ViewContent');
      expect(events.ADD_TO_CART).toBe('AddToCart');
      expect(events.PURCHASE).toBe('Purchase');
      expect(events.LEAD).toBe('Lead');
      expect(events.COMPLETE_REGISTRATION).toBe('CompleteRegistration');
    });
  });

  describe('Event Tracking', () => {
    test('should track an event', async () => {
      const config = adsService.createPixelConfig({
        pixelId: 'track-test',
        accessToken: 'token',
        enabled: false, // Disable CAPI for testing
      });

      const event = await adsService.trackEvent(config.id, {
        eventName: 'PageView',
        sourceUrl: 'https://example.com',
        visitorId: 'visitor-123',
      });

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.eventName).toBe('PageView');
      expect(event.visitorId).toBe('visitor-123');
    });

    test('should get event by ID', () => {
      const config = adsService.createPixelConfig({
        pixelId: 'get-event-test',
        accessToken: 'token',
        enabled: false,
      });

      adsService.trackEvent(config.id, {
        eventName: 'ViewContent',
        visitorId: 'visitor-456',
      }).then(async (event) => {
        const retrieved = adsService.getEvent(event.id);
        expect(retrieved).toBeDefined();
        expect(retrieved.eventName).toBe('ViewContent');
      });
    });

    test('should get visitor events', async () => {
      const config = adsService.createPixelConfig({
        pixelId: 'visitor-events-test',
        accessToken: 'token',
        enabled: false,
      });

      await adsService.trackEvent(config.id, {
        eventName: 'PageView',
        visitorId: 'visitor-events',
      });
      await adsService.trackEvent(config.id, {
        eventName: 'AddToCart',
        visitorId: 'visitor-events',
      });

      const result = adsService.getVisitorEvents('visitor-events');
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.events.length).toBeGreaterThanOrEqual(2);
    });

    test('should get events by type', async () => {
      const config = adsService.createPixelConfig({
        pixelId: 'type-events-test',
        accessToken: 'token',
        enabled: false,
      });

      await adsService.trackEvent(config.id, {
        eventName: 'Purchase',
        visitorId: 'type-test-1',
      });
      await adsService.trackEvent(config.id, {
        eventName: 'Purchase',
        visitorId: 'type-test-2',
      });

      const result = adsService.getEventsByType('Purchase');
      const purchaseEvents = result.events.filter(e => e.eventName === 'Purchase');
      expect(purchaseEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Audience Management', () => {
    test('should create an audience', () => {
      const audience = adsService.createAudience({
        name: 'Test Audience',
        description: 'A test audience',
        type: 'custom',
      });

      expect(audience).toBeDefined();
      expect(audience.id).toBeDefined();
      expect(audience.name).toBe('Test Audience');
      expect(audience.type).toBe('custom');
      expect(audience.size).toBe(0);
    });

    test('should add members to audience', () => {
      const audience = adsService.createAudience({
        name: 'Add Members Test',
      });

      const updated = adsService.addAudienceMembers(audience.id, ['member-1', 'member-2']);

      expect(updated).toBeDefined();
      expect(updated.size).toBe(2);
      expect(updated.memberIds).toContain('member-1');
      expect(updated.memberIds).toContain('member-2');
    });

    test('should remove members from audience', () => {
      const audience = adsService.createAudience({
        name: 'Remove Members Test',
      });

      adsService.addAudienceMembers(audience.id, ['member-1', 'member-2', 'member-3']);
      const updated = adsService.removeAudienceMembers(audience.id, ['member-2']);

      expect(updated).toBeDefined();
      expect(updated.size).toBe(2);
      expect(updated.memberIds).not.toContain('member-2');
    });

    test('should get cart abandoners', async () => {
      const config = adsService.createPixelConfig({
        pixelId: 'abandoners-test',
        accessToken: 'token',
        enabled: false,
      });

      await adsService.trackEvent(config.id, {
        eventName: 'AddToCart',
        visitorId: 'abandoner-1',
      });

      const abandoners = adsService.getCartAbandoners('abandoners-test');
      expect(Array.isArray(abandoners)).toBe(true);
    });

    test('should get recent purchasers', async () => {
      const config = adsService.createPixelConfig({
        pixelId: 'purchasers-test',
        accessToken: 'token',
        enabled: false,
      });

      await adsService.trackEvent(config.id, {
        eventName: 'Purchase',
        visitorId: 'purchaser-1',
        value: 99.99,
      });

      const purchasers = adsService.getRecentPurchasers('purchasers-test');
      expect(Array.isArray(purchasers)).toBe(true);
    });
  });

  describe('ROAS Tracking', () => {
    test('should track a conversion', () => {
      const conversion = adsService.trackConversion({
        visitorId: 'visitor-conv',
        campaignId: 'campaign-123',
        revenue: 150.00,
        orderId: 'order-456',
      });

      expect(conversion).toBeDefined();
      expect(conversion.id).toBeDefined();
      expect(conversion.revenue).toBe(150.00);
      expect(conversion.orderId).toBe('order-456');
    });

    test('should calculate ROAS', () => {
      adsService.trackConversion({
        visitorId: 'roas-test-1',
        campaignId: 'roas-campaign',
        revenue: 200,
      });
      adsService.trackConversion({
        visitorId: 'roas-test-2',
        campaignId: 'roas-campaign',
        revenue: 300,
      });

      const roas = adsService.calculateROAS('roas-campaign', 100);

      expect(roas).toBeDefined();
      expect(roas.campaignId).toBe('roas-campaign');
      expect(roas.totalRevenue).toBe(500);
      expect(roas.conversions).toBeGreaterThanOrEqual(2);
      expect(roas.avgOrderValue).toBeGreaterThan(0);
    });

    test('should get ROAS report', () => {
      const report = adsService.getROASReport();

      expect(report).toBeDefined();
      expect(typeof report.totalRevenue).toBe('number');
      expect(typeof report.totalConversions).toBe('number');
      expect(report.byChannel).toBeDefined();
    });
  });

  describe('HTTP Endpoints', () => {
    const request = require('supertest');

    test('GET /health should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('widget-ads');
    });

    test('GET /ready should return ready status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });

    test('POST /api/ads/pixel should create pixel config', async () => {
      const response = await request(app)
        .post('/api/ads/pixel')
        .send({
          pixelId: 'http-test-pixel',
          accessToken: 'http-test-token',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.pixelId).toBe('http-test-pixel');
    });

    test('GET /api/ads/pixel should return all pixel configs', async () => {
      const response = await request(app).get('/api/ads/pixel');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.configs)).toBe(true);
    });

    test('POST /api/ads/event should track event', async () => {
      const pixelResponse = await request(app)
        .post('/api/ads/pixel')
        .send({
          pixelId: 'event-test-pixel',
          accessToken: 'token',
          enabled: false,
        });

      const configId = pixelResponse.body.config.id;

      const response = await request(app)
        .post('/api/ads/event')
        .send({
          pixelConfigId: configId,
          eventName: 'PageView',
          visitorId: 'http-test-visitor',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.event).toBeDefined();
    });

    test('POST /api/ads/audience should create audience', async () => {
      const response = await request(app)
        .post('/api/ads/audience')
        .send({
          name: 'HTTP Test Audience',
          type: 'custom',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.audience).toBeDefined();
    });

    test('POST /api/ads/conversion should track conversion', async () => {
      const response = await request(app)
        .post('/api/ads/conversion')
        .send({
          visitorId: 'conv-test-visitor',
          revenue: 99.99,
          orderId: 'order-123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.conversion).toBeDefined();
    });

    test('GET /api/ads/roas should return ROAS report', async () => {
      const response = await request(app).get('/api/ads/roas');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
    });

    test('404 for unknown routes', async () => {
      const response = await request(app).get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });
});
