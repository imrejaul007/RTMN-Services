import { z } from 'zod';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  DISABLED = 'disabled'
}

export enum StepType {
  TRIGGER = 'trigger',
  ACTION = 'action',
  CONDITION = 'condition',
  DELAY = 'delay',
  HTTP_REQUEST = 'http_request',
  TRANSFORM = 'transform',
  NOTIFICATION = 'notification'
}

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.DRAFT),
  trigger: z.object({
    type: z.string(), // 'event', 'schedule', 'manual', 'api'
    config: z.record(z.any())
  }),
  steps: z.array(z.object({
    id: z.string(),
    type: z.nativeEnum(StepType),
    name: z.string(),
    config: z.record(z.any()),
    next: z.string().optional(), // Step ID to go to next
    onError: z.string().optional() // Step ID to go to on error
  })),
  variables: z.record(z.any()).optional(),
  stats: z.object({
    totalRuns: z.number().default(0),
    successfulRuns: z.number().default(0),
    failedRuns: z.number().default(0),
    lastRunAt: z.date().optional()
  }).optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Workflow = z.infer<typeof WorkflowSchema>;

export const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workflowId: z.string().uuid(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  triggeredBy: z.string(),
  input: z.record(z.any()),
  output: z.record(z.any()).optional(),
  currentStep: z.string().optional(),
  stepResults: z.array(z.object({
    stepId: z.string(),
    stepName: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
    startedAt: z.date(),
    completedAt: z.date().optional(),
    output: z.record(z.any()).optional(),
    error: z.string().optional()
  })).optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  duration: z.number().optional()
});

export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;
