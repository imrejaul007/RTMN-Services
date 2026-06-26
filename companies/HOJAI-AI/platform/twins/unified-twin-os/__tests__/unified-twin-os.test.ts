import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock unified twin constants
const TWIN_CATEGORIES = ['human', 'business', 'asset', 'market', 'agent'];
const TWIN_INHERITANCE_LEVELS = ['base', 'extended', 'specialized', 'instance'];

describe('Unified Twin OS', () => {
  describe('Twin Categories', () => {
    it('should have all 5 twin categories', () => {
      expect(TWIN_CATEGORIES).toHaveLength(5);
      expect(TWIN_CATEGORIES).toContain('human');
      expect(TWIN_CATEGORIES).toContain('business');
      expect(TWIN_CATEGORIES).toContain('asset');
      expect(TWIN_CATEGORIES).toContain('market');
      expect(TWIN_CATEGORIES).toContain('agent');
    });
  });

  describe('Inheritance Levels', () => {
    it('should have 4 inheritance levels', () => {
      expect(TWIN_INHERITANCE_LEVELS).toHaveLength(4);
    });

    it('should order inheritance correctly', () => {
      const levels = TWIN_INHERITANCE_LEVELS;
      expect(levels.indexOf('base')).toBeLessThan(levels.indexOf('extended'));
      expect(levels.indexOf('extended')).toBeLessThan(levels.indexOf('specialized'));
      expect(levels.indexOf('specialized')).toBeLessThan(levels.indexOf('instance'));
    });
  });

  describe('Twin Factory', () => {
    const createTwin = (
      category: string,
      name: string,
      inheritanceLevel: string
    ): object => {
      const baseTwin = {
        id: uuidv4(),
        category,
        name,
        inheritanceLevel,
        version: 1,
        createdAt: new Date().toISOString(),
        properties: {},
        relationships: [],
      };

      if (inheritanceLevel === 'base') return baseTwin;

      return {
        ...baseTwin,
        parentId: inheritanceLevel !== 'base' ? 'inheritance-root' : null,
        capabilities: [],
        permissions: [],
      };
    };

    it('should create base twin with minimal properties', () => {
      const twin = createTwin('human', 'John Doe', 'base');
      expect(twin.category).toBe('human');
      expect(twin.inheritanceLevel).toBe('base');
      expect(twin).not.toHaveProperty('parentId');
    });

    it('should create specialized twin with parent reference', () => {
      const twin = createTwin('business', 'Acme Corp', 'specialized');
      expect(twin.category).toBe('business');
      expect(twin.inheritanceLevel).toBe('specialized');
      expect((twin as any).parentId).toBe('inheritance-root');
    });
  });

  describe('Twin Inheritance', () => {
    const inheritProperties = (
      parent: Record<string, any>,
      child: Record<string, any>
    ): Record<string, any> => {
      return {
        ...parent,
        ...child,
        properties: {
          ...(parent.properties || {}),
          ...(child.properties || {}),
        },
        version: (parent.version || 1) + 1,
      };
    };

    it('should inherit parent properties', () => {
      const parent = { name: 'Parent', properties: { attr1: 'value1' }, version: 1 };
      const child = { name: 'Child', properties: { attr2: 'value2' } };
      const inherited = inheritProperties(parent, child);
      expect(inherited.properties.attr1).toBe('value1');
      expect(inherited.properties.attr2).toBe('value2');
    });

    it('should increment version on inheritance', () => {
      const parent = { version: 1 };
      const inherited = inheritProperties(parent, {});
      expect(inherited.version).toBe(2);
    });
  });
});
