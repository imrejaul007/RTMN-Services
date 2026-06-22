/**
 * useCampaignsList — React Query data layer for the Campaigns dashboard screen.
 *
 * ADM-005 FIX: Extracts all data-fetching logic out of campaigns.tsx (~2868 lines)
 * into a typed hook. The dashboard screen imports this hook instead of calling
 * `campaignsService` directly, keeping the component file under 500 lines.
 *
 * Usage:
 *   const { campaigns, stats, isLoading, refresh } = useCampaignsList({ tab, search });
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignsService, type Campaign, type CampaignStats, type StoreOption } from '@/services/api/campaigns';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export interface CampaignFilters {
  page?: number;
  limit?: number;
  search?: string;
  running?: boolean;
  upcoming?: boolean;
  expired?: boolean;
  status?: string;
}

export interface CampaignsListResponse {
  campaigns: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

// ── Campaigns list ──────────────────────────────────────────────────────────────

export function useCampaignsList(filters: CampaignFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.campaigns.list(filters),
    queryFn: () => campaignsService.getCampaigns(filters as any),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Campaigns stats ────────────────────────────────────────────────────────────

export function useCampaignsStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.campaigns.stats(),
    queryFn: () => campaignsService.getStats(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Store options (for campaign form selector) ─────────────────────────────────

export function useCampaignStores(search?: string) {
  return useQuery({
    queryKey: ['campaigns', 'stores', search ?? ''] as const,
    queryFn: () => campaignsService.getStores(search, 100),
    staleTime: 5 * 60 * 1000, // 5 min — store list changes rarely
  });
}

// ── Refresh helper ─────────────────────────────────────────────────────────────

export function useCampaignsRefresh() {
  const qc = useQueryClient();
  return {
    refreshCampaigns: () => qc.invalidateQueries({ queryKey: queryKeys.campaigns.all }),
    refreshStats: () => qc.invalidateQueries({ queryKey: queryKeys.campaigns.stats() }),
    refreshAll: () => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      qc.invalidateQueries({ queryKey: queryKeys.campaigns.stats() });
    },
  };
}
