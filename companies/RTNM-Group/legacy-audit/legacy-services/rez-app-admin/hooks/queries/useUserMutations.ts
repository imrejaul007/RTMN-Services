import { usersService } from '@/services/api/users';
import { queryKeys } from './queryKeys';
import { useAdminMutation } from './useMutations';

/**
 * Thin React Query mutation hooks for admin user writes.
 *
 * Pattern mirrors `useMerchantMutations` / `useOrderMutations`:
 *   - wrap the `usersService` method in `useAdminMutation` so thrown errors
 *     flow through React Query's `onError`;
 *   - canonical invalidation lists pulled from `queryKeys` so user lists and
 *     detail queries refetch after the write.
 *
 * Notes on naming:
 *   The admin backend exposes `suspend` / `unsuspend` endpoints rather than
 *   `ban` / `unban`. The hook names below follow the service method names so
 *   call-sites don't have to guess which verb the backend speaks.
 *
 *   `forceLogoutUser` is intentionally omitted — the backend does not expose
 *   a corresponding endpoint in `usersService` at the moment, so there is
 *   nothing to wrap. When that lands, a matching hook can be added here and
 *   should invalidate `queryKeys.users.all` plus any future sessions key.
 */

// ── suspendUser ─────────────────────────────────────────────────────────────

export interface SuspendUserVars {
  userId: string;
  reason?: string;
}

export interface SuspendUserResult {
  success: boolean;
  message: string;
}

export function useSuspendUser() {
  return useAdminMutation<SuspendUserVars, SuspendUserResult>({
    mutationFn: ({ userId, reason }) => usersService.suspendUser(userId, reason),
    invalidateKeys: [queryKeys.users.all],
  });
}

// ── unsuspendUser ───────────────────────────────────────────────────────────

export interface UnsuspendUserVars {
  userId: string;
}

export interface UnsuspendUserResult {
  success: boolean;
  message: string;
}

export function useUnsuspendUser() {
  return useAdminMutation<UnsuspendUserVars, UnsuspendUserResult>({
    mutationFn: ({ userId }) => usersService.unsuspendUser(userId),
    invalidateKeys: [queryKeys.users.all],
  });
}

// ── resetStreak ─────────────────────────────────────────────────────────────

export interface ResetStreakVars {
  userId: string;
}

export function useResetStreak() {
  return useAdminMutation<ResetStreakVars, void>({
    mutationFn: ({ userId }) => usersService.resetStreak(userId),
    invalidateKeys: [queryKeys.users.all],
  });
}
