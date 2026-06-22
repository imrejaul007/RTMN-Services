import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { createResponse, createErrorResponse, TaskSummary, ExecutionContext } from '../types/index.js';

const logger = createLogger('hojai-business-copilot:execution');
const router = Router();

const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || 'http://localhost:4708';

// List tasks
router.get('/tasks', async (req, res) => {
  try {
    const { projectId, assignee, status, page = '1', limit = '20', tenantId } = req.query;

    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId as string);
    if (assignee) params.append('assignee', assignee as string);
    if (status) params.append('status', status as string);
    params.append('page', page as string);
    params.append('limit', limit as string);

    const response = await axios.get(`${PROJECT_SERVICE_URL}/api/tasks?${params}`, {
      headers: {
        'X-Tenant-Id': tenantId as string || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data as TaskSummary[]));
  } catch (error: any) {
    logger.error('tasks_list_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('EXECUTION_SERVICE_ERROR', error.message || 'Failed to list tasks')
    );
  }
});

// Get task by ID
router.get('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`${PROJECT_SERVICE_URL}/api/tasks/${id}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data as TaskSummary));
  } catch (error: any) {
    logger.error('task_fetch_error', { error: error.message, taskId: req.params.id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('EXECUTION_SERVICE_ERROR', error.message || 'Failed to fetch task')
    );
  }
});

// Create task
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, assignee, dueDate, projectId, priority, tenantId, userId } = req.body;

    if (!title) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'title is required'));
      return;
    }

    const response = await axios.post(`${PROJECT_SERVICE_URL}/api/tasks`, {
      title,
      description,
      assignee,
      dueDate,
      projectId,
      priority,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': userId || req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    logger.info('task_created', { taskId: response.data.id, title });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('task_create_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('EXECUTION_SERVICE_ERROR', error.message || 'Failed to create task')
    );
  }
});

// Update task
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assignee, dueDate, status, priority, tenantId, userId } = req.body;

    const response = await axios.put(`${PROJECT_SERVICE_URL}/api/tasks/${id}`, {
      title,
      description,
      assignee,
      dueDate,
      status,
      priority,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': userId || req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    logger.info('task_updated', { taskId: id });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('task_update_error', { error: error.message, taskId: req.params.id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('EXECUTION_SERVICE_ERROR', error.message || 'Failed to update task')
    );
  }
});

// Delete task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.delete(`${PROJECT_SERVICE_URL}/api/tasks/${id}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    logger.info('task_deleted', { taskId: id });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('task_delete_error', { error: error.message, taskId: req.params.id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('EXECUTION_SERVICE_ERROR', error.message || 'Failed to delete task')
    );
  }
});

// List projects
router.get('/projects', async (req, res) => {
  try {
    const { status, page = '1', limit = '20', tenantId } = req.query;

    const params = new URLSearchParams();
    if (status) params.append('status', status as string);
    params.append('page', page as string);
    params.append('limit', limit as string);

    const response = await axios.get(`${PROJECT_SERVICE_URL}/api/projects?${params}`, {
      headers: {
        'X-Tenant-Id': tenantId as string || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('projects_list_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('EXECUTION_SERVICE_ERROR', error.message || 'Failed to list projects')
    );
  }
});

// Get project by ID
router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`${PROJECT_SERVICE_URL}/api/projects/${id}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('project_fetch_error', { error: error.message, projectId: req.params.id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('EXECUTION_SERVICE_ERROR', error.message || 'Failed to fetch project')
    );
  }
});

// Create project
router.post('/projects', async (req, res) => {
  try {
    const { name, description, startDate, endDate, ownerId, tenantId, userId } = req.body;

    if (!name) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'name is required'));
      return;
    }

    const response = await axios.post(`${PROJECT_SERVICE_URL}/api/projects`, {
      name,
      description,
      startDate,
      endDate,
      ownerId,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': userId || req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    logger.info('project_created', { projectId: response.data.id, name });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('project_create_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('EXECUTION_SERVICE_ERROR', error.message || 'Failed to create project')
    );
  }
});

// Execute bulk operations
router.post('/bulk', async (req, res) => {
  try {
    const { operations, tenantId, userId } = req.body;

    if (!operations || !Array.isArray(operations)) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'operations array is required'));
      return;
    }

    const results = await Promise.allSettled(
      operations.map((op: any) =>
        axios.post(`${PROJECT_SERVICE_URL}/api/${op.endpoint}`, op.data, {
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Id': tenantId || req.headers['x-tenant-id'] as string || '',
            'X-User-Id': userId || req.headers['x-user-id'] as string || '',
          },
          timeout: 30000,
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info('bulk_operations_completed', { total: operations.length, successful, failed });
    res.json(createResponse({ total: operations.length, successful, failed, results }));
  } catch (error: any) {
    logger.error('bulk_operations_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('EXECUTION_SERVICE_ERROR', error.message || 'Failed to execute bulk operations')
    );
  }
});

export default router;
