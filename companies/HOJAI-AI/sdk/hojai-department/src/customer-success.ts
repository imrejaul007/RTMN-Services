/**
 * Customer Success OS SDK client (port 4050)
 *
 * Customer lifecycle, NPS surveys, health scores, churn prediction,
 * check-ins, expansion tracking. 6 AI CS agents behind the scenes.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export type HealthStatus = 'healthy' | 'at-risk' | 'critical' | 'churned';
export type NpsCategory = 'promoter' | 'passive' | 'detractor';

export interface CsCustomer {
  id: string;
  name: string;
  email?: string;
  company?: string;
  /** Days since signup */
  tenureDays: number;
  /** 0-100 composite health score */
  healthScore: number;
  healthStatus: HealthStatus;
  /** 0-100 churn probability (from AI) */
  churnRisk: number;
  /** Total revenue from this customer */
  lifetimeValue: { amount: number; currency: string };
  npsScore?: number;
  lastCheckInAt?: string;
  ownerId?: string;
  createdAt: string;
}

export interface NpsSurvey {
  id: string;
  customerId: string;
  /** 0-10 */
  score: number;
  category: NpsCategory;
  feedback?: string;
  sentAt: string;
  respondedAt?: string;
}

export interface HealthSnapshot {
  customerId: string;
  capturedAt: string;
  /** Per-dimension scores (0-100) */
  dimensions: {
    engagement: number;
    adoption: number;
    satisfaction: number;
    support: number;
  };
  overall: number;
  status: HealthStatus;
}

export interface CheckIn {
  id: string;
  customerId: string;
  type: 'email' | 'call' | 'meeting' | 'qbr';
  scheduledFor: string;
  completedAt?: string;
  notes?: string;
  outcome?: 'positive' | 'neutral' | 'negative';
  ownerId?: string;
}

export class CustomerSuccessClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:4050` };
  }

  // ─── Customers ───

  async listCustomers(input: { healthStatus?: HealthStatus; minChurnRisk?: number; ownerId?: string; limit?: number } = {}): Promise<CsCustomer[]> {
    return request<CsCustomer[]>(this.config, 'GET', `/api/customers${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getCustomer(id: string): Promise<CsCustomer> {
    return request<CsCustomer>(this.config, 'GET', `/api/customers/${encodeURIComponent(id)}`);
  }

  /** Get at-risk customers (churn risk above threshold). */
  async getAtRisk(threshold = 60): Promise<CsCustomer[]> {
    return this.listCustomers({ minChurnRisk: threshold });
  }

  // ─── NPS ───

  async listNpsSurveys(input: { customerId?: string; category?: NpsCategory; limit?: number } = {}): Promise<NpsSurvey[]> {
    return request<NpsSurvey[]>(this.config, 'GET', `/api/nps${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async sendNpsSurvey(input: { customerId: string; subject?: string; message?: string }): Promise<NpsSurvey> {
    return request<NpsSurvey>(this.config, 'POST', '/api/nps', input);
  }

  async recordNpsResponse(input: { surveyId: string; score: number; feedback?: string }): Promise<NpsSurvey> {
    return request<NpsSurvey>(this.config, 'POST', `/api/nps/${encodeURIComponent(input.surveyId)}/respond`, input);
  }

  // ─── Health ───

  async getHealth(customerId: string): Promise<HealthSnapshot> {
    return request<HealthSnapshot>(this.config, 'GET', `/api/customers/${encodeURIComponent(customerId)}/health`);
  }

  async listHealthHistory(input: { customerId: string; from?: string; to?: string; limit?: number }): Promise<HealthSnapshot[]> {
    return request<HealthSnapshot[]>(this.config, 'GET', `/api/customers/${encodeURIComponent(input.customerId)}/health/history${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  // ─── Check-ins ───

  async listCheckIns(input: { customerId?: string; type?: CheckIn['type']; completed?: boolean; limit?: number } = {}): Promise<CheckIn[]> {
    return request<CheckIn[]>(this.config, 'GET', `/api/checkins${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async scheduleCheckIn(input: { customerId: string; type: CheckIn['type']; scheduledFor: string; notes?: string; ownerId?: string }): Promise<CheckIn> {
    return request<CheckIn>(this.config, 'POST', '/api/checkins', input);
  }

  async completeCheckIn(id: string, input: { notes?: string; outcome?: CheckIn['outcome'] }): Promise<CheckIn> {
    return request<CheckIn>(this.config, 'POST', `/api/checkins/${encodeURIComponent(id)}/complete`, input);
  }
}
