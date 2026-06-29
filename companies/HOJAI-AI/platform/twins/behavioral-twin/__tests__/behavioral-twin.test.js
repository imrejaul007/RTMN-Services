import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Database
const mockDatabase = {
  twins: new Map(),

  async initialize() {
    return true;
  },

  async saveTwin(twin) {
    this.twins.set(twin.id, { ...twin, updatedAt: new Date().toISOString() });
    return twin;
  },

  async getTwin(id) {
    return this.twins.get(id);
  },

  async getTwinByEntityId(entityId) {
    for (const twin of this.twins.values()) {
      if (twin.entityId === entityId) return twin;
    }
    return null;
  },

  async deleteTwin(id) {
    return this.twins.delete(id);
  },

  async listTwins(filters = {}) {
    let twins = Array.from(this.twins.values());
    if (filters.type) {
      twins = twins.filter(t => t.type === filters.type);
    }
    return twins;
  }
};

describe('Behavioral Twin Service', () => {
  beforeEach(() => {
    mockDatabase.twins.clear();
  });

  describe('Twin Management', () => {
    it('should create a behavioral twin', async () => {
      const twin = await mockDatabase.saveTwin({
        id: 'twin-1',
        entityId: 'user-123',
        type: 'employee',
        workStyle: {
          peakHours: ['9-11', '14-16'],
          communicationPreference: 'async',
          collaborationLevel: 'high'
        },
        productivityPatterns: {
          avgTasksPerDay: 8,
          meetingLoad: 'medium',
          focusTimeNeeded: '2 hours'
        }
      });

      expect(twin.id).toBe('twin-1');
      expect(twin.entityId).toBe('user-123');
      expect(twin.workStyle.communicationPreference).toBe('async');
    });

    it('should retrieve a twin by ID', async () => {
      await mockDatabase.saveTwin({
        id: 'twin-1',
        entityId: 'user-123',
        type: 'employee'
      });

      const twin = await mockDatabase.getTwin('twin-1');
      expect(twin).toBeDefined();
      expect(twin.entityId).toBe('user-123');
    });

    it('should retrieve twin by entity ID', async () => {
      await mockDatabase.saveTwin({
        id: 'twin-1',
        entityId: 'user-123',
        type: 'employee'
      });

      const twin = await mockDatabase.getTwinByEntityId('user-123');
      expect(twin.id).toBe('twin-1');
    });

    it('should update behavioral patterns', async () => {
      await mockDatabase.saveTwin({
        id: 'twin-1',
        entityId: 'user-123',
        workStyle: { collaborationLevel: 'low' }
      });

      await mockDatabase.saveTwin({
        id: 'twin-1',
        entityId: 'user-123',
        workStyle: { collaborationLevel: 'high' }
      });

      const twin = await mockDatabase.getTwin('twin-1');
      expect(twin.workStyle.collaborationLevel).toBe('high');
    });
  });

  describe('Pattern Storage', () => {
    it('should store work patterns', async () => {
      const twin = await mockDatabase.saveTwin({
        id: 'twin-1',
        entityId: 'user-123',
        productivityPatterns: {
          tasksCompleted: [
            { date: '2024-01-01', count: 10 },
            { date: '2024-01-02', count: 12 }
          ],
          meetings: [
            { date: '2024-01-01', hours: 2 }
          ]
        }
      });

      expect(twin.productivityPatterns.tasksCompleted).toHaveLength(2);
      expect(twin.productivityPatterns.tasksCompleted[0].count).toBe(10);
    });

    it('should track behavioral changes over time', async () => {
      const twin = await mockDatabase.saveTwin({
        id: 'twin-1',
        entityId: 'user-123',
        behavioralHistory: [
          { date: '2024-01-01', collaborationLevel: 'low' },
          { date: '2024-01-15', collaborationLevel: 'medium' }
        ]
      });

      expect(twin.behavioralHistory).toHaveLength(2);
      expect(twin.behavioralHistory[1].collaborationLevel).toBe('medium');
    });
  });

  describe('Twin Listing', () => {
    it('should list all twins', async () => {
      await mockDatabase.saveTwin({ id: '1', type: 'employee' });
      await mockDatabase.saveTwin({ id: '2', type: 'employee' });
      await mockDatabase.saveTwin({ id: '3', type: 'team' });

      const twins = await mockDatabase.listTwins();
      expect(twins).toHaveLength(3);
    });

    it('should filter twins by type', async () => {
      await mockDatabase.saveTwin({ id: '1', type: 'employee' });
      await mockDatabase.saveTwin({ id: '2', type: 'employee' });
      await mockDatabase.saveTwin({ id: '3', type: 'team' });

      const employees = await mockDatabase.listTwins({ type: 'employee' });
      expect(employees).toHaveLength(2);
    });
  });
});
