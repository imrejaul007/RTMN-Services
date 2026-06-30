/**
 * Skills Routes — List available AI skills
 */

import { Router } from 'express';
import { WORKER_REGISTRY } from '../registry.js';

const router = Router();

interface SkillEntry {
  id: string;
  name: string;
  description: string;
  workerId: string;
  workerName: string;
  cost: number;
  category: string;
}

// GET /api/skills
router.get('/', (req, res) => {
  const skills: SkillEntry[] = [];

  for (const worker of WORKER_REGISTRY) {
    for (const skill of worker.skills) {
      skills.push({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        workerId: worker.id,
        workerName: worker.name,
        cost: skill.cost,
        category: worker.category,
      });
    }
  }

  res.json({
    skills,
    total: skills.length,
    categories: [...new Set(skills.map(s => s.category))],
    timestamp: new Date().toISOString(),
  });
});

// GET /api/skills/category/:category
router.get('/category/:category', (req, res) => {
  const skills: SkillEntry[] = [];

  for (const worker of WORKER_REGISTRY) {
    if (worker.category === req.params.category) {
      for (const skill of worker.skills) {
        skills.push({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          workerId: worker.id,
          workerName: worker.name,
          cost: skill.cost,
          category: worker.category,
        });
      }
    }
  }

  res.json({
    category: req.params.category,
    skills,
    total: skills.length,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/skills/recommend
router.post('/recommend', (req, res) => {
  const { useCase, industry } = req.body;

  // Recommend skills for a use case
  const recommendations: SkillEntry[] = [];

  for (const worker of WORKER_REGISTRY) {
    // Match by industry or use case
    if (
      worker.category === industry ||
      worker.description.toLowerCase().includes(useCase?.toLowerCase())
    ) {
      for (const skill of worker.skills) {
        recommendations.push({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          workerId: worker.id,
          workerName: worker.name,
          cost: skill.cost,
          category: worker.category,
        });
      }
    }
  }

  res.json({
    useCase,
    industry,
    recommendations: recommendations.slice(0, 10),
    total: recommendations.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/skills/workers/:workerId
router.get('/workers/:workerId', (req, res) => {
  const worker = WORKER_REGISTRY.find(w => w.id === req.params.workerId);

  if (!worker) {
    return res.status(404).json({
      success: false,
      error: 'Worker not found',
    });
  }

  res.json({
    workerId: worker.id,
    workerName: worker.name,
    skills: worker.skills,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/skills/execute
router.post('/execute', (req, res) => {
  const { workerId, skillId, input } = req.body;

  const worker = WORKER_REGISTRY.find(w => w.id === workerId);
  const skill = worker?.skills.find(s => s.id === skillId);

  if (!worker || !skill) {
    return res.status(404).json({
      success: false,
      error: 'Worker or skill not found',
    });
  }

  res.json({
    success: true,
    workerId,
    skillId,
    skillName: skill.name,
    cost: skill.cost,
    result: {
      message: `Executed ${skill.name} successfully`,
      input,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
