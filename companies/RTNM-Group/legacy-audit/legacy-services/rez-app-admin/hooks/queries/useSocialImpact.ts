/**
 * useSocialImpact — React Query data layer for the Social Impact (Events & Sponsors)
 * management screen.
 *
 * Provides queries for events, sponsors, participants, and sponsor ledger.
 * Uses socialImpactService which throws on error directly (Pattern B).
 *
 * Usage:
 *   const { data } = useSocialImpactEvents({ eventStatus: 'approved' });
 *   const { data } = useSocialImpactSponsors({ isActive: true });
 *   const { data: participants } = useSocialImpactParticipants('event-id');
 */

import { useQuery } from '@tanstack/react-query';
import { socialImpactService, type Sponsor } from '@/services/api/socialImpact';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

// ── Filter types ─────────────────────────────────────────────────────────────

export interface SocialImpactEventFilters {
  page?: number;
  limit?: number;
  eventStatus?: string;
  eventType?: string;
  sponsorId?: string;
  city?: string;
}

export interface SocialImpactSponsorFilters {
  page?: number;
  limit?: number;
  isActive?: boolean;
  industry?: string;
  search?: string;
}

export interface ParticipantFilters {
  status?: string;
}

export interface SponsorLedgerFilters {
  page?: number;
  limit?: number;
  type?: string;
}

// ── Events ───────────────────────────────────────────────────────────────────

export function useSocialImpactEvents(filters: SocialImpactEventFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.socialImpact.events(filters),
    queryFn: () => socialImpactService.getEvents(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useSocialImpactEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.socialImpact.eventDetail(id),
    queryFn: () => socialImpactService.getEventById(id),
    enabled: !!id,
  });
}

export function usePendingSocialImpactEvents(filters: { page?: number; limit?: number } = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.socialImpact.pending(filters),
    queryFn: () => socialImpactService.getPendingEvents({ page: filters.page, limit: filters.limit }),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Participants ──────────────────────────────────────────────────────────────

export function useSocialImpactParticipants(eventId: string, filters: ParticipantFilters = {}) {
  return useQuery({
    queryKey: queryKeys.socialImpact.participants(eventId),
    queryFn: () => socialImpactService.getParticipants(eventId, filters),
    enabled: !!eventId,
    ...queryConfig.adminList,
  });
}

// ── Sponsors ─────────────────────────────────────────────────────────────────

export function useSocialImpactSponsors(filters: SocialImpactSponsorFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.socialImpact.sponsors(filters),
    queryFn: () => socialImpactService.getSponsors(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

export function useSocialImpactSponsor(id: string) {
  return useQuery({
    queryKey: queryKeys.socialImpact.sponsorDetail(id),
    queryFn: () => socialImpactService.getSponsorById(id),
    enabled: !!id,
  });
}

export function useSponsorEvents(sponsorId: string) {
  return useQuery({
    queryKey: [...queryKeys.socialImpact.all, 'sponsorEvents', sponsorId] as const,
    queryFn: () => socialImpactService.getSponsorEvents(sponsorId),
    enabled: !!sponsorId,
    ...queryConfig.adminList,
  });
}

export function useSponsorAnalytics(sponsorId: string) {
  return useQuery({
    queryKey: [...queryKeys.socialImpact.all, 'sponsorAnalytics', sponsorId] as const,
    queryFn: () => socialImpactService.getSponsorAnalytics(sponsorId),
    enabled: !!sponsorId,
    ...queryConfig.adminList,
  });
}

export function useSponsorBudget(sponsorId: string) {
  return useQuery({
    queryKey: [...queryKeys.socialImpact.all, 'sponsorBudget', sponsorId] as const,
    queryFn: () => socialImpactService.getSponsorBudget(sponsorId),
    enabled: !!sponsorId,
    ...queryConfig.adminList,
  });
}

export function useSponsorLedger(sponsorId: string, filters: SponsorLedgerFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.socialImpact.all, 'sponsorLedger', sponsorId, JSON.stringify(filters)] as const,
    queryFn: () => socialImpactService.getSponsorLedger(sponsorId, filters),
    enabled: !!sponsorId,
    ...queryConfig.adminList,
  });
}
