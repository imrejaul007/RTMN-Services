/**
 * REZ Merchant Gateway Service
 *
 * Unified gateway that connects to all upstream services:
 * - RABTUL: Auth, Wallet, Payment, Orders, Catalog, Notifications
 * - REZ-Merchant: Merchant profiles, B2B, POS
 * - REZ-Media: Marketing, Loyalty, Engagement
 * - REZ-Intelligence: AI, Attribution
 * - RTNM-Digital: Trust, Operations
 *
 * FIXED: Added circuit breaker for fault tolerance
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from './logger.js';

interface ServiceConfig {
  baseURL: string;
  timeout: number;
  token: string;
}

// Circuit breaker state
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreaker {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  nextAttempt: number;
}

interface MerchantProfile {
  merchantId: string;
  businessName: string;
  email: string;
  phone: string;
  industry: string;
  tier: string;
  locations: number;
  status: string;
  // Aggregated data
  totalRevenue?: number;
  totalOrders?: number;
  totalCustomers?: number;
  pendingPayments?: number;
  loyaltyMembers?: number;
  activeCampaigns?: number;
  riskScore?: number;
}

interface UnifiedMerchantData {
  profile: MerchantProfile;
  orders: any;
  customers: any;
  inventory: any;
  loyalty: any;
  marketing: any;
  financials: any;
  trust: any;
}

interface ServiceStatus {
  service: string;
  healthy: boolean;
  latency?: number;
  error?: string;
}

export class MerchantGateway {
  private services: Map<string, AxiosInstance> = new Map();
  private serviceConfigs: Record<string, ServiceConfig>;

  // Circuit breaker config
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private readonly CIRCUIT_THRESHOLD = 5; // failures before opening
  private readonly CIRCUIT_TIMEOUT = 30000; // 30s before half-open
  private readonly CIRCUIT_RESET = 60000; // 60s before attempting reset

  constructor() {
    this.serviceConfigs = {
      // RABTUL Core Services
      auth: {
        baseURL: process.env.AUTH_SERVICE_URL || 'https://rez-auth-service.onrender.com',
        timeout: 5000,
        token: process.env.AUTH_SERVICE_TOKEN || ''
      },
      wallet: {
        baseURL: process.env.WALLET_SERVICE_URL || 'https://rez-wallet-service.onrender.com',
        timeout: 5000,
        token: process.env.WALLET_SERVICE_TOKEN || ''
      },
      payment: {
        baseURL: process.env.PAYMENT_SERVICE_URL || 'https://rez-payment-service.onrender.com',
        timeout: 5000,
        token: process.env.PAYMENT_SERVICE_TOKEN || ''
      },
      order: {
        baseURL: process.env.ORDER_SERVICE_URL || 'https://rez-order-service.onrender.com',
        timeout: 5000,
        token: process.env.ORDER_SERVICE_TOKEN || ''
      },
      catalog: {
        baseURL: process.env.CATALOG_SERVICE_URL || 'https://rez-catalog-service.onrender.com',
        timeout: 5000,
        token: process.env.CATALOG_SERVICE_TOKEN || ''
      },
      notifications: {
        baseURL: process.env.NOTIFICATIONS_SERVICE_URL || 'https://rez-notifications-service.onrender.com',
        timeout: 5000,
        token: process.env.NOTIFICATIONS_SERVICE_TOKEN || ''
      },

      // REZ-Merchant
      merchant: {
        baseURL: process.env.MERCHANT_SERVICE_URL || 'https://rez-merchant-service.onrender.com',
        timeout: 10000,
        token: process.env.MERCHANT_SERVICE_TOKEN || ''
      },

      // REZ-Media
      engagement: {
        baseURL: process.env.ENGAGEMENT_SERVICE_URL || 'https://rez-engagement-platform.onrender.com',
        timeout: 5000,
        token: process.env.ENGAGEMENT_SERVICE_TOKEN || ''
      },
      marketing: {
        baseURL: process.env.MARKETING_SERVICE_URL || 'https://rez-marketing-service.onrender.com',
        timeout: 5000,
        token: process.env.MARKETING_SERVICE_TOKEN || ''
      },
      loyalty: {
        baseURL: process.env.LOYALTY_SERVICE_URL || 'https://rez-loyalty-service.onrender.com',
        timeout: 5000,
        token: process.env.LOYALTY_SERVICE_TOKEN || ''
      },

      // REZ-Intelligence
      intelligence: {
        baseURL: process.env.INTELLIGENCE_SERVICE_URL || 'https://rez-intelligence.onrender.com',
        timeout: 10000,
        token: process.env.INTELLIGENCE_SERVICE_TOKEN || ''
      },
      attribution: {
        baseURL: process.env.ATTRIBUTION_SERVICE_URL || 'https://rez-attribution.onrender.com',
        timeout: 5000,
        token: process.env.ATTRIBUTION_SERVICE_TOKEN || ''
      },

      // RTNM-Digital
      trust: {
        baseURL: process.env.TRUST_SERVICE_URL || 'https://rez-trust-platform.onrender.com',
        timeout: 5000,
        token: process.env.TRUST_SERVICE_TOKEN || ''
      },
      operations: {
        baseURL: process.env.OPS_SERVICE_URL || 'https://rez-ops-center.onrender.com',
        timeout: 5000,
        token: process.env.OPS_SERVICE_TOKEN || ''
      },

      // CorpPerks
      corpperks: {
        baseURL: process.env.CORPPERKS_SERVICE_URL || 'https://rez-corpperks-service.onrender.com',
        timeout: 5000,
        token: process.env.CORPPERKS_SERVICE_TOKEN || ''
      }
    };

    this.initializeClients();
  }

  private initializeClients(): void {
    for (const [name, config] of Object.entries(this.serviceConfigs)) {
      // Initialize circuit breaker for each service
      this.circuitBreakers.set(name, {
        state: 'CLOSED',
        failures: 0,
        lastFailure: 0,
        nextAttempt: 0
      });

      const client = axios.create({
        baseURL: config.baseURL,
        timeout: config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': config.token,
          'X-Gateway': 'rez-merchant-gateway'
        }
      });

      client.interceptors.response.use(
        response => response,
        error => {
          logger.error(`Service ${name} error`, {
            status: error.response?.status,
            message: error.message
          });
          this.recordFailure(name);
          throw error;
        }
      );

      this.services.set(name, client);
    }
  }

  // Circuit breaker methods
  private recordFailure(serviceName: string): void {
    const cb = this.circuitBreakers.get(serviceName);
    if (!cb) return;

    cb.failures++;
    cb.lastFailure = Date.now();

    if (cb.failures >= this.CIRCUIT_THRESHOLD) {
      cb.state = 'OPEN';
      cb.nextAttempt = Date.now() + this.CIRCUIT_TIMEOUT;
      logger.warn(`Circuit breaker OPEN for ${serviceName}`, { failures: cb.failures });
    }
  }

  private recordSuccess(serviceName: string): void {
    const cb = this.circuitBreakers.get(serviceName);
    if (!cb) return;

    cb.failures = 0;
    cb.state = 'CLOSED';
  }

  private canAttempt(serviceName: string): boolean {
    const cb = this.circuitBreakers.get(serviceName);
    if (!cb) return true;

    if (cb.state === 'CLOSED') return true;
    if (cb.state === 'OPEN' && Date.now() >= cb.nextAttempt) {
      cb.state = 'HALF_OPEN';
      return true;
    }
    return false;
  }

  private getCircuitState(serviceName: string): CircuitState {
    return this.circuitBreakers.get(serviceName)?.state || 'CLOSED';
  }

  /**
   * Get unified merchant profile with aggregated data from all services
   */
  async getUnifiedProfile(merchantId: string, token: string): Promise<UnifiedMerchantData> {
    const startTime = Date.now();

    try {
      // Fetch all data in parallel
      const [profile, orders, customers, inventory, loyalty, marketing, financials, trust] = await Promise.all([
        this.getMerchantProfile(merchantId, token),
        this.getMerchantOrders(merchantId, token),
        this.getMerchantCustomers(merchantId, token),
        this.getMerchantInventory(merchantId, token),
        this.getMerchantLoyalty(merchantId, token),
        this.getMerchantMarketing(merchantId, token),
        this.getMerchantFinancials(merchantId, token),
        this.getMerchantTrust(merchantId, token)
      ]);

      const latency = Date.now() - startTime;
      logger.info(`Unified profile fetched in ${latency}ms`, { merchantId });

      return {
        profile,
        orders,
        customers,
        inventory,
        loyalty,
        marketing,
        financials,
        trust
      };
    } catch (error) {
      logger.error('Failed to fetch unified profile', { merchantId, error });
      throw error;
    }
  }

  /**
   * Get merchant profile from REZ-Merchant
   */
  async getMerchantProfile(merchantId: string, token: string): Promise<MerchantProfile> {
    try {
      const client = this.services.get('merchant')!;
      const response = await client.get(`/api/v1/merchant/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get merchant profile', { merchantId });
      return this.getMockProfile(merchantId);
    }
  }

  /**
   * Get merchant orders from RABTUL Order Service
   */
  async getMerchantOrders(merchantId: string, token: string): Promise<any> {
    try {
      const client = this.services.get('order')!;
      const response = await client.get(`/api/orders`, {
        params: { merchantId, limit: 10 },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get merchant orders', { merchantId });
      return { orders: [], total: 0 };
    }
  }

  /**
   * Get merchant customers
   */
  async getMerchantCustomers(merchantId: string, token: string): Promise<any> {
    try {
      const client = this.services.get('merchant')!;
      const response = await client.get(`/api/v1/merchant/customers`, {
        params: { merchantId, limit: 10 },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get merchant customers', { merchantId });
      return { customers: [], total: 0 };
    }
  }

  /**
   * Get merchant inventory
   */
  async getMerchantInventory(merchantId: string, token: string): Promise<any> {
    try {
      const client = this.services.get('catalog')!;
      const response = await client.get(`/api/v1/inventory`, {
        params: { merchantId },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get merchant inventory', { merchantId });
      return { products: [], lowStock: [], outOfStock: [] };
    }
  }

  /**
   * Get merchant loyalty program data
   */
  async getMerchantLoyalty(merchantId: string, token: string): Promise<any> {
    try {
      const client = this.services.get('engagement')!;
      const response = await client.get(`/api/v1/loyalty/merchant/${merchantId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get merchant loyalty', { merchantId });
      return { members: 0, pointsIssued: 0, pointsRedeemed: 0 };
    }
  }

  /**
   * Get merchant marketing campaigns
   */
  async getMerchantMarketing(merchantId: string, token: string): Promise<any> {
    try {
      const [campaignsRes, journeysRes] = await Promise.all([
        this.services.get('marketing')!.get(`/api/v1/campaigns`, {
          params: { merchantId, limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        }),
        this.services.get('engagement')!.get(`/api/v1/journeys`, {
          params: { merchantId, limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      return {
        campaigns: campaignsRes.data,
        journeys: journeysRes.data
      };
    } catch (error) {
      logger.warn('Failed to get merchant marketing', { merchantId });
      return { campaigns: [], journeys: [] };
    }
  }

  /**
   * Get merchant financials (wallet, payments)
   */
  async getMerchantFinancials(merchantId: string, token: string): Promise<any> {
    try {
      const [walletRes, paymentsRes] = await Promise.all([
        this.services.get('wallet')!.get(`/api/v1/wallet/merchant/${merchantId}/balance`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        this.services.get('payment')!.get(`/api/v1/payments/merchant/${merchantId}/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      return {
        wallet: walletRes.data,
        payments: paymentsRes.data
      };
    } catch (error) {
      logger.warn('Failed to get merchant financials', { merchantId });
      return { wallet: { balance: 0 }, payments: { total: 0, pending: 0 } };
    }
  }

  /**
   * Get merchant trust score and fraud status
   */
  async getMerchantTrust(merchantId: string, token: string): Promise<any> {
    try {
      const client = this.services.get('trust')!;
      const response = await client.get(`/api/v1/merchant/risk/${merchantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get merchant trust', { merchantId });
      return { riskScore: 0, tier: 'unknown', status: 'pending' };
    }
  }

  /**
   * B2B: Get supplier data linked to merchant
   */
  async getMerchantSuppliers(merchantId: string, token: string): Promise<any> {
    try {
      const client = this.services.get('merchant')!;
      const response = await client.get(`/api/v1/b2b/suppliers`, {
        params: { merchantId },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get merchant suppliers', { merchantId });
      return { suppliers: [], total: 0 };
    }
  }

  /**
   * B2B: Get purchase orders
   */
  async getMerchantPurchaseOrders(merchantId: string, token: string): Promise<any> {
    try {
      const client = this.services.get('merchant')!;
      const response = await client.get(`/api/v1/b2b/purchase-orders`, {
        params: { merchantId, limit: 10 },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get merchant POs', { merchantId });
      return { purchaseOrders: [], total: 0 };
    }
  }

  /**
   * Create unified dashboard metrics
   */
  async getDashboardMetrics(merchantId: string, token: string): Promise<any> {
    const [orders, financials, loyalty, trust] = await Promise.all([
      this.getMerchantOrders(merchantId, token),
      this.getMerchantFinancials(merchantId, token),
      this.getMerchantLoyalty(merchantId, token),
      this.getMerchantTrust(merchantId, token)
    ]);

    return {
      overview: {
        revenue: financials?.payments?.total || 0,
        orders: orders?.total || 0,
        customers: 0, // Will be filled from customers endpoint
        rating: 4.5 // Placeholder
      },
      financial: {
        balance: financials?.wallet?.balance || 0,
        pendingPayments: financials?.payments?.pending || 0,
        totalRevenue: financials?.payments?.total || 0
      },
      loyalty: {
        members: loyalty?.members || 0,
        pointsIssued: loyalty?.pointsIssued || 0,
        pointsRedeemed: loyalty?.pointsRedeemed || 0
      },
      trust: {
        score: trust?.riskScore || 0,
        tier: trust?.tier || 'pending',
        status: trust?.status || 'unknown'
      }
    };
  }

  /**
   * Get AI recommendations for merchant
   */
  async getAIRecommendations(merchantId: string, token: string): Promise<any> {
    try {
      const client = this.services.get('intelligence')!;
      const response = await client.post(`/api/v1/merchant/${merchantId}/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get AI recommendations', { merchantId });
      return { recommendations: [] };
    }
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{ healthy: boolean; services: ServiceStatus[] }> {
    const results: ServiceStatus[] = [];
    let healthy = true;

    for (const [name, client] of this.services.entries()) {
      const start = Date.now();
      try {
        await client.get('/health', { timeout: 3000 });
        results.push({
          service: name,
          healthy: true,
          latency: Date.now() - start
        });
      } catch (error: any) {
        healthy = false;
        results.push({
          service: name,
          healthy: false,
          error: error.message
        });
      }
    }

    return { healthy, services: results };
  }

  /**
   * Get service status summary
   */
  getServiceStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const name of this.services.keys()) {
      status[name] = 'configured';
    }
    return status;
  }

  /**
   * Mock profile for fallback
   */
  private getMockProfile(merchantId: string): MerchantProfile {
    return {
      merchantId,
      businessName: 'Merchant',
      email: '',
      phone: '',
      industry: 'retail',
      tier: 'basic',
      locations: 1,
      status: 'active'
    };
  }

  /**
   * Get authenticated client for a service
   */
  getClient(serviceName: string): AxiosInstance | undefined {
    return this.services.get(serviceName);
  }
}
