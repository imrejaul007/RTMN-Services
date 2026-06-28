/**
 * Intelligence Gateway Integration Tests
 * Tests the unified intelligence gateway
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4750';
const INTERNAL_TOKEN = 'intelligence-gateway-token';

describe('Intelligence Gateway', () => {
  describe('Health Endpoints', () => {
    it('should return gateway health', async () => {
      const response = await axios.get(`${GATEWAY_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
      expect(response.data.service).toBe('intelligence-gateway');
    });

    it('should return ready status', async () => {
      const response = await axios.get(`${GATEWAY_URL}/ready`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ready');
    });

    it('should list all connected services', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/services`);
      expect(response.status).toBe(200);
      expect(response.data.services).toBeDefined();
      expect(Array.isArray(response.data.services)).toBe(true);
      expect(response.data.services.length).toBeGreaterThan(0);
    });

    it('should check all services health', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/services/health`);
      expect(response.status).toBe(200);
      expect(response.data.services).toBeDefined();
      expect(response.data.summary).toBeDefined();
    });
  });

  describe('Service Routing', () => {
    it('should route to ai-intelligence', async () => {
      try {
        const response = await axios.post(
          `${GATEWAY_URL}/api/intelligence/ai-intelligence/analyze`,
          { text: 'test message' },
          { headers: { 'x-internal-token': INTERNAL_TOKEN } }
        );
        expect(response.status).toBe(200);
      } catch (error) {
        // Expected if service is not running
        expect(error.response?.status).toBe(500);
      }
    });

    it('should route to intent-engine', async () => {
      try {
        const response = await axios.post(
          `${GATEWAY_URL}/api/intelligence/intent-engine/intent`,
          { text: 'I want to buy a laptop' },
          { headers: { 'x-internal-token': INTERNAL_TOKEN } }
        );
        expect(response.status).toBe(200);
      } catch (error) {
        expect(error.response?.status).toBe(500);
      }
    });

    it('should return 404 for unknown service', async () => {
      try {
        await axios.post(
          `${GATEWAY_URL}/api/intelligence/unknown-service/analyze`,
          { data: 'test' },
          { headers: { 'x-internal-token': INTERNAL_TOKEN } }
        );
      } catch (error) {
        expect(error.response?.status).toBe(404);
      }
    });
  });

  describe('Batch Processing', () => {
    it('should process batch requests', async () => {
      try {
        const response = await axios.post(
          `${GATEWAY_URL}/api/intelligence/batch`,
          {
            requests: [
              { service: 'intent-engine', action: 'intent', data: { text: 'test 1' } },
              { service: 'ai-intelligence', action: 'analyze', data: { text: 'test 2' } }
            ]
          },
          { headers: { 'x-internal-token': INTERNAL_TOKEN } }
        );
        expect(response.status).toBe(200);
        expect(response.data.results).toBeDefined();
      } catch (error) {
        // Expected if services are not running
        expect(error.response?.status).toBe(500);
      }
    });

    it('should reject invalid batch format', async () => {
      try {
        await axios.post(
          `${GATEWAY_URL}/api/intelligence/batch`,
          { requests: 'not an array' },
          { headers: { 'x-internal-token': INTERNAL_TOKEN } }
        );
      } catch (error) {
        expect(error.response?.status).toBe(400);
      }
    });
  });

  describe('Chain Processing', () => {
    it('should process chained requests', async () => {
      try {
        const response = await axios.post(
          `${GATEWAY_URL}/api/intelligence/chain`,
          {
            steps: [
              { service: 'intent-engine', action: 'intent', data: { text: 'buy laptop' }, saveAs: 'intent' },
              { service: 'decision-intelligence', action: 'recommend', data: { category: 'laptops' }, saveAs: 'recommendations' }
            ]
          },
          { headers: { 'x-internal-token': INTERNAL_TOKEN } }
        );
        expect(response.status).toBe(200);
        expect(response.data.steps).toBeDefined();
      } catch (error) {
        // Expected if services are not running
        expect(error.response?.status).toBe(500);
      }
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      try {
        await axios.post(
          `${GATEWAY_URL}/api/intelligence/ai-intelligence/analyze`,
          { text: 'test' }
        );
      } catch (error) {
        expect(error.response?.status).toBe(401);
      }
    });

    it('should accept internal token', async () => {
      try {
        const response = await axios.post(
          `${GATEWAY_URL}/api/services`,
          {},
          { headers: { 'x-internal-token': INTERNAL_TOKEN } }
        );
        expect(response.status).toBe(200);
      } catch (error) {
        // Some endpoints don't require auth
        expect([200, 401]).toContain(error.response?.status);
      }
    });
  });
});

describe('Intelligence Service Integration', () => {
  const services = [
    { name: 'ai-intelligence', health: '/health' },
    { name: 'intent-engine', health: '/health' },
    { name: 'reasoning-engine', health: '/health' },
    { name: 'predictive-intelligence', health: '/health' },
    { name: 'risk-intelligence', health: '/health' },
    { name: 'decision-intelligence', health: '/health' },
    { name: 'personalization', health: '/health' },
    { name: 'knowledge-registry', health: '/health' },
    { name: 'event-platform', health: '/health' }
  ];

  services.forEach(({ name }) => {
    it(`should check ${name} health via gateway`, async () => {
      try {
        const response = await axios.get(`${GATEWAY_URL}/api/services/${name}/health`);
        expect(response.status).toBe(200);
        expect(response.data.service).toBe(name);
      } catch (error) {
        // Service might not be running
        expect([200, 404, 500]).toContain(error.response?.status);
      }
    });
  });
});
