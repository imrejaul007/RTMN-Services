import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { useAdminMutation } from './useMutations';

/**
 * Thin React Query mutation hooks for admin settings writes.
 *
 * Pattern mirrors `useOrderMutations` / `useMerchantMutations`:
 *   - wrap the apiClient method in `useAdminMutation` so thrown errors
 *     flow through React Query's `onError` callback and retry logic;
 *   - canonical invalidation lists pulled from `queryKeys` so dependent
 *     queries refetch after the write.
 *
 * NEW-A-M1 FIX: Previously, all mutations in admin-settings.tsx bypassed React Query
 * entirely — using raw `apiClient.patch/post` inside `useCallback(async () => {...})`.
 * This caused three problems:
 *   1. Errors thrown after the API call weren't caught by React Query's error boundary.
 *   2. No automatic retry on transient network failures.
 *   3. Loading state (`isPending`) was managed manually with separate state variables.
 *
 * Now all mutations use `useAdminMutation`, which wraps the service call in try/catch
 * so React Query handles errors and retries.
 */

// ── Platform Settings ──────────────────────────────────────────────────────────

export interface PlatformSettings {
  cashbackMultiplier: 1 | 2;
  maintenanceMode: boolean;
  maxCoinsPerDay: number;
}

export interface SavePlatformSettingsVars {
  cashbackMultiplier: 1 | 2;
  maintenanceMode: boolean;
  maxCoinsPerDay: number;
}

export interface SavePlatformSettingsResult {
  success: boolean;
  message?: string;
  data?: PlatformSettings;
}

export function useSavePlatformSettings() {
  return useAdminMutation<SavePlatformSettingsVars, SavePlatformSettingsResult>({
    mutationFn: (vars) => apiClient.patch<PlatformSettings>('admin/settings', vars as unknown as Record<string, unknown>),
    invalidateKeys: [queryKeys.dashboard.all, queryKeys.system.all],
  });
}

// ── Admin Users ───────────────────────────────────────────────────────────────

// Canonical: aligns with AdminUser from services/api/auth.ts (uses _id, MongoDB standard)
export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface AddAdminUserVars {
  email: string;
  role: string;
}

export interface AddAdminUserResult {
  success: boolean;
  message?: string;
  data?: AdminUser;
}

export function useAddAdminUser() {
  return useAdminMutation<AddAdminUserVars, AddAdminUserResult>({
    mutationFn: (vars) => apiClient.post<AdminUser>('admin/users', vars as unknown as Record<string, unknown>),
    // Invalidate dashboard/admin-users so the admin list refetches.
    // Using a custom key that dashboard/stats also touches so the
    // admin-count badge stays accurate.
    invalidateKeys: [[...queryKeys.dashboard.all]],
  });
}
