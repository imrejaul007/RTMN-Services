'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Customer360, Customer, KBArticle, AISuggestion } from '@/lib/types';

export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: ['customerSearch', query],
    queryFn: () => api.searchCustomers(query),
    enabled: query.length >= 2,
    staleTime: 60000, // 1 minute
  });
}

export function useCustomer360(id: string) {
  return useQuery({
    queryKey: ['customer360', id],
    queryFn: () => api.getCustomer360(id),
    enabled: !!id,
  });
}

export function useKnowledgeSearch(query: string) {
  return useQuery({
    queryKey: ['knowledge', query],
    queryFn: () => api.searchKnowledge(query),
    enabled: query.length >= 2,
    staleTime: 300000, // 5 minutes
  });
}

export function useAISuggestions(context: { ticketId?: string; customerId?: string }) {
  return useQuery({
    queryKey: ['suggestions', context],
    queryFn: () => api.getSuggestions(context),
    staleTime: 60000, // 1 minute
  });
}

export function useChurnRiskColor(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low':
      return 'text-green-600 bg-green-50';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'high':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function useTierColor(tier: Customer360['customer']['tier']): string {
  switch (tier) {
    case 'platinum':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'gold':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'silver':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'bronze':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function useSentimentColor(sentiment: Customer360['predictions']['sentiment']): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-600 bg-green-50';
    case 'neutral':
      return 'text-gray-600 bg-gray-50';
    case 'negative':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}
