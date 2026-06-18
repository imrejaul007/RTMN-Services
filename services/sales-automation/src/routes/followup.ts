import { Router, Request, Response } from 'express';
import { store, FollowUp, FollowUpType } from '../models/Automation';
import { FollowUpEngine } from '../services/followupEngine';

const router = Router();
const followUpEngine = new FollowUpEngine();

// Create follow-up
router.post('/', async (req: Request, res: Response) => {
  try {
    const { leadId, dealId, type, channel, template, subject, scheduledAt, maxAttempts, priority, sequence, metadata } = req.body;

    if (!leadId || !template) {
      return res.status(400).json({ error: 'leadId and template are required' });
    }

    const followUp = store.createFollowUp({
      leadId,
      dealId,
      type: type as FollowUpType || 'email',
      channel: channel || 'email',
      template,
      subject,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      maxAttempts,
      priority,
      sequence,
      metadata
    });

    res.status(201).json(followUp);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all follow-ups
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, leadId, priority } = req.query;
    let followUps = store.getAllFollowUps();

    if (status) {
      followUps = followUps.filter(f => f.status === status);
    }
    if (leadId) {
      followUps = followUps.filter(f => f.leadId === leadId);
    }
    if (priority) {
      followUps = followUps.filter(f => f.priority === priority);
    }

    res.json(followUps);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get follow-up by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const followUp = store.getFollowUp(req.params.id);
    if (!followUp) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    res.json(followUp);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update follow-up
router.put('/:id', (req: Request, res: Response) => {
  try {
    const updated = store.updateFollowUp(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete follow-up
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = store.deleteFollowUp(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    res.json({ message: 'Follow-up deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Execute follow-up
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const followUp = store.getFollowUp(req.params.id);
    if (!followUp) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    const result = await followUpEngine.executeFollowUp(followUp);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Skip follow-up
router.post('/:id/skip', (req: Request, res: Response) => {
  try {
    const updated = store.updateFollowUp(req.params.id, { status: 'skipped' });
    if (!updated) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create follow-up sequence
router.post('/sequence', (req: Request, res: Response) => {
  try {
    const { name, leadId, steps } = req.body;

    if (!name || !leadId || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'name, leadId, and steps array are required' });
    }

    const sequence = {
      id: `seq_${Date.now()}`,
      name,
      leadId,
      steps,
      active: true,
      currentStep: 0,
      createdAt: new Date()
    };

    res.status(201).json(sequence);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Process pending follow-ups
router.post('/process', async (req: Request, res: Response) => {
  try {
    const results = await followUpEngine.processPendingFollowUps();
    res.json({ processed: results.length, results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
