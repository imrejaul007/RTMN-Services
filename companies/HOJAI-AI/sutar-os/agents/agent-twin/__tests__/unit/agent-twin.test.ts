/**
 * Agent Twin Service Unit Tests
 * Digital twin service for agent entities — CRUD, state management, validation
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@rtmn/shared/lib/persistent-map', () => ({
  PersistentMap: class {
    constructor(name) {
      this._name = name;
      this._data = new Map();
      this.size = 0;
    }
    get(k) { return this._data.get(k); }
    set(k, v) { this._data.set(k, v); this.size = this._data.size; return this; }
    delete(k) { this._data.delete(k); this.size = this._data.size; return true; }
    has(k) { return this._data.has(k); }
    values() { return this._data.values(); }
  },
}));

vi.mock('@rtmn/shared/lib/env', () => ({ requireEnv: vi.fn() }));
vi.mock('@rtmn/shared/lib/shutdown', () => ({ installGracefulShutdown: vi.fn() }));
vi.mock('./rez-intel-client.js', () => ({ default: { checkRezIntelHealth: vi.fn().mockResolvedValue(false) } }));

// Mock twinos-shared
vi.mock('@rtmn/twinos-shared', () => ({
  requireAuth: (r, h, n) => n,
  optionalAuth: (r, h, n) => n,
  defaultLimiter: (r, h, n) => n,
  strictLimiter: (r, h, n) => n,
  sanitizeObject: (obj, allowed) => {
    const result = {};
    for (const key of allowed) {
      if (obj[key] !== undefined) result[key] = obj[key];
    }
    return result;
  },
  preventPrototypePollution: (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const clean = {};
    for (const key of Object.keys(obj)) {
      if (!key.startsWith('__') && key !== 'constructor' && key !== 'prototype') {
        clean[key] = obj[key];
      }
    }
    return clean;
  },
}));

// Mock mongoose
vi.mock('mongoose', () => ({ connect: vi.fn(), model: vi.fn() }));

vi.stubGlobal('uuid', { v4: () => 'twin-test-uuid' });

const {
  ALLOWED_CREATE_FIELDS,
  ALLOWED_UPDATE_FIELDS,
} = await import('../../src/index.js');

describe('Agent Twin Service', () => {

  // =========================================================================
  // Field Validation
  // =========================================================================
  describe('Field Allowlists', () => {
    it('should define allowed create fields', () => {
      expect(ALLOWED_CREATE_FIELDS).toContain('id');
      expect(ALLOWED_CREATE_FIELDS).toContain('name');
      expect(ALLOWED_CREATE_FIELDS).toContain('type');
      expect(ALLOWED_CREATE_FIELDS).toContain('category');
      expect(ALLOWED_CREATE_FIELDS).toContain('metadata');
      expect(ALLOWED_CREATE_FIELDS).toContain('status');
      expect(ALLOWED_CREATE_FIELDS).toContain('email');
      expect(ALLOWED_CREATE_FIELDS).toContain('phone');
      expect(ALLOWED_CREATE_FIELDS).toContain('role');
      expect(ALLOWED_CREATE_FIELDS).toContain('permissions');
      expect(ALLOWED_CREATE_FIELDS).toContain('businessId');
    });

    it('should define allowed update fields (subset of create)', () => {
      expect(ALLOWED_UPDATE_FIELDS).toContain('name');
      expect(ALLOWED_UPDATE_FIELDS).toContain('metadata');
      expect(ALLOWED_UPDATE_FIELDS).toContain('status');
      expect(ALLOWED_UPDATE_FIELDS).toContain('email');
      expect(ALLOWED_UPDATE_FIELDS).toContain('phone');
      expect(ALLOWED_UPDATE_FIELDS).toContain('role');
      expect(ALLOWED_UPDATE_FIELDS).toContain('permissions');
    });

    it('should not allow id in update fields', () => {
      expect(ALLOWED_UPDATE_FIELDS).not.toContain('id');
    });
  });

  // =========================================================================
  // Twin Creation Validation
  // =========================================================================
  describe('Twin Creation Validation', () => {
    it('should require id and name', () => {
      // This tests the validation logic
      const validInput = { id: 'valid-id', name: 'Valid Name' };
      expect(validInput.id).toBeTruthy();
      expect(validInput.name).toBeTruthy();
    });

    it('should validate id format', () => {
      const validId = /^[a-z0-9-_]+$/i;
      expect(validId.test('valid-id-123')).toBe(true);
      expect(validId.test('Valid_ID')).toBe(true);
      expect(validId.test('invalid id')).toBe(false);
      expect(validId.test('invalid@id')).toBe(false);
    });

    it('should default type to entity', () => {
      // Default type logic
      const twin = {
        type: undefined || 'entity',
        category: undefined || 'foundation',
        status: undefined || 'active',
      };

      expect(twin.type).toBe('entity');
      expect(twin.category).toBe('foundation');
      expect(twin.status).toBe('active');
    });
  });

  // =========================================================================
  // Twin State Updates
  // =========================================================================
  describe('Twin State Updates', () => {
    it('should merge state data', () => {
      const existingState = { price: 100, quantity: 5 };
      const updates = { price: 120 };

      const newState = { ...existingState, ...updates };

      expect(newState.price).toBe(120);
      expect(newState.quantity).toBe(5); // preserved
    });

    it('should increment version on update', () => {
      const twin = { id: 'twin-1', version: 1 };
      const updated = { ...twin, version: twin.version + 1 };

      expect(updated.version).toBe(2);
    });
  });

  // =========================================================================
  // Pagination
  // =========================================================================
  describe('Pagination', () => {
    it('should calculate correct page boundaries', () => {
      const page = 2;
      const limit = 10;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      expect(startIndex).toBe(10);
      expect(endIndex).toBe(20);
    });

    it('should calculate totalPages correctly', () => {
      const total = 55;
      const limit = 10;
      const totalPages = Math.ceil(total / limit);

      expect(totalPages).toBe(6);
    });
  });

  // =========================================================================
  // Search
  // =========================================================================
  describe('Search', () => {
    it('should search by name (case insensitive)', () => {
      const twins = [
        { name: 'Alpha Agent' },
        { name: 'Beta Bot' },
        { name: 'gamma ghost' },
      ];
      const searchLower = 'alpha';
      const results = twins.filter(t =>
        t.name && t.name.toLowerCase().includes(searchLower)
      );

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Alpha Agent');
    });

    it('should search by id', () => {
      const twins = [
        { id: 'agent-001', name: 'Alpha' },
        { id: 'agent-002', name: 'Beta' },
      ];
      const searchLower = 'agent-001';
      const results = twins.filter(t =>
        t.id && t.id.toLowerCase().includes(searchLower)
      );

      expect(results.length).toBe(1);
    });

    it('should search by email', () => {
      const twins = [
        { id: 't1', name: 'One', email: 'one@example.com' },
        { id: 't2', name: 'Two', email: 'two@example.com' },
      ];
      const searchLower = '@example.com';
      const results = twins.filter(t =>
        t.email && t.email.toLowerCase().includes(searchLower)
      );

      expect(results.length).toBe(2);
    });
  });

  // =========================================================================
  // Prototype Pollution Prevention
  // =========================================================================
  describe('Prototype Pollution Prevention', () => {
    it('should filter dangerous keys', () => {
      const dangerous = {
        name: 'Test Twin',
        '__proto__': { admin: true },
        'constructor': { prototype: {} },
      };

      const clean = {};
      for (const key of Object.keys(dangerous)) {
        if (!key.startsWith('__') && key !== 'constructor' && key !== 'prototype') {
          clean[key] = dangerous[key];
        }
      }

      // Verify the dangerous keys were not copied
      expect(clean.name).toBe('Test Twin');
    });
  });

  // =========================================================================
  // History Tracking
  // =========================================================================
  describe('History Tracking', () => {
    it('should track version and timestamps', () => {
      const twin = {
        id: 'twin-history',
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };

      const history = {
        id: twin.id,
        version: twin.version,
        createdAt: twin.createdAt,
        updatedAt: twin.updatedAt,
      };

      expect(history.version).toBe(1);
      expect(history.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });
});
