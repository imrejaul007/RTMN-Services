/**
 * Risk Detection Client — HOJAI AI risk-detection-service.
 *
 * Real-time risk scoring for transactions, accounts, agents, and merchants.
 * Used to flag suspicious activity before it becomes a loss.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory = 'fraud' | 'aml' | 'velocity' | 'geolocation' | 'device' | 'behavioral' | 'counterparty' | 'amount';

export interface RiskAssessment {
  id: string;
  subjectType: 'agent' | 'user' | 'merchant' | 'transaction';
  subjectId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  categories: RiskCategory[];
  factors: {
    category: RiskCategory;
    weight: number;
    description: string;
  }[];
  recommendation: 'allow' | 'review' | 'block' | 'escalate';
  assessedAt: string;
}

export interface RiskFlag {
  id: string;
  subjectType: RiskAssessment['subjectType'];
  subjectId: string;
  category: RiskCategory;
  severity: RiskLevel;
  description: string;
  status: 'open' | 'investigating' | 'dismissed' | 'confirmed';
  flaggedAt: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export class RiskClient {
  constructor(private config: HojaiConfig) {}

  // ── Risk scoring ──────────────────────────────────────────────────
  async assess(req: {
    subjectType: RiskAssessment['subjectType'];
    subjectId: string;
    context?: Record<string, unknown>;
  }): Promise<RiskAssessment> {
    return request<RiskAssessment>(this.config, 'POST', '/api/risk/assess', req);
  }

  async getHistory(subjectId: string, params: { from?: string; to?: string; limit?: number } = {}): Promise<RiskAssessment[]> {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<RiskAssessment[]>(this.config, 'GET', `/api/risk/history/${encodeURIComponent(subjectId)}${suffix}`);
  }

  // ── Flags ──────────────────────────────────────────────────────────
  async flag(req: {
    subjectType: RiskFlag['subjectType'];
    subjectId: string;
    category: RiskCategory;
    severity: RiskLevel;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<RiskFlag> {
    return request<RiskFlag>(this.config, 'POST', '/api/risk/flags', req);
  }

  async dismissFlag(flagId: string, reason: string): Promise<RiskFlag> {
    return request<RiskFlag>(this.config, 'POST', `/api/risk/flags/${encodeURIComponent(flagId)}/dismiss`, { reason });
  }

  async listFlags(params: { status?: RiskFlag['status']; severity?: RiskLevel; subjectId?: string; limit?: number } = {}): Promise<RiskFlag[]> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.severity) qs.set('severity', params.severity);
    if (params.subjectId) qs.set('subjectId', params.subjectId);
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<RiskFlag[]>(this.config, 'GET', `/api/risk/flags${suffix}`);
  }

  // ── Batch + thresholds ────────────────────────────────────────────
  async assessBatch(req: { subjects: RiskAssessment['subjectId'][]; subjectType: RiskAssessment['subjectType'] }): Promise<RiskAssessment[]> {
    return request<RiskAssessment[]>(this.config, 'POST', '/api/risk/assess-batch', req);
  }

  async getThresholds(): Promise<{ low: number; medium: number; high: number; critical: number }> {
    return request(this.config, 'GET', '/api/risk/thresholds');
  }

  async setThresholds(thresholds: { low: number; medium: number; high: number; critical: number }): Promise<{ low: number; medium: number; high: number; critical: number }> {
    return request(this.config, 'PUT', '/api/risk/thresholds', thresholds);
  }
}