/**
 * Finance Department Pack Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { tenantStore, invoiceService, paymentService, expenseService } from '../services/store';

describe('Finance Department Pack', () => {
  const tenantId = 'test_company_001';

  beforeEach(() => {
    // Clear tenant data before each test
    tenantStore.deleteTenant(tenantId);
  });

  describe('Invoice Service', () => {
    it('should create an invoice', () => {
      const invoice = invoiceService.create(tenantId, {
        customerId: 'cust_001',
        customerName: 'Test Customer',
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 100 },
          { description: 'Item 2', quantity: 1, unitPrice: 50 },
        ],
        dueDate: '2026-07-15',
      });

      expect(invoice.id).toBeDefined();
      expect(invoice.tenantId).toBe(tenantId);
      expect(invoice.customerName).toBe('Test Customer');
      expect(invoice.subtotal).toBe(250);
      expect(invoice.status).toBe('draft');
    });

    it('should calculate GST correctly', () => {
      const invoice = invoiceService.create(tenantId, {
        customerId: 'cust_001',
        customerName: 'Test Customer',
        items: [
          { description: 'Item', quantity: 1, unitPrice: 100, taxRate: 18 },
        ],
        dueDate: '2026-07-15',
      });

      expect(invoice.subtotal).toBe(100);
      expect(invoice.tax).toBe(18);
      expect(invoice.total).toBe(118);
    });

    it('should list tenant invoices only', () => {
      invoiceService.create(tenantId, {
        customerId: 'cust_001',
        customerName: 'Customer 1',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
        dueDate: '2026-07-15',
      });

      // Create for different tenant
      invoiceService.create('other_tenant', {
        customerId: 'cust_002',
        customerName: 'Customer 2',
        items: [{ description: 'Item', quantity: 1, unitPrice: 200 }],
        dueDate: '2026-07-15',
      });

      const invoices = invoiceService.list(tenantId);
      expect(invoices.length).toBe(1);
      expect(invoices[0].customerName).toBe('Customer 1');
    });

    it('should update invoice status', () => {
      const invoice = invoiceService.create(tenantId, {
        customerId: 'cust_001',
        customerName: 'Test Customer',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
        dueDate: '2026-07-15',
      });

      const updated = invoiceService.updateStatus(tenantId, invoice.id, 'paid');
      expect(updated?.status).toBe('paid');
      expect(updated?.paidDate).toBeDefined();
    });
  });

  describe('Payment Service', () => {
    it('should create a payment', () => {
      const invoice = invoiceService.create(tenantId, {
        customerId: 'cust_001',
        customerName: 'Test Customer',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
        dueDate: '2026-07-15',
      });

      const payment = paymentService.create(tenantId, {
        invoiceId: invoice.id,
        amount: 118,
        method: 'upi',
        reference: 'UPI123',
      });

      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(118);
      expect(payment.status).toBe('completed');
    });

    it('should auto-mark invoice as paid', () => {
      const invoice = invoiceService.create(tenantId, {
        customerId: 'cust_001',
        customerName: 'Test Customer',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
        dueDate: '2026-07-15',
      });

      paymentService.create(tenantId, {
        invoiceId: invoice.id,
        amount: 118,
        method: 'bank_transfer',
      });

      const updatedInvoice = invoiceService.get(tenantId, invoice.id);
      expect(updatedInvoice?.status).toBe('paid');
    });
  });

  describe('Expense Service', () => {
    it('should create an expense', () => {
      const expense = expenseService.create(tenantId, {
        category: 'travel',
        description: 'Flight tickets',
        amount: 5000,
        date: '2026-06-15',
        vendor: 'Air India',
      });

      expect(expense.id).toBeDefined();
      expect(expense.status).toBe('pending');
      expect(expense.amount).toBe(5000);
    });

    it('should approve expense', () => {
      const expense = expenseService.create(tenantId, {
        category: 'supplies',
        description: 'Office supplies',
        amount: 1000,
        date: '2026-06-15',
      });

      const approved = expenseService.approve(tenantId, expense.id, 'manager_001');
      expect(approved?.status).toBe('approved');
      expect(approved?.approvedBy).toBe('manager_001');
    });
  });

  describe('Tenant Isolation', () => {
    it('should isolate data between tenants', () => {
      invoiceService.create('tenant_a', {
        customerId: 'cust_a',
        customerName: 'Customer A',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
        dueDate: '2026-07-15',
      });

      invoiceService.create('tenant_b', {
        customerId: 'cust_b',
        customerName: 'Customer B',
        items: [{ description: 'Item', quantity: 1, unitPrice: 200 }],
        dueDate: '2026-07-15',
      });

      const tenantAInvoices = invoiceService.list('tenant_a');
      const tenantBInvoices = invoiceService.list('tenant_b');

      expect(tenantAInvoices.length).toBe(1);
      expect(tenantAInvoices[0].customerName).toBe('Customer A');
      expect(tenantBInvoices.length).toBe(1);
      expect(tenantBInvoices[0].customerName).toBe('Customer B');
    });
  });
});