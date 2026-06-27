import { describe, it, expect, beforeEach } from 'vitest';
import { createSkillTwinService, type SkillCreate, type SkillUpdate, type SkillCategory, type SkillLevel } from '../src/index.js';

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

describe('SkillTwin', () => {
  let skillTwin: ReturnType<typeof createSkillTwinService>;

  beforeEach(() => {
    skillTwin = createSkillTwinService();
  });

  describe('createSkill', () => {
    it('should create a skill with required fields', () => {
      const skillData: SkillCreate = { name: 'TypeScript' };
      const req = createMockRequest(skillData);
      const res = createMockResponse();

      skillTwin.post('/api/skills', req as any, res as any);

      expect(res.statusCode).toBe(201);
      expect(res.data).toBeDefined();
      expect(res.data.id).toBeDefined();
      expect(res.data.name).toBe('TypeScript');
      expect(res.data.category).toBe('technical');
      expect(res.data.level).toBe('intermediate');
      expect(res.data.proficiencyScore).toBeGreaterThan(0);
    });

    it('should create skill with all optional fields', () => {
      const skillData: SkillCreate = {
        name: 'Leadership',
        category: 'leadership',
        level: 'expert',
        description: 'Team leadership skills',
        employeeId: 'emp-123',
        yearsOfExperience: 5,
        certifications: [
          { id: 'cert-1', name: 'PMP', issuer: 'PMI', issueDate: '2024-01-01', verified: true }
        ]
      };
      const req = createMockRequest(skillData);
      const res = createMockResponse();

      skillTwin.post('/api/skills', req as any, res as any);

      expect(res.data.name).toBe('Leadership');
      expect(res.data.category).toBe('leadership');
      expect(res.data.level).toBe('expert');
      expect(res.data.employeeId).toBe('emp-123');
      expect(res.data.yearsOfExperience).toBe(5);
      expect(res.data.certifications).toHaveLength(1);
    });

    it('should return 400 for missing name', () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      skillTwin.post('/api/skills', req as any, res as any);

      expect(res.statusCode).toBe(400);
      expect(res.data.error).toBe('Skill name is required');
    });
  });

  describe('getSkill', () => {
    it('should return skill for valid id', () => {
      const createReq = createMockRequest({ name: 'Findable Skill' });
      const createRes = createMockResponse();
      skillTwin.post('/api/skills', createReq as any, createRes as any);
      const skillId = createRes.data.id;

      const req = createMockRequest();
      (req as any).params = { id: skillId };
      const res = createMockResponse();

      skillTwin.get('/api/skills/:id', req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.id).toBe(skillId);
      expect(res.data.name).toBe('Findable Skill');
    });

    it('should return 404 for non-existent skill', () => {
      const req = createMockRequest();
      (req as any).params = { id: 'non-existent-id' };
      const res = createMockResponse();

      skillTwin.get('/api/skills/:id', req as any, res as any);

      expect(res.statusCode).toBe(404);
      expect(res.data.error).toBe('Skill not found');
    });
  });

  describe('updateSkill', () => {
    it('should update skill fields', () => {
      const createReq = createMockRequest({ name: 'Original Skill' });
      const createRes = createMockResponse();
      skillTwin.post('/api/skills', createReq as any, createRes as any);
      const skillId = createRes.data.id;

      const updateData: SkillUpdate = { name: 'Updated Skill', level: 'expert' };
      const req = createMockRequest(updateData);
      (req as any).params = { id: skillId };
      const res = createMockResponse();

      skillTwin.put('/api/skills/:id', req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.name).toBe('Updated Skill');
      expect(res.data.level).toBe('expert');
    });

    it('should return 404 for non-existent skill', () => {
      const req = createMockRequest({ name: 'Update' });
      (req as any).params = { id: 'non-existent-id' };
      const res = createMockResponse();

      skillTwin.put('/api/skills/:id', req as any, res as any);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('deleteSkill', () => {
    it('should delete existing skill', () => {
      const createReq = createMockRequest({ name: 'Delete Me' });
      const createRes = createMockResponse();
      skillTwin.post('/api/skills', createReq as any, createRes as any);
      const skillId = createRes.data.id;

      const req = createMockRequest();
      (req as any).params = { id: skillId };
      const res = createMockResponse();

      skillTwin.delete('/api/skills/:id', req as any, res as any);

      expect(res.statusCode).toBe(204);
    });
  });

  describe('listSkills', () => {
    it('should return all skills', () => {
      skillTwin.post('/api/skills', createMockRequest({ name: 'Skill 1' }) as any, createMockResponse());
      skillTwin.post('/api/skills', createMockRequest({ name: 'Skill 2' }) as any, createMockResponse());

      const req = createMockRequest();
      const res = createMockResponse();

      skillTwin.get('/api/skills', req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.skills).toBeDefined();
      expect(res.data.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter skills by category', () => {
      skillTwin.post('/api/skills', createMockRequest({ name: 'Tech Skill', category: 'technical' }) as any, createMockResponse());
      skillTwin.post('/api/skills', createMockRequest({ name: 'Soft Skill', category: 'soft' }) as any, createMockResponse());

      const req = createMockRequest();
      (req as any).query = { category: 'technical' };
      const res = createMockResponse();

      skillTwin.get('/api/skills', req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.skills.every((s: any) => s.category === 'technical')).toBe(true);
    });

    it('should filter skills by level', () => {
      skillTwin.post('/api/skills', createMockRequest({ name: 'Expert Skill', level: 'expert' }) as any, createMockResponse());
      skillTwin.post('/api/skills', createMockRequest({ name: 'Beginner Skill', level: 'beginner' }) as any, createMockResponse());

      const req = createMockRequest();
      (req as any).query = { level: 'expert' };
      const res = createMockResponse();

      skillTwin.get('/api/skills', req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.skills.every((s: any) => s.level === 'expert')).toBe(true);
    });

    it('should filter skills by employeeId', () => {
      skillTwin.post('/api/skills', createMockRequest({ name: 'Emp1 Skill', employeeId: 'emp-1' }) as any, createMockResponse());
      skillTwin.post('/api/skills', createMockRequest({ name: 'Emp2 Skill', employeeId: 'emp-2' }) as any, createMockResponse());

      const req = createMockRequest();
      (req as any).query = { employeeId: 'emp-1' };
      const res = createMockResponse();

      skillTwin.get('/api/skills', req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.skills.every((s: any) => s.employeeId === 'emp-1')).toBe(true);
    });
  });

  describe('endorseSkill', () => {
    it('should add endorsement to skill', () => {
      const createReq = createMockRequest({ name: 'Endorse Me' });
      const createRes = createMockResponse();
      skillTwin.post('/api/skills', createReq as any, createRes as any);
      const skillId = createRes.data.id;

      const req = createMockRequest({
        endorserId: 'user-123',
        endorserName: 'John Doe',
        comment: 'Great skill!'
      });
      (req as any).params = { id: skillId };
      const res = createMockResponse();

      skillTwin.post('/api/skills/:id/endorse', req as any, res as any);

      expect(res.statusCode).toBe(201);
      expect(res.data.endorserId).toBe('user-123');
      expect(res.data.endorserName).toBe('John Doe');
    });

    it('should return 400 for missing endorsement fields', () => {
      const req = createMockRequest({});
      (req as any).params = { id: 'some-id' };
      const res = createMockResponse();

      skillTwin.post('/api/skills/:id/endorse', req as any, res as any);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('addCertification', () => {
    it('should add certification to skill', () => {
      const createReq = createMockRequest({ name: 'Certify Me' });
      const createRes = createMockResponse();
      skillTwin.post('/api/skills', createReq as any, createRes as any);
      const skillId = createRes.data.id;

      const req = createMockRequest({
        name: 'AWS Solutions Architect',
        issuer: 'Amazon',
        issueDate: '2024-01-01',
        credentialUrl: 'https://aws.com/verify/123'
      });
      (req as any).params = { id: skillId };
      const res = createMockResponse();

      skillTwin.post('/api/skills/:id/certifications', req as any, res as any);

      expect(res.statusCode).toBe(201);
      expect(res.data.name).toBe('AWS Solutions Architect');
      expect(res.data.issuer).toBe('Amazon');
      expect(res.data.verified).toBe(false);
    });

    it('should return 400 for missing certification fields', () => {
      const req = createMockRequest({ name: 'Incomplete' });
      (req as any).params = { id: 'some-id' };
      const res = createMockResponse();

      skillTwin.post('/api/skills/:id/certifications', req as any, res as any);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getSkillAnalytics', () => {
    it('should return skill analytics', () => {
      skillTwin.post('/api/skills', createMockRequest({ name: 'Skill 1', category: 'technical', level: 'expert' }) as any, createMockResponse());
      skillTwin.post('/api/skills', createMockRequest({ name: 'Skill 2', category: 'soft', level: 'intermediate' }) as any, createMockResponse());

      const req = createMockRequest();
      const res = createMockResponse();

      skillTwin.get('/api/skills/analytics/summary', req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.total).toBe(2);
      expect(res.data.byCategory).toBeDefined();
      expect(res.data.byLevel).toBeDefined();
      expect(res.data.avgProficiencyScore).toBeDefined();
    });
  });

  describe('health', () => {
    it('should return healthy status', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      skillTwin.get('/health', req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.data.status).toBe('healthy');
      expect(res.data.service).toBe('skill-twin');
    });
  });
});