import logger from './utils/logger';

/**
 * REZ Merchant API Client
 *
 * Client for interacting with REZ Merchant APIs
 * Supports fetching store inventory, managing RFQs, maintenance needs, and order sync
 */

import crypto from 'crypto';
import type {
  RezMerchantConfig,
  RezMerchantConnection,
  InventoryItem,
  RezOrder,
  RezOrderItem,
  MaintenanceRequest,
  RezMerchantWebhookEvent,
} from './types';

// ============================================================================
// HTTP Client
// ============================================================================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  message?: string;
}

/**
 * Base HTTP client for REZ Merchant API
 */
class RezMerchantHttpClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(config: RezMerchantConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  private generateSignature(method: string, path: string, timestamp: string, body?: string): string {
    const payload = `${method}${path}${timestamp}${body || ''}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payload)
      .digest('hex');
  }

  private getAuthHeaders(method: string, path: string, body?: string): Record<string, string> {
    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(method, path, timestamp, body);

    return {
      'X-API-Key': this.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    };
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options;
    const url = `${this.baseUrl}${path}`;
    const bodyString = body ? JSON.stringify(body) : undefined;

    const authHeaders = this.getAuthHeaders(method, path, bodyString);
    const mergedHeaders = { ...authHeaders, ...headers };

    try {
      const response = await fetch(url, {
        method,
        headers: mergedHeaders,
        body: bodyString,
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.message || `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        data: responseData.data || responseData,
        message: responseData.message,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      return {
        success: false,
        error: message,
      };
    }
  }
}

// ============================================================================
// REZ Merchant Client
// ============================================================================

export interface RezMerchantClientConfig {
  config: RezMerchantConfig;
  connection?: Partial<RezMerchantConnection>;
}

/**
 * REZ Merchant API Client
 */
export class RezMerchantClient {
  private httpClient: RezMerchantHttpClient;
  private storeId: string;
  private webhookSecret?: string;

  constructor(config: RezMerchantClientConfig) {
    this.httpClient = new RezMerchantHttpClient(config.config);
    this.storeId = config.connection?.rezMerchantStoreId || '';
    this.webhookSecret = config.config.webhookSecret;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, timestamp: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('Webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Store Operations
  // ===========================================================================

  /**
   * Test connection to REZ Merchant
   */
  async testConnection(): Promise<ApiResponse<{
    connected: boolean;
    storeId: string;
    storeName: string;
    apiVersion: string;
  }>> {
    const path = `/stores/${this.storeId}/connection-test`;
    return this.httpClient.request(path);
  }

  /**
   * Get store information
   */
  async getStoreInfo(): Promise<ApiResponse<{
    storeId: string;
    storeName: string;
    ownerName: string;
    email: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
    };
    categories: string[];
    createdAt: Date;
  }>> {
    const path = `/stores/${this.storeId}`;
    return this.httpClient.request(path);
  }

  // ===========================================================================
  // Inventory Operations
  // ===========================================================================

  /**
   * Fetch all inventory items from store
   */
  async getInventory(options?: {
    category?: string;
    lowStock?: boolean;
    since?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    items: InventoryItem[];
    total: number;
    hasMore: boolean;
  }>> {
    const params = new URLSearchParams();

    if (options?.category) params.set('category', options.category);
    if (options?.lowStock !== undefined) params.set('low_stock', String(options.lowStock));
    if (options?.since) params.set('since', options.since.toISOString());
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const queryString = params.toString();
    const path = `/stores/${this.storeId}/inventory${queryString ? `?${queryString}` : ''}`;
    return this.httpClient.request(path);
  }

  /**
   * Fetch a single inventory item by ID
   */
  async getInventoryItem(productId: string): Promise<ApiResponse<InventoryItem>> {
    const path = `/stores/${this.storeId}/inventory/${productId}`;
    return this.httpClient.request<InventoryItem>(path);
  }

  /**
   * Fetch inventory items by SKU
   */
  async getInventoryBySku(sku: string): Promise<ApiResponse<InventoryItem>> {
    const path = `/stores/${this.storeId}/inventory/sku/${encodeURIComponent(sku)}`;
    return this.httpClient.request<InventoryItem>(path);
  }

  /**
   * Fetch low stock items
   */
  async getLowStockItems(threshold?: number): Promise<ApiResponse<InventoryItem[]>> {
    const params = threshold ? `?threshold=${threshold}` : '';
    const path = `/stores/${this.storeId}/inventory/low-stock${params}`;
    return this.httpClient.request<InventoryItem[]>(path);
  }

  /**
   * Update inventory item stock
   */
  async updateInventoryStock(
    productId: string,
    newStock: number
  ): Promise<ApiResponse<InventoryItem>> {
    const path = `/stores/${this.storeId}/inventory/${productId}/stock`;
    return this.httpClient.request<InventoryItem>(path, {
      method: 'PUT',
      body: { currentStock: newStock },
    });
  }

  /**
   * Fetch inventory categories
   */
  async getInventoryCategories(): Promise<ApiResponse<string[]>> {
    const path = `/stores/${this.storeId}/inventory/categories`;
    return this.httpClient.request<string[]>(path);
  }

  // ===========================================================================
  // Order Operations
  // ===========================================================================

  /**
   * Fetch orders from store
   */
  async getOrders(options?: {
    status?: string;
    since?: Date;
    until?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    orders: RezOrder[];
    total: number;
    hasMore: boolean;
  }>> {
    const params = new URLSearchParams();

    if (options?.status) params.set('status', options.status);
    if (options?.since) params.set('since', options.since.toISOString());
    if (options?.until) params.set('until', options.until.toISOString());
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const queryString = params.toString();
    const path = `/stores/${this.storeId}/orders${queryString ? `?${queryString}` : ''}`;
    return this.httpClient.request(path);
  }

  /**
   * Fetch a single order by ID
   */
  async getOrder(orderId: string): Promise<ApiResponse<RezOrder>> {
    const path = `/stores/${this.storeId}/orders/${orderId}`;
    return this.httpClient.request<RezOrder>(path);
  }

  /**
   * Fetch order items
   */
  async getOrderItems(orderId: string): Promise<ApiResponse<RezOrderItem[]>> {
    const path = `/stores/${this.storeId}/orders/${orderId}/items`;
    return this.httpClient.request<RezOrderItem[]>(path);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: string
  ): Promise<ApiResponse<RezOrder>> {
    const path = `/stores/${this.storeId}/orders/${orderId}/status`;
    return this.httpClient.request<RezOrder>(path, {
      method: 'PUT',
      body: { status },
    });
  }

  /**
   * Get orders with low inventory impact
   */
  async getOrdersWithLowStockItems(): Promise<ApiResponse<Array<{
    order: RezOrder;
    lowStockItems: InventoryItem[];
  }>>> {
    const path = `/stores/${this.storeId}/orders/low-stock-impact`;
    return this.httpClient.request(path);
  }

  // ===========================================================================
  // Maintenance Operations
  // ===========================================================================

  /**
   * Fetch maintenance requests
   */
  async getMaintenanceRequests(options?: {
    status?: string;
    type?: string;
    since?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    requests: MaintenanceRequest[];
    total: number;
    hasMore: boolean;
  }>> {
    const params = new URLSearchParams();

    if (options?.status) params.set('status', options.status);
    if (options?.type) params.set('type', options.type);
    if (options?.since) params.set('since', options.since.toISOString());
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const queryString = params.toString();
    const path = `/stores/${this.storeId}/maintenance${queryString ? `?${queryString}` : ''}`;
    return this.httpClient.request(path);
  }

  /**
   * Fetch a single maintenance request
   */
  async getMaintenanceRequest(requestId: string): Promise<ApiResponse<MaintenanceRequest>> {
    const path = `/stores/${this.storeId}/maintenance/${requestId}`;
    return this.httpClient.request<MaintenanceRequest>(path);
  }

  /**
   * Create a maintenance request
   */
  async createMaintenanceRequest(request: {
    title: string;
    description: string;
    type: string;
    priority: string;
    category?: string;
    estimatedCost?: number;
    location?: string;
    roomNumber?: string;
    notes?: string;
  }): Promise<ApiResponse<MaintenanceRequest>> {
    const path = `/stores/${this.storeId}/maintenance`;
    return this.httpClient.request<MaintenanceRequest>(path, {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Update maintenance request
   */
  async updateMaintenanceRequest(
    requestId: string,
    updates: {
      status?: string;
      vendorId?: string;
      actualCost?: number;
      notes?: string;
    }
  ): Promise<ApiResponse<MaintenanceRequest>> {
    const path = `/stores/${this.storeId}/maintenance/${requestId}`;
    return this.httpClient.request<MaintenanceRequest>(path, {
      method: 'PUT',
      body: updates,
    });
  }

  // ===========================================================================
  // RFQ Operations
  // ===========================================================================

  /**
   * Generate RFQ for bulk supplies
   */
  async generateBulkSupplyRFQ(rfqRequest: {
    title: string;
    description?: string;
    items: Array<{
      productName: string;
      sku?: string;
      quantity: number;
      unit: string;
      targetPrice?: number;
    }>;
    priority?: string;
    deliveryDeadline?: Date;
    notes?: string;
  }): Promise<ApiResponse<{
    rfqId: string;
    rfqNumber: string;
    status: string;
    createdAt: Date;
  }>> {
    const path = `/stores/${this.storeId}/rfqs`;
    return this.httpClient.request(path, {
      method: 'POST',
      body: rfqRequest,
    });
  }

  /**
   * Get RFQ status
   */
  async getRFQStatus(rfqId: string): Promise<ApiResponse<{
    rfqId: string;
    rfqNumber: string;
    status: string;
    responses: number;
    createdAt: Date;
    expiresAt?: Date;
  }>> {
    const path = `/stores/${this.storeId}/rfqs/${rfqId}`;
    return this.httpClient.request(path);
  }

  // ===========================================================================
  // Webhook Operations
  // ===========================================================================

  /**
   * Register webhook URL
   */
  async registerWebhook(
    webhookUrl: string,
    events: RezMerchantWebhookEvent[]
  ): Promise<ApiResponse<{
    webhookId: string;
    url: string;
    events: string[];
    createdAt: Date;
  }>> {
    const path = `/stores/${this.storeId}/webhooks`;
    return this.httpClient.request(path, {
      method: 'POST',
      body: { url: webhookUrl, events },
    });
  }

  /**
   * List registered webhooks
   */
  async listWebhooks(): Promise<ApiResponse<Array<{
    webhookId: string;
    url: string;
    events: string[];
    isActive: boolean;
    createdAt: Date;
  }>>> {
    const path = `/stores/${this.storeId}/webhooks`;
    return this.httpClient.request(path);
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<ApiResponse<void>> {
    const path = `/stores/${this.storeId}/webhooks/${webhookId}`;
    return this.httpClient.request(path, {
      method: 'DELETE',
    });
  }
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Create REZ Merchant client from connection configuration
 */
export function createRezMerchantClient(connection: RezMerchantConnection): RezMerchantClient {
  return new RezMerchantClient({
    config: {
      apiKey: connection.apiKey,
      apiSecret: connection.apiSecret,
      baseUrl: 'https://api.rezmerchant.example.com/v1', // Configurable
      webhookSecret: connection.webhookSecret,
    },
    connection: {
      rezMerchantStoreId: connection.rezMerchantStoreId,
    },
  });
}

/**
 * Create REZ Merchant client from credentials
 */
export function createRezMerchantClientFromCredentials(
  apiKey: string,
  apiSecret: string,
  storeId: string,
  baseUrl?: string
): RezMerchantClient {
  return new RezMerchantClient({
    config: {
      apiKey,
      apiSecret,
      baseUrl: baseUrl || 'https://api.rezmerchant.example.com/v1',
    },
    connection: {
      rezMerchantStoreId: storeId,
    },
  });
}

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Map REZ Merchant inventory item to NEXABIZZ format
 */
export function mapInventoryItemToNexabizz(
  item: InventoryItem,
  connectionId: string,
  merchantId: string
): {
  connectionId: string;
  source: 'rez-merchant';
  sourceProductId: string;
  sourceMerchantId: string;
  productName: string;
  sku?: string;
  currentStock: number;
  threshold: number;
  unit: string;
  category?: string;
  metadata?: Record<string, unknown>;
} {
  return {
    connectionId,
    source: 'rez-merchant',
    sourceProductId: item.productId,
    sourceMerchantId: item.storeId,
    productName: item.name,
    sku: item.sku,
    currentStock: item.currentStock,
    threshold: item.reorderLevel,
    unit: item.unit,
    category: item.category,
    metadata: item.metadata,
  };
}

/**
 * Map REZ Merchant order to NEXABIZZ format
 */
export function mapOrderToNexabizz(
  order: RezOrder,
  connectionId: string,
  merchantId: string
): {
  connectionId: string;
  sourceOrderId: string;
  sourceOrderNumber: string;
  merchantId: string;
  status: string;
  total: number;
  itemCount: number;
  customerName?: string;
  shippingAddress?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
} {
  return {
    connectionId,
    sourceOrderId: order.id,
    sourceOrderNumber: order.orderNumber,
    merchantId,
    status: order.status,
    total: order.total,
    itemCount: order.items.length,
    customerName: order.customerName,
    shippingAddress: order.shippingAddress
      ? `${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`
      : undefined,
    createdAt: order.createdAt,
    metadata: order.metadata,
  };
}

/**
 * Map REZ Merchant maintenance request to NEXABIZZ service request format
 */
export function mapMaintenanceRequestToServiceRequest(
  request: MaintenanceRequest,
  connectionId: string,
  merchantId: string
): {
  connectionId: string;
  rezMerchantRequestId: string;
  merchantId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  estimatedCost?: number;
  location?: string;
  roomNumber?: string;
  reportedAt: Date;
  metadata?: Record<string, unknown>;
} {
  return {
    connectionId,
    rezMerchantRequestId: request.id,
    merchantId,
    title: request.title,
    description: request.description,
    category: request.category,
    priority: request.priority,
    status: request.status,
    estimatedCost: request.estimatedCost,
    location: request.location,
    roomNumber: request.roomNumber,
    reportedAt: request.reportedAt,
    metadata: request.metadata,
  };
}

export type { RezMerchantConfig, RezMerchantConnection };
