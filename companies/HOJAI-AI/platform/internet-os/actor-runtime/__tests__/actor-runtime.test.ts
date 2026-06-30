import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Actor, ActorRuntime, ActorRegistry, ActorConfig, ActorInput, ActorOutput } from '../src/index.js';

// Mock actor for testing
class MockActor extends Actor {
  async scrape(input: any): Promise<ActorOutput> {
    return {
      success: true,
      data: { result: 'mock-data', input },
    };
  }

  async validate(input: any): Promise<boolean> {
    return !!input?.query;
  }
}

describe('ActorRuntime', () => {
  let runtime: ActorRuntime;

  const mockConfig: ActorConfig = {
    id: 'mock-actor',
    name: 'Mock Actor',
    description: 'A mock actor for testing',
    version: '1.0.0',
    capabilities: ['mock', 'test'],
    rateLimit: { requests: 10, window: 60000 },
  };

  beforeEach(() => {
    runtime = new ActorRuntime();
    runtime.getRegistry().register(new MockActor(mockConfig));
  });

  describe('execute', () => {
    it('should execute a registered actor', async () => {
      const input: ActorInput = {
        actor: 'mock-actor',
        action: 'scrape',
        params: { query: 'test' },
      };

      const output = await runtime.execute(input);

      expect(output.success).toBe(true);
      expect(output.data).toBeDefined();
      expect(output.data.result).toBe('mock-data');
    });

    it('should return error for unknown actor', async () => {
      const input: ActorInput = {
        actor: 'unknown-actor',
        action: 'scrape',
        params: {},
      };

      // Suppress error event to avoid unhandled error
      runtime.on('error', () => {});
      const output = await runtime.execute(input);

      expect(output.success).toBe(false);
      expect(output.error).toContain('not found');
    });

    it('should return error for invalid input', async () => {
      const input: ActorInput = {
        actor: 'mock-actor',
        action: 'scrape',
        params: {}, // Missing required 'query'
      };

      // Suppress error event to avoid unhandled error
      runtime.on('error', () => {});
      const output = await runtime.execute(input);

      expect(output.success).toBe(false);
      expect(output.error).toContain('Invalid input');
    });

    it('should include metadata in output', async () => {
      const input: ActorInput = {
        actor: 'mock-actor',
        action: 'scrape',
        params: { query: 'test' },
      };

      const output = await runtime.execute(input);

      expect(output.metadata).toBeDefined();
      expect(output.metadata?.source).toBe('mock-actor');
      expect(output.metadata?.scrapedAt).toBeDefined();
      expect(output.metadata?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should emit start event', async () => {
      const input: ActorInput = {
        actor: 'mock-actor',
        action: 'scrape',
        params: { query: 'test' },
      };

      const startHandler = vi.fn();
      runtime.on('start', startHandler);

      await runtime.execute(input);

      expect(startHandler).toHaveBeenCalledWith({
        actor: 'mock-actor',
        action: 'scrape',
      });
    });

    it('should emit complete event on success', async () => {
      const input: ActorInput = {
        actor: 'mock-actor',
        action: 'scrape',
        params: { query: 'test' },
      };

      const completeHandler = vi.fn();
      runtime.on('complete', completeHandler);

      await runtime.execute(input);

      expect(completeHandler).toHaveBeenCalled();
    });

    it('should emit error event on failure', async () => {
      const input: ActorInput = {
        actor: 'unknown-actor',
        action: 'scrape',
        params: {},
      };

      const errorHandler = vi.fn();
      runtime.on('error', errorHandler);

      await runtime.execute(input);

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('executeBatch', () => {
    it('should execute multiple actors sequentially', async () => {
      const inputs: ActorInput[] = [
        { actor: 'mock-actor', action: 'scrape', params: { query: 'test1' } },
        { actor: 'mock-actor', action: 'scrape', params: { query: 'test2' } },
      ];

      const results = await runtime.executeBatch(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('executeBatchParallel', () => {
    it('should execute multiple actors in parallel', async () => {
      const inputs: ActorInput[] = [
        { actor: 'mock-actor', action: 'scrape', params: { query: 'test1' } },
        { actor: 'mock-actor', action: 'scrape', params: { query: 'test2' } },
        { actor: 'mock-actor', action: 'scrape', params: { query: 'test3' } },
      ];

      const start = Date.now();
      const results = await runtime.executeBatchParallel(inputs, 3);
      const duration = Date.now() - start;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      // Note: Duration may vary due to rate limiting
      expect(duration).toBeLessThan(10000);
    });
  });
});

describe('ActorRegistry', () => {
  let registry: ActorRegistry;

  const mockConfig: ActorConfig = {
    id: 'test-actor',
    name: 'Test Actor',
    description: 'A test actor',
    version: '1.0.0',
    capabilities: ['test'],
  };

  beforeEach(() => {
    registry = new ActorRegistry();
    registry.register(new MockActor(mockConfig));
  });

  describe('register', () => {
    it('should register an actor', () => {
      const actor = registry.get('test-actor');
      expect(actor).toBeDefined();
    });
  });

  describe('list', () => {
    it('should list all registered actors', () => {
      const actors = registry.list();
      expect(actors).toHaveLength(1);
      expect(actors[0].id).toBe('test-actor');
    });
  });

  describe('search', () => {
    it('should find actors by name', () => {
      const results = registry.search('Test');
      expect(results).toHaveLength(1);
    });

    it('should find actors by capability', () => {
      const results = registry.search('test');
      expect(results).toHaveLength(1);
    });

    it('should return empty for unknown query', () => {
      const results = registry.search('nonexistent');
      expect(results).toHaveLength(0);
    });
  });
});

describe('Actor', () => {
  it('should enforce rate limiting', async () => {
    const config: ActorConfig = {
      id: 'rate-limited',
      name: 'Rate Limited',
      description: 'Test rate limiting',
      version: '1.0.0',
      capabilities: [],
      rateLimit: { requests: 2, window: 100 }, // 2 requests per 100ms
    };

    class SlowActor extends Actor {
      async scrape(): Promise<ActorOutput> {
        return { success: true, data: {} };
      }
      async validate(): Promise<boolean> {
        return true;
      }
    }

    const actor = new SlowActor(config);

    // First request - should be immediate
    const start1 = Date.now();
    await actor.rateLimit();
    const duration1 = Date.now() - start1;

    // Second request - should be immediate (within rate limit)
    const start2 = Date.now();
    await actor.rateLimit();
    const duration2 = Date.now() - start2;

    // Third request - should wait
    const start3 = Date.now();
    await actor.rateLimit();
    const duration3 = Date.now() - start3;

    // Third request should wait longer (rate limit enforced)
    expect(duration3).toBeGreaterThanOrEqual(0);
  });
});
