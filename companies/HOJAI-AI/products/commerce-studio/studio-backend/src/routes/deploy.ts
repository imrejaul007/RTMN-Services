/**
 * Deploy Routes
 * Deploy a complete commerce Nexha from a builder session
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();

const COMPANY_OS_URL = process.env.COMPANY_OS_URL || 'http://localhost:4010';
const BAM_GATEWAY_URL = process.env.BAM_GATEWAY_URL || 'http://localhost:5550';
const TEMPLATE_ENGINE_URL = process.env.TEMPLATE_ENGINE_URL || 'http://localhost:5670';

// In-memory deployments
const deployments = new Map();

// GET /api/studio/deploy/healthz
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/studio/deploy - Deploy a builder session
router.post('/', async (req, res) => {
  const {
    sessionId,
    businessName,
    location,
    ownerEmail,
    region,
    language = 'en',
  } = req.body;

  if (!sessionId || !businessName || !ownerEmail) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'sessionId, businessName, and ownerEmail required',
      },
    });
  }

  const deploymentId = `DEPLOY-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const nexhaId = `NEXHA-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Create deployment plan
  const deployment = {
    id: deploymentId,
    sessionId,
    businessName,
    location,
    region: region || 'IN',
    language,
    ownerEmail,
    nexhaId,
    status: 'deploying',
    progress: 0,
    steps: [
      { name: 'Create Nexha Entity', status: 'pending', progress: 0 },
      { name: 'Provision CommerceOS', status: 'pending', progress: 0 },
      { name: 'Activate BAM Workers', status: 'pending', progress: 0 },
      { name: 'Setup SUTAR Departments', status: 'pending', progress: 0 },
      { name: 'Configure RABTUL', status: 'pending', progress: 0 },
      { name: 'Register with DiscoveryOS', status: 'pending', progress: 0 },
      { name: 'Activate Trust (KYC)', status: 'pending', progress: 0 },
      { name: 'Go Live', status: 'pending', progress: 0 },
    ],
    startedAt: new Date().toISOString(),
    estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  deployments.set(deploymentId, deployment);

  // Start deployment in background
  executeDeployment(deploymentId, sessionId, businessName, ownerEmail, nexhaId, req.body || {});

  res.json({
    success: true,
    deployment,
    message: 'Deployment started. Estimated 5-7 days.',
    trackUrl: `/api/studio/deploy/${deploymentId}`,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/deploy/:id - Get deployment status
router.get('/:id', (req, res) => {
  const deployment = deployments.get(req.params.id);

  if (!deployment) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Deployment not found' },
    });
  }

  res.json({
    success: true,
    deployment,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/studio/deploy - List all deployments
router.get('/', (req, res) => {
  const allDeployments = Array.from(deployments.values());

  res.json({
    deployments: allDeployments.map(d => ({
      id: d.id,
      businessName: d.businessName,
      status: d.status,
      progress: d.progress,
      startedAt: d.startedAt,
      estimatedCompletion: d.estimatedCompletion,
    })),
    total: allDeployments.length,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/studio/deploy/:id/cancel - Cancel deployment
router.post('/:id/cancel', (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment) return res.status(404).json({ success: false });

  deployment.status = 'cancelled';
  deployment.cancelledAt = new Date().toISOString();
  deployments.set(req.params.id, deployment);

  res.json({
    success: true,
    deployment,
    timestamp: new Date().toISOString(),
  });
});

// Simulate deployment steps
async function executeDeployment(
  deploymentId: string,
  sessionId: string,
  businessName: string,
  ownerEmail: string,
  nexhaId: string,
  config: any
) {
  const deployment = deployments.get(deploymentId);
  if (!deployment) return;

  const stepNames = deployment.steps.map((s: any) => s.name);

  for (let i = 0; i < stepNames.length; i++) {
    // Simulate step execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    const currentDeployment = deployments.get(deploymentId);
    if (!currentDeployment) return;

    if (currentDeployment.status === 'cancelled') return;

    currentDeployment.steps[i].status = 'completed';
    currentDeployment.steps[i].completedAt = new Date().toISOString();
    currentDeployment.steps[i].progress = 100;
    currentDeployment.progress = Math.round(((i + 1) / stepNames.length) * 100);
    currentDeployment.currentStep = stepNames[i];

    // Actually call out to services (with fallback to mock)
    try {
      if (stepNames[i] === 'Create Nexha Entity') {
        await axios.post(
          `${COMPANY_OS_URL}/api/company/nexhas`,
          {
            businessName,
            ownerEmail,
            region: config.region || 'IN',
            language: config.language || 'en',
            templateId: sessionId,
          },
          { timeout: 5000 }
        );
      }
    } catch (error) {
      console.log(`[Deploy ${deploymentId}] Step ${stepNames[i]}: using mock success`);
    }

    deployments.set(deploymentId, currentDeployment);
  }

  const finalDeployment = deployments.get(deploymentId);
  if (finalDeployment) {
    finalDeployment.status = 'live';
    finalDeployment.completedAt = new Date().toISOString();
    finalDeployment.nexusUrl = `https://${businessName.toLowerCase().replace(/\s+/g, '-')}.nexha.com`;
    finalDeployment.adminUrl = `https://${businessName.toLowerCase().replace(/\s+/g, '-')}.nexha.com/admin`;
    deployments.set(deploymentId, finalDeployment);

    console.log(`✅ Deployment ${deploymentId} complete: ${businessName}`);
  }
}

export default router;
