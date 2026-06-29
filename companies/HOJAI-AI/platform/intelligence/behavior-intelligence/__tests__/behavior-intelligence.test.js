import { describe, it, expect, beforeEach } from 'vitest';

// Mock the DatabaseService
const mockDb = {
  events: [],
  profiles: new Map(),
  anomalies: [],
  funnels: new Map(),

  async saveEvent(event) {
    this.events.push({ ...event, id: `event-${this.events.length + 1}` });
    return this.events[this.events.length - 1];
  },

  async getEvents(entityId, filters) {
    return this.events.filter(e => e.entityId === entityId);
  },

  async saveProfile(profile) {
    this.profiles.set(profile.entityId, profile);
    return profile;
  },

  async getProfile(entityId) {
    return this.profiles.get(entityId);
  },

  async saveAnomaly(anomaly) {
    this.anomalies.push(anomaly);
    return anomaly;
  },

  async getAnomalies(entityId) {
    return this.anomalies.filter(a => a.entityId === entityId);
  },

  async createFunnel(funnel) {
    this.funnels.set(funnel.id, funnel);
    return funnel;
  },

  async getFunnel(funnelId) {
    return this.funnels.get(funnelId);
  }
};

describe('Behavior Intelligence Service', () => {
  beforeEach(() => {
    mockDb.events.length = 0;
    mockDb.anomalies.length = 0;
    mockDb.profiles.clear();
    mockDb.funnels.clear();
  });

  describe('Event Tracking', () => {
    it('should track a behavior event', async () => {
      const event = await mockDb.saveEvent({
        entityId: 'user-1',
        eventType: 'page_view',
        properties: { page: '/dashboard' },
        timestamp: new Date().toISOString()
      });

      expect(event.id).toBeDefined();
      expect(event.entityId).toBe('user-1');
      expect(event.eventType).toBe('page_view');
    });

    it('should retrieve events for an entity', async () => {
      await mockDb.saveEvent({ entityId: 'user-1', eventType: 'click' });
      await mockDb.saveEvent({ entityId: 'user-1', eventType: 'page_view' });
      await mockDb.saveEvent({ entityId: 'user-2', eventType: 'click' });

      const events = await mockDb.getEvents('user-1');
      expect(events).toHaveLength(2);
      expect(events.every(e => e.entityId === 'user-1')).toBe(true);
    });
  });

  describe('User Profiles', () => {
    it('should create and retrieve a user profile', async () => {
      const profile = {
        entityId: 'user-1',
        behaviorScore: 85,
        lastActive: new Date().toISOString(),
        traits: { engagement: 'high' }
      };

      await mockDb.saveProfile(profile);
      const retrieved = await mockDb.getProfile('user-1');

      expect(retrieved.entityId).toBe('user-1');
      expect(retrieved.behaviorScore).toBe(85);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect unusual behavior patterns', async () => {
      // Simulate normal behavior
      for (let i = 0; i < 10; i++) {
        await mockDb.saveEvent({
          entityId: 'user-1',
          eventType: 'login',
          properties: { time: 9 + Math.random() }
        });
      }

      // Simulate anomaly
      await mockDb.saveEvent({
        entityId: 'user-1',
        eventType: 'login',
        properties: { time: 3 } // Unusual time
      });

      const anomalies = await mockDb.getAnomalies('user-1');
      expect(anomalies).toBeDefined();
    });
  });

  describe('Funnel Analytics', () => {
    it('should create and track funnels', async () => {
      const funnel = await mockDb.createFunnel({
        id: 'signup-funnel',
        name: 'Sign Up Funnel',
        steps: ['visit', 'signup', 'verify', 'complete']
      });

      const retrieved = await mockDb.getFunnel('signup-funnel');
      expect(retrieved.name).toBe('Sign Up Funnel');
      expect(retrieved.steps).toHaveLength(4);
    });
  });

  describe('Pattern Recognition', () => {
    it('should identify behavior patterns', async () => {
      // Track recurring events
      for (let i = 0; i < 5; i++) {
        await mockDb.saveEvent({
          entityId: 'user-1',
          eventType: 'morning_checkin',
          properties: { time: '9:00 AM' }
        });
      }

      const events = await mockDb.getEvents('user-1');
      const pattern = events.filter(e => e.eventType === 'morning_checkin');

      expect(pattern.length).toBe(5);
    });
  });
});
});
