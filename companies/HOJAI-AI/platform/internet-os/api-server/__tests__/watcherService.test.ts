import { describe, it, expect, beforeEach } from 'vitest';
import { WatcherService } from '../src/services/watcherService.js';

describe('WatcherService', () => {
  let service: WatcherService;

  beforeEach(() => {
    service = new WatcherService();
  });

  describe('initialization', () => {
    it('should initialize without error', () => {
      expect(service).toBeDefined();
    });

    it('should be healthy initially', () => {
      expect(service.isHealthy()).toBe(true);
    });
  });

  describe('watcher management', () => {
    it('should have no watchers initially', () => {
      const watchers = service.listWatchers();
      expect(watchers).toHaveLength(0);
    });

    it('should create a watcher', () => {
      const watcher = service.createWatcher({
        id: 'test-watcher',
        name: 'Test Watcher',
        url: 'https://example.com',
        type: 'price',
        interval: 60000,
      });
      expect(watcher.id).toBe('test-watcher');
      expect(watcher.type).toBe('price');
    });

    it('should get a watcher by id', () => {
      service.createWatcher({
        id: 'test-watcher-2',
        name: 'Test',
        url: 'https://example.com',
        type: 'price',
        interval: 60000,
      });
      const watcher = service.getWatcher('test-watcher-2');
      expect(watcher).toBeDefined();
      expect(watcher?.id).toBe('test-watcher-2');
    });

    it('should return undefined for unknown watcher', () => {
      const watcher = service.getWatcher('unknown');
      expect(watcher).toBeUndefined();
    });

    it('should delete a watcher', async () => {
      service.createWatcher({
        id: 'to-delete',
        name: 'Test',
        url: 'https://example.com',
        type: 'price',
        interval: 60000,
      });
      const deleted = await service.deleteWatcher('to-delete');
      expect(deleted).toBe(true);
    });

    it('should return false when deleting unknown watcher', async () => {
      const deleted = await service.deleteWatcher('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('stats', () => {
    it('should return stats object', () => {
      const stats = service.getStats();
      expect(stats).toHaveProperty('totalWatchers');
      expect(stats).toHaveProperty('activeWatchers');
      expect(stats).toHaveProperty('pausedWatchers');
      expect(stats).toHaveProperty('totalChanges');
    });
  });
});