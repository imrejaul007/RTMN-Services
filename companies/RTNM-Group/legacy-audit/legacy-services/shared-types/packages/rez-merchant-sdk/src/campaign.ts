/**
 * Campaign client for Merchant SDK
 */

import { AxiosInstance } from 'axios';
import {
  Campaign,
  CampaignResponse,
  CampaignQRData,
  CampaignQRResponse,
  CampaignListResponse,
  CreateCampaignInput,
  UpdateCampaignInput,
} from './types/campaign';

interface MerchantSDKConfig {
  baseUrl: string;
  debug: boolean;
}

export class CampaignClient {
  private client: AxiosInstance;
  private config: MerchantSDKConfig;

  constructor(client: AxiosInstance, config: MerchantSDKConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Get campaign by ID (public QR endpoint)
   */
  async getById(campaignId: string): Promise<Campaign> {
    const response = await this.client.get<CampaignResponse>(
      `/qr/public/campaign/${campaignId}`
    );
    return response.data.data;
  }

  /**
   * Get all campaigns for authenticated merchant
   */
  async getAll(options?: {
    storeId?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<CampaignListResponse['data']> {
    const params = new URLSearchParams();
    if (options?.storeId) params.append('storeId', options.storeId);
    if (options?.status) params.append('status', options.status);
    if (options?.type) params.append('type', options.type);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await this.client.get<CampaignListResponse>(
      `/qr/merchant/campaigns?${params.toString()}`
    );
    return response.data.data;
  }

  /**
   * Get campaign by ID (merchant authenticated)
   */
  async get(campaignId: string): Promise<Campaign> {
    const response = await this.client.get<CampaignResponse>(
      `/qr/merchant/campaigns/${campaignId}`
    );
    return response.data.data;
  }

  /**
   * Create a new campaign
   */
  async create(input: CreateCampaignInput): Promise<Campaign> {
    const response = await this.client.post<{ success: boolean; data: Campaign }>(
      '/qr/merchant/campaigns',
      input
    );
    return response.data.data;
  }

  /**
   * Update a campaign
   */
  async update(campaignId: string, input: UpdateCampaignInput): Promise<Campaign> {
    const response = await this.client.put<{ success: boolean; data: Campaign }>(
      `/qr/merchant/campaigns/${campaignId}`,
      input
    );
    return response.data.data;
  }

  /**
   * Patch a campaign (partial update)
   */
  async patch(campaignId: string, input: UpdateCampaignInput): Promise<Campaign> {
    const response = await this.client.patch<{ success: boolean; data: Campaign }>(
      `/qr/merchant/campaigns/${campaignId}`,
      input
    );
    return response.data.data;
  }

  /**
   * Delete a campaign
   */
  async delete(campaignId: string): Promise<void> {
    await this.client.delete(`/qr/merchant/campaigns/${campaignId}`);
  }

  /**
   * Get QR code data for a campaign (merchant authenticated)
   */
  async getQRData(campaignId: string): Promise<CampaignQRData> {
    const response = await this.client.get<CampaignQRResponse>(
      `/qr/merchant/campaigns/${campaignId}/qr`
    );
    return response.data.data;
  }

  /**
   * Activate a campaign
   */
  async activate(campaignId: string): Promise<Campaign> {
    return this.patch(campaignId, { status: 'active', isActive: true });
  }

  /**
   * Pause a campaign
   */
  async pause(campaignId: string): Promise<Campaign> {
    return this.patch(campaignId, { status: 'paused' });
  }

  /**
   * Archive a campaign
   */
  async archive(campaignId: string): Promise<Campaign> {
    return this.patch(campaignId, { status: 'archived' });
  }
}
