/**
 * useChallenges — React Query data layer for the Challenges (missions) screen.
 *
 * Provides list, detail, stats, templates, and analytics queries.
 * Uses challengesService which throws on error directly (Pattern B).
 *
 * Usage:
 *   const { data } = useChallengesList({ type: 'daily', featured: 'true' });
 *   const { data: stats } = useChallengeStats();
 *   const { data: templates } = useChallengeTemplates();
 *   const { data: analytics } = useChallengeAnalytics({ period: '7d' });
 */

import { useQuery } from '@tanstack/react-query';
import { challengesService } from '@/services/api/challenges';
import { queryKeys } from './queryKeys';
import type { FilterOptions } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface ChallengeFilters {
  page?: number;
  limit?: number;
  type?: string;
  difficulty?: string;
  status?: string;
  featured?: string;
}

export interface ChallengeAnalyticsFilters {
  type?: string;
  period?: string;
}

// ── List ─────────────────────────────────────────────────────────────────────

export function useChallengesList(filters: ChallengeFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.challenges.list(filters),
    queryFn: () => challengesService.list(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────

export function useChallenge(id: string) {
  return useQuery({
    queryKey: queryKeys.challenges.detail(id),
    queryFn: () => challengesService.getById(id),
    enabled: !!id,
  });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function useChallengeStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.challenges.stats(),
    queryFn: () => challengesService.getStats(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Templates ────────────────────────────────────────────────────────────────

export function useChallengeTemplates() {
  return useQuery({
    queryKey: queryKeys.challenges.templates(),
    queryFn: () => challengesService.getTemplates(),
    staleTime: 10 * 60 * 1000, // templates change rarely
  });
}

// ── Analytics ────────────────────────────────────────────────────────────────

export function useChallengeAnalytics(filters: ChallengeAnalyticsFilters = {}) {
  return useQuery({
    queryKey: queryKeys.challenges.analytics(filters),
    queryFn: () => challengesService.getAnalytics(filters as FilterOptions),
    ...queryConfig.adminList,
  });
}
