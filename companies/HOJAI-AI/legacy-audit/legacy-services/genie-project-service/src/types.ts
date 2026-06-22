/**
 * GENIE Project Service - Type Definitions
 * Version: 1.0.0 | Date: May 31, 2026
 * Purpose: Project tracking and task management for GENIE Personal Intelligence OS
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Project Status
 */
export type ProjectStatus = 'active' | 'completed' | 'paused' | 'archived';

/**
 * Project Priority
 */
export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Task Status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Task Priority
 */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Recurring Type
 */
export type RecurringType = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Project Interface
 */
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  tags: string[];
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  progress: number;
  task_count: number;
  completed_task_count: number;
  owner_id?: string;
  team_members: string[];
  created_at: string;
  updated_at?: string;
}

/**
 * Task Interface
 */
export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  assignee_id?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  subtasks: SubTask[];
  recurring?: RecurringConfig;
  dependencies: string[];
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * SubTask Interface
 */
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Recurring Config
 */
export interface RecurringConfig {
  type: RecurringType;
  end_date?: string;
  interval: number;
}

/**
 * Milestone Interface
 */
export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  due_date: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

/**
 * Project Input
 */
export interface ProjectInput {
  name: string;
  description?: string;
  priority?: ProjectPriority;
  tags?: string[];
  start_date?: string;
  due_date?: string;
  owner_id?: string;
  team_members?: string[];
}

/**
 * Project Update Input
 */
export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  tags?: string[];
  start_date?: string;
  due_date?: string;
  progress?: number;
}

/**
 * Task Input
 */
export interface TaskInput {
  project_id: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  assignee_id?: string;
  due_date?: string;
  estimated_hours?: number;
  subtasks?: SubTask[];
  recurring?: RecurringConfig;
  dependencies?: string[];
}

/**
 * Task Update Input
 */
export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  assignee_id?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  subtasks?: SubTask[];
  recurring?: RecurringConfig;
  dependencies?: string[];
}

/**
 * Milestone Input
 */
export interface MilestoneInput {
  project_id: string;
  name: string;
  description?: string;
  due_date: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    requestId: string;
    tenantId?: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

// ============================================================================
// Zod Schemas
// ============================================================================

// Project Status Schema
export const ProjectStatusSchema = z.enum(['active', 'completed', 'paused', 'archived']);

// Project Priority Schema
export const ProjectPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

// Task Status Schema
export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

// Task Priority Schema
export const TaskPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

// Recurring Type Schema
export const RecurringTypeSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

// Create Project Schema
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  priority: ProjectPrioritySchema.default('medium'),
  tags: z.array(z.string().max(50)).max(20).default([]),
  start_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  owner_id: z.string().optional(),
  team_members: z.array(z.string()).max(50).default([]),
});

// Update Project Schema
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: ProjectStatusSchema.optional(),
  priority: ProjectPrioritySchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  start_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  progress: z.number().min(0).max(100).optional(),
});

// Create Task Schema
export const CreateTaskSchema = z.object({
  project_id: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  priority: TaskPrioritySchema.default('medium'),
  tags: z.array(z.string().max(50)).max(20).default([]),
  assignee_id: z.string().optional(),
  due_date: z.string().datetime().optional(),
  estimated_hours: z.number().min(0).optional(),
  subtasks: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1).max(200),
    completed: z.boolean().default(false),
  })).optional(),
  recurring: z.object({
    type: RecurringTypeSchema,
    interval: z.number().min(1).default(1),
    end_date: z.string().datetime().optional(),
  }).optional(),
  dependencies: z.array(z.string()).max(20).default([]),
});

// Update Task Schema
export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  assignee_id: z.string().optional(),
  due_date: z.string().datetime().optional(),
  estimated_hours: z.number().min(0).optional(),
  actual_hours: z.number().min(0).optional(),
  subtasks: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1).max(200),
    completed: z.boolean(),
  })).optional(),
  recurring: z.object({
    type: RecurringTypeSchema,
    interval: z.number().min(1),
    end_date: z.string().datetime().optional(),
  }).optional(),
  dependencies: z.array(z.string()).max(20).optional(),
});

// Create Milestone Schema
export const CreateMilestoneSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  due_date: z.string().datetime(),
});

// Query Schemas
export const ListProjectsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: ProjectStatusSchema.optional(),
  priority: ProjectPrioritySchema.optional(),
  tags: z.array(z.string()).optional(),
  sort_by: z.enum(['created_at', 'due_date', 'priority', 'progress']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const ListTasksQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  project_id: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee_id: z.string().optional(),
  due_today: z.boolean().optional(),
  overdue: z.boolean().optional(),
  sort_by: z.enum(['created_at', 'due_date', 'priority']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// Type Inference
// ============================================================================

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>;
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;

// ============================================================================
// Tenant Context
// ============================================================================

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}

// ============================================================================
// Express Request Extension
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
    }
  }
}
