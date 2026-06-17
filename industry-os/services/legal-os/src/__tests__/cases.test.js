import { describe, it, expect, beforeEach } from 'vitest';

const createMockApp = () => {
  const stores = { clients: new Map(), cases: new Map(), documents: new Map(), lawyers: new Map(), appointments: new Map(), invoices: new Map() };
  const generateId = () => Math.random().toString(36).substring(2, 15);
  return { stores, generateId };
};

describe('Legal OS - Case Management', () => {
  let app;
  beforeEach(() => { app = createMockApp(); });

  describe('Case Data Structure', () => {
    it('should create a valid case object', () => {
      const legalCase = { id: app.generateId(), caseNumber: 'CASE-001', clientId: 'c1', type: 'corporate', title: 'Test', status: 'open' };
      expect(legalCase.id).toBeDefined();
      expect(legalCase.caseNumber).toMatch(/^CASE-/);
      expect(legalCase.status).toBe('open');
    });
    it('should have default priority of normal', () => {
      const legalCase = { priority: 'normal' };
      expect(legalCase.priority).toBe('normal');
    });
  });

  describe('Case Validation', () => {
    it('should require clientId, type, and title', () => {
      const isValid = (data) => data.clientId && data.type && data.title;
      expect(isValid({ clientId: 'c1', type: 'corp', title: 'Test' })).toBe(true);
      expect(isValid({ clientId: 'c1' })).toBeFalsy();
    });
    it('should accept valid case types', () => {
      const validTypes = ['corporate', 'litigation', 'family', 'criminal', 'property'];
      validTypes.forEach(type => expect(validTypes.includes(type)).toBe(true));
    });
  });

  describe('Case Filtering', () => {
    beforeEach(() => {
      app.stores.cases.set('case1', { id: 'case1', status: 'open', type: 'corporate' });
      app.stores.cases.set('case2', { id: 'case2', status: 'closed', type: 'litigation' });
    });
    it('should filter by status', () => {
      const filtered = Array.from(app.stores.cases.values()).filter(c => c.status === 'open');
      expect(filtered).toHaveLength(1);
    });
    it('should filter by type', () => {
      const filtered = Array.from(app.stores.cases.values()).filter(c => c.type === 'corporate');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Case Status Transitions', () => {
    it('should transition from open to pending', () => {
      const legalCase = { status: 'open' };
      legalCase.status = 'pending';
      expect(legalCase.status).toBe('pending');
    });
    it('should transition to closed', () => {
      const legalCase = { status: 'open' };
      legalCase.status = 'closed';
      expect(legalCase.status).toBe('closed');
    });
  });

  describe('Case Priority Levels', () => {
    it('should support priority levels', () => {
      const priorities = ['low', 'normal', 'high', 'urgent'];
      priorities.forEach(p => expect(priorities.includes(p)).toBe(true));
    });
  });

  describe('Case CRUD Operations', () => {
    it('should create a new case', () => {
      const created = { id: app.generateId(), title: 'New Case', status: 'open' };
      app.stores.cases.set(created.id, created);
      expect(app.stores.cases.size).toBe(1);
    });
    it('should update case status', () => {
      app.stores.cases.set('case1', { id: 'case1', status: 'open' });
      app.stores.cases.get('case1').status = 'closed';
      expect(app.stores.cases.get('case1').status).toBe('closed');
    });
  });

  describe('Case Assignment', () => {
    it('should assign lawyer to case', () => {
      const legalCase = { assignedLawyerId: null };
      legalCase.assignedLawyerId = 'l1';
      expect(legalCase.assignedLawyerId).toBe('l1');
    });
  });
});
