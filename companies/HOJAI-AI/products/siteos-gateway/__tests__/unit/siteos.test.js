/**
 * SiteOS Gateway Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }))
  }
}));

describe('SiteOS Gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should export config with service URLs', async () => {
      const { default: config } = await import('../src/config.js');

      expect(config.PORT).toBe(5450);
      expect(config.MEMORY_OS_URL).toBeDefined();
      expect(config.CUSTOMER_TWIN_URL).toBeDefined();
      expect(config.AGENT_OS_URL).toBeDefined();
    });

    it('should have default timeouts configured', async () => {
      const { default: config } = await import('../src/config.js');

      expect(config.TIMEOUT).toBeDefined();
      expect(config.TIMEOUT.DEFAULT).toBe(30000);
      expect(config.TIMEOUT.MEMORY).toBe(5000);
      expect(config.TIMEOUT.TWIN).toBe(10000);
      expect(config.TIMEOUT.AGENT).toBe(60000);
    });
  });

  describe('Service Clients', () => {
    it('should export all client functions', async () => {
      const clients = await import('../src/service-clients.js');

      // MemoryOS
      expect(clients.queryMemory).toBeDefined();
      expect(clients.storeMemory).toBeDefined();
      expect(clients.getMemoryContext).toBeDefined();

      // TwinOS
      expect(clients.getCustomerTwin).toBeDefined();
      expect(clients.getOrderTwin).toBeDefined();
      expect(clients.getWalletTwin).toBeDefined();

      // AgentOS
      expect(clients.queryAgent).toBeDefined();
      expect(clients.getAgentCapabilities).toBeDefined();

      // Sales OS
      expect(clients.getLead).toBeDefined();
      expect(clients.scoreLead).toBeDefined();

      // Marketing OS
      expect(clients.createCampaign).toBeDefined();
      expect(clients.getSegments).toBeDefined();

      // Customer Success
      expect(clients.getChurnScore).toBeDefined();
      expect(clients.getHealthScore).toBeDefined();

      // CXO
      expect(clients.getCustomer360).toBeDefined();

      // FlowOS
      expect(clients.executeFlow).toBeDefined();
      expect(clients.getFlowTemplates).toBeDefined();

      // Genie
      expect(clients.askGenie).toBeDefined();
      expect(clients.getGenieBriefing).toBeDefined();
      expect(clients.genieSearch).toBeDefined();

      // Voice
      expect(clients.synthesizeSpeech).toBeDefined();
      expect(clients.transcribeAudio).toBeDefined();

      // Analytics
      expect(clients.getHeatmaps).toBeDefined();
      expect(clients.getEvents).toBeDefined();
      expect(clients.trackEvent).toBeDefined();

      // Nexha
      expect(clients.discoverNexhas).toBeDefined();
      expect(clients.getNexhaReputation).toBeDefined();

      // Widget
      expect(clients.sendWidgetMessage).toBeDefined();
      expect(clients.getWidgetIntents).toBeDefined();

      // Utility
      expect(clients.checkServiceHealth).toBeDefined();
    });

    it('should have checkServiceHealth function', async () => {
      const clients = await import('../src/service-clients.js');
      expect(typeof clients.checkServiceHealth).toBe('function');
    });
  });

  describe('Route Handlers', () => {
    it('should export siteos router', async () => {
      const router = await import('../src/routes/siteos.js');
      expect(router.default).toBeDefined();
      expect(typeof router.default).toBe('function');
    });
  });
});

describe('API Response Format', () => {
  it('should follow consistent success format', () => {
    const successResponse = {
      success: true,
      data: { example: 'data' }
    };

    expect(successResponse).toHaveProperty('success', true);
    expect(successResponse).toHaveProperty('data');
  });

  it('should follow consistent error format', () => {
    const errorResponse = {
      success: false,
      error: 'Something went wrong'
    };

    expect(errorResponse).toHaveProperty('success', false);
    expect(errorResponse).toHaveProperty('error');
  });
});

describe('Health Endpoints', () => {
  it('should have health check response structure', () => {
    const healthResponse = {
      status: 'ok',
      service: 'siteos-gateway',
      version: '1.0.0',
      port: 5450,
      timestamp: new Date().toISOString(),
      services: []
    };

    expect(healthResponse).toHaveProperty('status', 'ok');
    expect(healthResponse).toHaveProperty('service');
    expect(healthResponse).toHaveProperty('timestamp');
  });

  it('should have readiness check response structure', () => {
    const readyResponse = {
      ready: true,
      serviceHealth: {}
    };

    expect(readyResponse).toHaveProperty('ready');
    expect(readyResponse).toHaveProperty('serviceHealth');
  });
});
