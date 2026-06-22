import { billingService } from '../services/billing.service';
import { Invoice, Settlement, Reconciliation } from '../models/billing.model';

describe('BillingService', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await Invoice.deleteMany({});
    await Settlement.deleteMany({});
    await Reconciliation.deleteMany({});
  });

  describe('generateInvoice', () => {
    it('should generate a new invoice', async () => {
      const input = {
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
        currency: 'INR',
        description: 'Monthly AI Services',
      };

      const invoice = await billingService.generateInvoice(input);

      expect(invoice).toBeDefined();
      expect(invoice.invoiceId).toMatch(/^INV-\d+-[A-Z0-9]{8}$/);
      expect(invoice.fromCorpId).toBe('HOJAI-AI');
      expect(invoice.toCorpId).toBe('RABTUL-Technologies');
      expect(invoice.amount).toBe(50000);
      expect(invoice.currency).toBe('INR');
      expect(invoice.status).toBe('pending');
    });

    it('should generate invoice with line items', async () => {
      const input = {
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 75000,
        lineItems: [
          { description: 'AI Processing', quantity: 100, unitPrice: 500 },
          { description: 'Storage', quantity: 50, unitPrice: 500 },
        ],
      };

      const invoice = await billingService.generateInvoice(input);

      expect(invoice.lineItems).toHaveLength(2);
      expect(invoice.lineItems[0].total).toBe(50000);
      expect(invoice.lineItems[1].total).toBe(25000);
    });

    it('should use default due date of 30 days', async () => {
      const input = {
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 10000,
      };

      const invoice = await billingService.generateInvoice(input);
      const expectedDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance
      expect(invoice.dueDate.getTime()).toBeCloseTo(expectedDueDate.getTime(), -3);
    });
  });

  describe('payInvoice', () => {
    it('should mark invoice as paid', async () => {
      const invoice = await billingService.generateInvoice({
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
      });

      const paidInvoice = await billingService.payInvoice(invoice.invoiceId);

      expect(paidInvoice.status).toBe('paid');
      expect(paidInvoice.paidAt).toBeDefined();
      expect(paidInvoice.paidAmount).toBe(50000);
    });

    it('should throw error for non-existent invoice', async () => {
      await expect(billingService.payInvoice('INV-NONEXISTENT')).rejects.toThrow(
        'Invoice not found'
      );
    });

    it('should throw error for already paid invoice', async () => {
      const invoice = await billingService.generateInvoice({
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
      });

      await billingService.payInvoice(invoice.invoiceId);

      await expect(billingService.payInvoice(invoice.invoiceId)).rejects.toThrow(
        'Invoice already paid'
      );
    });
  });

  describe('runSettlement', () => {
    it('should run settlement for pending invoices', async () => {
      // Create multiple invoices
      await billingService.generateInvoice({
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
      });
      await billingService.generateInvoice({
        fromCorpId: 'RABTUL-Technologies',
        toCorpId: 'REZ-Intelligence',
        amount: 25000,
      });

      const settlement = await billingService.runSettlement({
        period: {
          start: new Date('2026-06-01'),
          end: new Date('2026-06-30'),
          month: '2026-06',
        },
      });

      expect(settlement).toBeDefined();
      expect(settlement.settlementId).toMatch(/^SET-\d+-[A-Z0-9]{8}$/);
      expect(settlement.status).toBe('completed');
      expect(settlement.transactions).toHaveLength(2);
      expect(settlement.totalAmount).toBe(75000);
      expect(settlement.summary.settledCount).toBe(2);
    });
  });

  describe('reconcile', () => {
    it('should reconcile accounts', async () => {
      // Create invoices for reconciliation
      await billingService.generateInvoice({
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
      });
      await billingService.generateInvoice({
        fromCorpId: 'RABTUL-Technologies',
        toCorpId: 'REZ-Intelligence',
        amount: 30000,
      });

      const reconciliation = await billingService.reconcile({
        period: {
          start: new Date('2026-06-01'),
          end: new Date('2026-06-30'),
          month: '2026-06',
        },
      });

      expect(reconciliation).toBeDefined();
      expect(reconciliation.reconciliationId).toMatch(/^REC-\d+-[A-Z0-9]{8}$/);
      expect(reconciliation.companies).toContain('HOJAI-AI');
      expect(reconciliation.balances.length).toBeGreaterThan(0);
    });
  });

  describe('getInvoices', () => {
    it('should get invoices for a company', async () => {
      await billingService.generateInvoice({
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
      });
      await billingService.generateInvoice({
        fromCorpId: 'RABTUL-Technologies',
        toCorpId: 'HOJAI-AI',
        amount: 25000,
      });

      const result = await billingService.getInvoices('HOJAI-AI');

      expect(result.invoices).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter invoices by status', async () => {
      const invoice = await billingService.generateInvoice({
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
      });
      await billingService.payInvoice(invoice.invoiceId);

      const result = await billingService.getInvoices('HOJAI-AI', { status: 'pending' });

      expect(result.invoices).toHaveLength(0);
    });
  });

  describe('getSettlements', () => {
    it('should get settlements with pagination', async () => {
      await billingService.runSettlement({
        period: {
          start: new Date('2026-05-01'),
          end: new Date('2026-05-31'),
          month: '2026-05',
        },
      });
      await billingService.runSettlement({
        period: {
          start: new Date('2026-06-01'),
          end: new Date('2026-06-30'),
          month: '2026-06',
        },
      });

      const result = await billingService.getSettlements({ limit: 10, offset: 0 });

      expect(result.settlements).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('cancelInvoice', () => {
    it('should cancel a pending invoice', async () => {
      const invoice = await billingService.generateInvoice({
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
      });

      const cancelledInvoice = await billingService.cancelInvoice(invoice.invoiceId);

      expect(cancelledInvoice.status).toBe('cancelled');
    });

    it('should throw error when trying to cancel paid invoice', async () => {
      const invoice = await billingService.generateInvoice({
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
      });
      await billingService.payInvoice(invoice.invoiceId);

      await expect(billingService.cancelInvoice(invoice.invoiceId)).rejects.toThrow(
        'Cannot cancel paid invoice'
      );
    });
  });

  describe('getBillingSummary', () => {
    it('should return billing summary for a company', async () => {
      await billingService.generateInvoice({
        fromCorpId: 'HOJAI-AI',
        toCorpId: 'RABTUL-Technologies',
        amount: 50000,
      });
      await billingService.generateInvoice({
        fromCorpId: 'RABTUL-Technologies',
        toCorpId: 'HOJAI-AI',
        amount: 30000,
      });
      const invoice = await billingService.generateInvoice({
        fromCorpId: 'REZ-Intelligence',
        toCorpId: 'HOJAI-AI',
        amount: 20000,
      });
      await billingService.payInvoice(invoice.invoiceId);

      const summary = await billingService.getBillingSummary('HOJAI-AI');

      expect(summary.totalOwed).toBe(50000);
      expect(summary.totalReceivable).toBe(50000); // 30000 + 20000
      expect(summary.pendingInvoices).toBe(2);
      expect(summary.paidInvoices).toBe(1);
    });
  });
});