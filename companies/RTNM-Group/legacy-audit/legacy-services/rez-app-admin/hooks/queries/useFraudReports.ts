/**
 * useFraudReports — React Query data layer for the Fraud Reports admin module.
 *
 * Complements useFraud.ts (which covers fraud queue, config, and alerts via the
 * older apiClient-based approach). This file covers the full FraudReport
 * lifecycle using the typed fraudReportAdminService: listing, detail, status
 * updates, priority changes, internal notes, and remediation actions
 * (wallet freeze, user suspension, order hold).
 *
 * Usage:
 *   const { reports } = useFraudReportsList({ page: 1, status: 'new', priority: 'critical' });
 *   const { report } = useFraudReport('reportId123');
 */
import { useQuery } from '@tanstack/react-query';
import { fraudReportAdminService } from '@/services/api/fraudReports';
import type { FraudReport } from '@/services/api/fraudReports';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export interface FraudReportsFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── Fraud reports list ─────────────────────────────────────────────────────────

export function useFraudReportsList(filters: FraudReportsFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.fraud.reports(filters), 'service'] as const,
    queryFn: () => fraudReportAdminService.list(filters),
    enabled: !!user,
    ...queryConfig.fraud,
  });
}

// ── Single fraud report ───────────────────────────────────────────────────────

export function useFraudReport(id: string) {
  const { user } = useAuth();
  return useQuery<FraudReport | null>({
    queryKey: [...queryKeys.fraud.reports(), 'detail', id] as const,
    queryFn: () => fraudReportAdminService.getById(id),
    enabled: !!user && !!id,
    ...queryConfig.fraud,
  });
}
