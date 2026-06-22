/**
 * useLoyalty — React Query data layer for the Loyalty program management screen.
 *
 * Provides user list, stats, and individual user detail queries.
 * Uses loyaltyService which throws on error directly (Pattern B).
 *
 * Usage:
 *   const { data, isLoading } = useLoyaltyUsers({ page: 1, limit: 20, search: 'john' });
 *   const { data: stats } = useLoyaltyStats();
 *   const { data: user } = useLoyaltyUser('user-id-123');
 */

import { useQuery } from '@tanstack/react-query';
import {
  loyaltyService,
  type LoyaltyUser,
  type LoyaltyStats,
  type LoyaltyListResponse,
} from '@/services/api/loyalty';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface LoyaltyUserFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: string;
}

// ── Users list ────────────────────────────────────────────────────────────────

export function useLoyaltyUsers(filters: LoyaltyUserFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.loyalty.users(filters),
    queryFn: () =>
      loyaltyService.getUsers(
        filters.page,
        filters.limit,
        filters.search,
        filters.category,
        filters.sortBy
      ),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function useLoyaltyStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.loyalty.stats(),
    queryFn: () => loyaltyService.getStats(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── User detail ──────────────────────────────────────────────────────────────

export function useLoyaltyUser(userId: string) {
  return useQuery({
    queryKey: [...queryKeys.loyalty.all, 'detail', userId] as const,
    queryFn: () => loyaltyService.getUser(userId),
    enabled: !!userId,
  });
}
