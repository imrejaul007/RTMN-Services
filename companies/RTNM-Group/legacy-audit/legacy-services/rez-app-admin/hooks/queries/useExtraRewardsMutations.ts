/**
 * useExtraRewardsMutations — React Query mutation hooks for the Extra Rewards module.
 * Wraps extraRewardsService methods that throw on error directly (Pattern B).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { extraRewardsService } from '@/services/api/extraRewards';
import type { CreateDoubleCampaignRequest, CreateCoinDropRequest } from '@/services/api/extraRewards';
import { queryKeys } from './queryKeys';

// ── Double Cashback Campaign Mutations ──────────────────────────────────────────

interface SaveCampaignVars {
  id?: string;
  data: CreateDoubleCampaignRequest;
}

export function useSaveCampaign() {
  return useMutation({
    mutationFn: async ({ id, data }: SaveCampaignVars) => {
      if (id) return extraRewardsService.updateCampaign(id, data);
      return extraRewardsService.createCampaign(data);
    },
    onSuccess: () => {
      // Invalidate campaigns list to refetch after create/update
    },
  });
}

export function useToggleCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => extraRewardsService.toggleCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.extraRewards.campaigns() });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => extraRewardsService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.extraRewards.campaigns() });
    },
  });
}

// ── Coin Drop Mutations ──────────────────────────────────────────────────────────

interface SaveCoinDropVars {
  id?: string;
  data: CreateCoinDropRequest;
}

export function useSaveCoinDrop() {
  return useMutation({
    mutationFn: async ({ id, data }: SaveCoinDropVars) => {
      if (id) return extraRewardsService.updateCoinDrop(id, data);
      return extraRewardsService.createCoinDrop(data);
    },
    onSuccess: () => {
      // Invalidate coin drops list to refetch after create/update
    },
  });
}

export function useToggleCoinDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => extraRewardsService.toggleCoinDrop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.extraRewards.coinDrops() });
    },
  });
}

export function useDeleteCoinDrop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => extraRewardsService.deleteCoinDrop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.extraRewards.coinDrops() });
    },
  });
}
