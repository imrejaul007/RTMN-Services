/**
 * API Client - React Query + Axios
 *
 * Features:
 * - Automatic caching
 * - Retry on failure
 * - Offline queue
 * - Request/response interceptors
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { QueryClient } from '@tanstack/react-query';

// ============================================================================
// CONFIG
// ============================================================================

const API_URL = process.env.HOJAI_FLOW_URL || 'http://localhost:4580';
const TIMEOUT = 15000;

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add tenant ID
    config.headers['x-tenant-id'] = 'default';

    // Add user ID
    config.headers['x-user-id'] = getUserId();

    // Log request in dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Retry on 5xx errors
    if (error.response?.status && error.response.status >= 500 && originalRequest) {
      const retryCount = (originalRequest.headers['x-retry-count'] as number) || 0;

      if (retryCount < 3) {
        originalRequest.headers['x-retry-count'] = retryCount + 1;
        return api(originalRequest);
      }
    }

    // Handle 401 (unauthorized)
    if (error.response?.status === 401) {
      // Could trigger logout here
      console.error('[API] Unauthorized');
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// USER ID
// ============================================================================

let userId = 'default';

export function setUserId(id: string) {
  userId = id;
}

function getUserId(): string {
  return userId;
}

// ============================================================================
// REACT QUERY CLIENT
// ============================================================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry 3 times on failure
      retry: 3,

      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Keep data for 10 minutes
      gcTime: 10 * 60 * 1000,

      // Refetch on window focus
      refetchOnWindowFocus: false,

      // Don't refetch on reconnect
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry once on failure
      retry: 1,
    },
  },
});

// ============================================================================
// API METHODS
// ============================================================================

export const flowApi = {
  // ========== PERSONAS ==========
  personas: {
    list: () => api.get('/api/personas', { params: { userId: getUserId() } }),
    get: (id: string) => api.get(`/api/personas/${id}`),
    create: (data: object) => api.post('/api/personas', { ...data, userId: getUserId() }),
    update: (id: string, data: object) => api.patch(`/api/personas/${id}`, data),
    learn: (personaId: string, text: string) =>
      api.post('/api/personas/learn', { personaId, text }),
  },

  // ========== BRAIN ==========
  brain: {
    list: (type?: string) => api.get('/api/brain', { params: { userId: getUserId(), type } }),
    create: (data: object) => api.post('/api/brain', { ...data, userId: getUserId() }),
    search: (query: string) => api.post('/api/brain/search', { userId: getUserId(), query }),
    contacts: () => api.get('/api/brain/contacts', { params: { userId: getUserId() } }),
    summary: () => api.get('/api/brain/summary', { params: { userId: getUserId() } }),
    connect: (itemId1: string, itemId2: string, type?: string) =>
      api.post('/api/brain/connect', {
        userId: getUserId(),
        itemId1,
        itemId2,
        connectionType: type,
      }),
  },

  // ========== ACTIONS ==========
  actions: {
    list: (status?: string) => api.get('/api/actions', { params: { userId: getUserId(), status } }),
    create: (data: object) => api.post('/api/actions', { ...data, userId: getUserId() }),
    suggestions: () => api.get('/api/actions/suggestions', { params: { userId: getUserId() } }),
    today: () => api.get('/api/actions/today', { params: { userId: getUserId() } }),
    pending: () => api.get('/api/actions/pending', { params: { userId: getUserId() } }),
    approve: (id: string) => api.patch(`/api/actions/${id}/approve`, { userId: getUserId() }),
    reject: (id: string, reason?: string) =>
      api.patch(`/api/actions/${id}/reject`, { userId: getUserId(), reason }),
    execute: (id: string) => api.post(`/api/actions/${id}/execute`, { userId: getUserId() }),
  },

  // ========== MEMORY ==========
  memory: {
    store: (tier: string, content: string, type: string) =>
      api.post('/api/memory/tier', { userId: getUserId(), tier, content, type }),
    retrieve: (tiers: string[], query?: string) =>
      api.get('/api/memory/retrieve', { params: { userId: getUserId(), tiers: tiers.join(','), query } }),
    search: (q: string) => api.get('/api/memory/search', { params: { userId: getUserId(), q } }),
    context: () => api.get('/api/memory/context', { params: { userId: getUserId() } }),
    stats: () => api.get('/api/memory/stats', { params: { userId: getUserId() } }),
    learn: (content: string, type: string) =>
      api.post('/api/memory/learn', { userId: getUserId(), content, type }),
  },

  // ========== INTENT ==========
  intent: {
    detect: (text: string) => api.post('/api/intent/detect', { text }),
    suggest: () => api.get('/api/intent/suggest'),
  },

  // ========== ORGANIZATIONS ==========
  organizations: {
    create: (data: object) => api.post('/api/organizations', data),
    get: (id: string) => api.get(`/api/organizations/${id}`),
    personaContext: (id: string, personaType: string) =>
      api.get(`/api/organizations/${id}/persona-context`, { params: { personaType } }),
    syncPersona: (orgId: string, persona: object) =>
      api.post(`/api/organizations/${orgId}/personas`, persona),
  },

  // ========== FLOW ==========
  flow: {
    execute: (action: object, persona: object, context: object) =>
      api.post('/api/flow/execute', { action, persona, context }),
    approve: (actionId: string, approverPersona: string) =>
      api.post('/api/flow/approve', { actionId, approverPersona }),
  },

  // ========== HEALTH ==========
  health: () => api.get('/health'),
};

export default api;
