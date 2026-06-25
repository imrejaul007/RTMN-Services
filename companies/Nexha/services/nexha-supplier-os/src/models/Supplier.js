/**
 * CompanySupplier — Per-company supplier entity.
 *
 * A supplier that has been onboarded/approved by a specific company (tenant).
 * The actual supplier master data lives in nexha-supplier-registry;
 * this is the per-company view with company-specific data (tier, payment terms, performance).
 *
 * ADR-??? Phase 4 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';

export const SUPPLIER_STATUSES = ['prospect', 'onboarded', 'suspended', 'rejected'];
export const SUPPLIER_TIERS = ['bronze', 'silver', 'gold', 'platinum'];

const ORDER_KEY = Symbol.for('nexha-order.order-store');
const RETURN_KEY = Symbol.for('nexha-order.return-store');

export function getStore() {
  if (!globalThis[ORDER_KEY]) globalThis[ORDER_KEY] = new Map();
  return globalThis[ORDER_KEY];
}
export function getReturnStore() {
  if (!globalThis[RETURN_KEY]) globalThis[RETURN_KEY] = new Map();
  return globalThis[RETURN_KEY];
}
export function clearStore() { getStore().clear(); getReturnStore().clear(); }

export function saveOrder(po) { getStore().set(po.orderId, po); return po; }
export function getOrder(id) { return getStore().get(id) || null; }

export function listOrders(tenantId, filters = {}) {
  let orders = Array.from(getStore().values()).filter(o => o.tenantId === tenantId);
  if (filters.status) orders = orders.filter(o => o.status === filters.status);
  if (filters.supplierRef) orders = orders.filter(o => o.supplierRef === filters.supplierRef);
  if (filters.since) orders = orders.filter(o => new Date(o.createdAt) >= new Date(filters.since));
  return orders;
}

export function deleteOrder(id, tenantId) {
  const order = getStore().get(id);
  if (!order) return false;
  if (order.tenantId !== tenantId) return false;
  getStore().delete(id);
  return true;
}

export class CompanySupplier {
  constructor(data = {}) {
    this.supplierId = data.supplierId || uuidv4();
    this.tenantId = data.tenantId || '';
    this.supplierRef = data.supplierRef || ''; // Global Nexha supplier ID
    this.companyName = data.companyName || '';
    this.contactName = data.contactName || '';
    this.email = data.email || '';
    this.phone = data.phone || '';
    this.status = data.status || 'prospect';
    this.tier = data.tier || 'bronze';
    this.categories = Array.isArray(data.categories) ? data.categories : [];
    this.paymentTerms = data.paymentTerms || 'NET30';
    this.creditLimit = data.creditLimit || 0;
    this.performance = data.performance || {
      onTimeDelivery: 0,
      qualityScore: 0,
      responseTime: 0,
      totalOrders: 0,
      totalValue: 0,
    };
    this.address = data.address || null;
    this.notes = data.notes || '';
    this.onboardedAt = data.onboardedAt || null;
    this.suspendedAt = data.suspendedAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this._contracts = (data._contracts || []).map(c => new Contract(c));
    this._rfqs = (data._rfqs || []).map(r => new RFQ(r));
  }

  canTransitionTo(newStatus) {
    const t = {
      prospect: ['onboarded', 'rejected'],
      onboarded: ['suspended'],
      suspended: ['onboarded', 'rejected'],
      rejected: [],
    };
    return t[this.status]?.includes(newStatus) || false;
  }

  transitionTo(newStatus) {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(`Illegal supplier transition: ${this.status} → ${newStatus}`);
    }
    this.status = newStatus;
    this.updatedAt = new Date().toISOString();
    if (newStatus === 'onboarded') this.onboardedAt = new Date().toISOString();
    if (newStatus === 'suspended') this.suspendedAt = new Date().toISOString();
    return this;
  }

  addContract(c) { this._contracts.push(new Contract(c)); return this; }
  addRFQ(r) { this._rfqs.push(new RFQ(r)); return this; }

  updatePerformance(orderData) {
    const { deliveredOnTime, quality, responseHours, orderValue } = orderData;
    const n = this.performance.totalOrders + 1;
    this.performance.onTimeDelivery = ((this.performance.onTimeDelivery * (n - 1)) + (deliveredOnTime ? 100 : 0)) / n;
    this.performance.qualityScore = ((this.performance.qualityScore * (n - 1)) + quality) / n;
    this.performance.responseTime = ((this.performance.responseTime * (n - 1)) + responseHours) / n;
    this.performance.totalOrders++;
    this.performance.totalValue += orderValue;
    this.updatedAt = new Date().toISOString();
    // Auto-upgrade tier
    if (this.performance.onTimeDelivery >= 95 && this.performance.qualityScore >= 90) {
      if (this.tier === 'bronze') this.tier = 'silver';
      else if (this.tier === 'silver' && this.performance.totalValue > 100000) this.tier = 'gold';
      else if (this.tier === 'gold' && this.performance.totalValue > 500000) this.tier = 'platinum';
    }
    return this;
  }

  toJSON() {
    return {
      supplierId: this.supplierId, tenantId: this.tenantId, supplierRef: this.supplierRef,
      companyName: this.companyName, contactName: this.contactName, email: this.email, phone: this.phone,
      status: this.status, tier: this.tier, categories: this.categories,
      paymentTerms: this.paymentTerms, creditLimit: this.creditLimit,
      performance: this.performance, address: this.address, notes: this.notes,
      onboardedAt: this.onboardedAt, suspendedAt: this.suspendedAt,
      contractsCount: this._contracts.length, rfqsCount: this._rfqs.length,
      createdAt: this.createdAt, updatedAt: this.updatedAt,
    };
  }
}

export class Contract {
  constructor(data = {}) {
    this.contractId = data.contractId || uuidv4();
    this.supplierId = data.supplierId || '';
    this.title = data.title || '';
    this.status = data.status || 'draft'; // draft | active | expired | terminated
    this.value = data.value || 0;
    this.startDate = data.startDate || null;
    this.endDate = data.endDate || null;
    this.signedAt = data.signedAt || null;
  }
}

export class RFQ {
  constructor(data = {}) {
    this.rfqId = data.rfqId || uuidv4();
    this.supplierId = data.supplierId || '';
    this.title = data.title || '';
    this.status = data.status || 'open'; // open | quoted | awarded | cancelled
    this.items = data.items || [];
    this.quotedValue = data.quotedValue || null;
    this.quotedAt = data.quotedAt || null;
    this.awardedAt = data.awardedAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
  }
}
