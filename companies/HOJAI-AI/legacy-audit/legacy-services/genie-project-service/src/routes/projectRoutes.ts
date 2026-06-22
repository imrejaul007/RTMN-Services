/**
 * GENIE Project Service - Project Routes
 * Version: 1.0.0 | Date: May 31, 2026
 * Purpose: API routes for project operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateMilestoneSchema,
  ListProjectsQuerySchema,
  ListTasksQuerySchema,
} from '../types.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import * as projectService from '../services/projectService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('project-routes');
const router = Router();

// ============================================================================
// Helper Functions
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createResponse<T>(success: boolean, data?: T, error?: { code: string; message: string; details?: Record<string, unknown> }, meta?: Record<string, unknown>) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...meta,
    },
  };
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Middleware
// ============================================================================

router.use(tenantMiddleware());

// ============================================================================
// Statistics
// ============================================================================

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;

  logger.info('get_stats', { userId, tenantId });

  const stats = await projectService.getProjectStats(userId);

  res.json(createResponse(true, stats, undefined, { tenantId }));
}));

// ============================================================================
// Projects
// ============================================================================

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;

  const queryResult = ListProjectsQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json(createResponse(false, undefined, {
      code: 'INVALID_QUERY',
      message: 'Invalid query parameters',
      details: queryResult.error.flatten(),
    }));
    return;
  }

  const query = queryResult.data;

  logger.info('list_projects', { userId, tenantId });

  const result = await projectService.listProjects(userId, query);

  res.json({
    success: true,
    data: result.projects,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      hasMore: result.page * result.pageSize < result.total,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      tenantId,
    },
  });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;

  const parseResult = CreateProjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: parseResult.error.flatten(),
    }));
    return;
  }

  const input = parseResult.data;

  logger.info('create_project', { userId, tenantId });

  const project = await projectService.createProject(userId, input);

  res.status(201).json(createResponse(true, project, undefined, { tenantId }));
}));

router.get('/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const projectId = req.params.projectId;

  logger.info('get_project', { userId, tenantId, projectId });

  const project = await projectService.getProjectById(projectId, userId);

  if (!project) {
    res.status(404).json(createResponse(false, undefined, {
      code: 'PROJECT_NOT_FOUND',
      message: 'Project not found',
    }));
    return;
  }

  res.json(createResponse(true, project, undefined, { tenantId }));
}));

router.patch('/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const projectId = req.params.projectId;

  const parseResult = UpdateProjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: parseResult.error.flatten(),
    }));
    return;
  }

  const input = parseResult.data;

  logger.info('update_project', { userId, tenantId, projectId });

  const project = await projectService.updateProject(projectId, userId, input);

  if (!project) {
    res.status(404).json(createResponse(false, undefined, {
      code: 'PROJECT_NOT_FOUND',
      message: 'Project not found',
    }));
    return;
  }

  res.json(createResponse(true, project, undefined, { tenantId }));
}));

router.delete('/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const projectId = req.params.projectId;

  logger.info('delete_project', { userId, tenantId, projectId });

  const deleted = await projectService.deleteProject(projectId, userId);

  if (!deleted) {
    res.status(404).json(createResponse(false, undefined, {
      code: 'PROJECT_NOT_FOUND',
      message: 'Project not found',
    }));
    return;
  }

  res.json(createResponse(true, { deleted: true, id: projectId }, undefined, { tenantId }));
}));

// ============================================================================
// Tasks
// ============================================================================

router.get('/:projectId/tasks', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const projectId = req.params.projectId;

  logger.info('get_project_tasks', { userId, tenantId, projectId });

  const tasks = await projectService.getProjectTasks(projectId, userId);

  res.json(createResponse(true, tasks, undefined, { tenantId }));
}));

router.get('/tasks/all', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;

  const queryResult = ListTasksQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json(createResponse(false, undefined, {
      code: 'INVALID_QUERY',
      message: 'Invalid query parameters',
      details: queryResult.error.flatten(),
    }));
    return;
  }

  const query = queryResult.data;

  logger.info('list_tasks', { userId, tenantId });

  const result = await projectService.listTasks(userId, query);

  res.json({
    success: true,
    data: result.tasks,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      hasMore: result.page * result.pageSize < result.total,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      tenantId,
    },
  });
}));

router.post('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;

  const parseResult = CreateTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: parseResult.error.flatten(),
    }));
    return;
  }

  const input = parseResult.data;

  logger.info('create_task', { userId, tenantId });

  const task = await projectService.createTask(userId, input);

  res.status(201).json(createResponse(true, task, undefined, { tenantId }));
}));

router.get('/tasks/:taskId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const taskId = req.params.taskId;

  logger.info('get_task', { userId, tenantId, taskId });

  const task = await projectService.getTaskById(taskId, userId);

  if (!task) {
    res.status(404).json(createResponse(false, undefined, {
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    }));
    return;
  }

  res.json(createResponse(true, task, undefined, { tenantId }));
}));

router.patch('/tasks/:taskId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const taskId = req.params.taskId;

  const parseResult = UpdateTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: parseResult.error.flatten(),
    }));
    return;
  }

  const input = parseResult.data;

  logger.info('update_task', { userId, tenantId, taskId });

  const task = await projectService.updateTask(taskId, userId, input);

  if (!task) {
    res.status(404).json(createResponse(false, undefined, {
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    }));
    return;
  }

  res.json(createResponse(true, task, undefined, { tenantId }));
}));

router.delete('/tasks/:taskId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const taskId = req.params.taskId;

  logger.info('delete_task', { userId, tenantId, taskId });

  const deleted = await projectService.deleteTask(taskId, userId);

  if (!deleted) {
    res.status(404).json(createResponse(false, undefined, {
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    }));
    return;
  }

  res.json(createResponse(true, { deleted: true, id: taskId }, undefined, { tenantId }));
}));

// ============================================================================
// Milestones
// ============================================================================

router.post('/:projectId/milestones', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const projectId = req.params.projectId;

  const parseResult = CreateMilestoneSchema.safeParse({
    ...req.body,
    project_id: projectId,
  });
  if (!parseResult.success) {
    res.status(400).json(createResponse(false, undefined, {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: parseResult.error.flatten(),
    }));
    return;
  }

  const input = parseResult.data;

  logger.info('create_milestone', { userId, tenantId, projectId });

  try {
    const milestone = await projectService.createMilestone(userId, input);
    res.status(201).json(createResponse(true, milestone, undefined, { tenantId }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Project not found') {
      res.status(404).json(createResponse(false, undefined, {
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      }));
      return;
    }
    throw error;
  }
}));

router.get('/:projectId/milestones', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantContext!.tenant_id;
  const projectId = req.params.projectId;

  logger.info('get_milestones', { tenantId, projectId });

  const milestones = await projectService.getProjectMilestones(projectId);

  res.json(createResponse(true, milestones, undefined, { tenantId }));
}));

router.patch('/milestones/:milestoneId/complete', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const milestoneId = req.params.milestoneId;

  logger.info('complete_milestone', { userId, tenantId, milestoneId });

  const milestone = await projectService.completeMilestone(milestoneId, userId);

  if (!milestone) {
    res.status(404).json(createResponse(false, undefined, {
      code: 'MILESTONE_NOT_FOUND',
      message: 'Milestone not found',
    }));
    return;
  }

  res.json(createResponse(true, milestone, undefined, { tenantId }));
}));

router.delete('/milestones/:milestoneId', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const tenantId = req.tenantContext!.tenant_id;
  const milestoneId = req.params.milestoneId;

  logger.info('delete_milestone', { userId, tenantId, milestoneId });

  const deleted = await projectService.deleteMilestone(milestoneId, userId);

  if (!deleted) {
    res.status(404).json(createResponse(false, undefined, {
      code: 'MILESTONE_NOT_FOUND',
      message: 'Milestone not found',
    }));
    return;
  }

  res.json(createResponse(true, { deleted: true, id: milestoneId }, undefined, { tenantId }));
}));

export default router;
