/**
 * useSupportTickets — React Query data layer for the Support Tickets admin module.
 *
 * Provides typed hooks for listing support tickets, viewing individual tickets,
 * fetching agent rosters, and retrieving aggregate statistics.
 *
 * Usage:
 *   const { tickets } = useSupportTicketsList({ page: 1, status: 'open', priority: 'high' });
 *   const { ticket } = useSupportTicket('ticketId123');
 *   const { statistics } = useSupportTicketStatistics();
 *   const { agents } = useSupportAgents();
 */
import { useQuery } from '@tanstack/react-query';
import { supportAdminService } from '@/services/api/support';
import type {
  SupportTicketItem,
  SupportStatistics,
} from '@/services/api/support';
import { queryKeys } from './queryKeys';
import { queryConfig } from '@/config/reactQuery';
import { useAuth } from '@/contexts/AuthContext';

export interface SupportTicketFilters {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── Support tickets list ───────────────────────────────────────────────────────

export function useSupportTicketsList(filters: SupportTicketFilters = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.supportTickets.list(filters),
    queryFn: () => supportAdminService.listTickets(filters),
    enabled: !!user,
    ...queryConfig.adminList,
  });
}

// ── Single support ticket ──────────────────────────────────────────────────────

export function useSupportTicket(id: string) {
  const { user } = useAuth();
  return useQuery<SupportTicketItem | null>({
    queryKey: queryKeys.supportTickets.detail(id),
    queryFn: () => supportAdminService.getTicket(id),
    enabled: !!user && !!id,
    ...queryConfig.adminList,
  });
}

// ── Support statistics ─────────────────────────────────────────────────────────

export function useSupportTicketStatistics() {
  const { user } = useAuth();
  return useQuery<SupportStatistics | null>({
    queryKey: queryKeys.supportTickets.statistics(),
    queryFn: () => supportAdminService.getStatistics(),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Support agents ─────────────────────────────────────────────────────────────

export function useSupportAgents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.supportTickets.agents(),
    queryFn: () => supportAdminService.getAgents(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
