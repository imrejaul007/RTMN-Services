/**
 * Sales Department Pack
 * Complete AI sales team with 5 agents and workflows
 */

import { Department, DepartmentDefinition } from '@hojai/agents';
import { AISDRAgent } from '../../agents/ai-sdr-agent/src';
import { Agent } from '@hojai/agents';

// Sales-specific agents
const sdrAgent = new AISDRAgent();
const aeAgent = new Agent({
  id: 'account-executive',
  name: 'Account Executive',
  role: 'ae',
  description: 'Handles discovery, demos, proposals, and closing',
  skills: ['discovery', 'demo', 'proposal', 'negotiation', 'closing'],
});

const salesOpsAgent = new Agent({
  id: 'sales-ops-agent',
  name: 'Sales Operations',
  role: 'sales_ops',
  description: 'Pipeline analytics, forecasting, territory management',
  skills: ['pipeline_analytics', 'forecast', 'territory', 'commission'],
});

const outreachAgent = new Agent({
  id: 'outreach-agent',
  name: 'Outreach Specialist',
  role: 'outreach',
  description: 'Cold outreach, sequences, follow-ups',
  skills: ['cold_email', 'linkedin_outreach', 'follow_up'],
});

const proposalAgent = new Agent({
  id: 'proposal-agent',
  name: 'Proposal Specialist',
  role: 'proposal',
  description: 'Document generation, pricing optimization',
  skills: ['document_generation', 'pricing', 'competitive_analysis'],
});

// Department definition
export const salesDepartment = new Department({
  id: 'sales-department',
  name: 'Sales Department',
  type: 'sales',
  description: 'AI-powered sales team with SDR, AE, Ops, Outreach, and Proposal agents',
  head: aeAgent,
  agents: [sdrAgent, aeAgent, salesOpsAgent, outreachAgent, proposalAgent],
  workflows: [
    'lead-qualification-pipeline',
    'linkedin-outreach',
    'email-campaign',
    'discovery-call',
    'demo-scheduler',
    'proposal-generator',
    'pipeline-forecast',
    'competitor-monitor',
    'auto-followup',
    'crm-cleanup',
  ],
  twins: ['lead_twin', 'customer_twin', 'deal_twin', 'pipeline_twin', 'competitor_twin'],
  memory: ['lead_history', 'outreach_templates', 'proposal_templates'],
});

// Metrics
export const departmentMetrics = {
  name: 'Sales Department',
  agents: 5,
  estimatedMonthlyCost: 45000, // INR
  currency: 'INR',
  workflows: 10,
  integrations: ['crm', 'email', 'calendar', 'linkedin', 'analytics'],
  skills: [
    'lead_qualification',
    'company_research',
    'email_outreach',
    'meeting_booking',
    'discovery',
    'demo',
    'proposal',
    'negotiation',
    'closing',
    'pipeline_analytics',
    'forecast',
    'territory_management',
    'commission_calc',
    'cold_email',
    'linkedin_outreach',
    'follow_up',
    'document_generation',
    'pricing_optimization',
    'competitive_analysis',
  ],
};

// Routing logic
export async function routeToAgent(task: any): Promise<Agent> {
  const { type, priority, score } = task;

  switch (type) {
    case 'lead_created':
      return sdrAgent;
    case 'meeting_scheduled':
      return aeAgent;
    case 'proposal_requested':
      return proposalAgent;
    case 'pipeline_review':
      return salesOpsAgent;
    case 'outreach_sequence':
      return outreachAgent;
    default:
      return aeAgent;
  }
}

export default salesDepartment;
