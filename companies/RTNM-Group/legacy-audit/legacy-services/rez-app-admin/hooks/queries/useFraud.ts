import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';

// NEW-A-H2 FIX: select must throw when API returns success:false.
// Previously, `select: (res) => res.data` silently returned undefined on failure.
export function useFraudReports(filters?: any) {
  return useQuery({
    queryKey: queryKeys.fraud.reports(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.status) params.set('status', filters.status);
      if (filters?.priority) params.set('priority', filters.priority);
      const qs = params.toString();
      return apiClient.get<any>(`admin/fraud-reports${qs ? `?${qs}` : ''}`);
    },
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load fraud reports');
      return res.data;
    },
    ...queryConfig.fraud,
  });
}

export function useFraudQueue() {
  return useQuery({
    queryKey: queryKeys.fraud.queue(),
    queryFn: () => apiClient.get<any>('admin/fraud-queue'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load fraud queue');
      return res.data;
    },
    ...queryConfig.fraud,
  });
}

export function useFraudConfig() {
  return useQuery({
    queryKey: queryKeys.fraud.config(),
    queryFn: () => apiClient.get<any>('admin/fraud-config'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load fraud config');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
