/**
 * Customer Operations Bridge Service
 * Connects REZ ecosystem data to Customer Operations (TwinOS Hub)
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';
import { REZOrder, REZPayment, REZConsumerProfile, REZMerchantProfile, REZDeliveryProfile, REZShipment } from '../models/REZProfile';

export interface BridgeConfig {
  customerOpsUrl: string;
  customerOpsApiKey: string;
  eventBusUrl: string;
  eventBusApiKey: string;
}

export interface SyncResult {
  success: boolean;
  target: string;
  timestamp: Date;
  data?: any;
  error?: string;
}

export class CustomerOpsBridge {
  private logger: winston.Logger;
  private customerOpsClient: AxiosInstance;
  private eventBusClient: AxiosInstance;
  private config: BridgeConfig;
  private syncQueue: any[];
  private lastSync: Map<string, Date>;

  constructor(config?: Partial<BridgeConfig>) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [new winston.transports.Console()]
    });

    this.config = {
      customerOpsUrl: config?.customerOpsUrl || process.env.CUSTOMER_OPS_URL || 'http://localhost:4705',
      customerOpsApiKey: config?.customerOpsApiKey || process.env.CUSTOMER_OPS_API_KEY || '',
      eventBusUrl: config?.eventBusUrl || process.env.EVENT_BUS_URL || 'http://localhost:4510',
      eventBusApiKey: config?.eventBusApiKey || process.env.EVENT_BUS_API_KEY || ''
    };

    // Initialize HTTP clients
    this.customerOpsClient = axios.create({
      baseURL: this.config.customerOpsUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.customerOpsApiKey
      }
    });

    this.eventBusClient = axios.create({
      baseURL: this.config.eventBusUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.eventBusApiKey
      }
    });

    this.syncQueue = [];
    this.lastSync = new Map();
  }

  /**
   * Initialize the bridge and verify connectivity
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Customer Operations Bridge');

    try {
      // Test connectivity to Customer Ops
      await this.customerOpsClient.get('/health');
      this.logger.info('Connected to TwinOS Hub');
    } catch (error: any) {
      this.logger.warn('TwinOS Hub not reachable:', error.message);
    }

    try {
      // Test connectivity to Event Bus
      await this.eventBusClient.get('/health');
      this.logger.info('Connected to Event Bus');
    } catch (error: any) {
      this.logger.warn('Event Bus not reachable:', error.message);
    }
  }

  /**
   * Sync consumer profile to Customer Operations
   */
  async syncCustomerProfile(profile: REZConsumerProfile): Promise<SyncResult> {
    try {
      await this.customerOpsClient.post('/api/twins/customer', {
        twinType: 'customer',
        source: 'REZ-Consumer',
        data: {
          customerId: profile.consumerId,
          name: profile.name,
          contact: profile.contact,
          preferences: profile.preferences,
          walletBalance: profile.wallet.balance,
          corpid: profile.corpid
        }
      });

      this.lastSync.set(`customer:${profile.consumerId}`, new Date());
      this.logger.info(`Customer profile synced: ${profile.consumerId}`);

      return { success: true, target: 'customer-ops', timestamp: new Date() };
    } catch (error: any) {
      this.logger.error('Customer profile sync failed:', error.message);
      return { success: false, target: 'customer-ops', timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Sync merchant profile to Customer Operations
   */
  async syncMerchantProfile(profile: REZMerchantProfile): Promise<SyncResult> {
    try {
      await this.customerOpsClient.post('/api/twins/merchant', {
        twinType: 'merchant',
        source: 'REZ-Merchant',
        data: {
          merchantId: profile.merchantId,
          businessName: profile.businessName,
          contact: profile.contact,
          location: profile.address,
          businessType: profile.businessType,
          industryVertical: profile.industryVertical,
          ratings: profile.ratings,
          corpid: profile.corpid
        }
      });

      this.lastSync.set(`merchant:${profile.merchantId}`, new Date());
      this.logger.info(`Merchant profile synced: ${profile.merchantId}`);

      return { success: true, target: 'customer-ops', timestamp: new Date() };
    } catch (error: any) {
      this.logger.error('Merchant profile sync failed:', error.message);
      return { success: false, target: 'customer-ops', timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Sync delivery partner profile
   */
  async syncDeliveryPartner(profile: REZDeliveryProfile): Promise<SyncResult> {
    try {
      await this.customerOpsClient.post('/api/twins/delivery', {
        twinType: 'delivery',
        source: 'REZ-Delivery',
        data: {
          deliveryId: profile.deliveryId,
          name: profile.name,
          vehicle: profile.vehicle,
          status: profile.status,
          stats: profile.stats,
          corpid: profile.corpid
        }
      });

      this.lastSync.set(`delivery:${profile.deliveryId}`, new Date());
      this.logger.info(`Delivery partner synced: ${profile.deliveryId}`);

      return { success: true, target: 'customer-ops', timestamp: new Date() };
    } catch (error: any) {
      this.logger.error('Delivery partner sync failed:', error.message);
      return { success: false, target: 'customer-ops', timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Sync order to Customer Operations
   */
  async syncOrder(order: REZOrder): Promise<SyncResult> {
    try {
      await this.customerOpsClient.post('/api/twins/order', {
        twinType: 'order',
        source: order.type === 'consumer' ? 'REZ-Consumer' : 'REZ-Merchant',
        data: {
          orderId: order.orderId,
          customerId: order.customer.id,
          merchantId: order.merchant.id,
          items: order.items,
          pricing: order.pricing,
          status: order.status,
          delivery: order.delivery,
          payment: order.payment,
          corpid: order.corpid
        }
      });

      this.lastSync.set(`order:${order.orderId}`, new Date());
      this.logger.info(`Order synced: ${order.orderId}`);

      return { success: true, target: 'customer-ops', timestamp: new Date() };
    } catch (error: any) {
      this.logger.error('Order sync failed:', error.message);
      return { success: false, target: 'customer-ops', timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Sync shipment to Customer Operations
   */
  async syncShipment(shipment: REZShipment): Promise<SyncResult> {
    try {
      await this.customerOpsClient.post('/api/twins/shipment', {
        twinType: 'shipment',
        source: 'REZ-Delivery',
        data: {
          shipmentId: shipment.shipmentId,
          orderId: shipment.orderId,
          status: shipment.status,
          pickup: shipment.pickup,
          delivery: shipment.delivery,
          deliveryPartner: shipment.deliveryPartner,
          route: shipment.route,
          proofOfDelivery: shipment.proofOfDelivery,
          corpid: shipment.corpid
        }
      });

      this.lastSync.set(`shipment:${shipment.shipmentId}`, new Date());
      this.logger.info(`Shipment synced: ${shipment.shipmentId}`);

      return { success: true, target: 'customer-ops', timestamp: new Date() };
    } catch (error: any) {
      this.logger.error('Shipment sync failed:', error.message);
      return { success: false, target: 'customer-ops', timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Sync payment to Customer Operations
   */
  async syncPayment(payment: REZPayment): Promise<SyncResult> {
    try {
      await this.customerOpsClient.post('/api/twins/payment', {
        twinType: 'payment',
        source: 'REZ-Wallet',
        data: {
          transactionId: payment.transactionId,
          orderId: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          type: payment.type,
          method: payment.method,
          status: payment.status,
          from: payment.from,
          to: payment.to,
          corpid: payment.corpid
        }
      });

      this.lastSync.set(`payment:${payment.transactionId}`, new Date());
      this.logger.info(`Payment synced: ${payment.transactionId}`);

      return { success: true, target: 'customer-ops', timestamp: new Date() };
    } catch (error: any) {
      this.logger.error('Payment sync failed:', error.message);
      return { success: false, target: 'customer-ops', timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Publish event to Event Bus
   */
  async publishEvent(event: string, data: any): Promise<SyncResult> {
    try {
      await this.eventBusClient.post('/api/events/publish', {
        event,
        source: 'rez-integration',
        data,
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Event published: ${event}`);
      return { success: true, target: 'event-bus', timestamp: new Date(), data: { event } };
    } catch (error: any) {
      this.logger.error(`Event publish failed (${event}):`, error.message);
      return { success: false, target: 'event-bus', timestamp: new Date(), error: error.message };
    }
  }

  /**
   * Subscribe to events from Event Bus
   */
  async subscribeToEvents(subscription: string, handler: (event: any) => void): Promise<void> {
    try {
      await this.eventBusClient.post('/api/events/subscribe', {
        subscription,
        handler: 'rez-integration',
        callbackUrl: `${process.env.PUBLIC_URL || 'http://localhost:4961'}/api/events/callback`
      });

      this.logger.info(`Subscribed to events: ${subscription}`);
    } catch (error: any) {
      this.logger.error('Event subscription failed:', error.message);
    }
  }

  /**
   * Get sync status
   */
  getStatus(): any {
    return {
      customerOpsUrl: this.config.customerOpsUrl,
      eventBusUrl: this.config.eventBusUrl,
      connected: true,
      lastSync: Object.fromEntries(this.lastSync),
      queueSize: this.syncQueue.length
    };
  }

  /**
   * Get last sync time for a specific entity
   */
  getLastSync(entityType: string, entityId: string): Date | undefined {
    return this.lastSync.get(`${entityType}:${entityId}`);
  }

  /**
   * Health check for bridge connections
   */
  async healthCheck(): Promise<any> {
    const results = {
      customerOps: false,
      eventBus: false
    };

    try {
      await this.customerOpsClient.get('/health');
      results.customerOps = true;
    } catch {}

    try {
      await this.eventBusClient.get('/health');
      results.eventBus = true;
    } catch {}

    return results;
  }
}
