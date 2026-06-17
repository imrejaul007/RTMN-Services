import { Router, Request, Response } from 'express';
import { hojaiProfileModel, HojaiProduct } from '../models/HojaiProfile';
import { getBridge } from '../services/customerOpsBridge';
import { getTwinSync } from '../services/twinSync';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const router = Router();

router.post('/profiles', async (req: Request, res: Response) => {
  try {
    const { tenantId, hojaiUserId, products, preferences } = req.body;

    if (!tenantId || !hojaiUserId) {
      return res.status(400).json({ error: 'tenantId and hojaiUserId are required' });
    }

    const existing = hojaiProfileModel.getProfileByTenantAndUser(tenantId, hojaiUserId);
    if (existing) {
      return res.status(409).json({ error: 'Profile already exists', profile: existing });
    }

    const profile = hojaiProfileModel.createProfile({
      tenantId,
      hojaiUserId,
      products: products || [HojaiProduct.SUTAR],
      preferences
    });

    const bridge = getBridge();
    const twinSync = getTwinSync();

    bridge.syncUserToCustomerTwin(profile).catch(err =>
      logger.error('Customer Twin sync failed', { error: err.message })
    );

    twinSync.syncProfileToAgentTwin(profile).catch(err =>
      logger.error('Agent Twin sync failed', { error: err.message })
    );

    res.status(201).json({ profile });
  } catch (error: any) {
    logger.error('Create SUTAR profile error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/decisions', async (req: Request, res: Response) => {
  try {
    const { tenantId, decisionId, context, decision, confidence, agentId } = req.body;

    if (!tenantId || !decisionId || !context || !decision) {
      return res.status(400).json({
        error: 'tenantId, decisionId, context, and decision are required'
      });
    }

    const record = hojaiProfileModel.createDecisionRecord(
      tenantId,
      decisionId,
      context,
      decision,
      confidence || 0.5,
      agentId
    );

    const bridge = getBridge();
    const twinSync = getTwinSync();

    bridge.syncDecisionToEngine(
      tenantId,
      decisionId,
      context,
      decision,
      confidence || 0.5
    ).catch(err => logger.error('Decision Engine sync failed', { error: err.message }));

    twinSync.syncDecisionToDealTwin(record).catch(err =>
      logger.error('Deal Twin sync failed', { error: err.message })
    );

    res.status(201).json({ decision: record });
  } catch (error: any) {
    logger.error('Create decision error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/decisions', async (req: Request, res: Response) => {
  try {
    const { tenantId, limit } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const decisions = hojaiProfileModel.getDecisionRecords(
      tenantId as string,
      parseInt(limit as string) || 50
    );

    res.json({ decisions, count: decisions.length });
  } catch (error: any) {
    logger.error('List decisions error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/decisions/:decisionId/outcome', async (req: Request, res: Response) => {
  try {
    const { outcome } = req.body;
    const { decisionId } = req.params;

    const decisions = Array.from(
      new Map(
        hojaiProfileModel.getDecisionRecords('*', 1000).map(d => [d.decisionId, d])
      ).values()
    );
    const decision = decisions.find(d => d.decisionId === decisionId);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    decision.outcome = outcome;

    const bridge = getBridge();
    bridge.syncDecisionToEngine(
      decision.tenantId,
      decisionId,
      decision.context,
      decision.decision,
      decision.confidence
    ).catch(err => logger.error('Decision outcome sync failed', { error: err.message }));

    res.json({ decision });
  } catch (error: any) {
    logger.error('Update decision outcome error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/goals', async (req: Request, res: Response) => {
  try {
    const { tenantId, goalId, outcomeId } = req.body;

    if (!tenantId || !goalId) {
      return res.status(400).json({ error: 'tenantId and goalId are required' });
    }

    const mapping = hojaiProfileModel.createGoalMapping(tenantId, goalId, outcomeId);

    const bridge = getBridge();
    const twinSync = getTwinSync();

    if (outcomeId) {
      bridge.syncGoalToOutcomeIntelligence(
        tenantId,
        goalId,
        outcomeId,
        0
      ).catch(err => logger.error('Outcome Intelligence sync failed', { error: err.message }));
    }

    twinSync.syncGoalToTwin(mapping).catch(err =>
      logger.error('Goal Twin sync failed', { error: err.message })
    );

    res.status(201).json({ goalMapping: mapping });
  } catch (error: any) {
    logger.error('Create goal error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.put('/goals/:mappingId/progress', async (req: Request, res: Response) => {
  try {
    const { progress, milestoneId } = req.body;

    if (progress === undefined) {
      return res.status(400).json({ error: 'progress is required' });
    }

    const mapping = hojaiProfileModel.updateGoalProgress(
      req.params.mappingId,
      progress,
      milestoneId
    );

    if (!mapping) {
      return res.status(404).json({ error: 'Goal mapping not found' });
    }

    const bridge = getBridge();
    const twinSync = getTwinSync();

    if (mapping.outcomeId) {
      bridge.syncGoalToOutcomeIntelligence(
        mapping.tenantId,
        mapping.goalId,
        mapping.outcomeId,
        progress
      ).catch(err => logger.error('Outcome Intelligence sync failed', { error: err.message }));
    }

    twinSync.syncGoalToTwin(mapping).catch(err =>
      logger.error('Goal Twin sync failed', { error: err.message })
    );

    res.json({ goalMapping: mapping });
  } catch (error: any) {
    logger.error('Update goal progress error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/goals/:mappingId/milestones', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const { mappingId } = req.params;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const decisions = Array.from(
      new Map(
        hojaiProfileModel.getDecisionRecords('*', 1000).map(d => [d.decisionId, d])
      ).values()
    );

    const mappings = Array.from(
      new Map<string, typeof decisions[0]>().values()
    );

    let mapping = hojaiProfileModel.getDecisionRecords('*', 1)[0];
    hojaiProfileModel.updateGoalProgress(mappingId, 0);

    const updated = hojaiProfileModel.updateGoalProgress(mappingId, 0);

    if (!updated) {
      return res.status(404).json({ error: 'Goal mapping not found' });
    }

    updated.milestones.push({
      id: `MS-${Date.now()}`,
      title,
      completed: false
    });

    res.json({ goalMapping: updated });
  } catch (error: any) {
    logger.error('Add milestone error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/autonomous/execute', async (req: Request, res: Response) => {
  try {
    const { tenantId, action, parameters, agentId } = req.body;

    if (!tenantId || !action) {
      return res.status(400).json({ error: 'tenantId and action are required' });
    }

    const decisionId = `D-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const record = hojaiProfileModel.createDecisionRecord(
      tenantId,
      decisionId,
      {
        action,
        parameters,
        agentId,
        type: 'autonomous-execution',
        triggeredAt: new Date().toISOString()
      },
      `Execute ${action}`,
      0.8,
      agentId
    );

    const bridge = getBridge();
    const twinSync = getTwinSync();

    bridge.syncDecisionToEngine(
      tenantId,
      decisionId,
      record.context,
      record.decision,
      record.confidence
    ).catch(err => logger.error('Decision sync failed', { error: err.message }));

    twinSync.syncDecisionToDealTwin(record).catch(err =>
      logger.error('Deal Twin sync failed', { error: err.message })
    );

    res.json({
      decision: record,
      execution: {
        status: 'executed',
        action,
        parameters,
        agentId
      }
    });
  } catch (error: any) {
    logger.error('Autonomous execution error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/profiles/:profileId', async (req: Request, res: Response) => {
  try {
    const profile = hojaiProfileModel.getProfile(req.params.profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({ profile });
  } catch (error: any) {
    logger.error('Get SUTAR profile error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;
    const profiles = tenantId
      ? hojaiProfileModel.getProfilesByTenant(tenantId as string)
      : hojaiProfileModel.getAllProfiles();
    res.json({ profiles, count: profiles.length });
  } catch (error: any) {
    logger.error('List SUTAR profiles error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.post('/integrate/:profileId', async (req: Request, res: Response) => {
  try {
    const { externalId } = req.body;

    const profile = hojaiProfileModel.activateIntegration(
      req.params.profileId,
      HojaiProduct.SUTAR,
      externalId
    );

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const bridge = getBridge();
    const twinSync = getTwinSync();

    bridge.syncUserToCustomerTwin(profile).catch(err =>
      logger.error('Customer Twin sync failed', { error: err.message })
    );

    twinSync.syncProfileToAgentTwin(profile).catch(err =>
      logger.error('Agent Twin sync failed', { error: err.message })
    );

    res.json({ profile, integrationActivated: 'sutar' });
  } catch (error: any) {
    logger.error('SUTAR integration error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/health', async (req: Request, res: Response) => {
  try {
    const bridge = getBridge();
    const twinSync = getTwinSync();

    const [bridgeHealth, twinHealth] = await Promise.all([
      bridge.healthCheck(),
      twinSync.healthCheck()
    ]);

    const allHealthy = bridgeHealth.status === 'healthy' && twinHealth.status === 'healthy';

    res.json({
      service: 'hojai-sutar',
      status: allHealthy ? 'healthy' : 'degraded',
      bridge: bridgeHealth,
      twinSync: twinHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      service: 'hojai-sutar',
      status: 'error',
      error: error.message
    });
  }
});

export default router;
