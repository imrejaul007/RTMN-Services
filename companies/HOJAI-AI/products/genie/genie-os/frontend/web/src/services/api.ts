// API client — talks to the Express server (port 3000) which proxies to 25 specialists.
// Use the proxied /api/specialists/<name>/... paths so the server handles routing.

import axios, { AxiosInstance } from 'axios';
import type { ApiResponse } from '../types';

const TOKEN_KEY = 'genie_token';
const USER_KEY = 'genie_user';

const client: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'content-type': 'application/json' }
});

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    return Promise.reject(err);
  }
);

export async function apiGet<T>(path: string, params?: any): Promise<T> {
  const r = await client.get<ApiResponse<T>>(path, { params });
  if (!r.data.success) throw new Error(r.data.error?.message || 'API error');
  return r.data.data as T;
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const r = await client.post<ApiResponse<T>>(path, body);
  if (!r.data.success) throw new Error(r.data.error?.message || 'API error');
  return r.data.data as T;
}

export async function apiPut<T>(path: string, body?: any): Promise<T> {
  const r = await client.put<ApiResponse<T>>(path, body);
  if (!r.data.success) throw new Error(r.data.error?.message || 'API error');
  return r.data.data as T;
}

export async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const r = await client.patch<ApiResponse<T>>(path, body);
  if (!r.data.success) throw new Error(r.data.error?.message || 'API error');
  return r.data.data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const r = await client.delete<ApiResponse<T>>(path);
  if (!r.data.success) throw new Error(r.data.error?.message || 'API error');
  return r.data.data as T;
}

// Auth helpers

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, user: any): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): any | null {
  const s = localStorage.getItem(USER_KEY);
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    // Corrupted storage — clear it and return null
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

// Public auth endpoints (no token required)

export async function login(email: string, password: string): Promise<{ token: string; user: any }> {
  const data = await apiPost<{ token: string; user: any }>('/auth/login', { email, password });
  setToken(data.token, data.user);
  return data;
}

export async function signup(name: string, email: string, password: string): Promise<{ token: string; user: any }> {
  const data = await apiPost<{ token: string; user: any }>('/auth/signup', { name, email, password });
  setToken(data.token, data.user);
  return data;
}

// 24 specialist helpers — all routed via /api/specialists/<name>/*

export const specialists = {
  briefing: '/specialists/briefing',
  calendar: '/specialists/calendar',
  companion: '/specialists/companion',
  consultant: '/specialists/consultant',
  creation: '/specialists/creation',
  creator: '/specialists/creator',
  device: '/specialists/device',
  execution: '/specialists/execution',
  gateway: '/specialists/gateway',
  learning: '/specialists/learning',
  learner: '/specialists/learner',
  lifegps: '/specialists/lifegps',
  lifeuni: '/specialists/lifeuni',
  listening: '/specialists/listening',
  memorygraph: '/specialists/memorygraph',
  memoryinbox: '/specialists/memoryinbox',
  money: '/specialists/money',
  relationship: '/specialists/relationship',
  serendipity: '/specialists/serendipity',
  shopping: '/specialists/shopping',
  forgetting: '/specialists/forgetting',
  spiritual: '/specialists/spiritual',
  lifereplay: '/specialists/lifereplay',
  futureself: '/specialists/futureself',
  simulation: '/specialists/simulation',
  personaltwin: '/specialists/personaltwin',
  planner: '/specialists/planner',
  widgets: '/specialists/widgets',
  aiteam: '/specialists/aiteam',
  accounts: '/specialists/accounts',
  household: '/specialists/household',
  founder: '/specialists/founder',
  teacher: '/specialists/teacher',
  research: '/specialists/research',
  thinking: '/specialists/thinking',
  search: '/specialists/search',
  wakeword: '/specialists/wakeword',
  wellness: '/specialists/wellness',
  // Phase 14: Goal decomposition + DAG execution
  planning: '/specialists/planning',
} as const;

// Admin helpers
export const admin = {
  users: '/admin/users',
  servicesHealth: '/admin/services/health',
  usage: '/admin/usage',
  audit: '/admin/audit',
  metrics: '/admin/metrics',
} as const;

export default client;