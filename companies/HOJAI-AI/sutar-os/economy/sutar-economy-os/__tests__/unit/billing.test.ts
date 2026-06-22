/**
 * sutar-economy-os — Billing service unit tests
 */

import { describe, it, expect } from 'vitest';
import { billingService } from '../../src/services/billing.service.js';
import type { IBillingLineItem } from '../../src/types/index.js';

function makeLineItem(desc: string, qty: number, unitPrice: number): IBillingLineItem {
  return { description: desc, quantity: qty, unitPrice, total: qty * unitPrice };
}

describe('billing — create + read', () => {
  it('creates an invoice with subtotal = sum of lineItems', async () => {
    const eid = `bill-${Date.now()}-${Math.random()}`;
    const inv = await billingService.createInvoice({
      entityId: eid,
      entityType: 'user',
      cycle: 'one_time',
      currency: 'USD',
      lineItems: [
        makeLineItem('API calls', 100, 0.01),
        makeLineItem('Storage', 5, 2.0),
      ],
    });
    expect(inv.billingId).toBeDefined();
    expect(inv.invoiceNumber).toMatch(/^INV-/);
    expect(inv.status).toBe('draft');
    expect(inv.subtotal).toBe(11); // 1.00 + 10.00
    expect(inv.tax).toBe(0);
    expect(inv.total).toBe(11);
  });

  it('retrieves an invoice by id and by invoiceNumber', async () => {
    const inv = await billingService.createInvoice({
      entityId: `bill-${Date.now()}`,
      entityType: 'business',
      lineItems: [makeLineItem('Subscription', 1, 99)],
    });
    const byId = await billingService.getInvoice(inv.billingId);
    expect(byId?.billingId).toBe(inv.billingId);
    const byNum = await billingService.getInvoiceByNumber(inv.invoiceNumber);
    expect(byNum?.billingId).toBe(inv.billingId);
  });

  it('returns null for unknown invoice id', async () => {
    const got = await billingService.getInvoice('not-a-real-id');
    expect(got).toBeNull();
  });
});

describe('billing — payments + line items', () => {
  it('adds a partial payment and updates status when fully paid', async () => {
    const inv = await billingService.createInvoice({
      entityId: `bill-${Date.now()}-${Math.random()}`,
      entityType: 'user',
      lineItems: [makeLineItem('SaaS', 1, 100)],
    });
    await billingService.addPayment(inv.billingId, 60, 'wire');
    let fresh = await billingService.getInvoice(inv.billingId);
    expect(fresh?.paidAmount).toBe(60);
    expect(fresh?.status).toBe('pending');
    await billingService.addPayment(inv.billingId, 40, 'wire');
    fresh = await billingService.getInvoice(inv.billingId);
    expect(fresh?.paidAmount).toBe(100);
    expect(fresh?.status).toBe('paid');
    expect(fresh?.paidAt).toBeInstanceOf(Date);
  });

  it('adds and removes line items', async () => {
    const inv = await billingService.createInvoice({
      entityId: `bill-${Date.now()}`,
      entityType: 'user',
      lineItems: [makeLineItem('Base', 1, 10)],
    });
    const withItem = await billingService.addLineItem(inv.billingId, makeLineItem('Add-on', 2, 5));
    expect(withItem?.lineItems.length).toBe(2);
    expect(withItem?.total).toBe(20);
    const removed = await billingService.removeLineItem(inv.billingId, 0);
    expect(removed?.lineItems.length).toBe(1);
  });
});

describe('billing — lifecycle', () => {
  it('sends a draft invoice (moves to pending)', async () => {
    const inv = await billingService.createInvoice({
      entityId: `bill-${Date.now()}`,
      entityType: 'user',
      lineItems: [makeLineItem('X', 1, 10)],
    });
    const sent = await billingService.sendInvoice(inv.billingId);
    expect(sent?.status).toBe('pending');
  });

  it('cancels a non-paid invoice', async () => {
    const inv = await billingService.createInvoice({
      entityId: `bill-${Date.now()}`,
      entityType: 'user',
      lineItems: [makeLineItem('X', 1, 10)],
    });
    const cancelled = await billingService.cancelInvoice(inv.billingId, 'no longer needed');
    expect(cancelled?.status).toBe('cancelled');
  });

  it('refunds a paid invoice', async () => {
    const inv = await billingService.createInvoice({
      entityId: `bill-${Date.now()}`,
      entityType: 'user',
      lineItems: [makeLineItem('X', 1, 50)],
    });
    await billingService.sendInvoice(inv.billingId);
    await billingService.addPayment(inv.billingId, 50, 'card');
    const refunded = await billingService.refundInvoice(inv.billingId, 50, 'customer refund');
    expect(refunded?.status).toBe('refunded');
  });
});

describe('billing — statistics', () => {
  it('computes billing statistics for an entity', async () => {
    const eid = `bill-stats-${Date.now()}-${Math.random()}`;
    const inv = await billingService.createInvoice({
      entityId: eid,
      entityType: 'business',
      lineItems: [makeLineItem('X', 1, 200)],
    });
    await billingService.sendInvoice(inv.billingId);
    await billingService.addPayment(inv.billingId, 200, 'wire');
    const start = new Date(Date.now() - 1000);
    const end = new Date(Date.now() + 1000);
    const stats = await billingService.getBillingStatistics(eid, start, end);
    expect(stats.totalInvoices).toBe(1);
    expect(stats.totalBilled).toBe(200);
    expect(stats.totalPaid).toBe(200);
    expect(stats.averageInvoiceValue).toBe(200);
  });
});