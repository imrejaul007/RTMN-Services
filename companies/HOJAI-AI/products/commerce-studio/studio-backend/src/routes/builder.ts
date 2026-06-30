/**
 * Builder Routes
 * 6-step wizard for creating commerce Nexhas
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();

const TEMPLATE_ENGINE_URL = process.env.TEMPLATE_ENGINE_URL || 'http://localhost:5670';
const BAM_GATEWAY_URL = process.env.BAM_GATEWAY_URL || 'http://localhost:5550';

// In-memory configuration sessions
const sessions = new Map();

interface BuilderSession {
  id: string;
  templateId?: string;
  templateConfig?: any;
  commerceConfig?: any;
  selectedWorkers?: string[];
  trustConfig?: any;
  financeConfig?: any;
  step: number;
  status: 'draft' | 'configured' | 'deployed';
  createdAt: string;
  updatedAt: string;
}

// POST /api/studio/builder/sessions - Create new builder session
router.post('/sessions', (req, res) => {
  const sessionId = `BUILD-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const session: BuilderSession = {
    id: sessionId,
    step: 1,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  sessions.set(sessionId, session);

  res.json({
    success: true,
    session,
    nextStep: 1,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/builder/sessions/:id
router.get('/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Session not found' },
    });
  }

  res.json({
    success: true,
    session,
    timestamp: new Date().toISOString(),
  });
});

// PUT /api/studio/builder/sessions/:id/step/1 - Step 1: Template Selection
router.put('/sessions/:id/step/1', async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false });

  const { templateId } = req.body;

  if (!templateId) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'templateId required' },
    });
  }

  try {
    // Fetch template details
    const response = await axios.get(
      `${TEMPLATE_ENGINE_URL}/api/templates/${templateId}`,
      { timeout: 5000 }
    );
    session.templateId = templateId;
    session.templateConfig = response.data.template;
    session.step = 2;
    session.updatedAt = new Date().toISOString();
    sessions.set(req.params.id, session);

    res.json({
      success: true,
      session,
      nextStep: 2,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'TEMPLATE_ERROR', message: error.message },
    });
  }
});

// PUT /api/studio/builder/sessions/:id/step/2 - Step 2: Commerce Configuration
router.put('/sessions/:id/step/2', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false });

  const { modules, pricingStrategy, paymentMethods } = req.body;

  if (!modules || !Array.isArray(modules)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'modules array required' },
    });
  }

  session.commerceConfig = {
    modules,
    pricingStrategy: pricingStrategy || 'fixed',
    paymentMethods: paymentMethods || ['UPI', 'cards'],
  };
  session.step = 3;
  session.updatedAt = new Date().toISOString();
  sessions.set(req.params.id, session);

  res.json({
    success: true,
    session,
    nextStep: 3,
    timestamp: new Date().toISOString(),
  });
});

// PUT /api/studio/builder/sessions/:id/step/3 - Step 3: Worker Selection
router.put('/sessions/:id/step/3', async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false });

  const { workerIds } = req.body;

  if (!workerIds || !Array.isArray(workerIds)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'workerIds array required' },
    });
  }

  // Calculate cost
  let totalCost = 0;
  try {
    const workersResponse = await axios.get(
      `${BAM_GATEWAY_URL}/api/workers`,
      { timeout: 5000 }
    );
    const allWorkers = workersResponse.data.workers || [];
    for (const id of workerIds) {
      const worker = allWorkers.find((w: any) => w.id === id);
      if (worker) {
        totalCost += worker.pricing?.basePrice || 999;
      }
    }
  } catch {
    totalCost = workerIds.length * 999;
  }

  session.selectedWorkers = workerIds;
  session.step = 4;
  session.estimatedMonthlyCost = totalCost;
  session.updatedAt = new Date().toISOString();
  sessions.set(req.params.id, session);

  res.json({
    success: true,
    session,
    nextStep: 4,
    estimatedMonthlyCost: totalCost,
    timestamp: new Date().toISOString(),
  });
});

// PUT /api/studio/builder/sessions/:id/step/4 - Step 4: Trust Setup
router.put('/sessions/:id/step/4', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false });

  const { documents, certifications, businessInfo } = req.body;

  session.trustConfig = {
    documents: documents || [],
    certifications: certifications || [],
    businessInfo: businessInfo || {},
  };
  session.step = 5;
  session.updatedAt = new Date().toISOString();
  sessions.set(req.params.id, session);

  res.json({
    success: true,
    session,
    nextStep: 5,
    timestamp: new Date().toISOString(),
  });
});

// PUT /api/studio/builder/sessions/:id/step/5 - Step 5: Finance Setup
router.put('/sessions/:id/step/5', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false });

  const { paymentMethods, settlementTerms, escrowEnabled } = req.body;

  session.financeConfig = {
    paymentMethods: paymentMethods || ['UPI', 'cards'],
    settlementTerms: settlementTerms || 'T+2',
    escrowEnabled: escrowEnabled !== false,
  };
  session.step = 6;
  session.status = 'configured';
  session.updatedAt = new Date().toISOString();
  sessions.set(req.params.id, session);

  res.json({
    success: true,
    session,
    nextStep: 6,
    readyForDeployment: true,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/builder/sessions/:id/review - Step 6: Review
router.get('/sessions/:id/review', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false });

  res.json({
    success: true,
    summary: {
      template: session.templateConfig?.name || session.templateId,
      commerce: session.commerceConfig,
      workers: session.selectedWorkers?.length || 0,
      trust: session.trustConfig,
      finance: session.financeConfig,
      estimatedCost: session.estimatedMonthlyCost || 0,
      readyToDeploy: session.status === 'configured',
    },
    session,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/studio/builder/sessions/:id/validate - Validate entire configuration
router.post('/sessions/:id/validate', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ success: false });

  const errors: string[] = [];

  if (!session.templateId) errors.push('Template not selected');
  if (!session.commerceConfig) errors.push('Commerce not configured');
  if (!session.selectedWorkers || session.selectedWorkers.length === 0)
    errors.push('No workers selected');
  if (!session.trustConfig) errors.push('Trust not configured');
  if (!session.financeConfig) errors.push('Finance not configured');

  res.json({
    valid: errors.length === 0,
    errors,
    session,
    timestamp: new Date().toISOString(),
  });
});

export default router;
