/**
 * BAM Exploration Client
 *
 * Wraps the blr-exploration service (port 4255). Curated, multi-step
 * "journeys" for founders — onboarding, blueprint selection, BAM tour,
 * capability discovery, etc. Each journey has multiple steps; user state
 * is tracked in a session.
 *
 * Endpoints:
 *   GET  /api/journeys                       list available journeys
 *   GET  /api/journeys/:id                   get a journey definition
 *   POST /api/journeys/:id/start             start a new session (auth)
 *   POST /api/sessions/:id/step              advance session (auth)
 *   GET  /api/sessions/:id                   read session state
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface JourneyStep {
  id: string;
  title: string;
  description?: string;
  kind: 'choice' | 'input' | 'info' | 'recommendation' | 'install';
  options?: Array<{ id: string; label: string; metadata?: Record<string, unknown> }>;
  prompt?: string;
  metadata?: Record<string, unknown>;
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  audience: 'founder' | 'developer' | 'enterprise' | 'agency';
  estimatedMinutes: number;
  steps: JourneyStep[];
}

export interface JourneySession {
  id: string;
  journeyId: string;
  tenantId: string;
  currentStepId: string;
  /** Free-form per-step answers */
  state: Record<string, unknown>;
  status: 'in-progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string | null;
}

export class ExploreClient {
  constructor(private config: HojaiConfig) {}

  /** List available curated journeys. */
  async listJourneys(input: { audience?: Journey['audience'] } = {}): Promise<Journey[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<Journey[]>(this.config, 'GET', `/api/journeys${qs}`);
  }

  /** Get a journey's full definition (steps + metadata). */
  async getJourney(journeyId: string): Promise<Journey> {
    return request<Journey>(this.config, 'GET', `/api/journeys/${encodeURIComponent(journeyId)}`);
  }

  /** Start a new session for a journey (returns a session id + state). */
  async startJourney(journeyId: string, initialState: Record<string, unknown> = {}): Promise<JourneySession> {
    return request<JourneySession>(this.config, 'POST', `/api/journeys/${encodeURIComponent(journeyId)}/start`, initialState);
  }

  /** Advance a session with the answer to the current step. */
  async step(sessionId: string, answer: { choiceId?: string; input?: unknown; metadata?: Record<string, unknown> }): Promise<JourneySession> {
    return request<JourneySession>(this.config, 'POST', `/api/sessions/${encodeURIComponent(sessionId)}/step`, answer);
  }

  /** Get current session state. */
  async getSession(sessionId: string): Promise<JourneySession> {
    return request<JourneySession>(this.config, 'GET', `/api/sessions/${encodeURIComponent(sessionId)}`);
  }
}
