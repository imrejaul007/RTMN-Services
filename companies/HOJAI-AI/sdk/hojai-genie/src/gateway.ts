/**
 * Genie Gateway Client
 *
 * Wraps the genie-gateway service (port 4701) — the central orchestrator
 * for HOJAI Genie. Routes top-level AI queries, aggregates user context
 * from memory + twins + briefing + calendar, manages preferences, and
 * broadcasts events across all services.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface QueryRequest {
  userId: string;
  query: string;
  sessionId?: string;
  /** Free-form context overrides for this query */
  context?: Record<string, unknown>;
}

export interface QueryResponse {
  response: {
    type: string;
    message: string;
    data?: Record<string, unknown>;
    suggestions?: string[];
  };
  requestId: string;
  timestamp: string;
}

export interface UserContext {
  memory?: unknown;
  personalTwin?: unknown;
  financialTwin?: unknown;
  healthTwin?: unknown;
}

export interface UserPreferences {
  preferences: Record<string, unknown>;
}

export interface ConnectedService {
  name: string;
  url: string;
  status: 'configured' | 'up' | 'down';
}

export class GatewayClient {
  constructor(private config: HojaiConfig) {}

  /** Main AI query endpoint — routes to appropriate AI service. */
  async query(input: QueryRequest): Promise<QueryResponse> {
    return request<QueryResponse>(this.config, 'POST', '/api/query', input);
  }

  /** Get full user context aggregated from memory + all twins. */
  async getContext(userId: string): Promise<{ success: boolean; userId: string; context: UserContext }> {
    return request<{ success: boolean; userId: string; context: UserContext }>(
      this.config,
      'GET',
      `/api/user/${encodeURIComponent(userId)}/context`,
    );
  }

  /** Get user preferences. */
  async getPreferences(userId: string): Promise<UserPreferences> {
    return request<UserPreferences>(
      this.config,
      'GET',
      `/api/user/${encodeURIComponent(userId)}/preferences`,
    );
  }

  /** Update user preferences (auth required). */
  async updatePreferences(userId: string, preferences: Record<string, unknown>): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      this.config,
      'PUT',
      `/api/user/${encodeURIComponent(userId)}/preferences`,
      { preferences },
    );
  }

  /** Get all twins data for a user (personal/financial/health/founder/relationship). */
  async getTwins(userId: string): Promise<{ success: boolean; userId: string; twins: Record<string, unknown> }> {
    return request<{ success: boolean; userId: string; twins: Record<string, unknown> }>(
      this.config,
      'GET',
      `/api/twins/${encodeURIComponent(userId)}`,
    );
  }

  /** Broadcast an event to all connected twins (auth required). */
  async broadcast(input: { userId: string; event: string; data?: Record<string, unknown> }): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(this.config, 'POST', '/api/broadcast', input);
  }

  /** Get the list of connected services with their URLs and status. */
  async listServices(): Promise<{ services: ConnectedService[]; gateway: { name: string; version: string; port: number } }> {
    return request<{ services: ConnectedService[]; gateway: { name: string; version: string; port: number } }>(
      this.config,
      'GET',
      '/api/services',
    );
  }

  /** Universal search (proxies through the gateway). */
  async search(input: { q: string; userId?: string; type?: 'all' | 'memory' | 'calendar' }): Promise<{ success: boolean; query: string; results: unknown[]; timestamp: string }> {
    return request(this.config, 'GET', `/api/search${buildQueryString(input as Record<string, unknown>)}`);
  }
}
