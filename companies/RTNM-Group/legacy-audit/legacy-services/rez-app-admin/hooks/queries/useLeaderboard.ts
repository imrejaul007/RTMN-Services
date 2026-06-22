/**
 * useLeaderboard — React Query data layer for the Leaderboard Config admin module.
 *
 * Provides typed hooks for listing, viewing, and managing leaderboard configurations,
 * including analytics, prize distribution, and prize history.
 *
 * Usage:
 *   const { configs } = useLeaderboardConfigs({ page: 1, limit: 20, status: 'active' });
 *   const { config } = useLeaderboardConfig('configId123');
 *   const { stats } = useLeaderboardStats();
 *   const { analytics } = useLeaderboardAnalytics('configId123');
 *   const { prizeHistory } = useLeaderboardPrizeHistory({ page: 1, limit: 20 });
 */
import { useQuery } from '@tanstack/react-query';
import { leaderboardConfigService } from '@/services/api/leaderboardConfig';
import type {
  LeaderboardConfigAdmin,
  LeaderboardConfigQuery,
  LeaderboardConfigListResponse,
  LeaderboardStats,
  LeaderboardAnalytics,
  PrizeHistoryResponse,
  PrizeHistoryQuery,
} from '@/services/api/leaderboardConfig';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export type { LeaderboardConfigQuery, LeaderboardConfigListResponse, PrizeHistoryQuery };

// ── Leaderboard configs list ───────────────────────────────────────────────────

export function useLeaderboardConfigs(filters: LeaderboardConfigQuery = {}) {
  const { user } = useAuth();
  return useQuery<LeaderboardConfigListResponse>({
    queryKey: queryKeys.leaderboard.list(filters),
    queryFn: () => leaderboardConfigService.getAll(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Single leaderboard config ─────────────────────────────────────────────────

export function useLeaderboardConfig(id: string) {
  const { user } = useAuth();
  return useQuery<LeaderboardConfigAdmin>({
    queryKey: queryKeys.leaderboard.detail(id),
    queryFn: () => leaderboardConfigService.getById(id),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}

// ── Leaderboard stats ──────────────────────────────────────────────────────────

export function useLeaderboardStats() {
  const { user } = useAuth();
  return useQuery<LeaderboardStats>({
    queryKey: queryKeys.leaderboard.stats(),
    queryFn: () => leaderboardConfigService.getStats(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Leaderboard analytics ──────────────────────────────────────────────────────

export function useLeaderboardAnalytics(id: string) {
  const { user } = useAuth();
  return useQuery<LeaderboardAnalytics>({
    queryKey: queryKeys.leaderboard.analytics(id),
    queryFn: () => leaderboardConfigService.getAnalytics(id),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}

// ── Prize history ──────────────────────────────────────────────────────────────

export function useLeaderboardPrizeHistory(filters: PrizeHistoryQuery = {}) {
  const { user } = useAuth();
  return useQuery<PrizeHistoryResponse>({
    queryKey: queryKeys.leaderboard.prizeHistory(filters),
    queryFn: () => leaderboardConfigService.getPrizeHistory(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}
