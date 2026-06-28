/**
 * Skill Twin Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createSkillTwinService } from './index';

describe('Skill Twin Service', () => {
  let app: ReturnType<typeof createSkillTwinService>;

  beforeEach(() => {
    app = createSkillTwinService();
  });

  describe('POST /api/skills', () => {
    it('should create skill', async () => {
      const res = await supertest(app)
        .post('/api/skills')
        .send({
          name: 'TypeScript',
          category: 'technical',
          level: 'advanced',
          employeeId: 'emp-1'
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'TypeScript',
        category: 'technical',
        level: 'advanced'
      });
    });

    it('should require skill name', async () => {
      const res = await supertest(app)
        .post('/api/skills')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should calculate proficiency score from level', async () => {
      const res = await supertest(app)
        .post('/api/skills')
        .send({
          name: 'JavaScript',
          level: 'expert',
          yearsOfExperience: 5
        });
      // expert base is 80, +5*2 experience bonus = 90
      expect(res.body.proficiencyScore).toBe(90);
    });

    it('should accept any category and use default', async () => {
      // Note: POST doesn't validate category, only PUT does
      const res = await supertest(app)
        .post('/api/skills')
        .send({
          name: 'Test',
          category: 'invalid'
        });
      // POST accepts any value and uses default
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/skills', () => {
    it('should list all skills', async () => {
      await supertest(app).post('/api/skills').send({ name: 'TypeScript', category: 'technical' });
      await supertest(app).post('/api/skills').send({ name: 'Communication', category: 'soft' });
      const res = await supertest(app).get('/api/skills');
      expect(res.body.total).toBe(2);
    });

    it('should filter by category', async () => {
      await supertest(app).post('/api/skills').send({ name: 'TypeScript', category: 'technical' });
      await supertest(app).post('/api/skills').send({ name: 'Communication', category: 'soft' });
      const res = await supertest(app).get('/api/skills?category=technical');
      expect(res.body.total).toBe(1);
    });

    it('should filter by level', async () => {
      await supertest(app).post('/api/skills').send({ name: 'TypeScript', level: 'expert' });
      await supertest(app).post('/api/skills').send({ name: 'CSS', level: 'beginner' });
      const res = await supertest(app).get('/api/skills?level=expert');
      expect(res.body.total).toBe(1);
    });

    it('should filter by minProficiencyScore', async () => {
      await supertest(app).post('/api/skills').send({ name: 'TypeScript', level: 'expert' });
      await supertest(app).post('/api/skills').send({ name: 'CSS', level: 'beginner' });
      const res = await supertest(app).get('/api/skills?minProficiencyScore=70');
      expect(res.body.total).toBe(1);
    });

    it('should search by query', async () => {
      await supertest(app).post('/api/skills').send({ name: 'TypeScript', description: 'Language for web' });
      await supertest(app).post('/api/skills').send({ name: 'Python', description: 'Data science' });
      const res = await supertest(app).get('/api/skills?query=Language');
      expect(res.body.total).toBe(1);
      expect(res.body.skills[0].name).toBe('TypeScript');
    });
  });

  describe('GET /api/skills/:id', () => {
    it('should get skill by id', async () => {
      const create = await supertest(app)
        .post('/api/skills')
        .send({ name: 'TypeScript' });
      const res = await supertest(app).get(`/api/skills/${create.body.id}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for unknown id', async () => {
      const res = await supertest(app).get('/api/skills/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/skills/:id', () => {
    it('should update skill', async () => {
      const create = await supertest(app)
        .post('/api/skills')
        .send({ name: 'TypeScript' });
      const res = await supertest(app)
        .put(`/api/skills/${create.body.id}`)
        .send({ level: 'expert' });
      expect(res.status).toBe(200);
      expect(res.body.level).toBe('expert');
    });

    it('should reject invalid level', async () => {
      const create = await supertest(app)
        .post('/api/skills')
        .send({ name: 'TypeScript' });
      const res = await supertest(app)
        .put(`/api/skills/${create.body.id}`)
        .send({ level: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should delete skill', async () => {
      const create = await supertest(app)
        .post('/api/skills')
        .send({ name: 'TypeScript' });
      await supertest(app).delete(`/api/skills/${create.body.id}`).expect(204);
    });
  });

  describe('POST /api/skills/:id/endorse', () => {
    it('should add endorsement', async () => {
      const create = await supertest(app)
        .post('/api/skills')
        .send({ name: 'TypeScript' });
      const res = await supertest(app)
        .post(`/api/skills/${create.body.id}/endorse`)
        .send({ endorserId: 'emp-2', endorserName: 'John' });
      expect(res.status).toBe(201);
      expect(res.body.endorserId).toBe('emp-2');
    });

    it('should require endorser fields', async () => {
      const create = await supertest(app)
        .post('/api/skills')
        .send({ name: 'TypeScript' });
      const res = await supertest(app)
        .post(`/api/skills/${create.body.id}/endorse`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/skills/:id/certifications', () => {
    it('should add certification', async () => {
      const create = await supertest(app)
        .post('/api/skills')
        .send({ name: 'TypeScript' });
      const res = await supertest(app)
        .post(`/api/skills/${create.body.id}/certifications`)
        .send({
          name: 'TypeScript Master',
          issuer: 'Microsoft',
          issueDate: '2026-01-01'
        });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('TypeScript Master');
    });
  });

  describe('GET /api/skills/analytics/summary', () => {
    it('should return analytics', async () => {
      await supertest(app).post('/api/skills').send({ name: 'TypeScript', category: 'technical', level: 'expert' });
      await supertest(app).post('/api/skills').send({ name: 'Python', category: 'technical', level: 'beginner' });
      await supertest(app).post('/api/skills').send({ name: 'Leadership', category: 'soft', level: 'advanced' });
      const res = await supertest(app).get('/api/skills/analytics/summary');
      expect(res.body.total).toBe(3);
      expect(res.body.byCategory).toMatchObject({ technical: 2, soft: 1 });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('skill-twin');
    });
  });
});
