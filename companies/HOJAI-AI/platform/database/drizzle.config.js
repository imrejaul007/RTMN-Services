/**
 * HOJAI Database Schema (Drizzle ORM)
 */

import { pgTable, varchar, text, timestamp, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const planEnum = pgEnum('plan', ['starter', 'growth', 'enterprise']);
export const statusEnum = pgEnum('status', ['active', 'inactive', 'suspended']);
export const nodeStatusEnum = pgEnum('node_status', ['pending', 'running', 'completed', 'failed']);

// Tenants
export const tenants = pgTable('tenants', {
  id: varchar('id', { length: 36 }).primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  plan: planEnum('plan').default('starter'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  limits: jsonb('limits').$type<{ workflows: number; agents: number; seats: number }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Users
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 36 }).references(() => tenants.id),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 50 }).default('member'),
  status: statusEnum('status').default('active'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Workflows
export const workflows = pgTable('workflows', {
  id: varchar('id', { length: 36 }).primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 36 }).references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  trigger: jsonb('trigger').$type<{
    type: string;
    config: Record<string, any>
  }>(),
  nodes: jsonb('nodes').$type<Array<{
    id: string;
    type: string;
    name: string;
    config: Record<string, any>;
  }>>(),
  connections: jsonb('connections').$type<Array<{
    source: string;
    target: string;
  }>>(),
  status: statusEnum('status').default('inactive'),
  version: varchar('version', { length: 20 }).default('1.0.0'),
  createdBy: varchar('created_by', { length: 36 }).references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Executions
export const executions = pgTable('executions', {
  id: varchar('id', { length: 36 }).primaryKey().defaultRandom(),
  workflowId: varchar('workflow_id', { length: 36 }).references(() => workflows.id),
  tenantId: varchar('tenant_id', { length: 36 }).references(() => tenants.id),
  status: nodeStatusEnum('status').default('pending'),
  trigger: varchar('trigger', { length: 100 }),
  input: jsonb('input').$type<any>(),
  output: jsonb('output').$type<any>(),
  error: text('error'),
  tokensUsed: integer('tokens_used'),
  costMsat: integer('cost_msat'), // milliseconds of execution
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Agents
export const agents = pgTable('agents', {
  id: varchar('id', { length: 36 }).primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 36 }).references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 100 }),
  instructions: text('instructions'),
  skills: jsonb('skills').$type<string[]>(),
  tools: jsonb('tools').$type<string[]>(),
  llm: jsonb('llm').$type<{
    provider: string;
    model: string;
  }>(),
  status: statusEnum('status').default('inactive'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Conversations (agent sessions)
export const conversations = pgTable('conversations', {
  id: varchar('id', { length: 36 }).primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 36 }).references(() => agents.id),
  tenantId: varchar('tenant_id', { length: 36 }).references(() => tenants.id),
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  messages: jsonb('messages').$type<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Integrations
export const integrations = pgTable('integrations', {
  id: varchar('id', { length: 36 }).primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 36 }).references(() => tenants.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // slack, salesforce, gmail, etc.
  credentials: jsonb('credentials').$type<Record<string, string>>(), // encrypted
  settings: jsonb('settings').$type<Record<string, any>>(),
  status: statusEnum('status').default('inactive'),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 36 }).references(() => tenants.id),
  userId: varchar('user_id', { length: 36 }),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: varchar('resource_id', { length: 36 }),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  ip: varchar('ip', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  workflows: many(workflows),
  agents: many(agents),
  integrations: many(integrations),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  tenant: one(tenants, { fields: [workflows.tenantId], references: [tenants.id }),
  executions: many(executions),
}));
