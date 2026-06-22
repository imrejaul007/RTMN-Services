/**
 * Trade Finance & BNPL — Type Definitions
 * Phase C.4
 *
 * Domain model:
 *   - Entity (borrower): corpId, trust score, history
 *   - CreditOffer: BNPL terms returned from `requestCreditOffer`
 *   - Loan: originated credit, repayable in N installments
 *   - Repayment: scheduled or actual installment payment
 *   - Dispute: held escrow pending resolution
 *   - FxQuote: cross-currency conversion
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Entity — borrower / applicant
// ─────────────────────────────────────────────────────────────────────────────

export const EntitySchema = z.object({
  entityId: z.string().min(1),
  /** Trust score 0-100 — typically pulled from sutar-trust-engine / SADA. */
  trustScore: z.number().min(0).max(100).default(50),
  /** Optional credit history hint. */
  priorLoansCount: z.number().int().nonnegative().default(0),
  priorDefaultsCount: z.number().int().nonnegative().default(0),
  /** Annual revenue (in INR) — used for limit sizing. */
  annualRevenueInr: z.number().nonnegative().default(0),
  /** Sector — used for risk band selection. */
  sector: z.enum(['retail', 'restaurant', 'hotel', 'manufacturing', 'services', 'agriculture', 'other']).default('other'),
  /** Months in business. */
  monthsInBusiness: z.number().int().nonnegative().default(0),
});
export type Entity = z.infer<typeof EntitySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Credit offer — BNPL terms
// ─────────────────────────────────────────────────────────────────────────────

export const CreditOfferRequestSchema = z.object({
  entityId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  purpose: z.string().min(1).default('working-capital'),
  /** Requested term in months. The system may offer a different term. */
  termMonths: z.number().int().min(1).max(36).default(3),
});
export type CreditOfferRequest = z.infer<typeof CreditOfferRequestSchema>;

export interface CreditOffer {
  offerId: string;
  entityId: string;
  approved: boolean;
  /** Maximum amount approved. */
  approvedAmount: number;
  currency: string;
  /** Annualised interest rate (e.g. 0.18 = 18% APR). */
  apr: number;
  termMonths: number;
  /** Total repayable amount (principal + interest + fees). */
  totalRepayable: number;
  /** Monthly installment amount. */
  monthlyInstallment: number;
  /** Origination fee in INR. */
  originationFeeInr: number;
  /** Disbursal speed. */
  disbursalSpeed: 'instant' | 'same-day' | '1-2-days';
  /** Risk band that drove the decision. */
  riskBand: 'A' | 'B' | 'C' | 'D' | 'E';
  /** Reason if declined. */
  declineReason?: string;
  /** Offer valid until (ISO). */
  validUntil: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loan — originated credit
// ─────────────────────────────────────────────────────────────────────────────

export const LoanStatusSchema = z.enum([
  'pending_disbursal',
  'active',
  'paid_off',
  'defaulted',
  'cancelled',
]);
export type LoanStatus = z.infer<typeof LoanStatusSchema>;

export interface Loan {
  id: string;
  offerId: string;
  entityId: string;
  principal: number;
  currency: string;
  apr: number;
  termMonths: number;
  monthlyInstallment: number;
  totalRepayable: number;
  status: LoanStatus;
  outstandingBalance: number;
  disbursedAt: string | null;
  /** Repayments made so far. */
  repaidAmount: number;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repayments
// ─────────────────────────────────────────────────────────────────────────────

export interface Repayment {
  id: string;
  loanId: string;
  amount: number;
  /** installment # (1-indexed). 0 = lump sum / extra. */
  installmentNumber: number;
  paidAt: string;
  method: 'auto-debit' | 'manual' | 'wallet' | 'bank-transfer';
}

// ─────────────────────────────────────────────────────────────────────────────
// Disputes — held escrow
// ─────────────────────────────────────────────────────────────────────────────

export const DisputeStatusSchema = z.enum([
  'open',
  'investigating',
  'resolved_buyer',
  'resolved_seller',
  'split',
  'cancelled',
]);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;

export interface Dispute {
  id: string;
  loanId: string;
  amount: number;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  openedAt: string;
  resolvedAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FX quote — cross-currency
// ─────────────────────────────────────────────────────────────────────────────

export const FxQuoteRequestSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  amount: z.number().positive(),
});
export type FxQuoteRequest = z.infer<typeof FxQuoteRequestSchema>;

export interface FxQuote {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  rate: number;
  convertedAmount: number;
  spreadBps: number;
  validUntil: string;
}
