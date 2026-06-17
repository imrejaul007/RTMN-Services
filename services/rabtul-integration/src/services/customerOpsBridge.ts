import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

/**
 * CustomerOpsBridge - Connects RABTUL services to Customer Operations
 *
 * This bridge synchronizes customer data between RABTUL (Auth, Wallet, Payment)
 * and the Customer Operations layer (TwinOS Hub, Identity Twin, etc.)
 */
export class CustomerOpsBridge {
  private logger: winston.Logger;
  private twinHubClient: AxiosInstance;
  private identityTwinClient: AxiosInstance;
  private healthy: boolean = true;
  private lastSyncTime: Date | null = null;
  private syncQueue: Array<{
    type: string;
    data: any;
    timestamp: Date;
    retries: number;
  }> = [];

  constructor(logger: winston.Logger) {
    this.logger = logger;

    const twinHubUrl = process.env.CUSTOMER_OPS_URL || 'http://localhost:4705';
    const identityTwinUrl = process.env.IDENTITY_TWIN_URL || 'http://localhost:4702';

    this.twinHubClient = axios.create({
      baseURL: twinHubUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.identityTwinClient = axios.create({
      baseURL: identityTwinUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Set up retry interceptor
    this.setupInterceptors();

    this.logger.info('CustomerOpsBridge initialized', {
      twinHubUrl,
      identityTwinUrl
    });
  }

  private setupInterceptors(): void {
    // Response interceptor for error handling
    this.twinHubClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        this.healthy = false;
        const originalRequest = error.config;

        if (!originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }

        if (originalRequest._retryCount < 3) {
          originalRequest._retryCount++;
          this.logger.warn('Retrying request to TwinHub', {
            url: originalRequest.url,
            retry: originalRequest._retryCount
          });
          return this.twinHubClient(originalRequest);
        }

        // Queue failed requests
        this.queueSync(originalRequest._syncType, originalRequest._syncData);
        throw error;
      }
    );
  }

  private queueSync(type: string, data: any): void {
    this.syncQueue.push({
      type,
      data,
      timestamp: new Date(),
      retries: 0
    });

    this.logger.info('Request queued for later sync', {
      type,
      queueSize: this.syncQueue.length
    });
  }

  /**
   * Sync user identity to Identity Twin
   */
  async syncIdentity(data: {
    id: string;
    corpid?: string;
    email: string;
    phone?: string;
    name: string;
    type?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; twinId?: string; error?: string }> {
    try {
      this.logger.debug('Syncing identity to Identity Twin', { id: data.id });

      const response = await this.identityTwinClient.post('/api/identity', {
        ...data,
        source: 'rabtul-auth',
        syncedAt: new Date().toISOString()
      });

      this.healthy = true;
      this.lastSyncTime = new Date();

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      this.logger.error('Failed to sync identity', {
        id: data.id,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync wallet data to TwinOS Hub
   */
  async syncWallet(data: {
    id: string;
    corpid: string;
    balance: number;
    currency: string;
    type: string;
    status: string;
  }): Promise<{ success: boolean; twinId?: string; error?: string }> {
    try {
      this.logger.debug('Syncing wallet to TwinOS Hub', { id: data.id });

      const response = await this.twinHubClient.post('/api/twins/wallet', {
        ...data,
        source: 'rabtul-wallet',
        syncedAt: new Date().toISOString()
      });

      this.healthy = true;
      this.lastSyncTime = new Date();

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      this.logger.error('Failed to sync wallet', {
        id: data.id,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync payment profile to TwinOS Hub
   */
  async syncPaymentProfile(data: {
    id: string;
    corpid: string;
    riskLevel: string;
    fraudScore?: number;
    paymentMethods: string[];
  }): Promise<{ success: boolean; twinId?: string; error?: string }> {
    try {
      this.logger.debug('Syncing payment profile to TwinOS Hub', { id: data.id });

      const response = await this.twinHubClient.post('/api/twins/payment', {
        ...data,
        source: 'rabtul-payment',
        syncedAt: new Date().toISOString()
      });

      this.healthy = true;
      this.lastSyncTime = new Date();

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      this.logger.error('Failed to sync payment profile', {
        id: data.id,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get customer twin data
   */
  async getCustomerTwin(corpid: string): Promise<any | null> {
    try {
      const response = await this.twinHubClient.get(`/api/twins/customer/${corpid}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error('Failed to get customer twin', {
        corpid,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Process queued syncs
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    const itemsToProcess = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToProcess) {
      try {
        switch (item.type) {
          case 'identity':
            await this.syncIdentity(item.data);
            break;
          case 'wallet':
            await this.syncWallet(item.data);
            break;
          case 'payment':
            await this.syncPaymentProfile(item.data);
            break;
        }
        processed++;
      } catch {
        item.retries++;
        if (item.retries < 3) {
          this.syncQueue.push(item);
        } else {
          failed++;
        }
      }
    }

    return { processed, failed };
  }

  /**
   * Bulk sync customers to TwinOS Hub
   */
  async bulkSync(customers: Array<{
    type: 'identity' | 'wallet' | 'payment';
    data: any;
  }>): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const customer of customers) {
      try {
        switch (customer.type) {
          case 'identity':
            const identityResult = await this.syncIdentity(customer.data);
            if (identityResult.success) result.success++;
            else {
              result.failed++;
              result.errors.push(`Identity ${customer.data.id}: ${identityResult.error}`);
            }
            break;
          case 'wallet':
            const walletResult = await this.syncWallet(customer.data);
            if (walletResult.success) result.success++;
            else {
              result.failed++;
              result.errors.push(`Wallet ${customer.data.id}: ${walletResult.error}`);
            }
            break;
          case 'payment':
            const paymentResult = await this.syncPaymentProfile(customer.data);
            if (paymentResult.success) result.success++;
            else {
              result.failed++;
              result.errors.push(`Payment ${customer.data.id}: ${paymentResult.error}`);
            }
            break;
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push(`${customer.type}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Check bridge health
   */
  isHealthy(): boolean {
    return this.healthy && this.syncQueue.length < 100;
  }

  /**
   * Get bridge status
   */
  getStatus(): {
    healthy: boolean;
    lastSyncTime: Date | null;
    queueSize: number;
  } {
    return {
      healthy: this.isHealthy(),
      lastSyncTime: this.lastSyncTime,
      queueSize: this.syncQueue.length
    };
  }
}
