/**
 * useStores — React Query data layer for the Stores management screen.
 *
 * Provides list and detail queries for stores. Uses Pattern A (apiClient
 * with select + res.success check) to match the established merchants/orders
 * pattern in this codebase.
 *
 * Usage:
 *   const { data, isLoading } = useStoresList({ page: 1, category: 'food', isActive: true });
 *   const { data: store } = useStore('store-id-123');
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface StoreFilters {
  category?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ── List ─────────────────────────────────────────────────────────────────────

export function useStoresList(filters: StoreFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.stores.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.category) params.set('category', filters.category);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
      const qs = params.toString();
      return apiClient.get<any>(`admin/stores${qs ? `?${qs}` : ''}`);
    },
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load stores');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.storeCategories,
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────

export function useStore(id: string) {
  return useQuery({
    queryKey: queryKeys.stores.detail(id),
    queryFn: () => apiClient.get<any>(`admin/stores/${id}`),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load store');
      return res.data;
    },
    enabled: !!id,
  });
}
