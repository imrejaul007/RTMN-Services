import { voucherAdminService } from '@/services/api/vouchers';
import type { VoucherBrand } from '@/services/api/vouchers';
import { queryKeys } from './queryKeys';
import { useAdminMutation } from './useMutations';

/**
 * Thin React Query mutation hooks for admin voucher (VoucherBrand) writes.
 *
 * Pattern mirrors `useMerchantMutations` / `useOrderMutations`:
 *   - wrap the `voucherAdminService` method in `useAdminMutation` so thrown
 *     errors flow through React Query's `onError`;
 *   - canonical invalidation lists pulled from `queryKeys.vouchers` so
 *     voucher lists and detail queries refetch after the write.
 *
 * The service layer returns `VoucherBrand | null` / `boolean` rather than
 * throwing on API failure, so these hooks propagate the raw service result.
 * Call-sites should check the result (e.g. `null` / `false`) to know whether
 * the operation actually succeeded and surface UI errors appropriately.
 *
 * `cashStore.ts` and `extraRewards.ts` overlap with this namespace. Those
 * admin pages can reuse these hooks since they hit the same endpoints.
 */

// Mirror the private VoucherCreateData shape from services/api/vouchers.ts.
// Kept local because the service does not export it; if it becomes exported
// upstream, swap this for the imported type.
export interface VoucherCreateVars {
  name: string;
  logo: string;
  backgroundColor: string;
  logoColor: string;
  description: string;
  cashbackRate: number;
  category: string;
  denominations: number[];
  termsAndConditions: string[];
  isFeatured?: boolean;
  isNewlyAdded?: boolean;
  store?: string;
}

// ── createVoucher ───────────────────────────────────────────────────────────

export function useCreateVoucher() {
  return useAdminMutation<VoucherCreateVars, VoucherBrand | null>({
    mutationFn: (data) => voucherAdminService.create(data),
    invalidateKeys: [queryKeys.vouchers.all],
  });
}

// ── updateVoucher ───────────────────────────────────────────────────────────

export interface UpdateVoucherVars {
  id: string;
  data: Partial<VoucherCreateVars>;
}

export function useUpdateVoucher() {
  return useAdminMutation<UpdateVoucherVars, VoucherBrand | null>({
    mutationFn: ({ id, data }) => voucherAdminService.update(id, data),
    // Invalidate both the detail for the specific voucher and the list
    // namespace so lists and any open detail page refetch.
    invalidateKeys: [queryKeys.vouchers.all],
  });
}

// ── deleteVoucher ───────────────────────────────────────────────────────────

export interface DeleteVoucherVars {
  id: string;
}

export function useDeleteVoucher() {
  return useAdminMutation<DeleteVoucherVars, boolean>({
    mutationFn: ({ id }) => voucherAdminService.delete(id),
    invalidateKeys: [queryKeys.vouchers.all],
  });
}

// ── toggleVoucher ───────────────────────────────────────────────────────────

export interface ToggleVoucherVars {
  id: string;
}

export function useToggleVoucher() {
  return useAdminMutation<ToggleVoucherVars, boolean>({
    mutationFn: ({ id }) => voucherAdminService.toggleActive(id),
    invalidateKeys: [queryKeys.vouchers.all],
  });
}
