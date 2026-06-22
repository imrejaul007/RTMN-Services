/**
 * sutar-trade-finance — unit tests.
 *
 * Covers: entity registration, credit offers (5 risk bands), auto-decline
 * rules, loan origination/disbursal, repayments, disputes, FX quotes,
 * network stats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as svc from '../../src/services/trade-finance.service.js';
import type { Entity } from '../../src/types/index.js';

beforeEach(() => {
  svc._resetForTests();
});

function seedEntity(overrides: Partial<Entity> = {}): Entity {
  const e: Entity = {
    entityId: 'ent-1',
    trustScore: 75,
    priorLoansCount: 0,
    priorDefaultsCount: 0,
    annualRevenueInr: 2_000_000,
    sector: 'retail',
    monthsInBusiness: 24,
    ...overrides,
  };
  svc.registerEntity(e);
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity registration
// ─────────────────────────────────────────────────────────────────────────────

describe('Entity registration', () => {
  it('registers and retrieves an entity', () => {
    const e = seedEntity({ entityId: 'ent-A' });
    expect(svc.getEntity('ent-A')).toEqual(e);
  });

  it('returns null for unknown entity', () => {
    expect(svc.getEntity('nobody')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Credit offers — risk bands
// ─────────────────────────────────────────────────────────────────────────────

describe('Credit offers — risk bands', () => {
  it('Band A: trust≥85, no defaults, >5M revenue, >12mo', () => {
    seedEntity({ entityId: 'A', trustScore: 90, annualRevenueInr: 10_000_000, monthsInBusiness: 24 });
    const offer = svc.requestCreditOffer({ entityId: 'A', amount: 500_000, currency: 'INR', termMonths: 6 });
    expect(offer.approved).toBe(true);
    expect(offer.riskBand).toBe('A');
    expect(offer.apr).toBe(0.12);
    expect(offer.disbursalSpeed).toBe('instant');
  });

  it('Band B: trust≥70, ≤1 default, >1M revenue, >6mo', () => {
    seedEntity({ entityId: 'B', trustScore: 75, priorDefaultsCount: 1, annualRevenueInr: 2_000_000, monthsInBusiness: 12 });
    const offer = svc.requestCreditOffer({ entityId: 'B', amount: 200_000, currency: 'INR', termMonths: 6 });
    expect(offer.approved).toBe(true);
    expect(offer.riskBand).toBe('B');
    expect(offer.apr).toBe(0.16);
    expect(offer.disbursalSpeed).toBe('same-day');
  });

  it('Band C: trust≥55, ≤2 defaults, >250k revenue, >3mo', () => {
    seedEntity({ entityId: 'C', trustScore: 60, priorDefaultsCount: 2, annualRevenueInr: 500_000, monthsInBusiness: 6 });
    const offer = svc.requestCreditOffer({ entityId: 'C', amount: 50_000, currency: 'INR', termMonths: 3 });
    expect(offer.approved).toBe(true);
    expect(offer.riskBand).toBe('C');
    expect(offer.apr).toBe(0.21);
  });

  it('Band D: trust≥40, lower limits', () => {
    seedEntity({ entityId: 'D', trustScore: 45, annualRevenueInr: 200_000, monthsInBusiness: 4 });
    const offer = svc.requestCreditOffer({ entityId: 'D', amount: 20_000, currency: 'INR', termMonths: 3 });
    expect(offer.approved).toBe(true);
    expect(offer.riskBand).toBe('D');
    expect(offer.apr).toBe(0.28);
  });

  it('Band E: trust<40, approved at 0.36 APR with tight limits', () => {
    seedEntity({ entityId: 'E', trustScore: 35, annualRevenueInr: 100_000, monthsInBusiness: 6 });
    const offer = svc.requestCreditOffer({ entityId: 'E', amount: 5_000, currency: 'INR', termMonths: 3 });
    expect(offer.riskBand).toBe('E');
    expect(offer.apr).toBe(0.36);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Credit offers — auto-declines
// ─────────────────────────────────────────────────────────────────────────────

describe('Credit offers — auto-declines', () => {
  it('declines when months in business < 1', () => {
    seedEntity({ entityId: 'new', monthsInBusiness: 0 });
    const offer = svc.requestCreditOffer({ entityId: 'new', amount: 50_000, currency: 'INR', termMonths: 3 });
    expect(offer.approved).toBe(false);
    expect(offer.declineReason).toBe('insufficient_tenure');
  });

  it('declines when prior defaults >= 3', () => {
    seedEntity({ entityId: 'bad', priorDefaultsCount: 3 });
    const offer = svc.requestCreditOffer({ entityId: 'bad', amount: 50_000, currency: 'INR', termMonths: 3 });
    expect(offer.approved).toBe(false);
    expect(offer.declineReason).toBe('excessive_defaults');
  });

  it('declines when trust score < 25', () => {
    seedEntity({ entityId: 'untrustworthy', trustScore: 20 });
    const offer = svc.requestCreditOffer({ entityId: 'untrustworthy', amount: 50_000, currency: 'INR', termMonths: 3 });
    expect(offer.approved).toBe(false);
    expect(offer.declineReason).toBe('trust_below_threshold');
  });

  it('declines when amount > 5,000,000 INR platform cap', () => {
    seedEntity({ entityId: 'big' });
    const offer = svc.requestCreditOffer({ entityId: 'big', amount: 6_000_000, currency: 'INR', termMonths: 12 });
    expect(offer.approved).toBe(false);
    expect(offer.declineReason).toBe('amount_exceeds_platform_max');
  });

  it('declines when amount > 2x annual revenue (over-leverage)', () => {
    seedEntity({ entityId: 'small', annualRevenueInr: 100_000 });
    const offer = svc.requestCreditOffer({ entityId: 'small', amount: 250_000, currency: 'INR', termMonths: 3 });
    expect(offer.approved).toBe(false);
    expect(offer.declineReason).toBe('over_leveraged');
  });

  it('declines when entity is unknown', () => {
    const offer = svc.requestCreditOffer({ entityId: 'unknown', amount: 50_000, currency: 'INR', termMonths: 3 });
    expect(offer.approved).toBe(false);
    expect(offer.declineReason).toBe('entity_not_found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Credit offers — math
// ─────────────────────────────────────────────────────────────────────────────

describe('Credit offers — math', () => {
  it('approved amount is capped by limit multiplier × revenue × term', () => {
    seedEntity({ entityId: 'cap', trustScore: 75, annualRevenueInr: 2_000_000, monthsInBusiness: 12 });
    // Band B: 0.20 multiplier × 2M × (12/12) = 400,000 max
    const offer = svc.requestCreditOffer({ entityId: 'cap', amount: 500_000, currency: 'INR', termMonths: 12 });
    expect(offer.approvedAmount).toBe(400_000);
  });

  it('totalRepayable includes principal + interest + 2% origination fee', () => {
    seedEntity({ entityId: 'm', trustScore: 90, annualRevenueInr: 10_000_000, monthsInBusiness: 24 });
    const offer = svc.requestCreditOffer({ entityId: 'm', amount: 100_000, currency: 'INR', termMonths: 12 });
    // 100k + (100k × 0.12 × 1) + 2k fee = 114000
    expect(offer.approvedAmount).toBe(100_000);
    expect(offer.totalRepayable).toBe(114_000);
    expect(offer.monthlyInstallment).toBe(9_500); // 114k / 12
    expect(offer.originationFeeInr).toBe(2_000);
  });

  it('offer has a 7-day validity window', () => {
    seedEntity();
    const before = Date.now();
    const offer = svc.requestCreditOffer({ entityId: 'ent-1', amount: 50_000, currency: 'INR', termMonths: 3 });
    const validMs = new Date(offer.validUntil).getTime() - before;
    expect(validMs).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
    expect(validMs).toBeLessThan(7.1 * 24 * 60 * 60 * 1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Loan origination
// ─────────────────────────────────────────────────────────────────────────────

describe('Loans', () => {
  function approvedOffer() {
    seedEntity({ entityId: 'lender', trustScore: 90, annualRevenueInr: 10_000_000, monthsInBusiness: 24 });
    return svc.requestCreditOffer({ entityId: 'lender', amount: 100_000, currency: 'INR', termMonths: 6 });
  }

  it('originateLoan creates a loan from an approved offer', () => {
    const offer = approvedOffer();
    const result = svc.originateLoan(offer.offerId) as any;
    expect(result.id).toBeDefined();
    expect(result.status).toBe('pending_disbursal');
    expect(result.principal).toBe(offer.approvedAmount);
    expect(result.outstandingBalance).toBe(offer.totalRepayable);
  });

  it('rejects origination of unknown offer', () => {
    const r = svc.originateLoan('nope');
    expect('error' in r && r.error).toBe('offer_not_found');
  });

  it('rejects origination of declined offer', () => {
    const declined = svc.requestCreditOffer({ entityId: 'unknown', amount: 50_000, currency: 'INR', termMonths: 3 });
    const r = svc.originateLoan(declined.offerId);
    expect('error' in r && r.error).toBe('offer_not_approved');
  });

  it('disburseLoan moves status from pending_disbursal to active', () => {
    const offer = approvedOffer();
    const loan = svc.originateLoan(offer.offerId) as any;
    const disbursed = svc.disburseLoan(loan.id) as any;
    expect(disbursed.status).toBe('active');
    expect(disbursed.disbursedAt).not.toBeNull();
  });

  it('rejects disbursal of unknown loan', () => {
    const r = svc.disburseLoan('nope');
    expect('error' in r);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Repayments
// ─────────────────────────────────────────────────────────────────────────────

describe('Repayments', () => {
  function activeLoan() {
    seedEntity({ entityId: 'rep', trustScore: 90, annualRevenueInr: 10_000_000, monthsInBusiness: 24 });
    const offer = svc.requestCreditOffer({ entityId: 'rep', amount: 120_000, currency: 'INR', termMonths: 6 });
    const loan = svc.originateLoan(offer.offerId) as any;
    svc.disburseLoan(loan.id);
    return loan;
  }

  it('records a repayment and reduces outstanding balance', () => {
    const loan = activeLoan();
    const initialBalance = svc.getLoan(loan.id)!.outstandingBalance;
    const r = svc.recordRepayment(loan.id, 10_000, 'manual', 1) as any;
    expect(r.amount).toBe(10_000);
    const updated = svc.getLoan(loan.id)!;
    expect(updated.outstandingBalance).toBe(initialBalance - 10_000);
    expect(updated.repaidAmount).toBe(10_000);
  });

  it('marks loan paid_off when fully repaid', () => {
    const loan = activeLoan();
    const fullAmount = loan.outstandingBalance;
    svc.recordRepayment(loan.id, fullAmount, 'wallet', 6);
    const updated = svc.getLoan(loan.id)!;
    expect(updated.status).toBe('paid_off');
    expect(updated.outstandingBalance).toBe(0);
  });

  it('rejects repayment exceeding outstanding balance', () => {
    const loan = activeLoan();
    const r = svc.recordRepayment(loan.id, loan.outstandingBalance + 1, 'manual');
    expect('error' in r && r.error).toBe('amount_exceeds_outstanding');
  });

  it('rejects repayment on unknown loan', () => {
    const r = svc.recordRepayment('nope', 100, 'manual');
    expect('error' in r && r.error).toBe('loan_not_found');
  });

  it('lists repayments in chronological order', () => {
    const loan = activeLoan();
    svc.recordRepayment(loan.id, 5_000, 'manual', 1);
    svc.recordRepayment(loan.id, 5_000, 'manual', 2);
    svc.recordRepayment(loan.id, 5_000, 'manual', 3);
    const list = svc.listRepayments(loan.id);
    expect(list.length).toBe(3);
    expect(list[0].installmentNumber).toBe(1);
    expect(list[2].installmentNumber).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────────────────────────

describe('Disputes', () => {
  function activeLoan() {
    seedEntity({ entityId: 'd', trustScore: 90, annualRevenueInr: 10_000_000, monthsInBusiness: 24 });
    const offer = svc.requestCreditOffer({ entityId: 'd', amount: 100_000, currency: 'INR', termMonths: 6 });
    const loan = svc.originateLoan(offer.offerId) as any;
    svc.disburseLoan(loan.id);
    return loan;
  }

  it('opens a dispute on an active loan', () => {
    const loan = activeLoan();
    const d = svc.openDispute(loan.id, 5_000, 'goods_not_received') as any;
    expect(d.status).toBe('open');
    expect(d.resolution).toBeNull();
  });

  it('resolves a dispute in favor of buyer', () => {
    const loan = activeLoan();
    const d = svc.openDispute(loan.id, 5_000, 'damaged') as any;
    const resolved = svc.resolveDispute(d.id, 'resolved_buyer', 'photos confirmed damage') as any;
    expect(resolved.status).toBe('resolved_buyer');
    expect(resolved.resolvedAt).not.toBeNull();
  });

  it('cannot resolve a dispute twice', () => {
    const loan = activeLoan();
    const d = svc.openDispute(loan.id, 5_000, 'x') as any;
    svc.resolveDispute(d.id, 'resolved_buyer', 'first');
    const r = svc.resolveDispute(d.id, 'resolved_seller', 'second');
    expect('error' in r && r.error).toBe('dispute_already_resolved');
  });

  it('rejects invalid resolution', () => {
    const loan = activeLoan();
    const d = svc.openDispute(loan.id, 5_000, 'x') as any;
    const r = svc.resolveDispute(d.id, 'invalid_status' as any, 'note');
    expect('error' in r && r.error).toBe('invalid_resolution');
  });

  it('lists disputes filtered by status', () => {
    const loan = activeLoan();
    const d1 = svc.openDispute(loan.id, 1_000, 'a') as any;
    const d2 = svc.openDispute(loan.id, 2_000, 'b') as any;
    svc.resolveDispute(d2.id, 'resolved_seller', 'ok');
    expect(svc.listDisputes('open').length).toBe(1);
    expect(svc.listDisputes('resolved_seller').length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FX
// ─────────────────────────────────────────────────────────────────────────────

describe('FX quotes', () => {
  it('quotes INR to USD', () => {
    const q = svc.requestFxQuote({ fromCurrency: 'INR', toCurrency: 'USD', amount: 83_500 });
    expect(q.rate).toBeCloseTo(1 / 83.5, 2);
    expect(q.convertedAmount).toBeGreaterThan(990);
    expect(q.convertedAmount).toBeLessThan(1010);
  });

  it('quotes USD to INR', () => {
    const q = svc.requestFxQuote({ fromCurrency: 'USD', toCurrency: 'INR', amount: 100 });
    expect(q.convertedAmount).toBeGreaterThan(8_300);
    expect(q.convertedAmount).toBeLessThan(8_400);
  });

  it('returns same amount for INR to INR (1:1 minus spread)', () => {
    const q = svc.requestFxQuote({ fromCurrency: 'INR', toCurrency: 'INR', amount: 10_000 });
    // spread reduces by 0.5%
    expect(q.convertedAmount).toBeCloseTo(9_950, 0);
  });

  it('rejects unsupported currency', () => {
    const r = svc.requestFxQuote({ fromCurrency: 'XYZ', toCurrency: 'INR', amount: 100 });
    expect('error' in r && r.error).toMatch(/unsupported_currency/);
  });

  it('applies 0.5% spread', () => {
    const q = svc.requestFxQuote({ fromCurrency: 'USD', toCurrency: 'EUR', amount: 1000 });
    expect(q.spreadBps).toBe(50);
    // Customer gets 0.5% less than mid-rate
    const midRate = 83.5 / 90.2; // USD/EUR via INR
    const expected = 1000 * midRate * (1 - 0.005);
    expect(q.convertedAmount).toBeCloseTo(expected, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Network stats
// ─────────────────────────────────────────────────────────────────────────────

describe('Trade finance stats', () => {
  it('reports counts that match activity', () => {
    seedEntity({ entityId: 'e1' });
    seedEntity({ entityId: 'e2' });
    svc.requestCreditOffer({ entityId: 'e1', amount: 100_000, currency: 'INR', termMonths: 6 });
    svc.requestCreditOffer({ entityId: 'e2', amount: 50_000, currency: 'INR', termMonths: 3 });
    svc.requestCreditOffer({ entityId: 'unknown', amount: 1_000, currency: 'INR', termMonths: 1 });

    const s = svc.tradeFinanceStats();
    expect(s.entities).toBe(2);
    expect(s.offers.total).toBe(3);
    expect(s.offers.approved).toBe(2);
    expect(s.offers.declined).toBe(1);
  });

  it('sums disbursed and outstanding across all loans', () => {
    seedEntity({ entityId: 'e1', trustScore: 90, annualRevenueInr: 10_000_000, monthsInBusiness: 24 });
    const offer = svc.requestCreditOffer({ entityId: 'e1', amount: 200_000, currency: 'INR', termMonths: 6 });
    const loan = svc.originateLoan(offer.offerId) as any;
    svc.disburseLoan(loan.id);
    svc.recordRepayment(loan.id, 5_000, 'manual');

    const s = svc.tradeFinanceStats();
    expect(s.loans.total).toBe(1);
    expect(s.loans.active).toBe(1);
    expect(s.loans.totalDisbursedInr).toBe(offer.approvedAmount);
    expect(s.loans.totalOutstandingInr).toBeLessThan(offer.totalRepayable);
    expect(s.repayments.totalInr).toBe(5_000);
  });
});
