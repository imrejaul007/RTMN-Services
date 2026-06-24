/**
 * Genie Briefing Client
 *
 * Wraps the genie-briefing-service (port 4712). Daily briefings —
 * morning, evening, weekly — aggregating tasks, calendar, weather,
 * insights, and reminders.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type BriefingKind = 'morning' | 'evening' | 'weekly';

export interface BriefingSection {
  /** Section name (e.g. 'weather', 'tasks', 'calendar', 'insights') */
  name: string;
  data: Record<string, unknown>;
}

export interface Briefing {
  id?: string;
  userId: string;
  type: BriefingKind;
  generatedAt: string;
  greeting: string;
  message: string;
  sections: Record<string, { count?: number; items?: unknown[]; [k: string]: unknown }>;
  insights?: string[];
}

export class BriefingClient {
  constructor(private config: HojaiConfig) {}

  /** Get today's briefing (defaults to morning). */
  async today(userId: string, kind: BriefingKind = 'morning'): Promise<Briefing> {
    return request<Briefing>(
      this.config,
      'GET',
      `/api/briefing/${encodeURIComponent(userId)}${buildQueryString({ type: kind })}`,
    );
  }

  /** Explicitly get the morning briefing. */
  async morning(userId: string): Promise<Briefing> {
    return request<Briefing>(this.config, 'GET', `/api/briefing/morning${buildQueryString({ userId })}`);
  }

  /** Explicitly get the evening briefing. */
  async evening(userId: string): Promise<Briefing> {
    return request<Briefing>(this.config, 'GET', `/api/briefing/evening${buildQueryString({ userId })}`);
  }

  /** Get the weekly briefing (rolling 7-day summary). */
  async weekly(userId: string): Promise<Briefing> {
    return request<Briefing>(this.config, 'GET', `/api/briefing/weekly${buildQueryString({ userId })}`);
  }

  /** Get historical briefings (most recent first). */
  async history(input: { userId?: string; limit?: number } = {}): Promise<Briefing[]> {
    return request<Briefing[]>(this.config, 'GET', `/api/briefing/history${buildQueryString(input as Record<string, unknown>)}`);
  }
}
