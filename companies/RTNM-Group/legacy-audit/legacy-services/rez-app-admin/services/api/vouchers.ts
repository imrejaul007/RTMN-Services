/**
 * Voucher Admin API Service (VoucherBrand CRUD)
 *
 * NOTE: This file overlaps with cashStore.ts which also defines endpoints for
 * admin/vouchers/*. This service is used by voucher-management.tsx while
 * cashStore.ts is used by cash-store.tsx. Both hit the same backend endpoints.
 *
 * A10-C2 FIX: VoucherBrand is now imported from the canonical types/VoucherBrand.ts
 * file. The local duplicate definition has been removed. Any field additions must
 * be made in types/VoucherBrand.ts and agreed upon by both consumers.
 */
import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';
import type { VoucherBrand, VoucherBrandListResponse } from '../../types/VoucherBrand';
// Re-export so existing consumers (voucher-management.tsx) can still import from this file
export type { VoucherBrand } from '../../types/VoucherBrand';

type ListVouchersResponse = VoucherBrandListResponse;

interface VoucherCreateData {
  name: string;
  logo: string;
  backgroundColor: string;
  logoColor: string;
  description: string;
  cashbackRate: number;
  category: string;
  denominations: number[];
  termsAndConditions: string[];
  isFeatured?: boolean;
  isNewlyAdded?: boolean;
  store?: string;
}

class VoucherAdminService {
  async list(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    category?: string;
    featured?: boolean;
  }): Promise<ListVouchersResponse> {
    try {
      let url = 'admin/vouchers';
      const params: string[] = [];

      if (filters?.page) params.push(`page=${filters.page}`);
      if (filters?.limit) params.push(`limit=${filters.limit}`);
      if (filters?.search) params.push(`search=${encodeURIComponent(filters.search)}`);
      if (filters?.status) params.push(`status=${encodeURIComponent(filters.status)}`);
      if (filters?.category) params.push(`category=${encodeURIComponent(filters.category)}`);
      if (filters?.featured !== undefined) params.push(`featured=${filters.featured}`);

      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await apiClient.get<ListVouchersResponse>(url);
      if (response.success && response.data) return response.data;
      return { vouchers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      logger.error('[Voucher Admin] Error listing vouchers:', error);
      return { vouchers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }

  async getById(id: string): Promise<VoucherBrand | null> {
    try {
      // Backend: sendSuccess(res, voucher, ...) → data IS the voucher, not { voucher: ... }
      const response = await apiClient.get<VoucherBrand>(`admin/vouchers/${id}`);
      if (response.success && response.data) return response.data;
      return null;
    } catch (error) {
      logger.error('[Voucher Admin] Error getting voucher:', error);
      return null;
    }
  }

  async create(data: VoucherCreateData): Promise<VoucherBrand | null> {
    try {
      // Backend: sendSuccess(res, voucher, ...) → data IS the voucher, not { voucher: ... }
      const response = await apiClient.post<VoucherBrand>('admin/vouchers', data as any);
      if (response.success && response.data) return response.data;
      return null;
    } catch (error) {
      logger.error('[Voucher Admin] Error creating voucher:', error);
      return null;
    }
  }

  async update(id: string, data: Partial<VoucherCreateData>): Promise<VoucherBrand | null> {
    try {
      // Backend: sendSuccess(res, voucher, ...) → data IS the voucher, not { voucher: ... }
      const response = await apiClient.put<VoucherBrand>(`admin/vouchers/${id}`, data as any);
      if (response.success && response.data) return response.data;
      return null;
    } catch (error) {
      logger.error('[Voucher Admin] Error updating voucher:', error);
      return null;
    }
  }

  async toggleActive(id: string): Promise<boolean> {
    try {
      const response = await apiClient.patch(`admin/vouchers/${id}/toggle`);
      return response.success;
    } catch (error) {
      logger.error('[Voucher Admin] Error toggling voucher:', error);
      return false;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`admin/vouchers/${id}`);
      return response.success;
    } catch (error) {
      logger.error('[Voucher Admin] Error deleting voucher:', error);
      return false;
    }
  }
}

export const voucherAdminService = new VoucherAdminService();
export default voucherAdminService;
