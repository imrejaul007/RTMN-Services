/**
 * BAM Founder OS Client
 *
 * Wraps the blr-founder-os service (port 4260). Founder-specific AI:
 * founder profiles, KPI tracking, and playbook templates (runbook
 * templates for common founder scenarios — fundraising, hiring,
 * launching, etc.).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface FounderKpi {
  metric: string;
  value: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  capturedAt: string;
}

export interface Founder {
  id: string;
  name: string;
  email?: string;
  companyId?: string;
  industry?: string;
  stage?: 'idea' | 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'growth' | 'mature';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Playbook {
  id: string;
  title: string;
  description: string;
  /** Order of steps */
  steps: Array<{ id: string; title: string; description?: string; estimateMinutes?: number }>;
  audience: 'founder' | 'developer' | 'enterprise' | 'agency';
  tags: string[];
}

export interface PlaybookRun {
  id: string;
  founderId: string;
  playbookId: string;
  status: 'in-progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string | null;
  stepResults: Array<{ stepId: string; outcome: Record<string, unknown>; completedAt: string }>;
}

export interface CreateFounderRequest {
  name: string;
  email?: string;
  companyId?: string;
  industry?: string;
  stage?: Founder['stage'];
  metadata?: Record<string, unknown>;
}

export class FounderClient {
  constructor(private config: HojaiConfig) {}

  /** List founders (filter by stage/industry). */
  async list(input: { stage?: Founder['stage']; industry?: string } = {}): Promise<Founder[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<Founder[]>(this.config, 'GET', `/api/founders${qs}`);
  }

  /** Get a founder by id. */
  async get(founderId: string): Promise<Founder> {
    return request<Founder>(this.config, 'GET', `/api/founders/${encodeURIComponent(founderId)}`);
  }

  /** Create a founder profile (auth required). */
  async create(input: CreateFounderRequest): Promise<Founder> {
    return request<Founder>(this.config, 'POST', '/api/founders', input);
  }

  /** Record a KPI snapshot for a founder (auth required). */
  async recordKpi(founderId: string, kpi: Omit<FounderKpi, 'capturedAt'>): Promise<FounderKpi> {
    return request<FounderKpi>(this.config, 'POST', `/api/founders/${encodeURIComponent(founderId)}/kpis`, kpi);
  }

  /** Get the latest KPI snapshot. */
  async getLatestKpis(founderId: string): Promise<FounderKpi[]> {
    return request<FounderKpi[]>(this.config, 'GET', `/api/founders/${encodeURIComponent(founderId)}/kpis/latest`);
  }

  /** Get the KPI trend (history). */
  async getKpiTrend(founderId: string, input: { metric?: string; limit?: number } = {}): Promise<FounderKpi[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<FounderKpi[]>(
      this.config,
      'GET',
      `/api/founders/${encodeURIComponent(founderId)}/kpis/trend${qs}`,
    );
  }

  /** List available playbooks. */
  async listPlaybooks(input: { audience?: Playbook['audience']; tag?: string } = {}): Promise<Playbook[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<Playbook[]>(this.config, 'GET', `/api/playbooks${qs}`);
  }

  /** Get a playbook's full definition. */
  async getPlaybook(playbookId: string): Promise<Playbook> {
    return request<Playbook>(this.config, 'GET', `/api/playbooks/${encodeURIComponent(playbookId)}`);
  }

  /** Start a playbook run for a founder (auth required). */
  async runPlaybook(founderId: string, playbookId: string): Promise<PlaybookRun> {
    return request<PlaybookRun>(
      this.config,
      'POST',
      `/api/founders/${encodeURIComponent(founderId)}/playbooks/${encodeURIComponent(playbookId)}/run`,
    );
  }
}
