/**
 * RestoPapa API Client
 *
 * A typed client for interacting with the RestoPapa REST API.
 * Handles authentication, request signing, and response parsing.
 */

import crypto from 'crypto';
import type {
  RestoPapaConfig,
  RestoPapaProduct,
  RestoPapaLowStockItem,
  RestoPapaOrder,
  RestoPapaOrderStatus,
  RestoPapaMaintenanceRequest,
  RestoPapaApiResponse,
  RestoPapaPaginatedResponse,
} from './types';

// ============================================
// HTTP Client
// ============================================

/**
 * RestoPapa API client
 */
export class RestoPapaClient {
  private config: RestoPapaConfig;
  private baseUrl: string;

  constructor(config: RestoPapaConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  /**
   * Generate authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.generateSignature(timestamp);

    return {
      'X-API-Key': this.config.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generate request signature for authentication
   */
  private generateSignature(timestamp: string): string {
    const payload = `${timestamp}:${this.config.apiKey}`;
    return crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Make an authenticated request to the RestoPapa API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<RestoPapaApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getAuthHeaders();

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: data?.message || `Request failed with status ${response.status}`,
            details: data,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `Failed to connect to RestoPapa API: ${message}`,
        },
      };
    }
  }

  // ============================================
  // Inventory API
  // ============================================

  /**
   * Get all products from RestoPapa
   */
  async getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    lowStockOnly?: boolean;
  }): Promise<RestoPapaPaginatedResponse<RestoPapaProduct>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.category) searchParams.set('category', params.category);
    if (params?.lowStockOnly) searchParams.set('low_stock_only', 'true');

    const query = searchParams.toString();
    return this.request<RestoPapaPaginatedResponse<RestoPapaProduct>>(
      'GET',
      `/inventory/products${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: string): Promise<RestoPapaApiResponse<RestoPapaProduct>> {
    return this.request<RestoPapaProduct>('GET', `/inventory/products/${productId}`);
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(params?: {
    page?: number;
    limit?: number;
    severity?: 'low' | 'critical' | 'out_of_stock';
  }): Promise<RestoPapaPaginatedResponse<RestoPapaLowStockItem>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.severity) searchParams.set('severity', params.severity);

    const query = searchParams.toString();
    return this.request<RestoPapaPaginatedResponse<RestoPapaLowStockItem>>(
      'GET',
      `/inventory/low-stock${query ? `?${query}` : ''}`
    );
  }

  /**
   * Update product stock level
   */
  async updateStock(
    productId: string,
    newStock: number,
    reason?: string
  ): Promise<RestoPapaApiResponse<RestoPapaProduct>> {
    return this.request<RestoPapaProduct>('PATCH', `/inventory/products/${productId}/stock`, {
      stock: newStock,
      reason,
    });
  }

  // ============================================
  // Orders API
  // ============================================

  /**
   * Get orders
   */
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: RestoPapaOrderStatus;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<RestoPapaPaginatedResponse<RestoPapaOrder>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.fromDate) searchParams.set('from_date', params.fromDate.toISOString());
    if (params?.toDate) searchParams.set('to_date', params.toDate.toISOString());

    const query = searchParams.toString();
    return this.request<RestoPapaPaginatedResponse<RestoPapaOrder>>(
      'GET',
      `/orders${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get a single order by ID
   */
  async getOrder(orderId: string): Promise<RestoPapaApiResponse<RestoPapaOrder>> {
    return this.request<RestoPapaOrder>('GET', `/orders/${orderId}`);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: RestoPapaOrderStatus
  ): Promise<RestoPapaApiResponse<RestoPapaOrder>> {
    return this.request<RestoPapaOrder>('PATCH', `/orders/${orderId}/status`, { status });
  }

  // ============================================
  // Maintenance API
  // ============================================

  /**
   * Get maintenance requests
   */
  async getMaintenanceRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    priority?: string;
  }): Promise<RestoPapaPaginatedResponse<RestoPapaMaintenanceRequest>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.priority) searchParams.set('priority', params.priority);

    const query = searchParams.toString();
    return this.request<RestoPapaPaginatedResponse<RestoPapaMaintenanceRequest>>(
      'GET',
      `/maintenance/requests${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get a single maintenance request
   */
  async getMaintenanceRequest(
    requestId: string
  ): Promise<RestoPapaApiResponse<RestoPapaMaintenanceRequest>> {
    return this.request<RestoPapaMaintenanceRequest>(
      'GET',
      `/maintenance/requests/${requestId}`
    );
  }

  /**
   * Create a maintenance request
   */
  async createMaintenanceRequest(request: {
    title: string;
    description: string;
    category: string;
    priority?: string;
    scheduledDate?: Date;
    estimatedCost?: number;
  }): Promise<RestoPapaApiResponse<RestoPapaMaintenanceRequest>> {
    return this.request<RestoPapaMaintenanceRequest>(
      'POST',
      '/maintenance/requests',
      request
    );
  }

  /**
   * Update maintenance request status
   */
  async updateMaintenanceStatus(
    requestId: string,
    status: string,
    notes?: string
  ): Promise<RestoPapaApiResponse<RestoPapaMaintenanceRequest>> {
    return this.request<RestoPapaMaintenanceRequest>(
      'PATCH',
      `/maintenance/requests/${requestId}/status`,
      { status, notes }
    );
  }

  // ============================================
  // Webhook Management
  // ============================================

  /**
   * Register webhook endpoint
   */
  async registerWebhook(
    url: string,
    events: string[]
  ): Promise<RestoPapaApiResponse<{ webhookId: string; url: string }>> {
    return this.request<{ webhookId: string; url: string }>('POST', '/webhooks', {
      url,
      events,
    });
  }

  /**
   * List registered webhooks
   */
  async listWebhooks(): Promise<RestoPapaApiResponse<Array<{
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    createdAt: Date;
  }>>> {
    return this.request<Array<{
      id: string;
      url: string;
      events: string[];
      isActive: boolean;
      createdAt: Date;
    }>>('GET', '/webhooks');
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<RestoPapaApiResponse<void>> {
    return this.request<void>('DELETE', `/webhooks/${webhookId}`);
  }

  // ============================================
  // Connection Validation
  // ============================================

  /**
   * Validate API credentials by fetching merchant info
   */
  async validateConnection(): Promise<RestoPapaApiResponse<{
    merchantId: string;
    merchantName: string;
    locationId?: string;
    plan: string;
  }>> {
    return this.request<{
      merchantId: string;
      merchantName: string;
      locationId?: string;
      plan: string;
    }>('GET', '/auth/me');
  }

  /**
   * Test webhook signature verification
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a RestoPapa client from connection details
 */
export function createRestoPapaClient(connection: {
  apiKey: string;
  webhookSecret: string;
  baseUrl?: string;
}): RestoPapaClient {
  return new RestoPapaClient({
    baseUrl: connection.baseUrl || 'https://api.restopapa.com/v1',
    apiKey: connection.apiKey,
    webhookSecret: connection.webhookSecret,
  });
}

// ============================================
// Webhook Signature Verification
// ============================================

/**
 * Verify a webhook signature from RestoPapa
 */
export function verifyRestoPapaWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Parse webhook timestamp from headers
 */
export function getWebhookTimestamp(headers: Headers): string | null {
  return headers.get('X-Webhook-Timestamp') ||
         headers.get('x-webhook-timestamp') ||
         null;
}

/**
 * Full webhook verification with timestamp check
 */
export function verifyRestoPapaWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
  maxAgeSeconds = 300
): { valid: boolean; error?: string } {
  const signature = headers.get('X-Webhook-Signature') ||
                   headers.get('x-webhook-signature');

  if (!signature) {
    return { valid: false, error: 'Missing webhook signature' };
  }

  const timestamp = getWebhookTimestamp(headers);
  if (!timestamp) {
    return { valid: false, error: 'Missing webhook timestamp' };
  }

  // Check timestamp age (prevent replay attacks)
  const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (timestampAge > maxAgeSeconds) {
    return { valid: false, error: 'Webhook timestamp is too old' };
  }

  // Verify signature with timestamp as part of payload
  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid webhook signature' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Signature verification failed' };
  }
}
