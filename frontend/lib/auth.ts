// Auth helpers (localStorage-based)
import { Client } from './api';

const TOKEN_KEY = 'rtmn_token';
const CLIENT_KEY = 'rtmn_client';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getClient(): Client | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CLIENT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setClient(client: Client) {
  localStorage.setItem(CLIENT_KEY, JSON.stringify(client));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLIENT_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
