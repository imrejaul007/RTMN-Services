/**
 * Hojai Data Platform - Service Index
 * Version: 1.0 | Date: May 29, 2026
 * Purpose: Main service entry point
 */

import { MongoClient, Db } from 'mongodb';
import { BaseService, BaseServiceConfig } from '../../shared/base-service';
import { TenantRepository } from './repositories/tenant-repository';
import { CustomerRepository } from './repositories/customer-repository';
import { OrderRepository } from './repositories/order-repository';
import { createIndexes } from './repositories/base-repository';
import { createLogger } from '../../shared/utils/logger';
import { tenantMiddleware } from '../../shared/middleware/tenant';

const logger = createLogger('hojai-data');

/**
 * Hojai Data Service Configuration
 */
interface DataServiceConfig extends BaseServiceConfig {
  mongodbUri: string;
  databaseName: string;
}

/**
 * Hojai Data Service
 * Provides unified access to all canonical entities
 */
export class HojaiDataService extends BaseService {
  private mongoClient: MongoClient;
  private db!: Db;
  private config: DataServiceConfig;

  constructor(config: DataServiceConfig) {
    super({
      name: 'hojai-data',
      port: config.port,
      version: '1.0.0'
    });
    this.config = config;
    this.mongoClient = new MongoClient(config.mongodbUri);
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    try {
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(this.config.databaseName);

      await this.createIndexes();

      this.logger.info('database_connected', {
        database: this.config.databaseName
      });
    } catch (error) {
      this.logger.error('database_connection_failed', { error });
      throw error;
    }
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    const collections = [
      { name: 'tenants', indexes: [] },
      { name: 'customers', indexes: [] },
      { name: 'orders', indexes: [] },
      { name: 'products', indexes: [] },
      { name: 'conversations', indexes: [] },
      { name: 'messages', indexes: [] },
      { name: 'workflows', indexes: [] },
      { name: 'ai_employees', indexes: [] },
      { name: 'identities', indexes: [] },
      { name: 'segments', indexes: [] }
    ];

    for (const coll of collections) {
      const collection = this.db.collection(coll.name);
      // Basic indexes - can be extended per entity
      await collection.createIndex({ tenant_id: 1 }, { name: 'idx_tenant' });
      await collection.createIndex({ tenant_id: 1, created_at: -1 }, { name: 'idx_tenant_created' });
      await collection.createIndex({ tenant_id: 1, id: 1 }, { name: 'idx_tenant_id', unique: true });
    }
  }

  /**
   * Get tenant repository
   */
  getTenantRepository(tenant_id: string): TenantRepository {
    return new TenantRepository(this.db, tenant_id);
  }

  /**
   * Get customer repository
   */
  getCustomerRepository(tenant_id: string): CustomerRepository {
    return new CustomerRepository(this.db, tenant_id);
  }

  /**
   * Get order repository
   */
  getOrderRepository(tenant_id: string): OrderRepository {
    return new OrderRepository(this.db, tenant_id);
  }

  /**
   * Setup routes
   */
  protected setupRoutes(): void {
    // Customer routes
    this.app.get(
      '/api/customers',
      tenantMiddleware(),
      async (req, res) => {
        const repo = this.getCustomerRepository(req.tenantContext!.tenant_id);
        const customers = await repo.findMany({});
        res.json({ success: true, data: customers });
      }
    );

    this.app.get(
      '/api/customers/:id',
      tenantMiddleware(),
      async (req, res) => {
        const repo = this.getCustomerRepository(req.tenantContext!.tenant_id);
        const customer = await repo.findById(req.params.id);
        if (!customer) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Customer not found' }
          });
        }
        res.json({ success: true, data: customer });
      }
    );

    // Order routes
    this.app.get(
      '/api/orders',
      tenantMiddleware(),
      async (req, res) => {
        const repo = this.getOrderRepository(req.tenantContext!.tenant_id);
        const orders = await repo.findMany({});
        res.json({ success: true, data: orders });
      }
    );

    this.app.get(
      '/api/orders/:id',
      tenantMiddleware(),
      async (req, res) => {
        const repo = this.getOrderRepository(req.tenantContext!.tenant_id);
        const order = await repo.findById(req.params.id);
        if (!order) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Order not found' }
          });
        }
        res.json({ success: true, data: order });
      }
    );
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('shutting_down');
    await this.mongoClient.close();
  }
}

// Import repositories
import { TenantRepository } from './repositories/tenant-repository';
import { CustomerRepository } from './repositories/customer-repository';
import { OrderRepository } from './repositories/order-repository';
