/**
 * SupplierOS Service — Per-company supplier directory + RFQ management.
 *
 * ADR-??? Phase 4 (2026-06-25).
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CompanySupplier,
  Contract,
  RFQ,
  SUPPLIER_STATUSES,
  SUPPLIER_TIERS,
  saveSupplier,
  getSupplier,
  listSuppliers,
  deleteSupplier,
} from '../models/Supplier.js';

export class SupplierError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'SupplierError';
    this.statusCode = statusCode;
  }
}

// ── Supplier CRUD ─────────────────────────────────────────────────────────────

export function createSupplier(tenantId, data) {
  if (!tenantId) throw new SupplierError('tenantId required', 400);
  if (!data.companyName) throw new SupplierError('companyName required', 400);

  const supplier = new CompanySupplier({
    tenantId,
    supplierRef: data.supplierRef || uuidv4(),
    companyName: data.companyName,
    contactName: data.contactName || '',
    email: data.email || '',
    phone: data.phone || '',
    status: 'prospect',
    tier: data.tier || 'bronze',
    categories: data.categories || [],
    paymentTerms: data.paymentTerms || 'NET30',
    creditLimit: data.creditLimit || 0,
    address: data.address || null,
    notes: data.notes || '',
  });

  return saveSupplier(supplier);
}

export function updateSupplier(tenantId, supplierId, data) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);

  const fields = ['companyName', 'contactName', 'email', 'phone', 'categories', 'paymentTerms', 'creditLimit', 'address', 'notes'];
  for (const f of fields) {
    if (data[f] !== undefined) supplier[f] = data[f];
  }
  if (data.tier) supplier.tier = data.tier;
  supplier.updatedAt = new Date().toISOString();
  return saveSupplier(supplier);
}

export function getSupplierDetails(tenantId, supplierId) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);
  return supplier;
}

export function listAllSuppliers(tenantId, filters = {}) {
  if (!tenantId) throw new SupplierError('tenantId required', 400);
  return listSuppliers(tenantId, filters);
}

export function removeSupplier(tenantId, supplierId) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);
  if (supplier.status === 'onboarded') throw new SupplierError('Cannot delete onboarded supplier — suspend instead', 400);
  const deleted = deleteSupplier(supplierId, tenantId);
  if (!deleted) throw new SupplierError(`Failed to delete supplier ${supplierId}`, 500);
  return { deleted: true };
}

// ── State transitions ───────────────────────────────────────────────────────

export function onboardSupplier(tenantId, supplierId) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);
  supplier.transitionTo('onboarded');
  supplier.updatedAt = new Date().toISOString();
  return saveSupplier(supplier);
}

export function suspendSupplier(tenantId, supplierId) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);
  supplier.transitionTo('suspended');
  supplier.updatedAt = new Date().toISOString();
  return saveSupplier(supplier);
}

export function reactivateSupplier(tenantId, supplierId) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);
  supplier.transitionTo('onboarded');
  supplier.updatedAt = new Date().toISOString();
  return saveSupplier(supplier);
}

// ── Contracts ───────────────────────────────────────────────────────────────

export function addContract(tenantId, supplierId, data) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);

  const contract = new Contract({
    supplierId,
    title: data.title || 'Contract',
    status: 'draft',
    value: data.value || 0,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
  });

  supplier.addContract(contract);
  supplier.updatedAt = new Date().toISOString();
  return { contract, supplier: saveSupplier(supplier) };
}

// ── RFQs ──────────────────────────────────────────────────────────────────

export function createRFQ(tenantId, supplierId, data) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);

  const rfq = new RFQ({
    supplierId,
    title: data.title || '',
    items: data.items || [],
  });

  supplier.addRFQ(rfq);
  supplier.updatedAt = new Date().toISOString();
  return { rfq, supplier: saveSupplier(supplier) };
}

export function quoteRFQ(tenantId, supplierId, rfqId, quotedValue) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);

  const rfq = supplier._rfqs.find(r => r.rfqId === rfqId);
  if (!rfq) throw new SupplierError(`RFQ ${rfqId} not found`, 404);

  rfq.status = 'quoted';
  rfq.quotedValue = quotedValue;
  rfq.quotedAt = new Date().toISOString();
  supplier.updatedAt = new Date().toISOString();
  return { rfq, supplier: saveSupplier(supplier) };
}

export function awardRFQ(tenantId, supplierId, rfqId) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);

  const rfq = supplier._rfqs.find(r => r.rfqId === rfqId);
  if (!rfq) throw new SupplierError(`RFQ ${rfqId} not found`, 404);

  rfq.status = 'awarded';
  rfq.awardedAt = new Date().toISOString();
  supplier.updatedAt = new Date().toISOString();
  return { rfq, supplier: saveSupplier(supplier) };
}

// ── Performance ─────────────────────────────────────────────────────────────

export function recordPerformance(tenantId, supplierId, orderData) {
  const supplier = getSupplier(supplierId);
  if (!supplier) throw new SupplierError(`Supplier ${supplierId} not found`, 404);
  if (supplier.tenantId !== tenantId) throw new SupplierError('Access denied', 403);
  supplier.updatePerformance(orderData);
  return saveSupplier(supplier);
}

// ── Stats ───────────────────────────────────────────────────────────────────

export function getSupplierStats(tenantId) {
  if (!tenantId) throw new SupplierError('tenantId required', 400);
  const suppliers = listSuppliers(tenantId);

  const byStatus = {};
  for (const s of SUPPLIER_STATUSES) byStatus[s] = 0;
  for (const s of suppliers) byStatus[s.status] = (byStatus[s.status] || 0) + 1;

  const byTier = {};
  for (const t of SUPPLIER_TIERS) byTier[t] = 0;
  for (const s of suppliers) byTier[s.tier] = (byTier[s.tier] || 0) + 1;

  const topPerforming = [...suppliers]
    .filter(s => s.status === 'onboarded')
    .sort((a, b) => b.performance.qualityScore - a.performance.qualityScore)
    .slice(0, 5);

  return {
    total: suppliers.length,
    byStatus,
    byTier,
    onboardedCount: byStatus.onboarded || 0,
    topPerforming: topPerforming.map(s => ({
      companyName: s.companyName,
      tier: s.tier,
      qualityScore: Math.round(s.performance.qualityScore),
      onTimeDelivery: Math.round(s.performance.onTimeDelivery),
      totalValue: s.performance.totalValue,
    })),
  };
}
