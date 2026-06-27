import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTaskTwinService } from '../src/index.js';

describe('TaskTwin', () => {
  let app: ReturnType<typeof createTaskTwinService>;

  beforeEach(() => {
    app = createTaskTwinService();
  });

  describe('POST /api/tasks', () => {
    it('should create a task with required fields', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task' });

      expect(res.status).toBe(201);
      expect(res.body).toBeDefined();
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test Task');
      expect(res.body.status).toBe('pending');
      expect(res.body.priority).toBe('medium');
      expect(res.body.createdAt).toBeDefined();
    });

    it('should create task with all optional fields', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Complete Project',
          description: 'Finish the project documentation',
          status: 'in_progress',
          priority: 'high',
          assignee: 'user-123',
          delegator: 'manager-456',
          dueDate: '2026-07-01',
          tags: ['work', 'urgent'],
          dependencies: ['task-001']
        });

      expect(res.body.title).toBe('Complete Project');
      expect(res.body.description).toBe('Finish the project documentation');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.assignee).toBe('user-123');
      expect(res.body.delegator).toBe('manager-456');
      expect(res.body.dueDate).toBe('2026-07-01');
      expect(res.body.tags).toEqual(['work', 'urgent']);
      expect(res.body.dependencies).toEqual(['task-001']);
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return task for valid id', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Findable Task' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .get(`/api/tasks/${taskId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
      expect(res.body.title).toBe('Findable Task');
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .get('/api/tasks/non-existent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task fields', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Original Title' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'Updated Title', status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('completed');
    });

    it('should set completedAt when status changes to completed', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Complete Me' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ status: 'completed' });

      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).toBeDefined();
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/api/tasks/non-existent-id')
        .send({ title: 'Update' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete existing task', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Delete Me' });
      const taskId = createRes.body.id;

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}`);

      expect(deleteRes.status).toBe(204);

      // Verify task is gone
      const getRes = await request(app)
        .get(`/api/tasks/${taskId}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .delete('/api/tasks/non-existent-id');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks', async () => {
      await request(app).post('/api/tasks').send({ title: 'Task 1' });
      await request(app).post('/api/tasks').send({ title: 'Task 2' });

      const res = await request(app)
        .get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body.tasks).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter tasks by status', async () => {
      await request(app).post('/api/tasks').send({ title: 'Pending Task', status: 'pending' });
      await request(app).post('/api/tasks').send({ title: 'Completed Task', status: 'completed' });

      const res = await request(app)
        .get('/api/tasks?status=pending');

      expect(res.status).toBe(200);
      expect(res.body.tasks.every((t: any) => t.status === 'pending')).toBe(true);
    });

    it('should filter tasks by assignee', async () => {
      await request(app).post('/api/tasks').send({ title: 'Assigned Task', assignee: 'user-1' });
      await request(app).post('/api/tasks').send({ title: 'Other Task', assignee: 'user-2' });

      const res = await request(app)
        .get('/api/tasks?assignee=user-1');

      expect(res.status).toBe(200);
      expect(res.body.tasks.every((t: any) => t.assignee === 'user-1')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      await request(app).post('/api/tasks').send({ title: 'High Task', priority: 'high' });
      await request(app).post('/api/tasks').send({ title: 'Low Task', priority: 'low' });

      const res = await request(app)
        .get('/api/tasks?priority=high');

      expect(res.status).toBe(200);
      expect(res.body.tasks.every((t: any) => t.priority === 'high')).toBe(true);
    });
  });

  describe('POST /api/tasks/:id/delegate', () => {
    it('should delegate task to new assignee', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Delegation Task', assignee: 'original-user' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .post(`/api/tasks/${taskId}/delegate`)
        .send({ newAssignee: 'new-user', reason: 'Capacity issue' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('new-user');
      expect(res.body.delegator).toBe('original-user');
    });

    it('should return 400 for missing newAssignee', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .send({ title: 'Task' });
      const taskId = createRes.body.id;

      const res = await request(app)
        .post(`/api/tasks/${taskId}/delegate`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks/analytics', () => {
    it('should return task statistics', async () => {
      const analyticsApp = createTaskTwinService();
      await request(analyticsApp).post('/api/tasks').send({ title: 'Task 1', status: 'completed', priority: 'high' });
      await request(analyticsApp).post('/api/tasks').send({ title: 'Task 2', status: 'pending', priority: 'low' });
      await request(analyticsApp).post('/api/tasks').send({ title: 'Task 3', status: 'in_progress', priority: 'medium' });

      const res = await request(analyticsApp)
        .get('/api/tasks/analytics');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.byStatus).toBeDefined();
      expect(res.body.byPriority).toBeDefined();
      expect(res.body.completionRate).toBeDefined();
    });
  });

  describe('POST /api/tasks/bulk-update', () => {
    it('should update multiple tasks', async () => {
      const taskIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/tasks')
          .send({ title: `Bulk Task ${i}` });
        taskIds.push(res.body.id);
      }

      const res = await request(app)
        .post('/api/tasks/bulk-update')
        .send({ taskIds, updates: { status: 'completed' } });

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(3);
      res.body.tasks.forEach((task: any) => {
        expect(task.status).toBe('completed');
      });
    });

    it('should return 400 for empty taskIds', async () => {
      const res = await request(app)
        .post('/api/tasks/bulk-update')
        .send({ taskIds: [], updates: {} });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('task-twin');
    });
  });
});
