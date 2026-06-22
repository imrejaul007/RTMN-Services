/**
 * Canonical API response types for all REZ apps.
 * Inlined from rez-shared — avoids cross-repo relative path dependency.
 */

// ── Pagination ──────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// ── API Response ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
  pagination?: Pagination;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: {
    items: T[];
    pagination: Pagination;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
  statusCode?: number;
  timestamp?: string;
}

export function getItems<T>(response: PaginatedResponse<T> | ApiResponse<T[]>): T[] {
  if ('data' in response && response.data) {
    if (typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>;
      if ('items' in data && Array.isArray(data.items)) {
        return data.items as T[];
      }
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
  }
  return [];
}

export function getPagination(response: PaginatedResponse<unknown> | ApiResponse<unknown>): Pagination | null {
  if ('data' in response && response.data && typeof response.data === 'object') {
    const data = response.data as Record<string, unknown>;
    if ('pagination' in data && data.pagination != null) {
      return data.pagination as Pagination;
    }
  }
  if ('pagination' in response && response.pagination) {
    return response.pagination;
  }
  return null;
}

// ── Coin types ─────────────────────────────────────────────────────────────

export const COIN_TYPES = {
  PROMO:    'promo'    as const,
  BRANDED:  'branded'  as const,
  PRIVE:    'prive'    as const,
  CASHBACK: 'cashback' as const,
  REFERRAL: 'referral' as const,
  REZ:      'rez'      as const,
} as const;

export type CoinType = typeof COIN_TYPES[keyof typeof COIN_TYPES];

const LEGACY_COIN_TYPE_MAP: Record<string, CoinType> = {
  nuqta:    'rez',
  rez:      'rez',
  prive:    'prive',
  branded:  'branded',
  promo:    'promo',
  cashback: 'cashback',
  referral: 'referral',
};

export function normalizeCoinType(type: string): CoinType {
  return (LEGACY_COIN_TYPE_MAP[type] ?? 'rez') as CoinType;
}

// ── Wallet types ────────────────────────────────────────────────────────────

export interface WalletBalance {
  rez:      number;
  prive:    number;
  promo:    number;
  branded:  number;
  cashback: number;
  total:    number;
}

export interface CoinTransaction {
  _id:         string;
  coinType:    CoinType;
  amount:      number;
  type:        'earned' | 'spent' | 'expired' | 'refunded' | 'bonus' | 'branded_award';
  description: string;
  createdAt:   string;
}

// ── Status normalizers ──────────────────────────────────────────────────────
//
// NOTE: A previous `PAYMENT_STATUS_MAP` / `normalizePaymentStatus()` pair used to
// live here, mapping canonical values like 'completed' back to the legacy 'paid'.
// That defeated the canonical contract (SOURCE-OF-TRUTH/DATA-TYPES.md) and
// silently dropped refund states. Both have been removed; admin now passes
// canonical PaymentStatus values through unchanged.

const ORDER_STATUS_MAP: Record<string, string> = {
  pending: 'placed',
  new: 'placed',
  complete: 'delivered',
  completed: 'delivered',
  shipping: 'dispatched',
  shipped: 'dispatched',
  in_transit: 'out_for_delivery',
  canceled: 'cancelled',
};

export function normalizeOrderStatus(status: string): string {
  return ORDER_STATUS_MAP[status] ?? status;
}
