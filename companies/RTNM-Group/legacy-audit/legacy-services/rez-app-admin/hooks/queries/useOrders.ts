import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// NEW-A-H2 FIX: select must throw when API returns success:false.
// Previously, `select: (res) => res.data` silently returned undefined on failure,
// causing components to render blank lists without any error signal.
export function useAdminOrders(filters?: { page?: number; limit?: number; status?: string }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.status) params.set('status', filters.status);
      const qs = params.toString();
      return apiClient.get<any>(`admin/orders${qs ? `?${qs}` : ''}`);
    },
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load orders');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.orders,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => apiClient.get<any>(`admin/orders/${id}`),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load order');
      return res.data;
    },
    enabled: !!id,
  });
}

export function useOrderStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders.stats(),
    queryFn: () => apiClient.get<any>('admin/orders/stats'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load order stats');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.orders,
  });
}
