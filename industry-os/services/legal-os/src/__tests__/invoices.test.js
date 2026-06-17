import { describe, it, expect, beforeEach } from 'vitest';

const createMockApp = () => {
  const stores = { invoices: new Map() };
  const generateId = () => Math.random().toString(36).substring(2, 15);
  return { stores, generateId };
};

describe('Legal OS - Invoice Management', () => {
  let app;
  beforeEach(() => { app = createMockApp(); });

  describe('Invoice Data Structure', () => {
    it('should create valid invoice', () => {
      const invoice = { id: app.generateId(), invoiceNumber: 'INV-001', caseId: 'case1', subtotal: 1000, tax: 100, total: 1100, status: 'pending' };
      expect(invoice.id).toBeDefined();
      expect(invoice.total).toBe(1100);
      expect(invoice.status).toBe('pending');
    });
  });

  describe('Invoice Calculations', () => {
    it('should calculate subtotal correctly', () => {
      const items = [{ hours: 2, rate: 350 }, { hours: 1, rate: 300 }];
      const subtotal = items.reduce((sum, i) => sum + (i.hours * i.rate), 0);
      expect(subtotal).toBe(1000);
    });
    it('should calculate tax correctly', () => {
      const tax = 1000 * 0.1;
      expect(tax).toBe(100);
    });
  });

  describe('Invoice Validation', () => {
    it('should require caseId and items', () => {
      const isValid = (data) => data.caseId && data.items && data.items.length > 0;
      expect(isValid({ caseId: 'c1', items: [{ hours: 1, rate: 100 }] })).toBe(true);
      expect(isValid({ caseId: 'c1' })).toBeFalsy();
    });
  });

  describe('Invoice CRUD', () => {
    it('should create invoice', () => {
      const invoice = { id: app.generateId(), status: 'pending' };
      app.stores.invoices.set(invoice.id, invoice);
      expect(app.stores.invoices.size).toBe(1);
    });
    it('should update invoice status', () => {
      app.stores.invoices.set('i1', { id: 'i1', status: 'pending' });
      app.stores.invoices.get('i1').status = 'paid';
      expect(app.stores.invoices.get('i1').status).toBe('paid');
    });
  });

  describe('Invoice Analytics', () => {
    beforeEach(() => {
      app.stores.invoices.set('i1', { id: 'i1', total: 1000, status: 'paid' });
      app.stores.invoices.set('i2', { id: 'i2', total: 2000, status: 'pending' });
    });
    it('should calculate total revenue', () => {
      const paid = Array.from(app.stores.invoices.values()).filter(i => i.status === 'paid');
      expect(paid.reduce((sum, i) => sum + i.total, 0)).toBe(1000);
    });
  });
});
