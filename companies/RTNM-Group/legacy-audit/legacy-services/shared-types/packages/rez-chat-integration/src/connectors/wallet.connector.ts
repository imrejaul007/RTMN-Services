// ── Wallet Connector ──────────────────────────────────────────────────────────────
// Connects to wallet services

import axios, { AxiosInstance } from 'axios';

export interface WalletBalance {
  userId: string;
  cashBalance: number;      // In ₹
  coinBalance: number;       // ReZ Coins
  coinValueInRupee: number;  // Coin value conversion
  totalValue: number;        // Total wallet value
  expiringCoins: Array<{
    amount: number;
    expiresAt: string;
    daysUntilExpiry: number;
  }>;
}

export interface CheckoutCalculation {
  orderValue: number;
  coinsAvailable: number;
  coinsUsable: number;
  coinValue: number;
  rewardsAvailable: number;
  rewardsUsable: number;
  discount: number;
  finalAmount: number;
  savings: number;
}

export interface CoinTransaction {
  id: string;
  type: 'earned' | 'burned' | 'expired' | 'refunded';
  amount: number;
  balance: number;
  reason: string;
  timestamp: string;
  relatedOrderId?: string;
}

export class WalletConnector {
  private client: AxiosInstance;

  constructor(config?: { baseUrl?: string; apiKey?: string }) {
    const baseURL = config?.baseUrl || process.env.WALLET_SERVICE_URL || 'https://rez-wallet-service.onrender.com';
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey && { 'x-api-key': config.apiKey }),
      },
    });
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<WalletBalance | null> {
    try {
      const response = await this.client.get('/v1/wallet/balance', {
        params: { userId },
      });

      const data = response.data;

      return {
        userId,
        cashBalance: data.cashBalance || data.cash || 0,
        coinBalance: data.coinBalance || data.coins || 0,
        coinValueInRupee: data.coinValue || 0.25, // Default: 1 coin = ₹0.25
        totalValue: data.totalValue || (data.cashBalance || 0) + ((data.coinBalance || 0) * 0.25),
        expiringCoins: data.expiringCoins || [],
      };
    } catch (error: any) {
      console.error('[WalletConnector] Get balance error:', error.message);
      return {
        userId,
        cashBalance: 0,
        coinBalance: 0,
        coinValueInRupee: 0.25,
        totalValue: 0,
        expiringCoins: [],
      };
    }
  }

  /**
   * Calculate checkout with coins/rewards
   */
  async calculateCheckout(params: {
    orderValuePaise: number;
    useCoins?: boolean;
    useRewards?: boolean;
    userId: string;
    merchantId?: string;
  }): Promise<CheckoutCalculation | null> {
    try {
      const orderValue = params.orderValuePaise / 100;
      const wallet = await this.getBalance(params.userId);

      if (!wallet) {
        return {
          orderValue,
          coinsAvailable: 0,
          coinsUsable: 0,
          coinValue: 0,
          rewardsAvailable: 0,
          rewardsUsable: 0,
          discount: 0,
          finalAmount: orderValue,
          savings: 0,
        };
      }

      // Calculate max coins usable (max 50% of order value)
      const maxCoinDiscount = orderValue * 0.5;
      const maxCoinsValueable = wallet.coinBalance * wallet.coinValueInRupee;
      const coinsUsable = Math.min(maxCoinDiscount, maxCoinValueable);
      const coinsUsableNumber = Math.floor(coinsUsable / wallet.coinValueInRupee);
      const coinValue = coinsUsableNumber * wallet.coinValueInRupee;

      const discount = params.useCoins ? coinValue : 0;
      const finalAmount = Math.max(0, orderValue - discount);
      const savings = discount;

      return {
        orderValue,
        coinsAvailable: wallet.coinBalance,
        coinsUsable: params.useCoins ? coinsUsableNumber : 0,
        coinValue: params.useCoins ? coinValue : 0,
        rewardsAvailable: 0, // Would come from loyalty service
        rewardsUsable: 0,
        discount,
        finalAmount,
        savings,
      };
    } catch (error: any) {
      console.error('[WalletConnector] Calculate checkout error:', error.message);
      return null;
    }
  }

  /**
   * Get coin transaction history
   */
  async getTransactions(userId: string, limit?: number): Promise<CoinTransaction[]> {
    try {
      const response = await this.client.get('/v1/wallet/transactions', {
        params: { userId, limit: limit || 20 },
      });

      const transactions = response.data.transactions || response.data || [];

      return transactions.map((t: any) => ({
        id: t.id || t._id,
        type: t.type,
        amount: t.amount,
        balance: t.balance,
        reason: t.reason || t.description || '',
        timestamp: t.timestamp || t.createdAt,
        relatedOrderId: t.orderId || t.relatedOrderId,
      }));
    } catch (error: any) {
      console.error('[WalletConnector] Get transactions error:', error.message);
      return [];
    }
  }
}
