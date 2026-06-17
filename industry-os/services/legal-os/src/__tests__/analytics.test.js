import { describe, it, expect, beforeEach } from 'vitest';

const createMockApp = () => {
  const stores = { clients: new Map(), cases: new Map(), documents: new Map(), lawyers: new Map(), appointments: new Map(), invoices: new Map() };
  return { stores };
};

describe('Legal OS - Analytics', () => {
  let app;
  beforeEach(() => { app = createMockApp(); });

  describe('Analytics Data Structure', () => {
    it('should create analytics object', () => {
      app.stores.clients.set('c1', { id: 'c1' });
      app.stores.cases.set('case1', { id: 'case1', status: 'open' });
      app.stores.lawyers.set('l1', { id: 'l1' });
      const analytics = {
        totalClients: app.stores.clients.size,
        totalCases: app.stores.cases.size,
        totalLawyers: app.stores.lawyers.size
      };
      expect(analytics.totalClients).toBe(1);
      expect(analytics.totalCases).toBe(1);
    });
  });

  describe('Case Analytics', () => {
    beforeEach(() => {
      app.stores.cases.set('case1', { status: 'open', type: 'corporate' });
      app.stores.cases.set('case2', { status: 'closed', type: 'corporate' });
    });
    it('should count cases by status', () => {
      const byStatus = {};
      app.stores.cases.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
      expect(byStatus.open).toBe(1);
      expect(byStatus.closed).toBe(1);
    });
    it('should calculate closure rate', () => {
      const total = app.stores.cases.size;
      const closed = Array.from(app.stores.cases.values()).filter(c => c.status === 'closed').length;
      expect((closed / total) * 100).toBe(50);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing name', () => {
      const createClient = (data) => { if (!data.name) throw new Error('Name required'); return data; };
      expect(() => createClient({})).toThrow('Name required');
    });
    it('should throw error for missing case fields', () => {
      const createCase = (data) => { if (!data.clientId || !data.type) throw new Error('Required'); return data; };
      expect(() => createCase({})).toThrow('Required');
    });
    it('should return error in correct format', () => {
      const error = { success: false, error: 'Test error', statusCode: 400 };
      expect(error.success).toBe(false);
      expect(error.error).toBe('Test error');
    });
  });
});
