import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActorService } from '../src/services/actorService.js';

describe('ActorService', () => {
  let service: ActorService;

  beforeEach(() => {
    service = new ActorService();
    // Suppress error events from the underlying ActorRuntime
    (service as any).runtime.on('error', () => {});
  });

  describe('initialization', () => {
    it('should initialize without error', () => {
      expect(service).toBeDefined();
    });

    it('should be healthy initially', () => {
      expect(service.isHealthy()).toBe(true);
    });
  });

  describe('actor management', () => {
    it('should have no actors initially', () => {
      const actors = service.listActors();
      expect(actors).toHaveLength(0);
    });

    it('should return undefined for unknown actor', () => {
      const actor = service.getActor('unknown-actor');
      expect(actor).toBeUndefined();
    });

    it('should return empty array for unknown search', () => {
      const actors = service.searchActors('nonexistent123');
      expect(actors).toHaveLength(0);
    });
  });

  describe('stats', () => {
    it('should return stats object', () => {
      const stats = service.getStats();
      expect(stats).toHaveProperty('totalRuns');
      expect(stats).toHaveProperty('successfulRuns');
      expect(stats).toHaveProperty('failedRuns');
      expect(stats).toHaveProperty('avgDuration');
      expect(stats).toHaveProperty('successRate');
    });

    it('should start with zero stats', () => {
      const stats = service.getStats();
      expect(stats.totalRuns).toBe(0);
      expect(stats.successfulRuns).toBe(0);
      expect(stats.failedRuns).toBe(0);
    });
  });

  describe('actor execution', () => {
    it('should return error for unknown actor', async () => {
      const result = await service.runActor('unknown', 'test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update stats on failure', async () => {
      await service.runActor('unknown', 'test');
      const stats = service.getStats();
      expect(stats.totalRuns).toBe(1);
      expect(stats.failedRuns).toBe(1);
    });
  });
});