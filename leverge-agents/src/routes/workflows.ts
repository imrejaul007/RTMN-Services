import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const workflows = new Map();

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, steps, triggers } = req.body;
    const workflow = { id: uuidv4(), name, description, steps, triggers, isActive: true, createdBy: req.userId, createdAt: new Date() };
    workflows.set(workflow.id, workflow);
    res.status(201).json(workflow);
  } catch (error) { logger.error('Error creating workflow:', error); res.status(500).json({ error: 'Failed to create workflow' }); }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const all = Array.from(workflows.values()).filter(w => w.createdBy === req.userId);
    res.json({ workflows: all, total: all.length });
  } catch (error) { logger.error('Error listing workflows:', error); res.status(500).json({ error: 'Failed to list workflows' }); }
});

router.post('/:id/execute', async (req: AuthRequest, res: Response) => {
  try {
    const workflow = workflows.get(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    const results = workflow.steps.map((s: any, i: number) => ({ step: i + 1, action: s.action, status: 'completed' }));
    res.json({ executionId: uuidv4(), workflowId: workflow.id, status: 'completed', steps: results });
  } catch (error) { logger.error('Error executing workflow:', error); res.status(500).json({ error: 'Failed to execute workflow' }); }
});

export default router;
