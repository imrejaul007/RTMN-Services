import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';
import {
  IssueCategory,
  IssuePriority,
  IssueStatus,
  ResolutionStatus,
  StepStatus,
  StepType,
  TemplateCategory,
  EscalationLevel
} from '../models/resolution';

// Validation schemas
export const IssueSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be at most 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
  category: z.nativeEnum(IssueCategory, {
    errorMap: () => ({ message: 'Invalid issue category' })
  }),
  priority: z.nativeEnum(IssuePriority, {
    errorMap: () => ({ message: 'Invalid priority level' })
  }),
  customerId: z.string().min(1, 'Customer ID is required'),
  agentId: z.string().optional(),
  context: z.object({
    customerId: z.string().optional(),
    customerTier: z.enum(['free', 'basic', 'premium', 'enterprise']).optional(),
    product: z.string().optional(),
    previousIssues: z.number().min(0).optional(),
    customerSatisfaction: z.number().min(0).max(5).optional(),
    contractValue: z.number().min(0).optional(),
    slaTier: z.enum(['standard', 'priority', 'premium']).optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional()
  }).optional()
});

export const PlanUpdateSchema = z.object({
  status: z.nativeEnum(ResolutionStatus).optional(),
  assignedAgentId: z.string().optional(),
  notes: z.string().optional()
});

export const StepUpdateSchema = z.object({
  status: z.nativeEnum(StepStatus),
  notes: z.string().optional(),
  completedBy: z.string().optional()
});

export const ActionItemUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  completedBy: z.string().optional()
});

export const TemplateCreateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description too long'),
  category: z.nativeEnum(TemplateCategory),
  applicableCategories: z.array(z.nativeEnum(IssueCategory)).min(1, 'At least one category required'),
  applicablePriorities: z.array(z.nativeEnum(IssuePriority)).min(1, 'At least one priority required'),
  steps: z.array(z.object({
    stepNumber: z.number().min(1),
    type: z.nativeEnum(StepType),
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    estimatedTime: z.number().min(1),
    conditions: z.array(z.string()).optional(),
    agentAction: z.object({
      action: z.string(),
      description: z.string(),
      instructions: z.string(),
      tools: z.array(z.string()).optional(),
      expectedOutcome: z.string(),
      estimatedTime: z.number(),
      preRequisites: z.array(z.string()).optional()
    }).optional(),
    customerAction: z.object({
      action: z.string(),
      description: z.string(),
      instructions: z.array(z.string()),
      expectedTime: z.number(),
      canSkip: z.boolean()
    }).optional()
  })).min(1, 'At least one step required'),
  successCriteria: z.array(z.object({
    description: z.string().min(1),
    type: z.enum(['functional', 'measurable', 'verifiable']),
    targetValue: z.string().optional(),
    currentValue: z.string().optional(),
    isMet: z.boolean().default(false)
  })).min(1, 'At least one success criteria required'),
  tags: z.array(z.string()).optional()
});

export const EscalationSchema = z.object({
  issueId: z.string().min(1, 'Issue ID is required'),
  reason: z.string().min(10, 'Escalation reason must be at least 10 characters'),
  targetLevel: z.nativeEnum(EscalationLevel).optional(),
  notes: z.string().optional()
});

export const ResolutionCompleteSchema = z.object({
  outcome: z.enum(['resolved', 'escalated', 'closed']),
  feedback: z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().max(500).optional()
  }).optional()
});

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

// Type exports
export type IssueInput = z.infer<typeof IssueSchema>;
export type PlanUpdateInput = z.infer<typeof PlanUpdateSchema>;
export type StepUpdateInput = z.infer<typeof StepUpdateSchema>;
export type ActionItemUpdateInput = z.infer<typeof ActionItemUpdateSchema>;
export type TemplateCreateInput = z.infer<typeof TemplateCreateSchema>;
export type EscalationInput = z.infer<typeof EscalationSchema>;
export type ResolutionCompleteInput = z.infer<typeof ResolutionCompleteSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;

// Validation middleware factory
export const validate = <T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        logger.warn('Validation failed', { errors, path: req.path });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
        return;
      }

      logger.error('Validation error', { error });
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
};

// Pre-built validation middlewares
export const validateIssue = validate(IssueSchema, 'body');
export const validatePlanUpdate = validate(PlanUpdateSchema, 'body');
export const validateStepUpdate = validate(StepUpdateSchema, 'body');
export const validateActionItemUpdate = validate(ActionItemUpdateSchema, 'body');
export const validateTemplateCreate = validate(TemplateCreateSchema, 'body');
export const validateEscalation = validate(EscalationSchema, 'body');
export const validateResolutionComplete = validate(ResolutionCompleteSchema, 'body');
export const validatePagination = validate(PaginationSchema, 'query');

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  res.setHeader('X-Request-ID', requestId);
  req.headers['x-request-id'] = requestId;
  next();
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Not found middleware
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
};

// Async handler wrapper
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
