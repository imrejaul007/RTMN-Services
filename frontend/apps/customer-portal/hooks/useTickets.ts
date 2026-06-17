'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Ticket, SubmitTicketForm, TicketMessage } from '@/lib/types';

interface UseTicketsReturn {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  fetchTickets: (page?: number) => Promise<void>;
  createTicket: (data: SubmitTicketForm) => Promise<{ success: boolean; ticket?: Ticket; error?: string }>;
  addMessage: (ticketId: string, content: string) => Promise<{ success: boolean; message?: TicketMessage; error?: string }>;
  closeTicket: (ticketId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useTickets(initialPage = 1, initialPageSize = 10): UseTicketsReturn {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(0);

  const fetchTickets = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);

    const response = await api.getTickets(pageNum, pageSize);

    if (response.success && response.data) {
      setTickets(response.data.items);
      setTotal(response.data.total);
      setPage(response.data.page);
      setTotalPages(response.data.totalPages);
    } else {
      setError(response.error || 'Failed to fetch tickets');
    }

    setLoading(false);
  }, [pageSize]);

  const createTicket = useCallback(async (data: SubmitTicketForm) => {
    const response = await api.createTicket(data);

    if (response.success && response.data) {
      await fetchTickets(page);
      return { success: true, ticket: response.data };
    }

    return { success: false, error: response.error };
  }, [fetchTickets, page]);

  const addMessage = useCallback(async (ticketId: string, content: string) => {
    const response = await api.addTicketMessage(ticketId, content);

    if (response.success && response.data) {
      return { success: true, message: response.data };
    }

    return { success: false, error: response.error };
  }, []);

  const closeTicket = useCallback(async (ticketId: string) => {
    const response = await api.closeTicket(ticketId);

    if (response.success) {
      await fetchTickets(page);
      return { success: true };
    }

    return { success: false, error: response.error };
  }, [fetchTickets, page]);

  useEffect(() => {
    fetchTickets(initialPage);
  }, [fetchTickets, initialPage]);

  return {
    tickets,
    loading,
    error,
    total,
    page,
    pageSize,
    totalPages,
    fetchTickets,
    createTicket,
    addMessage,
    closeTicket,
  };
}

interface UseTicketReturn {
  ticket: Ticket | null;
  loading: boolean;
  error: string | null;
  addMessage: (content: string) => Promise<{ success: boolean; message?: TicketMessage; error?: string }>;
  refresh: () => Promise<void>;
}

export function useTicket(ticketId: string): UseTicketReturn {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await api.getTicket(ticketId);

    if (response.success && response.data) {
      setTicket(response.data);
    } else {
      setError(response.error || 'Failed to fetch ticket');
    }

    setLoading(false);
  }, [ticketId]);

  const addMessage = useCallback(async (content: string) => {
    const response = await api.addTicketMessage(ticketId, content);

    if (response.success && response.data) {
      await refresh();
      return { success: true, message: response.data };
    }

    return { success: false, error: response.error };
  }, [ticketId, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ticket,
    loading,
    error,
    addMessage,
    refresh,
  };
}
