/**
 * useCreators — React Query data layer for the Creator Program admin module.
 *
 * Covers creator applications (pending/approved/rejected), picks moderation, conversion
 * tracking, and program-level stats and configuration. Uses named function exports
 * from the creators service (not a class/object singleton).
 *
 * Usage:
 *   const { stats } = useCreatorProgramStats();
 *   const { applications } = useCreatorApplications({ status: 'pending', page: 1 });
 *   const { picks } = useCreatorPicks({ status: 'pending' });
 *   const { conversions } = useCreatorConversions({ page: 1, limit: 20 });
 *   const { config } = useCreatorConfig();
 */
import { useQuery } from '@tanstack/react-query';
import {
  getCreatorApplications,
  getCreatorProgramStats,
  getCreatorConfig,
  getAdminPicks,
  getAdminConversions,
} from '@/services/api/creators';
import type {
  AdminCreator,
  AdminPick,
  AdminConversion,
  CreatorProgramStats,
  CreatorProgramConfig,
} from '@/services/api/creators';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export interface CreatorApplicationsFilters {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreatorPicksFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreatorConversionsFilters {
  status?: string;
  page?: number;
  limit?: number;
}

// ── Creator program stats ──────────────────────────────────────────────────────

export function useCreatorProgramStats() {
  const { user } = useAuth();
  return useQuery<CreatorProgramStats>({
    queryKey: queryKeys.creators.stats(),
    queryFn: () => getCreatorProgramStats() as unknown as Promise<CreatorProgramStats>,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Creator applications ───────────────────────────────────────────────────────

export function useCreatorApplications(filters: CreatorApplicationsFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.creators.applications(filters),
    queryFn: () => getCreatorApplications(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Creator picks (moderation) ─────────────────────────────────────────────────

export function useCreatorPicks(filters: CreatorPicksFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.creators.picks(filters),
    queryFn: () => getAdminPicks(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Creator conversions ───────────────────────────────────────────────────────

export function useCreatorConversions(filters: CreatorConversionsFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.creators.conversions(filters),
    queryFn: () => getAdminConversions(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Creator program config ─────────────────────────────────────────────────────

export function useCreatorConfig() {
  const { user } = useAuth();
  return useQuery<CreatorProgramConfig>({
    queryKey: queryKeys.creators.config(),
    queryFn: () => getCreatorConfig() as unknown as Promise<CreatorProgramConfig>,
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}
