import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createSkillTwinService } from '../src/index.js';

describe('SkillTwin', () => {
  let app: ReturnType<typeof createSkillTwinService>;

  beforeEach(() => {
    app = createSkillTwinService();
  });

  describe('POST /api/skills', () => {
    it('should create a skill with required fields', async () => {
      const res = await request(app)
        .post('/api/skills')
        .send({ name: 'TypeScript' });

      expect(res.status).toBe(201);
      expect(res.body).toBeDefined();
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('TypeScript');
      expect(res.body.category).toBe('technical');
      expect(res.body.level).toBe('intermediate');
      expect(res.body.proficiencyScore).toBeGreaterThan(0);
    });

    it('should create skill with all optional fields', async () => {
      const res = await request(app)
        .post('/api/skills')
        .send({
          name: 'Leadership',
          category: 'leadership',
          level: 'expert',
          description: 'Team leadership skills',
          employeeId: 'emp-123',
          yearsOfExperience: 5,
          certifications: [
            { name: 'PMP', issuer: 'PMI', issueDate: '2024-01-01' }
          ]
        });

      expect(res.body.name).toBe('Leadership');
      expect(res.body.category).toBe('leadership');
      expect(res.body.level).toBe('expert');
      expect(res.body.employeeId).toBe('emp-123');
      expect(res.body.yearsOfExperience).toBe(5);
      expect(res.body.certifications).toHaveLength(1);
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/skills')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Skill name is required');
    });
  });

  describe('GET /api/skills/:id', () => {
    it('should return skill for valid id', async () => {
      const createRes = await request(app)
        .post('/api/skills')
        .send({ name: 'Findable Skill' });
      const skillId = createRes.body.id;

      const res = await request(app)
        .get(`/api/skills/${skillId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(skillId);
      expect(res.body.name).toBe('Findable Skill');
    });

    it('should return 404 for non-existent skill', async () => {
      const res = await request(app)
        .get('/api/skills/non-existent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Skill not found');
    });
  });

  describe('PUT /api/skills/:id', () => {
    it('should update skill fields', async () => {
      const createRes = await request(app)
        .post('/api/skills')
        .send({ name: 'Original Skill' });
      const skillId = createRes.body.id;

      const res = await request(app)
        .put(`/api/skills/${skillId}`)
        .send({ name: 'Updated Skill', level: 'expert' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Skill');
      expect(res.body.level).toBe('expert');
    });

    it('should return 404 for non-existent skill', async () => {
      const res = await request(app)
        .put('/api/skills/non-existent-id')
        .send({ name: 'Update' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should delete existing skill', async () => {
      const createRes = await request(app)
        .post('/api/skills')
        .send({ name: 'Delete Me' });
      const skillId = createRes.body.id;

      const deleteRes = await request(app)
        .delete(`/api/skills/${skillId}`);

      expect(deleteRes.status).toBe(204);
    });

    it('should return 404 for non-existent skill', async () => {
      const res = await request(app)
        .delete('/api/skills/non-existent-id');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/skills', () => {
    it('should return all skills', async () => {
      await request(app).post('/api/skills').send({ name: 'Skill 1' });
      await request(app).post('/api/skills').send({ name: 'Skill 2' });

      const res = await request(app)
        .get('/api/skills');

      expect(res.status).toBe(200);
      expect(res.body.skills).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter skills by category', async () => {
      await request(app).post('/api/skills').send({ name: 'Tech Skill', category: 'technical' });
      await request(app).post('/api/skills').send({ name: 'Soft Skill', category: 'soft' });

      const res = await request(app)
        .get('/api/skills?category=technical');

      expect(res.status).toBe(200);
      expect(res.body.skills.every((s: any) => s.category === 'technical')).toBe(true);
    });

    it('should filter skills by level', async () => {
      await request(app).post('/api/skills').send({ name: 'Expert Skill', level: 'expert' });
      await request(app).post('/api/skills').send({ name: 'Beginner Skill', level: 'beginner' });

      const res = await request(app)
        .get('/api/skills?level=expert');

      expect(res.status).toBe(200);
      expect(res.body.skills.every((s: any) => s.level === 'expert')).toBe(true);
    });

    it('should filter skills by employeeId', async () => {
      await request(app).post('/api/skills').send({ name: 'Emp1 Skill', employeeId: 'emp-1' });
      await request(app).post('/api/skills').send({ name: 'Emp2 Skill', employeeId: 'emp-2' });

      const res = await request(app)
        .get('/api/skills?employeeId=emp-1');

      expect(res.status).toBe(200);
      expect(res.body.skills.every((s: any) => s.employeeId === 'emp-1')).toBe(true);
    });
  });

  describe('POST /api/skills/:id/endorse', () => {
    it('should add endorsement to skill', async () => {
      const createRes = await request(app)
        .post('/api/skills')
        .send({ name: 'Endorse Me' });
      const skillId = createRes.body.id;

      const res = await request(app)
        .post(`/api/skills/${skillId}/endorse`)
        .send({
          endorserId: 'user-123',
          endorserName: 'John Doe',
          comment: 'Great skill!'
        });

      expect(res.status).toBe(201);
      expect(res.body.endorserId).toBe('user-123');
      expect(res.body.endorserName).toBe('John Doe');
    });

    it('should return 400 for missing endorsement fields', async () => {
      const createRes = await request(app)
        .post('/api/skills')
        .send({ name: 'Task' });
      const skillId = createRes.body.id;

      const res = await request(app)
        .post(`/api/skills/${skillId}/endorse`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/skills/:id/certifications', () => {
    it('should add certification to skill', async () => {
      const createRes = await request(app)
        .post('/api/skills')
        .send({ name: 'Certify Me' });
      const skillId = createRes.body.id;

      const res = await request(app)
        .post(`/api/skills/${skillId}/certifications`)
        .send({
          name: 'AWS Solutions Architect',
          issuer: 'Amazon',
          issueDate: '2024-01-01',
          credentialUrl: 'https://aws.com/verify/123'
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('AWS Solutions Architect');
      expect(res.body.issuer).toBe('Amazon');
      expect(res.body.verified).toBe(false);
    });

    it('should return 400 for missing certification fields', async () => {
      const createRes = await request(app)
        .post('/api/skills')
        .send({ name: 'Task' });
      const skillId = createRes.body.id;

      const res = await request(app)
        .post(`/api/skills/${skillId}/certifications`)
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/skills/analytics/summary', () => {
    it('should return skill analytics', async () => {
      await request(app).post('/api/skills').send({ name: 'Skill 1', category: 'technical', level: 'expert' });
      await request(app).post('/api/skills').send({ name: 'Skill 2', category: 'soft', level: 'intermediate' });

      const res = await request(app)
        .get('/api/skills/analytics/summary');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.byCategory).toBeDefined();
      expect(res.body.byLevel).toBeDefined();
      expect(res.body.avgProficiencyScore).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app)
        .get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('skill-twin');
    });
  });
});
