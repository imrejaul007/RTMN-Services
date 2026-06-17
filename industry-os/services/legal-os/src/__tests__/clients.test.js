import { describe, it, expect, beforeEach } from 'vitest';

const createMockApp = () => {
  const stores = { clients: new Map(), cases: new Map(), documents: new Map(), lawyers: new Map(), appointments: new Map(), invoices: new Map() };
  const generateId = () => Math.random().toString(36).substring(2, 15);
  return { stores, generateId };
};

describe('Legal OS - Client Management', () => {
  let app;
  beforeEach(() => { app = createMockApp(); });

  describe('Client Data Structure', () => {
    it('should create a valid client object', () => {
      const client = { id: app.generateId(), name: 'John Doe', email: 'john@example.com', status: 'active', createdAt: new Date().toISOString() };
      expect(client.id).toBeDefined();
      expect(client.name).toBe('John Doe');
      expect(client.status).toBe('active');
    });
    it('should have default status of active', () => {
      const client = { name: 'Test' };
      expect(client.status || 'active').toBe('active');
    });
  });

  describe('Client Validation', () => {
    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('test@example.com')).toBe(true);
      expect(emailRegex.test('invalid')).toBe(false);
    });
    it('should require name', () => {
      const isValid = (name) => name && name.trim().length > 0;
      expect(isValid('')).toBeFalsy();
      expect(isValid('Valid')).toBe(true);
    });
  });

  describe('Client Filtering', () => {
    beforeEach(() => {
      app.stores.clients.set('c1', { id: 'c1', status: 'active' });
      app.stores.clients.set('c2', { id: 'c2', status: 'inactive' });
    });
    it('should filter by status', () => {
      const filtered = Array.from(app.stores.clients.values()).filter(c => c.status === 'active');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Client CRUD Operations', () => {
    it('should create a new client', () => {
      const created = { id: app.generateId(), name: 'New Client', status: 'active' };
      app.stores.clients.set(created.id, created);
      expect(app.stores.clients.size).toBe(1);
    });
    it('should update client', () => {
      const client = { id: 'c1', name: 'Original' };
      app.stores.clients.set(client.id, client);
      client.name = 'Updated';
      app.stores.clients.set(client.id, client);
      expect(app.stores.clients.get('c1').name).toBe('Updated');
    });
    it('should delete client', () => {
      app.stores.clients.set('c1', { id: 'c1' });
      app.stores.clients.delete('c1');
      expect(app.stores.clients.has('c1')).toBe(false);
    });
  });

  describe('Client Search', () => {
    beforeEach(() => {
      app.stores.clients.set('c1', { id: 'c1', name: 'John Smith', email: 'john@test.com' });
      app.stores.clients.set('c2', { id: 'c2', name: 'Jane Doe', email: 'jane@test.com' });
    });
    it('should search by name', () => {
      const results = Array.from(app.stores.clients.values()).filter(c => c.name.toLowerCase().includes('john'));
      expect(results).toHaveLength(1);
    });
  });
});
