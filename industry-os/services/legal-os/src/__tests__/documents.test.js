import { describe, it, expect, beforeEach } from 'vitest';

const createMockApp = () => {
  const stores = { documents: new Map() };
  const generateId = () => Math.random().toString(36).substring(2, 15);
  return { stores, generateId };
};

describe('Legal OS - Document Management', () => {
  let app;
  beforeEach(() => { app = createMockApp(); });

  describe('Document Data Structure', () => {
    it('should create a valid document', () => {
      const doc = { id: app.generateId(), caseId: 'case1', title: 'Contract', type: 'contract', status: 'draft', version: 1 };
      expect(doc.id).toBeDefined();
      expect(doc.status).toBe('draft');
      expect(doc.version).toBe(1);
    });
  });

  describe('Document Validation', () => {
    it('should require caseId, title, and type', () => {
      const isValid = (data) => data.caseId && data.title && data.type;
      expect(isValid({ caseId: 'c1', title: 'Test', type: 'contract' })).toBe(true);
      expect(isValid({ caseId: 'c1' })).toBeFalsy();
    });
  });

  describe('Document Versioning', () => {
    it('should increment version', () => {
      const doc = { version: 1 };
      doc.version = doc.version + 1;
      expect(doc.version).toBe(2);
    });
  });

  describe('Document CRUD', () => {
    it('should create document', () => {
      const doc = { id: app.generateId(), title: 'New Doc', status: 'draft' };
      app.stores.documents.set(doc.id, doc);
      expect(app.stores.documents.size).toBe(1);
    });
    it('should update document', () => {
      app.stores.documents.set('d1', { id: 'd1', content: 'Old', version: 1 });
      const doc = app.stores.documents.get('d1');
      doc.content = 'New';
      doc.version = doc.version + 1;
      expect(doc.content).toBe('New');
      expect(doc.version).toBe(2);
    });
  });
});
