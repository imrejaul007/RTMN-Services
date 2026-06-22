/**
 * Store client for Merchant SDK
 */

import { AxiosInstance } from 'axios';
import {
  Store,
  StoreResponse,
  StoreListResponse,
  StoreAnalyticsResponse,
  StoreQRData,
} from './types/store';

interface MerchantSDKConfig {
  baseUrl: string;
  debug: boolean;
}

export class StoreClient {
  private client: AxiosInstance;
  private config: MerchantSDKConfig;

  constructor(client: AxiosInstance, config: MerchantSDKConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Get store information by slug (public QR endpoint)
   */
  async getBySlug(slug: string): Promise<Store> {
    const response = await this.client.get<StoreResponse>(
      `/qr/public/store/${encodeURIComponent(slug)}`
    );
    return response.data.data;
  }

  /**
   * Get store information by ID (public QR endpoint)
   */
  async getById(storeId: string): Promise<Store> {
    const response = await this.client.get<StoreResponse>(
      `/qr/public/store/id/${storeId}`
    );
    return response.data.data;
  }

  /**
   * Get all stores for authenticated merchant
   */
  async getAll(): Promise<Store[]> {
    const response = await this.client.get<StoreListResponse>(
      '/qr/merchant/stores'
    );
    return response.data.data;
  }

  /**
   * Get QR analytics for a specific store
   */
  async getAnalytics(storeId: string): Promise<StoreAnalyticsResponse['data']> {
    const response = await this.client.get<StoreAnalyticsResponse>(
      `/qr/merchant/stores/${storeId}/analytics`
    );
    return response.data.data;
  }

  /**
   * Regenerate QR codes for a store
   */
  async regenerateQR(storeId: string): Promise<StoreQRData> {
    const response = await this.client.post<{ success: boolean; data: StoreQRData }>(
      `/qr/merchant/stores/${storeId}/regenerate`
    );
    return response.data.data;
  }

  /**
   * Get all QR links for merchant's stores
   */
  async getQRLinks(): Promise<StoreQRData[]> {
    const response = await this.client.get<{
      success: boolean;
      data: Array<{
        storeId: string;
        storeName: string;
        storeSlug: string;
        links: {
          checkin: string;
          menu: string;
          pay: string;
          review: string;
        };
        deepLinks: {
          checkin: string;
          menu: string;
          pay: string;
        };
      }>;
    }>('/qr/merchant/qr-links');

    return response.data.data.map((item) => ({
      storeId: item.storeId,
      storeSlug: item.storeSlug,
      qrPayload: {
        storeId: item.storeId,
        action: 'checkin',
        version: 1,
      },
      qrString: JSON.stringify({ storeId: item.storeId, action: 'checkin', v: 1 }),
      deepLink: `rezapp://checkin?storeId=${item.storeId}`,
      links: item.links,
    }));
  }
}
