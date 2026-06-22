/**
 * HOJAI Database Schemas
 * Mongoose schemas for all entities
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// TENANT SCHEMA
// ============================================

export interface ITenant extends Document {
  _id: mongoose.Types.ObjectId;
  tenant_id: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export const TenantSchema = new Schema<ITenant>(
  {
    tenant_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    plan: {
      type: String,
      enum: ['starter', 'professional', 'enterprise'],
      default: 'starter'
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'trial'],
      default: 'trial'
    },
    settings: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

// ============================================
// AGENT SCHEMA
// ============================================

export interface IAgent extends Document {
  _id: mongoose.Types.ObjectId;
  tenant_id: string;
  name: string;
  type: string;
  role: 'assistant' | 'specialist' | 'autonomous' | 'manager';
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'training';
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export const AgentSchema = new Schema<IAgent>(
  {
    tenant_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    role: {
      type: String,
      enum: ['assistant', 'specialist', 'autonomous', 'manager'],
      default: 'assistant'
    },
    config: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['active', 'inactive', 'training'],
      default: 'active'
    },
    created_by: { type: String, required: true }
  },
  { timestamps: true }
);

// ============================================
// MEMORY SCHEMA
// ============================================

export interface IMemory extends Document {
  _id: mongoose.Types.ObjectId;
  tenant_id: string;
  entity_id: string;
  entity_type: 'customer' | 'agent' | 'conversation' | 'workflow';
  memory_type: 'semantic' | 'episodic' | 'procedural';
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  importance: number;
  created_at: Date;
  updated_at: Date;
}

export const MemorySchema = new Schema<IMemory>(
  {
    tenant_id: { type: String, required: true, index: true },
    entity_id: { type: String, required: true, index: true },
    entity_type: {
      type: String,
      enum: ['customer', 'agent', 'conversation', 'workflow'],
      required: true
    },
    memory_type: {
      type: String,
      enum: ['semantic', 'episodic', 'procedural'],
      default: 'semantic'
    },
    content: { type: String, required: true },
    embedding: { type: [Number], index: '2dsphere' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    importance: { type: Number, default: 0.5, min: 0, max: 1 }
  },
  { timestamps: true }
);

// ============================================
// CONVERSATION SCHEMA
// ============================================

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  tenant_id: string;
  customer_id: string;
  agent_id?: string;
  channel: 'whatsapp' | 'webchat' | 'api' | 'voice';
  status: 'active' | 'closed' | 'transferred';
  messages: IConversationMessage[];
  context: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  closed_at?: Date;
}

export interface IConversationMessage {
  id: string;
  role: 'customer' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  attachments?: { url: string; type: string }[];
  metadata?: Record<string, any>;
}

export const ConversationSchema = new Schema<IConversation>(
  {
    tenant_id: { type: String, required: true, index: true },
    customer_id: { type: String, required: true, index: true },
    agent_id: { type: String, index: true },
    channel: {
      type: String,
      enum: ['whatsapp', 'webchat', 'api', 'voice'],
      default: 'webchat'
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'transferred'],
      default: 'active'
    },
    messages: [
      {
        id: String,
        role: { type: String, enum: ['customer', 'agent', 'system'] },
        content: String,
        timestamp: Date,
        attachments: [
          {
            url: String,
            type: String
          }
        ],
        metadata: Schema.Types.Mixed
      }
    ],
    context: { type: Schema.Types.Mixed, default: {} },
    closed_at: Date
  },
  { timestamps: true }
);

// ============================================
// WORKFLOW SCHEMA
// ============================================

export interface IWorkflow extends Document {
  _id: mongoose.Types.ObjectId;
  tenant_id: string;
  name: string;
  type: 'automation' | 'sequence' | 'broadcast' | 'reaction';
  status: 'draft' | 'active' | 'paused' | 'stopped';
  trigger: {
    type: 'event' | 'schedule' | 'manual' | 'api';
    config: Record<string, any>;
  };
  steps: IWorkflowStep[];
  stats: {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
  };
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface IWorkflowStep {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  retry?: { max_attempts: number; backoff_seconds: number };
}

export const WorkflowSchema = new Schema<IWorkflow>(
  {
    tenant_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['automation', 'sequence', 'broadcast', 'reaction'],
      default: 'automation'
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'stopped'],
      default: 'draft'
    },
    trigger: {
      type: {
        type: String,
        enum: ['event', 'schedule', 'manual', 'api'],
        required: true
      },
      config: { type: Schema.Types.Mixed, default: {} }
    },
    steps: [
      {
        id: String,
        name: String,
        type: String,
        config: Schema.Types.Mixed,
        retry: Schema.Types.Mixed
      }
    ],
    stats: {
      total_executions: { type: Number, default: 0 },
      successful_executions: { type: Number, default: 0 },
      failed_executions: { type: Number, default: 0 }
    },
    created_by: { type: String, required: true }
  },
  { timestamps: true }
);

// ============================================
// EVENT SCHEMA
// ============================================

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  tenant_id: string;
  event_type: string;
  source: string;
  payload: Record<string, any>;
  correlation_id?: string;
  user_id?: string;
  timestamp: Date;
  processed: boolean;
  processed_at?: Date;
}

export const EventSchema = new Schema<IEvent>(
  {
    tenant_id: { type: String, required: true, index: true },
    event_type: { type: String, required: true, index: true },
    source: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    correlation_id: String,
    user_id: String,
    timestamp: { type: Date, default: Date.now, index: true },
    processed: { type: Boolean, default: false, index: true },
    processed_at: Date
  },
  { timestamps: false }
);

// ============================================
// AUDIT LOG SCHEMA
// ============================================

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  tenant_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, { before: any; after: any }>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

export const AuditLogSchema = new Schema<IAuditLog>(
  {
    tenant_id: { type: String, required: true, index: true },
    user_id: String,
    action: { type: String, required: true, index: true },
    resource_type: { type: String, required: true },
    resource_id: String,
    changes: Schema.Types.Mixed,
    ip_address: String,
    user_agent: String,
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

// ============================================
// EXPORT ALL SCHEMAS
// ============================================

export const schemas = {
  Tenant: mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema),
  Agent: mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema),
  Memory: mongoose.models.Memory || mongoose.model<IMemory>('Memory', MemorySchema),
  Conversation: mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema),
  Workflow: mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', WorkflowSchema),
  Event: mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema),
  AuditLog: mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
};
