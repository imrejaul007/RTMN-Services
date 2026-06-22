/**
 * SUTAR Negotiation Engine - Zod Validators Unit Tests
 *
 * Validators are the security-critical input gate for the negotiation API.
 * They reject malformed input BEFORE any business logic runs. Tests cover
 * happy paths + every failure case (length, type, enum, range, missing).
 */

import { describe, it, expect } from 'vitest';
import {
  CreateNegotiationSchema,
  NegotiationQuerySchema,
  AddOfferSchema,
  CounterOfferSchema,
  GenerateCounterSchema,
  AnalyzeZOPASchema,
  CancelSchema,
  RejectSchema,
  AXPStartSchema,
  AXPResponseSchema,
  IdParamSchema,
} from '../../src/validators/negotiation.js';

const baseParty = {
  name: 'Alice',
  email: 'alice@example.com',
  role: 'buyer' as const,
};

const baseProduct = {
  name: 'Widget',
  quantity: 10,
  unit: 'pcs',
};

const baseTerm = {
  type: 'price' as const,
  label: 'unit price',
  value: 100,
  isFlexible: true,
  priority: 'preferred' as const,
};

const validCreate = {
  title: 'Test negotiation',
  type: 'rfq' as const,
  buyer: baseParty,
  product: baseProduct,
  createdBy: 'user-1',
  tenantId: 'tenant-1',
};

describe('CreateNegotiationSchema', () => {
  it('accepts a valid minimal payload', () => {
    const r = CreateNegotiationSchema.parse(validCreate);
    expect(r.title).toBe('Test negotiation');
    expect(r.currency).toBe('INR'); // default
  });

  it('rejects empty title', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, title: '' })).toThrow();
  });

  it('rejects title over 200 chars', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, title: 'x'.repeat(201) })).toThrow();
  });

  it('rejects description over 2000 chars', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, description: 'x'.repeat(2001) })).toThrow();
  });

  it('rejects invalid type', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, type: 'garbage' })).toThrow();
  });

  it('rejects negative quantity', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, product: { ...baseProduct, quantity: -1 } })).toThrow();
  });

  it('rejects zero quantity', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, product: { ...baseProduct, quantity: 0 } })).toThrow();
  });

  it('rejects invalid email in buyer', () => {
    expect(() => CreateNegotiationSchema.parse({
      ...validCreate,
      buyer: { ...baseParty, email: 'not-an-email' },
    })).toThrow();
  });

  it('rejects negative targetPrice', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, targetPrice: -1 })).toThrow();
  });

  it('rejects zero targetPrice', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, targetPrice: 0 })).toThrow();
  });

  it('rejects unknown currency', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, currency: 'XYZ' })).toThrow();
  });

  it('accepts all valid currencies', () => {
    for (const c of ['INR', 'USD', 'EUR', 'GBP', 'AED']) {
      const r = CreateNegotiationSchema.parse({ ...validCreate, currency: c });
      expect(r.currency).toBe(c);
    }
  });

  it('rejects missing createdBy', () => {
    expect(() => CreateNegotiationSchema.parse({ ...validCreate, createdBy: '' })).toThrow();
  });

  it('coerces deadline from string to Date', () => {
    const r = CreateNegotiationSchema.parse({ ...validCreate, deadline: '2026-12-31T00:00:00Z' });
    expect(r.deadline).toBeInstanceOf(Date);
  });
});

describe('NegotiationQuerySchema', () => {
  it('accepts tenantId alone', () => {
    const r = NegotiationQuerySchema.parse({ tenantId: 't1' });
    expect(r.tenantId).toBe('t1');
    expect(r.page).toBe(1); // default
    expect(r.limit).toBe(20); // default
  });

  it('coerces page string to number', () => {
    const r = NegotiationQuerySchema.parse({ tenantId: 't1', page: '5' });
    expect(r.page).toBe(5);
  });

  it('rejects non-positive page', () => {
    expect(() => NegotiationQuerySchema.parse({ tenantId: 't1', page: '0' })).toThrow();
    expect(() => NegotiationQuerySchema.parse({ tenantId: 't1', page: '-1' })).toThrow();
  });

  it('rejects limit over 100', () => {
    expect(() => NegotiationQuerySchema.parse({ tenantId: 't1', limit: '101' })).toThrow();
  });

  it('rejects unknown status enum', () => {
    expect(() => NegotiationQuerySchema.parse({ tenantId: 't1', status: 'bogus' })).toThrow();
  });

  it('accepts all valid status enums', () => {
    for (const status of ['draft', 'rfq_sent', 'quote_received', 'negotiating', 'awaiting_response', 'accepted', 'rejected', 'expired', 'cancelled']) {
      const r = NegotiationQuerySchema.parse({ tenantId: 't1', status });
      expect(r.status).toBe(status);
    }
  });
});

describe('AddOfferSchema', () => {
  const valid = {
    partyId: 'p1',
    amount: 100,
    currency: 'USD' as const,
    terms: [baseTerm],
    validUntil: new Date().toISOString(),
  };

  it('accepts a valid offer', () => {
    const r = AddOfferSchema.parse(valid);
    expect(r.amount).toBe(100);
    expect(r.terms).toHaveLength(1);
  });

  it('defaults empty terms to []', () => {
    const r = AddOfferSchema.parse({ ...valid, terms: undefined });
    expect(r.terms).toEqual([]);
  });

  it('rejects zero amount', () => {
    expect(() => AddOfferSchema.parse({ ...valid, amount: 0 })).toThrow();
  });

  it('rejects negative amount', () => {
    expect(() => AddOfferSchema.parse({ ...valid, amount: -5 })).toThrow();
  });

  it('rejects message over 1000 chars', () => {
    expect(() => AddOfferSchema.parse({ ...valid, message: 'x'.repeat(1001) })).toThrow();
  });
});

describe('CounterOfferSchema', () => {
  const valid = {
    negotiationId: 'n1',
    amount: 90,
    currency: 'USD' as const,
    terms: [baseTerm],
    message: 'How about this?',
    validUntil: new Date().toISOString(),
  };

  it('accepts a valid counter', () => {
    const r = CounterOfferSchema.parse(valid);
    expect(r.amount).toBe(90);
  });

  it('rejects empty message', () => {
    expect(() => CounterOfferSchema.parse({ ...valid, message: '' })).toThrow();
  });

  it('rejects message over 1000 chars', () => {
    expect(() => CounterOfferSchema.parse({ ...valid, message: 'x'.repeat(1001) })).toThrow();
  });
});

describe('GenerateCounterSchema', () => {
  const valid = {
    negotiationId: 'n1',
    partyId: 'p1',
    buyerMax: 100,
    sellerMin: 60,
  };

  it('accepts valid input with default strategy', () => {
    const r = GenerateCounterSchema.parse(valid);
    expect(r.buyerMax).toBe(100);
  });

  it('accepts all 5 strategy enums', () => {
    for (const strategy of ['competitive', 'collaborative', 'accommodating', 'compromising', 'principled']) {
      const r = GenerateCounterSchema.parse({ ...valid, strategy });
      expect(r.strategy).toBe(strategy);
    }
  });

  it('rejects customConcession < 0', () => {
    expect(() => GenerateCounterSchema.parse({ ...valid, customConcession: -0.1 })).toThrow();
  });

  it('rejects customConcession > 1', () => {
    expect(() => GenerateCounterSchema.parse({ ...valid, customConcession: 1.1 })).toThrow();
  });

  it('accepts customConcession at boundaries 0 and 1', () => {
    expect(GenerateCounterSchema.parse({ ...valid, customConcession: 0 }).customConcession).toBe(0);
    expect(GenerateCounterSchema.parse({ ...valid, customConcession: 1 }).customConcession).toBe(1);
  });
});

describe('AnalyzeZOPASchema', () => {
  it('coerces string numbers', () => {
    const r = AnalyzeZOPASchema.parse({ buyerMax: '100', sellerMin: '60' });
    expect(r.buyerMax).toBe(100);
    expect(r.sellerMin).toBe(60);
  });

  it('rejects zero values', () => {
    expect(() => AnalyzeZOPASchema.parse({ buyerMax: 0, sellerMin: 60 })).toThrow();
    expect(() => AnalyzeZOPASchema.parse({ buyerMax: 100, sellerMin: 0 })).toThrow();
  });

  it('rejects negative values', () => {
    expect(() => AnalyzeZOPASchema.parse({ buyerMax: -1, sellerMin: 60 })).toThrow();
  });
});

describe('CancelSchema & RejectSchema', () => {
  it('CancelSchema accepts no reason', () => {
    expect(() => CancelSchema.parse({})).not.toThrow();
  });

  it('CancelSchema accepts reason up to 500 chars', () => {
    expect(() => CancelSchema.parse({ reason: 'x'.repeat(500) })).not.toThrow();
  });

  it('CancelSchema rejects reason over 500 chars', () => {
    expect(() => CancelSchema.parse({ reason: 'x'.repeat(501) })).toThrow();
  });

  it('RejectSchema accepts no reason', () => {
    expect(() => RejectSchema.parse({})).not.toThrow();
  });

  it('RejectSchema rejects reason over 500 chars', () => {
    expect(() => RejectSchema.parse({ reason: 'x'.repeat(501) })).toThrow();
  });
});

describe('AXPStartSchema', () => {
  it('accepts 1-10 party IDs', () => {
    expect(() => AXPStartSchema.parse({ partyIds: ['p1'] })).not.toThrow();
    expect(() => AXPStartSchema.parse({ partyIds: Array.from({ length: 10 }, (_, i) => `p${i}`) })).not.toThrow();
  });

  it('rejects empty array', () => {
    expect(() => AXPStartSchema.parse({ partyIds: [] })).toThrow();
  });

  it('rejects more than 10 parties', () => {
    expect(() => AXPStartSchema.parse({ partyIds: Array.from({ length: 11 }, (_, i) => `p${i}`) })).toThrow();
  });
});

describe('AXPResponseSchema', () => {
  const valid = { partyId: 'p1', response: 'accept' as const };

  it('accepts minimal payload', () => {
    expect(() => AXPResponseSchema.parse(valid)).not.toThrow();
  });

  it('accepts all 4 response enums', () => {
    for (const response of ['accept', 'counter', 'reject', 'expire']) {
      expect(() => AXPResponseSchema.parse({ ...valid, response })).not.toThrow();
    }
  });

  it('rejects unknown response enum', () => {
    expect(() => AXPResponseSchema.parse({ ...valid, response: 'maybe' })).toThrow();
  });

  it('accepts nested offer with amount/currency/terms', () => {
    const r = AXPResponseSchema.parse({
      ...valid,
      offer: { amount: 50, currency: 'USD', terms: [baseTerm] },
    });
    expect(r.offer?.amount).toBe(50);
  });

  it('rejects empty partyId', () => {
    expect(() => AXPResponseSchema.parse({ ...valid, partyId: '' })).toThrow();
  });
});

describe('IdParamSchema', () => {
  it('accepts non-empty id', () => {
    expect(() => IdParamSchema.parse({ id: 'abc123' })).not.toThrow();
  });

  it('rejects empty id', () => {
    expect(() => IdParamSchema.parse({ id: '' })).toThrow();
  });

  it('rejects id over 100 chars', () => {
    expect(() => IdParamSchema.parse({ id: 'x'.repeat(101) })).toThrow();
  });
});
