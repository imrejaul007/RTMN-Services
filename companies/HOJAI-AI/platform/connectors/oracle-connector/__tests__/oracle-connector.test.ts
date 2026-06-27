import { describe, it, expect } from 'vitest';

// Oracle Connector Constants
const INVOICE_STATUSES = ['APPROVED', 'PAID', 'CANCELLED'];
const SUPPLIER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
const REQUISITION_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'];

describe('Oracle Connector', () => {
  describe('Invoice Statuses', () => {
    it('should have all invoice statuses', () => {
      expect(INVOICE_STATUSES).toContain('APPROVED');
      expect(INVOICE_STATUSES).toContain('PAID');
      expect(INVOICE_STATUSES).toContain('CANCELLED');
    });
  });

  describe('Supplier Validation', () => {
    const validateSupplier = (supplier: {
      SUPPLIER_NUMBER?: string;
      SUPPLIER_NAME?: string;
      EMAIL?: string;
      SITE?: string;
      STATUS?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!supplier.SUPPLIER_NUMBER) errors.push('SUPPLIER_NUMBER is required');
      if (!supplier.SUPPLIER_NAME) errors.push('SUPPLIER_NAME is required');
      if (supplier.EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier.EMAIL)) {
        errors.push('invalid EMAIL');
      }
      if (supplier.STATUS && !SUPPLIER_STATUSES.includes(supplier.STATUS)) {
        errors.push(`invalid STATUS: ${supplier.STATUS}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct supplier', () => {
      const result = validateSupplier({
        SUPPLIER_NUMBER: 'SUP001',
        SUPPLIER_NAME: 'Acme Supplies',
        EMAIL: 'orders@acme.com',
        SITE: 'HQ',
        STATUS: 'ACTIVE'
      });
      expect(result.valid).toBe(true);
    });

    it('should require SUPPLIER_NUMBER and SUPPLIER_NAME', () => {
      const result = validateSupplier({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SUPPLIER_NUMBER is required');
      expect(result.errors).toContain('SUPPLIER_NAME is required');
    });
  });

  describe('Invoice Validation', () => {
    const validateInvoice = (invoice: {
      INVOICE_NUM?: string;
      SUPPLIER?: string;
      INVOICE_AMOUNT?: number;
      CURRENCY_CODE?: string;
      INVOICE_DATE?: string;
      STATUS?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!invoice.INVOICE_NUM) errors.push('INVOICE_NUM is required');
      if (invoice.INVOICE_AMOUNT !== undefined && invoice.INVOICE_AMOUNT < 0) {
        errors.push('INVOICE_AMOUNT cannot be negative');
      }
      if (invoice.STATUS && !INVOICE_STATUSES.includes(invoice.STATUS)) {
        errors.push(`invalid STATUS: ${invoice.STATUS}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct invoice', () => {
      const result = validateInvoice({
        INVOICE_NUM: 'INV-2026-001',
        SUPPLIER: 'Acme Corp',
        INVOICE_AMOUNT: 15000,
        CURRENCY_CODE: 'USD',
        INVOICE_DATE: '2026-06-15',
        STATUS: 'APPROVED'
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Requisition Validation', () => {
    const validateRequisition = (req: {
      REQUISITION_NUMBER?: string;
      REQUESTER?: string;
      ITEM_COUNT?: number;
      APPROVAL_STATUS?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!req.REQUISITION_NUMBER) errors.push('REQUISITION_NUMBER is required');
      if (req.ITEM_COUNT !== undefined && req.ITEM_COUNT < 0) {
        errors.push('ITEM_COUNT cannot be negative');
      }
      if (req.APPROVAL_STATUS && !REQUISITION_STATUSES.includes(req.APPROVAL_STATUS)) {
        errors.push(`invalid APPROVAL_STATUS: ${req.APPROVAL_STATUS}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct requisition', () => {
      const result = validateRequisition({
        REQUISITION_NUMBER: 'REQ-2026-001',
        REQUESTER: 'john.doe',
        ITEM_COUNT: 5,
        APPROVAL_STATUS: 'PENDING'
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Supplier Search', () => {
    const searchSuppliers = (
      suppliers: Array<{ SUPPLIER_NAME: string; SITE: string; STATUS: string }>,
      query: string
    ) => {
      const q = query.toLowerCase();
      return suppliers.filter(s =>
        s.SUPPLIER_NAME.toLowerCase().includes(q) ||
        s.SITE.toLowerCase().includes(q)
      );
    };

    it('should search by supplier name', () => {
      const suppliers = [
        { SUPPLIER_NAME: 'Acme Corporation', SITE: 'HQ', STATUS: 'ACTIVE' },
        { SUPPLIER_NAME: 'Beta Industries', SITE: 'Branch', STATUS: 'ACTIVE' }
      ];
      const results = searchSuppliers(suppliers, 'acme');
      expect(results).toHaveLength(1);
      expect(results[0].SUPPLIER_NAME).toBe('Acme Corporation');
    });
  });

  describe('Invoice Filtering', () => {
    const filterInvoices = (
      invoices: Array<{ STATUS: string; SUPPLIER: string; INVOICE_AMOUNT: number }>,
      filters: { status?: string; supplier?: string; minAmount?: number }
    ) => {
      let filtered = [...invoices];

      if (filters.status) filtered = filtered.filter(i => i.STATUS === filters.status);
      if (filters.supplier) filtered = filtered.filter(i => i.SUPPLIER === filters.supplier);
      if (filters.minAmount !== undefined) filtered = filtered.filter(i => i.INVOICE_AMOUNT >= filters.minAmount);

      return filtered;
    };

    it('should filter by status', () => {
      const invoices = [
        { STATUS: 'APPROVED', SUPPLIER: 'A', INVOICE_AMOUNT: 1000 },
        { STATUS: 'PAID', SUPPLIER: 'B', INVOICE_AMOUNT: 2000 }
      ];
      const results = filterInvoices(invoices, { status: 'APPROVED' });
      expect(results).toHaveLength(1);
    });
  });

  describe('Spend Analysis', () => {
    const analyzeSpend = (
      invoices: Array<{ SUPPLIER: string; INVOICE_AMOUNT: number; STATUS: string }>
    ) => {
      const approved = invoices.filter(i => i.STATUS === 'APPROVED' || i.STATUS === 'PAID');

      const bySupplier: Record<string, number> = {};
      approved.forEach(i => {
        bySupplier[i.SUPPLIER] = (bySupplier[i.SUPPLIER] || 0) + i.INVOICE_AMOUNT;
      });

      const total = approved.reduce((sum, i) => sum + i.INVOICE_AMOUNT, 0);

      return { bySupplier, total, supplierCount: Object.keys(bySupplier).length };
    };

    it('should analyze spend by supplier', () => {
      const invoices = [
        { SUPPLIER: 'Acme', INVOICE_AMOUNT: 10000, STATUS: 'PAID' },
        { SUPPLIER: 'Acme', INVOICE_AMOUNT: 5000, STATUS: 'APPROVED' },
        { SUPPLIER: 'Beta', INVOICE_AMOUNT: 8000, STATUS: 'PAID' }
      ];
      const analysis = analyzeSpend(invoices);
      expect(analysis.total).toBe(23000);
      expect(analysis.bySupplier['Acme']).toBe(15000);
      expect(analysis.supplierCount).toBe(2);
    });
  });
});