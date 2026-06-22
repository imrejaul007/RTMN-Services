/**
 * Canonical VoucherBrand type for the admin panel.
 *
 * A10-C2 FIX: This file resolves the three competing VoucherBrand definitions that
 * existed across vouchers.ts, cashStore.ts, and various UI components. Both services
 * now import from this canonical type instead of defining their own local copies.
 *
 * The fields cover all properties returned by the backend /admin/vouchers endpoint.
 * Any additions must be agreed upon across both voucher-management.tsx and cash-store.tsx
 * consumers before being added here.
 */

/** Brand information as returned by GET /admin/vouchers */
export interface VoucherBrand {
  _id: string;
  name: string;
  /** URL-safe slug derived from name */
  slug?: string;
  /** URL or data URI for the brand logo */
  logo: string;
  /** Hex colour for the brand card background */
  backgroundColor?: string;
  /** Hex colour for the logo foreground */
  logoColor?: string;
  description?: string;
  category: string;
  /** Percentage cashback (e.g. 5 = 5%) */
  cashbackRate: number;
  /** Available denomination values in rupees */
  denominations: number[];
  termsAndConditions: string[];
  /** REZ coin reward configuration (optional, used by cash-store) */
  rezCoinReward?: {
    coinsPerHundred?: number;
    maximumCoinsPerOrder?: number;
    minimumOrderAmount?: number;
  };
  rating?: number;
  reviewCount?: number;
  isActive: boolean;
  isFeatured: boolean;
  isNewlyAdded: boolean;
  purchaseCount?: number;
  viewCount?: number;
  /** Associated store (optional — present when brand is store-specific) */
  store?: {
    _id: string;
    name: string;
    logo: string;
  };
  createdAt: string;
  updatedAt: string;
}

/** Shape of the paginated list response from GET /admin/vouchers */
export interface VoucherBrandListResponse {
  vouchers: VoucherBrand[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
