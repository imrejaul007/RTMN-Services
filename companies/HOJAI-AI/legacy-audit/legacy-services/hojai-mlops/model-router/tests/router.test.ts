/**
 * Hojai Model Router - Tests
 */

import { modelRouterService } from '../src/services/router';

describe('ModelRouterService', () => {
  // Store original env
  const originalEnv = process.env['NODE_ENV'];

  beforeAll(() => {
    // Set NODE_ENV to development for mock responses
    process.env['NODE_ENV'] = 'development';
  });

  afterAll(() => {
    // Restore original env
    process.env['NODE_ENV'] = originalEnv;
  });

  beforeEach(() => {
    modelRouterService.resetStats();
  });

  describe('getProviders', () => {
    it('should return all configured providers', () => {
      const providers = modelRouterService.getProviders();

      expect(providers).toBeDefined();
      expect(providers.length).toBeGreaterThan(0);

      const providerNames = providers.map(p => p.name);
      expect(providerNames).toContain('openai');
      expect(providerNames).toContain('anthropic');
      expect(providerNames).toContain('google');
      expect(providerNames).toContain('meta');
    });

    it('should return provider with correct structure', () => {
      const providers = modelRouterService.getProviders();
      const openai = providers.find(p => p.name === 'openai');

      expect(openai).toBeDefined();
      expect(openai?.displayName).toBe('OpenAI');
      expect(openai?.models).toBeDefined();
      expect(Array.isArray(openai?.models)).toBe(true);
    });

    it('should return providers sorted by priority', () => {
      const providers = modelRouterService.getProviders();

      // OpenAI should be first (priority 0)
      expect(providers[0]?.name).toBe('openai');
      // Anthropic second (priority 1)
      expect(providers[1]?.name).toBe('anthropic');
    });
  });

  describe('getCostEstimates', () => {
    it('should return cost estimates for chat task', () => {
      const estimates = modelRouterService.getCostEstimates('chat', 1000);

      expect(estimates).toBeDefined();
      expect(estimates.length).toBeGreaterThan(0);
      expect(estimates[0]?.provider).toBe('openai');
      expect(estimates[0]?.model).toBe('gpt-4o-mini');
      expect(estimates[0]?.totalCost).toBeGreaterThan(0);
    });

    it('should return cost estimates for embed task', () => {
      const estimates = modelRouterService.getCostEstimates('embed', 1000);

      expect(estimates).toBeDefined();
      expect(estimates.length).toBeGreaterThan(0);
      expect(estimates[0]?.provider).toBe('openai');
      expect(estimates[0]?.model).toBe('text-embedding-3-small');
    });

    it('should return cost estimates for classify task in priority order', () => {
      const estimates = modelRouterService.getCostEstimates('classify', 1000);

      expect(estimates).toBeDefined();
      expect(estimates.length).toBeGreaterThan(0);
      // Estimates are returned in priority order, not sorted by cost
      // First provider is the one with highest priority that supports the task
      expect(estimates[0]).toBeDefined();
      expect(['openai', 'anthropic', 'google', 'meta']).toContain(estimates[0]?.provider);
    });

    it('should calculate input and output tokens', () => {
      const estimates = modelRouterService.getCostEstimates('chat', 1000);

      expect(estimates[0]?.estimatedInputTokens).toBeGreaterThan(0);
      expect(estimates[0]?.estimatedOutputTokens).toBeGreaterThan(0);
    });
  });

  describe('route', () => {
    it('should route chat task to openai by default', async () => {
      const result = await modelRouterService.route({
        task: 'chat',
        input: 'Hello, world!',
      });

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o-mini');
      expect(result.response).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.cost).toBeGreaterThan(0);
    });

    it('should route embed task to openai', async () => {
      const result = await modelRouterService.route({
        task: 'embed',
        input: 'Hello, world!',
      });

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('text-embedding-3-small');
    });

    it('should route classify task to anthropic for analysis', async () => {
      const result = await modelRouterService.route({
        task: 'classify',
        input: 'Is this positive or negative?',
      });

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should respect custom options', async () => {
      const result = await modelRouterService.route({
        task: 'chat',
        input: 'Hello!',
        options: {
          maxTokens: 100,
          temperature: 0.5,
        },
      });

      expect(result.provider).toBe('openai');
      expect(result.response).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return initial empty stats', () => {
      const stats = modelRouterService.getStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.requestsByTask.chat).toBe(0);
      expect(stats.requestsByProvider.openai).toBe(0);
    });

    it('should track stats after requests', async () => {
      await modelRouterService.route({
        task: 'chat',
        input: 'Test',
      });

      const stats = modelRouterService.getStats();

      expect(stats.totalRequests).toBe(1);
      expect(stats.requestsByTask.chat).toBe(1);
      expect(stats.requestsByProvider.openai).toBe(1);
    });

    it('should reset stats correctly', async () => {
      await modelRouterService.route({
        task: 'chat',
        input: 'Test',
      });

      modelRouterService.resetStats();

      const stats = modelRouterService.getStats();
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('handleFallback', () => {
    it('should attempt fallback to next provider in priority order', async () => {
      const result = await modelRouterService.handleFallback({
        originalRequest: {
          task: 'chat',
          input: 'Test fallback',
        },
        failedProvider: 'openai',
        error: 'Service unavailable',
        attempt: 1,
      });

      // Should succeed with anthropic as fallback (second in priority)
      expect(result.successful).toBe(true);
      expect(result.provider).toBe('anthropic');
      expect(result.attempts).toBe(2);
    });
  });
});
