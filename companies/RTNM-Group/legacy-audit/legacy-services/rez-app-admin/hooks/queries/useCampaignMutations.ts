import { campaignsService, type CampaignRequest, type Campaign } from '@/services/api/campaigns';
import { queryKeys } from './queryKeys';
import { useAdminMutation } from './useMutations';

/**
 * Thin React Query mutation hooks for admin campaign writes.
 *
 * Pattern mirrors `useMerchantMutations` / `useOrderMutations`:
 *   - wrap the `campaignsService` method in `useAdminMutation` so thrown
 *     errors flow through React Query's `onError`;
 *   - canonical invalidation lists pulled from `queryKeys.campaigns` so
 *     lists, detail, and stats queries refetch after the write.
 *
 * Invalidating `queryKeys.campaigns.all` covers the list + detail + stats
 * namespaces because every nested key spreads from `campaigns.all`.
 */

// ── createCampaign ──────────────────────────────────────────────────────────

export type CreateCampaignVars = CampaignRequest;

export function useCreateCampaign() {
  return useAdminMutation<CreateCampaignVars, Campaign>({
    mutationFn: (data) => campaignsService.createCampaign(data),
    invalidateKeys: [queryKeys.campaigns.all],
  });
}

// ── updateCampaign ──────────────────────────────────────────────────────────

export interface UpdateCampaignVars {
  id: string;
  data: Partial<CampaignRequest>;
}

export function useUpdateCampaign() {
  return useAdminMutation<UpdateCampaignVars, Campaign>({
    mutationFn: ({ id, data }) => campaignsService.updateCampaign(id, data),
    // Invalidating the whole campaigns namespace covers list + detail + stats.
    invalidateKeys: [queryKeys.campaigns.all],
  });
}

// ── toggleCampaignStatus ────────────────────────────────────────────────────

export interface ToggleCampaignStatusVars {
  id: string;
}

export interface ToggleCampaignStatusResult {
  isActive: boolean;
}

export function useToggleCampaignStatus() {
  return useAdminMutation<ToggleCampaignStatusVars, ToggleCampaignStatusResult>({
    mutationFn: ({ id }) => campaignsService.toggleCampaign(id),
    invalidateKeys: [queryKeys.campaigns.all],
  });
}

// ── deleteCampaign ─────────────────────────────────────────────────────────

export interface DeleteCampaignVars {
  id: string;
}

export function useDeleteCampaign() {
  return useAdminMutation<DeleteCampaignVars, void>({
    mutationFn: ({ id }) => campaignsService.deleteCampaign(id),
    invalidateKeys: [queryKeys.campaigns.all],
  });
}

// ── duplicateCampaign ──────────────────────────────────────────────────────

export interface DuplicateCampaignVars {
  id: string;
}

export function useDuplicateCampaign() {
  return useAdminMutation<DuplicateCampaignVars, Campaign>({
    mutationFn: ({ id }) => campaignsService.duplicateCampaign(id),
    invalidateKeys: [queryKeys.campaigns.all],
  });
}

// ── addDeal ────────────────────────────────────────────────────────────────

export interface AddDealVars {
  campaignId: string;
  deal: { image: string; store?: string; storeId?: string };
}

export function useAddDeal() {
  return useAdminMutation<AddDealVars, Campaign>({
    mutationFn: ({ campaignId, deal }) => campaignsService.addDeal(campaignId, deal as any),
    invalidateKeys: [queryKeys.campaigns.all],
  });
}

// ── removeDeal ─────────────────────────────────────────────────────────────

export interface RemoveDealVars {
  campaignId: string;
  dealIndex: number;
}

export function useRemoveDeal() {
  return useAdminMutation<RemoveDealVars, Campaign>({
    mutationFn: ({ campaignId, dealIndex }) =>
      campaignsService.removeDeal(campaignId, dealIndex),
    invalidateKeys: [queryKeys.campaigns.all],
  });
}
