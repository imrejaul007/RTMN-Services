/**
 * useCashStore — React Query data layer for the Cash Store (Vouchers, Coupons,
 * Double Cashback, Coin Drops) management screens.
 *
 * Provides list and detail queries for all four cash-store sub-domains.
 * All queries use cashStoreAdminService which throws on error (Pattern B).
 *
 * Usage:
 *   const { data } = useVoucherBrands({ page: 1, isActive: true });
 *   const { data } = useCoupons({ discountType: 'percentage' });
 *   const { data } = useDoubleCampaigns();
 *   const { data } = useCoinDrops({ isActive: true });
 */

import { useQuery } from '@tanstack/react-query';
import {
  cashStoreAdminService,
  type VoucherBrand,
  type AdminCoupon,
  type DoubleCashbackCampaign,
  type CoinDrop,
  type AdminStore,
  type AffiliateAnalytics,
} from '@/services/api/cashStore';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface VoucherBrandFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface CouponFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  discountType?: string;
  category?: string;
}

export interface DoubleCampaignFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CoinDropFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  category?: string;
}

// ── Voucher Brands ───────────────────────────────────────────────────────────

export function useVoucherBrands(filters: VoucherBrandFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.cashStore.voucherBrands(filters),
    queryFn: () => cashStoreAdminService.getVoucherBrands(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Coupons ─────────────────────────────────────────────────────────────────

export function useCoupons(filters: CouponFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.cashStore.coupons(filters),
    queryFn: () => cashStoreAdminService.getCoupons({ page: filters.page, limit: filters.limit, search: filters.search, isActive: filters.isActive, discountType: filters.discountType as "PERCENTAGE" | "FIXED" | undefined, category: filters.category }),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useCouponStores(search?: string) {
  return useQuery({
    queryKey: [...queryKeys.cashStore.all, 'couponStores', search ?? ''] as const,
    queryFn: () => cashStoreAdminService.getCouponStores(search),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Double Cashback Campaigns ─────────────────────────────────────────────────

export function useDoubleCampaigns(filters: DoubleCampaignFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.cashStore.doubleCampaigns(filters),
    queryFn: () => cashStoreAdminService.getDoubleCampaigns(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Coin Drops ───────────────────────────────────────────────────────────────

export function useCoinDrops(filters: CoinDropFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.cashStore.coinDrops(filters),
    queryFn: () => cashStoreAdminService.getCoinDrops(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useCoinDropStores(search?: string) {
  return useQuery({
    queryKey: [...queryKeys.cashStore.all, 'coinDropStores', search ?? ''] as const,
    queryFn: () => cashStoreAdminService.getCoinDropStores(search),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Affiliate Analytics ──────────────────────────────────────────────────────

export function useAffiliateAnalytics(brandId: string) {
  return useQuery({
    queryKey: [...queryKeys.cashStore.all, 'affiliateAnalytics', brandId] as const,
    queryFn: () => cashStoreAdminService.getAffiliateAnalytics(brandId),
    enabled: !!brandId,
  });
}
