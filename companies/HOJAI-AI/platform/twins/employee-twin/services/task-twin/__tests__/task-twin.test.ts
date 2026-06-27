import { describe, it, expect, beforeEach } from 'vitest';
import { createTaskTwinService, type Task, type TaskCreate, type TaskUpdate } from '../src/index.js';

// Mock request/response helpers
function createMockRequest(body: any = {}) {
  return { body };
}
function createMockResponse() {
  const res: any = { statusCode: 200, data: null };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.data = data; return res; };
  return res;
}

describe('TaskTwin', () => {
  let taskTwin: ReturnType<typeof createTaskTwinService>;

  beforeEach(() => {
    taskTwin = createTaskTwinService();
  });

  describe('createTask', () => {
    it('should create a task with required fields', () => {
      const taskData: TaskCreate = { title: 'Test Task' };
      const req = createMockRequest(taskData);
      const res = createMockResponse();

      taskTwin.createTask(req as any, res as any);

      expect(res.statusCode).toBe(201);
      expect(res.data).toBeDefined();
      expect(res.data.id).toBeDefined();
      expect(res.data.title).toBe('Test Task');
      expect(res.data.status).toBe('pending');
      expect(res.data.priority).toBe('medium');
      expect(res.data.createdAt).toBeDefined();
    });

    it('should create task with all optional fields', () => {
      const taskData: TaskCreate = {
        title: 'Complete Project',
        description: 'Finish the project documentation',
        status: 'in_progress',
        priority: 'high',
        assignee: 'user-123',
        delegator: 'manager-456',
        dueDate: '2026-07-01',
        tags: ['work', 'urgent'],
        dependencies: ['task-001']
      };
      const req = createMockRequest(taskData);
      const res = createMockResponse();

      taskTwin.createTask(req as any, res as any);

      expect(res.data.title).toBe('Complete Project');
      expect(res.data.description).toBe('Finish the project documentation');
      expect(res.data.status).toBe('in_progress');
      expect(res.data.priority).toBe('high');
      expect(res.data.assignee).toBe('user-123');
      expect(res.data.delegator).toBe('manager-456');
      expect(res.data.dueDate).toBe('2026-07-01');
      expect(res.data.tags).toEqual(['work', 'urgent']);
      expect(res.data.dependencies).toEqual(['task-001']);
    });

    it('should return 400 for missing title', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      taskTwin.createTask(req as any, res as any);

      expect(res.statusCode).toBe(400);
      expect(res.data.error).toBe('Title is required');
    });
  });

  describe('getTask', () => {
    it('should return task for valid id', () => {
      const taskData: TaskCreate = { title: 'Findable Task' };
      const createReq = createMockRequest(taskData);
      const createRes = createMockResponse();
      taskTwin.createTask(createReq as any, createRes as any);
      const taskId = createRes.data.id;

      const req = createMockRequest();
      (req as any).params = { id: taskId };
      const res = createMockResponse();

      taskTwin.getTask(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.id).toBe(taskId);
      expect(res.data.title).toBe('Findable Task');
    });

    it('should return 404 for non-existent task', () => {
      const req = createMockRequest();
      (req as any).params = { id: 'non-existent-id' };
      const res = createMockResponse();

      taskTwin.getTask(req as any, res as any);

      expect(res.statusCode).toBe(404);
      expect(res.data.error).toBe('Task not found');
    });
  });

  describe('updateTask', () => {
    it('should update task fields', () => {
      const createReq = createMockRequest({ title: 'Original Title' });
      const createRes = createMockResponse();
      taskTwin.createTask(createReq as any, createRes as any);
      const taskId = createRes.data.id;

      const updateData: TaskUpdate = { title: 'Updated Title', status: 'completed' };
      const req = createMockRequest(updateData);
      (req as any).params = { id: taskId };
      const res = createMockResponse();

      taskTwin.updateTask(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.title).toBe('Updated Title');
      expect(res.data.status).toBe('completed');
      expect(res.data.updatedAt).toBeDefined();
    });

    it('should set completedAt when status changes to completed', () => {
      const createReq = createMockRequest({ title: 'Complete Me' });
      const createRes = createMockResponse();
      taskTwin.createTask(createReq as any, createRes as any);
      const taskId = createRes.data.id;

      const req = createMockRequest({ status: 'completed' });
      (req as any).params = { id: taskId };
      const res = createMockResponse();

      taskTwin.updateTask(req as any, res as any);

      expect(res.data.status).toBe('completed');
      expect(res.data.completedAt).toBeDefined();
    });

    it('should return 404 for non-existent task', () => {
      const req = createMockRequest({ title: 'Update' });
      (req as any).params = { id: 'non-existent-id' };
      const res = createMockResponse();

      taskTwin.updateTask(req as any, res as any);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task', () => {
      const createReq = createMockRequest({ title: 'Delete Me' });
      const createRes = createMockResponse();
      taskTwin.createTask(createReq as any, createRes as any);
      const taskId = createRes.data.id;

      const req = createMockRequest();
      (req as any).params = { id: taskId };
      const res = createMockResponse();

      taskTwin.deleteTask(req as any, res as any);

      expect(res.statusCode).toBe(204);

      // Verify task is gone
      const getReq = createMockRequest();
      (getReq as any).params = { id: taskId };
      const getRes = createMockResponse();
      taskTwin.getTask(getReq as any, getRes as any);
      expect(getRes.statusCode).toBe(404);
    });

    it('should return 404 for non-existent task', () => {
      const req = createMockRequest();
      (req as any).params = { id: 'non-existent-id' };
      const res = createMockResponse();

      taskTwin.deleteTask(req as any, res as any);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('listTasks', () => {
    it('should return all tasks', () => {
      taskTwin.createTask(createMockRequest({ title: 'Task 1' }) as any, createMockResponse());
      taskTwin.createTask(createMockRequest({ title: 'Task 2' }) as any, createMockResponse());

      const req = createMockRequest();
      const res = createMockResponse();

      taskTwin.listTasks(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.tasks).toBeDefined();
      expect(res.data.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter tasks by status', () => {
      taskTwin.createTask(createMockRequest({ title: 'Pending Task', status: 'pending' }) as any, createMockResponse());
      taskTwin.createTask(createMockRequest({ title: 'Completed Task', status: 'completed' }) as any, createMockResponse());

      const req = createMockRequest();
      (req as any).query = { status: 'pending' };
      const res = createMockResponse();

      taskTwin.listTasks(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.tasks.every((t: Task) => t.status === 'pending')).toBe(true);
    });

    it('should filter tasks by assignee', () => {
      taskTwin.createTask(createMockRequest({ title: 'Assigned Task', assignee: 'user-1' }) as any, createMockResponse());
      taskTwin.createTask(createMockRequest({ title: 'Other Task', assignee: 'user-2' }) as any, createMockResponse());

      const req = createMockRequest();
      (req as any).query = { assignee: 'user-1' };
      const res = createMockResponse();

      taskTwin.listTasks(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.tasks.every((t: Task) => t.assignee === 'user-1')).toBe(true);
    });

    it('should filter tasks by priority', () => {
      taskTwin.createTask(createMockRequest({ title: 'High Task', priority: 'high' }) as any, createMockResponse());
      taskTwin.createTask(createMockRequest({ title: 'Low Task', priority: 'low' }) as any, createMockResponse());

      const req = createMockRequest();
      (req as any).query = { priority: 'high' };
      const res = createMockResponse();

      taskTwin.listTasks(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.tasks.every((t: Task) => t.priority === 'high')).toBe(true);
    });
  });

  describe('delegateTask', () => {
    it('should delegate task to new assignee', () => {
      const createReq = createMockRequest({ title: 'Delegation Task', assignee: 'original-user' });
      const createRes = createMockResponse();
      taskTwin.createTask(createReq as any, createRes as any);
      const taskId = createRes.data.id;

      const req = createMockRequest({ newAssignee: 'new-user', reason: 'Capacity issue' });
      (req as any).params = { id: taskId };
      const res = createMockResponse();

      taskTwin.delegateTask(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.assignee).toBe('new-user');
      expect(res.data.delegator).toBe('original-user');
    });

    it('should return 400 for missing newAssignee', () => {
      const req = createMockRequest({});
      (req as any).params = { id: 'some-id' };
      const res = createMockResponse();

      taskTwin.delegateTask(req as any, res as any);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getTaskAnalytics', () => {
    it('should return task statistics', () => {
      taskTwin.createTask(createMockRequest({ title: 'Task 1', status: 'completed', priority: 'high' }) as any, createMockResponse());
      taskTwin.createTask(createMockRequest({ title: 'Task 2', status: 'pending', priority: 'low' }) as any, createMockResponse());
      taskTwin.createTask(createMockRequest({ title: 'Task 3', status: 'in_progress', priority: 'medium' }) as any, createMockResponse());

      const req = createMockRequest();
      const res = createMockResponse();

      taskTwin.getTaskAnalytics(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.total).toBe(3);
      expect(res.data.byStatus).toBeDefined();
      expect(res.data.byPriority).toBeDefined();
      expect(res.data.completionRate).toBeDefined();
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple tasks', () => {
      const taskIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = createMockResponse();
        taskTwin.createTask(createMockRequest({ title: `Bulk Task ${i}` }) as any, res);
        taskIds.push(res.data.id);
      }

      const req = createMockRequest({ taskIds, updates: { status: 'completed' } });
      const res = createMockResponse();

      taskTwin.bulkUpdate(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.updated).toBe(3);
      res.data.tasks.forEach((task: Task) => {
        expect(task.status).toBe('completed');
      });
    });

    it('should return 400 for empty taskIds', () => {
      const req = createMockRequest({ taskIds: [], updates: {} });
      const res = createMockResponse();

      taskTwin.bulkUpdate(req as any, res as any);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('health', () => {
    it('should return healthy status', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      taskTwin.health(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.status).toBe('healthy');
      expect(res.data.service).toBe('task-twin');
      expect(res.data.timestamp).toBeDefined();
    });
  });
});