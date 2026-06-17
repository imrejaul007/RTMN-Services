import { Router, Request, Response } from 'express';
import { experimentModel } from '../models/Experiment';
import { variantModel } from '../models/Variant';
import { resultModel } from '../models/Result';
import { assignVariant } from '../services/assigner';

const router = Router();

interface AssignmentRequest {
  experimentId: string;
  userId: string;
  sessionId?: string;
  userAttributes?: Record<string, unknown>;
}

// Get variant assignment for user
router.post('/variant', async (req: Request, res: Response) => {
  try {
    const { experimentId, userId, sessionId, userAttributes }: AssignmentRequest = req.body;

    if (!experimentId || !userId) {
      res.status(400).json({ error: 'experimentId and userId are required' });
      return;
    }

    const experiment = experimentModel.findById(experimentId);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    if (experiment.status !== 'running') {
      res.status(400).json({ error: 'Experiment is not running' });
      return;
    }

    // Check targeting rules
    if (experiment.targetingRules && userAttributes) {
      for (const rule of experiment.targetingRules) {
        const userValue = userAttributes[rule.field];
        let matches = false;

        switch (rule.operator) {
          case 'eq':
            matches = userValue === rule.value;
            break;
          case 'neq':
            matches = userValue !== rule.value;
            break;
          case 'gt':
            matches = typeof userValue === 'number' && userValue > (rule.value as number);
            break;
          case 'lt':
            matches = typeof userValue === 'number' && userValue < (rule.value as number);
            break;
          case 'contains':
            matches = typeof userValue === 'string' && userValue.includes(rule.value as string);
            break;
          case 'in':
            matches = Array.isArray(rule.value) && rule.value.includes(userValue as never);
            break;
        }

        if (!matches) {
          res.json({
            assigned: false,
            reason: 'User does not match targeting criteria',
          });
          return;
        }
      }
    }

    // Check traffic allocation
    if (experiment.trafficAllocation < 100) {
      const hash = hashUserId(userId, experimentId);
      if (hash > experiment.trafficAllocation) {
        res.json({
          assigned: false,
          reason: 'User not in traffic allocation',
        });
        return;
      }
    }

    // Assign variant
    const variant = assignVariant(userId, experiment);
    const variantRecord = variantModel.findByExperiment(experimentId)
      .find(v => v.name === variant.name);

    if (variantRecord) {
      variantModel.incrementImpression(variantRecord.id);
      resultModel.create({
        experimentId,
        variantId: variantRecord.id,
        userId,
        sessionId,
        eventType: 'impression',
      });
    }

    res.json({
      assigned: true,
      variant: variant,
      experimentId,
      userId,
    });
  } catch (error) {
    console.error('Assignment error:', error);
    res.status(500).json({ error: 'Failed to assign variant' });
  }
});

// Record conversion event
router.post('/conversion', async (req: Request, res: Response) => {
  try {
    const { experimentId, variantId, userId, sessionId, metricValue, metadata } = req.body;

    if (!experimentId || !variantId) {
      res.status(400).json({ error: 'experimentId and variantId are required' });
      return;
    }

    const experiment = experimentModel.findById(experimentId);
    if (!experiment) {
      res.status(404).json({ error: 'Experiment not found' });
      return;
    }

    variantModel.incrementConversion(variantId);

    const result = resultModel.create({
      experimentId,
      variantId,
      userId,
      sessionId,
      eventType: 'conversion',
      metricValue,
      metadata,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record conversion' });
  }
});

// Record custom event
router.post('/event', async (req: Request, res: Response) => {
  try {
    const { experimentId, variantId, userId, sessionId, eventType, metricValue, metadata } = req.body;

    if (!experimentId || !variantId || !eventType) {
      res.status(400).json({ error: 'experimentId, variantId, and eventType are required' });
      return;
    }

    const result = resultModel.create({
      experimentId,
      variantId,
      userId,
      sessionId,
      eventType,
      metricValue,
      metadata,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// Simple hash function for deterministic user assignment
function hashUserId(userId: string, experimentId: string): number {
  const str = `${userId}:${experimentId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 100);
}

export default router;
