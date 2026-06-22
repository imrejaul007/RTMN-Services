/**
 * CorpPerks Gifting Procurement API Service
 *
 * Corporate gifting procurement and management endpoints
 */

import { apiClient } from './apiClient';

// Types
export interface GiftCatalogItem {
  _id: string;
  name: string;
  description: string;
  category: 'food' | 'electronics' | 'home' | 'fashion' | 'experience' | 'voucher';
  images: string[];
  pricing: {
    basePrice: number;
    corporatePrice: number;
    bulkDiscount: number;
    minQuantity: number;
  };
  vendor: {
    vendorId: string;
    name: string;
    rating: number;
  };
  specifications: Record<string, string>;
  isAvailable: boolean;
  stockCount: number;
  deliveryInfo: {
    estimatedDays: number;
    cities: string[];
  };
}

export interface GiftCampaign {
  _id: string;
  campaignId: string;
  name: string;
  description: string;
  type: 'festival' | 'milestone' | 'client' | 'thank_you' | 'custom';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  budget: number;
  spent: number;
  recipientCount: number;
  recipientCriteria: {
    departments?: string[];
    levels?: string[];
    employmentTypes?: string[];
    customFilter?: Record<string, string | number | boolean | string[]>;
  };
  giftSelection: {
    giftIds: string[];
    allowChoice: boolean;
    giftValueMin: number;
    giftValueMax: number;
  };
  schedule: {
    sendDate: string;
    deadline: string;
    timezone: string;
  };
  branding: {
    includeCompanyLogo: boolean;
    customMessage: boolean;
    wrapperColor?: string;
  };
  fulfillment: {
    type: 'direct' | 'bulk' | 'voucher';
    vendorId?: string;
    deliveryMethod: 'home' | 'office' | 'email' | 'self_pickup';
  };
  analytics: {
    sent: number;
    delivered: number;
    opened: number;
    redeemed: number;
  };
  createdBy: {
    userId: string;
    name: string;
    role: 'corp_admin' | 'corp_hr' | 'corp_manager';
  };
  createdAt: string;
  updatedAt: string;
}

export interface GiftOrder {
  _id: string;
  orderId: string;
  orderNumber: string;
  campaign?: {
    campaignId: string;
    name: string;
  };
  recipient: {
    employeeId: string;
    name: string;
    email: string;
    phone: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  company: {
    companyId: string;
    name: string;
    gstIn: string;
  };
  gift: {
    catalogItemId: string;
    name: string;
    image: string;
    sku: string;
  };
  pricing: {
    unitPrice: number;
    quantity: number;
    subtotal: number;
    discount: number;
    gstAmount: number;
    totalAmount: number;
  };
  fulfillment: {
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'failed';
    trackingId?: string;
    carrier?: string;
    estimatedDelivery?: string;
    deliveredAt?: string;
  };
  invoice?: {
    invoiceNumber: string;
    invoiceDate: string;
  };
  createdAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  type: GiftCampaign['type'];
  budget: number;
  recipientCriteria: GiftCampaign['recipientCriteria'];
  giftSelection: GiftCampaign['giftSelection'];
  schedule: {
    sendDate: string;
    deadline: string;
    timezone?: string;
  };
  branding?: {
    includeCompanyLogo?: boolean;
    customMessage?: boolean;
    wrapperColor?: string;
  };
  fulfillment: {
    type: 'direct' | 'bulk' | 'voucher';
    vendorId?: string;
    deliveryMethod: 'home' | 'office' | 'email' | 'self_pickup';
  };
}

export interface CreateOrderRequest {
  campaignId?: string;
  recipientEmployeeId: string;
  giftCatalogItemId: string;
  quantity?: number;
  deliveryAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

// Helper
function getCompanyId(): string {
  return 'demo-company';
}

// Gifting API Service
export const corpGiftingApi = {
  // ========== Catalog ==========

  /**
   * Get gift catalog
   */
  async getCatalog(params?: {
    category?: GiftCatalogItem['category'];
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }): Promise<GiftCatalogItem[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set('category', params.category);
    if (params?.minPrice) queryParams.set('minPrice', String(params.minPrice));
    if (params?.maxPrice) queryParams.set('maxPrice', String(params.maxPrice));
    if (params?.search) queryParams.set('search', params.search);

    const response = await apiClient.get<{ data: GiftCatalogItem[] }>(
      `/api/corp/gifting/catalog?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Get a single catalog item
   */
  async getCatalogItem(id: string): Promise<GiftCatalogItem | null> {
    const response = await apiClient.get<{ data: GiftCatalogItem }>(
      `/api/corp/gifting/catalog/${id}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  // ========== Campaigns ==========

  /**
   * Get all campaigns
   */
  async getCampaigns(params?: {
    status?: GiftCampaign['status'];
    type?: GiftCampaign['type'];
    page?: number;
    limit?: number;
  }): Promise<{
    data: GiftCampaign[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.type) queryParams.set('type', params.type);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: GiftCampaign[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/corp/gifting/campaigns?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  /**
   * Get a single campaign
   */
  async getCampaign(id: string): Promise<GiftCampaign | null> {
    const response = await apiClient.get<{ data: GiftCampaign }>(
      `/api/corp/gifting/campaigns/${id}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  /**
   * Create a new campaign
   */
  async createCampaign(data: CreateCampaignRequest): Promise<GiftCampaign> {
    const response = await apiClient.post<{ data: GiftCampaign }>(
      '/api/corp/gifting/campaigns',
      data as unknown as Record<string, unknown>,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to create campaign');
    }
    return response.data!.data;
  },

  /**
   * Update a campaign
   */
  async updateCampaign(id: string, data: Partial<CreateCampaignRequest>): Promise<GiftCampaign> {
    const response = await apiClient.put<{ data: GiftCampaign }>(
      `/api/corp/gifting/campaigns/${id}`,
      data,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to update campaign');
    }
    return response.data!.data;
  },

  /**
   * Launch a campaign
   */
  async launchCampaign(id: string): Promise<void> {
    const response = await apiClient.post(
      `/api/corp/gifting/campaigns/${id}/launch`,
      {},
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to launch campaign');
    }
  },

  /**
   * Cancel a campaign
   */
  async cancelCampaign(id: string, reason?: string): Promise<void> {
    const response = await apiClient.post(
      `/api/corp/gifting/campaigns/${id}/cancel`,
      { reason },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel campaign');
    }
  },

  // ========== Orders ==========

  /**
   * Get all orders
   */
  async getOrders(params?: {
    campaignId?: string;
    status?: GiftOrder['fulfillment']['status'];
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GiftOrder[]; pagination: { total: number; page: number; limit: number } }> {
    const queryParams = new URLSearchParams();
    if (params?.campaignId) queryParams.set('campaignId', params.campaignId);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: GiftOrder[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/corp/gifting/orders?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  /**
   * Get a single order
   */
  async getOrder(id: string): Promise<GiftOrder | null> {
    const response = await apiClient.get<{ data: GiftOrder }>(`/api/corp/gifting/orders/${id}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || null;
  },

  /**
   * Create a single gift order
   */
  async createOrder(data: CreateOrderRequest): Promise<GiftOrder> {
    const response = await apiClient.post<{ data: GiftOrder }>('/api/corp/gifting/orders', data as unknown as Record<string, unknown>, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to create order');
    }
    return response.data!.data;
  },

  /**
   * Bulk create orders for a campaign
   */
  async bulkCreateOrders(
    campaignId: string,
    recipientIds: string[]
  ): Promise<{
    orderCount: number;
    totalAmount: number;
  }> {
    const response = await apiClient.post<{
      data: { orderCount: number; totalAmount: number };
    }>(
      '/api/corp/gifting/orders/bulk',
      {
        campaignId,
        recipientIds,
      },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to create bulk orders');
    }
    return response.data!.data;
  },

  // ========== Analytics ==========

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<{
    overview: {
      totalRecipients: number;
      sent: number;
      delivered: number;
      opened: number;
      redeemed: number;
      deliveryRate: number;
      redemptionRate: number;
    };
    dailyStats: Array<{
      date: string;
      sent: number;
      delivered: number;
      redeemed: number;
    }>;
    topGifts: Array<{
      giftId: string;
      name: string;
      count: number;
    }>;
  }> {
    const response = await apiClient.get<{
      data: {
        overview: {
          totalRecipients: number;
          sent: number;
          delivered: number;
          opened: number;
          redeemed: number;
          deliveryRate: number;
          redemptionRate: number;
        };
        dailyStats: Array<{
          date: string;
          sent: number;
          delivered: number;
          redeemed: number;
        }>;
        topGifts: Array<{
          giftId: string;
          name: string;
          count: number;
        }>;
      };
    }>(`/api/corp/gifting/campaigns/${campaignId}/analytics`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return (
      response.data?.data ?? {
        overview: {
          totalRecipients: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          redeemed: 0,
          deliveryRate: 0,
          redemptionRate: 0,
        },
        dailyStats: [],
        topGifts: [],
      }
    );
  },
};

export default corpGiftingApi;
