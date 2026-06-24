/**
 * RABTUL SEPA Payment Client — REZ-sepa-payment-service.
 *
 * Wraps REZ-sepa-payment-service: SEPA / SEPA Instant / cross-border EUR
 * transfers. Used for European payouts, B2B EUR transfers, recurring
 * euro transfers, and instant euro settlements.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type SepaScheme = 'sepa_credit_transfer' | 'sepa_instant_credit_transfer' | 'sepa_direct_debit';
export type SepaStatus = 'pending_validation' | 'queued' | 'processing' | 'settled' | 'failed' | 'returned' | 'reversed';

export interface SepaBeneficiary {
  id: string;
  name: string;
  iban: string;
  bic?: string;
  country: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  savedAt: string;
}

export interface SepaTransfer {
  id: string;
  scheme: SepaScheme;
  status: SepaStatus;
  debtorName: string;
  debtorIban: string;
  beneficiaryName: string;
  beneficiaryIban: string;
  beneficiaryBic?: string;
  amount: number;
  currency: 'EUR';
  reference?: string;
  structuredReference?: string;
  endToEndId: string;
  mandateId?: string;
  executionDate?: string;
  settledAt?: string;
  failureReason?: string;
  returnCode?: string;
  createdAt: string;
}

export interface CreateSepaTransferRequest {
  scheme: SepaScheme;
  beneficiaryId?: string;
  beneficiary?: {
    name: string;
    iban: string;
    bic?: string;
    country: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  amount: number;
  reference?: string;
  structuredReference?: string;
  executionDate?: string;
  endToEndId?: string;
  mandateId?: string;
}

export interface SepaMandate {
  id: string;
  debtorName: string;
  debtorIban: string;
  creditorName: string;
  creditorId: string;
  sequenceType: 'one_off' | 'first' | 'recurring' | 'final';
  signedAt?: string;
  status: 'pending' | 'active' | 'revoked' | 'expired';
}

export class SepaClient {
  constructor(private config: HojaiConfig) {}

  // ── Beneficiaries ──────────────────────────────────────────────────
  async listBeneficiaries(): Promise<SepaBeneficiary[]> {
    return request<SepaBeneficiary[]>(this.config, 'GET', '/api/sepa/beneficiaries');
  }

  async getBeneficiary(beneficiaryId: string): Promise<SepaBeneficiary> {
    return request<SepaBeneficiary>(this.config, 'GET', `/api/sepa/beneficiaries/${encodeURIComponent(beneficiaryId)}`);
  }

  async saveBeneficiary(req: Omit<SepaBeneficiary, 'id' | 'savedAt'>): Promise<SepaBeneficiary> {
    return request<SepaBeneficiary>(this.config, 'POST', '/api/sepa/beneficiaries', req);
  }

  async deleteBeneficiary(beneficiaryId: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(this.config, 'DELETE', `/api/sepa/beneficiaries/${encodeURIComponent(beneficiaryId)}`);
  }

  // ── Transfers ──────────────────────────────────────────────────────
  async createTransfer(req: CreateSepaTransferRequest): Promise<SepaTransfer> {
    return request<SepaTransfer>(this.config, 'POST', '/api/sepa/transfers', req);
  }

  async getTransfer(transferId: string): Promise<SepaTransfer> {
    return request<SepaTransfer>(this.config, 'GET', `/api/sepa/transfers/${encodeURIComponent(transferId)}`);
  }

  async listTransfers(params: { status?: SepaStatus; from?: string; to?: string; limit?: number } = {}): Promise<SepaTransfer[]> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<SepaTransfer[]>(this.config, 'GET', `/api/sepa/transfers${suffix}`);
  }

  // ── Direct Debit mandates ──────────────────────────────────────────
  async createMandate(req: Omit<SepaMandate, 'id' | 'status' | 'signedAt'>): Promise<SepaMandate> {
    return request<SepaMandate>(this.config, 'POST', '/api/sepa/mandates', req);
  }

  async getMandate(mandateId: string): Promise<SepaMandate> {
    return request<SepaMandate>(this.config, 'GET', `/api/sepa/mandates/${encodeURIComponent(mandateId)}`);
  }

  async listMandates(): Promise<SepaMandate[]> {
    return request<SepaMandate[]>(this.config, 'GET', '/api/sepa/mandates');
  }

  async revokeMandate(mandateId: string): Promise<SepaMandate> {
    return request<SepaMandate>(this.config, 'POST', `/api/sepa/mandates/${encodeURIComponent(mandateId)}/revoke`);
  }
}
