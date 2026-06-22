import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

// ============================================
// INTERFACES
// ============================================

export interface AdminStore {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string[];
  category?: string | { _id: string; name: string; slug: string };
  categoryInfo?: { _id: string; name: string; slug: string };
  merchant?: { _id: string; name?: string; email?: string; businessName?: string };
  merchantInfo?: { _id: string; businessName?: string; ownerName?: string; email?: string };
  isActive: boolean;
  adminApproved?: boolean;
  isSuspended?: boolean;
  isFeatured?: boolean;
  ratings?: { average: number; count: number };
  serviceCapabilities?: {
    homeDelivery?: { enabled: boolean };
    driveThru?: { enabled: boolean };
    tableBooking?: { enabled: boolean };
    dineIn?: { enabled: boolean };
    storePickup?: { enabled: boolean };
  };
  // R17: Expanded to match backend IStoreLocation — adds state, coordinates,
  // deliveryRadius, and landmark so the admin moderation UI can set/view
  // the full geo shape including map pin and delivery radius.
  location?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number]; // [longitude, latitude] — GeoJSON order
    deliveryRadius?: number; // km
    landmark?: string;
  };
  // W02: Promotions array from backend IStore.promotions
  promotions?: Array<{
    isFeatured?: boolean;
    priority?: number;
    badge?: string;
  }>;
  createdAt?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// ============================================
// SERVICE CLASS
// ============================================

class StoresService {
  /**
   * Get stores with optional filters
   */
  async getStores(params: {
    category?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ stores: AdminStore[]; pagination: Pagination }> {
    try {
      const queryParts: string[] = [];
      if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
      if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params.isActive !== undefined) queryParts.push(`isActive=${params.isActive}`);
      if (params.page) queryParts.push(`page=${params.page}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);

      const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      logger.info('[Stores] Fetching stores...', query);
      const response = await apiClient.get<any>(`admin/stores${query}`);

      if (response.success && response.data) {
        logger.info('[Stores] Fetched successfully');
        const stores = response.data.stores || (Array.isArray(response.data) ? response.data : []);
        const rawPag = response.data.pagination || response.pagination || {};
        const pagination: Pagination = {
          page: rawPag.page || params.page || 1,
          limit: rawPag.limit || params.limit || 20,
          total: rawPag.total || stores.length,
          totalPages: rawPag.totalPages || rawPag.pages || 1,
          hasNext: rawPag.hasNext,
          hasPrev: rawPag.hasPrev,
        };
        return { stores, pagination };
      }

      throw new Error(response.message || 'Failed to fetch stores');
    } catch (error: any) {
      logger.error('[Stores] Get stores error:', error.message);
      throw new Error(error.message || 'Failed to fetch stores');
    }
  }

  /**
   * Get a single store by ID
   */
  async getStore(id: string): Promise<{ store: AdminStore }> {
    try {
      logger.info('[Stores] Fetching store:', id);
      const response = await apiClient.get<any>(`admin/stores/${id}`);

      if (response.success && response.data) {
        logger.info('[Stores] Store fetched:', { name: response.data.store?.name || response.data.name });
        const store = response.data.store || response.data;
        return { store };
      }

      throw new Error(response.message || 'Store not found');
    } catch (error: any) {
      logger.error('[Stores] Get store error:', error.message);
      throw new Error(error.message || 'Failed to fetch store');
    }
  }

  /**
   * Get stores by category
   */
  async getStoresByCategory(
    categoryId: string,
    params?: { search?: string; page?: number; limit?: number }
  ): Promise<{ stores: AdminStore[]; pagination: Pagination }> {
    try {
      const queryParts: string[] = [];
      if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.page) queryParts.push(`page=${params.page}`);
      if (params?.limit) queryParts.push(`limit=${params.limit}`);

      const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      logger.info('[Stores] Fetching stores for category:', { categoryId, query });
      const response = await apiClient.get<any>(`admin/stores/category/${categoryId}${query}`);

      if (response.success && response.data) {
        logger.info('[Stores] Category stores fetched');
        const stores = response.data.stores || (Array.isArray(response.data) ? response.data : []);
        const rawPag = response.data.pagination || response.pagination || {};
        const pagination: Pagination = {
          page: rawPag.page || params?.page || 1,
          limit: rawPag.limit || params?.limit || 20,
          total: rawPag.total || stores.length,
          totalPages: rawPag.totalPages || rawPag.pages || 1,
          hasNext: rawPag.hasNext,
          hasPrev: rawPag.hasPrev,
        };
        return { stores, pagination };
      }

      throw new Error(response.message || 'Failed to fetch stores for category');
    } catch (error: any) {
      logger.error('[Stores] Get stores by category error:', error.message);
      throw new Error(error.message || 'Failed to fetch stores for category');
    }
  }

  /**
   * Reassign a store to a different category
   */
  async reassignCategory(storeId: string, categoryId: string): Promise<{ store: AdminStore }> {
    try {
      logger.info('[Stores] Reassigning store:', { storeId, categoryId });
      const response = await apiClient.put<any>(`admin/stores/${storeId}/category`, { categoryId });

      if (response.success && response.data) {
        logger.info('[Stores] Store category reassigned');
        const store = response.data.store || response.data;
        return { store };
      }

      throw new Error(response.message || 'Failed to reassign category');
    } catch (error: any) {
      logger.error('[Stores] Reassign category error:', error.message);
      throw new Error(error.message || 'Failed to reassign category');
    }
  }

  /**
   * Bulk reassign stores to a category
   */
  async bulkReassignCategory(storeIds: string[], categoryId: string): Promise<{ count: number }> {
    try {
      logger.info(
        '[Stores] Bulk reassigning',
        { count: storeIds.length, categoryId }
      );
      const response = await apiClient.post<any>('admin/stores/bulk-category', {
        storeIds,
        categoryId,
      });

      if (response.success && response.data) {
        logger.info('[Stores] Bulk reassign completed, count:', response.data.count);
        return { count: response.data.count || storeIds.length };
      }

      throw new Error(response.message || 'Failed to bulk reassign categories');
    } catch (error: any) {
      logger.error('[Stores] Bulk reassign error:', error.message);
      throw new Error(error.message || 'Failed to bulk reassign categories');
    }
  }

  /**
   * Update admin actions on a store (approve, suspend, feature, notes)
   */
  async updateAdminActions(
    storeId: string,
    actions: {
      adminApproved?: boolean;
      isSuspended?: boolean;
      suspensionReason?: string;
      isFeatured?: boolean;
      adminNotes?: string;
    }
  ): Promise<{ store: AdminStore }> {
    try {
      logger.info('[Stores] Updating admin actions for store:', storeId);
      const response = await apiClient.put<any>(`admin/stores/${storeId}/admin-actions`, actions);

      if (response.success && response.data) {
        logger.info('[Stores] Admin actions updated');
        const store = response.data.store || response.data;
        return { store };
      }

      throw new Error(response.message || 'Failed to update admin actions');
    } catch (error: any) {
      logger.error('[Stores] Update admin actions error:', error.message);
      throw new Error(error.message || 'Failed to update admin actions');
    }
  }

  /**
   * Toggle a service capability for a store
   */
  async toggleServiceCapability(
    storeId: string,
    capability: string,
    enabled: boolean
  ): Promise<{ store: AdminStore; message: string }> {
    try {
      logger.info(
        '[Stores] Toggling capability:',
        { capability, enabled, storeId }
      );
      const response = await apiClient.put<any>(`admin/stores/${storeId}/service-capabilities`, {
        capability,
        enabled,
      });

      if (response.success && response.data) {
        logger.info('[Stores] Capability toggled successfully');
        const store = response.data.store || response.data;
        return {
          store,
          message: response.message || `${capability} ${enabled ? 'enabled' : 'disabled'}`,
        };
      }

      throw new Error(response.message || 'Failed to toggle service capability');
    } catch (error: any) {
      logger.error('[Stores] Toggle capability error:', error.message);
      throw new Error(error.message || 'Failed to toggle service capability');
    }
  }
}

export const storesService = new StoresService();
export default storesService;
