/**
 * useTournaments — React Query data layer for the Tournaments admin module.
 *
 * Provides typed hooks for listing, viewing, and managing tournament configs,
 * including participant management and lifecycle operations (activate, cancel, clone, reactivate).
 *
 * Usage:
 *   const { tournaments } = useTournamentsList({ page: 1, limit: 20, status: 'active' });
 *   const { tournament } = useTournament('tournamentId123');
 *   const { participants } = useTournamentParticipants('tournamentId123');
 */
import { useQuery } from '@tanstack/react-query';
import { tournamentAdminService } from '@/services/api/tournaments';
import type {
  TournamentAdmin,
  TournamentQuery,
  TournamentListResponse,
} from '@/services/api/tournaments';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export type { TournamentQuery, TournamentListResponse };

// ── Tournaments list ───────────────────────────────────────────────────────────

export function useTournamentsList(filters: TournamentQuery = {}) {
  const { user } = useAuth();
  return useQuery<TournamentListResponse>({
    queryKey: queryKeys.tournaments.list(filters),
    queryFn: () => tournamentAdminService.getAll(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Single tournament ─────────────────────────────────────────────────────────

export function useTournament(id: string) {
  const { user } = useAuth();
  return useQuery<TournamentAdmin>({
    queryKey: queryKeys.tournaments.detail(id),
    queryFn: () => tournamentAdminService.getById(id),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}

// ── Tournament participants ────────────────────────────────────────────────────

export function useTournamentParticipants(id: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.tournaments.participants(id),
    queryFn: () => tournamentAdminService.getParticipants(id),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}
