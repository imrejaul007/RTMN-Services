/**
 * Task Twin Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createTaskTwinService } from './index';

describe('Task Twin Service', () => {
  let app: ReturnType<typeof createTaskTwinService>;

  beforeEach(() => {
    app = createTaskTwinService();
  });

  describe('POST /api/tasks', () => {
    it('should create task', async () => {
      const res = await supertest(app)
        .post('/api/tasks')
        .send({
          title: 'Build feature',
          assignee: 'emp-1',
          priority: 'high'
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'Build feature',
        status: 'pending',
        priority: 'high'
      });
    });

    it('should require title', async () => {
      const res = await supertest(app)
        .post('/api/tasks')
        .send({ assignee: 'emp-1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title');
    });

    it('should set default values', async () => {
      const res = await supertest(app)
        .post('/api/tasks')
        .send({ title: 'Test' });
      expect(res.body.status).toBe('pending');
      expect(res.body.priority).toBe('medium');
      expect(res.body.tags).toEqual([]);
    });
  });

  describe('GET /api/tasks', () => {
    it('should list all tasks', async () => {
      await supertest(app).post('/api/tasks').send({ title: 'Task 1' });
      await supertest(app).post('/api/tasks').send({ title: 'Task 2' });
      const res = await supertest(app).get('/api/tasks');
      expect(res.body.total).toBe(2);
    });

    it('should filter by status', async () => {
      await supertest(app).post('/api/tasks').send({ title: 'Task 1', status: 'in_progress' });
      await supertest(app).post('/api/tasks').send({ title: 'Task 2', status: 'completed' });
      const res = await supertest(app).get('/api/tasks?status=in_progress');
      expect(res.body.total).toBe(1);
    });

    it('should filter by assignee', async () => {
      await supertest(app).post('/api/tasks').send({ title: 'Task 1', assignee: 'emp-1' });
      await supertest(app).post('/api/tasks').send({ title: 'Task 2', assignee: 'emp-2' });
      const res = await supertest(app).get('/api/tasks?assignee=emp-1');
      expect(res.body.total).toBe(1);
    });

    it('should filter by priority', async () => {
      await supertest(app).post('/api/tasks').send({ title: 'Task 1', priority: 'high' });
      await supertest(app).post('/api/tasks').send({ title: 'Task 2', priority: 'low' });
      const res = await supertest(app).get('/api/tasks?priority=high');
      expect(res.body.total).toBe(1);
    });

    it('should filter by tags', async () => {
      await supertest(app).post('/api/tasks').send({ title: 'Task 1', tags: ['frontend', 'bug'] });
      await supertest(app).post('/api/tasks').send({ title: 'Task 2', tags: ['backend'] });
      const res = await supertest(app).get('/api/tasks?tags=frontend');
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get task by id', async () => {
      const create = await supertest(app)
        .post('/api/tasks')
        .send({ title: 'Task' });
      const res = await supertest(app).get(`/api/tasks/${create.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for unknown id', async () => {
      const res = await supertest(app).get('/api/tasks/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task', async () => {
      const create = await supertest(app)
        .post('/api/tasks')
        .send({ title: 'Task' });
      const res = await supertest(app)
        .put(`/api/tasks/${create.body.id}`)
        .send({ status: 'completed' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).toBeDefined();
    });

    it('should set completedAt when status is completed', async () => {
      const create = await supertest(app)
        .post('/api/tasks')
        .send({ title: 'Task' });
      const res = await supertest(app)
        .put(`/api/tasks/${create.body.id}`)
        .send({ status: 'completed' });
      expect(res.body.completedAt).toBeDefined();
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      const create = await supertest(app)
        .post('/api/tasks')
        .send({ title: 'Task' });
      await supertest(app).delete(`/api/tasks/${create.body.id}`).expect(204);
    });
  });

  describe('POST /api/tasks/:id/delegate', () => {
    it('should delegate task', async () => {
      const create = await supertest(app)
        .post('/api/tasks')
        .send({ title: 'Task', assignee: 'emp-1' });
      const res = await supertest(app)
        .post(`/api/tasks/${create.body.id}/delegate`)
        .send({ newAssignee: 'emp-2' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('emp-2');
      expect(res.body.delegator).toBe('emp-1');
    });

    it('should require newAssignee', async () => {
      const create = await supertest(app)
        .post('/api/tasks')
        .send({ title: 'Task' });
      const res = await supertest(app)
        .post(`/api/tasks/${create.body.id}/delegate`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/tasks/bulk-update', () => {
    it('should bulk update tasks', async () => {
      const task1 = await supertest(app).post('/api/tasks').send({ title: 'Task 1' });
      const task2 = await supertest(app).post('/api/tasks').send({ title: 'Task 2' });
      const res = await supertest(app)
        .post('/api/tasks/bulk-update')
        .send({
          taskIds: [task1.body.id, task2.body.id],
          updates: { status: 'in_progress' }
        });
      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(2);
    });

    it('should require taskIds', async () => {
      const res = await supertest(app)
        .post('/api/tasks/bulk-update')
        .send({ updates: { status: 'in_progress' } });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks/analytics', () => {
    it('should return analytics', async () => {
      await supertest(app).post('/api/tasks').send({ title: 'Task 1', status: 'completed', priority: 'high' });
      await supertest(app).post('/api/tasks').send({ title: 'Task 2', status: 'pending', priority: 'low' });
      const res = await supertest(app).get('/api/tasks/analytics');
      expect(res.body.total).toBe(2);
      expect(res.body.byStatus.completed).toBe(1);
      expect(res.body.completionRate).toBe(50);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('task-twin');
    });
  });
});
