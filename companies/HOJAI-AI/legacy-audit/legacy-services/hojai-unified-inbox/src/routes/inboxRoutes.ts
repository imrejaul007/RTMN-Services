import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { inboxService } from '../services';

const router = Router();

// ============ CONVERSATIONS ============

// Get conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { status, channel, assignedAgentId, priority, search, limit, offset } = req.query;

    const result = await inboxService.getConversations(tenantId, {
      status: status as string,
      channel: channel as string,
      assignedAgentId: assignedAgentId as string,
      priority: priority as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get conversation
router.get('/conversations/:id', async (req: res: Response) => {
  try {
    const conversation = await inboxService.getConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { channel, customer, subject, context } = req.body;

    if (!channel || !customer) {
      return res.status(400).json({ success: false, error: 'Channel and customer required' });
    }

    const conversation = await inboxService.createConversation({
      channel,
      tenantId,
      customer,
      subject,
      context
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assign conversation
router.post('/conversations/:id/assign', async (req: res: Response) => {
  try {
    const { agentId } = req.body;
    if (!agentId) {
      return res.status(400).json({ success: false, error: 'Agent ID required' });
    }

    const conversation = await inboxService.assignConversation(req.params.id, agentId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve conversation
router.post('/conversations/:id/resolve', async (req: res: Response) => {
  try {
    const conversation = await inboxService.resolveConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Close conversation
router.post('/conversations/:id/close', async (req: res: Response) => {
  try {
    const conversation = await inboxService.closeConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Transfer conversation
router.post('/conversations/:id/transfer', async (req: res: Response) => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ success: false, error: 'Team ID required' });
    }

    const conversation = await inboxService.transferConversation(req.params.id, teamId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add tag
router.post('/conversations/:id/tags', async (req: res: Response) => {
  try {
    const { tag } = req.body;
    const conversation = await inboxService.addTag(req.params.id, tag);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove tag
router.delete('/conversations/:id/tags/:tag', async (req: res: Response) => {
  try {
    const conversation = await inboxService.removeTag(req.params.id, req.params.tag);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ MESSAGES ============

// Get messages
router.get('/conversations/:id/messages', async (req: res: Response) => {
  try {
    const { limit, before } = req.query;
    const messages = await inboxService.getMessages(
      req.params.id,
      limit ? parseInt(limit as string) : 50,
      before ? new Date(before as string) : undefined
    );
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send message
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { type, direction, content, sender, metadata } = req.body;

    const message = await inboxService.addMessage({
      conversationId: req.params.id,
      channel: 'whatsapp',
      type: type || 'text',
      direction: direction || 'outbound',
      content,
      sender,
      metadata
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AGENTS ============

// Get agents
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { status, team } = req.query;

    const agents = await inboxService.getAgents(tenantId, {
      status: status as string,
      team: team as string
    });

    res.json({ success: true, data: agents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create agent
router.post('/agents', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { userId, name, email, role, teams, skills } = req.body;

    if (!userId || !name || !email) {
      return res.status(400).json({ success: false, error: 'userId, name, email required' });
    }

    const agent = await inboxService.createAgent({
      tenantId,
      userId,
      name,
      email,
      role,
      teams,
      skills
    });

    res.status(201).json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent
router.get('/agents/:id', async (req: res: Response) => {
  try {
    const agent = await inboxService.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set agent status
router.post('/agents/:id/status', async (req: res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status required' });
    }

    const agent = await inboxService.setAgentStatus(req.params.id, status);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ TEAMS ============

// Get teams
router.get('/teams', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const teams = await inboxService.getTeams(tenantId);
    res.json({ success: true, data: teams });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create team
router.post('/teams', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { name, channels, supervisorId } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Team name required' });
    }

    const team = await inboxService.createTeam({
      tenantId,
      name,
      channels,
      supervisorId
    });

    res.status(201).json({ success: true, data: team });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CANNED RESPONSES ============

// Search canned responses
router.get('/canned-responses', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { q, limit } = req.query;

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const responses = await inboxService.searchCannedResponses(
      tenantId,
      q as string,
      limit ? parseInt(limit as string) : 10
    );

    res.json({ success: true, data: responses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create canned response
router.post('/canned-responses', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const agentId = req.headers['x-agent-id'] as string;
    const { shortcut, content, category } = req.body;

    if (!shortcut || !content) {
      return res.status(400).json({ success: false, error: 'shortcut and content required' });
    }

    const response = await inboxService.createCannedResponse({
      tenantId,
      shortcut,
      content,
      category,
      agentId
    });

    res.status(201).json({ success: true, data: response });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Use canned response
router.post('/canned-responses/:id/use', async (req: res: Response) => {
  try {
    await inboxService.incrementCannedResponseUsage(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ STATISTICS ============

// Get stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const stats = await inboxService.getStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
