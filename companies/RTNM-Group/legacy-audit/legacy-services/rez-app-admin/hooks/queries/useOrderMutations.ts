import { ordersService } from '@/services/api/orders';
import { queryKeys } from './queryKeys';
import { useAdminMutation } from './useMutations';

/**
 * Thin React Query mutation hooks for admin order writes.
 *
 * Pattern mirrors `useWalletMutations`:
 *   - wrap the `ordersService` method in `useAdminMutation` so thrown errors
 *     flow through React Query's `onError`;
 *   - canonical invalidation lists pulled from `queryKeys` so dependent lists
 *     and detail queries refetch after the write.
 *
 * Call-sites pass a stable `idempotencyKey` (generated once per refund session
 * via `useRef` + `crypto.randomUUID()`) so that React Query retries or an
 * accidental double-tap collapse to a single server-side effect.
 */

// ── updateOrderStatus ───────────────────────────────────────────────────────

export interface UpdateOrderStatusVars {
  orderId: string;
  status: string;
  notes?: string;
}

export interface UpdateOrderStatusResult {
  success: boolean;
  message: string;
}

export function useUpdateOrderStatus() {
  return useAdminMutation<UpdateOrderStatusVars, UpdateOrderStatusResult>({
    mutationFn: ({ orderId, status, notes }) =>
      ordersService.updateOrderStatus(orderId, status, notes),
    invalidateKeys: [queryKeys.orders.all],
    onSuccess: () => {
      // orderId-specific detail invalidation handled by consumer if it has a
      // cached detail query open; invalidating the whole orders namespace
      // already covers list + detail + stats.
    },
  });
}

// ── refundOrder ─────────────────────────────────────────────────────────────

export interface RefundOrderVars {
  orderId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}

export interface RefundOrderResult {
  success: boolean;
  message: string;
  refundAmount?: number;
}

export function useRefundOrder() {
  return useAdminMutation<RefundOrderVars, RefundOrderResult>({
    mutationFn: ({ orderId, amount, reason, idempotencyKey }) => {
      if (!idempotencyKey) {
        // Fail fast — generating a throwaway key here would defeat dedup.
        throw new Error('idempotencyKey is required for useRefundOrder');
      }
      return ordersService.refundOrder(orderId, amount, reason, idempotencyKey);
    },
    invalidateKeys: [queryKeys.orders.all, queryKeys.disputes.all],
  });
}

// ── cancelOrder ─────────────────────────────────────────────────────────────

export interface CancelOrderVars {
  orderId: string;
  reason: string;
}

export interface CancelOrderResult {
  success: boolean;
  message: string;
}

export function useCancelOrder() {
  return useAdminMutation<CancelOrderVars, CancelOrderResult>({
    mutationFn: ({ orderId, reason }) => ordersService.cancelOrder(orderId, reason),
    invalidateKeys: [queryKeys.orders.all],
  });
}
