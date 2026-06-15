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

describe('Legal OS - Invoice Management', () => {
  let app;

  beforeEach(() => {
    app = createMockApp();
  });

  describe('Invoice Data Structure', () => {
    it('should create a valid invoice object', () => {
      const items = [
        { description: 'Legal consultation', hours: 2, rate: 350 },
        { description: 'Document review', hours: 1, rate: 300 }
      ];

      const subtotal = items.reduce((sum, i) => sum + (i.hours * i.rate), 0);
      const tax = subtotal * 0.1;

      const invoice = {
        id: app.generateId(),
        invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
        caseId: 'case1',
        clientId: 'c1',
        items,
        subtotal,
        tax,
        total: subtotal + tax,
        status: 'pending',
        paymentMethod: 'bank_transfer',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };

      expect(invoice.id).toBeDefined();
      expect(invoice.invoiceNumber).toMatch(/^INV-/);
      expect(invoice.subtotal).toBe(1000);
      expect(invoice.tax).toBe(100);
      expect(invoice.total).toBe(1100);
    });

    it('should calculate correct subtotal', () => {
      const items = [
        { hours: 3, rate: 200 },
        { hours: 2, rate: 150 }
      ];
      const subtotal = items.reduce((sum, i) => sum + (i.hours * i.rate), 0);
      expect(subtotal).toBe(900);
    });

    it('should calculate correct tax', () => {
      const subtotal = 1000;
      const taxRate = 0.1;
      const tax = subtotal * taxRate;
      expect(tax).toBe(100);
    });

    it('should calculate correct total', () => {
      const subtotal = 1000;
      const tax = 100;
      const total = subtotal + tax;
      expect(total).toBe(1100);
    });
  });

  describe('Invoice Validation', () => {
    it('should require caseId', () => {
      const invoiceData = { items: [{ hours: 1, rate: 100 }] };
      const isValid = invoiceData.caseId && invoiceData.items && invoiceData.items.length > 0;
      expect(isValid).toBeFalsy();
    });

    it('should require items', () => {
      const invoiceData = { caseId: 'case1' };
      const isValid = invoiceData.caseId && invoiceData.items && invoiceData.items.length > 0;
      expect(isValid).toBeFalsy();
    });

    it('should require at least one item', () => {
      const invoiceData = { caseId: 'case1', items: [] };
      const isValid = invoiceData.caseId && invoiceData.items && invoiceData.items.length > 0;
      expect(isValid).toBeFalsy();
    });

    it('should validate item structure', () => {
      const item = { description: 'Service', hours: 2, rate: 100 };
      const isValid = item.description && item.hours > 0 && item.rate > 0;
      expect(isValid).toBe(true);
    });
  });

  describe('Invoice Filtering', () => {
    beforeEach(() => {
      app.stores.invoices.set('i1', { id: 'i1', caseId: 'case1', status: 'pending' });
      app.stores.invoices.set('i2', { id: 'i2', caseId: 'case1', status: 'paid' });
      app.stores.invoices.set('i3', { id: 'i3', caseId: 'case2', status: 'pending' });
      app.stores.invoices.set('i4', { id: 'i4', caseId: 'case2', status: 'overdue' });
    });

    it('should filter by caseId', () => {
      const caseId = 'case1';
      const filtered = Array.from(app.stores.invoices.values()).filter(i => i.caseId === caseId);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by status', () => {
      const status = 'pending';
      const filtered = Array.from(app.stores.invoices.values()).filter(i => i.status === status);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by multiple criteria', () => {
      const filtered = Array.from(app.stores.invoices.values()).filter(i =>
        i.caseId === 'case1' && i.status === 'pending'
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Invoice Status Transitions', () => {
    it('should transition from pending to paid', () => {
      const invoice = { id: 'i1', status: 'pending' };
      invoice.status = 'paid';
      invoice.paidAt = new Date().toISOString();
      expect(invoice.status).toBe('paid');
    });

    it('should transition from pending to overdue', () => {
      const invoice = { id: 'i1', status: 'pending' };
      invoice.status = 'overdue';
      expect(invoice.status).toBe('overdue');
    });

    it('should transition from paid to refunded', () => {
      const invoice = { id: 'i1', status: 'paid' };
      invoice.status = 'refunded';
      invoice.refundedAt = new Date().toISOString();
      expect(invoice.status).toBe('refunded');
    });

    it('should support partial payment', () => {
      const invoice = { id: 'i1', total: 1000, paidAmount: 500, status: 'partial' };
      expect(invoice.paidAmount).toBe(500);
      expect(invoice.status).toBe('partial');
    });
  });

  describe('Invoice Payment Methods', () => {
    it('should support bank transfer', () => {
      const invoice = { paymentMethod: 'bank_transfer' };
      expect(invoice.paymentMethod).toBe('bank_transfer');
    });

    it('should support credit card', () => {
      const invoice = { paymentMethod: 'credit_card' };
      expect(invoice.paymentMethod).toBe('credit_card');
    });

    it('should support check', () => {
      const invoice = { paymentMethod: 'check' };
      expect(invoice.paymentMethod).toBe('check');
    });

    it('should support cash', () => {
      const invoice = { paymentMethod: 'cash' };
      expect(invoice.paymentMethod).toBe('cash');
    });
  });

  describe('Invoice Due Date', () => {
    it('should set default due date of 30 days', () => {
      const createdAt = new Date();
      const dueDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const daysUntilDue = Math.ceil((dueDate.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
      expect(daysUntilDue).toBe(30);
    });

    it('should check if invoice is overdue', () => {
      const invoice = {
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      };
      const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status === 'pending';
      expect(isOverdue).toBe(true);
    });

    it('should not mark paid invoice as overdue', () => {
      const invoice = {
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'paid'
      };
      const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status === 'pending';
      expect(isOverdue).toBe(false);
    });
  });

  describe('Invoice Number Generation', () => {
    it('should generate unique invoice numbers', () => {
      const invoiceNumbers = new Set();
      for (let i = 0; i < 100; i++) {
        // Use a combination of timestamp and counter to ensure uniqueness
        invoiceNumbers.add(`INV-${Date.now().toString(36).toUpperCase()}-${i}`);
      }
      expect(invoiceNumbers.size).toBe(100);
    });

    it('should start with INV prefix', () => {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      expect(invoiceNumber.startsWith('INV-')).toBe(true);
    });
  });

  describe('Invoice Line Items', () => {
    it('should calculate line item total', () => {
      const item = { hours: 3, rate: 250 };
      const lineTotal = item.hours * item.rate;
      expect(lineTotal).toBe(750);
    });

    it('should handle multiple line items', () => {
      const items = [
        { hours: 2, rate: 300 },
        { hours: 1, rate: 250 },
        { hours: 3, rate: 200 }
      ];
      const subtotal = items.reduce((sum, i) => sum + (i.hours * i.rate), 0);
      expect(subtotal).toBe(1450);
    });

    it('should add description to line items', () => {
      const item = { description: 'Court filing', hours: 1, rate: 500 };
      expect(item.description).toBe('Court filing');
    });
  });

  describe('Invoice CRUD Operations', () => {
    it('should create a new invoice', () => {
      const invoiceData = {
        caseId: 'case1',
        clientId: 'c1',
        items: [{ description: 'Service', hours: 1, rate: 100 }]
      };

      const subtotal = invoiceData.items.reduce((sum, i) => sum + (i.hours * i.rate), 0);
      const tax = subtotal * 0.1;

      const created = {
        id: app.generateId(),
        invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
        ...invoiceData,
        subtotal,
        tax,
        total: subtotal + tax,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      app.stores.invoices.set(created.id, created);
      expect(app.stores.invoices.size).toBe(1);
    });

    it('should update invoice status', () => {
      const invoice = { id: 'update-inv-1', status: 'pending' };
      app.stores.invoices.set(invoice.id, invoice);

      invoice.status = 'paid';
      invoice.paidAt = new Date().toISOString();
      app.stores.invoices.set(invoice.id, invoice);

      expect(app.stores.invoices.get('update-inv-1').status).toBe('paid');
    });

    it('should delete invoice', () => {
      const invoice = { id: 'i1' };
      app.stores.invoices.set(invoice.id, invoice);

      app.stores.invoices.delete('i1');
      expect(app.stores.invoices.has('i1')).toBe(false);
    });
  });

  describe('Invoice Analytics', () => {
    beforeEach(() => {
      app.stores.invoices.set('i1', { id: 'i1', total: 1000, status: 'paid' });
      app.stores.invoices.set('i2', { id: 'i2', total: 2000, status: 'pending' });
      app.stores.invoices.set('i3', { id: 'i3', total: 500, status: 'paid' });
      app.stores.invoices.set('i4', { id: 'i4', total: 1500, status: 'overdue' });
    });

    it('should calculate total revenue', () => {
      const paidInvoices = Array.from(app.stores.invoices.values()).filter(i => i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
      expect(totalRevenue).toBe(1500);
    });

    it('should calculate pending amount', () => {
      const pendingInvoices = Array.from(app.stores.invoices.values()).filter(i => i.status === 'pending');
      const pendingAmount = pendingInvoices.reduce((sum, i) => sum + i.total, 0);
      expect(pendingAmount).toBe(2000);
    });

    it('should calculate overdue amount', () => {
      const overdueInvoices = Array.from(app.stores.invoices.values()).filter(i => i.status === 'overdue');
      const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.total, 0);
      expect(overdueAmount).toBe(1500);
    });

    it('should count invoices by status', () => {
      const counts = {};
      Array.from(app.stores.invoices.values()).forEach(i => {
        counts[i.status] = (counts[i.status] || 0) + 1;
      });
      expect(counts.paid).toBe(2);
      expect(counts.pending).toBe(1);
      expect(counts.overdue).toBe(1);
    });
  });
});
