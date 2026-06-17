import axios from 'axios';
import { BaseConnector, ConnectorConfig, SyncResult, EntityData } from './base';

export class ShopifyConnector extends BaseConnector {
  private shopName: string;

  constructor(config: ConnectorConfig) {
    super('shopify', config);
    this.shopName = config.shopName || process.env.SHOPIFY_SHOP_NAME || '';
  }

  protected initializeClient(): void {
    if (this.config.accessToken && this.shopName) {
      this.client = axios.create({
        baseURL: `https://${this.shopName}.myshopify.com/admin/api/2024-01`,
        headers: {
          'X-Shopify-Access-Token': this.config.accessToken,
          'Content-Type': 'application/json'
        }
      });
    } else {
      console.log('Shopify connector: Not configured, using mock mode');
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Shopify not configured' };
    }

    try {
      const response = await this.client.get('/shop.json');
      return { success: true };
    } catch (error) {
      return this.handleError(error, 'Failed to connect to Shopify');
    }
  }

  async fetch(entityType: string, options: { limit?: number; since_id?: string } = {}): Promise<EntityData[]> {
    if (!this.client) {
      console.log(`[MOCK] Fetching ${entityType} from Shopify`);
      return this.getMockData(entityType);
    }

    try {
      const endpoint = this.getEndpoint(entityType);
      const response = await this.client.get(endpoint, {
        params: { limit: options.limit || 250, since_id: options.since_id }
      });

      const key = this.getResponseKey(entityType);
      return response.data[key] || [];
    } catch (error) {
      throw this.handleError(error, `Failed to fetch ${entityType}`);
    }
  }

  async push(entityType: string, data: EntityData[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: []
    };

    if (!this.client) {
      console.log(`[MOCK] Pushing ${data.length} ${entityType} to Shopify`);
      result.recordsProcessed = data.length;
      result.recordsCreated = data.length;
      return result;
    }

    for (const item of data) {
      try {
        const endpoint = this.getEndpoint(entityType);
        if (item.id) {
          await this.client.put(`${endpoint}/${item.id}.json`, this.wrapEntity(entityType, item));
          result.recordsUpdated++;
        } else {
          await this.client.post(`${endpoint}.json`, this.wrapEntity(entityType, item));
          result.recordsCreated++;
        }
        result.recordsProcessed++;
      } catch (error) {
        result.recordsFailed++;
        result.errors.push({
          record: String(item.id) || JSON.stringify(item),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  getEntityTypes(): string[] {
    return ['products', 'orders', 'customers', 'collections', 'inventory'];
  }

  private getEndpoint(entityType: string): string {
    const endpoints: Record<string, string> = {
      products: '/products.json',
      orders: '/orders.json',
      customers: '/customers.json',
      collections: '/smart_collections.json',
      inventory: '/inventory_levels.json'
    };
    return endpoints[entityType] || '/products.json';
  }

  private getResponseKey(entityType: string): string {
    const keys: Record<string, string> = {
      products: 'products',
      orders: 'orders',
      customers: 'customers',
      collections: 'smart_collections',
      inventory: 'inventory_levels'
    };
    return keys[entityType] || entityType;
  }

  private wrapEntity(entityType: string, data: EntityData): any {
    const keys: Record<string, string> = {
      products: 'product',
      orders: 'order',
      customers: 'customer',
      collections: 'smart_collection',
      inventory: 'inventory_level'
    };
    return { [keys[entityType] || entityType]: data };
  }

  private getMockData(entityType: string): EntityData[] {
    const mockData: Record<string, EntityData[]> = {
      products: [
        { id: 1, title: 'Sample Product 1', price: '29.99', inventory: 100 },
        { id: 2, title: 'Sample Product 2', price: '49.99', inventory: 50 }
      ],
      orders: [
        { id: 1001, email: 'customer@example.com', total: '79.98', status: 'fulfilled' },
        { id: 1002, email: 'another@example.com', total: '29.99', status: 'pending' }
      ],
      customers: [
        { id: 1, email: 'customer@example.com', first_name: 'John', last_name: 'Doe' },
        { id: 2, email: 'another@example.com', first_name: 'Jane', last_name: 'Smith' }
      ],
      collections: [
        { id: 1, title: 'Featured Products', handle: 'featured' }
      ],
      inventory: [
        { inventory_item_id: 1, available: 100, location_id: 1 }
      ]
    };
    return mockData[entityType] || [];
  }

  async getProductInventory(productId: string): Promise<any> {
    if (!this.client) {
      return { inventory: 100 };
    }

    try {
      const response = await this.client.get(`/products/${productId}/metafields.json`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get product inventory');
    }
  }

  async createOrder(orderData: any): Promise<EntityData> {
    if (!this.client) {
      return { id: Date.now(), ...orderData };
    }

    try {
      const response = await this.client.post('/orders.json', { order: orderData });
      return response.data.order;
    } catch (error) {
      throw this.handleError(error, 'Failed to create order');
    }
  }
}