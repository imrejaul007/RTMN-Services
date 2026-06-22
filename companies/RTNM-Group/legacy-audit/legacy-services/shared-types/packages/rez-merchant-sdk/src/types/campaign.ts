/**
 * Campaign types for Merchant SDK
 */

export interface Campaign {
  id: string;
  name: string;
  title?: string;
  description?: string;
  type: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  isActive?: boolean;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  budgetCap?: number;
  rewardValue?: number;
  rewardType?: string;
  targetSegment?: Record<string, unknown>;
  targetAudience?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  actions?: Array<Record<string, unknown>>;
  triggers?: Array<Record<string, unknown>>;
  priority?: number;
  cooldownDays?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignQRData {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  qrPayload: {
    type: string;
    campaignId: string;
    merchantId: string;
    action: string;
  };
  qrString: string;
  landingUrl: string;
  deepLink: string;
}

export interface CampaignResponse {
  success: boolean;
  data: Campaign;
  meta?: {
    qrType?: string;
    scannedAt?: string;
  };
}

export interface CampaignQRResponse {
  success: boolean;
  data: CampaignQRData;
}

export interface CampaignListResponse {
  success: boolean;
  data: {
    items: Campaign[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface CreateCampaignInput {
  name: string;
  title?: string;
  description?: string;
  type?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  isActive?: boolean;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  budgetCap?: number;
  rewardValue?: number;
  rewardType?: string;
  targetSegment?: Record<string, unknown>;
  targetAudience?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  actions?: Array<Record<string, unknown>>;
  triggers?: Array<Record<string, unknown>>;
  priority?: number;
  cooldownDays?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateCampaignInput extends Partial<CreateCampaignInput> {}
