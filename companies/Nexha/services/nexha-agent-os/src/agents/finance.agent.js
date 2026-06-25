/**
 * Finance Agent — Invoicing, payments, cash flow, treasury management.
 *
 * ADR-??? Phase 3 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';

export class FinanceAgent {
  constructor(tenantId) {
    this.agentId = 'finance';
    this.tenantId = tenantId;
    this.role = 'Finance';
    this.name = 'Nexha Finance Agent';
    this.capabilities = [
      'invoice_generation',
      'payment_tracking',
      'cash_flow',
      'expense_management',
      'financial_reporting',
      'payment_terms',
    ];
    this.invoices = [];
    this.payments = [];
    this.activityLog = [];
  }

  async act(context) {
    const { action } = context;
    switch (action) {
      case 'create_invoice': return this.createInvoice(context);
      case 'list_invoices': return this.listInvoices(context);
      case 'record_payment': return this.recordPayment(context);
      case 'get_cash_flow': return this.getCashFlow(context);
      case 'get_summary': return this.getSummary(context);
      default: return { error: `Unknown action: ${action}` };
    }
  }

  async createInvoice(context) {
    const { customerRef, items, dueDate, paymentTerms } = context;
    if (!customerRef || !items) return { error: 'customerRef and items required' };

    const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const tax = (subtotal * 0.18); // 18% GST
    const total = subtotal + tax;

    const invoice = {
      invoiceId,
      tenantId: this.tenantId,
      customerRef,
      items,
      subtotal,
      tax,
      total,
      status: 'pending',
      issuedAt: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      paymentTerms: paymentTerms || 'NET30',
      paidAt: null,
    };

    this.invoices.push(invoice);
    this.log('create_invoice', { invoiceId, total });
    return { invoice };
  }

  async listInvoices(context = {}) {
    const { status, customerRef } = context;
    let list = [...this.invoices];
    if (status) list = list.filter(i => i.status === status);
    if (customerRef) list = list.filter(i => i.customerRef === customerRef);
    return { invoices: list, total: list.length, amount: list.reduce((s, i) => s + i.total, 0) };
  }

  async recordPayment(context) {
    const { invoiceId, amount, method } = context;
    if (!invoiceId || !amount) return { error: 'invoiceId and amount required' };

    const invoice = this.invoices.find(i => i.invoiceId === invoiceId);
    if (!invoice) return { error: 'Invoice not found' };

    const payment = {
      paymentId: uuidv4(),
      invoiceId,
      amount,
      method: method || 'bank_transfer',
      status: amount >= invoice.total ? 'completed' : 'partial',
      paidAt: new Date().toISOString(),
    };

    if (payment.status === 'completed') {
      invoice.status = 'paid';
      invoice.paidAt = payment.paidAt;
    }

    this.payments.push(payment);
    this.log('record_payment', { paymentId: payment.paymentId, invoiceId, amount });
    return { payment, invoice };
  }

  async getCashFlow(context = {}) {
    const { days = 30 } = context;
    const now = Date.now();
    const startDate = new Date(now - days * 86400000);

    const inflows = this.payments
      .filter(p => new Date(p.paidAt) >= startDate)
      .reduce((sum, p) => sum + p.amount, 0);

    const outflows = this.invoices
      .filter(i => i.status === 'pending')
      .reduce((sum, i) => sum + i.total * 0.3, 0); // Estimate 30% goes to suppliers

    return {
      period: `${days} days`,
      inflows,
      outflows,
      netFlow: inflows - outflows,
      pendingReceivables: this.invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0),
    };
  }

  async getSummary(context = {}) {
    const { period = 'month' } = context;
    const invoices = [...this.invoices];
    const totalIssued = invoices.reduce((s, i) => s + i.total, 0);
    const totalCollected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const totalOutstanding = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.total, 0);
    const overdue = invoices.filter(i => i.status === 'pending' && new Date(i.dueDate) < new Date()).reduce((s, i) => s + i.total, 0);

    return {
      period,
      invoices: invoices.length,
      totalIssued,
      totalCollected,
      totalOutstanding,
      overdue,
      collectionRate: totalIssued > 0 ? (totalCollected / totalIssued * 100).toFixed(1) + '%' : '0%',
    };
  }

  log(action, data) {
    this.activityLog.unshift({ id: uuidv4(), timestamp: new Date().toISOString(), action, data });
    if (this.activityLog.length > 100) this.activityLog.pop();
  }

  getHistory(limit = 20) { return this.activityLog.slice(0, limit); }

  getProfile() {
    return {
      agentId: this.agentId,
      role: this.role,
      name: this.name,
      capabilities: this.capabilities,
      invoicesCount: this.invoices.length,
      paymentsCount: this.payments.length,
    };
  }
}
