import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';

// NEW-A-H2 FIX: select must throw when API returns success:false.
// Previously, `select: (res) => res.data` silently returned undefined on failure.
export function useFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.featureFlags.list(),
    queryFn: () => apiClient.get<any>('admin/feature-flags'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load feature flags');
      return res.data;
    },
    ...queryConfig.featureFlags,
  });
}

export function useFeatureFlag(key: string) {
  return useQuery({
    queryKey: queryKeys.featureFlags.detail(key),
    queryFn: () => apiClient.get<any>(`admin/feature-flags/${key}`),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load feature flag');
      return res.data;
    },
    enabled: !!key,
    ...queryConfig.featureFlags,
  });
}
