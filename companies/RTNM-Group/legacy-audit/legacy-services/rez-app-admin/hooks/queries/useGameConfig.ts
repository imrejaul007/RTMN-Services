/**
 * useGameConfig — React Query data layer for the Game Config management screen.
 *
 * Provides list, analytics, and user game history queries.
 * Uses gameConfigService which throws on error directly (Pattern B).
 *
 * Usage:
 *   const { data } = useGameConfigs();
 *   const { data } = useGameConfigsByType('spin_the_wheel');
 *   const { data: analytics } = useGameAnalytics('spin_the_wheel', 7);
 *   const { data: history } = useUserGameHistory('user-id-123', 'spin_the_wheel');
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gameConfigService } from '@/services/api/gameConfig';
import { queryKeys } from './queryKeys';
import type { FilterOptions } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── List all game configs ────────────────────────────────────────────────────

export function useGameConfigs(enabled?: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.gameConfig.list(),
    queryFn: () => gameConfigService.list(enabled),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── List by game type ────────────────────────────────────────────────────────

export function useGameConfigsByType(gameType: string) {
  return useQuery({
    queryKey: [...queryKeys.gameConfig.all, 'byType', gameType] as const,
    queryFn: () => gameConfigService.getByType(gameType),
    enabled: !!gameType,
    ...queryConfig.adminList,
  });
}

// ── Analytics ────────────────────────────────────────────────────────────────

export function useGameAnalytics(gameType?: string, days?: number) {
  return useQuery({
    queryKey: queryKeys.gameConfig.analytics({ gameType, days } as FilterOptions),
    queryFn: () => gameConfigService.getAnalytics(gameType, days),
    ...queryConfig.adminList,
  });
}

// ── User game history ────────────────────────────────────────────────────────

export function useUserGameHistory(userId: string, gameType?: string) {
  return useQuery({
    queryKey: [...queryKeys.gameConfig.all, 'userHistory', userId, gameType ?? ''] as const,
    queryFn: () => gameConfigService.getUserGameHistory(userId, gameType),
    enabled: !!userId,
    ...queryConfig.adminList,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────────

export function useCreateGameConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof gameConfigService.create>[0]) =>
      gameConfigService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}

export function useUpdateGameConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof gameConfigService.update>[1];
    }) => gameConfigService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}

export function useDeleteGameConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gameConfigService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}

export function useToggleGameConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gameConfigService.toggle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}

export function useToggleGameConfigFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gameConfigService.toggleFeatured(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}

export function useSeedGameConfigs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gameConfigService.seed(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}

export function useBanGameUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      gameConfigService.banUser(userId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}

export function useUnbanGameUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => gameConfigService.unbanUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}

export function useCreditGameCoins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      amount,
      reason,
    }: {
      userId: string;
      amount: number;
      reason: string;
    }) => gameConfigService.creditCoins(userId, amount, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}

export function useRevokeGameCoins() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      amount,
      reason,
    }: {
      userId: string;
      amount: number;
      reason: string;
    }) => gameConfigService.revokeCoins(userId, amount, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.gameConfig.all });
    },
  });
}
