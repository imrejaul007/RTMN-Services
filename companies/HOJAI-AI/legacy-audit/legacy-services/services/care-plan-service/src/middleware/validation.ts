import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// ============================================================================
// CARE PLAN SCHEMAS
// ============================================================================

export const createPlanSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional(),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  startDate: z.string().datetime({ message: 'Invalid start date format' }),
  endDate: z.string().datetime({ message: 'Invalid end date format' }),
  createdBy: z.string().min(1, 'Creator ID is required'),
  riskFactors: z.array(z.string()).optional().default([]),
  allergies: z.array(z.string()).optional().default([]),
  medications: z
    .array(
      z.object({
        name: z.string().min(1),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        startDate: z.string().datetime(),
        endDate: z.string().datetime().optional(),
      })
    )
    .optional()
    .default([]),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const updatePlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['draft', 'active', 'on_hold', 'completed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  nextReviewDate: z.string().datetime().optional(),
  updatedBy: z.string().optional(),
  riskFactors: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// GOAL SCHEMAS
// ============================================================================

export const milestoneSchema = z.object({
  title: z.string().min(1, 'Milestone title is required'),
  targetDate: z.string().datetime({ message: 'Invalid milestone target date' }),
  completed: z.boolean().optional().default(false),
  completedAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

export const measurementSchema = z.object({
  metric: z.string().min(1, 'Metric name is required'),
  currentValue: z.number().optional().default(0),
  targetValue: z.number().min(0, 'Target value must be non-negative'),
  unit: z.string().min(1, 'Unit is required'),
  lastUpdated: z.string().datetime().optional(),
});

export const addGoalSchema = z.object({
  type: z.enum(['short_term', 'long_term', 'maintenance', 'preventive', 'rehabilitation'], {
    errorMap: () => ({ message: 'Invalid goal type' }),
  }),
  description: z.string().min(1, 'Goal description is required').max(1000, 'Description too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  targetDate: z.string().datetime({ message: 'Invalid target date' }),
  startDate: z.string().datetime({ message: 'Invalid start date' }),
  milestones: z.array(milestoneSchema).optional().default([]),
  measurements: z.array(measurementSchema).optional().default([]),
  barriers: z.array(z.string()).optional().default([]),
  facilitators: z.array(z.string()).optional().default([]),
  notes: z.string().max(2000).optional(),
});

export const updateGoalSchema = z.object({
  description: z.string().min(1).max(1000).optional(),
  status: z
    .enum(['not_started', 'in_progress', 'on_track', 'at_risk', 'achieved', 'partially_achieved', 'not_achieved'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  targetDate: z.string().datetime().optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
  milestones: z.array(milestoneSchema).optional(),
  measurements: z.array(measurementSchema).optional(),
  barriers: z.array(z.string()).optional(),
  facilitators: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
  updatedBy: z.string().optional(),
});

export const trackProgressSchema = z.object({
  value: z.number().min(0, 'Progress value must be at least 0').max(100, 'Progress value cannot exceed 100'),
  note: z.string().max(500).optional(),
  updatedBy: z.string().optional(),
});

// ============================================================================
// INTERVENTION SCHEMAS
// ============================================================================

export const resourceSchema = z.object({
  type: z.string().min(1, 'Resource type is required'),
  description: z.string().min(1, 'Resource description is required'),
  url: z.string().url().optional(),
  cost: z.number().min(0).optional(),
});

export const reminderSchema = z.object({
  enabled: z.boolean().optional().default(false),
  frequency: z.string().optional(),
  times: z.array(z.string()).optional(),
});

export const addInterventionSchema = z.object({
  type: z.enum(['medication', 'therapy', 'lifestyle', 'education', 'monitoring', 'referral', 'procedure', 'support'], {
    errorMap: () => ({ message: 'Invalid intervention type' }),
  }),
  description: z.string().min(1, 'Intervention description is required').max(1000),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  assignedTo: z.string().min(1, 'Assigned person is required'),
  assignedToRole: z.string().optional(),
  startDate: z.string().datetime({ message: 'Invalid start date' }),
  endDate: z.string().datetime().optional(),
  resources: z.array(resourceSchema).optional().default([]),
  instructions: z.string().max(2000).optional(),
  expectedOutcome: z.string().max(1000).optional(),
  reminders: reminderSchema.optional(),
});

// ============================================================================
// NOTE SCHEMAS
// ============================================================================

export const attachmentSchema = z.object({
  name: z.string().min(1, 'Attachment name is required'),
  url: z.string().url('Invalid attachment URL'),
  type: z.string().min(1, 'Attachment type is required'),
  size: z.number().min(0, 'Size must be non-negative'),
});

export const addNoteSchema = z.object({
  authorId: z.string().min(1, 'Author ID is required'),
  authorName: z.string().min(1, 'Author name is required'),
  authorRole: z.string().min(1, 'Author role is required'),
  content: z.string().min(1, 'Note content is required').max(10000, 'Content too long'),
  type: z.enum(['general', 'clinical', 'progress', 'concern', 'communication', 'assessment']).optional().default('general'),
  isPrivate: z.boolean().optional().default(false),
  attachments: z.array(attachmentSchema).optional().default([]),
  relatedGoalIds: z.array(z.string()).optional().default([]),
  relatedInterventionIds: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
});

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const goalStatusChangeSchema = z.object({
  goalId: z.string().min(1, 'Goal ID is required'),
  previousStatus: z.string(),
  currentStatus: z.string(),
  changeNote: z.string().optional(),
});

export const interventionStatusChangeSchema = z.object({
  interventionId: z.string().min(1, 'Intervention ID is required'),
  previousStatus: z.string(),
  currentStatus: z.string(),
  changeNote: z.string().optional(),
});

export const addReviewSchema = z.object({
  reviewerId: z.string().min(1, 'Reviewer ID is required'),
  reviewerName: z.string().min(1, 'Reviewer name is required'),
  reviewerRole: z.string().min(1, 'Reviewer role is required'),
  date: z.string().datetime({ message: 'Invalid review date' }),
  type: z.enum(['scheduled', 'unscheduled', 'milestone', 'discharge']).optional().default('scheduled'),
  notes: z.string().min(1, 'Review notes are required').max(5000),
  outcome: z.enum(['improving', 'stable', 'declining', 'achieved'], {
    errorMap: () => ({ message: 'Invalid outcome type' }),
  }),
  goalStatuses: z.array(goalStatusChangeSchema).optional().default([]),
  interventionStatuses: z.array(interventionStatusChangeSchema).optional().default([]),
  recommendations: z.array(z.string()).optional().default([]),
  nextReviewDate: z.string().datetime().optional(),
  attachments: z.array(z.string()).optional().default([]),
});

// ============================================================================
// SUGGEST GOALS SCHEMA
// ============================================================================

export const suggestGoalsSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  conditions: z.array(z.string()).optional().default([]),
  previousGoals: z.array(z.string()).optional().default([]),
  category: z.string().optional(),
  constraints: z.array(z.string()).optional().default([]),
});

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

type ValidationSchema = z.ZodSchema<any>;

const schemaMap: Record<string, ValidationSchema> = {
  createPlan: createPlanSchema,
  updatePlan: updatePlanSchema,
  addGoal: addGoalSchema,
  updateGoal: updateGoalSchema,
  trackProgress: trackProgressSchema,
  addIntervention: addInterventionSchema,
  addNote: addNoteSchema,
  addReview: addReviewSchema,
  suggestGoals: suggestGoalsSchema,
};

export function validateRequest(schemaName: keyof typeof schemaMap) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const schema = schemaMap[schemaName];

    if (!schema) {
      logger.error(`Unknown validation schema: ${schemaName}`);
      res.status(500).json({
        success: false,
        error: 'Internal validation error',
      });
      return;
    }

    try {
      const data = req.method === 'GET' ? req.query : req.body;
      const validatedData = schema.parse(data);

      // Replace with validated data (type-coerced and sanitized)
      if (req.method === 'GET') {
        req.query = validatedData;
      } else {
        req.body = validatedData;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation failed', { schemaName, errors: error.errors });

        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
        });
        return;
      }

      logger.error('Unexpected validation error', { error, schemaName });
      res.status(500).json({
        success: false,
        error: 'Validation error',
      });
    }
  };
}

// ============================================================================
// ADDITIONAL VALIDATORS
// ============================================================================

export function validateObjectId(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];

    if (!id) {
      res.status(400).json({
        success: false,
        error: `Missing parameter: ${paramName}`,
      });
      return;
    }

    // Check for valid format (MongoDB ObjectId or custom format)
    const validIdPattern = /^[A-Z0-9]{8,}$|^[a-fA-F0-9]{24}$/;
    if (!validIdPattern.test(id)) {
      res.status(400).json({
        success: false,
        error: `Invalid ID format: ${id}`,
      });
      return;
    }

    next();
  };
}

export function validateDateRange(req: Request, res: Response, next: NextFunction): void {
  const { startDate, endDate } = req.body;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
      return;
    }

    if (end < start) {
      res.status(400).json({
        success: false,
        error: 'End date must be after start date',
      });
      return;
    }
  }

  next();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateRequest,
  validateObjectId,
  validateDateRange,
  schemas: schemaMap,
};
