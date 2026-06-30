import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';

describe('Configuration', () => {
  it('should have a port', () => {
    expect(config.port).toBeDefined();
    expect(typeof config.port).toBe('number');
  });

  it('should have service URLs', () => {
    expect(config.services).toBeDefined();
    expect(config.services.memoryOs).toContain('4703');
    expect(config.services.twinOs).toContain('4705');
    expect(config.services.knowledgeExtraction).toContain('4784');
    expect(config.services.webhookBus).toContain('4110');
    expect(config.services.skillOs).toContain('4743');
  });

  it('should have auth configuration', () => {
    expect(config.auth).toBeDefined();
    expect(config.auth.jwtSecret).toBeDefined();
    expect(config.auth.internalToken).toBeDefined();
  });

  it('should have rate limit configuration', () => {
    expect(config.rateLimit).toBeDefined();
    expect(config.rateLimit.windowMs).toBeDefined();
    expect(config.rateLimit.maxRequests).toBeDefined();
  });
});

describe('Service URLs', () => {
  it('should default to localhost', () => {
    expect(config.services.memoryOs).toBe('http://localhost:4703');
    expect(config.services.twinOs).toBe('http://localhost:4705');
  });
});