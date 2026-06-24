/**
 * Genie Calendar Client
 *
 * Wraps the genie-calendar-service (port 4709). Personal calendar:
 * events, conflicts, today/upcoming views, availability queries.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  /** Free/busy/all day/transparent/etc. */
  status?: string;
  location?: string;
  attendees?: Array<{ userId: string; status?: string }>;
  reminders?: Array<{ type: 'email' | 'push' | 'sms'; minutesBefore: number }>;
  metadata?: Record<string, unknown>;
}

export interface Conflict {
  eventAId: string;
  eventBId: string;
  overlapStart: string;
  overlapEnd: string;
}

export interface CreateEventRequest {
  userId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
  attendees?: string[];
  reminders?: Array<{ type: 'email' | 'push' | 'sms'; minutesBefore: number }>;
}

export class CalendarClient {
  constructor(private config: HojaiConfig) {}

  /** List events, optionally filtered. */
  async listEvents(input: { userId: string; from?: string; to?: string; limit?: number }): Promise<CalendarEvent[]> {
    return request<CalendarEvent[]>(this.config, 'GET', `/api/events${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Get a single event by id. */
  async getEvent(eventId: string): Promise<CalendarEvent> {
    return request<CalendarEvent>(this.config, 'GET', `/api/events/${encodeURIComponent(eventId)}`);
  }

  /** Get all events for a given day (YYYY-MM-DD). */
  async getDay(userId: string, date: string): Promise<CalendarEvent[]> {
    return request<CalendarEvent[]>(
      this.config,
      'GET',
      `/api/day/${encodeURIComponent(date)}${buildQueryString({ userId })}`,
    );
  }

  /** Get today's events for a user. */
  async today(userId: string): Promise<CalendarEvent[]> {
    return request<CalendarEvent[]>(this.config, 'GET', `/api/events/today${buildQueryString({ userId })}`);
  }

  /** Get upcoming events for a user (next 7 days by default). */
  async upcoming(input: { userId: string; days?: number }): Promise<CalendarEvent[]> {
    return request<CalendarEvent[]>(this.config, 'GET', `/api/events/upcoming${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Detect scheduling conflicts for a user. */
  async conflicts(userId: string): Promise<Conflict[]> {
    return request<Conflict[]>(this.config, 'GET', `/api/conflicts/${encodeURIComponent(userId)}`);
  }

  /** Check if the user is free in a time window. */
  async availability(input: { userId: string; startAt: string; endAt: string }): Promise<{ available: boolean; busyEvents: CalendarEvent[] }> {
    return request(this.config, 'GET', `/api/availability${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Create a new calendar event. */
  async createEvent(input: CreateEventRequest): Promise<CalendarEvent> {
    return request<CalendarEvent>(this.config, 'POST', '/api/events', input);
  }
}
