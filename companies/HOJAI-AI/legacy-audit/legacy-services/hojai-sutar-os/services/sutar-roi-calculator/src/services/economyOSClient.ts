import { EconomyOSConfig, EconomyTransaction } from '../types/index.js';

/**
 * EconomyOS Client
 * Integrates with EconomyOS service (port 4251) for economic data and transactions
 */
export class EconomyOSClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config?: Partial<EconomyOSConfig>) {
    this.baseUrl = config?.baseUrl || 'http://localhost:4251';
    this.timeout = config?.timeout || 30000;
  }

  /**
   * Record a transaction in EconomyOS
   */
  async recordTransaction(transaction: Omit<EconomyTransaction, 'id'>): Promise<EconomyTransaction> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`EconomyOS error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('EconomyOS request timeout');
      }
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<EconomyTransaction | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/transactions/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`EconomyOS error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('EconomyOS request timeout');
      }
      throw error;
    }
  }

  /**
   * Get transactions by category
   */
  async getTransactionsByCategory(category: string): Promise<EconomyTransaction[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/transactions?category=${encodeURIComponent(category)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`EconomyOS error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('EconomyOS request timeout');
      }
      throw error;
    }
  }

  /**
   * Get economic metrics
   */
  async getEconomicMetrics(): Promise<{
    GDP?: number;
    inflationRate?: number;
    interestRate?: number;
    unemploymentRate?: number;
    currencyExchangeRates?: Record<string, number>;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`EconomyOS error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('EconomyOS request timeout');
      }
      // Return default values if unavailable
      console.warn('EconomyOS unavailable, using default metrics:', error);
      return {
        inflationRate: 2.5,
        interestRate: 4.5,
      };
    }
  }

  /**
   * Sync investment costs with EconomyOS
   */
  async syncCosts(costs: Array<{
    name: string;
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }>): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const cost of costs) {
      try {
        await this.recordTransaction({
          type: 'cost',
          amount: cost.amount,
          currency: cost.currency,
          category: 'investment',
          metadata: cost.metadata,
        });
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }

  /**
   * Sync investment benefits with EconomyOS
   */
  async syncBenefits(benefits: Array<{
    name: string;
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }>): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const benefit of benefits) {
      try {
        await this.recordTransaction({
          type: 'benefit',
          amount: benefit.amount,
          currency: benefit.currency,
          category: 'investment',
          metadata: benefit.metadata,
        });
        synced++;
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }

  /**
   * Get currency exchange rate
   */
  async getExchangeRate(from: string, to: string): Promise<number> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/v1/exchange-rate?from=${from}&to=${to}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`EconomyOS error: ${response.status}`);
      }

      const data = await response.json();
      return data.rate || 1;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('EconomyOS request timeout');
      }
      // Return 1:1 rate if unavailable
      console.warn('EconomyOS unavailable, using default exchange rate:', error);
      return 1;
    }
  }

  /**
   * Health check for EconomyOS
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default EconomyOSClient;
