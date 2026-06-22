import { z } from 'zod';

// Agent Schemas
export const AgentTypeSchema = z.enum(['coordinator', 'executor', 'evaluator', 'specialist']);
export const AgentStatusSchema = z.enum(['available', 'busy', 'offline', 'error']);

// Task Schemas
export const TaskTypeSchema = z.enum(['analysis', 'execution', 'evaluation', 'coordination', 'collaborative']);
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const TaskStatusSchema = z.enum(['pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled']);

// Evaluation Schemas
export const EvaluationCriteriaSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(1),
  score: z.number().min(0),
  maxScore: z.number().positive(),
  notes: z.string().optional(),
});

export const EvaluationVerdictSchema = z.enum(['excellent', 'good', 'acceptable', 'poor', 'failed']);

// Consensus Schemas
export const DecisionTypeSchema = z.enum(['task_assignment', 'agent_selection', 'performance_review', 'capability_assessment']);

export const AgentVoteSchema = z.object({
  agentId: z.string().uuid(),
  vote: z.unknown(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

// Collaboration Schemas
export const CollaborationStrategySchema = z.enum(['sequential', 'parallel', 'hierarchical', 'democratic']);
export const CollaborationStatusSchema = z.enum(['pending', 'active', 'converging', 'completed', 'failed']);

// API Request Schemas
export const EvaluateRequestSchema = z.object({
  agentIds: z.array(z.string().uuid()).min(1),
  taskId: z.string().uuid().optional(),
  criteria: z.array(z.object({
    name: z.string().min(1),
    weight: z.number().min(0).max(1).optional(),
    score: z.number().min(0).optional(),
    maxScore: z.number().positive().optional(),
  })).optional(),
});

export const AssignRequestSchema = z.object({
  taskId: z.string().uuid(),
  preferredAgents: z.array(z.string().uuid()).optional(),
  requiredCapabilities: z.array(z.string().min(1)).optional(),
  priority: TaskPrioritySchema.optional(),
});

export const ConsensusRequestSchema = z.object({
  taskId: z.string().uuid(),
  agentIds: z.array(z.string().uuid()).min(2),
  decisionType: DecisionTypeSchema,
  context: z.record(z.unknown()).optional(),
});

export const CollaborateRequestSchema = z.object({
  taskId: z.string().uuid(),
  agentIds: z.array(z.string().uuid()).min(2),
  maxRounds: z.number().int().min(1).max(10).optional(),
  strategy: CollaborationStrategySchema.optional(),
});

// Validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    return { success: false, error: String(err) };
  }
}
