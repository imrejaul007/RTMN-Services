/**
 * Nexha Trade Finance Network Client
 *
 * Wraps nexha-trade-finance-network: business entities, credit offers,
 * loans, repayments, disputes, FX quotes.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export interface Entity {
  id: string;
  tenantId: string;
  legalName: string;
  entityType: 'company' | 'individual' | 'partnership';
  country: string;
  taxId?: string;
  creditScore?: number;
  kycStatus: 'pending' | 'verified' | 'rejected';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface EntityInput {
  tenantId?: string;
  legalName: string;
  entityType: 'company' | 'individual' | 'partnership';
  country: string;
  taxId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreditOffer {
  id: string;
  lenderId: string;
  maxAmount: { amount: number; currency: string };
  interestRate: number; // annual %
  termMonths: number;
  requirements: string[];
  active: boolean;
}

export interface CreditOfferInput {
  lenderId: string;
  maxAmount: { amount: number; currency: string };
  interestRate: number;
  termMonths: number;
  requirements?: string[];
}

export interface Loan {
  id: string;
  entityId: string;
  offerId: string;
  amount: { amount: number; currency: string };
  interestRate: number;
  termMonths: number;
  status: 'pending' | 'approved' | 'disbursed' | 'repaying' | 'completed' | 'defaulted';
  disbursedAt?: string;
  dueDate?: string;
  outstandingBalance?: { amount: number; currency: string };
}

export interface LoanInput {
  entityId: string;
  offerId: string;
  amount: { amount: number; currency: string };
  purpose?: string;
}

export interface Repayment {
  id: string;
  loanId: string;
  amount: { amount: number; currency: string };
  paidAt: string;
  principalPaid: number;
  interestPaid: number;
}

export interface Dispute {
  id: string;
  loanId: string;
  raisedBy: string;
  reason: string;
  status: 'open' | 'in_review' | 'resolved' | 'escalated';
  resolution?: string;
  raisedAt: string;
  resolvedAt?: string;
}

export interface FXQuote {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  amount: number;
  convertedAmount: number;
  expiresAt: string;
}

export class TradeFinanceClient {
  constructor(private config: HojaiConfig) {}

  // ── Entities ──────────────────────────────────────────────
  async registerEntity(input: EntityInput): Promise<Entity> {
    return request<Entity>(this.config, 'POST', '/api/v1/entities', input);
  }

  async getEntity(id: string): Promise<Entity> {
    return request<Entity>(this.config, 'GET', `/api/v1/entities/${encodeURIComponent(id)}`);
  }

  // ── Credit Offers ─────────────────────────────────────────
  async createCreditOffer(input: CreditOfferInput): Promise<CreditOffer> {
    return request<CreditOffer>(this.config, 'POST', '/api/v1/credit-offers', input);
  }

  async listCreditOffers(input: { lenderId?: string; activeOnly?: boolean; minAmount?: number } = {}): Promise<CreditOffer[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<CreditOffer[]>(this.config, 'GET', `/api/v1/credit-offers?${params.toString()}`);
  }

  async getCreditOffer(id: string): Promise<CreditOffer> {
    return request<CreditOffer>(this.config, 'GET', `/api/v1/credit-offers/${encodeURIComponent(id)}`);
  }

  // ── Loans ─────────────────────────────────────────────────
  async createLoan(input: LoanInput): Promise<Loan> {
    return request<Loan>(this.config, 'POST', '/api/v1/loans', input);
  }

  async disburseLoan(id: string, offerId: string): Promise<Loan> {
    return request<Loan>(this.config, 'POST', `/api/v1/loans/${encodeURIComponent(id)}/disburse`, { offerId });
  }

  async listLoans(input: { entityId?: string; status?: Loan['status'] } = {}): Promise<Loan[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Loan[]>(this.config, 'GET', `/api/v1/loans?${params.toString()}`);
  }

  async getLoan(id: string): Promise<Loan> {
    return request<Loan>(this.config, 'GET', `/api/v1/loans/${encodeURIComponent(id)}`);
  }

  async repayLoan(id: string, input: { amount: { amount: number; currency: string }; fromAccount?: string }): Promise<Repayment> {
    return request<Repayment>(this.config, 'POST', `/api/v1/loans/${encodeURIComponent(id)}/repay`, input);
  }

  async listRepayments(loanId: string): Promise<Repayment[]> {
    return request<Repayment[]>(this.config, 'GET', `/api/v1/loans/${encodeURIComponent(loanId)}/repayments`);
  }

  // ── Disputes ──────────────────────────────────────────────
  async openDispute(input: { loanId: string; raisedBy: string; reason: string }): Promise<Dispute> {
    return request<Dispute>(this.config, 'POST', '/api/v1/disputes', input);
  }

  async resolveDispute(id: string, input: { resolution: string; refundAmount?: { amount: number; currency: string } }): Promise<Dispute> {
    return request<Dispute>(this.config, 'POST', `/api/v1/disputes/${encodeURIComponent(id)}/resolve`, input);
  }

  async listDisputes(input: { status?: Dispute['status']; loanId?: string } = {}): Promise<Dispute[]> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([k, v]) => { if (v !== undefined && v !== null) params.set(k, String(v)); });
    return request<Dispute[]>(this.config, 'GET', `/api/v1/disputes?${params.toString()}`);
  }

  // ── FX ────────────────────────────────────────────────────
  async fxQuote(input: { fromCurrency: string; toCurrency: string; amount: number }): Promise<FXQuote> {
    return request<FXQuote>(this.config, 'POST', '/api/v1/fx/quote', input);
  }
}