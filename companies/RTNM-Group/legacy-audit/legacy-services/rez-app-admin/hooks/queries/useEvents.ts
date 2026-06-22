/**
 * useEvents — React Query data layer for the Events admin module.
 *
 * Provides typed hooks for listing, viewing, and managing events, event categories,
 * event bookings, event analytics, and reward configurations.
 *
 * Usage:
 *   const { events, isLoading } = useEventsList({ page: 1, limit: 20, status: 'published' });
 *   const { categories } = useEventCategories();
 *   const { analytics } = useEventAnalytics('eventId123');
 */
import { useQuery } from '@tanstack/react-query';
import { adminEventsService } from '@/services/api/events';
import type {
  AdminEvent,
  EventCategory,
  EventBooking,
  EventAnalytics,
  EventRewardConfig,
  EventsQuery,
  EventsListResponse,
} from '@/services/api/events';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export type { EventsQuery, EventsListResponse };

// ── Events list ──────────────────────────────────────────────────────────────────

export function useEventsList(filters: EventsQuery = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => adminEventsService.getEvents(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Single event ────────────────────────────────────────────────────────────────

export function useEvent(id: string) {
  const { user } = useAuth();
  return useQuery<AdminEvent>({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => adminEventsService.getEventById(id),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}

// ── Event categories ───────────────────────────────────────────────────────────

export function useEventCategories() {
  const { user } = useAuth();
  return useQuery<EventCategory[]>({
    queryKey: queryKeys.events.categories(),
    queryFn: () => adminEventsService.getCategories(),
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Event bookings ─────────────────────────────────────────────────────────────

export function useEventBookings(eventId: string, page = 1, limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.events.bookings(eventId),
    queryFn: () => adminEventsService.getEventBookings(eventId, page, limit),
    enabled: !!user && !!eventId,
    ...queryConfig.adminList,
  });
}

// ── Event analytics ────────────────────────────────────────────────────────────

export function useEventAnalytics(eventId: string) {
  const { user } = useAuth();
  return useQuery<EventAnalytics>({
    queryKey: queryKeys.events.analytics(eventId),
    queryFn: () => adminEventsService.getEventAnalytics(eventId),
    enabled: !!user && !!eventId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Reward configs ─────────────────────────────────────────────────────────────

export function useEventRewardConfigs() {
  const { user } = useAuth();
  return useQuery<EventRewardConfig[]>({
    queryKey: queryKeys.events.rewardConfigs(),
    queryFn: () => adminEventsService.getRewardConfigs(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useGlobalRewardConfig() {
  const { user } = useAuth();
  return useQuery<EventRewardConfig | null>({
    queryKey: [...queryKeys.events.rewardConfigs(), 'global'] as const,
    queryFn: () => adminEventsService.getGlobalRewardConfig(),
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}
