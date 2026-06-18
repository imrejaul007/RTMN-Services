import { Router, Request, Response } from 'express';
import { store, RoutingRule, Condition, RoutingPriority } from '../models/Automation';
import { RoutingEngine } from '../services/routingEngine';

const router = Router();
const routingEngine = new RoutingEngine();

// Create routing rule
router.post('/rules', (req: Request, res: Response) => {
  try {
    const { name, description, conditions, targetQueue, targetAgent, priority, score, active, order } = req.body;

    if (!name || !targetQueue) {
      return res.status(400).json({ error: 'name and targetQueue are required' });
    }

    const rule = store.createRoutingRule({
      name,
      description,
      conditions: conditions as Condition[],
      targetQueue,
      targetAgent,
      priority: priority as RoutingPriority,
      score,
      active,
      order
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all routing rules
router.get('/rules', (req: Request, res: Response) => {
  try {
    const { active, priority } = req.query;
    let rules = store.getAllRoutingRules();

    if (active !== undefined) {
      rules = rules.filter(r => r.active === (active === 'true'));
    }
    if (priority) {
      rules = rules.filter(r => r.priority === priority);
    }

    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get routing rule by ID
router.get('/rules/:id', (req: Request, res: Response) => {
  try {
    const rule = store.getRoutingRule(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Routing rule not found' });
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update routing rule
router.put('/rules/:id', (req: Request, res: Response) => {
  try {
    const updated = store.updateRoutingRule(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Routing rule not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete routing rule
router.delete('/rules/:id', (req: Request, res: Response) => {
  try {
    const deleted = store.deleteRoutingRule(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Routing rule not found' });
    }
    res.json({ message: 'Routing rule deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Route a lead
router.post('/route', async (req: Request, res: Response) => {
  try {
    const { leadId, dealId, leadData, priority } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' });
    }

    const result = await routingEngine.routeLead({
      leadId,
      dealId,
      leadData: leadData || {},
      priority: priority as RoutingPriority
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// List queues
router.get('/queues', (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    let queues = store.getAllQueues();

    if (active !== undefined) {
      queues = queues.filter(q => q.active === (active === 'true'));
    }

    res.json(queues);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create queue
router.post('/queues', (req: Request, res: Response) => {
  try {
    const { name, description, agents, capacity, priority } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const queue = store.createQueue({
      name,
      description,
      agents,
      capacity,
      priority
    });

    res.status(201).json(queue);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get queue by ID
router.get('/queues/:id', (req: Request, res: Response) => {
  try {
    const queue = store.getQueue(req.params.id);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Batch route leads
router.post('/route/batch', async (req: Request, res: Response) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const results = await routingEngine.batchRouteLeads(leads);
    res.json({ processed: results.length, results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
