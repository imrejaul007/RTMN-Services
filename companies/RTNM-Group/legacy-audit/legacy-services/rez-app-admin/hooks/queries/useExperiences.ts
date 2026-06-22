/**
 * useExperiences — React Query data layer for the Experiences management screen.
 *
 * Provides list, detail, stats, categories, tags, store preview, and assignment
 * queries for store experiences. All queries use the experiencesService which throws
 * on error (Pattern B).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  experiencesService,
  type StoreExperience,
  type ExperienceStats,
  type ExperienceRequest,
  type ExperiencesQuery,
  type FilterCriteria,
  type CategoryOption,
  type TagOption,
  type PreviewStoresResponse,
  type AssignableStore,
} from '@/services/api/experiences';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface ExperiencesFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'all';
  featured?: boolean;
  type?: string;
  search?: string;
}

// ── List ─────────────────────────────────────────────────────────────────────

export function useExperiencesList(filters: ExperiencesFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.experiences.list(filters),
    queryFn: () => experiencesService.getExperiences(filters as ExperiencesQuery),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function useExperienceStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.experiences.stats(),
    queryFn: () => experiencesService.getStats(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────

export function useExperience(id: string) {
  return useQuery({
    queryKey: queryKeys.experiences.detail(id),
    queryFn: () => experiencesService.getExperienceById(id),
    enabled: !!id,
  });
}

// ── Categories & Tags ────────────────────────────────────────────────────────

export function useExperienceCategories() {
  return useQuery({
    queryKey: queryKeys.experiences.categories(),
    queryFn: () => experiencesService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useExperienceTags() {
  return useQuery({
    queryKey: queryKeys.experiences.tags(),
    queryFn: () => experiencesService.getTags(),
    staleTime: 10 * 60 * 1000,
  });
}

// ── Store preview ────────────────────────────────────────────────────────────

export function usePreviewStores(filterCriteria: FilterCriteria, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.experiences.preview(filterCriteria, limit),
    queryFn: () => experiencesService.previewStores(filterCriteria, limit),
    enabled: !!filterCriteria && Object.keys(filterCriteria).length > 0,
    staleTime: 30 * 1000,
  });
}

// ── Store search & assignment ────────────────────────────────────────────────

export function useSearchAssignableStores(query: string) {
  return useQuery({
    queryKey: queryKeys.experiences.searchStores(query),
    queryFn: () => experiencesService.searchStores(query),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

export function useSuggestedStores() {
  return useQuery({
    queryKey: queryKeys.experiences.suggestedStores(),
    queryFn: () => experiencesService.getSuggestedStores(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignedStores(experienceId: string) {
  return useQuery({
    queryKey: queryKeys.experiences.assignedStores(experienceId),
    queryFn: () => experiencesService.getAssignedStores(experienceId),
    enabled: !!experienceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExperienceRequest) => experiencesService.createExperience(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all });
    },
  });
}

export function useUpdateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExperienceRequest> }) =>
      experiencesService.updateExperience(id, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.detail(vars.id) });
    },
  });
}

export function useDeleteExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => experiencesService.deleteExperience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all });
    },
  });
}

export function useToggleExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => experiencesService.toggleExperience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all });
    },
  });
}

export function useToggleFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => experiencesService.toggleFeatured(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all });
    },
  });
}

export function useAssignStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ experienceId, storeId }: { experienceId: string; storeId: string }) =>
      experiencesService.assignStore(experienceId, storeId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.assignedStores(vars.experienceId) });
    },
  });
}

export function useRemoveStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ experienceId, storeId }: { experienceId: string; storeId: string }) =>
      experiencesService.removeStore(experienceId, storeId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.assignedStores(vars.experienceId) });
    },
  });
}

export function useRefreshStoreCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => experiencesService.refreshStoreCount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all });
    },
  });
}

export function useReorderExperiences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; sortOrder: number }>) =>
      experiencesService.reorderExperiences(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.experiences.all });
    },
  });
}
