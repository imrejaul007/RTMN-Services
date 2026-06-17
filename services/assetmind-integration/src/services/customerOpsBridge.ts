import axios, { AxiosInstance } from 'axios';

export interface TwinConnection {
  name: string;
  url: string;
  connected: boolean;
  lastSync?: Date;
}

export interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  segment?: string;
  tier?: string;
}

export interface PaymentData {
  customerId: string;
  transactions: Transaction[];
  walletBalance: number;
  paymentMethods: PaymentMethod[];
  kycStatus: string;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  status: string;
  date: Date;
  description?: string;
}

export interface PaymentMethod {
  type: 'card' | 'bank' | 'wallet';
  last4: string;
  isDefault: boolean;
}

export interface DealData {
  customerId: string;
  deals: Deal[];
  totalDealValue: number;
  activeDeals: number;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  status: 'open' | 'won' | 'lost';
  closeDate?: Date;
}

export class CustomerOpsBridge {
  private logger: any;
  private http: AxiosInstance;
  private twins: Map<string, TwinConnection> = new Map();

  constructor(logger: any) {
    this.logger = logger;

    // Initialize twin connections
    this.twins.set('industry-finance', {
      name: 'Industry Twin (Finance)',
      url: process.env.INDUSTRY_TWIN_URL || 'http://localhost:3018',
      connected: false
    });

    this.twins.set('payment', {
      name: 'Payment Twin',
      url: process.env.PAYMENT_TWIN_URL || 'http://localhost:4004',
      connected: false
    });

    this.twins.set('customer', {
      name: 'Customer Twin',
      url: process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017',
      connected: false
    });

    this.http = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Register service with Service Registry
   */
  async registerService(port: number): Promise<boolean> {
    try {
      const registryUrl = process.env.SERVICE_REGISTRY_URL || 'http://localhost:4399';
      const serviceData = {
        name: 'assetmind-integration',
        version: '1.0.0',
        port,
        healthUrl: `http://localhost:${port}/health`,
        description: 'AssetMind Wealth Management - Customer Operations Bridge',
        twins: ['industry-finance', 'payment', 'customer'],
        routes: [
          { path: '/api/investments', methods: ['GET', 'POST'] },
          { path: '/api/portfolio', methods: ['GET', 'POST', 'PUT'] },
          { path: '/api/analytics', methods: ['GET'] }
        ]
      };

      await this.http.post(`${registryUrl}/api/services`, serviceData);

      this.logger.info('Service registered with registry');
      return true;
    } catch (error: any) {
      this.logger.warn('Service registry registration failed:', error.message);
      return false;
    }
  }

  /**
   * Get customer data from Customer Twin
   */
  async getCustomerFromTwin(customerId: string): Promise<CustomerData | null> {
    try {
      const twinUrl = this.twins.get('customer')!.url;
      const response = await this.http.get(`${twinUrl}/api/twin/customer/${customerId}`);

      this.twins.get('customer')!.connected = true;
      this.twins.get('customer')!.lastSync = new Date();

      return response.data;
    } catch (error: any) {
      this.logger.warn(`Failed to get customer from twin: ${error.message}`);

      // Return mock data for demo
      return {
        id: customerId,
        name: 'Customer ' + customerId.slice(-4),
        email: `customer${customerId.slice(-4)}@example.com`,
        segment: 'affluent',
        tier: 'gold'
      };
    }
  }

  /**
   * Get payment data from Payment Twin
   */
  async getPaymentFromTwin(customerId: string): Promise<PaymentData | null> {
    try {
      const twinUrl = this.twins.get('payment')!.url;
      const response = await this.http.get(`${twinUrl}/api/payments/customer/${customerId}`);

      this.twins.get('payment')!.connected = true;
      this.twins.get('payment')!.lastSync = new Date();

      return response.data;
    } catch (error: any) {
      this.logger.warn(`Failed to get payment from twin: ${error.message}`);

      // Return mock data for demo
      return {
        customerId,
        transactions: [],
        walletBalance: 0,
        paymentMethods: [],
        kycStatus: 'verified'
      };
    }
  }

  /**
   * Get deal data from Industry Twin (Finance)
   */
  async getDealFromTwin(customerId: string): Promise<DealData | null> {
    try {
      const twinUrl = this.twins.get('industry-finance')!.url;
      const response = await this.http.get(`${twinUrl}/api/twin/deals/customer/${customerId}`);

      this.twins.get('industry-finance')!.connected = true;
      this.twins.get('industry-finance')!.lastSync = new Date();

      return response.data;
    } catch (error: any) {
      this.logger.warn(`Failed to get deals from twin: ${error.message}`);

      // Return mock data for demo
      return {
        customerId,
        deals: [],
        totalDealValue: 0,
        activeDeals: 0
      };
    }
  }

  /**
   * Push wealth data to Customer Twin
   */
  async syncToCustomerTwin(customerId: string, wealthData: any): Promise<boolean> {
    try {
      const twinUrl = this.twins.get('customer')!.url;
      await this.http.patch(`${twinUrl}/api/twin/customer/${customerId}`, {
        wealthProfile: wealthData
      });

      this.logger.info(`Wealth data synced to Customer Twin for ${customerId}`);
      return true;
    } catch (error: any) {
      this.logger.warn(`Failed to sync to Customer Twin: ${error.message}`);
      return false;
    }
  }

  /**
   * Push financial events to Event Bus
   */
  async publishFinancialEvent(eventType: string, data: any): Promise<boolean> {
    try {
      const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';

      await this.http.post(`${eventBusUrl}/api/events`, {
        type: eventType,
        source: 'assetmind-integration',
        data,
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Financial event published: ${eventType}`);
      return true;
    } catch (error: any) {
      this.logger.warn(`Failed to publish event: ${error.message}`);
      return false;
    }
  }

  /**
   * Subscribe to customer events
   */
  async subscribeToCustomerEvents(callback: (event: any) => void): Promise<void> {
    try {
      const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';

      await this.http.post(`${eventBusUrl}/api/subscriptions`, {
        service: 'assetmind-integration',
        events: [
          'customer.created',
          'customer.updated',
          'customer.segment.changed',
          'payment.completed',
          'deal.closed'
        ],
        callbackUrl: `http://localhost:${process.env.PORT || 4969}/api/events/webhook`
      });

      this.logger.info('Subscribed to customer events');
    } catch (error: any) {
      this.logger.warn(`Failed to subscribe to events: ${error.message}`);
    }
  }

  /**
   * Get all twin connection statuses
   */
  getTwinStatuses(): TwinConnection[] {
    return Array.from(this.twins.values());
  }

  /**
   * Check twin health
   */
  async checkTwinHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();

    for (const [key, twin] of this.twins) {
      try {
        const response = await this.http.get(`${twin.url}/health`, { timeout: 5000 });
        healthStatus.set(key, response.status === 200);
        twin.connected = response.status === 200;
      } catch {
        healthStatus.set(key, false);
        twin.connected = false;
      }
    }

    return healthStatus;
  }
}
