import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';

// NEW-A-H2 FIX: select must throw when API returns success:false.
// Previously, `select: (res) => res.data` silently returned undefined on failure.
export function useMerchantCampaignRules(filters?: {
  page?: number;
  merchantId?: string;
  isActive?: boolean;
  triggerType?: string;
}) {
  return useQuery({
    queryKey: queryKeys.campaigns.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.merchantId) params.set('merchantId', filters.merchantId);
      if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
      if (filters?.triggerType) params.set('triggerType', filters.triggerType);
      const qs = params.toString();
      return apiClient.get<any>(`admin/merchant-campaign-rules${qs ? `?${qs}` : ''}`);
    },
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load merchant campaign rules');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMerchantCampaignRuleStats() {
  return useQuery({
    queryKey: queryKeys.campaigns.stats(),
    queryFn: () => apiClient.get<any>('admin/merchant-campaign-rules/stats'),
    select: (res: any) => {
      if (!res.success) throw new Error(res.message || 'Failed to load merchant campaign stats');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
