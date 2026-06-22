/**
 * HOJAI ExpertOS - Type Definitions
 */

import { z } from 'zod';

// ============================================
// AGENT SCHEMAS
// ============================================

export const AgentStatusSchema = z.enum(['idle', 'running', 'paused', 'error', 'stopped']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['conversational', 'task', 'automation', 'analysis', 'custom']),
  skills: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  config: z.record(z.unknown()).default({}),
  status: AgentStatusSchema.default('idle'),
  memory: z.record(z.unknown()).default({}),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  ownerId: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type Agent = z.infer<typeof AgentSchema>;

// ============================================
// SKILL SCHEMAS
// ============================================

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),
  category: z.string().optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).default({}),
  enabled: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
});
export type Skill = z.infer<typeof SkillSchema>;

// ============================================
// EXECUTION SCHEMAS
// ============================================

export const ExecutionStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const ExecutionLogSchema = z.object({
  timestamp: z.date(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
});

export const ExecutionMetricsSchema = z.object({
  duration: z.number().optional(),
  tokens: z.number().optional(),
  cost: z.number().optional(),
});

export const ExecutionSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  skillId: z.string(),
  input: z.record(z.unknown()).default({}),
  output: z.record(z.unknown()).optional(),
  status: ExecutionStatusSchema.default('pending'),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
  logs: z.array(ExecutionLogSchema).default([]),
  metrics: ExecutionMetricsSchema.optional(),
});
export type Execution = z.infer<typeof ExecutionSchema>;

// ============================================
// WORKFLOW SCHEMAS
// ============================================

export const WorkflowRetrySchema = z.object({
  maxAttempts: z.number().min(1).max(10).default(3),
  delay: z.number().min(0).max(60000).default(1000),
});

export const WorkflowStepSchema = z.object({
  id: z.string(),
  skillId: z.string(),
  input: z.record(z.unknown()).optional(),
  condition: z.string().optional(),
  retry: WorkflowRetrySchema.optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  steps: z.array(WorkflowStepSchema).min(1),
  parallel: z.boolean().default(false),
  errorHandling: z.enum(['stop', 'continue', 'retry']).default('stop'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

// ============================================
// EXPERT TWIN SCHEMAS
// ============================================

export const TrainingDataItemSchema = z.object({
  input: z.record(z.unknown()),
  output: z.record(z.unknown()),
  feedback: z.number().min(0).max(1).optional(),
});

export const ExpertTwinModelConfigSchema = z.object({
  type: z.string(),
  version: z.string(),
  config: z.record(z.unknown()),
});

export const ExpertTwinPerformanceSchema = z.object({
  accuracy: z.number().min(0).max(1),
  throughput: z.number(),
  latency: z.number(),
});

export const ExpertTwinSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  name: z.string().min(1).max(200),
  domain: z.string().optional(),
  expertise: z.array(z.string()).default([]),
  trainingData: z.array(TrainingDataItemSchema).default([]),
  model: ExpertTwinModelConfigSchema,
  performance: ExpertTwinPerformanceSchema,
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type ExpertTwin = z.infer<typeof ExpertTwinSchema>;

// Schema for creating expert twin (id is generated server-side)
export const CreateExpertTwinRequestSchema = ExpertTwinSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateExpertTwinRequest = z.infer<typeof CreateExpertTwinRequestSchema>;

// ============================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================

export const CreateAgentRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['conversational', 'task', 'automation', 'analysis', 'custom']).default('task'),
  skills: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  config: z.record(z.unknown()).default({}),
});
export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>;

export const UpdateAgentRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  skills: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
  status: z.enum(['idle', 'running', 'paused', 'error', 'stopped']).optional(),
});
export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequestSchema>;

export const InvokeAgentRequestSchema = z.object({
  input: z.record(z.unknown()),
  context: z.record(z.unknown()).optional(),
  timeout: z.number().min(1).max(300).optional(),
});
export type InvokeAgentRequest = z.infer<typeof InvokeAgentRequestSchema>;

export const TrainAgentRequestSchema = z.object({
  trainingData: z.array(TrainingDataItemSchema).min(1).max(10000),
  epochs: z.number().min(1).max(100).default(10),
  batchSize: z.number().min(1).max(256).default(32),
});
export type TrainAgentRequest = z.infer<typeof TrainAgentRequestSchema>;

export const CreateWorkflowRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  steps: z.array(WorkflowStepSchema).min(1),
  parallel: z.boolean().default(false),
  errorHandling: z.enum(['stop', 'continue', 'retry']).default('stop'),
});
export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowRequestSchema>;

export const UpdateExpertTwinRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  trainingData: z.array(TrainingDataItemSchema).optional(),
  model: ExpertTwinModelConfigSchema.optional(),
  performance: ExpertTwinPerformanceSchema.optional(),
});
export type UpdateExpertTwinRequest = z.infer<typeof UpdateExpertTwinRequestSchema>;

export const RegisterSkillRequestSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  version: z.string().default('1.0.0'),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
});
export type RegisterSkillRequest = z.infer<typeof RegisterSkillRequestSchema>;

export const ExecuteSkillRequestSchema = z.object({
  input: z.record(z.unknown()),
});
export type ExecuteSkillRequest = z.infer<typeof ExecuteSkillRequestSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateAgent(data: unknown): Agent {
  return AgentSchema.parse(data);
}

export function validateExecution(data: unknown): Execution {
  return ExecutionSchema.parse(data);
}

export function validateWorkflow(data: unknown): Workflow {
  return WorkflowSchema.parse(data);
}

export function validateCreateAgentRequest(data: unknown): CreateAgentRequest {
  return CreateAgentRequestSchema.parse(data);
}

export function validateInvokeAgentRequest(data: unknown): InvokeAgentRequest {
  return InvokeAgentRequestSchema.parse(data);
}

export function validateExpertTwin(data: unknown): ExpertTwin {
  return ExpertTwinSchema.parse(data);
}

export function validateCreateWorkflowRequest(data: unknown): CreateWorkflowRequest {
  return CreateWorkflowRequestSchema.parse(data);
}

export function validateUpdateExpertTwinRequest(data: unknown): UpdateExpertTwinRequest {
  return UpdateExpertTwinRequestSchema.parse(data);
}

export function validateRegisterSkillRequest(data: unknown): RegisterSkillRequest {
  return RegisterSkillRequestSchema.parse(data);
}

export function validateExecuteSkillRequest(data: unknown): ExecuteSkillRequest {
  return ExecuteSkillRequestSchema.parse(data);
}

// ============================================
// PAGINATION SCHEMAS
// ============================================

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const AgentListQuerySchema = PaginationQuerySchema.extend({
  ownerId: z.string().optional(),
  type: z.enum(['conversational', 'task', 'automation', 'analysis', 'custom']).optional(),
  status: z.enum(['idle', 'running', 'paused', 'error', 'stopped']).optional(),
});
export type AgentListQuery = z.infer<typeof AgentListQuerySchema>;

export const ExecutionListQuerySchema = PaginationQuerySchema.extend({
  agentId: z.string().uuid().optional(),
  status: ExecutionStatusSchema.optional(),
});
export type ExecutionListQuery = z.infer<typeof ExecutionListQuerySchema>;

export const ExpertTwinListQuerySchema = PaginationQuerySchema.extend({
  agentId: z.string().uuid().optional(),
});
export type ExpertTwinListQuery = z.infer<typeof ExpertTwinListQuerySchema>;

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const PaginatedResponseSchema = z.object({
  count: z.number(),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type PaginatedResponse<T> = {
  count: number;
  total: number;
  limit: number;
  offset: number;
  data: T[];
};

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

export const DeleteResponseSchema = z.object({
  deleted: z.boolean(),
});
export type DeleteResponse = z.infer<typeof DeleteResponseSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'alive', 'ready']),
  service: z.string(),
  version: z.string(),
  uptime: z.number(),
  timestamp: z.string(),
  mongo: z.boolean().optional(),
  redis: z.boolean().optional(),
  memory: z.object({
    heapUsed: z.number(),
    heapTotal: z.number(),
    rss: z.number(),
  }).optional(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;