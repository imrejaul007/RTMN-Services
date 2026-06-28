/**
 * Memory Procedural Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

describe('Memory Procedural', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    const skills = new Map();
    const workflows = new Map();
    const habits = new Map();
    const routines = new Map();

    app.get('/health', (_req, res) => {
      res.json({ status: 'healthy' });
    });

    app.post('/api/procedural/:twinId/skills', (req, res) => {
      const { twinId } = req.params;
      const { name, level = 0 } = req.body;
      const twinSkills = skills.get(twinId) || [];
      twinSkills.push({ id: `skill-${Date.now()}`, twinId, name, level, mastered: level >= 90 });
      skills.set(twinId, twinSkills);
      res.json({ success: true });
    });

    app.get('/api/procedural/:twinId/skills', (req, res) => {
      res.json({ success: true, skills: skills.get(req.params.twinId) || [] });
    });

    app.post('/api/procedural/:twinId/workflows', (req, res) => {
      const { twinId } = req.params;
      const twinWfs = workflows.get(twinId) || [];
      twinWfs.push({ id: `wf-${Date.now()}`, twinId, name: req.body.name });
      workflows.set(twinId, twinWfs);
      res.json({ success: true });
    });

    app.get('/api/procedural/:twinId/workflows', (req, res) => {
      res.json({ success: true, workflows: workflows.get(req.params.twinId) || [] });
    });

    app.post('/api/procedural/:twinId/habits', (req, res) => {
      const { twinId } = req.params;
      const twinHabits = habits.get(twinId) || [];
      twinHabits.push({ id: `habit-${Date.now()}`, twinId, name: req.body.name, streak: 1 });
      habits.set(twinId, twinHabits);
      res.json({ success: true });
    });

    app.get('/api/procedural/:twinId/habits', (req, res) => {
      res.json({ success: true, habits: habits.get(req.params.twinId) || [] });
    });

    app.post('/api/procedural/:twinId/routines', (req, res) => {
      const { twinId } = req.params;
      const twinRoutines = routines.get(twinId) || [];
      twinRoutines.push({ id: `routine-${Date.now()}`, twinId, name: req.body.name });
      routines.set(twinId, twinRoutines);
      res.json({ success: true });
    });

    app.get('/api/procedural/:twinId/routines', (req, res) => {
      res.json({ success: true, routines: routines.get(req.params.twinId) || [] });
    });

    app.get('/api/procedural/:twinId/summary', (req, res) => {
      res.json({
        success: true,
        summary: {
          skillsCount: (skills.get(req.params.twinId) || []).length,
          workflowsCount: (workflows.get(req.params.twinId) || []).length,
          habitsCount: (habits.get(req.params.twinId) || []).length,
          routinesCount: (routines.get(req.params.twinId) || []).length,
        },
      });
    });
  });

  describe('Health', () => {
    it('should return healthy', async () => {
      const res = await supertest(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Skills', () => {
    it('should add skill', async () => {
      const res = await supertest(app)
        .post('/api/procedural/emp-1/skills')
        .send({ name: 'TypeScript', level: 80 });
      expect(res.status).toBe(200);
    });

    it('should get skills', async () => {
      await supertest(app).post('/api/procedural/emp-1/skills').send({ name: 'JS' });
      const res = await supertest(app).get('/api/procedural/emp-1/skills');
      expect(res.body.skills.length).toBeGreaterThan(0);
    });
  });

  describe('Workflows', () => {
    it('should add workflow', async () => {
      const res = await supertest(app)
        .post('/api/procedural/emp-1/workflows')
        .send({ name: 'Code Review', steps: ['review', 'approve'] });
      expect(res.status).toBe(200);
    });
  });

  describe('Habits', () => {
    it('should add habit', async () => {
      const res = await supertest(app)
        .post('/api/procedural/emp-1/habits')
        .send({ name: 'Morning Exercise', frequency: 'daily' });
      expect(res.status).toBe(200);
    });

    it('should get habits', async () => {
      await supertest(app).post('/api/procedural/emp-1/habits').send({ name: 'Meditation' });
      const res = await supertest(app).get('/api/procedural/emp-1/habits');
      expect(res.body.habits.length).toBeGreaterThan(0);
    });
  });

  describe('Routines', () => {
    it('should add routine', async () => {
      const res = await supertest(app)
        .post('/api/procedural/emp-1/routines')
        .send({ name: 'Morning Routine', activities: ['coffee', 'email'] });
      expect(res.status).toBe(200);
    });
  });

  describe('Summary', () => {
    it('should return summary', async () => {
      const res = await supertest(app).get('/api/procedural/emp-1/summary');
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.skillsCount).toBeDefined();
    });
  });
});
