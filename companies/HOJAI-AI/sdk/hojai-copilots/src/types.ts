/**
 * HOJAI Copilots — type definitions.
 *
 * 7 copilots, one per department, each with its own domain:
 *   agent       (port 4920) — agent runtime + workflows
 *   business    (port 4600) — business strategy + ops
 *   executive   (port 4933) — exec dashboards + KPIs
 *   finance     (port 4930) — finance + accounting
 *   marketing   (port 4929) — campaigns + audiences
 *   sales       (port 4928) — leads + talking points
 *   support     (port 4925) — tickets + KB
 */

export const COPILOT_PORTS = {
  agent: 4920,
  business: 4600,
  executive: 4933,
  finance: 4930,
  marketing: 4929,
  sales: 4928,
  support: 4925
};

export type CopilotName = keyof typeof COPILOT_PORTS;

// ─── Agent copilot ─────────────────────────────────────────

export interface AgentRecord {
  id: string;
  name: string;
  role: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  capabilities: string[];
  createdAt: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs?: number;
  error?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  /** DAG of steps */
  steps: Array<{ id: string; agentRole: string; dependsOn?: string[]; config?: Record<string, unknown> }>;
  createdAt: string;
}

// ─── Sales copilot ──────────────────────────────────────────

export interface LeadScore {
  leadId: string;
  score: number; // 0-100
  reasoning: string;
  recommendedAction: 'call' | 'email' | 'nurture' | 'disqualify';
}

export interface TalkingPoints {
  leadId: string;
  context: string;
  points: Array<{ topic: string; detail: string; source?: string }>;
}

export interface EmailDraft {
  leadId: string;
  subject: string;
  body: string;
  tone: 'formal' | 'casual' | 'consultative';
}

export interface MeetingPrep {
  leadId: string;
  agenda: string[];
  talkingPoints: string[];
  objections: Array<{ objection: string; rebuttal: string }>;
  recentActivity: string[];
}

export interface ForecastResult {
  period: string;
  predicted: number;
  confidence: number;
  breakdown: Array<{ rep: string; quota: number; committed: number; bestCase: number }>;
}

// ─── Marketing copilot ──────────────────────────────────────

export interface CampaignDraft {
  name: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'social';
  audience: string;
  body: string;
  cta: string;
  estimatedReach: number;
}

export interface AudienceSegment {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  size: number;
}

export interface CompetitorInsight {
  competitorId: string;
  threat: 'low' | 'medium' | 'high';
  differentiators: string[];
  counterMessaging: string[];
}

// ─── Finance copilot ───────────────────────────────────────

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  dueDate: string;
  issuedAt: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
}

export interface CashflowForecast {
  period: string;
  inflows: number;
  outflows: number;
  net: number;
  runway: number; // months
  alerts: string[];
}

export interface ExpenseCategory {
  name: string;
  budget: number;
  spent: number;
  remaining: number;
  flagged: boolean;
}

// ─── Support copilot ───────────────────────────────────────

export interface SupportTicket {
  id: string;
  customerId: string;
  subject: string;
  body: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  body: string;
  tags: string[];
  helpful: number;
}

// ─── Executive copilot ────────────────────────────────────

export interface KpiSummary {
  name: string;
  category: 'financial' | 'operational' | 'customer' | 'people' | 'product';
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  changePercent: number;
  health: number; // 0-100
}

export interface BoardReport {
  id: string;
  period: string;
  generatedAt: string;
  highlights: { wins: string[]; concerns: string[]; asks: string[] };
  financials: { revenue: number; netIncome: number; cash: number; runwayMonths: number };
}

// ─── Business copilot ─────────────────────────────────────

export interface BusinessInsight {
  id: string;
  category: 'strategy' | 'operations' | 'growth' | 'risk';
  title: string;
  summary: string;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high';
}
