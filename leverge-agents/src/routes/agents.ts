import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Agent } from '../models/Agent';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const agent = new Agent({ agentId: uuidv4(), ...req.body, orgId: req.orgId, clientId: req.clientId, ownerId: req.userId });
    await agent.save();
    res.status(201).json(agent);
  } catch (error) { logger.error('Error creating agent:', error); res.status(500).json({ error: 'Failed to create agent' }); }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, status, limit = 50, offset = 0 } = req.query;
    const filter: any = { orgId: req.orgId, clientId: req.clientId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    const agents = await Agent.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit));
    const total = await Agent.countDocuments(filter);
    res.json({ agents, total, offset, limit });
  } catch (error) { logger.error('Error listing agents:', error); res.status(500).json({ error: 'Failed to list agents' }); }
});

router.get('/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await Agent.findOne({ agentId: req.params.agentId, orgId: req.orgId, clientId: req.clientId });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (error) { logger.error('Error fetching agent:', error); res.status(500).json({ error: 'Failed to fetch agent' }); }
});

router.put('/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await Agent.findOneAndUpdate({ agentId: req.params.agentId, orgId: req.orgId, clientId: req.clientId }, { $set: req.body }, { new: true });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (error) { logger.error('Error updating agent:', error); res.status(500).json({ error: 'Failed to update agent' }); }
});

router.delete('/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    const agent = await Agent.findOneAndDelete({ agentId: req.params.agentId, orgId: req.orgId, clientId: req.clientId });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ message: 'Agent deleted' });
  } catch (error) { logger.error('Error deleting agent:', error); res.status(500).json({ error: 'Failed to delete agent' }); }
});

export default router;
