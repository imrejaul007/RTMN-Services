/**
 * Circuit Breaker Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerRegistry, type CircuitState } from '../shared-types/src/utils/circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      resetTimeout: 1000,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.isClosed()).toBe(true);
      expect(breaker.isOpen()).toBe(false);
    });

    it('should report correct initial stats', () => {
      const stats = breaker.getStats();
      expect(stats.state).toBe('CLOSED');
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.lastFailure).toBeNull();
    });
  });

  describe('successful executions', () => {
    it('should pass through successful calls', async () => {
      const result = await breaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should count successes in HALF_OPEN state', async () => {
      // Open the breaker
      breaker.execute(() => Promise.reject(new Error('fail')));
      breaker.execute(() => Promise.reject(new Error('fail')));
      breaker.execute(() => Promise.reject(new Error('fail')));

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be in HALF_OPEN now
      expect(breaker.getStats().state).toBe('HALF_OPEN');

      // Two successes should close it
      await breaker.execute(() => Promise.resolve('ok'));
      await breaker.execute(() => Promise.resolve('ok'));

      expect(breaker.isClosed()).toBe(true);
    });
  });

  describe('failure handling', () => {
    it('should open after reaching failure threshold', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {}
      }

      expect(breaker.isOpen()).toBe(true);
    });

    it('should record last failure time', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {}

      expect(breaker.getStats().lastFailure).not.toBeNull();
    });

    it('should throw when circuit is OPEN', async () => {
      breaker.execute(() => Promise.reject(new Error('fail')));
      breaker.execute(() => Promise.reject(new Error('fail')));
      breaker.execute(() => Promise.reject(new Error('fail')));

      await expect(
        breaker.execute(() => Promise.resolve('should fail'))
      ).rejects.toThrow('Circuit breaker is OPEN');
    });
  });

  describe('reset functionality', () => {
    it('should reset all state', async () => {
      breaker.execute(() => Promise.reject(new Error('fail')));
      breaker.execute(() => Promise.reject(new Error('fail')));
      breaker.execute(() => Promise.reject(new Error('fail')));

      breaker.reset();

      expect(breaker.isClosed()).toBe(true);
      expect(breaker.getStats().failures).toBe(0);
      expect(breaker.getStats().lastFailure).toBeNull();
    });

    it('should allow calls after reset', async () => {
      breaker.execute(() => Promise.reject(new Error('fail')));
      breaker.execute(() => Promise.reject(new Error('fail')));
      breaker.execute(() => Promise.reject(new Error('fail')));

      breaker.reset();

      const result = await breaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = CircuitBreakerRegistry.getInstance();
  });

  it('should return same instance', () => {
    const instance1 = CircuitBreakerRegistry.getInstance();
    const instance2 = CircuitBreakerRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should create new breaker if not exists', () => {
    const breaker = registry.get('test-service');
    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it('should return same breaker for same name', () => {
    const breaker1 = registry.get('test-service');
    const breaker2 = registry.get('test-service');
    expect(breaker1).toBe(breaker2);
  });

  it('should return stats for all breakers', () => {
    registry.get('service1');
    registry.get('service2');

    const allStats = registry.getAllStats();
    expect('service1' in allStats).toBe(true);
    expect('service2' in allStats).toBe(true);
  });
});
