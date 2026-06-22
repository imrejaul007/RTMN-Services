import logger from './utils/logger';

/**
 * Hotel PMS API Client
 *
 * Client for interacting with Hotel Property Management System APIs
 * Supports fetching maintenance requests and managing connections
 */

import crypto from 'crypto';
import type {
  HotelPMSConfig,
  HotelPMSConnection,
  MaintenanceRequest,
  ServiceCategory,
  MaintenanceStatus,
  Priority,
  HotelPMSWebhookEvent,
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
}

/**
 * Base HTTP client for Hotel PMS API
 */
class HotelPMSHttpClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(config: HotelPMSConfig) {
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
// Hotel PMS Client
// ============================================================================

export interface HotelPMSClientConfig {
  config: HotelPMSConfig;
  connection?: Partial<HotelPMSConnection>;
}

/**
 * Hotel PMS API Client
 */
export class HotelPMSClient {
  private httpClient: HotelPMSHttpClient;
  private hotelId: string;
  private webhookSecret?: string;

  constructor(config: HotelPMSClientConfig) {
    this.httpClient = new HotelPMSHttpClient(config.config);
    this.hotelId = config.connection?.hotelPmsHotelId || '';
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

  /**
   * Fetch maintenance requests from Hotel PMS
   */
  async getMaintenanceRequests(options?: {
    status?: MaintenanceStatus;
    category?: ServiceCategory;
    since?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<MaintenanceRequest[]>> {
    const params = new URLSearchParams();

    if (options?.status) params.set('status', options.status);
    if (options?.category) params.set('category', options.category);
    if (options?.since) params.set('since', options.since.toISOString());
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const path = `/hotels/${this.hotelId}/maintenance-requests${params.toString() ? `?${params}` : ''}`;
    return this.httpClient.request<MaintenanceRequest[]>(path);
  }

  /**
   * Fetch a single maintenance request by ID
   */
  async getMaintenanceRequest(requestId: string): Promise<ApiResponse<MaintenanceRequest>> {
    const path = `/hotels/${this.hotelId}/maintenance-requests/${requestId}`;
    return this.httpClient.request<MaintenanceRequest>(path);
  }

  /**
   * Update maintenance request status (for syncing completion status)
   */
  async updateMaintenanceRequest(
    requestId: string,
    updates: {
      status?: MaintenanceStatus;
      actualCost?: number;
      vendorId?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<MaintenanceRequest>> {
    const path = `/hotels/${this.hotelId}/maintenance-requests/${requestId}`;
    return this.httpClient.request<MaintenanceRequest>(path, {
      method: 'PUT',
      body: updates,
    });
  }

  /**
   * Get available service categories
   */
  async getServiceCategories(): Promise<ApiResponse<string[]>> {
    const path = `/hotels/${this.hotelId}/service-categories`;
    return this.httpClient.request<string[]>(path);
  }

  /**
   * Get vendor information
   */
  async getVendors(category?: ServiceCategory): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    category: ServiceCategory;
    rating: number;
    isVerified: boolean;
  }>>> {
    const params = category ? `?category=${category}` : '';
    const path = `/hotels/${this.hotelId}/vendors${params}`;
    return this.httpClient.request(path);
  }

  /**
   * Get laundry service information
   */
  async getLaundryService(): Promise<ApiResponse<{
    dailyVolume: number;
    unit: 'kg' | 'pieces';
    preferredVendorId?: string;
    schedule: {
      pickupDays: string[];
      pickupTime: string;
      deliveryDays: string[];
      deliveryTime: string;
    };
  }>> {
    const path = `/hotels/${this.hotelId}/laundry-service`;
    return this.httpClient.request(path);
  }

  /**
   * Test connection to Hotel PMS
   */
  async testConnection(): Promise<ApiResponse<{
    connected: boolean;
    hotelId: string;
    hotelName: string;
    apiVersion: string;
  }>> {
    const path = `/hotels/${this.hotelId}/connection-test`;
    return this.httpClient.request(path);
  }
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Create Hotel PMS client from connection configuration
 */
export function createHotelPMSClient(connection: HotelPMSConnection): HotelPMSClient {
  return new HotelPMSClient({
    config: {
      apiKey: connection.apiKey,
      apiSecret: connection.apiSecret,
      baseUrl: 'https://api.hotelpms.example.com/v1', // Configurable
      webhookSecret: connection.webhookSecret,
    },
    connection: {
      hotelPmsHotelId: connection.hotelPmsHotelId,
    },
  });
}

/**
 * Create Hotel PMS client from credentials
 */
export function createHotelPMSClientFromCredentials(
  apiKey: string,
  apiSecret: string,
  hotelId: string,
  baseUrl?: string
): HotelPMSClient {
  return new HotelPMSClient({
    config: {
      apiKey,
      apiSecret,
      baseUrl: baseUrl || 'https://api.hotelpms.example.com/v1',
    },
    connection: {
      hotelPmsHotelId: hotelId,
    },
  });
}

// ============================================================================
// Maintenance Request Mapping
// ============================================================================

/**
 * Map Hotel PMS maintenance request to NEXABIZZ service request format
 */
export function mapMaintenanceRequestToServiceRequest(
  request: MaintenanceRequest,
  connectionId: string,
  merchantId: string
): {
  connectionId: string;
  hotelPmsRequestId: string;
  merchantId: string;
  category: ServiceCategory;
  title: string;
  description: string;
  priority: Priority;
  status: MaintenanceStatus;
  location: string;
  roomNumber?: string;
  estimatedCost?: number;
  metadata?: Record<string, unknown>;
} {
  return {
    connectionId,
    hotelPmsRequestId: request.id,
    merchantId,
    category: request.category,
    title: request.title,
    description: request.description,
    priority: request.priority,
    status: request.status,
    location: request.location,
    roomNumber: request.roomNumber,
    estimatedCost: request.estimatedCost,
    metadata: request.metadata,
  };
}

export type { HotelPMSConfig, HotelPMSConnection };
