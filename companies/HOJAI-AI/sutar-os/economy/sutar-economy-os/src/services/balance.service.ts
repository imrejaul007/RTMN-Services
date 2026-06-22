/**
 * SUTAR Economy OS - Balance Service
 * Layer 10: Multi-currency balance management
 */

import type { IBalance } from '../types/index.js';

// ============================================
// Supported Currencies
// ============================================

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimalPlaces: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimalPlaces: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2 },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', decimalPlaces: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimalPlaces: 2 }
];

// ============================================
// Exchange Rates (simplified - in production, fetch from API)
// ============================================

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.12,
  JPY: 149.50,
  CNY: 7.24,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  SGD: 1.34
};

// ============================================
// In-Memory Storage
// ============================================

interface BalanceStore {
  [key: string]: IBalance; // key = entityId:currency
}

const balanceStore: BalanceStore = {};

// ============================================
// Balance Service Class
// ============================================

export class BalanceService {
  /**
   * Generate balance key
   */
  private getBalanceKey(entityId: string, currency: string): string {
    return `${entityId}:${currency}`;
  }

  /**
   * Get or create balance for an entity and currency
   */
  async getOrCreateBalance(
    entityId: string,
    entityType: 'user' | 'business' | 'agent',
    currency: string = 'USD'
  ): Promise<IBalance> {
    const key = this.getBalanceKey(entityId, currency);

    if (balanceStore[key]) {
      return balanceStore[key];
    }

    const balance: IBalance = {
      entityId,
      entityType,
      currency,
      availableBalance: 0,
      pendingBalance: 0,
      totalBalance: 0,
      reservedBalance: 0,
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    balanceStore[key] = balance;
    return balance;
  }

  /**
   * Get balance for an entity
   */
  async getBalance(entityId: string, currency: string = 'USD'): Promise<IBalance | null> {
    const key = this.getBalanceKey(entityId, currency);
    return balanceStore[key] || null;
  }

  /**
   * Get all balances for an entity (all currencies)
   */
  async getAllBalances(entityId: string): Promise<IBalance[]> {
    return Object.values(balanceStore).filter(b => b.entityId === entityId);
  }

  /**
   * Get total balance across all currencies (in base currency)
   */
  async getTotalBalanceInBaseCurrency(
    entityId: string,
    baseCurrency: string = 'USD'
  ): Promise<{ balances: IBalance[]; totalInBaseCurrency: number }> {
    const balances = await this.getAllBalances(entityId);

    let totalInBaseCurrency = 0;
    for (const balance of balances) {
      if (balance.currency === baseCurrency) {
        totalInBaseCurrency += balance.availableBalance;
      } else {
        const rate = EXCHANGE_RATES[balance.currency] || 1;
        const baseRate = EXCHANGE_RATES[baseCurrency] || 1;
        totalInBaseCurrency += balance.availableBalance * (baseRate / rate);
      }
    }

    return {
      balances,
      totalInBaseCurrency: Math.round(totalInBaseCurrency * 100) / 100
    };
  }

  /**
   * Add funds to balance
   */
  async addFunds(
    entityId: string,
    entityType: 'user' | 'business' | 'agent',
    amount: number,
    currency: string = 'USD'
  ): Promise<IBalance> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const balance = await this.getOrCreateBalance(entityId, entityType, currency);
    balance.availableBalance += amount;
    balance.totalBalance += amount;
    balance.lastUpdated = new Date();
    balance.updatedAt = new Date();

    balanceStore[this.getBalanceKey(entityId, currency)] = balance;

    return balance;
  }

  /**
   * Deduct funds from balance
   */
  async deductFunds(
    entityId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<IBalance> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const balance = await this.getBalance(entityId, currency);
    if (!balance) {
      throw new Error(`Balance not found for entity: ${entityId}`);
    }

    if (balance.availableBalance < amount) {
      throw new Error(`Insufficient balance. Available: ${balance.availableBalance}, Required: ${amount}`);
    }

    balance.availableBalance -= amount;
    balance.totalBalance -= amount;
    balance.lastUpdated = new Date();
    balance.updatedAt = new Date();

    balanceStore[this.getBalanceKey(entityId, currency)] = balance;

    return balance;
  }

  /**
   * Reserve funds (for pending transactions)
   */
  async reserveFunds(
    entityId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<IBalance> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const balance = await this.getBalance(entityId, currency);
    if (!balance) {
      throw new Error(`Balance not found for entity: ${entityId}`);
    }

    if (balance.availableBalance < amount) {
      throw new Error(`Insufficient balance for reservation. Available: ${balance.availableBalance}, Required: ${amount}`);
    }

    balance.availableBalance -= amount;
    balance.reservedBalance += amount;
    balance.lastUpdated = new Date();
    balance.updatedAt = new Date();

    balanceStore[this.getBalanceKey(entityId, currency)] = balance;

    return balance;
  }

  /**
   * Release reserved funds
   */
  async releaseFunds(
    entityId: string,
    amount: number,
    currency: string = 'USD',
    releaseToAvailable: boolean = true
  ): Promise<IBalance> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const balance = await this.getBalance(entityId, currency);
    if (!balance) {
      throw new Error(`Balance not found for entity: ${entityId}`);
    }

    if (balance.reservedBalance < amount) {
      throw new Error(`Insufficient reserved balance. Reserved: ${balance.reservedBalance}, Required: ${amount}`);
    }

    balance.reservedBalance -= amount;
    if (releaseToAvailable) {
      balance.availableBalance += amount;
    }
    balance.lastUpdated = new Date();
    balance.updatedAt = new Date();

    balanceStore[this.getBalanceKey(entityId, currency)] = balance;

    return balance;
  }

  /**
   * Move funds from reserved to pending
   */
  async moveToPending(
    entityId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<IBalance> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const balance = await this.getBalance(entityId, currency);
    if (!balance) {
      throw new Error(`Balance not found for entity: ${entityId}`);
    }

    if (balance.reservedBalance < amount) {
      throw new Error(`Insufficient reserved balance. Reserved: ${balance.reservedBalance}, Required: ${amount}`);
    }

    balance.reservedBalance -= amount;
    balance.pendingBalance += amount;
    balance.lastUpdated = new Date();
    balance.updatedAt = new Date();

    balanceStore[this.getBalanceKey(entityId, currency)] = balance;

    return balance;
  }

  /**
   * Clear pending balance (after payment completes or fails)
   */
  async clearPending(
    entityId: string,
    amount: number,
    currency: string = 'USD',
    addToAvailable: boolean = false
  ): Promise<IBalance> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const balance = await this.getBalance(entityId, currency);
    if (!balance) {
      throw new Error(`Balance not found for entity: ${entityId}`);
    }

    if (balance.pendingBalance < amount) {
      throw new Error(`Insufficient pending balance. Pending: ${balance.pendingBalance}, Required: ${amount}`);
    }

    balance.pendingBalance -= amount;
    if (addToAvailable) {
      balance.availableBalance += amount;
    }
    balance.lastUpdated = new Date();
    balance.updatedAt = new Date();

    balanceStore[this.getBalanceKey(entityId, currency)] = balance;

    return balance;
  }

  /**
   * Transfer funds between entities
   */
  async transferFunds(
    fromEntityId: string,
    toEntityId: string,
    amount: number,
    currency: string = 'USD',
    referenceId?: string
  ): Promise<{ fromBalance: IBalance; toBalance: IBalance }> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (fromEntityId === toEntityId) {
      throw new Error('Cannot transfer to the same entity');
    }

    // Deduct from sender
    const fromBalance = await this.deductFunds(fromEntityId, amount, currency);

    // Add to receiver
    const toBalance = await this.addFunds(toEntityId, fromBalance.entityType, amount, currency);

    return { fromBalance, toBalance };
  }

  /**
   * Convert currency
   */
  async convertCurrency(
    entityId: string,
    fromCurrency: string,
    toCurrency: string,
    amount: number
  ): Promise<{ fromBalance: IBalance; toBalance: IBalance; convertedAmount: number; rate: number }> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (fromCurrency === toCurrency) {
      throw new Error('Cannot convert to the same currency');
    }

    const fromRate = EXCHANGE_RATES[fromCurrency];
    const toRate = EXCHANGE_RATES[toCurrency];

    if (!fromRate || !toRate) {
      throw new Error('Unsupported currency');
    }

    // Convert amount
    const rate = fromRate / toRate;
    const convertedAmount = Math.round(amount * rate * 100) / 100;

    // Deduct from source currency
    const fromBalance = await this.deductFunds(entityId, amount, fromCurrency);

    // Add to target currency
    const toBalance = await this.addFunds(entityId, fromBalance.entityType, convertedAmount, toCurrency);

    return { fromBalance, toBalance, convertedAmount, rate };
  }

  /**
   * Get balance summary for an entity
   */
  async getBalanceSummary(entityId: string): Promise<{
    primaryCurrency: IBalance | null;
    allCurrencies: IBalance[];
    totalAvailable: number;
    totalPending: number;
    totalReserved: number;
    totalBalance: number;
    primaryCurrencyCode: string;
  }> {
    const allCurrencies = await this.getAllBalances(entityId);

    if (allCurrencies.length === 0) {
      return {
        primaryCurrency: null,
        allCurrencies: [],
        totalAvailable: 0,
        totalPending: 0,
        totalReserved: 0,
        totalBalance: 0,
        primaryCurrencyCode: 'USD'
      };
    }

    const primaryCurrency = allCurrencies.find(b => b.currency === 'USD') || allCurrencies[0];

    return {
      primaryCurrency,
      allCurrencies,
      totalAvailable: allCurrencies.reduce((sum, b) => sum + b.availableBalance, 0),
      totalPending: allCurrencies.reduce((sum, b) => sum + b.pendingBalance, 0),
      totalReserved: allCurrencies.reduce((sum, b) => sum + b.reservedBalance, 0),
      totalBalance: allCurrencies.reduce((sum, b) => sum + b.totalBalance, 0),
      primaryCurrencyCode: primaryCurrency.currency
    };
  }

  /**
   * Check if entity has sufficient balance
   */
  async hasSufficientBalance(
    entityId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<boolean> {
    const balance = await this.getBalance(entityId, currency);
    if (!balance) {
      return false;
    }
    return balance.availableBalance >= amount;
  }

  /**
   * Get balance history (simplified - tracks changes)
   */
  async getBalanceHistory(
    entityId: string,
    currency: string = 'USD'
  ): Promise<Array<{
    timestamp: Date;
    availableBalance: number;
    pendingBalance: number;
    reservedBalance: number;
    totalBalance: number;
    change: number;
  }>> {
    // In production, this would query a separate history collection
    // For now, return current state with estimated history
    const balance = await this.getBalance(entityId, currency);
    if (!balance) {
      return [];
    }

    return [{
      timestamp: balance.lastUpdated,
      availableBalance: balance.availableBalance,
      pendingBalance: balance.pendingBalance,
      reservedBalance: balance.reservedBalance,
      totalBalance: balance.totalBalance,
      change: 0
    }];
  }

  /**
   * Admin: Set balance directly
   */
  async setBalance(
    entityId: string,
    entityType: 'user' | 'business' | 'agent',
    availableBalance: number,
    currency: string = 'USD'
  ): Promise<IBalance> {
    const balance = await this.getOrCreateBalance(entityId, entityType, currency);

    balance.availableBalance = availableBalance;
    balance.totalBalance = availableBalance + balance.pendingBalance + balance.reservedBalance;
    balance.lastUpdated = new Date();
    balance.updatedAt = new Date();

    balanceStore[this.getBalanceKey(entityId, currency)] = balance;

    return balance;
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): typeof SUPPORTED_CURRENCIES {
    return SUPPORTED_CURRENCIES;
  }

  /**
   * Get exchange rate
   */
  getExchangeRate(fromCurrency: string, toCurrency: string): number {
    const fromRate = EXCHANGE_RATES[fromCurrency];
    const toRate = EXCHANGE_RATES[toCurrency];

    if (!fromRate || !toRate) {
      throw new Error('Unsupported currency');
    }

    return fromRate / toRate;
  }

  /**
   * Get all balances for a currency (admin)
   */
  async getAllBalancesForCurrency(currency: string): Promise<IBalance[]> {
    return Object.values(balanceStore).filter(b => b.currency === currency);
  }

  /**
   * Get total platform balance for a currency (admin)
   */
  async getPlatformBalance(currency: string = 'USD'): Promise<{
    totalAvailable: number;
    totalPending: number;
    totalReserved: number;
    totalBalance: number;
    accountCount: number;
  }> {
    const balances = await this.getAllBalancesForCurrency(currency);

    return {
      totalAvailable: balances.reduce((sum, b) => sum + b.availableBalance, 0),
      totalPending: balances.reduce((sum, b) => sum + b.pendingBalance, 0),
      totalReserved: balances.reduce((sum, b) => sum + b.reservedBalance, 0),
      totalBalance: balances.reduce((sum, b) => sum + b.totalBalance, 0),
      accountCount: balances.length
    };
  }
}

// Export singleton instance
export const balanceService = new BalanceService();
