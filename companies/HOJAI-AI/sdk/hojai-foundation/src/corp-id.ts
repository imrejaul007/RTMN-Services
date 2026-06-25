/**
 * CorpID Module
 *
 * Wraps the CorpID service (port 4702) via Hub /api/identity/* routes.
 * Maps developer-friendly schemas to the backend's register/login/user APIs.
 */

import type { HojaiConfig } from './config.js';
import { request, type AuthState, type HojaiClientConfig } from './utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CorpIDType = 'company' | 'user' | 'agent' | 'device' | 'service';

export interface CorpIDMetadata {
  name?: string;
  email?: string;
  country?: string;
  taxId?: string;
  industry?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface CorpID {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  businessId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCorpIDRequest {
  type: CorpIDType;
  metadata: CorpIDMetadata;
  password?: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: string;
  businessId?: string;
}

interface UpdateUserRequest {
  name?: string;
  phone?: string;
  country?: string;
  industry?: string;
  taxId?: string;
}

// ---------------------------------------------------------------------------
// CorpID client
// ---------------------------------------------------------------------------

export class CorpIDClient {
  constructor(
    private config: HojaiConfig,
    private authState: AuthState
  ) {}

  private get cfg(): HojaiClientConfig {
    return { ...this.config, authState: this.authState };
  }

  async create(input: CreateCorpIDRequest): Promise<CorpID> {
    const body: RegisterRequest = {
      email: input.metadata.email ?? `temp-${Date.now()}@placeholder.local`,
      password: input.password ?? `temp-${Math.random().toString(36).slice(2)}`,
      name: input.metadata.name ?? input.type,
      role: mapTypeToRole(input.type)
    };
    return request<CorpID>(this.cfg, 'POST', '/api/identity/auth/register', body);
  }

  /** @internal */
  async _login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    return request(this.cfg, 'POST', '/api/identity/auth/login', { email, password });
  }

  /** @internal */
  async _refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return request(this.cfg, 'POST', '/api/identity/auth/refresh', { refreshToken });
  }

  async get(id: string): Promise<CorpID> {
    return request<CorpID>(this.cfg, 'GET', `/api/identity/users/${encodeURIComponent(id)}`);
  }

  async list(params?: { page?: number; limit?: number; role?: string }): Promise<CorpID[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.role) query.set('role', params.role);
    const qs = query.toString();
    return request<CorpID[]>(this.cfg, 'GET', `/api/identity/users${qs ? `?${qs}` : ''}`);
  }

  async update(id: string, data: Partial<CorpIDMetadata>): Promise<CorpID> {
    const body: UpdateUserRequest = {
      name: data.name,
      phone: data.phone,
      country: data.country,
      industry: data.industry,
      taxId: data.taxId
    };
    return request<CorpID>(this.cfg, 'PUT', `/api/identity/users/${encodeURIComponent(id)}`, body);
  }

  async me(): Promise<CorpID> {
    return request<CorpID>(this.cfg, 'GET', '/api/identity/profile');
  }

  async updateProfile(data: Partial<CorpIDMetadata>): Promise<CorpID> {
    const body: UpdateUserRequest = {
      name: data.name,
      phone: data.phone,
      country: data.country,
      industry: data.industry,
      taxId: data.taxId
    };
    return request<CorpID>(this.cfg, 'PUT', '/api/identity/profile', body);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapTypeToRole(type: CorpIDType): string {
  switch (type) {
    case 'company': return 'admin';
    case 'user':    return 'user';
    case 'agent':   return 'user';
    case 'device':  return 'operator';
    case 'service': return 'service';
    default:        return 'user';
  }
}
