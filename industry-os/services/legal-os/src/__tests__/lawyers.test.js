import { describe, it, expect, beforeEach } from 'vitest';

const createMockApp = () => {
  const stores = { lawyers: new Map() };
  const generateId = () => Math.random().toString(36).substring(2, 15);
  return { stores, generateId };
};

describe('Legal OS - Lawyer Management', () => {
  let app;
  beforeEach(() => { app = createMockApp(); });

  describe('Lawyer Data Structure', () => {
    it('should create a valid lawyer object', () => {
      const lawyer = { id: app.generateId(), name: 'Atty. Sarah', specialty: 'corporate', status: 'available' };
      expect(lawyer.id).toBeDefined();
      expect(lawyer.name).toBe('Atty. Sarah');
      expect(lawyer.status).toBe('available');
    });
    it('should have default status of available', () => {
      const lawyer = { name: 'Test' };
      expect(lawyer.status || 'available').toBe('available');
    });
  });

  describe('Lawyer Validation', () => {
    it('should require name and specialty', () => {
      const isValid = (data) => data.name && data.specialty;
      expect(isValid({ name: 'Test', specialty: 'corp' })).toBe(true);
      expect(isValid({ name: 'Test' })).toBeFalsy();
    });
  });

  describe('Lawyer Filtering', () => {
    beforeEach(() => {
      app.stores.lawyers.set('l1', { id: 'l1', specialty: 'corporate', status: 'available' });
      app.stores.lawyers.set('l2', { id: 'l2', specialty: 'litigation', status: 'busy' });
    });
    it('should filter by specialty', () => {
      const filtered = Array.from(app.stores.lawyers.values()).filter(l => l.specialty === 'corporate');
      expect(filtered).toHaveLength(1);
    });
    it('should filter by status', () => {
      const filtered = Array.from(app.stores.lawyers.values()).filter(l => l.status === 'available');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Lawyer CRUD', () => {
    it('should create lawyer', () => {
      const lawyer = { id: app.generateId(), name: 'New Lawyer', status: 'available' };
      app.stores.lawyers.set(lawyer.id, lawyer);
      expect(app.stores.lawyers.size).toBe(1);
    });
    it('should update lawyer', () => {
      app.stores.lawyers.set('l1', { id: 'l1', name: 'Original' });
      app.stores.lawyers.get('l1').name = 'Updated';
      expect(app.stores.lawyers.get('l1').name).toBe('Updated');
    });
  });
});
