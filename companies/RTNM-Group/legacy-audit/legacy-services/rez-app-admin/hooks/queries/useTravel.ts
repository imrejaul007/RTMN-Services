/**
 * useTravel — React Query data layer for the Travel (OTA) management screen.
 *
 * Provides dashboard, category, service, and booking queries.
 * Uses travelAdminService which throws on error directly (Pattern B).
 *
 * Usage:
 *   const { data: dashboard } = useTravelDashboard();
 *   const { data: categories } = useTravelCategories();
 *   const { data: bookings } = useTravelBookings({ status: 'confirmed', category: 'flight' });
 *   const { data: booking } = useTravelBooking('booking-id-123');
 */

import { useQuery } from '@tanstack/react-query';
import {
  travelAdminService,
  type TravelDashboardStats,
  type TravelCategory,
  type TravelService,
  type TravelBooking,
} from '@/services/api/travel';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface TravelServiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: string;
}

export interface TravelBookingFilters {
  page?: number;
  limit?: number;
  status?: string;
  cashbackStatus?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export function useTravelDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.travel.dashboard(),
    queryFn: () => travelAdminService.getDashboard(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Categories ───────────────────────────────────────────────────────────────

export function useTravelCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.travel.categories(),
    queryFn: () => travelAdminService.getCategories(),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Services ─────────────────────────────────────────────────────────────────

export function useTravelServices(filters: TravelServiceFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.travel.services(filters),
    queryFn: () => travelAdminService.getServices(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Bookings ─────────────────────────────────────────────────────────────────

export function useTravelBookings(filters: TravelBookingFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.travel.bookings(filters),
    queryFn: () => travelAdminService.getBookings(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useTravelBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.travel.bookingDetail(id),
    queryFn: () => travelAdminService.getBookingById(id),
    enabled: !!id,
  });
}
