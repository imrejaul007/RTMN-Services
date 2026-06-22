/**
 * usePayroll — React Query data layer for the Payroll admin module.
 *
 * Provides typed hooks for payroll overview stats, staff listing with attendance
 * data, payroll run history, and payroll processing initiation.
 *
 * Usage:
 *   const { stats } = usePayrollOverview();
 *   const { staff } = usePayrollStaff({ page: 1, limit: 20, merchantId: 'store123' });
 *   const { history } = usePayrollHistory({ page: 1, limit: 20 });
 *   const { attendance } = usePayrollAttendance('2026-04-01', '2026-04-07');
 */
import { useQuery } from '@tanstack/react-query';
import { payrollService } from '@/services/api/payroll';
import type {
  OverviewStats,
  StaffMember,
  PayrollRun,
} from '@/services/api/payroll';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export interface PayrollStaffFilters {
  page: number;
  limit: number;
  search?: string;
  merchantId?: string;
}

export interface PayrollHistoryFilters {
  page: number;
  limit: number;
}

// ── Payroll overview ────────────────────────────────────────────────────────────

export function usePayrollOverview() {
  const { user } = useAuth();
  return useQuery<OverviewStats>({
    queryKey: queryKeys.payroll.overview(),
    queryFn: () => payrollService.getOverview(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Payroll staff ───────────────────────────────────────────────────────────────

export function usePayrollStaff(filters: PayrollStaffFilters) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.payroll.staff(filters),
    queryFn: () => payrollService.getStaff(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Payroll attendance ──────────────────────────────────────────────────────────

export function usePayrollAttendance(startDate: string, endDate: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.payroll.all, 'attendance', startDate, endDate] as const,
    queryFn: () => payrollService.getAttendance(startDate, endDate),
    enabled: !!user && !!startDate && !!endDate,
    ...queryConfig.adminList,
  });
}

// ── Payroll history ─────────────────────────────────────────────────────────────

export function usePayrollHistory(filters: PayrollHistoryFilters) {
  const { user } = useAuth();
  return useQuery<PayrollRun[]>({
    queryKey: queryKeys.payroll.history(filters),
    queryFn: () => payrollService.getHistory(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}
