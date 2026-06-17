'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Ticket, TicketFilters, TicketMessage } from '@/lib/types';

export function useTickets(filters?: TicketFilters) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => api.getTickets(filters),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.getTicket(id),
    enabled: !!id,
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Ticket> }) =>
      api.updateTicket(id, data),
    onSuccess: (updatedTicket) => {
      // Update ticket in list
      queryClient.setQueryData(['tickets'], (old: Ticket[] | undefined) => {
        if (!old) return [updatedTicket];
        return old.map(t => t.id === updatedTicket.id ? updatedTicket : t);
      });
      // Update individual ticket
      queryClient.setQueryData(['ticket', updatedTicket.id], updatedTicket);
    },
  });
}

export function useAddMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, content }: { ticketId: string; content: string }) =>
      api.addMessage(ticketId, content),
    onSuccess: (message: TicketMessage, { ticketId }) => {
      // Update ticket with new message
      queryClient.setQueryData(['ticket', ticketId], (old: Ticket | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, message],
          updatedAt: message.createdAt,
        };
      });
    },
  });
}

export function useTicketStats(tickets: Ticket[] | undefined) {
  if (!tickets) {
    return {
      total: 0,
      open: 0,
      pending: 0,
      resolved: 0,
      byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
      byChannel: { email: 0, chat: 0, phone: 0, social: 0, portal: 0 },
    };
  }

  return {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    byPriority: {
      low: tickets.filter(t => t.priority === 'low').length,
      medium: tickets.filter(t => t.priority === 'medium').length,
      high: tickets.filter(t => t.priority === 'high').length,
      urgent: tickets.filter(t => t.priority === 'urgent').length,
    },
    byChannel: {
      email: tickets.filter(t => t.channel === 'email').length,
      chat: tickets.filter(t => t.channel === 'chat').length,
      phone: tickets.filter(t => t.channel === 'phone').length,
      social: tickets.filter(t => t.channel === 'social').length,
      portal: tickets.filter(t => t.channel === 'portal').length,
    },
  };
}
