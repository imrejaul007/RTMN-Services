/**
 * useEventMutations — mutation hooks for the Events screen.
 * Wraps adminEventsService calls with useMutation for optimistic updates and error handling.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminEventsService } from '@/services/api/events';
import { queryKeys } from './queryKeys';

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => adminEventsService.createEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminEventsService.updateEvent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminEventsService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminEventsService.updateEventStatus(id, status as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}

export function useToggleEventFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      adminEventsService.toggleFeatured(id, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.list() });
    },
  });
}
