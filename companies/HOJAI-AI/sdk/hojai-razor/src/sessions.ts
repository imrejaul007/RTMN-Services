/**
 * RAZO Keyboard — Sessions client.
 *
 * Manages conversation sessions — accumulated context across multi-turn
 * interactions. Each session preserves entity memory + intent history
 * so the intent router has continuity.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { ConversationSession, IntentEntity } from './types.js';

export interface CreateSessionRequest {
  userId: string;
  channelId: string;
  /** Initial context to seed the session with */
  initialContext?: ConversationSession['context'];
}

export interface UpdateContextRequest {
  entities?: IntentEntity[];
  recentIntents?: string[];
  metadata?: Record<string, unknown>;
}

export class SessionsClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: ensureLocalhostPort(config) };
  }

  /** Start a new conversation session. */
  async create(input: CreateSessionRequest): Promise<ConversationSession> {
    return request<ConversationSession>(this.config, 'POST', '/api/sessions', input);
  }

  /** Get a session by id. */
  async get(sessionId: string): Promise<ConversationSession> {
    return request<ConversationSession>(this.config, 'GET', `/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  /** Get the active session for a user on a channel (creates one if none). */
  async getActive(userId: string, channelId: string): Promise<ConversationSession> {
    return request<ConversationSession>(this.config, 'GET', `/api/sessions/user/${encodeURIComponent(userId)}?channelId=${encodeURIComponent(channelId)}`);
  }

  /** Update the session context (entities, intent history, metadata). */
  async updateContext(sessionId: string, patch: UpdateContextRequest): Promise<ConversationSession> {
    return request<ConversationSession>(this.config, 'PATCH', `/api/sessions/${encodeURIComponent(sessionId)}/context`, patch);
  }

  /** Send a message within a session (auto-updates context). */
  async sendMessage(sessionId: string, input: { body: string; from?: string }): Promise<ConversationSession> {
    return request<ConversationSession>(this.config, 'POST', `/api/sessions/${encodeURIComponent(sessionId)}/message`, input);
  }

  /** End a session. */
  async end(sessionId: string): Promise<ConversationSession> {
    return request<ConversationSession>(this.config, 'DELETE', `/api/sessions/${encodeURIComponent(sessionId)}/end`);
  }

  /** List sessions (most recent first). */
  async list(input: { userId?: string; status?: 'active' | 'ended'; limit?: number } = {}): Promise<ConversationSession[]> {
    return request<ConversationSession[]>(this.config, 'GET', `/api/sessions${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
}

function ensureLocalhostPort(config: HojaiConfig): string {
  if (config.baseUrl?.includes('localhost')) {
    return `http://localhost:4725`;
  }
  return config.baseUrl;
}
