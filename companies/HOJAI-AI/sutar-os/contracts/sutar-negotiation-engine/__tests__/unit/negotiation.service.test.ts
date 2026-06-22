/**
 * SUTAR Negotiation Engine - NegotiationService Unit Tests
 */

import { negotiationService } from '../../src/services/negotiation.service.js';
import type { CreateNegotiationDto, Product, Term } from '../../src/types/index.js';

const product: Product = {
  name: 'Basmati Rice',
  description: 'Premium aged rice',
  quantity: 100,
  unit: 'kg',
  category: 'grocery',
};

const buyer = {
  name: 'Rejaul Karim',
  email: 'rejaul@example.com',
  role: 'buyer' as const,
  organization: 'Do App',
};

const seller = {
  name: 'Bharat Grocers',
  email: 'sales@bharatgrocers.in',
  role: 'seller' as const,
  organization: 'Bharat Grocers Pvt Ltd',
};

const terms: Omit<Term, 'id'>[] = [
  { type: 'price', label: 'Total Price', value: 50000, isFlexible: true, priority: 'required' },
  { type: 'delivery', label: 'Delivery Date', value: '2026-07-15', isFlexible: true, priority: 'preferred' },
  { type: 'payment', label: 'Payment Terms', value: 'Net 30', isFlexible: true, priority: 'preferred' },
];

function makeDto(overrides: Partial<CreateNegotiationDto> = {}): CreateNegotiationDto {
  return {
    title: 'Buy 100kg Basmati Rice',
    description: 'Need premium aged rice for restaurant',
    type: 'rfq',
    buyer,
    seller,
    product,
    targetPrice: 48000,
    currency: 'INR',
    terms,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdBy: 'user-1',
    tenantId: 'tenant-1',
    ...overrides,
  };
}

describe('NegotiationService - CRUD', () => {
  it('creates a negotiation in draft status', () => {
    const dto = makeDto();
    const n = negotiationService.create(dto);
    expect(n.status).toBe('draft');
    expect(n.title).toBe(dto.title);
    expect(n.buyer.name).toBe(buyer.name);
    expect(n.seller?.name).toBe(seller.name);
    expect(n.product.name).toBe(product.name);
    expect(n.targetPrice).toBe(48000);
    expect(n.currency).toBe('INR');
    expect(n.terms.length).toBe(3);
    expect(n.auditTrail.length).toBe(1);
    expect(n.auditTrail[0].action).toBe('created');
  });

  it('retrieves a negotiation by id', () => {
    const created = negotiationService.create(makeDto());
    const retrieved = negotiationService.get(created.id);
    expect(retrieved?.id).toBe(created.id);
  });

  it('returns undefined for non-existent id', () => {
    const result = negotiationService.get('does-not-exist');
    expect(result).toBeUndefined();
  });

  it('queries by tenant', () => {
    negotiationService.create(makeDto({ tenantId: 'tenant-A', title: 'A1' }));
    negotiationService.create(makeDto({ tenantId: 'tenant-A', title: 'A2' }));
    negotiationService.create(makeDto({ tenantId: 'tenant-B', title: 'B1' }));
    const result = negotiationService.query({ tenantId: 'tenant-A' });
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    expect(result.data.every(n => n.tenantId === 'tenant-A')).toBe(true);
  });

  it('queries with status filter', () => {
    const n = negotiationService.create(makeDto({ title: 'FilterTest' }));
    negotiationService.updateStatus(n.id, 'negotiating', 'user-1');
    const result = negotiationService.query({ tenantId: n.tenantId, status: 'negotiating' });
    expect(result.data.some(x => x.id === n.id)).toBe(true);
  });

  it('queries with search', () => {
    const n = negotiationService.create(makeDto({ title: 'UniqueBasmatiOrder' }));
    const result = negotiationService.query({ tenantId: n.tenantId, search: 'UniqueBasmati' });
    expect(result.data.some(x => x.id === n.id)).toBe(true);
  });

  it('paginates query results', () => {
    for (let i = 0; i < 5; i++) {
      negotiationService.create(makeDto({ title: `Page-${i}`, tenantId: 'paginate-tenant' }));
    }
    const page1 = negotiationService.query({ tenantId: 'paginate-tenant', page: 1, limit: 2 });
    expect(page1.data.length).toBe(2);
    expect(page1.pagination.total).toBeGreaterThanOrEqual(5);
  });
});

describe('NegotiationService - Status', () => {
  it('transitions status and records audit trail', () => {
    const n = negotiationService.create(makeDto());
    const updated = negotiationService.updateStatus(n.id, 'negotiating', 'user-1');
    expect(updated.status).toBe('negotiating');
    expect(updated.metadata.version).toBe(2);
    expect(updated.auditTrail.length).toBe(2);
    expect(updated.auditTrail[1].action).toBe('status_changed');
    expect(updated.auditTrail[1].previousValue).toBe('draft');
    expect(updated.auditTrail[1].newValue).toBe('negotiating');
  });

  it('sets completedAt on terminal status', () => {
    const n = negotiationService.create(makeDto());
    const updated = negotiationService.updateStatus(n.id, 'cancelled', 'user-1');
    expect(updated.completedAt).toBeDefined();
  });

  it('cancels with reason', () => {
    const n = negotiationService.create(makeDto());
    const cancelled = negotiationService.cancel(n.id, 'user-1', 'Supplier out of stock');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.auditTrail.some(a => a.action === 'cancel_reason' && a.details === 'Supplier out of stock')).toBe(true);
  });
});

describe('NegotiationService - Offers & Counters', () => {
  let negotiationId: string;
  let buyerId: string;
  let sellerId: string;

  beforeEach(() => {
    const n = negotiationService.create(makeDto());
    negotiationId = n.id;
    buyerId = n.buyer.id;
    sellerId = n.seller!.id;
  });

  it('adds an offer and updates currentOffer', () => {
    const n = negotiationService.addOffer(negotiationId, sellerId, {
      amount: 55000,
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(n.currentOffer?.amount).toBe(55000);
    expect(n.currentPrice).toBe(55000);
    expect(n.offerHistory.length).toBe(1);
    expect(n.status).toBe('negotiating');
  });

  it('auto-generates a buyer counter (ZOPA-based)', () => {
    negotiationService.addOffer(negotiationId, sellerId, {
      amount: 60000, // above buyer's target
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const result = negotiationService.generateCounter({
      negotiationId,
      partyId: buyerId,
      buyerMax: 50000,
      sellerMin: 40000,
      strategy: 'collaborative',
    });
    expect(result.counterOffers.length).toBe(1);
    expect(result.counterOffers[0].amount).toBeLessThan(60000);
    expect(result.counterOffers[0].amount).toBeGreaterThanOrEqual(40000);
    expect(result.status).toBe('awaiting_response');
  });

  it('auto-generates a seller counter (ZOPA-based)', () => {
    negotiationService.addOffer(negotiationId, buyerId, {
      amount: 35000, // below seller's reservation
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const result = negotiationService.generateCounter({
      negotiationId,
      partyId: sellerId,
      buyerMax: 50000,
      sellerMin: 40000,
      strategy: 'collaborative',
    });
    expect(result.counterOffers[0].amount).toBeGreaterThan(35000);
    expect(result.counterOffers[0].amount).toBeLessThanOrEqual(50000);
  });

  it('manually adds a counter-offer', () => {
    negotiationService.addOffer(negotiationId, sellerId, {
      amount: 60000,
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const result = negotiationService.addCounterOffer(buyerId, {
      negotiationId,
      amount: 45000,
      currency: 'INR',
      terms: terms.map(t => ({ ...t })),
      message: 'Best we can do',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    expect(result.counterOffers.length).toBe(1);
    expect(result.counterOffers[0].amount).toBe(45000);
    expect(result.status).toBe('awaiting_response');
  });

  it('accepts an offer and finalizes the deal', () => {
    negotiationService.addOffer(negotiationId, sellerId, {
      amount: 45000,
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const result = negotiationService.acceptOffer(negotiationId, buyerId);
    expect(result.status).toBe('accepted');
    expect(result.currentOffer?.status).toBe('accepted');
    expect(result.completedAt).toBeDefined();
  });

  it('rejects an offer and records reason', () => {
    negotiationService.addOffer(negotiationId, sellerId, {
      amount: 90000,
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const result = negotiationService.rejectOffer(negotiationId, buyerId, 'Way over budget');
    expect(result.status).toBe('rejected');
    expect(result.auditTrail.some(a => a.action === 'offer_rejected' && a.details === 'Way over budget')).toBe(true);
  });
});

describe('NegotiationService - ZOPA Analysis', () => {
  it('analyzes ZOPA for a negotiation with current offer', () => {
    const n = negotiationService.create(makeDto());
    negotiationService.addOffer(n.id, n.seller!.id, {
      amount: 60000,
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const analysis = negotiationService.analyzeZOPA(n.id, 50000, 40000);
    expect(analysis.zopa.hasOverlap).toBe(true);
    expect(analysis.zopa.zopaWidth).toBe(10000);
    expect(analysis.zopa.zopaMidpoint).toBe(45000);
    expect(analysis.schedule.schedule.length).toBeGreaterThan(0);
  });
});

describe('NegotiationService - AXP Protocol', () => {
  it('starts and progresses an AXP session', () => {
    const n = negotiationService.create(makeDto());
    negotiationService.addOffer(n.id, n.seller!.id, {
      amount: 50000,
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const session = negotiationService.startAXP(n.id, [n.buyer.id, n.seller!.id]);
    expect(session.status).toBe('active');
    expect(session.history.length).toBe(0);

    const responded = negotiationService.respondAXP(session.id, {
      negotiationId: n.id,
      partyId: n.buyer.id,
      response: 'accept',
      message: 'Deal!',
    });
    expect(responded.history.length).toBe(1);
    expect(responded.status).toBe('completed');
  });

  it('rejects in AXP closes the session', () => {
    const n = negotiationService.create(makeDto());
    negotiationService.addOffer(n.id, n.seller!.id, {
      amount: 50000,
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const session = negotiationService.startAXP(n.id, [n.buyer.id, n.seller!.id]);
    const responded = negotiationService.respondAXP(session.id, {
      negotiationId: n.id,
      partyId: n.buyer.id,
      response: 'reject',
      message: 'No deal',
    });
    expect(responded.status).toBe('completed');
  });
});

describe('NegotiationService - Stats', () => {
  it('computes tenant-level statistics', () => {
    const tenantId = `stats-${Date.now()}`;
    const a = negotiationService.create(makeDto({ tenantId, title: 'A' }));
    const b = negotiationService.create(makeDto({ tenantId, title: 'B' }));
    negotiationService.addOffer(a.id, a.seller!.id, {
      amount: 45000,
      currency: 'INR',
      terms: [],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    negotiationService.acceptOffer(a.id, a.buyer.id);

    const stats = negotiationService.stats(tenantId);
    expect(stats.total).toBeGreaterThanOrEqual(2);
    expect(stats.byStatus.accepted).toBeGreaterThanOrEqual(1);
    expect(stats.completed).toBeGreaterThanOrEqual(1);
    expect(stats.totalValue).toBeGreaterThanOrEqual(45000);
  });
});
