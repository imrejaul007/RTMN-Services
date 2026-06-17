import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  resolutionStore,
  resolutionTemplates,
  CreateResolutionRequest,
  UpdateResolutionRequest,
  Resolution,
  ResolutionTemplate
} from '../models/Resolution';

const router = Router();

// Get all resolutions
router.get('/', (req: Request, res: Response) => {
  const { status, priority, customerId, limit = 50, offset = 0 } = req.query;

  let resolutions = Array.from(resolutionStore.values());

  if (status) {
    resolutions = resolutions.filter(r => r.status === status);
  }
  if (priority) {
    resolutions = resolutions.filter(r => r.priority === priority);
  }
  if (customerId) {
    resolutions = resolutions.filter(r => r.customerId === customerId);
  }

  // Sort by createdAt descending
  resolutions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = resolutions.length;
  const paginated = resolutions.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ resolutions: paginated, total, limit: Number(limit), offset: Number(offset) });
});

// Get single resolution
router.get('/:id', (req: Request, res: Response) => {
  const resolution = resolutionStore.get(req.params.id);
  if (!resolution) {
    return res.status(404).json({ error: 'Resolution not found' });
  }
  res.json(resolution);
});

// Create new resolution
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateResolutionRequest = req.body;

    if (!data.ticketId || !data.title || !data.customerId) {
      return res.status(400).json({ error: 'Missing required fields: ticketId, title, customerId' });
    }

    const slaConfig = {
      critical: 1,
      high: 4,
      medium: 24,
      low: 72
    };

    const now = new Date();
    const slaHours = slaConfig[data.priority as keyof typeof slaConfig] || 24;

    const resolution: Resolution = {
      id: uuidv4(),
      ticketId: data.ticketId,
      title: data.title,
      description: data.description || '',
      category: data.category || 'general',
      priority: data.priority || 'medium',
      status: 'open',
      customerId: data.customerId,
      customerTier: data.customerTier,
      slaConfig,
      slaBreached: false,
      slaResponseDeadline: new Date(now.getTime() + (slaHours / 2) * 60 * 60 * 1000),
      slaResolutionDeadline: new Date(now.getTime() + slaHours * 60 * 60 * 1000),
      escalationCount: 0,
      escalationHistory: [],
      tags: data.tags || [],
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    resolutionStore.set(resolution.id, resolution);

    // Try auto-resolution
    const resolverService = req.app.get('resolverService');
    const result = await resolverService.tryAutoResolve(resolution);

    if (result.resolved) {
      const updated = resolutionStore.get(resolution.id);
      return res.status(201).json({ resolution: updated, autoResolved: true, match: result.match });
    }

    res.status(201).json({ resolution, autoResolved: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update resolution
router.patch('/:id', (req: Request, res: Response) => {
  const resolution = resolutionStore.get(req.params.id);
  if (!resolution) {
    return res.status(404).json({ error: 'Resolution not found' });
  }

  const updates: UpdateResolutionRequest = req.body;

  if (updates.title) resolution.title = updates.title;
  if (updates.description) resolution.description = updates.description;
  if (updates.category) resolution.category = updates.category;
  if (updates.priority) resolution.priority = updates.priority;
  if (updates.status) resolution.status = updates.status;
  if (updates.assignedAgent) resolution.assignedAgent = updates.assignedAgent;
  if (updates.resolution) resolution.resolution = updates.resolution;
  if (updates.steps) resolution.steps = updates.steps;
  if (updates.resolutionMethod) resolution.resolutionMethod = updates.resolutionMethod;
  if (updates.slaConfig) resolution.slaConfig = { ...resolution.slaConfig, ...updates.slaConfig };

  resolution.updatedAt = new Date();

  if (updates.status === 'resolved' && !resolution.resolvedAt) {
    resolution.resolvedAt = new Date();
  }
  if (updates.status === 'closed' && !resolution.closedAt) {
    resolution.closedAt = new Date();
  }

  resolutionStore.set(resolution.id, resolution);
  res.json(resolution);
});

// Manual resolution
router.post('/:id/resolve', (req: Request, res: Response) => {
  const resolution = resolutionStore.get(req.params.id);
  if (!resolution) {
    return res.status(404).json({ error: 'Resolution not found' });
  }

  const { resolution: resolutionText, steps, agentId, agentName } = req.body;

  resolution.resolution = resolutionText;
  resolution.steps = steps || [];
  resolution.resolutionMethod = 'manual';
  resolution.status = 'resolved';
  resolution.resolvedAt = new Date();
  resolution.updatedAt = new Date();
  resolution.assignedAgent = {
    agentId: agentId || 'manual',
    agentName: agentName || 'Support Agent',
    team: 'support',
    skills: [],
    workload: 0,
    assignedAt: new Date()
  };

  resolutionStore.set(resolution.id, resolution);
  res.json(resolution);
});

// Escalate resolution
router.post('/:id/escalate', (req: Request, res: Response) => {
  const resolution = resolutionStore.get(req.params.id);
  if (!resolution) {
    return res.status(404).json({ error: 'Resolution not found' });
  }

  const { reason, escalateTo, newPriority } = req.body;

  resolution.escalationCount += 1;
  resolution.escalationHistory.push({
    escalatedAt: new Date(),
    escalatedTo: escalateTo || 'senior-agent',
    reason: reason || 'Manual escalation',
    previousPriority: resolution.priority
  });

  if (newPriority) {
    resolution.priority = newPriority;
    resolution.escalationHistory[resolution.escalationHistory.length - 1].newPriority = newPriority;
  }

  resolution.status = 'escalated';
  resolution.escalatedTo = escalateTo;
  resolution.updatedAt = new Date();

  resolutionStore.set(resolution.id, resolution);
  res.json(resolution);
});

// Get resolution templates
router.get('/templates/list', (req: Request, res: Response) => {
  const templates = Array.from(resolutionTemplates.values());
  res.json({ templates });
});

// Add resolution template
router.post('/templates', (req: Request, res: Response) => {
  const template: ResolutionTemplate = {
    id: uuidv4(),
    ...req.body
  };

  resolutionTemplates.set(template.id, template);
  res.status(201).json(template);
});

// Search templates
router.get('/templates/search', (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const query = (q as string).toLowerCase();
  const matches = Array.from(resolutionTemplates.values()).filter(tpl =>
    tpl.keywords.some(kw => kw.toLowerCase().includes(query)) ||
    tpl.title.toLowerCase().includes(query) ||
    tpl.name.toLowerCase().includes(query)
  );

  res.json({ templates: matches });
});

// Get resolution stats
router.get('/stats/summary', (req: Request, res: Response) => {
  const resolutions = Array.from(resolutionStore.values());

  const stats = {
    total: resolutions.length,
    byStatus: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    autoResolved: resolutions.filter(r => r.resolutionMethod === 'auto' || r.resolutionMethod === 'kb').length,
    escalated: resolutions.filter(r => r.escalationCount > 0).length,
    slaBreached: resolutions.filter(r => r.slaBreached).length,
    avgResolutionTime: 0
  };

  resolutions.forEach(r => {
    stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
    stats.byPriority[r.priority] = (stats.byPriority[r.priority] || 0) + 1;
  });

  // Calculate average resolution time
  const resolved = resolutions.filter(r => r.resolvedAt);
  if (resolved.length > 0) {
    const totalTime = resolved.reduce((sum, r) => {
      return sum + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime());
    }, 0);
    stats.avgResolutionTime = Math.round(totalTime / resolved.length / (1000 * 60 * 60) * 10) / 10; // hours
  }

  res.json(stats);
});

export default router;
