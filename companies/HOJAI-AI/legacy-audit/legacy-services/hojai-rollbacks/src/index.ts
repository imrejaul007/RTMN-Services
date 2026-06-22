/**
 * HOJAI Rollbacks
 * One-click rollback to previous version
 * Port: 4594
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4594;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TYPES
// ============================================

interface Deployment {
  id: string;
  agentId: string;
  version: string;
  promptVersion: number;
  workflowVersion: number;
  status: 'active' | 'superseded';
  deployedAt: Date;
  deployedBy: string;
  environment: 'production' | 'staging' | 'development';
  metadata: Record<string, unknown>;
}

interface RollbackPoint {
  id: string;
  agentId: string;
  version: string;
  deploymentId: string;
  snapshot: Snapshot;
  reason: string;
  createdAt: Date;
  createdBy: string;
}

interface Snapshot {
  prompt: string;
  workflow: string;
  variables: Record<string, unknown>;
  config: Record<string, unknown>;
}

interface RollbackRequest {
  id: string;
  agentId: string;
  targetVersion: string;
  reason: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed';
  previousDeployment?: string;
  newDeployment?: string;
  createdAt: Date;
  completedAt?: Date;
}

const deployments = new Map();
const rollbacks = new Map();
const rollbackRequests = new Map();

// Seed demo data
function seed() {
  const demoDeployments: Deployment[] = [
    {
      id: 'dep-1',
      agentId: 'agent-support',
      version: 'v2.1.0',
      promptVersion: 3,
      workflowVersion: 5,
      status: 'active',
      deployedAt: new Date('2026-05-30'),
      deployedBy: 'admin',
      environment: 'production',
      metadata: {}
    },
    {
      id: 'dep-2',
      agentId: 'agent-support',
      version: 'v2.0.0',
      promptVersion: 2,
      workflowVersion: 4,
      status: 'superseded',
      deployedAt: new Date('2026-05-20'),
      deployedBy: 'admin',
      environment: 'production',
      metadata: {}
    },
    {
      id: 'dep-3',
      agentId: 'agent-sales',
      version: 'v1.5.0',
      promptVersion: 4,
      workflowVersion: 3,
      status: 'active',
      deployedAt: new Date('2026-05-28'),
      deployedBy: 'admin',
      environment: 'production',
      metadata: {}
    }
  ];

  demoDeployments.forEach(d => deployments.set(d.id, d));
  console.log(`HOJAI Rollbacks seeded ${demoDeployments.length} deployments`);
}

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-rollbacks',
  status: 'healthy',
  port: PORT,
  tagline: 'One-click rollback to previous version'
}));

// Get deployment history
app.get('/api/deployments', (req, res) => {
  const { agentId, environment } = req.query;
  let result = Array.from(deployments.values());

  if (agentId) result = result.filter(d => d.agentId === agentId);
  if (environment) result = result.filter(d => d.environment === environment);

  result.sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());

  res.json({ success: true, data: result });
});

// Get active deployment
app.get('/api/deployments/active/:agentId', (req, res) => {
  const active = Array.from(deployments.values())
    .find(d => d.agentId === req.params.agentId && d.status === 'active');

  if (!active) return res.status(404).json({ error: 'No active deployment found' });

  res.json({ success: true, data: active });
});

// Create rollback point (before deployment)
app.post('/api/rollback-points', (req, res) => {
  const { agentId, version, deploymentId, prompt, workflow, reason } = req.body;

  const point: RollbackPoint = {
    id: uuidv4().slice(0, 8),
    agentId,
    version,
    deploymentId,
    snapshot: {
      prompt: prompt || 'Current prompt content',
      workflow: workflow || 'Current workflow',
      variables: {},
      config: {}
    },
    reason: reason || 'Manual snapshot',
    createdAt: new Date(),
    createdBy: 'admin'
  };

  rollbacks.set(point.id, point);

  res.status(201).json({ success: true, data: point });
});

// Get rollback points
app.get('/api/rollback-points/:agentId', (req, res) => {
  const points = Array.from(rollbacks.values())
    .filter(p => p.agentId === req.params.agentId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ success: true, data: points });
});

// Request rollback
app.post('/api/rollback', (req, res) => {
  const { agentId, targetVersion, reason, autoApprove = false } = req.body;

  // Find target deployment
  const targetDeployment = Array.from(deployments.values())
    .find(d => d.agentId === agentId && d.version === targetVersion);

  if (!targetDeployment) {
    return res.status(404).json({ error: 'Version not found' });
  }

  // Find current active deployment
  const currentActive = Array.from(deployments.values())
    .find(d => d.agentId === agentId && d.status === 'active');

  const request: RollbackRequest = {
    id: uuidv4().slice(0, 8),
    agentId,
    targetVersion,
    reason,
    status: autoApprove ? 'approved' : 'pending',
    previousDeployment: currentActive?.id,
    createdAt: new Date()
  };

  rollbackRequests.set(request.id, request);

  // Auto-approve
  if (autoApprove) {
    setTimeout(() => executeRollback(request.id), 1000);
  }

  res.status(201).json({
    success: true,
    data: {
      requestId: request.id,
      status: request.status,
      message: autoApprove ? 'Rollback approved and in progress' : 'Rollback pending approval'
    }
  });
});

// Execute rollback
async function executeRollback(requestId: string) {
  const request = rollbackRequests.get(requestId);
  if (!request) return;

  request.status = 'in_progress';
  rollbackRequests.set(requestId, request);

  // Deactivate current
  const current = Array.from(deployments.values())
    .find(d => d.agentId === request.agentId && d.status === 'active');

  if (current) {
    current.status = 'superseded';
    deployments.set(current.id, current);
  }

  // Activate target
  const target = Array.from(deployments.values())
    .find(d => d.agentId === request.agentId && d.version === request.targetVersion);

  if (target) {
    target.status = 'active';
    deployments.set(target.id, target);
    request.newDeployment = target.id;
  }

  request.status = 'completed';
  request.completedAt = new Date();
  rollbackRequests.set(requestId, request);
}

// Approve rollback
app.post('/api/rollback/:id/approve', (req, res) => {
  const request = rollbackRequests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  request.status = 'approved';
  rollbackRequests.set(req.params.id, request);

  // Execute in background
  executeRollback(request.id);

  res.json({
    success: true,
    message: 'Rollback approved and executing'
  });
});

// Get rollback request
app.get('/api/rollback/:id', (req, res) => {
  const request = rollbackRequests.get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ success: true, data: request });
});

// List rollback requests
app.get('/api/rollback', (req, res) => {
  const { agentId, status } = req.query;
  let result = Array.from(rollbackRequests.values());

  if (agentId) result = result.filter(r => r.agentId === agentId);
  if (status) result = result.filter(r => r.status === status);

  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ success: true, data: result });
});

// Quick rollback (one-click)
app.post('/api/rollback/:agentId/quick', (req, res) => {
  const request: RollbackRequest = {
    id: uuidv4().slice(0, 8),
    agentId: req.params.agentId,
    targetVersion: 'previous',
    reason: 'Quick rollback',
    status: 'in_progress',
    createdAt: new Date()
  };

  // Find previous version
  const active = Array.from(deployments.values())
    .find(d => d.agentId === req.params.agentId && d.status === 'active');

  if (active) {
    const previous = Array.from(deployments.values())
      .filter(d => d.agentId === req.params.agentId && d.version !== active.version)
      .sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime())[0];

    if (previous) {
      request.targetVersion = previous.version;
      request.previousDeployment = active.id;
      request.newDeployment = previous.id;
    }
  }

  rollbackRequests.set(request.id, request);

  // Execute
  setTimeout(() => {
    if (active) {
      active.status = 'superseded';
      deployments.set(active.id, active);
    }

    const newActive = Array.from(deployments.values())
      .find(d => d.agentId === request.agentId && d.version === request.targetVersion);

    if (newActive) {
      newActive.status = 'active';
      deployments.set(newActive.id, newActive);
    }

    request.status = 'completed';
    request.completedAt = new Date();
    rollbackRequests.set(request.id, request);
  }, 500);

  res.json({
    success: true,
    data: {
      requestId: request.id,
      message: 'Quick rollback initiated'
    }
  });
});

seed();
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI ROLLBACKS                           ║
║   One-click rollback                        ║
║   Port: ${PORT}                               ║
╚═══════════════════════════════════════════╝
  `);
});

export default app;
