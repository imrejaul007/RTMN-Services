/**
 * useAdminWallet — React Query data layer for the Admin Wallet management screen.
 *
 * Provides wallet summary, transaction history, and daily breakdown queries.
 * Uses apiClient with select + res.success check (Pattern A) to match
 * the established pattern used by useMerchants and useOrders.
 *
 * Usage:
 *   const { data: summary } = useAdminWalletSummary();
 *   const { data: txns } = useAdminWalletTransactions({ page: 1, limit: 20 });
 *   const { data: breakdown } = useAdminWalletBreakdown(30);
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface WalletTransactionFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

// ── Wallet summary ───────────────────────────────────────────────────────────

export function useAdminWalletSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminWallet.summary(),
    queryFn: () => apiClient.get<any>('admin/wallet/summary'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load wallet summary');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Transaction history ──────────────────────────────────────────────────────

export function useAdminWalletTransactions(filters: WalletTransactionFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminWallet.transactions(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.startDate) params.set('startDate', filters.startDate);
      if (filters?.endDate) params.set('endDate', filters.endDate);
      const qs = params.toString();
      return apiClient.get<any>(`admin/wallet/transactions${qs ? `?${qs}` : ''}`);
    },
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load transaction history');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Daily breakdown ─────────────────────────────────────────────────────────

export function useAdminWalletBreakdown(days?: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.adminWallet.breakdown({ days: days ?? undefined }),
    queryFn: () => {
      const params = new URLSearchParams();
      if (days !== undefined) params.set('days', String(days));
      const qs = params.toString();
      return apiClient.get<any>(`admin/wallet/daily-breakdown${qs ? `?${qs}` : ''}`);
    },
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load daily breakdown');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.adminList,
  });
}
