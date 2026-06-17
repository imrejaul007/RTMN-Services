import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '../models/Task';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const task = new Task({ taskId: uuidv4(), ...req.body, orgId: req.orgId, clientId: req.clientId, createdBy: req.userId });
    await task.save();
    res.status(201).json(task);
  } catch (error) { logger.error('Error creating task:', error); res.status(500).json({ error: 'Failed to create task' }); }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { agentId, status, priority, limit = 50, offset = 0 } = req.query;
    const filter: any = { orgId: req.orgId, clientId: req.clientId };
    if (agentId) filter.agentId = agentId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    const tasks = await Task.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit));
    const total = await Task.countDocuments(filter);
    res.json({ tasks, total, offset, limit });
  } catch (error) { logger.error('Error listing tasks:', error); res.status(500).json({ error: 'Failed to list tasks' }); }
});

router.patch('/:taskId/status', async (req: AuthRequest, res: Response) => {
  try {
    const updates: any = { status: req.body.status };
    if (req.body.status === 'running') updates.startedAt = new Date();
    if (req.body.status === 'completed' || req.body.status === 'failed') updates.completedAt = new Date();
    const task = await Task.findOneAndUpdate({ taskId: req.params.taskId, orgId: req.orgId, clientId: req.clientId }, { $set: updates }, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) { logger.error('Error updating task:', error); res.status(500).json({ error: 'Failed to update task' }); }
});

export default router;
