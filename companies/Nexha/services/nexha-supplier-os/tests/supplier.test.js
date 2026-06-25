/**
 * SupplierOS Tests — Nexha Per-Company Supplier Service
 *
 * ADR-??? Phase 4 (2026-06-25).
 */

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
  clearStore,
} from '../src/models/Supplier.js';

import {
  createSupplier,
  updateSupplier,
  getSupplierDetails,
  listAllSuppliers,
  removeSupplier,
  onboardSupplier,
  suspendSupplier,
  reactivateSupplier,
  addContract,
  createRFQ,
  quoteRFQ,
  awardRFQ,
  recordPerformance,
  getSupplierStats,
  SupplierError,
} from '../src/services/supplier.service.js';

const TENANT = 'tenant_nike';
const OTHER_TENANT = 'tenant_adidas';

function makeSupplier(overrides = {}) {
  return createSupplier(TENANT, {
    companyName: 'Acme Foods Pvt Ltd',
    contactName: 'John Doe',
    email: 'john@acme.com',
    phone: '+91-9876543210',
    categories: ['food', 'spices'],
    paymentTerms: 'NET30',
    creditLimit: 100000,
    ...overrides,
  });
}

beforeEach(() => {
  clearStore();
});

// ── CompanySupplier Model ──────────────────────────────────────────────────

describe('CompanySupplier Model', () => {
  test('creates supplier with defaults', () => {
    const s = new CompanySupplier({ tenantId: TENANT, companyName: 'Test Co' });
    expect(s.status).toBe('prospect');
    expect(s.tier).toBe('bronze');
    expect(s.categories).toEqual([]);
    expect(s.performance.onTimeDelivery).toBe(0);
  });

  test('state machine transitions', () => {
    const s = new CompanySupplier({ tenantId: TENANT, companyName: 'Test' });
    expect(s.canTransitionTo('onboarded')).toBe(true);
    expect(s.canTransitionTo('rejected')).toBe(true);
    expect(s.canTransitionTo('suspended')).toBe(false); // can't suspend prospect

    s.transitionTo('onboarded');
    expect(s.status).toBe('onboarded');
    expect(s.onboardedAt).toBeTruthy();

    expect(s.canTransitionTo('suspended')).toBe(true);
    s.transitionTo('suspended');
    expect(s.status).toBe('suspended');
    expect(s.suspendedAt).toBeTruthy();

    // suspended can go back to onboarded
    expect(s.canTransitionTo('onboarded')).toBe(true);
    s.transitionTo('onboarded');
    expect(s.status).toBe('onboarded');
  });

  test('rejects illegal transitions', () => {
    const s = new CompanySupplier({ tenantId: TENANT, companyName: 'Test' });
    expect(() => s.transitionTo('suspended')).toThrow('Illegal');
    s.transitionTo('onboarded');
    expect(() => s.transitionTo('rejected')).toThrow('Illegal');
    expect(() => s.transitionTo('prospect')).toThrow('Illegal');
  });

  test('auto-upgrade tier on performance', () => {
    const s = new CompanySupplier({ tenantId: TENANT, companyName: 'Test', tier: 'bronze' });
    expect(s.tier).toBe('bronze');

    s.updatePerformance({ deliveredOnTime: true, quality: 92, responseHours: 2, orderValue: 5000 });
    expect(s.performance.totalOrders).toBe(1);
    expect(s.tier).toBe('silver'); // 95% on-time + 90% quality → silver

    s.updatePerformance({ deliveredOnTime: true, quality: 95, responseHours: 1, orderValue: 150000 });
    expect(s.tier).toBe('gold'); // silver + >100K value → gold

    s.updatePerformance({ deliveredOnTime: true, quality: 98, responseHours: 0.5, orderValue: 600000 });
    expect(s.tier).toBe('platinum'); // gold + >500K value → platinum
  });

  test('does not upgrade tier without meeting thresholds', () => {
    const s = new CompanySupplier({ tenantId: TENANT, companyName: 'Test', tier: 'bronze' });
    s.updatePerformance({ deliveredOnTime: false, quality: 70, responseHours: 10, orderValue: 1000 });
    expect(s.tier).toBe('bronze');
  });
});

// ── Contract & RFQ Models ─────────────────────────────────────────────────

describe('Contract Model', () => {
  test('creates contract with defaults', () => {
    const c = new Contract({ supplierId: 'sup-1', title: 'Supply Agreement', value: 50000 });
    expect(c.contractId).toBeTruthy();
    expect(c.status).toBe('draft');
    expect(c.value).toBe(50000);
  });
});

describe('RFQ Model', () => {
  test('creates RFQ with defaults', () => {
    const r = new RFQ({ supplierId: 'sup-1', title: 'Q2 Rice Supply', items: [{ sku: 'RICE-001', qty: 1000 }] });
    expect(r.rfqId).toBeTruthy();
    expect(r.status).toBe('open');
    expect(r.items.length).toBe(1);
  });
});

// ── Supplier CRUD ──────────────────────────────────────────────────────────

describe('Supplier CRUD', () => {
  test('createSupplier saves and returns supplier', () => {
    const s = makeSupplier();
    expect(s.supplierId).toBeTruthy();
    expect(s.tenantId).toBe(TENANT);
    expect(s.companyName).toBe('Acme Foods Pvt Ltd');
    expect(s.status).toBe('prospect');
    expect(s.tier).toBe('bronze');
  });

  test('createSupplier validates required fields', () => {
    expect(() => createSupplier('', { companyName: 'Test' })).toThrow('tenantId required');
    expect(() => createSupplier(TENANT, { companyName: '' })).toThrow('companyName required');
  });

  test('createSupplier generates supplierRef if missing', () => {
    const s = createSupplier(TENANT, { companyName: 'Test Supplier' });
    expect(s.supplierRef).toBeTruthy();
  });

  test('updateSupplier updates fields', () => {
    const s = makeSupplier();
    const updated = updateSupplier(TENANT, s.supplierId, {
      contactName: 'Jane Smith',
      paymentTerms: 'NET60',
      creditLimit: 200000,
    });
    expect(updated.contactName).toBe('Jane Smith');
    expect(updated.paymentTerms).toBe('NET60');
    expect(updated.creditLimit).toBe(200000);
    expect(updated.companyName).toBe('Acme Foods Pvt Ltd'); // unchanged
  });

  test('updateSupplier rejects cross-tenant', () => {
    const s = makeSupplier();
    expect(() => updateSupplier(OTHER_TENANT, s.supplierId, { contactName: 'Hack' })).toThrow('Access denied');
  });

  test('getSupplierDetails returns supplier', () => {
    const s = makeSupplier();
    const found = getSupplierDetails(TENANT, s.supplierId);
    expect(found.supplierId).toBe(s.supplierId);
  });

  test('getSupplierDetails rejects cross-tenant', () => {
    const s = makeSupplier();
    expect(() => getSupplierDetails(OTHER_TENANT, s.supplierId)).toThrow('Access denied');
  });

  test('getSupplierDetails 404 for missing', () => {
    expect(() => getSupplierDetails(TENANT, 'nonexistent')).toThrow('not found');
  });

  test('removeSupplier deletes prospect', () => {
    const s = makeSupplier();
    const result = removeSupplier(TENANT, s.supplierId);
    expect(result.deleted).toBe(true);
    expect(getSupplier(s.supplierId)).toBeNull();
  });

  test('removeSupplier rejects onboarded supplier', () => {
    const s = makeSupplier();
    onboardSupplier(TENANT, s.supplierId);
    expect(() => removeSupplier(TENANT, s.supplierId)).toThrow('Cannot delete onboarded');
  });
});

// ── List Suppliers ────────────────────────────────────────────────────────

describe('listAllSuppliers', () => {
  beforeEach(() => { clearStore(); });

  test('returns tenant-scoped suppliers', () => {
    makeSupplier({ companyName: 'Supplier A' });
    makeSupplier({ companyName: 'Supplier B' });
    createSupplier(OTHER_TENANT, { companyName: 'Supplier C' });

    const mine = listAllSuppliers(TENANT);
    expect(mine.length).toBe(2);
    expect(mine.every(s => s.tenantId === TENANT)).toBe(true);
  });

  test('filter by status', () => {
    const s1 = makeSupplier({ companyName: 'A' });
    const s2 = makeSupplier({ companyName: 'B' });
    onboardSupplier(TENANT, s1.supplierId);

    const onboarded = listAllSuppliers(TENANT, { status: 'onboarded' });
    expect(onboarded.length).toBe(1);
    expect(onboarded[0].companyName).toBe('A');
  });

  test('filter by tier', () => {
    const s1 = makeSupplier({ companyName: 'A', tier: 'silver' });
    makeSupplier({ companyName: 'B', tier: 'bronze' });

    const silver = listAllSuppliers(TENANT, { tier: 'silver' });
    expect(silver.length).toBe(1);
    expect(silver[0].companyName).toBe('A');
  });

  test('filter by category', () => {
    makeSupplier({ companyName: 'Food Co', categories: ['food'] });
    makeSupplier({ companyName: 'Tech Co', categories: ['electronics'] });

    const food = listAllSuppliers(TENANT, { category: 'food' });
    expect(food.length).toBe(1);
    expect(food[0].companyName).toBe('Food Co');
  });
});

// ── State Transitions ────────────────────────────────────────────────────

describe('State Transitions', () => {
  test('onboardSupplier transitions prospect → onboarded', () => {
    const s = makeSupplier();
    const onboarded = onboardSupplier(TENANT, s.supplierId);
    expect(onboarded.status).toBe('onboarded');
    expect(onboarded.onboardedAt).toBeTruthy();
  });

  test('suspendSupplier transitions onboarded → suspended', () => {
    const s = makeSupplier();
    onboardSupplier(TENANT, s.supplierId);
    const suspended = suspendSupplier(TENANT, s.supplierId);
    expect(suspended.status).toBe('suspended');
    expect(suspended.suspendedAt).toBeTruthy();
  });

  test('reactivateSupplier transitions suspended → onboarded', () => {
    const s = makeSupplier();
    onboardSupplier(TENANT, s.supplierId);
    suspendSupplier(TENANT, s.supplierId);
    const reactivated = reactivateSupplier(TENANT, s.supplierId);
    expect(reactivated.status).toBe('onboarded');
  });

  test('cross-tenant access rejected for all transitions', () => {
    const s = makeSupplier();
    expect(() => onboardSupplier(OTHER_TENANT, s.supplierId)).toThrow('Access denied');
    expect(() => suspendSupplier(OTHER_TENANT, s.supplierId)).toThrow('Access denied');
    expect(() => reactivateSupplier(OTHER_TENANT, s.supplierId)).toThrow('Access denied');
  });
});

// ── Contracts ─────────────────────────────────────────────────────────────

describe('Contracts', () => {
  test('addContract creates contract on supplier', () => {
    const s = makeSupplier();
    const { contract, supplier } = addContract(TENANT, s.supplierId, {
      title: 'Annual Supply Agreement',
      value: 250000,
      startDate: '2026-07-01',
      endDate: '2027-06-30',
    });

    expect(contract.supplierId).toBe(s.supplierId);
    expect(contract.title).toBe('Annual Supply Agreement');
    expect(contract.value).toBe(250000);
    expect(supplier._contracts.length).toBe(1);
  });

  test('addContract rejects cross-tenant', () => {
    const s = makeSupplier();
    expect(() => addContract(OTHER_TENANT, s.supplierId, { title: 'Hack' })).toThrow('Access denied');
  });
});

// ── RFQs ─────────────────────────────────────────────────────────────────

describe('RFQs', () => {
  test('createRFQ creates open RFQ', () => {
    const s = makeSupplier();
    const { rfq } = createRFQ(TENANT, s.supplierId, {
      title: 'Q3 Supply RFQ',
      items: [{ sku: 'RICE-001', qty: 5000 }, { sku: 'FLOUR-001', qty: 2000 }],
    });

    expect(rfq.supplierId).toBe(s.supplierId);
    expect(rfq.status).toBe('open');
    expect(rfq.items.length).toBe(2);
  });

  test('quoteRFQ transitions to quoted', () => {
    const s = makeSupplier();
    const { rfq } = createRFQ(TENANT, s.supplierId, { title: 'Test RFQ', items: [] });

    const { rfq: quoted } = quoteRFQ(TENANT, s.supplierId, rfq.rfqId, 125000);
    expect(quoted.status).toBe('quoted');
    expect(quoted.quotedValue).toBe(125000);
    expect(quoted.quotedAt).toBeTruthy();
  });

  test('awardRFQ transitions to awarded', () => {
    const s = makeSupplier();
    const { rfq } = createRFQ(TENANT, s.supplierId, { title: 'Test RFQ', items: [] });
    quoteRFQ(TENANT, s.supplierId, rfq.rfqId, 100000);

    const { rfq: awarded } = awardRFQ(TENANT, s.supplierId, rfq.rfqId);
    expect(awarded.status).toBe('awarded');
    expect(awarded.awardedAt).toBeTruthy();
  });

  test('RFQ operations reject cross-tenant', () => {
    const s = makeSupplier();
    const { rfq } = createRFQ(TENANT, s.supplierId, { title: 'Test', items: [] });
    expect(() => createRFQ(OTHER_TENANT, s.supplierId, { title: 'Hack', items: [] })).toThrow('Access denied');
    expect(() => quoteRFQ(OTHER_TENANT, s.supplierId, rfq.rfqId, 1000)).toThrow('Access denied');
    expect(() => awardRFQ(OTHER_TENANT, s.supplierId, rfq.rfqId)).toThrow('Access denied');
  });
});

// ── Performance ────────────────────────────────────────────────────────────

describe('Performance Tracking', () => {
  test('recordPerformance updates supplier metrics', () => {
    const s = makeSupplier();
    onboardSupplier(TENANT, s.supplierId);

    const updated = recordPerformance(TENANT, s.supplierId, {
      deliveredOnTime: true,
      quality: 95,
      responseHours: 2,
      orderValue: 25000,
    });

    expect(updated.performance.totalOrders).toBe(1);
    expect(updated.performance.onTimeDelivery).toBe(100);
    expect(updated.performance.qualityScore).toBe(95);
    expect(updated.performance.responseTime).toBe(2);
    expect(updated.performance.totalValue).toBe(25000);
  });

  test('recordPerformance accumulates metrics over time', () => {
    const s = makeSupplier();
    onboardSupplier(TENANT, s.supplierId);

    recordPerformance(TENANT, s.supplierId, { deliveredOnTime: true, quality: 80, responseHours: 4, orderValue: 10000 });
    recordPerformance(TENANT, s.supplierId, { deliveredOnTime: true, quality: 90, responseHours: 2, orderValue: 15000 });
    const updated = recordPerformance(TENANT, s.supplierId, { deliveredOnTime: false, quality: 70, responseHours: 6, orderValue: 8000 });

    expect(updated.performance.totalOrders).toBe(3);
    expect(updated.performance.onTimeDelivery).toBeCloseTo(66.67, 1);
    expect(updated.performance.qualityScore).toBeCloseTo(80, 1);
    expect(updated.performance.totalValue).toBe(33000);
  });

  test('recordPerformance rejects cross-tenant', () => {
    const s = makeSupplier();
    onboardSupplier(TENANT, s.supplierId);
    expect(() => recordPerformance(OTHER_TENANT, s.supplierId, {
      deliveredOnTime: true, quality: 90, responseHours: 1, orderValue: 5000,
    })).toThrow('Access denied');
  });
});

// ── Stats ─────────────────────────────────────────────────────────────────

describe('getSupplierStats', () => {
  beforeEach(() => { clearStore(); });

  test('returns correct counts', () => {
    const s1 = makeSupplier({ companyName: 'A' });
    const s2 = makeSupplier({ companyName: 'B' });
    const s3 = makeSupplier({ companyName: 'C' });
    onboardSupplier(TENANT, s1.supplierId);
    onboardSupplier(TENANT, s2.supplierId);

    const stats = getSupplierStats(TENANT);
    expect(stats.total).toBe(3);
    expect(stats.byStatus.prospect).toBe(1);
    expect(stats.byStatus.onboarded).toBe(2);
    expect(stats.onboardedCount).toBe(2);
  });

  test('includes top performing suppliers', () => {
    const s1 = makeSupplier({ companyName: 'Low Quality' });
    const s2 = makeSupplier({ companyName: 'High Quality' });
    onboardSupplier(TENANT, s1.supplierId);
    onboardSupplier(TENANT, s2.supplierId);

    recordPerformance(TENANT, s1.supplierId, { deliveredOnTime: false, quality: 50, responseHours: 10, orderValue: 5000 });
    recordPerformance(TENANT, s2.supplierId, { deliveredOnTime: true, quality: 95, responseHours: 1, orderValue: 50000 });

    const stats = getSupplierStats(TENANT);
    expect(stats.topPerforming.length).toBeLessThanOrEqual(5);
    expect(stats.topPerforming[0].companyName).toBe('High Quality');
  });
});
