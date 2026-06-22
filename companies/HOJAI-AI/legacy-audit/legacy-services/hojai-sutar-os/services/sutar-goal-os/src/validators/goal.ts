// ============================================================================
// SUTAR GoalOS - Zod Validators
// ============================================================================

import { z } from 'zod';
import {
  GoalStatus,
  Priority,
  GoalCategory,
  MilestoneStatus,
  OKRStatus,
  KeyResultType,
} from '../types/index.js';

// Enum schemas
export const GoalStatusSchema = z.nativeEnum(GoalStatus);
export const PrioritySchema = z.nativeEnum(Priority);
export const GoalCategorySchema = z.nativeEnum(GoalCategory);
export const MilestoneStatusSchema = z.nativeEnum(MilestoneStatus);
export const OKRStatusSchema = z.nativeEnum(OKRStatus);
export const KeyResultTypeSchema = z.nativeEnum(KeyResultType);

// Progress schema
export const ProgressSchema = z.object({
  current: z.number().min(0),
  target: z.number().min(0),
  percentage: z.number().min(0).max(100),
  trend: z.enum(['up', 'down', 'stable']),
  lastUpdated: z.string().datetime(),
});

// Goal schemas
export const CreateGoalRequestSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  category: GoalCategorySchema,
  priority: PrioritySchema.optional().default(Priority.MEDIUM),
  deadline: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  parentGoalId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateGoalRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  category: GoalCategorySchema.optional(),
  status: GoalStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  deadline: z.string().datetime().optional(),
  progress: ProgressSchema.partial().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ListGoalsQuerySchema = z.object({
  status: GoalStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  category: GoalCategorySchema.optional(),
  parentGoalId: z.string().uuid().optional(),
  tags: z.string().optional(), // comma-separated
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

// Decomposition schema
export const DecomposeGoalRequestSchema = z.object({
  strategy: z.enum(['auto', 'manual']).optional().default('auto'),
  maxSubGoals: z.coerce.number().min(1).max(20).optional().default(5),
  depth: z.coerce.number().min(1).max(5).optional().default(2),
});

// Milestone schemas
export const CreateMilestoneRequestSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  targetDate: z.string().datetime(),
});

export const UpdateMilestoneRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  targetDate: z.string().datetime().optional(),
  status: MilestoneStatusSchema.optional(),
  progress: ProgressSchema.partial().optional(),
});

// OKR schemas
export const CreateKeyResultSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  type: KeyResultTypeSchema,
  targetValue: z.number(),
  unit: z.string().optional(),
});

export const CreateOKRRequestSchema = z.object({
  objectiveTitle: z.string().min(1).max(500),
  objectiveDescription: z.string().max(2000).optional(),
  quarter: z.string().regex(/^Q[1-4]$/).optional(),
  year: z.coerce.number().min(2020).max(2100).optional(),
  keyResults: z.array(CreateKeyResultSchema).min(1).max(10),
});

export const UpdateKeyResultRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  currentValue: z.number().optional(),
  targetValue: z.number().optional(),
  unit: z.string().optional(),
  status: OKRStatusSchema.optional(),
});

export const UpdateObjectiveRequestSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  status: OKRStatusSchema.optional(),
  quarter: z.string().regex(/^Q[1-4]$/).optional(),
  year: z.coerce.number().min(2020).max(2100).optional(),
});

// Progress update schema
export const UpdateProgressRequestSchema = z.object({
  current: z.number().min(0),
  target: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

// Query schemas
export const GetAnalyticsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
});

// Param schemas
export const GoalIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const MilestoneIdParamSchema = z.object({
  id: z.string().uuid(),
  milestoneId: z.string().uuid(),
});

export const OKRIdParamSchema = z.object({
  id: z.string().uuid(),
  okrId: z.string().uuid(),
});

export const KeyResultIdParamSchema = z.object({
  id: z.string().uuid(),
  okrId: z.string().uuid(),
  krId: z.string().uuid(),
});