/**
 * usePlatformConfig
 *
 * React Query hooks for the Platform Control Center screen.
 * Wraps all system-config and merchant-plans API calls from platform-config.tsx.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/apiClient';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';

// ─── Types (mirrors platform-config.tsx) ───────────────────────────────────────

export type ConfigType = 'string' | 'number' | 'boolean';
export type ConfigCategory = 'operations' | 'notifications' | 'limits' | 'integrations';

export interface SystemConfigItem {
  _id: string;
  key: string;
  value: string | number | boolean;
  type: ConfigType;
  description: string;
  category: ConfigCategory;
  updatedAt: string;
}

export interface PlanLimit {
  plan: 'starter' | 'growth' | 'pro';
  maxProducts: number;
  maxStores: number;
  smsPerMonth: number;
  whatsappPerMonth: number;
  pushPerMonth: number;
  analyticsRetentionDays: number;
  monthlyPrice: number;
}

export interface NewConfigForm {
  key: string;
  value: string;
  type: ConfigType;
  category: ConfigCategory;
  description: string;
}

// ─── Query hooks ───────────────────────────────────────────────────────────────

/** Fetch all system config keys */
export function useSystemConfigs() {
  return useQuery<SystemConfigItem[], Error>({
    queryKey: queryKeys.platformConfig.configs(),
    queryFn: () =>
      apiClient.get<{ configs: SystemConfigItem[] }>('/admin/system-config').then((res) => {
        if (!res.success) throw new Error(res.message || 'Failed to load system config');
        return (res.data as any)?.configs ?? [];
      }),
    ...queryConfig.staticConfig,
  });
}

/** Fetch merchant plan limits */
export function useMerchantPlans() {
  return useQuery<PlanLimit[], Error>({
    queryKey: queryKeys.platformConfig.merchantPlans(),
    queryFn: () =>
      apiClient.get<{ plans: PlanLimit[] }>('/admin/merchant-plans').then((res) => {
        if (!res.success) throw new Error(res.message || 'Failed to load merchant plans');
        return (res.data as any)?.plans ?? [];
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

// ─── Mutation hooks ─────────────────────────────────────────────────────────────

/** Update a system config value */
export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    SystemConfigItem,
    Error,
    { key: string; value: string | number | boolean }
  >({
    mutationFn: ({ key, value }) =>
      apiClient.patch<SystemConfigItem>(`/admin/system-config/${key}`, { value }).then((res) => {
        if (!res.success) throw new Error(res.message || 'Failed to update config');
        return res.data as SystemConfigItem;
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platformConfig.all });
    },
  });
}

/** Add a new system config key */
export function useAddSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation<SystemConfigItem, Error, NewConfigForm>({
    mutationFn: (form) => {
      let parsedValue: any = form.value;
      if (form.type === 'number') parsedValue = parseFloat(form.value);
      if (form.type === 'boolean') parsedValue = form.value === 'true';

      return apiClient
        .post<{ config: SystemConfigItem }>('/admin/system-config', {
          key: form.key.trim(),
          value: parsedValue,
          type: form.type,
          category: form.category,
          description: form.description,
        })
        .then((res) => {
          if (!res.success) throw new Error(res.message || 'Failed to create config');
          return (res.data as any)?.config as SystemConfigItem;
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platformConfig.all });
    },
  });
}

/** Update a merchant plan */
export function useUpdateMerchantPlan() {
  const queryClient = useQueryClient();

  return useMutation<PlanLimit, Error, { planName: string; data: Partial<PlanLimit> }>({
    mutationFn: ({ planName, data }) =>
      apiClient.patch<PlanLimit>(`/admin/merchant-plans/${planName}`, data).then((res) => {
        if (!res.success) throw new Error(res.message || 'Failed to update plan');
        return res.data as PlanLimit;
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platformConfig.all });
    },
  });
}
