/**
 * Exhibition OS SDK client (port 5040)
 *
 * The Exhibition service organizes work around exhibitions (trade shows,
 * expos) with a full lifecycle: create → publish → start → complete.
 * Each exhibition has booths, exhibitors, schedule, and the service
 * exposes modules + AI agents to assist with planning.
 *
 * Endpoints:
 *   GET   /api/modules                    list platform modules
 *   GET   /api/agents                     list AI agents
 *   POST  /api/agents/:id/run             run an AI agent
 *   GET   /api/exhibitions                list exhibitions
 *   POST  /api/exhibitions                create an exhibition
 *   GET   /api/exhibitions/:id            get one exhibition
 *   PATCH /api/exhibitions/:id            update exhibition
 *   POST  /api/exhibitions/:id/publish    publish the exhibition
 *   POST  /api/exhibitions/:id/start      start the exhibition
 *   POST  /api/exhibitions/:id/complete   mark complete
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface ExhibitionModule {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface ExhibitionAgent {
  id: string;
  name: string;
  purpose: string;
}

export interface Booth {
  id: string;
  number: string;
  exhibitorName: string;
  category?: string;
  size?: 'small' | 'medium' | 'large' | 'custom';
}

export interface Exhibition {
  id: string;
  name: string;
  description?: string;
  /** ISO date */
  startDate: string;
  endDate: string;
  venue: string;
  booths: Booth[];
  status: 'draft' | 'pending' | 'published' | 'in-progress' | 'completed' | 'cancelled';
  expectedAttendees: number;
  totalRevenue: { amount: number; currency: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateExhibitionRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  venue: string;
  expectedAttendees: number;
  booths?: Omit<Booth, 'id'>[];
}

export class ExhibitionClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:5040` };
  }

  /** List platform modules. */
  async listModules(): Promise<ExhibitionModule[]> {
    const res = await request<{ modules: ExhibitionModule[] }>(this.config, 'GET', '/api/modules');
    return res.modules;
  }

  /** List available AI agents. */
  async listAgents(): Promise<ExhibitionAgent[]> {
    const res = await request<{ agents: ExhibitionAgent[] }>(this.config, 'GET', '/api/agents');
    return res.agents;
  }

  /** Run an AI agent (booth layout, marketing, etc.). */
  async runAgent(agentId: string, input: Record<string, unknown>): Promise<{ result: unknown }> {
    return request(this.config, 'POST', `/api/agents/${encodeURIComponent(agentId)}/run`, input);
  }

  // ─── Exhibitions ───

  async listExhibitions(input: { status?: Exhibition['status']; venue?: string; from?: string; to?: string; limit?: number } = {}): Promise<Exhibition[]> {
    const res = await request<{ exhibitions: Exhibition[] }>(this.config, 'GET', `/api/exhibitions${buildQueryString(input as unknown as Record<string, unknown>)}`);
    return res.exhibitions;
  }

  async getExhibition(exhibitionId: string): Promise<Exhibition> {
    return request<Exhibition>(this.config, 'GET', `/api/exhibitions/${encodeURIComponent(exhibitionId)}`);
  }

  async createExhibition(input: CreateExhibitionRequest): Promise<Exhibition> {
    return request<Exhibition>(this.config, 'POST', '/api/exhibitions', input);
  }

  async updateExhibition(exhibitionId: string, patch: Partial<CreateExhibitionRequest>): Promise<Exhibition> {
    return request<Exhibition>(this.config, 'PATCH', `/api/exhibitions/${encodeURIComponent(exhibitionId)}`, patch);
  }

  /** Publish the exhibition (transitions draft/pending → published). */
  async publish(exhibitionId: string): Promise<Exhibition> {
    return request<Exhibition>(this.config, 'POST', `/api/exhibitions/${encodeURIComponent(exhibitionId)}/publish`);
  }

  /** Start the exhibition (transitions published → in-progress). */
  async start(exhibitionId: string): Promise<Exhibition> {
    return request<Exhibition>(this.config, 'POST', `/api/exhibitions/${encodeURIComponent(exhibitionId)}/start`);
  }

  /** Complete the exhibition (transitions in-progress → completed). */
  async complete(exhibitionId: string, notes?: string): Promise<Exhibition> {
    return request<Exhibition>(this.config, 'POST', `/api/exhibitions/${encodeURIComponent(exhibitionId)}/complete`, { notes });
  }
}
