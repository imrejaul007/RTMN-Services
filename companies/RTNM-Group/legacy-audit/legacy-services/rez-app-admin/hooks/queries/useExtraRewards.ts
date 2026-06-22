/**
 * useExtraRewards — React Query data layer for the Extra Rewards admin module.
 *
 * Covers Double Cashback Campaigns and Coin Drops. Supports listing, detail view,
 * and CRUD operations for both campaign types.
 *
 * Usage:
 *   const { campaigns } = useDoubleCampaignsList({ page: 1, limit: 20, status: 'active' });
 *   const { coinDrops } = useCoinDropsList({ category: 'food', running: 'true' });
 *   const { stores } = useExtraRewardsStores('search term');
 */
import { useQuery } from '@tanstack/react-query';
import { extraRewardsService } from '@/services/api/extraRewards';
import type {
  DoubleCashbackCampaign,
  CoinDrop,
  StoreOption,
  DoubleCampaignsFilter,
  CoinDropsFilter,
  DoubleCampaignsListResponse,
  CoinDropsListResponse,
} from '@/services/api/extraRewards';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export type {
  DoubleCampaignsFilter,
  CoinDropsFilter,
  DoubleCampaignsListResponse,
  CoinDropsListResponse,
};

// ── Double Cashback Campaigns ───────────────────────────────────────────────────

export function useDoubleCampaignsList(filters: DoubleCampaignsFilter = {}) {
  const { user } = useAuth();
  return useQuery<DoubleCampaignsListResponse>({
    queryKey: queryKeys.extraRewards.campaigns(filters),
    queryFn: () => extraRewardsService.getCampaigns(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useDoubleCampaign(id: string) {
  const { user } = useAuth();
  return useQuery<DoubleCashbackCampaign>({
    queryKey: [...queryKeys.extraRewards.campaigns(), 'detail', id] as const,
    queryFn: () => extraRewardsService.getCampaign(id),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}

// ── Coin Drops ─────────────────────────────────────────────────────────────────

export function useCoinDropsList(filters: CoinDropsFilter = {}) {
  const { user } = useAuth();
  return useQuery<CoinDropsListResponse>({
    queryKey: queryKeys.extraRewards.coinDrops(filters),
    queryFn: () => extraRewardsService.getCoinDrops(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useCoinDrop(id: string) {
  const { user } = useAuth();
  return useQuery<CoinDrop>({
    queryKey: [...queryKeys.extraRewards.coinDrops(), 'detail', id] as const,
    queryFn: () => extraRewardsService.getCoinDrop(id),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}

export function useExtraRewardsStores(search?: string) {
  return useQuery<StoreOption[]>({
    queryKey: [...queryKeys.extraRewards.coinDrops(), 'stores', search ?? ''] as const,
    queryFn: () => extraRewardsService.getCoinDropStores(search),
    staleTime: 5 * 60 * 1000,
  });
}
