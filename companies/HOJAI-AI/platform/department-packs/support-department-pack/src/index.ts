/**
 * Customer Support Department Pack
 * Complete AI support team with tickets, chat, and escalation
 */

import { Department } from '@hojai/agents';
import { AISupportAgent } from '../../agents/ai-support-agent/src';
import { Agent } from '@hojai/agents';

const ticketAgent = new AISupportAgent({ autoRespondConfidence: 0.8 });
const chatAgent = new Agent({
  id: 'chat-agent',
  name: 'Live Chat Agent',
  role: 'chat',
  description: 'Real-time chat support',
  skills: ['chat', 'real_time_response', 'sentiment_detection', 'escalation'],
});

const escalationAgent = new Agent({
  id: 'escalation-agent',
  name: 'Escalation Manager',
  role: 'escalation',
  description: 'Handle VIP customers and complex issues',
  skills: ['vip_support', 'complex_issues', 'compensation', 'retention'],
});

const knowledgeAgent = new Agent({
  id: 'knowledge-agent',
  name: 'Knowledge Base Manager',
  role: 'knowledge',
  description: 'Manage and update knowledge base',
  skills: ['kb_management', 'article_creation', 'search_optimization'],
});

const qualityAgent = new Agent({
  id: 'quality-agent',
  name: 'Quality Assurance',
  role: 'qa',
  description: 'Monitor and improve support quality',
  skills: ['quality_monitoring', 'csat_analysis', 'coaching', 'reporting'],
});

export const supportDepartment = new Department({
  id: 'support-department',
  name: 'Customer Support',
  type: 'support',
  description: 'AI-powered support with ticket, chat, escalation, and QA agents',
  head: escalationAgent,
  agents: [ticketAgent, chatAgent, escalationAgent, knowledgeAgent, qualityAgent],
  workflows: [
    'ticket-classifier',
    'ai-first-response',
    'knowledge-base-update',
    'sentiment-triage',
    'escalation-rules',
    'sla-monitor',
    'csat-analysis',
    'root-cause-analyzer',
  ],
  twins: ['ticket_twin', 'customer_twin', 'agent_twin', 'sla_twin'],
  memory: ['ticket_history', 'kb_articles', 'response_templates'],
});

export const supportMetrics = {
  agents: 5,
  estimatedMonthlyCost: 35000,
  workflows: 8,
  integrations: ['helpdesk', 'livechat', 'knowledge_base', 'crm', 'slack'],
};

export default supportDepartment;
