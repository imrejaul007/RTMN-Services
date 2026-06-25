/**
 * Procurement Agent — Supplier discovery, RFQ management, PO creation.
 *
 * ADR-??? Phase 3 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';

export class ProcurementAgent {
  constructor(tenantId) {
    this.agentId = 'procurement';
    this.tenantId = tenantId;
    this.role = 'Procurement';
    this.name = 'Nexha Procurement Agent';
    this.capabilities = [
      'supplier_discovery',
      'rfq_creation',
      'po_management',
      'supplier_negotiation',
      'contract_management',
      'spend_analytics',
    ];
    this.rfqs = [];
    this.purchaseOrders = [];
    this.activityLog = [];
  }

  async act(context) {
    const { action } = context;
    switch (action) {
      case 'discover_suppliers': return this.discoverSuppliers(context);
      case 'create_rfq': return this.createRFQ(context);
      case 'list_rfqs': return this.listRFQs(context);
      case 'award_rfq': return this.awardRFQ(context);
      case 'create_po': return this.createPO(context);
      case 'get_spend': return this.getSpendAnalytics(context);
      default: return { error: `Unknown action: ${action}` };
    }
  }

  async discoverSuppliers(context = {}) {
    const { category, location, certifications } = context;
    // Simulate supplier discovery — in production calls nexha-supplier-registry
    const suppliers = [
      { id: 'sup-001', name: 'Global Foods Ltd', category: 'food', location: 'Mumbai', rating: 4.8, moq: 500, certifications: ['FSSAI', 'ISO-22000'] },
      { id: 'sup-002', name: 'Premium Spices Co', category: 'food', location: 'Delhi', rating: 4.5, moq: 200, certifications: ['FSSAI'] },
      { id: 'sup-003', name: 'PackRight Industries', category: 'packaging', location: 'Pune', rating: 4.6, moq: 1000, certifications: ['ISO-9001'] },
      { id: 'sup-004', name: 'Swift Logistics', category: 'logistics', location: 'Bangalore', rating: 4.7, moq: 1, certifications: ['ISO-28000'] },
    ];

    let results = suppliers;
    if (category) results = results.filter(s => s.category === category);
    if (location) results = results.filter(s => s.location === location);

    this.log('discover_suppliers', { results: results.length });
    return { suppliers: results, total: results.length };
  }

  async createRFQ(context) {
    const { title, items, deadline, suppliers } = context;
    if (!title || !items) return { error: 'title and items required' };

    const rfq = {
      rfqId: `RFQ-${uuidv4().slice(0, 8).toUpperCase()}`,
      tenantId: this.tenantId,
      title,
      items,
      status: 'open',
      quotesReceived: 0,
      deadline: deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
      invitedSuppliers: suppliers || [],
      bestQuote: null,
      awardedTo: null,
      createdAt: new Date().toISOString(),
    };

    this.rfqs.push(rfq);
    this.log('create_rfq', { rfqId: rfq.rfqId, items: items.length });
    return { rfq };
  }

  async listRFQs(context = {}) {
    const { status } = context;
    let list = [...this.rfqs];
    if (status) list = list.filter(r => r.status === status);
    return { rfqs: list, total: list.length };
  }

  async awardRFQ(context) {
    const { rfqId, supplierId } = context;
    if (!rfqId || !supplierId) return { error: 'rfqId and supplierId required' };

    const rfq = this.rfqs.find(r => r.rfqId === rfqId);
    if (!rfq) return { error: 'RFQ not found' };
    if (rfq.status !== 'open') return { error: 'RFQ is not open' };

    rfq.status = 'awarded';
    rfq.awardedTo = supplierId;
    rfq.awardedAt = new Date().toISOString();

    this.log('award_rfq', { rfqId, supplierId });
    return { rfq, message: `RFQ awarded to ${supplierId}` };
  }

  async createPO(context) {
    const { supplierRef, items, deliveryDate, terms } = context;
    if (!supplierRef || !items) return { error: 'supplierRef and items required' };

    const po = {
      poId: `PO-${Date.now().toString(36).toUpperCase()}`,
      tenantId: this.tenantId,
      supplierRef,
      items,
      status: 'draft',
      total: items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0),
      deliveryDate: deliveryDate || null,
      terms: terms || 'NET30',
      createdAt: new Date().toISOString(),
    };

    this.purchaseOrders.push(po);
    this.log('create_po', { poId: po.poId, total: po.total });
    return { po };
  }

  async getSpendAnalytics(context = {}) {
    const { period = 'month' } = context;
    const totalSpend = this.purchaseOrders.reduce((s, p) => s + p.total, 0);
    const bySupplier = {};
    for (const po of this.purchaseOrders) {
      bySupplier[po.supplierRef] = (bySupplier[po.supplierRef] || 0) + po.total;
    }

    return {
      period,
      totalPurchaseOrders: this.purchaseOrders.length,
      totalSpend,
      rfqsCreated: this.rfqs.length,
      rfqsOpen: this.rfqs.filter(r => r.status === 'open').length,
      rfqsAwarded: this.rfqs.filter(r => r.status === 'awarded').length,
      spendBySupplier: bySupplier,
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
      rfqsCount: this.rfqs.length,
      posCount: this.purchaseOrders.length,
    };
  }
}
