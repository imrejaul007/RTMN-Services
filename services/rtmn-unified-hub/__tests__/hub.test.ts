/**
 * RTMN Unified Hub Tests
 */

import { describe, it, expect } from 'vitest';
import { SERVICE_REGISTRY, findServiceByPath } from '../src/services/serviceRegistry.js';

describe('RTMN Unified Hub', () => {
  describe('Service Registry', () => {
    it('should have 25+ registered services', () => {
      expect(SERVICE_REGISTRY.length).toBeGreaterThanOrEqual(25);
    });

    it('should include all 14 Genie services', () => {
      const genieServices = [
        'Decision Intelligence',
        'Learning Loop',
        'Anticipation',
        'Ambient',
        'Constitution',
        'Financial Life',
        'Health Intelligence',
        'Household',
        'Travel',
        'Spiritual',
        'Life Simulation',
        'Focus',
        'Dreams',
        'Legacy',
      ];

      for (const name of genieServices) {
        const found = SERVICE_REGISTRY.find(s => s.name === name);
        expect(found).toBeDefined();
      }
    });

    it('should have unique prefixes', () => {
      const prefixes = SERVICE_REGISTRY.map(s => s.prefix);
      const unique = new Set(prefixes);
      expect(unique.size).toBe(prefixes.length);
    });
  });

  describe('Path Routing', () => {
    it('should find service for /api/genie path', () => {
      const service = findServiceByPath('/api/genie/ask');
      expect(service?.name).toBe('Genie Runtime');
    });

    it('should find service for /api/memory path', () => {
      const service = findServiceByPath('/api/memory/items');
      expect(service?.name).toBe('MemoryOS');
    });

    it('should find specific Genie services', () => {
      const service = findServiceByPath('/api/services/decision/extract');
      expect(service?.name).toBe('Decision Intelligence');
    });

    it('should find TwinOS for /api/twin', () => {
      const service = findServiceByPath('/api/twin/user/123');
      expect(service?.name).toBe('TwinOS');
    });

    it('should return undefined for unknown path', () => {
      const service = findServiceByPath('/unknown/path');
      expect(service).toBeUndefined();
    });
  });
});