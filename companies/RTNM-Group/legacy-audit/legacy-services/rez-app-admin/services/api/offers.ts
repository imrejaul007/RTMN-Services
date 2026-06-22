import { apiClient } from './apiClient';

// Types
export interface Offer {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  category: string;
  type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special' | 'walk_in';
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  store: {
    id: string;
    name: string;
    logo?: string;
    rating?: number;
    verified?: boolean;
  };
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  metadata: {
    priority: number;
    tags: string[];
    isNew?: boolean;
    isTrending?: boolean;
    featured?: boolean;
  };
  restrictions?: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    usageLimitPerUser?: number;
    usageLimit?: number;
  };
  exclusiveZone?: string;
  eligibilityRequirement?: string;
  isFreeDelivery?: boolean;
  bogoType?: string;
  bogoDetails?: string;
  redemptionCount?: number;
  adminApproved?: boolean;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  _id: string;
  name: string;
  logo?: string;
}

export interface OfferStats {
  total: number;
  active: number;
  expired: number;
  inactive: number;
  byZone: Record<string, { count: number; active: number }>;
  byCategory: Record<string, number>;
}

export interface OffersListResponse {
  offers: Offer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateOfferRequest {
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  // FM-09 FIX: Constrained to the 11 DB enum values (was untyped `string`).
  category:
    | 'mega'
    | 'student'
    | 'new_arrival'
    | 'trending'
    | 'food'
    | 'fashion'
    | 'electronics'
    | 'general'
    | 'entertainment'
    | 'beauty'
    | 'wellness';
  // FM-09 FIX: Constrained to the 6 DB enum values (was untyped `string`).
  type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special' | 'walk_in';
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  storeId: string;
  exclusiveZone?: string | null;
  eligibilityRequirement?: string;
  validity: {
    startDate: Date | string;
    endDate: Date | string;
    isActive: boolean;
  };
  // FM-08 FIX: Added isBestSeller and isSpecial (set by merchant, must be preserved by admin).
  metadata?: {
    priority?: number;
    tags?: string[];
    isNew?: boolean;
    isTrending?: boolean;
    featured?: boolean;
    isBestSeller?: boolean;
    isSpecial?: boolean;
  };
  // FM-07 FIX: Added applicableOn and excludedProducts (present in merchant and DB, absent in admin).
  restrictions?: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    usageLimitPerUser?: number;
    usageLimit?: number;
    applicableOn?: ('online' | 'offline' | 'both')[];
    excludedProducts?: string[];
  };
  isFreeDelivery?: boolean;
  bogoType?: string;
  bogoDetails?: string;
}

export interface OffersFilter {
  page?: number;
  limit?: number;
  exclusiveZone?: string;
  category?: string;
  type?: string;
  isActive?: string;
  search?: string;
}

// C3 FIX: Replaced raw fetch + manual getAuthHeaders() with apiClient so that
// auth token refresh, interceptors, session-expiry redirect and cookie handling
// are all handled centrally.
export const offersService = {
  async getOffers(filters: OffersFilter = {}): Promise<OffersListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.exclusiveZone) params.append('exclusiveZone', filters.exclusiveZone);
    if (filters.category) params.append('category', filters.category);
    if (filters.type) params.append('type', filters.type);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.search) params.append('search', filters.search);

    const data = await apiClient.get<OffersListResponse>(`admin/offers?${params.toString()}`);
    if (!data.success) throw new Error(data.message || 'Failed to fetch offers');
    return data?.data ?? { offers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  async getStats(): Promise<OfferStats> {
    const data = await apiClient.get<OfferStats>('admin/offers/stats');
    if (!data.success) throw new Error(data.message || 'Failed to fetch stats');
    return data?.data ?? { total: 0, active: 0, expired: 0, inactive: 0, byZone: {}, byCategory: {} };
  },

  async getStores(): Promise<Store[]> {
    const data = await apiClient.get<Store[]>('admin/offers/stores');
    if (!data.success) throw new Error(data.message || 'Failed to fetch stores');
    return data?.data ?? [];
  },

  async getOffer(id: string): Promise<Offer | null> {
    const data = await apiClient.get<Offer>(`admin/offers/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to fetch offer');
    return data?.data ?? null;
  },

  async createOffer(offerData: CreateOfferRequest): Promise<Offer | null> {
    const data = await apiClient.post<Offer, CreateOfferRequest>('admin/offers', offerData);
    if (!data.success) throw new Error(data.message || 'Failed to create offer');
    return data?.data ?? null;
  },

  async updateOffer(id: string, offerData: CreateOfferRequest): Promise<Offer | null> {
    const data = await apiClient.put<Offer, CreateOfferRequest>(`admin/offers/${id}`, offerData);
    if (!data.success) throw new Error(data.message || 'Failed to update offer');
    return data?.data ?? null;
  },

  async toggleOffer(id: string): Promise<{ isActive: boolean }> {
    const data = await apiClient.patch<{ isActive: boolean }>(`admin/offers/${id}/toggle`);
    if (!data.success) throw new Error(data.message || 'Failed to toggle offer');
    return data?.data ?? { isActive: false };
  },

  async deleteOffer(id: string): Promise<void> {
    const data = await apiClient.delete(`admin/offers/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete offer');
  },

  async getPendingOffers(page = 1, limit = 20): Promise<OffersListResponse> {
    const data = await apiClient.get<OffersListResponse>(
      `admin/offers/pending-approval?page=${page}&limit=${limit}`
    );
    if (!data.success) throw new Error(data.message || 'Failed to fetch pending offers');
    return data?.data ?? { offers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  },

  async approveOffer(id: string, notes?: string): Promise<Offer | null> {
    const data = await apiClient.put<Offer>(`admin/offers/${id}/approve`, { notes });
    if (!data.success) throw new Error(data.message || 'Failed to approve offer');
    return data?.data ?? null;
  },

  async rejectOffer(id: string, reason?: string): Promise<Offer | null> {
    const data = await apiClient.put<Offer>(`admin/offers/${id}/reject`, { reason });
    if (!data.success) throw new Error(data.message || 'Failed to reject offer');
    return data?.data ?? null;
  },
};

export default offersService;
