/**
 * Trade Finance & BNPL — Service
 * Phase C.4
 *
 * Deterministic rule engine for credit decisions. No external credit
 * bureau calls; trust score + entity profile is the sole input.
 *
 * Risk bands (driven by trust score, history, revenue, sector, tenure):
 *   A: trust≥85, no defaults, revenue>5M, >12mo in business  → APR 12%
 *   B: trust≥70, ≤1 default,  revenue>1M,  >6mo              → APR 16%
 *   C: trust≥55, ≤2 defaults,  revenue>250k, >3mo            → APR 21%
 *   D: trust≥40                                            → APR 28%
 *   E: trust<40 or prior defaults≥3                        → APR 36% or decline
 *
 * Limit sizing: min(requested, annualRevenueInr × riskMultiplier × termMonths/12)
 *   A: 0.30, B: 0.20, C: 0.12, D: 0.06, E: 0.02
 *
 * Auto-decline rules:
 *   - monthsInBusiness < 1
 *   - priorDefaultsCount ≥ 3
 *   - trustScore < 25
 *   - amount > 5,000,000 INR
 *   - amount > annualRevenueInr × 2 (over-leverage)
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  CreditOffer,
  CreditOfferRequest,
  Dispute,
  Entity,
  FxQuote,
  FxQuoteRequest,
  Loan,
  LoanStatus,
  Repayment,
} from '../types/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory stores
// ─────────────────────────────────────────────────────────────────────────────

const ENTITIES = new Map<string, Entity>();
const OFFERS = new Map<string, CreditOffer>();
const LOANS = new Map<string, Loan>();
const REPAYMENTS = new Map<string, Repayment>();
const DISPUTES = new Map<string, Dispute>();

// ─────────────────────────────────────────────────────────────────────────────
// Static FX rates (INR base) — for offline deterministic quoting
// ─────────────────────────────────────────────────────────────────────────────

const FX_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 90.2,
  GBP: 105.8,
  AED: 22.7,
  SGD: 62.4,
  JPY: 0.55,
  CNY: 11.6,
  AUD: 54.8,
  CAD: 61.3,
};

const FX_SPREAD_BPS = 50; // 0.5% spread

// ─────────────────────────────────────────────────────────────────────────────
// Risk band logic
// ─────────────────────────────────────────────────────────────────────────────

interface RiskAssessment {
  band: 'A' | 'B' | 'C' | 'D' | 'E';
  apr: number;
  /** Limit as a fraction of annual revenue per year. */
  limitMultiplier: number;
  declineReason?: string;
}

function assessRisk(entity: Entity, requestedAmount: number): RiskAssessment {
  // Auto-declines
  if (entity.monthsInBusiness < 1) {
    return { band: 'E', apr: 0.36, limitMultiplier: 0, declineReason: 'insufficient_tenure' };
  }
  if (entity.priorDefaultsCount >= 3) {
    return { band: 'E', apr: 0.36, limitMultiplier: 0, declineReason: 'excessive_defaults' };
  }
  if (entity.trustScore < 25) {
    return { band: 'E', apr: 0.36, limitMultiplier: 0, declineReason: 'trust_below_threshold' };
  }
  if (requestedAmount > 5_000_000) {
    return { band: 'E', apr: 0.36, limitMultiplier: 0, declineReason: 'amount_exceeds_platform_max' };
  }
  if (entity.annualRevenueInr > 0 && requestedAmount > entity.annualRevenueInr * 2) {
    return { band: 'E', apr: 0.36, limitMultiplier: 0, declineReason: 'over_leveraged' };
  }

  // Band selection
  if (
    entity.trustScore >= 85 &&
    entity.priorDefaultsCount === 0 &&
    entity.annualRevenueInr > 5_000_000 &&
    entity.monthsInBusiness > 12
  ) {
    return { band: 'A', apr: 0.12, limitMultiplier: 0.30 };
  }
  if (
    entity.trustScore >= 70 &&
    entity.priorDefaultsCount <= 1 &&
    entity.annualRevenueInr > 1_000_000 &&
    entity.monthsInBusiness > 6
  ) {
    return { band: 'B', apr: 0.16, limitMultiplier: 0.20 };
  }
  if (
    entity.trustScore >= 55 &&
    entity.priorDefaultsCount <= 2 &&
    entity.annualRevenueInr > 250_000 &&
    entity.monthsInBusiness > 3
  ) {
    return { band: 'C', apr: 0.21, limitMultiplier: 0.12 };
  }
  if (entity.trustScore >= 40) {
    return { band: 'D', apr: 0.28, limitMultiplier: 0.06 };
  }
  return { band: 'E', apr: 0.36, limitMultiplier: 0.02 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity registration
// ─────────────────────────────────────────────────────────────────────────────

export function registerEntity(entity: Entity): Entity {
  ENTITIES.set(entity.entityId, entity);
  return entity;
}

export function getEntity(entityId: string): Entity | null {
  return ENTITIES.get(entityId) || null;
}

export function upsertEntity(entity: Entity): Entity {
  return registerEntity(entity);
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit offers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request a credit offer. Returns an offer (approved or declined) and
 * persists it for later conversion to a loan.
 */
export function requestCreditOffer(req: CreditOfferRequest): CreditOffer {
  const entity = ENTITIES.get(req.entityId);
  const assessment = entity
    ? assessRisk(entity, req.amount)
    : { band: 'E' as const, apr: 0.36, limitMultiplier: 0, declineReason: 'entity_not_found' };

  const offerId = `off-${uuidv4()}`;
  const createdAt = new Date().toISOString();
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Compute limit
  let approvedAmount = 0;
  if (!assessment.declineReason) {
    if (entity && entity.annualRevenueInr > 0) {
      const termYears = req.termMonths / 12;
      const maxByRevenue = entity.annualRevenueInr * assessment.limitMultiplier * termYears;
      approvedAmount = Math.min(req.amount, maxByRevenue);
    } else {
      // No revenue data — fall back to requested amount but cap conservatively
      approvedAmount = Math.min(req.amount, 100_000);
    }
  }

  const originationFeeInr = Math.round(approvedAmount * 0.02); // 2% fee
  const totalInterest = approvedAmount * assessment.apr * (req.termMonths / 12);
  const totalRepayable = Math.round(approvedAmount + totalInterest + originationFeeInr);
  const monthlyInstallment = Math.round(totalRepayable / req.termMonths);

  const offer: CreditOffer = {
    offerId,
    entityId: req.entityId,
    approved: !assessment.declineReason && approvedAmount > 0,
    approvedAmount: Math.round(approvedAmount),
    currency: req.currency,
    apr: assessment.apr,
    termMonths: req.termMonths,
    totalRepayable,
    monthlyInstallment,
    originationFeeInr,
    disbursalSpeed: assessment.band === 'A' ? 'instant' : assessment.band === 'B' ? 'same-day' : '1-2-days',
    riskBand: assessment.band,
    createdAt,
    validUntil,
  };
  if (assessment.declineReason) {
    offer.declineReason = assessment.declineReason;
  }

  OFFERS.set(offerId, offer);
  return offer;
}

export function getOffer(offerId: string): CreditOffer | null {
  return OFFERS.get(offerId) || null;
}

export function listOffers(entityId?: string): CreditOffer[] {
  const all = Array.from(OFFERS.values());
  return entityId ? all.filter(o => o.entityId === entityId) : all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loans — originate from an approved offer
// ─────────────────────────────────────────────────────────────────────────────

export function originateLoan(offerId: string): Loan | { error: string } {
  const offer = OFFERS.get(offerId);
  if (!offer) return { error: 'offer_not_found' };
  if (!offer.approved) return { error: 'offer_not_approved' };
  if (new Date(offer.validUntil).getTime() < Date.now()) return { error: 'offer_expired' };

  const id = `loan-${uuidv4()}`;
  const loan: Loan = {
    id,
    offerId,
    entityId: offer.entityId,
    principal: offer.approvedAmount,
    currency: offer.currency,
    apr: offer.apr,
    termMonths: offer.termMonths,
    monthlyInstallment: offer.monthlyInstallment,
    totalRepayable: offer.totalRepayable,
    status: 'pending_disbursal',
    outstandingBalance: offer.totalRepayable,
    disbursedAt: null,
    repaidAmount: 0,
    createdAt: new Date().toISOString(),
  };
  LOANS.set(id, loan);
  return loan;
}

export function disburseLoan(loanId: string): Loan | { error: string } {
  const loan = LOANS.get(loanId);
  if (!loan) return { error: 'loan_not_found' };
  if (loan.status !== 'pending_disbursal') return { error: `invalid_status:${loan.status}` };
  loan.status = 'active';
  loan.disbursedAt = new Date().toISOString();
  return loan;
}

export function getLoan(loanId: string): Loan | null {
  return LOANS.get(loanId) || null;
}

export function listLoans(entityId?: string, status?: LoanStatus): Loan[] {
  let all = Array.from(LOANS.values());
  if (entityId) all = all.filter(l => l.entityId === entityId);
  if (status) all = all.filter(l => l.status === status);
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// Repayments
// ─────────────────────────────────────────────────────────────────────────────

export function recordRepayment(
  loanId: string,
  amount: number,
  method: Repayment['method'],
  installmentNumber: number = 0,
): Repayment | { error: string } {
  const loan = LOANS.get(loanId);
  if (!loan) return { error: 'loan_not_found' };
  if (loan.status !== 'active') return { error: `invalid_status:${loan.status}` };
  if (amount <= 0) return { error: 'amount_must_be_positive' };
  if (amount > loan.outstandingBalance) {
    return { error: 'amount_exceeds_outstanding' };
  }

  const id = `rep-${uuidv4()}`;
  const repayment: Repayment = {
    id, loanId, amount, installmentNumber, method,
    paidAt: new Date().toISOString(),
  };
  REPAYMENTS.set(id, repayment);

  loan.outstandingBalance -= amount;
  loan.repaidAmount += amount;
  if (loan.outstandingBalance <= 0) {
    loan.outstandingBalance = 0;
    loan.status = 'paid_off';
  }
  return repayment;
}

export function listRepayments(loanId: string): Repayment[] {
  return Array.from(REPAYMENTS.values())
    .filter(r => r.loanId === loanId)
    .sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────────────────────────

export function openDispute(
  loanId: string,
  amount: number,
  reason: string,
): Dispute | { error: string } {
  const loan = LOANS.get(loanId);
  if (!loan) return { error: 'loan_not_found' };
  if (loan.status !== 'active') return { error: 'loan_not_active' };
  if (amount <= 0) return { error: 'amount_must_be_positive' };

  const id = `dsp-${uuidv4()}`;
  const dispute: Dispute = {
    id, loanId, amount, reason, status: 'open',
    resolution: null, openedAt: new Date().toISOString(), resolvedAt: null,
  };
  DISPUTES.set(id, dispute);
  return dispute;
}

export function resolveDispute(
  disputeId: string,
  resolution: Dispute['status'],
  note: string,
): Dispute | { error: string } {
  const d = DISPUTES.get(disputeId);
  if (!d) return { error: 'dispute_not_found' };
  if (d.status === 'resolved_buyer' || d.status === 'resolved_seller' || d.status === 'split' || d.status === 'cancelled') {
    return { error: 'dispute_already_resolved' };
  }
  if (!['resolved_buyer', 'resolved_seller', 'split', 'cancelled'].includes(resolution)) {
    return { error: 'invalid_resolution' };
  }
  d.status = resolution;
  d.resolution = note;
  d.resolvedAt = new Date().toISOString();
  return d;
}

export function listDisputes(status?: Dispute['status']): Dispute[] {
  let all = Array.from(DISPUTES.values());
  if (status) all = all.filter(d => d.status === status);
  return all.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// FX quotes
// ─────────────────────────────────────────────────────────────────────────────

export function requestFxQuote(req: FxQuoteRequest): FxQuote | { error: string } {
  const fromRate = FX_TO_INR[req.fromCurrency];
  const toRate = FX_TO_INR[req.toCurrency];
  if (!fromRate) return { error: `unsupported_currency:${req.fromCurrency}` };
  if (!toRate) return { error: `unsupported_currency:${req.toCurrency}` };

  // Convert via INR: amount × fromRate = INR, then / toRate = target
  const inrValue = req.amount * fromRate;
  const grossConverted = inrValue / toRate;
  // Apply spread: customer pays the spread on the way out
  const spreadMultiplier = 1 + FX_SPREAD_BPS / 10000;
  const convertedAmount = grossConverted / spreadMultiplier;

  return {
    fromCurrency: req.fromCurrency,
    toCurrency: req.toCurrency,
    amount: req.amount,
    rate: (fromRate / toRate) * (1 - FX_SPREAD_BPS / 10000),
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    spreadBps: FX_SPREAD_BPS,
    validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Network stats
// ─────────────────────────────────────────────────────────────────────────────

export function tradeFinanceStats(): {
  entities: number;
  offers: { total: number; approved: number; declined: number };
  loans: { total: number; active: number; paid_off: number; defaulted: number; totalDisbursedInr: number; totalOutstandingInr: number };
  repayments: { count: number; totalInr: number };
  disputes: { open: number; resolved: number };
} {
  const offers = Array.from(OFFERS.values());
  const loans = Array.from(LOANS.values());
  const repayments = Array.from(REPAYMENTS.values());
  const disputes = Array.from(DISPUTES.values());

  return {
    entities: ENTITIES.size,
    offers: {
      total: offers.length,
      approved: offers.filter(o => o.approved).length,
      declined: offers.filter(o => !o.approved).length,
    },
    loans: {
      total: loans.length,
      active: loans.filter(l => l.status === 'active').length,
      paid_off: loans.filter(l => l.status === 'paid_off').length,
      defaulted: loans.filter(l => l.status === 'defaulted').length,
      totalDisbursedInr: loans.filter(l => l.disbursedAt).reduce((s, l) => s + l.principal, 0),
      totalOutstandingInr: loans.reduce((s, l) => s + l.outstandingBalance, 0),
    },
    repayments: {
      count: repayments.length,
      totalInr: repayments.reduce((s, r) => s + r.amount, 0),
    },
    disputes: {
      open: disputes.filter(d => d.status === 'open' || d.status === 'investigating').length,
      resolved: disputes.filter(d => d.status === 'resolved_buyer' || d.status === 'resolved_seller' || d.status === 'split').length,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test reset
// ─────────────────────────────────────────────────────────────────────────────

export function _resetForTests(): void {
  ENTITIES.clear();
  OFFERS.clear();
  LOANS.clear();
  REPAYMENTS.clear();
  DISPUTES.clear();
}
