/**
 * Genie Companion Client
 *
 * Wraps three companion services:
 *   - genie-companion-service   (port 4716) — Personal AI chat companion
 *   - genie-relationship-os      (port 4718) — People + relationships
 *   - genie-life-gps             (port 4721) — Life navigation (goals, decisions, growth)
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface CompanionMessage {
  id: string;
  userId: string;
  role: 'user' | 'companion' | 'system';
  content: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: string;
}

export interface Relationship {
  id: string;
  userId: string;
  /** Other person's CorpID / userId */
  personId: string;
  name: string;
  relationship: 'family' | 'friend' | 'colleague' | 'mentor' | 'acquaintance' | 'other';
  /** 1-5 closeness score */
  closeness: number;
  /** Last meaningful interaction */
  lastContactAt?: string;
  tags?: string[];
  notes?: string;
}

export interface LifeGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  /** 'career' | 'health' | 'finance' | 'learning' | 'relationships' | 'personal' | 'other' */
  category: string;
  /** 0-100 progress */
  progress: number;
  dueDate?: string;
  milestones?: Array<{ id: string; title: string; done: boolean; dueAt?: string }>;
}

export class CompanionClient {
  constructor(private config: HojaiConfig) {}

  // -------- Companion chat (genie-companion-service) --------

  /** Send a message to the companion and get its reply. */
  async chat(input: { userId: string; message: string; sessionId?: string; context?: Record<string, unknown> }): Promise<CompanionMessage> {
    return request<CompanionMessage>(this.config, 'POST', '/api/companion/chat', input);
  }

  /** Get the chat session history. */
  async getSession(sessionId: string): Promise<{ sessionId: string; messages: CompanionMessage[] }> {
    return request(this.config, 'GET', `/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  /** Get the user's full companion dashboard (mood, streak, recent chats, suggestions). */
  async getDashboard(userId: string): Promise<Record<string, unknown>> {
    return request(this.config, 'GET', `/api/${encodeURIComponent(userId)}/dashboard`);
  }

  // -------- Relationships (genie-relationship-os) --------

  /** List the user's relationships. */
  async listRelationships(input: { userId: string; relationship?: Relationship['relationship'] }): Promise<Relationship[]> {
    return request<Relationship[]>(this.config, 'GET', `/api/relationships${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Add or update a relationship. */
  async upsertRelationship(input: Omit<Relationship, 'id'>): Promise<Relationship> {
    return request<Relationship>(this.config, 'POST', '/api/relationships', input);
  }

  // -------- Life GPS (genie-life-gps) --------

  /** Get the user's life goals. */
  async listGoals(input: { userId: string; category?: LifeGoal['category'] }): Promise<LifeGoal[]> {
    return request<LifeGoal[]>(this.config, 'GET', `/api/life-gps/goals${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Add or update a life goal. */
  async upsertGoal(input: Omit<LifeGoal, 'id'>): Promise<LifeGoal> {
    return request<LifeGoal>(this.config, 'POST', '/api/life-gps/goals', input);
  }
}
