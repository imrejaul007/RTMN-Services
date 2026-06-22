/**
 * useSocialImpactMutations — React Query mutation hooks for the Social Impact
 * admin screen. All hooks use socialImpactService which returns `{ success, data }`
 * (Pattern B) — we throw in mutationFn when `success` is false so React Query's
 * onError fires and cache invalidation runs.
 */
import { socialImpactService } from '@/services/api/socialImpact';
import { queryKeys } from './queryKeys';
import { useAdminMutation } from './useMutations';

// ── Event Mutations ─────────────────────────────────────────────────────────────

export type CreateEventVars = Record<string, unknown>;

export function useCreateEvent() {
  return useAdminMutation<CreateEventVars, unknown>({
    mutationFn: async (data) => {
      const res = await socialImpactService.createEvent(data as any);
      if (!res.success) throw new Error(res.message || 'Failed to create event');
      return res;
    },
    invalidateKeys: [[...queryKeys.socialImpact.all]],
  });
}

export interface UpdateEventVars {
  id: string;
  data: Record<string, unknown>;
}

export function useUpdateEvent() {
  return useAdminMutation<UpdateEventVars, unknown>({
    mutationFn: async ({ id, data }) => {
      const res = await socialImpactService.updateEvent(id, data as any);
      if (!res.success) throw new Error(res.message || 'Failed to update event');
      return res;
    },
    invalidateKeys: [[...queryKeys.socialImpact.all]],
  });
}

export function useApproveEvent() {
  return useAdminMutation<string, unknown>({
    mutationFn: async (id) => {
      const res = await socialImpactService.approveEvent(id);
      if (!res.success) throw new Error(res.message || 'Failed to approve event');
      return res;
    },
    invalidateKeys: [[...queryKeys.socialImpact.all]],
  });
}

export function useRejectEvent() {
  return useAdminMutation<{ id: string; reason?: string }, unknown>({
    mutationFn: async ({ id, reason }) => {
      const res = await socialImpactService.rejectEvent(id, reason);
      if (!res.success) throw new Error(res.message || 'Failed to reject event');
      return res;
    },
    invalidateKeys: [[...queryKeys.socialImpact.all]],
  });
}

// ── Participant Mutations ───────────────────────────────────────────────────────

export function useCheckInParticipant() {
  return useAdminMutation<{ eventId: string; userId: string }, unknown>({
    mutationFn: async ({ eventId, userId }) => {
      const res = await socialImpactService.checkInParticipant(eventId, userId);
      if (!res.success) throw new Error(res.message || 'Failed to check in participant');
      return res;
    },
    invalidateKeys: [[...queryKeys.socialImpact.all]],
  });
}

export function useCompleteParticipant() {
  return useAdminMutation<{ eventId: string; userId: string }, unknown>({
    mutationFn: async ({ eventId, userId }) => {
      const res = await socialImpactService.completeParticipant(eventId, userId);
      if (!res.success) throw new Error(res.message || 'Failed to complete participant');
      return res;
    },
    invalidateKeys: [[...queryKeys.socialImpact.all]],
  });
}

export function useGenerateOTP() {
  return useAdminMutation<{ eventId: string; userId: string }, { otpCode: string }>({
    mutationFn: async ({ eventId, userId }) => {
      const res = await socialImpactService.generateOTP(eventId, userId);
      if (!res.success) throw new Error(res.message || 'Failed to generate OTP');
      return (res as unknown as { otpCode: string }).otpCode as unknown as { otpCode: string };
    },
    invalidateKeys: [],
  });
}

export function useBulkComplete() {
  return useAdminMutation<{ eventId: string; userIds: string[] }, unknown>({
    mutationFn: async ({ eventId, userIds }) => {
      const res = await socialImpactService.bulkComplete(eventId, userIds);
      if (!res.success) throw new Error(res.message || 'Failed to bulk complete');
      return res;
    },
    invalidateKeys: [[...queryKeys.socialImpact.all]],
  });
}
