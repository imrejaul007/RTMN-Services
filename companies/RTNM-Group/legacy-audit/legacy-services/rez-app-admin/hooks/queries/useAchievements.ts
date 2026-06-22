/**
 * useAchievements — React Query data layer for the Achievements management screen.
 *
 * Provides list, detail, stats, and metrics queries.
 * Uses achievementsService which throws on error directly (Pattern B).
 *
 * Usage:
 *   const { data } = useAchievementsList({ type: 'badge', isActive: 'true' });
 *   const { data: stats } = useAchievementStats();
 *   const { data: metrics } = useAchievementMetrics();
 */

import { useQuery } from '@tanstack/react-query';
import {
  achievementsService,
  type AdminAchievement,
  type AchievementStats,
} from '@/services/api/achievements';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface AchievementFilters {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  isActive?: string;
}

// ── List ─────────────────────────────────────────────────────────────────────

export function useAchievementsList(filters: AchievementFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.achievements.list(filters),
    queryFn: () => achievementsService.list(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────

export function useAchievement(id: string) {
  return useQuery({
    queryKey: queryKeys.achievements.detail(id),
    queryFn: () => achievementsService.getById(id),
    enabled: !!id,
  });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function useAchievementStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.achievements.stats(),
    queryFn: () => achievementsService.getStats(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Metrics ──────────────────────────────────────────────────────────────────

export function useAchievementMetrics() {
  return useQuery({
    queryKey: [...queryKeys.achievements.all, 'metrics'] as const,
    queryFn: () => achievementsService.getMetrics(),
    ...queryConfig.adminList,
  });
}
