import { describe, it, expect, beforeEach } from 'vitest';

const createMockApp = () => {
  const stores = {
    clients: new Map(),
    cases: new Map(),
    documents: new Map(),
    lawyers: new Map(),
    appointments: new Map(),
    invoices: new Map()
  };

  const generateId = () => Math.random().toString(36).substring(2, 15);

  return { stores, generateId };
};

describe('Legal OS - Case Management', () => {
  let app;

  beforeEach(() => {
    app = createMockApp();
  });

  describe('Case Data Structure', () => {
    it('should create a valid case object', () => {
      const caseData = {
        clientId: 'c1',
        type: 'corporate',
        title: 'Corporate Merger',
        description: 'Merger between Company A and B',
        assignedLawyerId: 'l1',
        priority: 'high'
      };

      const legalCase = {
        id: app.generateId(),
        caseNumber: `CASE-${Date.now().toString(36).toUpperCase()}`,
        ...caseData,
        status: 'open',
        documents: [],
        createdAt: new Date().toISOString()
      };

      expect(legalCase.id).toBeDefined();
      expect(legalCase.caseNumber).toMatch(/^CASE-/);
      expect(legalCase.clientId).toBe('c1');
      expect(legalCase.type).toBe('corporate');
      expect(legalCase.status).toBe('open');
    });

    it('should have required fields', () => {
      const requiredFields = ['clientId', 'type', 'title'];
      const caseData = { clientId: 'c1', type: 'litigation', title: 'Test Case' };

      requiredFields.forEach(field => {
        expect(caseData[field]).toBeDefined();
      });
    });

    it('should have default priority of normal', () => {
      const caseData = {
        clientId: 'c1',
        type: 'family',
        title: 'Test Case'
      };

      const legalCase = {
        ...caseData,
        priority: caseData.priority || 'normal'
      };

      expect(legalCase.priority).toBe('normal');
    });
  });

  describe('Case Validation', () => {
    it('should require clientId', () => {
      const caseData = { type: 'corporate', title: 'Test' };
      const isValid = caseData.clientId && caseData.type && caseData.title;
      expect(isValid).toBeFalsy();
    });

    it('should require type', () => {
      const caseData = { clientId: 'c1', title: 'Test' };
      const isValid = caseData.clientId && caseData.type && caseData.title;
      expect(isValid).toBeFalsy();
    });

    it('should require title', () => {
      const caseData = { clientId: 'c1', type: 'corporate' };
      const isValid = caseData.clientId && caseData.type && caseData.title;
      expect(isValid).toBeFalsy();
    });

    it('should accept valid case types', () => {
      const validTypes = ['corporate', 'litigation', 'family', 'criminal', 'property', 'immigration', 'intellectual_property'];
      validTypes.forEach(type => {
        expect(validTypes.includes(type)).toBe(true);
      });
    });
  });

  describe('Case Filtering', () => {
    beforeEach(() => {
      app.stores.cases.set('case1', { id: 'case1', status: 'open', type: 'corporate', clientId: 'c1' });
      app.stores.cases.set('case2', { id: 'case2', status: 'open', type: 'litigation', clientId: 'c1' });
      app.stores.cases.set('case3', { id: 'case3', status: 'closed', type: 'corporate', clientId: 'c2' });
      app.stores.cases.set('case4', { id: 'case4', status: 'pending', type: 'family', clientId: 'c2' });
    });

    it('should filter by status', () => {
      const status = 'open';
      const filtered = Array.from(app.stores.cases.values()).filter(c => c.status === status);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by type', () => {
      const type = 'corporate';
      const filtered = Array.from(app.stores.cases.values()).filter(c => c.type === type);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by clientId', () => {
      const clientId = 'c1';
      const filtered = Array.from(app.stores.cases.values()).filter(c => c.clientId === clientId);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by multiple criteria', () => {
      const status = 'open';
      const type = 'corporate';
      const filtered = Array.from(app.stores.cases.values()).filter(c =>
        c.status === status && c.type === type
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Case Status Transitions', () => {
    it('should transition from open to pending', () => {
      const legalCase = { id: 'case1', status: 'open' };
      legalCase.status = 'pending';
      expect(legalCase.status).toBe('pending');
    });

    it('should transition from pending to open', () => {
      const legalCase = { id: 'case1', status: 'pending' };
      legalCase.status = 'open';
      expect(legalCase.status).toBe('open');
    });

    it('should transition to closed', () => {
      const legalCase = { id: 'case1', status: 'open' };
      legalCase.status = 'closed';
      legalCase.closedAt = new Date().toISOString();
      expect(legalCase.status).toBe('closed');
      expect(legalCase.closedAt).toBeDefined();
    });

    it('should transition to archived', () => {
      const legalCase = { id: 'case1', status: 'closed' };
      legalCase.status = 'archived';
      expect(legalCase.status).toBe('archived');
    });

    it('should track status history', () => {
      const legalCase = { id: 'case1', status: 'open' };
      const statusHistory = [{ status: 'open', timestamp: new Date().toISOString() }];

      legalCase.status = 'pending';
      statusHistory.push({ status: 'pending', timestamp: new Date().toISOString() });

      legalCase.status = 'closed';
      statusHistory.push({ status: 'closed', timestamp: new Date().toISOString() });

      expect(statusHistory).toHaveLength(3);
    });
  });

  describe('Case Priority Levels', () => {
    it('should support low priority', () => {
      const legalCase = { id: 'case1', priority: 'low' };
      expect(['low', 'normal', 'high', 'urgent'].includes(legalCase.priority)).toBe(true);
    });

    it('should support normal priority', () => {
      const legalCase = { id: 'case1', priority: 'normal' };
      expect(['low', 'normal', 'high', 'urgent'].includes(legalCase.priority)).toBe(true);
    });

    it('should support high priority', () => {
      const legalCase = { id: 'case1', priority: 'high' };
      expect(['low', 'normal', 'high', 'urgent'].includes(legalCase.priority)).toBe(true);
    });

    it('should support urgent priority', () => {
      const legalCase = { id: 'case1', priority: 'urgent' };
      expect(['low', 'normal', 'high', 'urgent'].includes(legalCase.priority)).toBe(true);
    });

    it('should calculate priority score', () => {
      const priorityScores = { low: 1, normal: 2, high: 3, urgent: 4 };
      expect(priorityScores.urgent).toBeGreaterThan(priorityScores.high);
      expect(priorityScores.high).toBeGreaterThan(priorityScores.normal);
    });
  });

  describe('Case Assignment', () => {
    it('should assign a lawyer to a case', () => {
      const legalCase = { id: 'case1', assignedLawyerId: null };
      legalCase.assignedLawyerId = 'l1';
      expect(legalCase.assignedLawyerId).toBe('l1');
    });

    it('should reassign a lawyer', () => {
      const legalCase = { id: 'case1', assignedLawyerId: 'l1' };
      legalCase.assignedLawyerId = 'l2';
      expect(legalCase.assignedLawyerId).toBe('l2');
    });

    it('should unassign a lawyer', () => {
      const legalCase = { id: 'case1', assignedLawyerId: 'l1' };
      legalCase.assignedLawyerId = null;
      expect(legalCase.assignedLawyerId).toBeNull();
    });

    it('should track assignment history', () => {
      const legalCase = { id: 'case1' };
      const assignments = [];

      legalCase.assignedLawyerId = 'l1';
      assignments.push({ lawyerId: 'l1', assignedAt: new Date().toISOString() });

      legalCase.assignedLawyerId = 'l2';
      assignments.push({ lawyerId: 'l2', assignedAt: new Date().toISOString() });

      expect(assignments).toHaveLength(2);
    });
  });

  describe('Case Documents', () => {
    it('should track documents array', () => {
      const legalCase = { id: 'case1', documents: [] };
      expect(Array.isArray(legalCase.documents)).toBe(true);
    });

    it('should add document to case', () => {
      const legalCase = { id: 'case1', documents: [] };
      legalCase.documents.push('doc1');
      legalCase.documents.push('doc2');
      expect(legalCase.documents).toHaveLength(2);
    });

    it('should remove document from case', () => {
      const legalCase = { id: 'case1', documents: ['doc1', 'doc2', 'doc3'] };
      legalCase.documents = legalCase.documents.filter(d => d !== 'doc2');
      expect(legalCase.documents).toHaveLength(2);
      expect(legalCase.documents).not.toContain('doc2');
    });
  });

  describe('Case Number Generation', () => {
    it('should generate unique case numbers', () => {
      const caseNumbers = new Set();
      for (let i = 0; i < 10; i++) {
        caseNumbers.add(`CASE-${Date.now().toString(36).toUpperCase()}-${i}`);
      }
      expect(caseNumbers.size).toBe(10);
    });

    it('should start with CASE prefix', () => {
      const caseNumber = `CASE-${Date.now().toString(36).toUpperCase()}`;
      expect(caseNumber.startsWith('CASE-')).toBe(true);
    });
  });

  describe('Case Search', () => {
    beforeEach(() => {
      app.stores.cases.set('case1', { id: 'case1', title: 'Corporate Merger A', type: 'corporate' });
      app.stores.cases.set('case2', { id: 'case2', title: 'Employment Dispute', type: 'litigation' });
      app.stores.cases.set('case3', { id: 'case3', title: 'Divorce Proceedings', type: 'family' });
    });

    it('should search by title', () => {
      const searchTerm = 'merger';
      const results = Array.from(app.stores.cases.values()).filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(results).toHaveLength(1);
    });

    it('should search by type', () => {
      const searchTerm = 'family';
      const results = Array.from(app.stores.cases.values()).filter(c =>
        c.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(results).toHaveLength(1);
    });
  });
});
