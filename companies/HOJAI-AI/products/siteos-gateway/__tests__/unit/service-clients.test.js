/**
 * Service Clients Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios for all tests
const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxios)
  }
}));

describe('Service Clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MemoryOS Client', () => {
    it('should query memory with visitor ID', async () => {
      const { queryMemory } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({ data: { memories: [] } });

      const result = await queryMemory('visitor-123', 'recent orders');
      expect(mockAxios.get).toHaveBeenCalled();
    });

    it('should store memory with visitor ID and data', async () => {
      const { storeMemory } = await import('../../src/service-clients.js');

      mockAxios.post.mockResolvedValue({ data: { id: 'mem-1' } });

      const result = await storeMemory('visitor-123', {
        type: 'preference',
        content: 'likes electronics'
      });

      expect(mockAxios.post).toHaveBeenCalled();
    });
  });

  describe('TwinOS Clients', () => {
    it('should get customer twin', async () => {
      const { getCustomerTwin } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({
        data: { id: 'cust-123', name: 'John Doe' }
      });

      const result = await getCustomerTwin('cust-123');
      expect(mockAxios.get).toHaveBeenCalledWith('/api/twin/cust-123');
    });

    it('should get order twin', async () => {
      const { getOrderTwin } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({
        data: { id: 'order-456', status: 'shipped' }
      });

      const result = await getOrderTwin('order-456');
      expect(mockAxios.get).toHaveBeenCalledWith('/api/twin/order-456');
    });

    it('should get wallet twin', async () => {
      const { getWalletTwin } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({
        data: { id: 'wallet-789', balance: 1000 }
      });

      const result = await getWalletTwin('wallet-789');
      expect(mockAxios.get).toHaveBeenCalledWith('/api/twin/wallet-789');
    });
  });

  describe('AgentOS Client', () => {
    it('should query agent with question', async () => {
      const { queryAgent } = await import('../../src/service-clients.js');

      mockAxios.post.mockResolvedValue({
        data: { response: 'Here is your answer' }
      });

      const result = await queryAgent('What is my balance?', {});
      expect(mockAxios.post).toHaveBeenCalledWith('/api/agent/execute', {
        prompt: 'What is my balance?',
        context: {},
        maxTokens: 500
      });
    });

    it('should get agent capabilities', async () => {
      const { getAgentCapabilities } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({
        data: { capabilities: [] }
      });

      const result = await getAgentCapabilities();
      expect(mockAxios.get).toHaveBeenCalledWith('/api/capabilities');
    });
  });

  describe('Sales OS Client', () => {
    it('should get lead by ID', async () => {
      const { getLead } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({
        data: { id: 'lead-123', name: 'Jane Smith' }
      });

      const result = await getLead('lead-123');
      expect(mockAxios.get).toHaveBeenCalledWith('/api/sales/lead/lead-123');
    });

    it('should score a lead', async () => {
      const { scoreLead } = await import('../../src/service-clients.js');

      mockAxios.post.mockResolvedValue({
        data: { score: 85, grade: 'A' }
      });

      const result = await scoreLead({
        email: 'jane@example.com',
        company: 'Acme Corp'
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/sales/lead/score', {
        email: 'jane@example.com',
        company: 'Acme Corp'
      });
    });
  });

  describe('Marketing OS Client', () => {
    it('should create campaign', async () => {
      const { createCampaign } = await import('../../src/service-clients.js');

      mockAxios.post.mockResolvedValue({
        data: { id: 'camp-123', name: 'Summer Sale' }
      });

      const result = await createCampaign({
        name: 'Summer Sale',
        budget: 50000
      });

      expect(mockAxios.post).toHaveBeenCalled();
    });

    it('should get segments', async () => {
      const { getSegments } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({
        data: { segments: [] }
      });

      const result = await getSegments();
      expect(mockAxios.get).toHaveBeenCalledWith('/api/marketing/segments');
    });
  });

  describe('Genie Client', () => {
    it('should ask Genie a question', async () => {
      const { askGenie } = await import('../../src/service-clients.js');

      mockAxios.post.mockResolvedValue({
        data: { answer: 'The weather is sunny' }
      });

      const result = await askGenie('What is the weather?', { location: 'NYC' });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/genie/ask', {
        question: 'What is the weather?',
        context: { location: 'NYC' }
      });
    });

    it('should get Genie briefing', async () => {
      const { getGenieBriefing } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({
        data: { briefing: { items: [] } }
      });

      const result = await getGenieBriefing('user-123', { type: 'daily' });
      expect(mockAxios.get).toHaveBeenCalled();
    });
  });

  describe('FlowOS Client', () => {
    it('should execute a flow', async () => {
      const { executeFlow } = await import('../../src/service-clients.js');

      mockAxios.post.mockResolvedValue({
        data: { executionId: 'exec-123', status: 'running' }
      });

      const result = await executeFlow('flow-456', { param1: 'value1' });

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/api/flows/flow-456/execute',
        { param1: 'value1' }
      );
    });

    it('should get flow templates', async () => {
      const { getFlowTemplates } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({
        data: { templates: [] }
      });

      const result = await getFlowTemplates();
      expect(mockAxios.get).toHaveBeenCalledWith('/api/flows/templates');
    });
  });

  describe('Analytics Client', () => {
    it('should get heatmaps', async () => {
      const { getHeatmaps } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({
        data: { heatmaps: [] }
      });

      const result = await getHeatmaps({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(mockAxios.get).toHaveBeenCalled();
    });

    it('should track an event', async () => {
      const { trackEvent } = await import('../../src/service-clients.js');

      mockAxios.post.mockResolvedValue({
        data: { tracked: true }
      });

      const result = await trackEvent({
        event: 'page_view',
        properties: { page: '/home' }
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/api/analytics/track', {
        event: 'page_view',
        properties: { page: '/home' }
      });
    });
  });

  describe('Health Check', () => {
    it('should check service health', async () => {
      const { checkServiceHealth } = await import('../../src/service-clients.js');

      mockAxios.get.mockResolvedValue({ data: { status: 'ok' } });

      const result = await checkServiceHealth('http://localhost:4703');

      expect(result).toEqual({ healthy: true, response: { status: 'ok' } });
    });

    it('should return unhealthy when service is down', async () => {
      const { checkServiceHealth } = await import('../../src/service-clients.js');

      mockAxios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await checkServiceHealth('http://localhost:9999');

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });
});
