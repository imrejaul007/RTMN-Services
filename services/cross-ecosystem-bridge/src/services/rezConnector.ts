/**
 * REZ Services Connector
 * Connects to REZ services (Consumer, Merchant, POS, Orders, Payments, Wallet)
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export interface RezConsumerProfile {
  userId: string;
  email?: string;
  phone?: string;
  name?: {
    first?: string;
    last?: string;
    full?: string;
  };
  avatar?: string;
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints?: number;
  addresses?: Array<{
    type: 'home' | 'work' | 'other';
    street: string;
    city: string;
    state: string;
    zip: string;
  }>;
  preferences?: Record<string, unknown>;
}

export interface RezOrder {
  orderId: string;
  userId: string;
  merchantId: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod: string;
  createdAt: Date;
  deliveredAt?: Date;
}

export interface RezPaymentInfo {
  userId: string;
  paymentMethods: Array<{
    type: 'card' | 'wallet' | 'upi' | 'bank';
    last4?: string;
    isDefault: boolean;
  }>;
  walletBalance?: number;
}

export interface RezMerchantInfo {
  merchantId: string;
  name: string;
  type: 'restaurant' | 'retail' | 'hotel' | 'service';
  rating?: number;
  categories?: string[];
}

class RezConnector {
  private consumerClient: AxiosInstance;
  private merchantClient: AxiosInstance;
  private ordersClient: AxiosInstance;
  private paymentsClient: AxiosInstance;
  private walletClient: AxiosInstance;

  constructor() {
    const consumerUrl = process.env.REZ_CONSUMER_URL || 'http://localhost:3000';
    const merchantUrl = process.env.REZ_MERCHANT_URL || 'http://localhost:4800';
    const ordersUrl = process.env.REZ_ORDERS_URL || 'http://localhost:4801';
    const paymentsUrl = process.env.REZ_PAYMENTS_URL || 'http://localhost:4803';
    const walletUrl = process.env.REZ_WALLET_URL || 'http://localhost:4004';

    this.consumerClient = axios.create({
      baseURL: consumerUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.merchantClient = axios.create({
      baseURL: merchantUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.ordersClient = axios.create({
      baseURL: ordersUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.paymentsClient = axios.create({
      baseURL: paymentsUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.walletClient = axios.create({
      baseURL: walletUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ==================== Consumer Methods ====================

  /**
   * Get consumer profile by ID
   */
  async getConsumerProfile(userId: string, token?: string): Promise<RezConsumerProfile | null> {
    try {
      const response = await this.consumerClient.get(`/api/users/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`REZ getConsumerProfile failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get consumer by email or phone
   */
  async findConsumerByIdentifier(identifier: string, type: 'email' | 'phone'): Promise<RezConsumerProfile | null> {
    try {
      const response = await this.consumerClient.get('/api/users/find', {
        params: { [type]: identifier },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`REZ findConsumerByIdentifier failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get consumer order history
   */
  async getOrderHistory(userId: string, limit: number = 20): Promise<RezOrder[]> {
    try {
      const response = await this.ordersClient.get('/api/orders', {
        params: { userId, limit },
      });
      return response.data.orders || [];
    } catch (error: any) {
      logger.warn(`REZ getOrderHistory failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get consumer spending summary
   */
  async getSpendingSummary(userId: string): Promise<{
    totalOrders: number;
    totalSpend: number;
    averageOrderValue: number;
    favoriteCategories: string[];
    lastOrderDate?: Date;
  } | null> {
    try {
      const response = await this.ordersClient.get(`/api/orders/summary/${userId}`);
      return response.data;
    } catch (error: any) {
      logger.warn(`REZ getSpendingSummary failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get consumer loyalty info
   */
  async getLoyaltyInfo(userId: string): Promise<{
    points: number;
    tier: string;
    pointsHistory: Array<{ date: Date; points: number; reason: string }>;
  } | null> {
    try {
      const response = await this.merchantClient.get(`/api/loyalty/${userId}`);
      return response.data;
    } catch (error: any) {
      logger.warn(`REZ getLoyaltyInfo failed: ${error.message}`);
      return null;
    }
  }

  // ==================== Merchant Methods ====================

  /**
   * Get merchant profile
   */
  async getMerchantProfile(merchantId: string, token?: string): Promise<RezMerchantInfo | null> {
    try {
      const response = await this.merchantClient.get(`/api/merchants/${merchantId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`REZ getMerchantProfile failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get merchant orders
   */
  async getMerchantOrders(merchantId: string, status?: string): Promise<RezOrder[]> {
    try {
      const response = await this.ordersClient.get('/api/orders', {
        params: { merchantId, status },
      });
      return response.data.orders || [];
    } catch (error: any) {
      logger.warn(`REZ getMerchantOrders failed: ${error.message}`);
      return [];
    }
  }

  // ==================== Payment Methods ====================

  /**
   * Get payment methods for user
   */
  async getPaymentMethods(userId: string, token?: string): Promise<RezPaymentInfo['paymentMethods']> {
    try {
      const response = await this.paymentsClient.get(`/api/payments/${userId}/methods`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data.methods || [];
    } catch (error: any) {
      logger.warn(`REZ getPaymentMethods failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(userId: string, token?: string): Promise<number> {
    try {
      const response = await this.walletClient.get(`/api/wallet/${userId}/balance`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data.balance || 0;
    } catch (error: any) {
      logger.warn(`REZ getWalletBalance failed: ${error.message}`);
      return 0;
    }
  }

  /**
   * Create order
   */
  async createOrder(orderData: Partial<RezOrder>, token?: string): Promise<RezOrder | null> {
    try {
      const response = await this.ordersClient.post('/api/orders', orderData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error: any) {
      logger.warn(`REZ createOrder failed: ${error.message}`);
      return null;
    }
  }

  // ==================== POS Methods ====================

  /**
   * Get POS transactions
   */
  async getPOSTransactions(posId: string, date?: string): Promise<Array<{
    transactionId: string;
    amount: number;
    type: 'sale' | 'refund';
    timestamp: Date;
  }>> {
    try {
      const posUrl = process.env.REZ_POS_URL || 'http://localhost:4800';
      const posClient = axios.create({
        baseURL: posUrl,
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await posClient.get('/api/pos/transactions', {
        params: { posId, date },
      });
      return response.data.transactions || [];
    } catch (error: any) {
      logger.warn(`REZ getPOSTransactions failed: ${error.message}`);
      return [];
    }
  }

  // ==================== Status & Health ====================

  /**
   * Get all REZ services status
   */
  async getServicesStatus(): Promise<Record<string, 'up' | 'down' | 'unknown'>> {
    const status: Record<string, 'up' | 'down' | 'unknown'> = {};
    const services = [
      { name: 'rez-consumer', url: '/api/health' },
      { name: 'rez-merchant', url: '/api/health' },
      { name: 'rez-orders', url: '/health' },
      { name: 'rez-payments', url: '/health' },
      { name: 'rez-wallet', url: '/api/health' },
    ];

    const bases = [
      process.env.REZ_CONSUMER_URL || 'http://localhost:3000',
      process.env.REZ_MERCHANT_URL || 'http://localhost:4800',
      process.env.REZ_ORDERS_URL || 'http://localhost:4801',
      process.env.REZ_PAYMENTS_URL || 'http://localhost:4803',
      process.env.REZ_WALLET_URL || 'http://localhost:4004',
    ];

    for (let i = 0; i < services.length; i++) {
      try {
        const client = axios.create({ baseURL: bases[i], timeout: 5000 });
        await client.get(services[i].url);
        status[services[i].name] = 'up';
      } catch {
        status[services[i].name] = 'down';
      }
    }

    return status;
  }

  /**
   * Link REZ consumer to ecosystem profile
   */
  async linkToEcosystem(
    rezUserId: string,
    ecosystemProfileId: string,
    token?: string
  ): Promise<boolean> {
    try {
      await this.consumerClient.post(
        `/api/users/${rezUserId}/link`,
        { ecosystemProfileId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`REZ linkToEcosystem failed: ${error.message}`);
      return false;
    }
  }
}

// Singleton instance
export const rezConnector = new RezConnector();
export default rezConnector;
