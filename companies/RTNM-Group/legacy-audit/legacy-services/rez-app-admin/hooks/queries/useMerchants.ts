import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// NEW-A-H2 FIX: select must throw when API returns success:false.
// Previously, `select: (res) => res.data` silently returned undefined on failure.
export function useMerchants(filters?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.merchants.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      const qs = params.toString();
      return apiClient.get<any>(`admin/merchants${qs ? `?${qs}` : ''}`);
    },
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load merchants');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.merchants,
  });
}

export function useMerchant(id: string) {
  return useQuery({
    queryKey: queryKeys.merchants.detail(id),
    queryFn: () => apiClient.get<any>(`admin/merchants/${id}`),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load merchant');
      return res.data;
    },
    enabled: !!id,
  });
}

export function useMerchantWalletStats() {
  return useQuery({
    queryKey: queryKeys.merchants.wallets(),
    queryFn: () => apiClient.get<any>('admin/merchant-wallets/stats'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load wallet stats');
      return res.data;
    },
    ...queryConfig.merchants,
  });
}

export function usePendingWithdrawals() {
  return useQuery({
    queryKey: queryKeys.merchants.withdrawals(),
    queryFn: () => apiClient.get<any>('admin/merchant-wallets/pending-withdrawals'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load pending withdrawals');
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useMerchantWallet(merchantId: string) {
  return useQuery({
    queryKey: ['merchant-wallet', merchantId] as const,
    queryFn: () => apiClient.get<any>(`admin/merchant-wallets/${merchantId}`),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load merchant wallet');
      return res.data;
    },
    enabled: !!merchantId,
    staleTime: 30 * 1000,
  });
}
