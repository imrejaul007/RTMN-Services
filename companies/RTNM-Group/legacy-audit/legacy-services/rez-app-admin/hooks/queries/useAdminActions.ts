/**
 * useAdminActions — React Query data layer for the Admin Actions (maker-checker) module.
 *
 * Covers the pending-approval action queue and the full action history log.
 * Actions requiring approval (e.g., wallet adjustments exceeding the threshold)
 * land here before being executed.
 *
 * Usage:
 *   const { actions } = usePendingActions({ page: 1, limit: 20 });
 *   const { actions: history } = useActionHistory({ page: 1, limit: 20, status: 'executed' });
 *   const { threshold } = useApprovalThreshold();
 */
import { useQuery } from '@tanstack/react-query';
import { adminActionsService } from '@/services/api/adminActions';
import type {
  AdminActionItem,
  AdminActionType,
  AdminActionStatus,
} from '@/services/api/adminActions';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export type { AdminActionType, AdminActionStatus };

export interface PendingActionsFilters {
  page?: number;
  limit?: number;
  actionType?: AdminActionType;
}

export interface ActionHistoryFilters {
  page?: number;
  limit?: number;
  status?: AdminActionStatus;
  actionType?: AdminActionType;
}

// ── Pending actions queue ───────────────────────────────────────────────────────

export function usePendingActions(filters: PendingActionsFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.adminActions.pending(), JSON.stringify(filters)] as const,
    queryFn: () =>
      adminActionsService.getPendingActions(
        filters.page ?? 1,
        filters.limit ?? 20,
        filters.actionType
      ),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Action history ─────────────────────────────────────────────────────────────

export function useActionHistory(filters: ActionHistoryFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.adminActions.history(), JSON.stringify(filters)] as const,
    queryFn: () =>
      adminActionsService.getActionHistory(
        filters.page ?? 1,
        filters.limit ?? 20,
        filters.status,
        filters.actionType
      ),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Approval threshold ─────────────────────────────────────────────────────────

export function useApprovalThreshold() {
  const { user } = useAuth();
  return useQuery<number>({
    queryKey: [...queryKeys.adminActions.all, 'threshold'] as const,
    queryFn: () => adminActionsService.getApprovalThreshold(),
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}
