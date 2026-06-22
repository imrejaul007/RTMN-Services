import { Router, Request, Response } from 'express';
import { routingService } from '../services';

const router = Router();

// Skills
router.post('/skills', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const skill = await routingService.createSkill({ tenantId, ...req.body });
    res.status(201).json({ success: true, data: skill });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/skills', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const skills = await routingService.getSkills(tenantId);
    res.json({ success: true, data: skills });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Agent Skills
router.post('/agent-skills', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const agentSkill = await routingService.addAgentSkill({ tenantId, ...req.body });
    res.status(201).json({ success: true, data: agentSkill });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/agents/:id/skills', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const skills = await routingService.getAgentSkills(tenantId, req.params.id);
    res.json({ success: true, data: skills });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Routing Rules
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const rule = await routingService.createRule({ tenantId, ...req.body });
    res.status(201).json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/rules', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const rules = await routingService.getRules(tenantId);
    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route conversation
router.post('/route', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const result = await routingService.routeConversation({ tenantId, ...req.body });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
