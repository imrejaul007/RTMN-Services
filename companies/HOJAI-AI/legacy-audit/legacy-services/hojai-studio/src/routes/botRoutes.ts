import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { botService } from '../services';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation schemas
const CreateBotSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  channels: z.array(z.enum(['whatsapp', 'instagram', 'facebook', 'webchat', 'voice', 'telegram', 'email'])).optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['text', 'number', 'boolean', 'date', 'phone', 'email', 'array', 'object']),
    defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
    description: z.string().optional()
  })).optional()
});

const UpdateBotSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'testing', 'active', 'paused', 'archived']).optional(),
  channels: z.array(z.string()).optional(),
  variables: z.array(z.any()).optional(),
  settings: z.object({
    language: z.string().optional(),
    timezone: z.string().optional(),
    startTypingIndicator: z.boolean().optional(),
    readReceipts: z.boolean().optional(),
    blockAfterHours: z.boolean().optional(),
    afterHoursMessage: z.string().optional()
  }).optional()
});

const AddFlowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  nodes: z.array(z.any()).optional(),
  entryNodeId: z.string().optional()
});

const AddNodeSchema = z.object({
  type: z.enum(['trigger', 'message', 'quick_reply', 'button', 'list', 'media', 'condition', 'action', 'ai_response', 'webhook', 'delay', 'handoff', 'end']),
  label: z.string().min(1).max(100),
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.any().optional(),
  nextNodeId: z.string().optional()
});

// List bots
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { status, limit, offset } = req.query;

    const result = await botService.getBotsByTenant(tenantId, {
      status: status as any,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({
      success: true,
      data: {
        bots: result.bots,
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get bot by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const bot = await botService.getBotById(req.params.id, tenantId);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.json({ success: true, data: bot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create bot
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const validation = CreateBotSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const bot = await botService.createBot({
      ...validation.data,
      tenantId,
      userId
    });

    res.status(201).json({ success: true, data: bot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update bot
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const validation = UpdateBotSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const bot = await botService.updateBot(req.params.id, tenantId, validation.data);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.json({ success: true, data: bot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete bot
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const deleted = await botService.deleteBot(req.params.id, tenantId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.json({ success: true, message: 'Bot deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change bot status
router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status required' });
    }

    const bot = await botService.changeStatus(req.params.id, tenantId, status);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.json({ success: true, data: bot });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Clone bot
router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { name } = req.body;

    const bot = await botService.cloneBot(req.params.id, tenantId, name || 'Cloned Bot', userId);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.status(201).json({ success: true, data: bot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get bot analytics
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const analytics = await botService.getAnalytics(req.params.id, tenantId);

    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test bot
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { testMessage } = req.body;

    const result = await botService.testBot(req.params.id, tenantId, userId, testMessage);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ FLOW ROUTES ============

// Add flow to bot
router.post('/:id/flows', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const validation = AddFlowSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const flow = {
      id: uuidv4(),
      ...validation.data,
      nodes: validation.data.nodes || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const bot = await botService.addFlow(req.params.id, tenantId, flow);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot not found' });
    }

    res.status(201).json({ success: true, data: bot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update flow
router.put('/:id/flows/:flowId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const bot = await botService.updateFlow(
      req.params.id,
      tenantId,
      req.params.flowId,
      req.body
    );

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot or flow not found' });
    }

    res.json({ success: true, data: bot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete flow
router.delete('/:id/flows/:flowId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const bot = await botService.deleteFlow(req.params.id, tenantId, req.params.flowId);

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot or flow not found' });
    }

    res.json({ success: true, message: 'Flow deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ NODE ROUTES ============

// Add node to flow
router.post('/:id/flows/:flowId/nodes', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const validation = AddNodeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const node = {
      id: uuidv4(),
      ...validation.data,
      createdAt: new Date()
    };

    const bot = await botService.addNode(
      req.params.id,
      tenantId,
      req.params.flowId,
      node
    );

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot or flow not found' });
    }

    res.status(201).json({ success: true, data: bot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update node
router.put('/:id/flows/:flowId/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const bot = await botService.updateNode(
      req.params.id,
      tenantId,
      req.params.flowId,
      req.params.nodeId,
      req.body
    );

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot, flow, or node not found' });
    }

    res.json({ success: true, data: bot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete node
router.delete('/:id/flows/:flowId/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const bot = await botService.deleteNode(
      req.params.id,
      tenantId,
      req.params.flowId,
      req.params.nodeId
    );

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot, flow, or node not found' });
    }

    res.json({ success: true, message: 'Node deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Connect nodes
router.post('/:id/flows/:flowId/nodes/:nodeId/connect', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { targetNodeId } = req.body;

    if (!targetNodeId) {
      return res.status(400).json({ success: false, error: 'Target node ID required' });
    }

    const bot = await botService.connectNodes(
      req.params.id,
      tenantId,
      req.params.flowId,
      req.params.nodeId,
      targetNodeId
    );

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Bot or nodes not found' });
    }

    res.json({ success: true, message: 'Nodes connected' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
