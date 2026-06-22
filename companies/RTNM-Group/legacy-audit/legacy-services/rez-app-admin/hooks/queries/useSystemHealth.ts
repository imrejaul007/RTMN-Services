/**
 * useSystemHealth — React Query data layer for the System Health & Monitoring screen.
 *
 * Provides health, reconciliation, and scheduled jobs queries.
 * Uses apiClient with select + res.success check (Pattern A) to match
 * the established pattern used by useMerchants and useOrders.
 *
 * Usage:
 *   const { data: health } = useSystemHealth();
 *   const { data: reconciliation } = useReconciliation();
 *   const { data: jobs } = useScheduledJobs();
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── System health ────────────────────────────────────────────────────────────

export function useSystemHealth() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.system.health(),
    queryFn: () => apiClient.get<any>('admin/system/health'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load system health');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Reconciliation ───────────────────────────────────────────────────────────

export function useReconciliation() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.system.reconciliation(),
    queryFn: () => apiClient.get<any>('admin/system/reconciliation'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load reconciliation data');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Scheduled jobs ───────────────────────────────────────────────────────────

export function useScheduledJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.system.jobs(),
    queryFn: () => apiClient.get<any>('admin/system/jobs'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load scheduled jobs');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.adminList,
  });
}
