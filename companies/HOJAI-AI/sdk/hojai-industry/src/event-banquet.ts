/**
 * Event & Banquet OS SDK client (port 4751)
 *
 * The Event & Banquet service organizes the work around events with a
 * full lifecycle: create → confirm → start → complete. Each event has
 * a list of items (courses, decorations, rentals) and tracks its
 * current state. The service also exposes modules + AI agents that
 * can be run to assist with event planning.
 *
 * Endpoints:
 *   GET   /api/modules                    list platform modules
 *   GET   /api/agents                     list AI agents
 *   POST  /api/agents/:id/run             run an AI agent
 *   GET   /api/events                     list events (filter by status, date, etc.)
 *   POST  /api/events                     create an event
 *   GET   /api/events/:id                 get one event
 *   PATCH /api/events/:id                 update event
 *   POST  /api/events/:id/confirm         confirm the booking
 *   POST  /api/events/:id/start           start the event
 *   POST  /api/events/:id/complete        mark the event complete
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface EventModule {
  id: string;
  name: string;
  description: string;
  /** Whether this module is currently active */
  active: boolean;
}

export interface EventAgent {
  id: string;
  name: string;
  purpose: string;
}

export interface EventItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: { amount: number; currency: string };
  notes?: string;
}

export interface EventRecord {
  id: string;
  name: string;
  description?: string;
  /** ISO date */
  eventDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  guestCount: number;
  items: EventItem[];
  status: 'draft' | 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  totalPrice: { amount: number; currency: string };
  customerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  name: string;
  description?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  guestCount: number;
  customerId: string;
  items?: Omit<EventItem, 'id'>[];
}

export class EventBanquetClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:4751` };
  }

  /** List platform modules. */
  async listModules(): Promise<EventModule[]> {
    const res = await request<{ modules: EventModule[] }>(this.config, 'GET', '/api/modules');
    return res.modules;
  }

  /** List available AI agents. */
  async listAgents(): Promise<EventAgent[]> {
    const res = await request<{ agents: EventAgent[] }>(this.config, 'GET', '/api/agents');
    return res.agents;
  }

  /** Run an AI agent (planning, decoration suggestions, etc.). */
  async runAgent(agentId: string, input: Record<string, unknown>): Promise<{ result: unknown }> {
    return request(this.config, 'POST', `/api/agents/${encodeURIComponent(agentId)}/run`, input);
  }

  // ─── Events ───

  async listEvents(input: { status?: EventRecord['status']; date?: string; customerId?: string; limit?: number } = {}): Promise<EventRecord[]> {
    const res = await request<{ events: EventRecord[] }>(this.config, 'GET', `/api/events${buildQueryString(input as unknown as Record<string, unknown>)}`);
    return res.events;
  }

  async getEvent(eventId: string): Promise<EventRecord> {
    return request<EventRecord>(this.config, 'GET', `/api/events/${encodeURIComponent(eventId)}`);
  }

  async createEvent(input: CreateEventRequest): Promise<EventRecord> {
    return request<EventRecord>(this.config, 'POST', '/api/events', input);
  }

  async updateEvent(eventId: string, patch: Partial<CreateEventRequest>): Promise<EventRecord> {
    return request<EventRecord>(this.config, 'PATCH', `/api/events/${encodeURIComponent(eventId)}`, patch);
  }

  /** Confirm the booking (transitions draft/pending → confirmed). */
  async confirm(eventId: string): Promise<EventRecord> {
    return request<EventRecord>(this.config, 'POST', `/api/events/${encodeURIComponent(eventId)}/confirm`);
  }

  /** Start the event (transitions confirmed → in-progress). */
  async start(eventId: string): Promise<EventRecord> {
    return request<EventRecord>(this.config, 'POST', `/api/events/${encodeURIComponent(eventId)}/start`);
  }

  /** Complete the event (transitions in-progress → completed). */
  async complete(eventId: string, notes?: string): Promise<EventRecord> {
    return request<EventRecord>(this.config, 'POST', `/api/events/${encodeURIComponent(eventId)}/complete`, { notes });
  }
}
