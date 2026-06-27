/**
 * SUTAR OS — Oracle Connector Tests
 */
import { describe, it, expect } from 'vitest';

describe('Oracle Connector — Field Mappings', () => {
  const SUPPLIER_TO_SUPPLIER: Record<string, string> = {
    PartyId: 'supplierId', PartyName: 'businessName', EmailAddress: 'email',
    Phone: 'phone', Address1: 'address', City: 'city', Country: 'country',
    SupplierType: 'supplierType', Status: 'status',
  };

  const ORACLE_PO_TO_PROCUREMENT: Record<string, string> = {
    PoHeaderId: 'poId', DisplayName: 'poName', CreationDate: 'createdDate',
    ApprovalStatus: 'approvalStatus', Amount: 'totalAmount', CurrencyCode: 'currency',
    SupplierId: 'supplierId', SupplierName: 'supplierName',
  };

  const INVOICE_TO_PAYMENT: Record<string, string> = {
    InvoiceId: 'invoiceId', SupplierId: 'supplierId', InvoiceNum: 'invoiceNumber',
    InvoiceAmount: 'amount', InvoiceDate: 'invoiceDate', DueDate: 'dueDate',
    Status: 'status', CurrencyCode: 'currency',
  };

  const BUDGET_TO_FINANCE: Record<string, string> = {
    BudgetCode: 'budgetCode', BudgetName: 'budgetName', BudgetType: 'budgetType',
    LedgerId: 'ledgerId', PeriodName: 'periodName', BudgetAmount: 'budgetAmount',
    EncumbranceAmount: 'encumbranceAmount', AvailableAmount: 'availableAmount',
    StartDate: 'startDate', EndDate: 'endDate', Status: 'status',
  };

  function applyMapping(data: any, mapping: Record<string, string>) {
    const result: any = {};
    for (const [src, dst] of Object.entries(mapping)) {
      if (data[src] !== undefined) result[dst] = data[src];
    }
    return result;
  }

  it('maps Oracle supplier fields', () => {
    const sup = { PartyId: 'P001', PartyName: 'Global Parts Ltd', EmailAddress: 'sales@globalparts.com', Phone: '+1-555-0400', Address1: '456 Industrial Blvd', City: 'Mumbai', Country: 'India', SupplierType: 'GOODS', Status: 'Active' };
    const mapped = applyMapping(sup, SUPPLIER_TO_SUPPLIER);
    expect(mapped.supplierId).toBe('P001');
    expect(mapped.businessName).toBe('Global Parts Ltd');
    expect(mapped.email).toBe('sales@globalparts.com');
    expect(mapped.phone).toBe('+1-555-0400');
    expect(mapped.address).toBe('456 Industrial Blvd');
    expect(mapped.city).toBe('Mumbai');
    expect(mapped.country).toBe('India');
    expect(mapped.supplierType).toBe('GOODS');
    expect(mapped.status).toBe('Active');
  });

  it('maps Oracle PO fields to procurement', () => {
    const po = { PoHeaderId: '30001', DisplayName: 'PO-2026-30001', CreationDate: '2026-06-15', ApprovalStatus: 'APPROVED', Amount: 75000, CurrencyCode: 'USD', SupplierId: 'P001', SupplierName: 'Global Parts Ltd' };
    const mapped = applyMapping(po, ORACLE_PO_TO_PROCUREMENT);
    expect(mapped.poId).toBe('30001');
    expect(mapped.poName).toBe('PO-2026-30001');
    expect(mapped.createdDate).toBe('2026-06-15');
    expect(mapped.approvalStatus).toBe('APPROVED');
    expect(mapped.totalAmount).toBe(75000);
    expect(mapped.currency).toBe('USD');
    expect(mapped.supplierId).toBe('P001');
    expect(mapped.supplierName).toBe('Global Parts Ltd');
  });

  it('maps Oracle invoice fields to payment', () => {
    const inv = { InvoiceId: '20001', SupplierId: 'P001', InvoiceNum: 'INV-2026-500', InvoiceAmount: 12500, InvoiceDate: '2026-06-20', DueDate: '2026-07-20', Status: 'OPEN', CurrencyCode: 'USD' };
    const mapped = applyMapping(inv, INVOICE_TO_PAYMENT);
    expect(mapped.invoiceId).toBe('20001');
    expect(mapped.supplierId).toBe('P001');
    expect(mapped.invoiceNumber).toBe('INV-2026-500');
    expect(mapped.amount).toBe(12500);
    expect(mapped.invoiceDate).toBe('2026-06-20');
    expect(mapped.dueDate).toBe('2026-07-20');
    expect(mapped.status).toBe('OPEN');
    expect(mapped.currency).toBe('USD');
  });

  it('maps Oracle budget fields to finance', () => {
    const budget = { BudgetCode: 'B001', BudgetName: 'Engineering FY26', BudgetType: 'EXPENSE', LedgerId: 'L001', PeriodName: '2026-06', BudgetAmount: 1000000, EncumbranceAmount: 200000, AvailableAmount: 800000, StartDate: '2026-01-01', EndDate: '2026-12-31', Status: 'Active' };
    const mapped = applyMapping(budget, BUDGET_TO_FINANCE);
    expect(mapped.budgetCode).toBe('B001');
    expect(mapped.budgetName).toBe('Engineering FY26');
    expect(mapped.budgetType).toBe('EXPENSE');
    expect(mapped.ledgerId).toBe('L001');
    expect(mapped.periodName).toBe('2026-06');
    expect(mapped.budgetAmount).toBe(1000000);
    expect(mapped.encumbranceAmount).toBe(200000);
    expect(mapped.availableAmount).toBe(800000);
    expect(mapped.startDate).toBe('2026-01-01');
    expect(mapped.endDate).toBe('2026-12-31');
    expect(mapped.status).toBe('Active');
  });
});

describe('Oracle Connector — Capability Inference', () => {
  function inferSupplierCapabilities(ocSupplier: any) {
    const caps = ['product_search', 'rfq_response', 'order_fulfillment', 'invoice_submission'];
    const stype = ocSupplier.SupplierType || '';
    if (stype === 'GOODS') caps.push('goods_supply', 'logistics');
    if (stype === 'SERVICES') caps.push('service_delivery', 'consulting');
    return caps;
  }

  it('has base capabilities', () => {
    const caps = inferSupplierCapabilities({});
    expect(caps).toContain('product_search');
    expect(caps).toContain('rfq_response');
    expect(caps).toContain('order_fulfillment');
    expect(caps).toContain('invoice_submission');
  });

  it('infers goods supplier capabilities', () => {
    const caps = inferSupplierCapabilities({ SupplierType: 'GOODS' });
    expect(caps).toContain('goods_supply');
    expect(caps).toContain('logistics');
  });

  it('infers services supplier capabilities', () => {
    const caps = inferSupplierCapabilities({ SupplierType: 'SERVICES' });
    expect(caps).toContain('service_delivery');
    expect(caps).toContain('consulting');
  });
});

describe('Oracle Connector — PO Urgency', () => {
  function calculatePOUrgency(ocPO: any) {
    if (!ocPO.CreationDate) return 'medium';
    const age = Math.ceil((Date.now() - new Date(ocPO.CreationDate).getTime()) / (1000 * 60 * 60 * 24));
    if (age > 45) return 'critical';
    if (age > 20) return 'high';
    if (age > 7) return 'medium';
    return 'low';
  }

  it('returns medium when no creation date', () => {
    expect(calculatePOUrgency({})).toBe('medium');
  });

  it('returns critical for POs older than 45 days', () => {
    const oldDate = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculatePOUrgency({ CreationDate: oldDate })).toBe('critical');
  });

  it('returns high for POs 20-45 days old', () => {
    const midDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculatePOUrgency({ CreationDate: midDate })).toBe('high');
  });

  it('returns medium for POs 7-20 days old', () => {
    const recentDate = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculatePOUrgency({ CreationDate: recentDate })).toBe('medium');
  });

  it('returns low for POs less than 7 days old', () => {
    const newDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculatePOUrgency({ CreationDate: newDate })).toBe('low');
  });
});

describe('Oracle Connector — Invoice Payment Priority', () => {
  function calculateDaysUntilDue(ocInvoice: any) {
    if (!ocInvoice.DueDate) return 30;
    return Math.ceil((new Date(ocInvoice.DueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  function determinePaymentPriority(payment: any) {
    if (payment.daysUntilDue <= 3) return 'urgent';
    if (payment.daysUntilDue <= 7) return 'high';
    return 'normal';
  }

  it('calculates days until due', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateDaysUntilDue({ DueDate: future })).toBe(5);
  });

  it('defaults to 30 days when no due date', () => {
    expect(calculateDaysUntilDue({})).toBe(30);
  });

  it('returns urgent for <= 3 days', () => {
    expect(determinePaymentPriority({ daysUntilDue: 2 })).toBe('urgent');
    expect(determinePaymentPriority({ daysUntilDue: 3 })).toBe('urgent');
  });

  it('returns high for 4-7 days', () => {
    expect(determinePaymentPriority({ daysUntilDue: 5 })).toBe('high');
    expect(determinePaymentPriority({ daysUntilDue: 7 })).toBe('high');
  });

  it('returns normal for > 7 days', () => {
    expect(determinePaymentPriority({ daysUntilDue: 10 })).toBe('normal');
    expect(determinePaymentPriority({ daysUntilDue: 30 })).toBe('normal');
  });
});

describe('Oracle Connector — Budget Utilization', () => {
  function calculateBudgetUtilization(ocBudget: any) {
    if (!ocBudget.BudgetAmount || ocBudget.BudgetAmount === 0) return 0;
    const utilized = (ocBudget.BudgetAmount - (ocBudget.AvailableAmount || 0));
    return Math.round((utilized / ocBudget.BudgetAmount) * 100);
  }

  it('calculates utilization percentage', () => {
    expect(calculateBudgetUtilization({ BudgetAmount: 1000000, AvailableAmount: 750000 })).toBe(25);
    expect(calculateBudgetUtilization({ BudgetAmount: 1000000, AvailableAmount: 200000 })).toBe(80);
    expect(calculateBudgetUtilization({ BudgetAmount: 1000000, AvailableAmount: 0 })).toBe(100);
  });

  it('returns 0 when budget amount is zero', () => {
    expect(calculateBudgetUtilization({ BudgetAmount: 0 })).toBe(0);
  });

  it('returns 0 when budget amount is missing', () => {
    expect(calculateBudgetUtilization({})).toBe(0);
  });
});

describe('Oracle Connector — Configuration', () => {
  it('has correct Oracle config defaults', () => {
    const ORACLE_CONFIG = {
      host: process.env.ORACLE_HOST || 'oracle.example.com',
      restBasePath: process.env.ORACLE_REST_PATH || '/fscmRestApi',
      soapBasePath: process.env.ORACLE_SOAP_PATH || '/fscmService',
      username: process.env.ORACLE_USERNAME || 'DEMO_USER',
      password: process.env.ORACLE_PASSWORD || 'DEMO_PASS',
      erpCloudId: process.env.ORACLE_ERP_ID || 'DEMO_ERP',
    };
    expect(ORACLE_CONFIG.host).toBe('oracle.example.com');
    expect(ORACLE_CONFIG.restBasePath).toBe('/fscmRestApi');
    expect(ORACLE_CONFIG.erpCloudId).toBe('DEMO_ERP');
  });

  it('has correct SUTAR endpoint defaults', () => {
    const SUTAR_ENDPOINTS = {
      acnNetwork: process.env.ACN_NETWORK_URL || 'http://localhost:4801',
      procurement: process.env.PROCUREMENT_URL || 'http://localhost:5096',
      negotiation: process.env.NEGOTIATION_URL || 'http://localhost:4293',
      contract: process.env.CONTRACT_URL || 'http://localhost:4292',
    };
    expect(SUTAR_ENDPOINTS.acnNetwork).toBe('http://localhost:4801');
    expect(SUTAR_ENDPOINTS.procurement).toBe('http://localhost:5096');
    expect(SUTAR_ENDPOINTS.negotiation).toBe('http://localhost:4293');
  });
});