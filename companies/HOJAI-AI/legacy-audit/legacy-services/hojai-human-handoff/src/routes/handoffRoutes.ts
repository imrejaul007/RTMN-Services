import { Router, Request, Response } from 'express';
import { handoffService } from '../services';

const router = Router();

// ============ HANDOFFS ============

// Initiate handoff
router.post('/handoffs', async (req: Request, res: Response) => {
  try {
    const {
      conversationId,
      channel,
      botId,
      flowId,
      lastNodeId,
      conversationSummary,
      reason,
      reasonDescription,
      priority,
      targetTeam,
      targetAgent,
      metadata
    } = req.body;

    const tenantId = req.headers['x-tenant-id'] as string;

    if (!conversationId || !tenantId || !reason || !conversationSummary) {
      return res.status(400).json({
        success: false,
        error: 'conversationId, tenantId, reason, and conversationSummary required'
      });
    }

    const handoff = await handoffService.initiateHandoff({
      conversationId,
      tenantId,
      channel: channel || 'whatsapp',
      botId,
      flowId,
      lastNodeId,
      conversationSummary,
      reason,
      reasonDescription,
      priority,
      targetTeam,
      targetAgent,
      metadata
    });

    res.status(201).json({ success: true, data: handoff });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get handoff
router.get('/handoffs/:id', async (req: res: Response) => {
  try {
    const handoff = await handoffService.getHandoff(req.params.id);
    if (!handoff) {
      return res.status(404).json({ success: false, error: 'Handoff not found' });
    }
    res.json({ success: true, data: handoff });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get handoff by conversation
router.get('/conversations/:id/handoff', async (req: res: Response) => {
  try {
    const handoff = await handoffService.getHandoffByConversation(req.params.id);
    res.json({ success: true, data: handoff });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add to queue
router.post('/handoffs/:id/queue', async (req: res: Response) => {
  try {
    const handoff = await handoffService.addToQueue(req.params.id);
    if (!handoff) {
      return res.status(404).json({ success: false, error: 'Handoff not found' });
    }
    res.json({ success: true, data: handoff });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Offer to agent
router.post('/handoffs/:id/offer', async (req: res: Response) => {
  try {
    const { agentId, agentName, team, timeoutMs } = req.body;

    if (!agentId || !agentName || !team) {
      return res.status(400).json({
        success: false,
        error: 'agentId, agentName, and team required'
      });
    }

    const result = await handoffService.offerToAgent(
      req.params.id,
      agentId,
      agentName,
      team,
      timeoutMs || 30000
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Handoff not found' });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Accept offer
router.post('/offers/:id/accept', async (req: res: Response) => {
  try {
    const agentId = req.headers['x-agent-id'] as string;

    const result = await handoffService.acceptOffer(req.params.id, agentId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Offer not found or expired' });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Decline offer
router.post('/offers/:id/decline', async (req: res: Response) => {
  try {
    const agentId = req.headers['x-agent-id'] as string;

    const offer = await handoffService.declineOffer(req.params.id, agentId);
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete handoff
router.post('/handoffs/:id/complete', async (req: res: Response) => {
  try {
    const { feedback, agentNotes } = req.body;

    const handoff = await handoffService.completeHandoff(req.params.id, feedback, agentNotes);
    if (!handoff) {
      return res.status(404).json({ success: false, error: 'Handoff not found' });
    }

    res.json({ success: true, data: handoff });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel handoff
router.post('/handoffs/:id/cancel', async (req: res: Response) => {
  try {
    const { reason } = req.body;

    const handoff = await handoffService.cancelHandoff(req.params.id, reason);
    if (!handoff) {
      return res.status(404).json({ success: false, error: 'Handoff not found' });
    }

    res.json({ success: true, data: handoff });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ QUEUE ============

// Get queue
router.get('/queue', async (req: res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { team } = req.query;

    const queue = await handoffService.getQueue(tenantId, team as string);
    res.json({ success: true, data: queue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get queue stats
router.get('/queue/stats', async (req: res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const stats = await handoffService.getQueueStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ RULES ============

// Get rules
router.get('/rules', async (req: res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const rules = await handoffService.getRules(tenantId);
    res.json({ success: true, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create rule
router.post('/rules', async (req: res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { name, description, conditions, action, priority } = req.body;

    if (!name || !conditions || !action) {
      return res.status(400).json({
        success: false,
        error: 'name, conditions, and action required'
      });
    }

    const rule = await handoffService.createRule({
      tenantId,
      name,
      description,
      conditions,
      action,
      priority
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update rule
router.put('/rules/:id', async (req: res: Response) => {
  try {
    const rule = await handoffService.updateRule(req.params.id, req.body);
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    res.json({ success: true, data: rule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete rule
router.delete('/rules/:id', async (req: res: Response) => {
  try {
    const deleted = await handoffService.deleteRule(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Evaluate rules
router.post('/rules/evaluate', async (req: res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const context = req.body;

    const result = await handoffService.evaluateRules(tenantId, context);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ANALYTICS ============

// Get analytics
router.get('/analytics', async (req: res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { start, end } = req.query;

    const startDate = start ? new Date(start as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date();

    const analytics = await handoffService.getAnalytics(tenantId, startDate, endDate);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
