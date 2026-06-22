import { merchantsService } from '@/services/api/merchants';
import { queryKeys } from './queryKeys';
import { useAdminMutation } from './useMutations';

/**
 * Thin React Query mutation hooks for admin merchant writes.
 *
 * Pattern mirrors `useOrderMutations` / `useWalletMutations`:
 *   - wrap the `merchantsService` method in `useAdminMutation` so thrown errors
 *     flow through React Query's `onError`;
 *   - canonical invalidation lists pulled from `queryKeys` so merchant lists
 *     and detail queries refetch after the write.
 *
 * None of the underlying merchants endpoints currently accept an idempotency
 * header, so these hooks deliberately omit the idempotency plumbing used in
 * wallet/order mutations. If the backend gains support, threading it through
 * via a `useRef` + `crypto.randomUUID()` pattern at the call-site is the
 * expected extension path.
 */

// ── approveMerchant ─────────────────────────────────────────────────────────

export interface ApproveMerchantVars {
  merchantId: string;
}

export interface ApproveMerchantResult {
  success: boolean;
  message: string;
}

export function useApproveMerchant() {
  return useAdminMutation<ApproveMerchantVars, ApproveMerchantResult>({
    mutationFn: ({ merchantId }) => merchantsService.approveMerchant(merchantId),
    invalidateKeys: [queryKeys.merchants.all],
  });
}

// ── rejectMerchant ─────────────────────────────────────────────────────────

export interface RejectMerchantVars {
  merchantId: string;
  reason: string;
}

export interface RejectMerchantResult {
  success: boolean;
  message: string;
}

export function useRejectMerchant() {
  return useAdminMutation<RejectMerchantVars, RejectMerchantResult>({
    mutationFn: ({ merchantId, reason }) =>
      merchantsService.rejectMerchant(merchantId, reason),
    invalidateKeys: [queryKeys.merchants.all],
  });
}

// ── suspendMerchant ─────────────────────────────────────────────────────────

export interface SuspendMerchantVars {
  merchantId: string;
  reason: string;
}

export interface SuspendMerchantResult {
  success: boolean;
  message: string;
}

export function useSuspendMerchant() {
  return useAdminMutation<SuspendMerchantVars, SuspendMerchantResult>({
    mutationFn: ({ merchantId, reason }) =>
      merchantsService.suspendMerchant(merchantId, reason),
    invalidateKeys: [queryKeys.merchants.all],
  });
}

// ── reactivateMerchant ──────────────────────────────────────────────────────

export interface ReactivateMerchantVars {
  merchantId: string;
}

export interface ReactivateMerchantResult {
  success: boolean;
  message: string;
}

export function useReactivateMerchant() {
  return useAdminMutation<ReactivateMerchantVars, ReactivateMerchantResult>({
    mutationFn: ({ merchantId }) => merchantsService.reactivateMerchant(merchantId),
    invalidateKeys: [queryKeys.merchants.all],
  });
}

// ── toggleStoreProgram ──────────────────────────────────────────────────────

export interface ToggleStoreProgramVars {
  storeId: string;
  isProgramMerchant: boolean;
  baseCashbackPercent: number;
}

export interface ToggleStoreProgramResult {
  success: boolean;
  message: string;
}

export function useToggleStoreProgram() {
  return useAdminMutation<ToggleStoreProgramVars, ToggleStoreProgramResult>({
    mutationFn: ({ storeId, isProgramMerchant, baseCashbackPercent }) =>
      merchantsService.toggleStoreProgram(storeId, isProgramMerchant, baseCashbackPercent),
    invalidateKeys: [queryKeys.merchants.all],
  });
}

// ── updateStoreSettings ─────────────────────────────────────────────────────

export interface UpdateStoreSettingsVars {
  storeId: string;
  settings: { estimatedPrepMinutes?: number };
}

export interface UpdateStoreSettingsResult {
  success: boolean;
  message: string;
}

export function useUpdateStoreSettings() {
  return useAdminMutation<UpdateStoreSettingsVars, UpdateStoreSettingsResult>({
    mutationFn: ({ storeId, settings }) =>
      merchantsService.updateStoreSettings(storeId, settings),
    invalidateKeys: [queryKeys.merchants.all],
  });
}

// ── createMerchant ──────────────────────────────────────────────────────────

export interface CreateMerchantVars {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType?: string;
}

export interface CreateMerchantResult {
  merchant: unknown;
  tempPassword: string;
}

export function useCreateMerchant() {
  return useAdminMutation<CreateMerchantVars, CreateMerchantResult>({
    mutationFn: ({ name, email, phone, businessName, businessType }) =>
      merchantsService.createMerchant({ name, email, phone, businessName, businessType }),
    invalidateKeys: [queryKeys.merchants.all],
  });
}
