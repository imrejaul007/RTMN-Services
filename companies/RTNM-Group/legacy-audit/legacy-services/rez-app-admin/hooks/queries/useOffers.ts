/**
 * useOffers — React Query data layer for the Offers management screen.
 *
 * Provides list, detail, stats, and pending-approval queries for offers.
 * All queries use the offersService which throws on error (Pattern B).
 *
 * Usage:
 *   const { data, isLoading } = useOffersList({ page: 1, limit: 20, isActive: 'true' });
 *   const { data: stats } = useOfferStats();
 *   const { data: pending } = usePendingOffers();
 */

import { useQuery } from '@tanstack/react-query';
import { offersService, type Offer, type Store, type OfferStats } from '@/services/api/offers';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface OfferFilters {
  page?: number;
  limit?: number;
  exclusiveZone?: string;
  category?: string;
  type?: string;
  isActive?: string;
  search?: string;
}

export interface PendingOffersFilters {
  page?: number;
  limit?: number;
}

// ── List ─────────────────────────────────────────────────────────────────────

export function useOffersList(filters: OfferFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.offers.list(filters),
    queryFn: () => offersService.getOffers(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────

export function useOffer(id: string) {
  return useQuery({
    queryKey: queryKeys.offers.detail(id),
    queryFn: () => offersService.getOffer(id),
    enabled: !!id,
  });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function useOfferStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.offers.stats(),
    queryFn: () => offersService.getStats(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Pending approval ─────────────────────────────────────────────────────────

export function usePendingOffers(filters: PendingOffersFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.offers.pending(filters),
    queryFn: () => offersService.getPendingOffers(filters.page, filters.limit),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Store options (for offer form) ───────────────────────────────────────────

export function useOfferStores() {
  return useQuery({
    queryKey: [...queryKeys.offers.all, 'stores'] as const,
    queryFn: () => offersService.getStores(),
    staleTime: 5 * 60 * 1000,
  });
}
