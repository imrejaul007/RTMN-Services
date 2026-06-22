/**
 * useFlashSales — React Query data layer for the Flash Sales management screen.
 *
 * Provides list and detail queries for flash sale campaigns.
 * Uses flashSalesService which throws on error directly (Pattern B).
 *
 * Usage:
 *   const { data } = useFlashSalesList({ status: 'active', page: 1 });
 *   const { data: sale } = useFlashSale('sale-id-123');
 */

import { useQuery } from '@tanstack/react-query';
import { flashSalesService, type FlashSale } from '@/services/api/flashSales';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface FlashSaleFilters {
  page?: number;
  limit?: number;
  status?: string;
  enabled?: string;
  search?: string;
}

// ── List ─────────────────────────────────────────────────────────────────────

export function useFlashSalesList(filters: FlashSaleFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.flashSales.list(filters),
    queryFn: () => flashSalesService.getSales(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────

export function useFlashSale(id: string) {
  return useQuery({
    queryKey: queryKeys.flashSales.detail(id),
    queryFn: () => flashSalesService.getSale(id),
    enabled: !!id,
  });
}
