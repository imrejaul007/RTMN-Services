/**
 * @hojai/copilots SDK — 7 department copilots, one client each.
 *
 * @example
 * ```ts
 * import { Copilots } from '@hojai/copilots';
 *
 * const c = new Copilots({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Sales: prioritize a lead
 * const score = await c.sales.prioritize({ leadId: 'l-1' });
 *
 * // 2. Marketing: draft a campaign
 * const campaign = await c.marketing.draftCampaign({
 *   name: 'Q3 Launch', channel: 'email', audience: 'enterprise'
 * });
 *
 * // 3. Finance: forecast cashflow
 * const cashflow = await c.finance.forecastCashflow({ months: 6 });
 *
 * // 4. Support: suggest a reply
 * const reply = await c.support.suggestReply({ ticketId: 't-1' });
 *
 * // 5. Executive: get board report
 * const report = await c.executive.getBoardReport('Q2-2026');
 *
 * // 6. Agent: execute
 * const result = await c.agent.execute({ agentId: 'a-1', input: { goal: 'x' } });
 * ```
 */

export { Copilots } from './copilots.js';
export type {
  AgentRecord, AgentExecution, WorkflowDefinition,
  LeadScore, TalkingPoints, EmailDraft, MeetingPrep, ForecastResult,
  CampaignDraft, AudienceSegment, CompetitorInsight,
  Invoice, CashflowForecast, ExpenseCategory,
  SupportTicket, KnowledgeArticle,
  KpiSummary, BoardReport,
  BusinessInsight
} from './types.js';
export { COPILOT_PORTS, type CopilotName } from './types.js';
