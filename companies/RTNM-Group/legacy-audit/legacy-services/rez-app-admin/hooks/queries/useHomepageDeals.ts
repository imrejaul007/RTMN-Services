/**
 * useHomepageDeals — React Query data layer for the Homepage Deals admin module.
 *
 * Covers the homepage deals section configuration, individual deal items, and
 * aggregate statistics.
 *
 * Usage:
 *   const { config } = useHomepageDealsConfig();
 *   const { items } = useHomepageDealsItems({ tabType: 'cashback', page: 1 });
 *   const { stats } = useHomepageDealsStats();
 */
import { useQuery } from '@tanstack/react-query';
import { homepageDealsService } from '@/services/api/homepageDeals';
import type {
  HomepageDealsConfig,
  HomepageDealsStats,
  HomepageDealsItem,
  ItemsQuery,
} from '@/services/api/homepageDeals';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export type { ItemsQuery };

// ── Config ─────────────────────────────────────────────────────────────────────

export function useHomepageDealsConfig() {
  const { user } = useAuth();
  return useQuery<HomepageDealsConfig>({
    queryKey: queryKeys.homepageDeals.config(),
    queryFn: () => homepageDealsService.getConfig(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Items ─────────────────────────────────────────────────────────────────────

export function useHomepageDealsItems(query?: ItemsQuery) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.homepageDeals.items(query),
    queryFn: () => homepageDealsService.getItems(query),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useHomepageDealsItem(id: string) {
  const { user } = useAuth();
  return useQuery<HomepageDealsItem>({
    queryKey: [...queryKeys.homepageDeals.items(), 'detail', id] as const,
    queryFn: () => homepageDealsService.getItem(id),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function useHomepageDealsStats() {
  const { user } = useAuth();
  return useQuery<HomepageDealsStats>({
    queryKey: queryKeys.homepageDeals.stats(),
    queryFn: () => homepageDealsService.getStats(),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}
