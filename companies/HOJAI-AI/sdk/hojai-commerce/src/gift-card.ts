/**
 * REZ Gift Card Client
 *
 * Wraps rez-gift-card-service: gift card creation, redemption,
 * balance, transactions.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type GiftCardStatus = 'active' | 'inactive' | 'expired' | 'depleted';

export interface GiftCard {
  code: string;
  cardId: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  status: GiftCardStatus;
  expiresAt?: string;
  issuedTo?: string;
  issuedBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface GiftCardInput {
  initialBalance: number;
  currency: string;
  expiresAt?: string;
  issuedTo?: string;
  issuedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface GiftCardTransaction {
  id: string;
  cardId: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  reason: string;
  reference?: string;
  createdAt: string;
}

export class GiftCardClient {
  constructor(private config: HojaiConfig) {}

  async create(input: GiftCardInput): Promise<GiftCard> {
    return request<GiftCard>(this.config, 'POST', '/api/gift-cards', input);
  }

  async getByCode(code: string): Promise<GiftCard> {
    return request<GiftCard>(this.config, 'GET', `/api/gift-cards/${encodeURIComponent(code)}`);
  }

  async redeem(cardId: string, input: { amount: number; orderId?: string; metadata?: Record<string, unknown> }): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
    return request(this.config, 'POST', `/api/gift-cards/${encodeURIComponent(cardId)}/redeem`, input);
  }

  async add(cardId: string, input: { amount: number; reason?: string }): Promise<GiftCard> {
    return request<GiftCard>(this.config, 'POST', `/api/gift-cards/${encodeURIComponent(cardId)}/add`, input);
  }

  async getTransactions(cardId: string): Promise<GiftCardTransaction[]> {
    return request<GiftCardTransaction[]>(this.config, 'GET', `/api/gift-cards/${encodeURIComponent(cardId)}/transactions`);
  }

  async getBalance(cardId: string): Promise<{ cardId: string; balance: number; currency: string; status: GiftCardStatus }> {
    return request(this.config, 'GET', `/api/gift-cards/${encodeURIComponent(cardId)}/balance`);
  }
}