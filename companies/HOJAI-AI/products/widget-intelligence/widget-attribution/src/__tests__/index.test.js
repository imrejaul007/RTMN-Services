/**
 * Widget Attribution Service Tests
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

describe('Widget Attribution Service', () => {
  let attributionService;
  let app;

  beforeAll(async () => {
    const module = await import('../index.js');
    attributionService = module;
    app = module.app;
  });

  describe('Attribution Models', () => {
    test('should have correct attribution models', () => {
      const models = attributionService.ATTRIBUTION_MODELS;

      expect(models.FIRST_TOUCH).toBe('first_touch');
      expect(models.LAST_TOUCH).toBe('last_touch');
      expect(models.LINEAR).toBe('linear');
      expect(models.TIME_DECAY).toBe('time_decay');
      expect(models.POSITION_BASED).toBe('position_based');
    });

    test('should have correct channels', () => {
      const channels = attributionService.CHANNELS;

      expect(channels.ORGANIC_SEARCH).toBe('organic_search');
      expect(channels.PAID_SEARCH).toBe('paid_search');
      expect(channels.SOCIAL_MEDIA).toBe('social_media');
      expect(channels.EMAIL).toBe('email');
      expect(channels.DIRECT).toBe('direct');
    });
  });

  describe('Touchpoint Management', () => {
    test('should create a touchpoint', () => {
      const touchpoint = attributionService.createTouchpoint({
        visitorId: 'visitor-123',
        channel: 'organic_search',
        source: 'google',
        medium: 'organic',
        campaign: 'brand',
      });

      expect(touchpoint).toBeDefined();
      expect(touchpoint.id).toBeDefined();
      expect(touchpoint.visitorId).toBe('visitor-123');
      expect(touchpoint.channel).toBe('organic_search');
    });

    test('should get touchpoint by ID', () => {
      const created = attributionService.createTouchpoint({
        visitorId: 'visitor-get',
        channel: 'social_media',
      });

      const retrieved = attributionService.getTouchpoint(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
    });

    test('should get visitor touchpoints', () => {
      attributionService.createTouchpoint({
        visitorId: 'visitor-tp',
        channel: 'email',
      });
      attributionService.createTouchpoint({
        visitorId: 'visitor-tp',
        channel: 'paid_search',
      });

      const touchpoints = attributionService.getVisitorTouchpoints('visitor-tp');
      expect(touchpoints.length).toBe(2);
    });

    test('should delete touchpoint', () => {
      const touchpoint = attributionService.createTouchpoint({
        visitorId: 'visitor-delete',
        channel: 'direct',
      });

      const deleted = attributionService.deleteTouchpoint(touchpoint.id);
      expect(deleted).toBe(true);
      expect(attributionService.getTouchpoint(touchpoint.id)).toBeUndefined();
    });
  });

  describe('Conversion Management', () => {
    test('should create a conversion', () => {
      const result = attributionService.createConversion({
        visitorId: 'visitor-conv',
        type: 'purchase',
        value: 99.99,
        orderId: 'order-123',
      });

      expect(result.conversion).toBeDefined();
      expect(result.conversion.visitorId).toBe('visitor-conv');
      expect(result.conversion.value).toBe(99.99);
      expect(result.attribution).toBeDefined();
    });

    test('should get conversion by ID', () => {
      const result = attributionService.createConversion({
        visitorId: 'visitor-get-conv',
        type: 'lead',
        value: 10,
      });

      const retrieved = attributionService.getConversion(result.conversion.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(result.conversion.id);
    });

    test('should get visitor conversions', () => {
      attributionService.createConversion({
        visitorId: 'visitor-convs',
        type: 'signup',
        value: 0,
      });

      const conversions = attributionService.getVisitorConversions('visitor-convs');
      expect(conversions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Journey Management', () => {
    test('should get visitor journey', () => {
      attributionService.createTouchpoint({
        visitorId: 'journey-visitor',
        channel: 'organic_search',
      });
      attributionService.createTouchpoint({
        visitorId: 'journey-visitor',
        channel: 'social_media',
      });

      const journey = attributionService.getVisitorJourney('journey-visitor');
      expect(journey).toBeDefined();
      expect(journey.visitorId).toBe('journey-visitor');
      expect(journey.touchpointCount).toBeGreaterThanOrEqual(2);
      expect(journey.firstTouch).toBeDefined();
      expect(journey.lastTouch).toBeDefined();
    });

    test('should return null for non-existent journey', () => {
      const journey = attributionService.getVisitorJourney('non-existent');
      expect(journey).toBeNull();
    });
  });

  describe('Attribution Models', () => {
    test('should calculate first-touch attribution', () => {
      attributionService.createTouchpoint({
        visitorId: 'ft-visitor',
        channel: 'paid_search',
      });
      attributionService.createTouchpoint({
        visitorId: 'ft-visitor',
        channel: 'social_media',
      });

      const attribution = attributionService.calculateAttribution('ft-visitor', 'first_touch');
      expect(attribution.model).toBe('first_touch');
      expect(attribution.attribution.length).toBe(1);
      expect(attribution.attribution[0].channel).toBe('paid_search');
    });

    test('should calculate last-touch attribution', () => {
      attributionService.createTouchpoint({
        visitorId: 'lt-visitor',
        channel: 'email',
      });
      attributionService.createTouchpoint({
        visitorId: 'lt-visitor',
        channel: 'referral',
      });

      const attribution = attributionService.calculateAttribution('lt-visitor', 'last_touch');
      expect(attribution.model).toBe('last_touch');
      expect(attribution.attribution.length).toBe(1);
      expect(attribution.attribution[0].channel).toBe('referral');
    });

    test('should calculate linear attribution', () => {
      attributionService.createTouchpoint({
        visitorId: 'lin-visitor',
        channel: 'display',
      });
      attributionService.createTouchpoint({
        visitorId: 'lin-visitor',
        channel: 'video',
      });

      const attribution = attributionService.calculateAttribution('lin-visitor', 'linear');
      expect(attribution.model).toBe('linear');
      expect(attribution.attribution.length).toBe(2);
      expect(attribution.attribution[0].percentage).toBe(50);
      expect(attribution.attribution[1].percentage).toBe(50);
    });

    test('should calculate position-based attribution', () => {
      attributionService.createTouchpoint({
        visitorId: 'pb-visitor',
        channel: 'affiliate',
      });
      attributionService.createTouchpoint({
        visitorId: 'pb-visitor',
        channel: 'email',
      });
      attributionService.createTouchpoint({
        visitorId: 'pb-visitor',
        channel: 'direct',
      });

      const attribution = attributionService.calculateAttribution('pb-visitor', 'position_based');
      expect(attribution.model).toBe('position_based');
      expect(attribution.attribution.length).toBe(3);
      // First and last should have 40% each
      expect(attribution.attribution[0].percentage).toBe(40);
      expect(attribution.attribution[2].percentage).toBe(40);
    });
  });

  describe('Reports', () => {
    test('should generate report', () => {
      attributionService.createTouchpoint({
        visitorId: 'report-visitor',
        channel: 'organic_search',
      });
      attributionService.createConversion({
        visitorId: 'report-visitor',
        value: 100,
      });

      const report = attributionService.generateReport({ model: 'linear' });
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.model).toBe('linear');
      expect(report.summary).toBeDefined();
      expect(report.channelBreakdown).toBeDefined();
    });

    test('should get report by ID', () => {
      const report = attributionService.generateReport({ model: 'first_touch' });
      const retrieved = attributionService.getReport(report.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(report.id);
    });

    test('should compare models', () => {
      attributionService.createTouchpoint({
        visitorId: 'compare-visitor',
        channel: 'social_media',
      });
      attributionService.createTouchpoint({
        visitorId: 'compare-visitor',
        channel: 'paid_search',
      });

      const comparison = attributionService.compareModels('compare-visitor');
      expect(comparison.models).toBeDefined();
      expect(comparison.models.first_touch).toBeDefined();
      expect(comparison.models.last_touch).toBeDefined();
      expect(comparison.models.linear).toBeDefined();
    });
  });

  describe('HTTP Endpoints', () => {
    const request = require('supertest');

    test('GET /health should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('widget-attribution');
    });

    test('GET /ready should return ready status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });

    test('POST /api/attribution/track should track touchpoint', async () => {
      const response = await request(app)
        .post('/api/attribution/track')
        .send({
          visitorId: 'http-track-visitor',
          channel: 'organic_search',
          source: 'google',
          medium: 'organic',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.touchpoint).toBeDefined();
    });

    test('POST /api/attribution/conversion should track conversion', async () => {
      const response = await request(app)
        .post('/api/attribution/conversion')
        .send({
          visitorId: 'http-conv-visitor',
          type: 'purchase',
          value: 149.99,
          orderId: 'http-order-123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.conversion).toBeDefined();
    });

    test('GET /api/attribution/journey/:visitorId should get journey', async () => {
      // Create touchpoints first
      await request(app)
        .post('/api/attribution/track')
        .send({ visitorId: 'journey-http-visitor', channel: 'email' });
      await request(app)
        .post('/api/attribution/track')
        .send({ visitorId: 'journey-http-visitor', channel: 'direct' });

      const response = await request(app)
        .get('/api/attribution/journey/journey-http-visitor')
        .query({ model: 'linear' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.journey).toBeDefined();
      expect(response.body.attribution).toBeDefined();
    });

    test('POST /api/attribution/calculate should calculate attribution', async () => {
      await request(app)
        .post('/api/attribution/track')
        .send({ visitorId: 'calc-visitor', channel: 'social_media' });

      const response = await request(app)
        .post('/api/attribution/calculate')
        .send({ visitorId: 'calc-visitor', model: 'linear' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.attribution).toBeDefined();
    });

    test('GET /api/attribution/report should generate report', async () => {
      const response = await request(app)
        .get('/api/attribution/report')
        .query({ model: 'time_decay' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.model).toBe('time_decay');
    });

    test('GET /api/attribution/models should return models', async () => {
      const response = await request(app).get('/api/attribution/models');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.models)).toBe(true);
    });

    test('GET /api/attribution/channels should return channels', async () => {
      const response = await request(app).get('/api/attribution/channels');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.channels)).toBe(true);
    });

    test('404 for unknown routes', async () => {
      const response = await request(app).get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });
  });
});
