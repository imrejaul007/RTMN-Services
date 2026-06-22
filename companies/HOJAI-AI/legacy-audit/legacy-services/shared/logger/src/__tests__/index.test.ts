/**
 * @rez/logger - Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { createLogger, createTimer } from '../index';

// ============================================
// Logger Tests
// ============================================

describe('createLogger', () => {
  it('should create logger with service name', () => {
    const logger = createLogger({ service: 'test-service' });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('should have info method', () => {
    const logger = createLogger({ service: 'test-service' });
    expect(() => logger.info('test')).not.toThrow();
  });

  it('should have warn method', () => {
    const logger = createLogger({ service: 'test-service' });
    expect(() => logger.warn('test')).not.toThrow();
  });

  it('should have error method', () => {
    const logger = createLogger({ service: 'test-service' });
    expect(() => logger.error('test')).not.toThrow();
  });

  it('should have debug method', () => {
    const logger = createLogger({ service: 'test-service' });
    expect(() => logger.debug('test')).not.toThrow();
  });

  it('should accept data object', () => {
    const logger = createLogger({ service: 'test-service' });
    expect(() => logger.info('test', { key: 'value' })).not.toThrow();
  });

  it('should work with different log levels', () => {
    const logger = createLogger({ service: 'test-service', level: 'error' });
    expect(() => logger.info('should not throw')).not.toThrow();
    expect(() => logger.warn('should not throw')).not.toThrow();
    expect(() => logger.error('should not throw')).not.toThrow();
  });

  it('should work in pretty mode', () => {
    const logger = createLogger({ service: 'test-service', pretty: true });
    expect(() => logger.info('test')).not.toThrow();
  });
});

// ============================================
// Child Logger Tests
// ============================================

describe('Child Logger', () => {
  it('should create child logger', () => {
    const logger = createLogger({ service: 'test-service' });
    const child = logger.child({ requestId: 'req-123' });

    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
    expect(typeof child.warn).toBe('function');
    expect(typeof child.error).toBe('function');
  });

  it('should allow child to log', () => {
    const logger = createLogger({ service: 'test-service' });
    const child = logger.child({ requestId: 'req-123' });

    expect(() => child.info('test')).not.toThrow();
  });

  it('should accept data with child', () => {
    const logger = createLogger({ service: 'test-service' });
    const child = logger.child({ requestId: 'req-123' });

    expect(() => child.info('test', { data: 'value' })).not.toThrow();
  });
});

// ============================================
// Timer Tests
// ============================================

describe('createTimer', () => {
  it('should create timer', () => {
    const timer = createTimer();
    expect(timer).toBeDefined();
  });

  it('should measure elapsed time', async () => {
    const timer = createTimer();
    await new Promise(resolve => setTimeout(resolve, 10));
    const elapsed = timer.stop();

    expect(elapsed).toBeGreaterThanOrEqual(10);
    expect(elapsed).toBeLessThan(100);
    expect(typeof elapsed).toBe('number');
  });
});
