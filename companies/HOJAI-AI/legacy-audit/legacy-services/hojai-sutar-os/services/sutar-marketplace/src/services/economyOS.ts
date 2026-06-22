// ============================================================================
// SUTAR Marketplace - Economy OS Integration Service
// ============================================================================

import { EconomyBalance, EconomyTransaction } from './types';

export interface EconomyOSConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: EconomyOSConfig = {
  baseUrl: process.env.ECONOMY_OS_URL || 'http://localhost:4251',
  apiKey: process.env.ECONOMY_OS_API_KEY,
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

export class EconomyOSService {
  private config: EconomyOSConfig;
  private cache: Map<string, { data: EconomyBalance; expires: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  constructor(config: Partial<EconomyOSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Marketplace-Request': 'true',
      ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      ...options.headers,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`EconomyOS API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`EconomyOS request timeout: ${endpoint}`);
      }
      throw error;
    }
  }

  private async retryRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.request<T>(endpoint, options);
      } catch (error) {
        lastError = error as Error;
        console.log(`[ECONOMY-OS] Attempt ${attempt} failed for ${endpoint}:`, lastError.message);

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.config.retryAttempts} attempts`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCacheKey(userId: string): string {
    return `balance:${userId}`;
  }

  private getFromCache(userId: string): EconomyBalance | null {
    const cached = this.cache.get(this.getCacheKey(userId));
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private setCache(userId: string, data: EconomyBalance): void {
    this.cache.set(this.getCacheKey(userId), {
      data,
      expires: Date.now() + this.cacheTimeout,
    });
  }

  private invalidateCache(userId: string): void {
    this.cache.delete(this.getCacheKey(userId));
  }

  // Balance Operations
  public async getBalance(userId: string): Promise<EconomyBalance> {
    const cached = this.getFromCache(userId);
    if (cached) {
      return cached;
    }

    try {
      const balance = await this.retryRequest<EconomyBalance>(
        `/api/v1/users/${userId}/balance`
      );
      this.setCache(userId, balance);
      return balance;
    } catch (error) {
      console.error(`[ECONOMY-OS] Failed to get balance for ${userId}:`, error);
      // Return default balance if EconomyOS is unavailable
      return {
        userId,
        balance: 0,
        currency: 'INR',
        frozenBalance: 0,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  public async debit(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<EconomyTransaction> {
    this.invalidateCache(userId);

    try {
      return await this.retryRequest<EconomyTransaction>('/api/v1/transactions/debit', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          amount,
          description,
          referenceId,
          referenceType,
        }),
      });
    } catch (error) {
      console.error(`[ECONOMY-OS] Failed to debit ${amount} from ${userId}:`, error);
      throw new Error(`Failed to process payment: ${(error as Error).message}`);
    }
  }

  public async credit(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<EconomyTransaction> {
    this.invalidateCache(userId);

    try {
      return await this.retryRequest<EconomyTransaction>('/api/v1/transactions/credit', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          amount,
          description,
          referenceId,
          referenceType,
        }),
      });
    } catch (error) {
      console.error(`[ECONOMY-OS] Failed to credit ${amount} to ${userId}:`, error);
      throw new Error(`Failed to process credit: ${(error as Error).message}`);
    }
  }

  public async refund(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<EconomyTransaction> {
    this.invalidateCache(userId);

    try {
      return await this.retryRequest<EconomyTransaction>('/api/v1/transactions/refund', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          amount,
          description,
          referenceId,
        }),
      });
    } catch (error) {
      console.error(`[ECONOMY-OS] Failed to refund ${amount} to ${userId}:`, error);
      throw new Error(`Failed to process refund: ${(error as Error).message}`);
    }
  }

  public async freezeFunds(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<EconomyTransaction> {
    this.invalidateCache(userId);

    try {
      return await this.retryRequest<EconomyTransaction>('/api/v1/transactions/freeze', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          amount,
          description,
          referenceId,
        }),
      });
    } catch (error) {
      console.error(`[ECONOMY-OS] Failed to freeze ${amount} for ${userId}:`, error);
      throw new Error(`Failed to freeze funds: ${(error as Error).message}`);
    }
  }

  public async unfreezeFunds(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): Promise<EconomyTransaction> {
    this.invalidateCache(userId);

    try {
      return await this.retryRequest<EconomyTransaction>('/api/v1/transactions/unfreeze', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          amount,
          description,
          referenceId,
        }),
      });
    } catch (error) {
      console.error(`[ECONOMY-OS] Failed to unfreeze ${amount} for ${userId}:`, error);
      throw new Error(`Failed to unfreeze funds: ${(error as Error).message}`);
    }
  }

  public async getTransactions(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ transactions: EconomyTransaction[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', String(options.limit));
      if (options.offset) params.append('offset', String(options.offset));
      if (options.type) params.append('type', options.type);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      return await this.retryRequest<{ transactions: EconomyTransaction[]; total: number }>(
        `/api/v1/users/${userId}/transactions?${params.toString()}`
      );
    } catch (error) {
      console.error(`[ECONOMY-OS] Failed to get transactions for ${userId}:`, error);
      return { transactions: [], total: 0 };
    }
  }

  public async verifyPayment(
    transactionId: string
  ): Promise<{ valid: boolean; transaction?: EconomyTransaction }> {
    try {
      return await this.retryRequest<{ valid: boolean; transaction?: EconomyTransaction }>(
        `/api/v1/transactions/${transactionId}/verify`
      );
    } catch (error) {
      console.error(`[ECONOMY-OS] Failed to verify transaction ${transactionId}:`, error);
      return { valid: false };
    }
  }

  public async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    try {
      const balance = await this.getBalance(userId);
      return balance.balance >= amount;
    } catch {
      return false;
    }
  }

  public async processPayment(
    userId: string,
    amount: number,
    orderId: string,
    description: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const hasBalance = await this.hasSufficientBalance(userId, amount);
      if (!hasBalance) {
        return { success: false, error: 'Insufficient balance' };
      }

      const transaction = await this.debit(
        userId,
        amount,
        description,
        orderId,
        'marketplace_order'
      );

      return { success: true, transactionId: transaction.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  public async processRefund(
    userId: string,
    amount: number,
    orderId: string,
    reason: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const transaction = await this.refund(
        userId,
        amount,
        `Refund for order ${orderId}: ${reason}`,
        orderId
      );

      return { success: true, transactionId: transaction.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  public async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.request<{ status: string }>('/health');
      return { healthy: true, latency: Date.now() - start };
    } catch {
      return { healthy: false, latency: Date.now() - start };
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const economyOS = new EconomyOSService();
