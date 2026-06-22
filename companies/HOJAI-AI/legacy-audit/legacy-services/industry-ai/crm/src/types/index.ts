/**
 * CRM Service - Type Definitions
 */

import { z } from 'zod';

// Customer Schema
export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(['active', 'inactive', 'lead', 'churned']).default('lead'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  source: z.string().optional(),
  ownerId: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Customer = z.infer<typeof CustomerSchema>;

// Lead Schema
export const LeadSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).default('new'),
  value: z.number().optional(),
  probability: z.number().min(0).max(100).default(0),
  expectedCloseDate: z.date().optional(),
  notes: z.array(z.object({
    id: z.string(),
    text: z.string(),
    author: z.string(),
    createdAt: z.date(),
  })).default([]),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Lead = z.infer<typeof LeadSchema>;

// Deal Schema
export const DealSchema = z.object({
  id: z.string(),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  title: z.string().min(1).max(500),
  value: z.number().min(0),
  status: z.enum(['open', 'won', 'lost']).default('open'),
  stage: z.string().default('qualification'),
  probability: z.number().min(0).max(100).default(10),
  expectedCloseDate: z.date().optional(),
  actualCloseDate: z.date().optional(),
  ownerId: z.string(),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Deal = z.infer<typeof DealSchema>;

// Activity Schema
export const ActivitySchema = z.object({
  id: z.string(),
  type: z.enum(['call', 'email', 'meeting', 'note', 'task', 'other']),
  customerId: z.string().optional(),
  dealId: z.string().optional(),
  subject: z.string(),
  description: z.string().optional(),
  duration: z.number().optional(), // minutes
  outcome: z.string().optional(),
  scheduledAt: z.date().optional(),
  completedAt: z.date().optional(),
  ownerId: z.string(),
  createdAt: z.date().default(() => new Date()),
});
export type Activity = z.infer<typeof ActivitySchema>;

// Task Schema
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  customerId: z.string().optional(),
  dealId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  dueDate: z.date().optional(),
  assigneeId: z.string(),
  createdById: z.string(),
  completedAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Task = z.infer<typeof TaskSchema>;

// API Request Schemas
export const CreateCustomerRequestSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
});
export type CreateCustomerRequest = z.infer<typeof CreateCustomerRequestSchema>;

export const CreateDealRequestSchema = z.object({
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  title: z.string().min(1).max(500),
  value: z.number().min(0),
  stage: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  ownerId: z.string(),
  notes: z.string().optional(),
});
export type CreateDealRequest = z.infer<typeof CreateDealRequestSchema>;

export const CreateActivityRequestSchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'note', 'task', 'other']),
  customerId: z.string().optional(),
  dealId: z.string().optional(),
  subject: z.string().min(1).max(500),
  description: z.string().optional(),
  duration: z.number().optional(),
  outcome: z.string().optional(),
  scheduledAt: z.string().optional(),
  ownerId: z.string(),
});
export type CreateActivityRequest = z.infer<typeof CreateActivityRequestSchema>;

export const CreateTaskRequestSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  customerId: z.string().optional(),
  dealId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string(),
});
export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
