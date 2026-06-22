/**
 * useBonusZone
 *
 * React Query hooks for the Bonus Zone admin screen.
 * Wraps bonusZoneService for campaign CRUD, analytics, claims, and fraud alerts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bonusZoneService,
  type BonusCampaignAdmin,
  type BonusCampaignsQuery,
  type BonusCampaignsListResponse,
  type BonusCampaignStatus,
  type BonusCampaignAnalytics,
  type BonusCampaignClaimsResponse,
  type BonusCampaignClaim,
  type BonusCampaignClaimsQuery,
  type BonusZoneDashboard,
  type BonusFraudAlert,
} from '@/services/api/bonusZone';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';

// ─── Query hooks ───────────────────────────────────────────────────────────────

/** Paginated list of bonus campaigns with filters */
export function useBonusCampaigns(filters?: BonusCampaignsQuery) {
  return useQuery<BonusCampaignsListResponse, Error>({
    queryKey: queryKeys.bonusZone.campaigns(filters),
    queryFn: () => bonusZoneService.getCampaigns(filters ?? {}),
    ...queryConfig.adminList,
  });
}

/** Bonus Zone dashboard stats */
export function useBonusZoneDashboard() {
  return useQuery<BonusZoneDashboard, Error>({
    queryKey: queryKeys.bonusZone.dashboard(),
    queryFn: () => bonusZoneService.getDashboard(),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/** Analytics for a specific campaign */
export function useBonusCampaignAnalytics(campaignId: string) {
  return useQuery<BonusCampaignAnalytics, Error>({
    queryKey: queryKeys.bonusZone.campaignAnalytics(campaignId),
    queryFn: () => bonusZoneService.getCampaignAnalytics(campaignId),
    enabled: !!campaignId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/** Paginated claims for a specific campaign */
export function useBonusCampaignClaims(campaignId: string, filters?: BonusCampaignClaimsQuery) {
  return useQuery<BonusCampaignClaimsResponse, Error>({
    queryKey: queryKeys.bonusZone.campaignClaims(campaignId, filters),
    queryFn: () => bonusZoneService.getCampaignClaims(campaignId, filters ?? {}),
    enabled: !!campaignId,
    ...queryConfig.adminList,
  });
}

/** Fraud alerts across all bonus campaigns */
export function useBonusFraudAlerts(limit?: number) {
  return useQuery<BonusFraudAlert[], Error>({
    queryKey: queryKeys.bonusZone.fraudAlerts(limit),
    queryFn: () => bonusZoneService.getFraudAlerts(limit),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/** Create a new bonus campaign */
export function useCreateBonusCampaign() {
  const queryClient = useQueryClient();
  return useMutation<BonusCampaignAdmin, Error, Partial<BonusCampaignAdmin>>({
    mutationFn: (data) => bonusZoneService.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusZone.all });
    },
  });
}

/** Update an existing bonus campaign */
export function useUpdateBonusCampaign() {
  const queryClient = useQueryClient();
  return useMutation<
    BonusCampaignAdmin,
    Error,
    { id: string; data: Partial<BonusCampaignAdmin> }
  >({
    mutationFn: ({ id, data }) => bonusZoneService.updateCampaign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusZone.all });
    },
  });
}

/** Delete a bonus campaign (only draft/cancelled) */
export function useDeleteBonusCampaign() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => bonusZoneService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusZone.all });
    },
  });
}

/** Change campaign status */
export function useUpdateBonusCampaignStatus() {
  const queryClient = useQueryClient();
  return useMutation<BonusCampaignAdmin, Error, { id: string; status: BonusCampaignStatus }>({
    mutationFn: ({ id, status }) => bonusZoneService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusZone.all });
    },
  });
}

/** Fund a bonus campaign */
export function useFundBonusCampaign() {
  const queryClient = useQueryClient();
  return useMutation<BonusCampaignAdmin, Error, { id: string; amount: number }>({
    mutationFn: ({ id, amount }) => bonusZoneService.fundCampaign(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusZone.all });
    },
  });
}

/** Duplicate a bonus campaign */
export function useDuplicateBonusCampaign() {
  const queryClient = useQueryClient();
  return useMutation<BonusCampaignAdmin, Error, string>({
    mutationFn: (id) => bonusZoneService.duplicateCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusZone.all });
    },
  });
}

/** Reject a bonus claim */
export function useRejectBonusClaim() {
  const queryClient = useQueryClient();
  return useMutation<BonusCampaignClaim, Error, { claimId: string; reason: string }>({
    mutationFn: ({ claimId, reason }) => bonusZoneService.rejectClaim(claimId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusZone.all });
    },
  });
}

// Re-export the claim type so callers can import it from this module
export type { BonusCampaignClaim } from '@/services/api/bonusZone';
