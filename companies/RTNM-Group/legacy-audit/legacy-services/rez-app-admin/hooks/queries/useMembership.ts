/**
 * useMembership — React Query data layer for the Membership admin module.
 *
 * Provides typed hooks for listing subscription tier plans, viewing subscriber
 * details, and understanding subscription distribution.
 *
 * Usage:
 *   const { plans } = useMembershipPlans();
 *   const { plans: activePlans } = useMembershipPlans(true);
 *   const { subscribers } = useSubscribersList({ tier: 'gold', status: 'active', page: 1 });
 */
import { useQuery } from '@tanstack/react-query';
import { membershipAdminService } from '@/services/api/membership';
import type {
  SubscriptionTierConfig,
  SubscribersResponse,
} from '@/services/api/membership';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscribersFilters {
  tier?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ── Subscription plans ─────────────────────────────────────────────────────────

export function useMembershipPlans(isActive?: boolean) {
  const { user } = useAuth();
  return useQuery<SubscriptionTierConfig[]>({
    queryKey: [...queryKeys.membership.plans(), isActive !== undefined ? String(isActive) : ''] as const,
    queryFn: () => membershipAdminService.listPlans(isActive),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Subscribers list ───────────────────────────────────────────────────────────

export function useSubscribersList(filters: SubscribersFilters = {}) {
  const { user } = useAuth();
  return useQuery<SubscribersResponse>({
    queryKey: queryKeys.membership.subscribers(filters),
    queryFn: () => membershipAdminService.getSubscribers(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}
