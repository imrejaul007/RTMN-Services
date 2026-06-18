import { Router, Request, Response } from 'express';
import { store, EscalationRule, Escalation, EscalationLevel } from '../models/Automation';
import { EscalationEngine } from '../services/escalationEngine';

const router = Router();
const escalationEngine = new EscalationEngine();

// Create escalation rule
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, triggerType, triggerCondition, escalationLevels, responseTimeMinutes, urgentThresholdMinutes, active } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const rule = store.createEscalationRule({
      name,
      description,
      triggerType,
      triggerCondition,
      escalationLevels,
      responseTimeMinutes,
      urgentThresholdMinutes,
      active
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all escalation rules
router.get('/', (req: Request, res: Response) => {
  try {
    const { active, triggerType } = req.query;
    let rules = store.getAllEscalationRules();

    if (active !== undefined) {
      rules = rules.filter(r => r.active === (active === 'true'));
    }
    if (triggerType) {
      rules = rules.filter(r => r.triggerType === triggerType);
    }

    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get escalation rule by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const rule = store.getEscalationRule(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Escalation rule not found' });
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update escalation rule
router.put('/:id', (req: Request, res: Response) => {
  try {
    const updated = store.updateEscalationRule(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Escalation rule not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete escalation rule
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = store.deleteEscalationRule(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Escalation rule not found' });
    }
    res.json({ message: 'Escalation rule deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get pending escalations
router.get('/status/pending', (req: Request, res: Response) => {
  try {
    const escalations = store.getPendingEscalations();
    res.json(escalations);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all escalations
router.get('/all', (req: Request, res: Response) => {
  try {
    const { status, level } = req.query;
    let escalations = store.getAllEscalations();

    if (status) {
      escalations = escalations.filter(e => e.status === status);
    }
    if (level) {
      escalations = escalations.filter(e => e.currentLevel === parseInt(level as string));
    }

    res.json(escalations);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get escalation by ID
router.get('/item/:id', (req: Request, res: Response) => {
  try {
    const escalation = store.getEscalation(req.params.id);
    if (!escalation) {
      return res.status(404).json({ error: 'Escalation not found' });
    }
    res.json(escalation);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Trigger escalation manually
router.post('/trigger', (req: Request, res: Response) => {
  try {
    const { ruleId, leadId, dealId, level, metadata } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' });
    }

    const escalation = store.createEscalation({
      ruleId,
      leadId,
      dealId,
      currentLevel: level as EscalationLevel || 1,
      metadata
    });

    res.status(201).json(escalation);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Resolve escalation
router.post('/:id/resolve', (req: Request, res: Response) => {
  try {
    const escalation = store.getEscalation(req.params.id);
    if (!escalation) {
      return res.status(404).json({ error: 'Escalation not found' });
    }

    const { notes } = req.body;

    const updated = store.updateEscalation(req.params.id, {
      status: 'resolved',
      resolvedAt: new Date(),
      notes: [...escalation.notes, ...(notes ? [notes] : [])],
      history: [
        ...escalation.history,
        {
          level: escalation.currentLevel,
          action: 'resolved',
          timestamp: new Date(),
          notes
        }
      ]
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Escalate to next level
router.post('/:id/escalate', (req: Request, res: Response) => {
  try {
    const escalation = store.getEscalation(req.params.id);
    if (!escalation) {
      return res.status(404).json({ error: 'Escalation not found' });
    }

    const maxLevels = parseInt(process.env.ESCALATION_MAX_LEVELS || '4');
    if (escalation.currentLevel >= maxLevels) {
      return res.status(400).json({ error: 'Maximum escalation level reached' });
    }

    const newLevel = (escalation.currentLevel + 1) as EscalationLevel;

    const updated = store.updateEscalation(req.params.id, {
      currentLevel: newLevel,
      status: 'in_progress',
      history: [
        ...escalation.history,
        {
          level: newLevel,
          action: 'escalated',
          timestamp: new Date()
        }
      ]
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Check escalations (run pending checks)
router.post('/check', async (req: Request, res: Response) => {
  try {
    const results = await escalationEngine.checkPendingEscalations();
    res.json({ checked: results.length, results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
