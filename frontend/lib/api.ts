// API client for RTMN backend
const API_URL = process.env.NEXT_PUBLIC_API_URL; // Must be set in Vercel env vars

function getApiUrl() {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not set. Configure it in Vercel dashboard.');
  return API_URL;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiRequest<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const baseUrl = getApiUrl();
  const { method = 'GET', body, token } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

// Auth
export const auth = {
  signup: (body: { email: string; password: string; companyName: string; contactName: string; phone?: string }) =>
    apiRequest<{ id: string; email: string; status: string; message: string; devVerifyUrl?: string }>('/v1/auth/signup', { method: 'POST', body }),

  verify: (token: string) =>
    apiRequest<{ ok: boolean; message: string; client: { id: string; email: string; status: string } }>(`/v1/auth/verify/${token}`),

  login: (body: { email: string; password: string }) =>
    apiRequest<{ token: string; client: { id: string; email: string; company: string } }>('/v1/auth/login', { method: 'POST', body }),

  me: (token: string) =>
    apiRequest<Client>('/v1/auth/me', { token }),
};

// Services
export const services = {
  list: () => apiRequest<{ count: number; items: Service[] }>('/v1/services'),
  select: (token: string, body: { serviceId: string; plan: string }) =>
    apiRequest<{ ok: boolean; selection: ServiceSelection }>('/v1/services/select', { method: 'POST', body, token }),
};

// Billing
export const billing = {
  checkout: (token: string, body: { serviceId: string; plan: string }) =>
    apiRequest<{ ok: boolean; mode: string; paymentId: string; checkoutUrl?: string; mockConfirmUrl?: string }>('/v1/billing/checkout', { method: 'POST', body, token }),
  mockConfirm: (token: string, paymentId: string) =>
    apiRequest<{ ok: boolean; mode: string; service: ServiceSelection }>(`/v1/billing/mock-confirm/${paymentId}`, { method: 'POST', token }),
  payments: (token: string) =>
    apiRequest<{ items: Payment[] }>('/v1/billing/payments', { token }),
};

// Types
export interface Service {
  id: string;
  name: string;
  port: number;
  category: string;
  price: { pilot: number; growth: number; enterprise: number };
  description: string;
  pilotReady: boolean;
  plans: { id: string; name: string; monthly: number }[];
}

export interface ServiceSelection {
  serviceId: string;
  plan: string;
  port: number;
  status: string;
  pricing: { monthly: number; currency: string; plan: string };
  provisionedAt: string;
  activatedAt?: string;
  paymentId?: string;
}

export interface Client {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone?: string;
  status: string;
  createdAt: string;
  services: ServiceSelection[];
}

export interface Payment {
  id: string;
  serviceId: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
}
