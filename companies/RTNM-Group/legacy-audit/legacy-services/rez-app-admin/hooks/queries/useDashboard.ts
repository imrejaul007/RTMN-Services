import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// BUG-037 FIX: enabled guard prevents queries from firing before auth resolves.
export function useDashboardStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => apiClient.get<any>('admin/dashboard/stats'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load dashboard stats');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.dashboard,
  });
}

export function useRecentActivity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.dashboard.recentActivity(),
    queryFn: () => apiClient.get<any>('admin/dashboard/recent-activity'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load recent activity');
      return res.data;
    },
    enabled: !!user,
    ...queryConfig.dashboard,
  });
}
