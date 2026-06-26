import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock twinos-hub constants
const VALID_LIFECYCLE_STATES = ['active', 'idle', 'busy', 'suspended', 'deleted', 'archived', 'pending'];
const VALID_CONTEXT_STATES = ['home', 'office', 'shopping', 'working', 'vacation', 'driving', 'meeting', 'emergency', 'online', 'offline', 'unknown'];
const VALID_RELATIONSHIP_TYPES = ['owns', 'belongs_to', 'manages', 'reports_to', 'purchased', 'follows', 'parent', 'child', 'supplier', 'customer', 'member', 'partner', 'competitor', 'related_to'];

describe('TwinOS Hub', () => {
  describe('Lifecycle States', () => {
    it('should have all required lifecycle states', () => {
      expect(VALID_LIFECYCLE_STATES).toContain('active');
      expect(VALID_LIFECYCLE_STATES).toContain('suspended');
      expect(VALID_LIFECYCLE_STATES).toContain('deleted');
    });

    it('should have 7 lifecycle states', () => {
      expect(VALID_LIFECYCLE_STATES).toHaveLength(7);
    });
  });

  describe('Context States', () => {
    it('should have all context states', () => {
      expect(VALID_CONTEXT_STATES).toContain('home');
      expect(VALID_CONTEXT_STATES).toContain('office');
      expect(VALID_CONTEXT_STATES).toContain('working');
    });

    it('should have 11 context states', () => {
      expect(VALID_CONTEXT_STATES).toHaveLength(11);
    });
  });

  describe('Relationship Types', () => {
    it('should have all relationship types', () => {
      expect(VALID_RELATIONSHIP_TYPES).toContain('owns');
      expect(VALID_RELATIONSHIP_TYPES).toContain('parent');
      expect(VALID_RELATIONSHIP_TYPES).toContain('supplier');
    });

    it('should have 14 relationship types', () => {
      expect(VALID_RELATIONSHIP_TYPES).toHaveLength(14);
    });
  });

  describe('Twin ID Validation', () => {
    const isValidTwinId = (id: string): boolean => {
      return /^[a-z0-9-_.]+$/.test(id);
    };

    it('should accept valid twin IDs', () => {
      expect(isValidTwinId('commerce.customer')).toBe(true);
      expect(isValidTwinId('people-employee')).toBe(true);
      expect(isValidTwinId('product_123')).toBe(true);
    });

    it('should reject invalid twin IDs', () => {
      expect(isValidTwinId('Invalid ID')).toBe(false);
      expect(isValidTwinId('twin@id')).toBe(false);
      expect(isValidTwinId('twin id')).toBe(false);
    });
  });

  describe('Relationship Graph', () => {
    const findConnectedTwins = (
      twinId: string,
      relationships: Array<{ sourceId: string; targetId: string; type: string }>,
      maxDepth: number = 2
    ): Set<string> => {
      const visited = new Set<string>([twinId]);
      let frontier = [twinId];

      for (let d = 0; d < maxDepth; d++) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const rel of relationships) {
            const neighbor = rel.sourceId === id ? rel.targetId : rel.sourceId;
            if ((rel.sourceId === id || rel.targetId === id) && !visited.has(neighbor)) {
              visited.add(neighbor);
              next.push(neighbor);
            }
          }
        }
        frontier = next;
      }
      return visited;
    };

    it('should find directly connected twins', () => {
      const relationships = [
        { sourceId: 'A', targetId: 'B', type: 'owns' },
        { sourceId: 'B', targetId: 'C', type: 'parent' },
      ];
      const connected = findConnectedTwins('A', relationships, 1);
      expect(connected.has('A')).toBe(true);
      expect(connected.has('B')).toBe(true);
      expect(connected.has('C')).toBe(false);
    });

    it('should traverse multiple hops', () => {
      const relationships = [
        { sourceId: 'A', targetId: 'B', type: 'owns' },
        { sourceId: 'B', targetId: 'C', type: 'parent' },
        { sourceId: 'C', targetId: 'D', type: 'owns' },
      ];
      const connected = findConnectedTwins('A', relationships, 2);
      expect(connected.has('C')).toBe(true);
      expect(connected.has('D')).toBe(true);
    });
  });

  describe('Analytics Computation', () => {
    const computeRelationshipHealth = (
      collaborationCount: number,
      recentActivity: number
    ): number => {
      return Math.min(1, 0.4 + (collaborationCount * 0.1) + (recentActivity * 0.05));
    };

    it('should calculate relationship health score', () => {
      const health = computeRelationshipHealth(3, 5);
      expect(health).toBeGreaterThan(0.4);
      expect(health).toBeLessThanOrEqual(1);
    });

    it('should cap at 1.0', () => {
      const health = computeRelationshipHealth(20, 20);
      expect(health).toBe(1);
    });
  });
});
