/**
 * useChallengeMutations — mutation hooks for the Challenges screen.
 * Wraps challengesService calls with useMutation for optimistic updates and error handling.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { challengesService } from '@/services/api/challenges';
import { queryKeys } from './queryKeys';

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => challengesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.stats() });
    },
  });
}

export function useUpdateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => challengesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.stats() });
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => challengesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.stats() });
    },
  });
}

export function useToggleChallengeFeatured() {
  return useMutation({
    mutationFn: (id: string) => challengesService.toggleFeatured(id),
  });
}

export function useChangeChallengeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      challengesService.changeStatus(id, status as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.analytics() });
    },
  });
}

export function useSetChallengeVisibility() {
  return useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: string }) =>
      challengesService.setVisibility(id, visibility as any),
  });
}

export function useSetChallengePriority() {
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: number }) =>
      challengesService.setPriority(id, priority),
  });
}

export function useCloneChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => challengesService.clone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.stats() });
    },
  });
}

export function useCreateChallengeFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateIndex: number) => challengesService.createFromTemplate(templateIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.stats() });
    },
  });
}
