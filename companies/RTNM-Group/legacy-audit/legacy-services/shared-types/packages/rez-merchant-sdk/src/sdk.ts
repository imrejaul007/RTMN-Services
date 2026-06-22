/**
 * MerchantSDK - Main SDK class for Rez Merchant Service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { StoreClient } from './store';
import { MenuClient } from './menu';
import { HotelClient } from './hotel';
import { CampaignClient } from './campaign';
import { AnalyticsClient } from './analytics';

export interface MerchantSDKConfig {
  /** Base URL for the API (defaults to Rez production) */
  baseUrl?: string;
  /** API key for authentication (optional for public endpoints) */
  apiKey?: string;
  /** Bearer token for authenticated requests */
  token?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

export interface MerchantSDKOptions extends MerchantSDKConfig {
  /** Custom axios instance for advanced configuration */
  axiosInstance?: AxiosInstance;
}

/**
 * MerchantSDK provides a unified interface to Rez Merchant Service APIs.
 *
 * Supports all QR systems:
 * - Room QR: Hotel/room info, room service, service requests
 * - Menu QR: Store/menu info, product catalog, categories
 * - Rez Now: Store profile, services, appointments, analytics
 * - Ads QR: Brand info, campaigns, store locations
 */
export class MerchantSDK {
  private client: AxiosInstance;
  private config: Required<MerchantSDKConfig>;

  /** Store operations */
  public store: StoreClient;

  /** Menu operations */
  public menu: MenuClient;

  /** Hotel/Room QR operations */
  public hotel: HotelClient;

  /** Campaign operations */
  public campaign: CampaignClient;

  /** Analytics operations */
  public analytics: AnalyticsClient;

  constructor(options: MerchantSDKOptions = {}) {
    this.config = {
      baseUrl: options.baseUrl || 'https://api.rez.money',
      apiKey: options.apiKey,
      token: options.token,
      timeout: options.timeout || 30000,
      debug: options.debug || false,
    };

    this.client = options.axiosInstance || this.createClient();

    // Initialize sub-clients
    this.store = new StoreClient(this.client, this.config);
    this.menu = new MenuClient(this.client, this.config);
    this.hotel = new HotelClient(this.client, this.config);
    this.campaign = new CampaignClient(this.client, this.config);
    this.analytics = new AnalyticsClient(this.client, this.config);
  }

  private createClient(): AxiosInstance {
    const client = axios.create({
      baseURL: `${this.config.baseUrl}/api/merchant`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
        ...(this.config.token && { Authorization: `Bearer ${this.config.token}` }),
      },
    });

    // Request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        if (this.config.debug) {
          logger.info([MerchantSDK] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        if (this.config.debug) {
          console.error('[MerchantSDK] Request error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    client.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          logger.info([MerchantSDK] Response:`, response.status);
        }
        return response;
      },
      (error: AxiosError) => {
        if (this.config.debug) {
          console.error('[MerchantSDK] Response error:', error.message);
        }
        return Promise.reject(this.normalizeError(error));
      }
    );

    return client;
  }

  /**
   * Normalize API errors into consistent format
   */
  private normalizeError(error: AxiosError): Error {
    const axiosError = error as AxiosError<{ message?: string; code?: string }>;
    const message = axiosError.response?.data?.message || axiosError.message || 'Unknown error';
    const code = axiosError.response?.data?.code || 'UNKNOWN_ERROR';

    const normalizedError = new Error(message) as Error & { code?: string; status?: number };
    normalizedError.code = code;
    normalizedError.status = axiosError.response?.status;

    return normalizedError;
  }

  /**
   * Set authentication token for subsequent requests
   */
  setToken(token: string): void {
    this.config.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Set API key for subsequent requests
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.client.defaults.headers.common['X-API-Key'] = apiKey;
  }

  /**
   * Get the underlying axios client for advanced usage
   */
  getClient(): AxiosInstance {
    return this.client;
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<{ status: string; uptime: number }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Default export
export default MerchantSDK;
