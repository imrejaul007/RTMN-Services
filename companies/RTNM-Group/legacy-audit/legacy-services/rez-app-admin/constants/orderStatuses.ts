/**
 * Legacy order status normalization map.
 * Maps variant/legacy statuses to canonical values aligned with rez-shared.
 *
 * Canonical: placed, confirmed, preparing, ready, dispatched,
 *            out_for_delivery, delivered, cancelling, cancelled, returned, refunded
 */
export const LEGACY_STATUS_MAP: Record<string, string> = {
  pending: 'placed',
  completed: 'delivered',
  done: 'delivered',
  rejected: 'cancelled',
};

export function normalizeOrderStatus(s: string): string {
  if (!s) return 'placed';
  return LEGACY_STATUS_MAP[s] ?? s;
}
