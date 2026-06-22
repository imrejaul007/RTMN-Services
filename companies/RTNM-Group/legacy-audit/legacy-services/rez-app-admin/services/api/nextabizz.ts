/**
 * NextaBizz Procurement API Service
 *
 * Integration with NextaBizz for corporate gifting procurement,
 * bulk orders, and branded merchandise through CorpPerks.
 */

import { apiClient } from './apiClient';

// Types
export interface NextaProduct {
  _id: string;
  sku: string;
  name: string;
  description: string;
  category: 'food' | 'electronics' | 'home' | 'fashion' | 'experience' | 'voucher' | 'merchandise';
  brand: {
    brandId: string;
    name: string;
    logo?: string;
  };
  images: string[];
  pricing: {
    mrp: number;
    wholesalePrice: number;
    corpPrice: number;
    bulkPrice: number;
    minBulkQuantity: number;
  };
  specifications: Record<string, string>;
  dimensions?: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
  packaging?: {
    type: 'box' | 'pouch' | 'bottle' | 'custom';
    dimensions?: string;
    recyclable: boolean;
  };
  inventory: {
    inStock: boolean;
    quantity: number;
    warehouse: string;
    deliveryDays: number;
  };
  customization?: {
    available: boolean;
    options: Array<{
      type: 'color' | 'size' | 'engraving' | 'printing';
      values: string[];
      additionalCost: number;
    }>;
    moq: number;
  };
  certifications?: string[];
  gstInfo: {
    hsnCode: string;
    taxRate: number;
  };
}

export interface NextaVendor {
  _id: string;
  vendorId: string;
  name: string;
  type: 'manufacturer' | 'distributor' | 'curator';
  categories: string[];
  rating: number;
  reviewCount: number;
  minimumOrder: number;
  deliveryInfo: {
    cities: string[];
    deliveryDays: number;
    freeDeliveryAbove: number;
  };
  gstIn: string;
  verified: boolean;
}

export interface BulkOrderRequest {
  vendorId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    customizations?: Record<string, string>;
  }>;
  deliveryAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  deliveryType: 'bulk' | 'individual';
  recipients?: Array<{
    name: string;
    phone: string;
    address: {
      line1: string;
      city: string;
      state: string;
      pincode: string;
    };
  }>;
  branding?: {
    includeLogo: boolean;
    customMessage?: string;
    wrapperColor?: string;
    giftMessage?: string;
  };
  scheduleDelivery?: {
    date: string;
    timeSlot?: string;
  };
  poNumber?: string;
}

export interface BulkOrder {
  _id: string;
  orderId: string;
  orderNumber: string;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  vendor?: {
    vendorId: string;
    name: string;
  };
  items: Array<{
    product: {
      productId: string;
      name: string;
      sku: string;
      image: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    customizations?: Record<string, string>;
    status: 'pending' | 'fulfilled' | 'partial';
  }>;
  pricing: {
    subtotal: number;
    bulkDiscount: number;
    gstAmount: number;
    deliveryCharge: number;
    customizationCost: number;
    totalAmount: number;
  };
  delivery: {
    type: 'bulk' | 'individual';
    address: {
      line1: string;
      city: string;
      state: string;
      pincode: string;
    };
    recipients?: number;
    trackingId?: string;
    estimatedDelivery?: string;
    deliveredAt?: string;
  };
  branding?: {
    includeLogo: boolean;
    customMessage: string;
    wrapperColor: string;
  };
  invoice?: {
    invoiceNumber: string;
    invoiceDate: string;
    gstIn: string;
  };
  poNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomGiftBox {
  _id: string;
  boxId: string;
  name: string;
  description: string;
  theme: string;
  priceRange: {
    min: number;
    max: number;
  };
  items: Array<{
    category: string;
    maxItems: number;
    minItems: number;
  }>;
  suggestedProducts: string[];
  image: string;
  customization: {
    available: boolean;
    wrapperColor: boolean;
    ribbon: boolean;
    greetingCard: boolean;
  };
  available: boolean;
}

// Helper
function getCompanyId(): string {
  return 'demo-company';
}

// NextaBizz API Service
export const nextaBizzApi = {
  // ========== Product Catalog ==========

  /**
   * Search products
   */
  async searchProducts(params?: {
    query?: string;
    category?: NextaProduct['category'];
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: NextaProduct[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.set('q', params.query);
    if (params?.category) queryParams.set('category', params.category);
    if (params?.minPrice) queryParams.set('minPrice', String(params.minPrice));
    if (params?.maxPrice) queryParams.set('maxPrice', String(params.maxPrice));
    if (params?.inStock !== undefined) queryParams.set('inStock', String(params.inStock));
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 50));

    const response = await apiClient.get<{
      data: NextaProduct[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/nextabizz/products?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 50 },
    };
  },

  /**
   * Get product details
   */
  async getProduct(productId: string): Promise<NextaProduct | null> {
    const response = await apiClient.get<{ data: NextaProduct }>(
      `/api/nextabizz/products/${productId}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  /**
   * Get products by category
   */
  async getProductsByCategory(category: NextaProduct['category']): Promise<NextaProduct[]> {
    const response = await apiClient.get<{ data: NextaProduct[] }>(
      `/api/nextabizz/products/category/${category}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Get bulk pricing for products
   */
  async getBulkPricing(
    productIds: string[],
    quantities: number[]
  ): Promise<
    Array<{
      productId: string;
      unitPrice: number;
      totalPrice: number;
      discountPercent: number;
    }>
  > {
    const response = await apiClient.post<{
      data: Array<{
        productId: string;
        unitPrice: number;
        totalPrice: number;
        discountPercent: number;
      }>;
    }>(
      '/api/nextabizz/products/bulk-pricing',
      { productIds, quantities },
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  // ========== Vendors ==========

  /**
   * Get vendors
   */
  async getVendors(params?: { category?: string; verified?: boolean }): Promise<NextaVendor[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set('category', params.category);
    if (params?.verified !== undefined) queryParams.set('verified', String(params.verified));

    const response = await apiClient.get<{ data: NextaVendor[] }>(
      `/api/nextabizz/vendors?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Get vendor details
   */
  async getVendor(vendorId: string): Promise<NextaVendor | null> {
    const response = await apiClient.get<{ data: NextaVendor }>(
      `/api/nextabizz/vendors/${vendorId}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  // ========== Bulk Orders ==========

  /**
   * Create bulk order
   */
  async createBulkOrder(data: BulkOrderRequest): Promise<BulkOrder> {
    const response = await apiClient.post<{ data: BulkOrder }>('/api/nextabizz/orders', data as unknown as Record<string, unknown>, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to create order');
    }
    return response.data!.data;
  },

  /**
   * Get bulk orders
   */
  async getBulkOrders(params?: {
    status?: BulkOrder['status'];
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: BulkOrder[]; pagination: { total: number; page: number; limit: number } }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: BulkOrder[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/nextabizz/orders?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  /**
   * Get bulk order details
   */
  async getBulkOrder(orderId: string): Promise<BulkOrder | null> {
    const response = await apiClient.get<{ data: BulkOrder }>(`/api/nextabizz/orders/${orderId}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || null;
  },

  /**
   * Update bulk order
   */
  async updateBulkOrder(orderId: string, data: Partial<BulkOrderRequest>): Promise<BulkOrder> {
    const response = await apiClient.put<{ data: BulkOrder }>(
      `/api/nextabizz/orders/${orderId}`,
      data,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to update order');
    }
    return response.data!.data;
  },

  /**
   * Cancel bulk order
   */
  async cancelBulkOrder(orderId: string, reason?: string): Promise<void> {
    const response = await apiClient.post(
      `/api/nextabizz/orders/${orderId}/cancel`,
      { reason },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel order');
    }
  },

  // ========== Custom Gift Boxes ==========

  /**
   * Get gift box templates
   */
  async getGiftBoxTemplates(): Promise<CustomGiftBox[]> {
    const response = await apiClient.get<{ data: CustomGiftBox[] }>('/api/nextabizz/gift-boxes', {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || [];
  },

  /**
   * Create custom gift box
   */
  async createCustomGiftBox(data: {
    boxId: string;
    items: Array<{ productId: string; quantity: number }>;
    branding?: BulkOrderRequest['branding'];
    recipients: Array<{
      name: string;
      address: BulkOrderRequest['deliveryAddress'];
    }>;
  }): Promise<BulkOrder> {
    const response = await apiClient.post<{ data: BulkOrder }>(
      '/api/nextabizz/gift-boxes/custom',
      data,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to create gift box');
    }
    return response.data!.data;
  },

  // ========== Quote Requests ==========

  /**
   * Request a quote for bulk order
   */
  async requestQuote(data: {
    vendorId?: string;
    productIds: string[];
    quantities: number[];
    customizations?: boolean;
    notes?: string;
  }): Promise<{ quoteId: string; estimatedPrice: number; validUntil: string }> {
    const response = await apiClient.post<{
      data: {
        quoteId: string;
        estimatedPrice: number;
        validUntil: string;
      };
    }>('/api/nextabizz/quotes', data, { headers: { 'x-company-id': getCompanyId() } });
    if (!response.success) {
      throw new Error(response.message || 'Failed to request quote');
    }
    return response.data!.data;
  },

  /**
   * Get quote details
   */
  async getQuote(quoteId: string): Promise<{
    quoteId: string;
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    pricing: {
      subtotal: number;
      discount: number;
      gstAmount: number;
      totalAmount: number;
    };
    validUntil: string;
    status: 'pending' | 'approved' | 'expired';
  } | null> {
    const response = await apiClient.get<{
      data: {
        quoteId: string;
        items: Array<{
          productId: string;
          name: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }>;
        pricing: {
          subtotal: number;
          discount: number;
          gstAmount: number;
          totalAmount: number;
        };
        validUntil: string;
        status: 'pending' | 'approved' | 'expired';
      };
    }>(`/api/nextabizz/quotes/${quoteId}`, { headers: { 'x-company-id': getCompanyId() } });
    return response.data?.data || null;
  },

  // ========== GST & Invoicing ==========

  /**
   * Get GST invoice for bulk order
   */
  async getOrderInvoice(orderId: string): Promise<{
    invoiceNumber: string;
    invoiceDate: string;
    vendor: {
      name: string;
      gstIn: string;
      address: string;
    };
    items: Array<{
      description: string;
      hsnCode: string;
      quantity: number;
      unitPrice: number;
      taxableValue: number;
      gstRate: number;
      cgstAmount: number;
      sgstAmount: number;
      total: number;
    }>;
    totals: {
      taxableAmount: number;
      cgst: number;
      sgst: number;
      totalTax: number;
      totalAmount: number;
    };
    itc: {
      eligible: boolean;
      amount: number;
    };
  } | null> {
    const response = await apiClient.get<{
      data: {
        invoiceNumber: string;
        invoiceDate: string;
        vendor: { name: string; gstIn: string; address: string };
        items: Array<{
          description: string;
          hsnCode: string;
          quantity: number;
          unitPrice: number;
          taxableValue: number;
          gstRate: number;
          cgstAmount: number;
          sgstAmount: number;
          total: number;
        }>;
        totals: {
          taxableAmount: number;
          cgst: number;
          sgst: number;
          totalTax: number;
          totalAmount: number;
        };
        itc: { eligible: boolean; amount: number };
      };
    }>(`/api/nextabizz/orders/${orderId}/invoice`, { headers: { 'x-company-id': getCompanyId() } });
    return response.data?.data || null;
  },

  // ========== Recommendations ==========

  /**
   * Get recommended products for corporate gifting
   */
  async getRecommendedProducts(params?: {
    occasion?: 'festival' | 'milestone' | 'thank_you' | 'client' | 'general';
    budgetMin?: number;
    budgetMax?: number;
    quantity?: number;
  }): Promise<NextaProduct[]> {
    const queryParams = new URLSearchParams();
    if (params?.occasion) queryParams.set('occasion', params.occasion);
    if (params?.budgetMin) queryParams.set('budgetMin', String(params.budgetMin));
    if (params?.budgetMax) queryParams.set('budgetMax', String(params.budgetMax));
    if (params?.quantity) queryParams.set('quantity', String(params.quantity));

    const response = await apiClient.get<{ data: NextaProduct[] }>(
      `/api/nextabizz/products/recommended?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Get trending products
   */
  async getTrendingProducts(limit = 20): Promise<NextaProduct[]> {
    const response = await apiClient.get<{ data: NextaProduct[] }>(
      `/api/nextabizz/products/trending?limit=${limit}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },
};

export default nextaBizzApi;
