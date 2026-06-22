/**
 * useBankOffers — React Query data layer for the Bank Offers admin module.
 *
 * Provides typed hooks for listing, viewing, and managing bank offer records.
 *
 * Usage:
 *   const { offers, isLoading } = useBankOffersList({ page: 1, limit: 20, status: 'active' });
 *   const { offer } = useBankOffer('offerId123');
 */
import { useQuery } from '@tanstack/react-query';
import { bankOffersService } from '@/services/api/bankOffers';
import type { BankOffer } from '@/services/api/bankOffers';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export interface BankOffersFilters {
  page?: number;
  limit?: number;
  status?: string;
  bankName?: string;
  cardType?: string;
  search?: string;
}

// ── Bank offers list ───────────────────────────────────────────────────────────

export function useBankOffersList(filters: BankOffersFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.bankOffers.list(filters),
    queryFn: () => bankOffersService.getOffers(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Single bank offer ──────────────────────────────────────────────────────────

export function useBankOffer(id: string) {
  const { user } = useAuth();
  return useQuery<BankOffer>({
    queryKey: queryKeys.bankOffers.detail(id),
    queryFn: () => bankOffersService.getOffer(id).then((res) => res as unknown as BankOffer),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}
