/**
 * CXO OS SDK client (port 5100)
 *
 * Executive command center: executive KPIs, strategic pillars, department
 * monitoring, board reports, risk management, competitor analysis,
 * decision support. 15 Executive AI agents behind the scenes.
 *
 * Connects to ALL Department OS + ALL Industry OS for a unified executive view.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type { Money, DateRange } from './types.js';

export type StrategicPillarStatus = 'on-track' | 'at-risk' | 'off-track' | 'achieved';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ExecutiveKpi {
  id: string;
  name: string;
  category: 'financial' | 'operational' | 'customer' | 'people' | 'product';
  value: number;
  unit: string;
  /** 0-100 health */
  health: number;
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
  capturedAt: string;
  /** Linked department or industry */
  linkedOs?: string;
}

export interface StrategicPillar {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  status: StrategicPillarStatus;
  /** 0-100 progress */
  progress: number;
  startDate?: string;
  targetDate?: string;
  /** Sub-goals or initiatives */
  initiatives: Array<{ id: string; title: string; done: boolean; dueAt?: string }>;
}

export interface DepartmentSummary {
  department: string;
  /** Per-KPI snapshot for this department */
  kpis: Array<{ name: string; value: number; unit: string; trend: 'up' | 'down' | 'flat' }>;
  /** Aggregate health 0-100 */
  health: number;
  /** Open issues count */
  openIssues: number;
}

export interface BoardReport {
  id: string;
  title: string;
  period: DateRange;
  generatedAt: string;
  /** Executive summary */
  summary: string;
  /** Key wins + concerns + asks */
  highlights: { wins: string[]; concerns: string[]; asks: string[] };
  /** Financial section */
  financials: { revenue: Money; netIncome: Money; cash: Money; runwayMonths: number };
  /** Linked sections */
  sections: Array<{ title: string; content: string }>;
}

export interface Competitor {
  id: string;
  name: string;
  /** HOJAI sector (e.g. 'fashion', 'restaurant') */
  sector: string;
  notes?: string;
  /** 0-100 threat score */
  threatScore: number;
  lastUpdatedAt: string;
}

export class CxoClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:5100` };
  }

  // ─── Executive KPIs ───

  async getKpis(input: { category?: ExecutiveKpi['category']; period?: string } = {}): Promise<ExecutiveKpi[]> {
    return request<ExecutiveKpi[]>(this.config, 'GET', `/api/kpis${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getKpiTrend(input: { kpiId: string; from?: string; to?: string }): Promise<ExecutiveKpi[]> {
    return request<ExecutiveKpi[]>(this.config, 'GET', `/api/kpis/${encodeURIComponent(input.kpiId)}/trend${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  // ─── Strategic pillars ───

  async listPillars(input: { status?: StrategicPillarStatus; ownerId?: string } = {}): Promise<StrategicPillar[]> {
    return request<StrategicPillar[]>(this.config, 'GET', `/api/pillars${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createPillar(input: { name: string; description?: string; ownerId?: string; startDate?: string; targetDate?: string; initiatives?: Omit<StrategicPillar['initiatives'][0], 'done'>[] }): Promise<StrategicPillar> {
    return request<StrategicPillar>(this.config, 'POST', '/api/pillars', input);
  }

  async updatePillarProgress(id: string, progress: number): Promise<StrategicPillar> {
    return request<StrategicPillar>(this.config, 'PATCH', `/api/pillars/${encodeURIComponent(id)}/progress`, { progress });
  }

  // ─── Department monitoring ───

  async getDepartmentSummary(input: { department: string; period?: string }): Promise<DepartmentSummary> {
    return request<DepartmentSummary>(this.config, 'GET', `/api/departments/${encodeURIComponent(input.department)}/summary${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getAllDepartmentsSummary(input: { period?: string } = {}): Promise<DepartmentSummary[]> {
    return request<DepartmentSummary[]>(this.config, 'GET', `/api/departments/summary${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  // ─── Board reports ───

  async listBoardReports(input: { from?: string; to?: string; limit?: number } = {}): Promise<BoardReport[]> {
    return request<BoardReport[]>(this.config, 'GET', `/api/board-reports${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async generateBoardReport(input: { title: string; period: DateRange }): Promise<BoardReport> {
    return request<BoardReport>(this.config, 'POST', '/api/board-reports', input);
  }

  // ─── Competitors ───

  async listCompetitors(input: { sector?: string; minThreat?: number; limit?: number } = {}): Promise<Competitor[]> {
    return request<Competitor[]>(this.config, 'GET', `/api/competitors${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
}
