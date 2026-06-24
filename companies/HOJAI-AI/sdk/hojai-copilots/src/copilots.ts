/**
 * HOJAI Copilots — 7 sub-clients, one per copilot.
 *
 * Each copilot has its own port + domain-specific surface.
 * Common shape: get/list/create/update/delete + a few domain-specific
 * actions (e.g. sales.prioritize, marketing.draftCampaign).
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';
import type {
  AgentRecord, AgentExecution, WorkflowDefinition,
  LeadScore, TalkingPoints, EmailDraft, MeetingPrep, ForecastResult,
  CampaignDraft, AudienceSegment, CompetitorInsight,
  Invoice, CashflowForecast, ExpenseCategory,
  SupportTicket, KnowledgeArticle,
  KpiSummary, BoardReport,
  BusinessInsight
} from './types.js';

// ─── Base class ────────────────────────────────────────────

abstract class CopilotClient {
  public readonly config: HojaiConfig;
  constructor(config: HojaiConfig, port: number) {
    this.config = { ...config, baseUrl: `http://localhost:${port}` };
  }
}

// ─── Agent copilot (port 4920) ──────────────────────────────

export class AgentCopilotClient extends CopilotClient {
  constructor(config: HojaiConfig) { super(config, 4920); }

  async listAgents(input: { role?: string; status?: AgentRecord['status']; limit?: number } = {}): Promise<AgentRecord[]> {
    return request<AgentRecord[]>(this.config, 'GET', `/api/agents${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getAgent(id: string): Promise<AgentRecord> {
    return request<AgentRecord>(this.config, 'GET', `/api/agents/${encodeURIComponent(id)}`);
  }
  async createAgent(input: Omit<AgentRecord, 'id' | 'createdAt'>): Promise<AgentRecord> {
    return request<AgentRecord>(this.config, 'POST', '/api/agents', input);
  }
  async updateAgent(id: string, patch: Partial<AgentRecord>): Promise<AgentRecord> {
    return request<AgentRecord>(this.config, 'PUT', `/api/agents/${encodeURIComponent(id)}`, patch);
  }
  async deleteAgent(id: string): Promise<{ deleted: boolean; id: string }> {
    return request<{ deleted: boolean; id: string }>(this.config, 'DELETE', `/api/agents/${encodeURIComponent(id)}`);
  }
  async execute(input: { agentId: string; input: Record<string, unknown> }): Promise<AgentExecution> {
    return request<AgentExecution>(this.config, 'POST', '/api/execute', input);
  }
  async getExecution(id: string): Promise<AgentExecution> {
    return request<AgentExecution>(this.config, 'GET', `/api/execute/${encodeURIComponent(id)}`);
  }
  async listExecutions(input: { agentId?: string; status?: AgentExecution['status']; limit?: number } = {}): Promise<AgentExecution[]> {
    return request<AgentExecution[]>(this.config, 'GET', `/api/executions${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async cancelExecution(id: string): Promise<{ cancelled: boolean; id: string }> {
    return request<{ cancelled: boolean; id: string }>(this.config, 'POST', `/api/execute/${encodeURIComponent(id)}/cancel`);
  }
  async listWorkflows(): Promise<WorkflowDefinition[]> {
    return request<WorkflowDefinition[]>(this.config, 'GET', '/api/workflows');
  }
  async createWorkflow(input: Omit<WorkflowDefinition, 'id' | 'createdAt'>): Promise<WorkflowDefinition> {
    return request<WorkflowDefinition>(this.config, 'POST', '/api/workflows', input);
  }
}

// ─── Sales copilot (port 4928) ──────────────────────────────

export class SalesCopilotClient extends CopilotClient {
  constructor(config: HojaiConfig) { super(config, 4928); }

  async prioritize(input: { leadId: string; context?: Record<string, unknown> }): Promise<LeadScore> {
    return request<LeadScore>(this.config, 'POST', '/api/prioritize', input);
  }
  async talkingPoints(input: { leadId: string; context: string }): Promise<TalkingPoints> {
    return request<TalkingPoints>(this.config, 'POST', '/api/talking-points', input);
  }
  async recommend(input: { leadId: string; context?: string }): Promise<{ recommendations: string[] }> {
    return request<{ recommendations: string[] }>(this.config, 'POST', '/api/recommend', input);
  }
  async generateEmail(input: { leadId: string; context?: string; tone?: EmailDraft['tone'] }): Promise<EmailDraft> {
    return request<EmailDraft>(this.config, 'POST', '/api/email/generate', input);
  }
  async listCompetitors(): Promise<CompetitorInsight[]> {
    return request<CompetitorInsight[]>(this.config, 'GET', '/api/competitors');
  }
  async getCompetitor(id: string): Promise<CompetitorInsight> {
    return request<CompetitorInsight>(this.config, 'GET', `/api/competitors/${encodeURIComponent(id)}`);
  }
  async prepareMeeting(input: { leadId: string; context?: string }): Promise<MeetingPrep> {
    return request<MeetingPrep>(this.config, 'POST', '/api/meeting/prepare', input);
  }
  async forecast(input: { period: string; repIds?: string[] }): Promise<ForecastResult> {
    return request<ForecastResult>(this.config, 'POST', '/api/forecast', input);
  }
  async enrich(input: { leadId: string; fields?: string[] }): Promise<{ enrichedFields: Record<string, string> }> {
    return request(this.config, 'POST', '/api/enrich', input);
  }
  async playbook(topic: string): Promise<{ topic: string; steps: string[] }> {
    return request(this.config, 'GET', `/api/playbook/${encodeURIComponent(topic)}`);
  }
}

// ─── Marketing copilot (port 4929) ────────────────────────

export class MarketingCopilotClient extends CopilotClient {
  constructor(config: HojaiConfig) { super(config, 4929); }

  async draftCampaign(input: { name: string; channel: CampaignDraft['channel']; audience: string; goal?: string; tone?: string }): Promise<CampaignDraft> {
    return request<CampaignDraft>(this.config, 'POST', '/api/campaigns/draft', input);
  }
  async listAudiences(): Promise<AudienceSegment[]> {
    return request<AudienceSegment[]>(this.config, 'GET', '/api/audiences');
  }
  async createAudience(input: Omit<AudienceSegment, 'id' | 'size'>): Promise<AudienceSegment> {
    return request<AudienceSegment>(this.config, 'POST', '/api/audiences', input);
  }
  async competitiveAnalysis(input: { competitorId: string; product?: string }): Promise<CompetitorInsight> {
    return request<CompetitorInsight>(this.config, 'POST', '/api/competitive-analysis', input);
  }
  async recommendContent(input: { topic: string; audience?: string; format?: string }): Promise<{ suggestions: Array<{ title: string; format: string; angle: string }> }> {
    return request(this.config, 'POST', '/api/content/recommend', input);
  }
  async brandCheck(input: { content: string }): Promise<{ score: number; violations: string[]; suggestions: string[] }> {
    return request(this.config, 'POST', '/api/brand-check', input);
  }
  async seoSuggest(input: { topic: string; keywords?: string[] }): Promise<{ keywords: string[]; titleSuggestions: string[]; metaDescription: string }> {
    return request(this.config, 'POST', '/api/seo-suggest', input);
  }
}

// ─── Finance copilot (port 4930) ──────────────────────────

export class FinanceCopilotClient extends CopilotClient {
  constructor(config: HojaiConfig) { super(config, 4930); }

  async listInvoices(input: { status?: Invoice['status']; customerId?: string; limit?: number } = {}): Promise<Invoice[]> {
    return request<Invoice[]>(this.config, 'GET', `/api/invoices${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async createInvoice(input: Omit<Invoice, 'id' | 'status' | 'issuedAt' | 'updatedAt'>): Promise<Invoice> {
    return request<Invoice>(this.config, 'POST', '/api/invoices', input);
  }
  async sendInvoice(id: string): Promise<Invoice> {
    return request<Invoice>(this.config, 'POST', `/api/invoices/${encodeURIComponent(id)}/send`);
  }
  async markPaid(id: string, input: { paidAt?: string; method?: string } = {}): Promise<Invoice> {
    return request<Invoice>(this.config, 'POST', `/api/invoices/${encodeURIComponent(id)}/pay`, input);
  }
  async forecastCashflow(input: { months: number; startingBalance?: number }): Promise<CashflowForecast> {
    return request<CashflowForecast>(this.config, 'POST', '/api/cashflow/forecast', input);
  }
  async categorizeExpense(input: { description: string; amount: number; vendor?: string }): Promise<{ category: string; confidence: number; reasoning: string }> {
    return request(this.config, 'POST', '/api/expenses/categorize', input);
  }
  async listExpenseCategories(period?: string): Promise<ExpenseCategory[]> {
    return request<ExpenseCategory[]>(this.config, 'GET', `/api/expenses/categories${buildQueryString({ period })}`);
  }
  async taxEstimate(input: { period: string; revenue: number; deductions?: number }): Promise<{ estimated: number; effectiveRate: number; breakdown: Record<string, number> }> {
    return request(this.config, 'POST', '/api/tax/estimate', input);
  }
}

// ─── Support copilot (port 4925) ──────────────────────────

export class SupportCopilotClient extends CopilotClient {
  constructor(config: HojaiConfig) { super(config, 4925); }

  async listTickets(input: { status?: SupportTicket['status']; priority?: SupportTicket['priority']; assigneeId?: string; limit?: number } = {}): Promise<SupportTicket[]> {
    return request<SupportTicket[]>(this.config, 'GET', `/api/tickets${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getTicket(id: string): Promise<SupportTicket> {
    return request<SupportTicket>(this.config, 'GET', `/api/tickets/${encodeURIComponent(id)}`);
  }
  async createTicket(input: Omit<SupportTicket, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<SupportTicket> {
    return request<SupportTicket>(this.config, 'POST', '/api/tickets', input);
  }
  async assignTicket(id: string, assigneeId: string): Promise<SupportTicket> {
    return request<SupportTicket>(this.config, 'POST', `/api/tickets/${encodeURIComponent(id)}/assign`, { assigneeId });
  }
  async resolveTicket(id: string, resolution: string): Promise<SupportTicket> {
    return request<SupportTicket>(this.config, 'POST', `/api/tickets/${encodeURIComponent(id)}/resolve`, { resolution });
  }
  async suggestReply(input: { ticketId: string; context?: string }): Promise<{ reply: string; confidence: number; citations: string[] }> {
    return request(this.config, 'POST', '/api/tickets/suggest-reply', input);
  }
  async listKb(input: { tag?: string; query?: string; limit?: number } = {}): Promise<KnowledgeArticle[]> {
    return request<KnowledgeArticle[]>(this.config, 'GET', `/api/kb${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async searchKb(query: string, limit = 5): Promise<KnowledgeArticle[]> {
    return request<KnowledgeArticle[]>(this.config, 'GET', `/api/kb/search${buildQueryString({ query, limit })}`);
  }
  async escalateTicket(id: string, input: { toTier: 'tier2' | 'tier3' | 'engineering'; reason: string }): Promise<SupportTicket> {
    return request<SupportTicket>(this.config, 'POST', `/api/tickets/${encodeURIComponent(id)}/escalate`, input);
  }
}

// ─── Executive copilot (port 4933) ──────────────────────

export class ExecutiveCopilotClient extends CopilotClient {
  constructor(config: HojaiConfig) { super(config, 4933); }

  async listKpis(input: { category?: KpiSummary['category']; limit?: number } = {}): Promise<KpiSummary[]> {
    return request<KpiSummary[]>(this.config, 'GET', `/api/kpis${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getBoardReport(period: string): Promise<BoardReport> {
    return request<BoardReport>(this.config, 'GET', `/api/board-report${buildQueryString({ period })}`);
  }
  async listPillars(): Promise<Array<{ id: string; name: string; status: string; progress: number }>> {
    return request(this.config, 'GET', '/api/pillars');
  }
  async updatePillarProgress(id: string, progress: number): Promise<{ id: string; progress: number }> {
    return request(this.config, 'PATCH', `/api/pillars/${encodeURIComponent(id)}/progress`, { progress });
  }
  async getDashboard(input: { period: string; segments?: string[] }): Promise<{ kpis: KpiSummary[]; trends: Record<string, number>; alerts: string[] }> {
    return request(this.config, 'GET', `/api/dashboard${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async strategicPlan(input: { horizon: 'q' | 'y' | '3y'; goals: string[] }): Promise<{ phases: Array<{ phase: string; milestones: string[] }> }> {
    return request(this.config, 'POST', '/api/strategic-plan', input);
  }
  async competitorMonitor(): Promise<{ threats: CompetitorInsight[]; recommendations: string[] }> {
    return request(this.config, 'GET', '/api/competitor-monitor');
  }
}

// ─── Business copilot (port 4600) ────────────────────────

export class BusinessCopilotClient extends CopilotClient {
  constructor(config: HojaiConfig) { super(config, 4600); }

  async listInsights(input: { category?: BusinessInsight['category']; limit?: number } = {}): Promise<BusinessInsight[]> {
    return request<BusinessInsight[]>(this.config, 'GET', `/api/insights${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }
  async getInsight(id: string): Promise<BusinessInsight> {
    return request<BusinessInsight>(this.config, 'GET', `/api/insights/${encodeURIComponent(id)}`);
  }
  async strategicAnalysis(input: { topic: string; context?: string }): Promise<BusinessInsight> {
    return request<BusinessInsight>(this.config, 'POST', '/api/strategic-analysis', input);
  }
  async operationsReview(input: { period: string }): Promise<{ insights: BusinessInsight[]; recommendations: string[] }> {
    return request(this.config, 'POST', '/api/operations-review', input);
  }
  async growthOpportunities(input: { segment?: string } = {}): Promise<BusinessInsight[]> {
    return request<BusinessInsight[]>(this.config, 'POST', '/api/growth-opportunities', input);
  }
  async riskAssessment(input: { area: string; context?: string }): Promise<BusinessInsight> {
    return request<BusinessInsight>(this.config, 'POST', '/api/risk-assessment', input);
  }
}

// ─── Facade ───────────────────────────────────────────────

export class Copilots {
  public readonly agent: AgentCopilotClient;
  public readonly sales: SalesCopilotClient;
  public readonly marketing: MarketingCopilotClient;
  public readonly finance: FinanceCopilotClient;
  public readonly support: SupportCopilotClient;
  public readonly executive: ExecutiveCopilotClient;
  public readonly business: BusinessCopilotClient;
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.agent = new AgentCopilotClient(config);
    this.sales = new SalesCopilotClient(config);
    this.marketing = new MarketingCopilotClient(config);
    this.finance = new FinanceCopilotClient(config);
    this.support = new SupportCopilotClient(config);
    this.executive = new ExecutiveCopilotClient(config);
    this.business = new BusinessCopilotClient(config);
    this.config = config;
  }
}

export default Copilots;
