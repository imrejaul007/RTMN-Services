/**
 * Hojai Data Models - Event, Workflow, Agent, Campaign Entities
 * Version: 1.0.0 | Date: May 30, 2026
 *
 * Event: System events across the platform
 * Workflow: Automation workflows
 * Agent: AI employees
 * Campaign: Marketing campaigns
 */

import { z } from 'zod';

// ============================================
// EVENT TYPES
// ============================================

export type EventCategory =
  | 'commerce'
  | 'identity'
  | 'loyalty'
  | 'engagement'
  | 'support'
  | 'communication'
  | 'ai'
  | 'workflow'
  | 'system';

export type EventActorType = 'customer' | 'user' | 'ai' | 'system';

export interface Event {
  id: string;
  tenant_id: string;
  type: string;
  category: EventCategory;
  source: string;
  subject_type?: string;
  subject_id?: string;
  actor_type?: EventActorType;
  actor_id?: string;
  data: Record<string, unknown>;
  diff?: Record<string, { before: unknown; after: unknown }>;
  correlation_id?: string;
  causation_id?: string;
  location_id?: string;
  occurred_at: string;
  created_at: string;
  expires_at?: string;
}

export function createEvent(
  tenantId: string,
  type: string,
  category: EventCategory,
  source: string,
  data: Record<string, unknown>,
  options?: Partial<Omit<Event, 'id' | 'tenant_id' | 'type' | 'category' | 'source' | 'data' | 'created_at'>>
): Event {
  const now = new Date().toISOString();
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    type,
    category,
    source,
    data,
    occurred_at: now,
    created_at: now,
    ...options,
  };
}

// ============================================
// WORKFLOW TYPES
// ============================================

export type WorkflowType = 'automation' | 'sequence' | 'broadcast' | 'reaction';
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'stopped';
export type WorkflowTriggerType = 'event' | 'schedule' | 'manual' | 'api';
export type WorkflowStepType = 'message' | 'delay' | 'condition' | 'action' | 'ai';

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  event_type?: string;
  schedule_cron?: string;
  schedule_timezone?: string;
}

export interface WorkflowStep {
  id: string;
  order: number;
  type: WorkflowStepType;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: WorkflowType;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  tenant_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  context: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  error?: string;
}

export const WorkflowCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['automation', 'sequence', 'broadcast', 'reaction']),
  trigger: z.object({
    type: z.enum(['event', 'schedule', 'manual', 'api']),
    event_type: z.string().optional(),
    schedule_cron: z.string().optional(),
  }),
  steps: z.array(z.object({
    type: z.enum(['message', 'delay', 'condition', 'action', 'ai']),
    config: z.record(z.unknown()),
  })),
});

export function createWorkflow(
  tenantId: string,
  createdBy: string,
  data: z.infer<typeof WorkflowCreateSchema>
): Workflow {
  const now = new Date().toISOString();
  return {
    id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    name: data.name,
    description: data.description,
    type: data.type,
    status: 'draft',
    trigger: data.trigger,
    steps: data.steps.map((s, i) => ({
      ...s,
      id: `step_${i}`,
      order: i,
    })),
    version: 1,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };
}

// ============================================
// AGENT TYPES
// ============================================

export type AgentType = 'support' | 'sales' | 'booking' | 'marketing' | 'retention' | 'care';
export type AgentStatus = 'active' | 'training' | 'inactive';

export interface AgentConfig {
  working_hours: {
    enabled: boolean;
    timezone: string;
    schedule: { day: number; start: string; end: string }[];
  };
  channels: string[];
  languages: string[];
  handoff: {
    enabled: boolean;
    conditions: { type: string; value: unknown }[];
    message: string;
  };
  max_response_time_seconds: number;
}

export interface AgentBehavior {
  tone: 'formal' | 'friendly' | 'casual';
  use_emoji: boolean;
  max_response_length: number;
  traits: string[];
  disallowed_topics: string[];
}

export interface AgentStats {
  total_conversations: number;
  resolved_conversations: number;
  escalated_conversations: number;
  avg_resolution_time_minutes: number;
  avg_csat_score: number;
}

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  title?: string;
  avatar_url?: string;
  description?: string;
  type: AgentType;
  status: AgentStatus;
  version: number;
  config: AgentConfig;
  behavior: AgentBehavior;
  knowledge_base_ids: string[];
  fallback_agent_id?: string;
  stats: AgentStats;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_trained_at?: string;
}

export const AgentCreateSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  type: z.enum(['support', 'sales', 'booking', 'marketing', 'retention', 'care']),
  description: z.string().optional(),
  config: z.object({
    working_hours: z.object({
      enabled: z.boolean(),
      timezone: z.string(),
    }),
    channels: z.array(z.string()),
    languages: z.array(z.string()),
    handoff: z.object({
      enabled: z.boolean(),
      message: z.string(),
    }),
  }),
  behavior: z.object({
    tone: z.enum(['formal', 'friendly', 'casual']),
    use_emoji: z.boolean(),
    max_response_length: z.number(),
    traits: z.array(z.string()),
    disallowed_topics: z.array(z.string()),
  }),
});

export function createAgent(
  tenantId: string,
  createdBy: string,
  data: z.infer<typeof AgentCreateSchema>
): Agent {
  const now = new Date().toISOString();
  return {
    id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    name: data.name,
    title: data.title,
    description: data.description,
    type: data.type,
    status: 'inactive',
    version: 1,
    config: {
      working_hours: data.config.working_hours,
      channels: data.config.channels,
      languages: data.config.languages,
      handoff: {
        ...data.config.handoff,
        conditions: [],
      },
      max_response_time_seconds: 30,
    },
    behavior: data.behavior,
    knowledge_base_ids: [],
    stats: {
      total_conversations: 0,
      resolved_conversations: 0,
      escalated_conversations: 0,
      avg_resolution_time_minutes: 0,
      avg_csat_score: 0,
    },
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };
}

// ============================================
// CAMPAIGN TYPES
// ============================================

export type CampaignType = 'broadcast' | 'triggered' | 'automated' | 'personalized';
export type CampaignChannel = 'whatsapp' | 'email' | 'sms' | 'push';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';

export interface CampaignContent {
  subject?: string;
  body: string;
  media?: { type: string; url: string };
  buttons?: { text: string; action: string }[];
}

export interface CampaignStats {
  audience_size: number;
  sent: number;
  delivered: number;
  opened?: number;
  clicked?: number;
  converted?: number;
  failed: number;
  opted_out: number;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: CampaignType;
  channel: CampaignChannel;
  segments: string[];
  exclusion_segments?: string[];
  content: CampaignContent;
  status: CampaignStatus;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  budget?: number;
  stats: CampaignStats;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const CampaignCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['broadcast', 'triggered', 'automated', 'personalized']),
  channel: z.enum(['whatsapp', 'email', 'sms', 'push']),
  segments: z.array(z.string()).min(1),
  content: z.object({
    subject: z.string().optional(),
    body: z.string().min(1),
  }),
  scheduled_at: z.string().datetime().optional(),
});

export function createCampaign(
  tenantId: string,
  createdBy: string,
  data: z.infer<typeof CampaignCreateSchema>
): Campaign {
  const now = new Date().toISOString();
  return {
    id: `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: tenantId,
    name: data.name,
    description: data.description,
    type: data.type,
    channel: data.channel,
    segments: data.segments,
    content: data.content,
    status: data.scheduled_at ? 'scheduled' : 'draft',
    scheduled_at: data.scheduled_at,
    stats: {
      audience_size: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      opted_out: 0,
    },
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };
}
