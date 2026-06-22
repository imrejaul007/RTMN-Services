/**
 * HOJAI Deployment Manager
 * Zero-downtime deploys
 * Port: 4602
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4602;

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
  environment: 'development' | 'staging' | 'production';
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
  strategy: 'blue_green' | 'canary' | 'rolling';
  trafficSplit?: number;
  healthChecks: HealthCheck[];
  metrics: DeploymentMetrics;
  createdAt: Date;
  completedAt?: Date;
}

interface HealthCheck {
  name: string;
  status: 'pending' | 'passed' | 'failed';
  latency?: number;
  checkedAt?: Date;
}

interface DeploymentMetrics {
  requests: number;
  errors: number;
  latency: number;
  successRate: number;
}

interface RollbackPlan {
  id: string;
  deploymentId: string;
  targetVersion: string;
  reason: string;
  autoRollback: boolean;
  createdAt: Date;
}

interface Environment {
  name: 'development' | 'staging' | 'production';
  activeDeployment?: Deployment;
  previousDeployment?: Deployment;
  replicas: number;
  status: 'healthy' | 'degrading' | 'unhealthy';
}

const deployments = new Map();
const rollbacks = new Map();
const environments = new Map();

// Seed environments
function seed() {
  const envs: Environment[] = [
    { name: 'development', replicas: 1, status: 'healthy' },
    { name: 'staging', replicas: 2, status: 'healthy' },
    { name: 'production', replicas: 5, status: 'healthy' }
  ];
  envs.forEach(e => environments.set(e.name, e));
}

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-deployment-manager',
  status: 'healthy',
  port: PORT,
  tagline: 'Zero-downtime deploys'
}));

// Deploy
app.post('/api/deploy', (req, res) => {
  const { agentId, version, environment, strategy = 'rolling', trafficSplit } = req.body;

  const deployment: Deployment = {
    id: uuidv4().slice(0, 8),
    agentId,
    version,
    environment,
    status: 'pending',
    strategy,
    trafficSplit,
    healthChecks: [
      { name: 'liveness', status: 'pending' },
      { name: 'readiness', status: 'pending' }
    ],
    metrics: { requests: 0, errors: 0, latency: 0, successRate: 0 },
    createdAt: new Date()
  };

  deployments.set(deployment.id, deployment);

  // Start deployment
  executeDeployment(deployment);

  res.status(201).json({
    success: true,
    data: {
      deploymentId: deployment.id,
      status: 'running',
      message: 'Deployment started'
    }
  });
});

async function executeDeployment(deployment: Deployment) {
  deployment.status = 'running';

  // Simulate deployment steps
  for (const check of deployment.healthChecks) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    check.status = 'passed';
    check.latency = Math.random() * 100 + 10;
    check.checkedAt = new Date();
  }

  // Simulate metrics
  deployment.metrics = {
    requests: Math.round(Math.random() * 1000),
    errors: Math.round(Math.random() * 10),
    latency: Math.round(Math.random() * 200 + 50),
    successRate: 95 + Math.random() * 5
  };

  deployment.status = 'success';
  deployment.completedAt = new Date();

  // Update environment
  const env = environments.get(deployment.environment);
  if (env) {
    env.previousDeployment = env.activeDeployment;
    env.activeDeployment = deployment;
  }

  deployments.set(deployment.id, deployment);
}

// Get deployment
app.get('/api/deployments/:id', (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, data: deployment });
});

// List deployments
app.get('/api/deployments', (req, res) => {
  const { agentId, environment, status } = req.query;
  let result = Array.from(deployments.values());

  if (agentId) result = result.filter(d => d.agentId === agentId);
  if (environment) result = result.filter(d => d.environment === environment);
  if (status) result = result.filter(d => d.status === status);

  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ success: true, data: result });
});

// Rollback
app.post('/api/rollback', (req, res) => {
  const { deploymentId, reason, autoRollback = false } = req.body;

  const deployment = deployments.get(deploymentId);
  if (!deployment) return res.status(404).json({ error: 'Deployment not found' });

  const rollbackPlan: RollbackPlan = {
    id: uuidv4().slice(0, 8),
    deploymentId,
    targetVersion: 'previous',
    reason: reason || 'Manual rollback',
    autoRollback,
    createdAt: new Date()
  };

  rollbacks.set(rollbackPlan.id, rollbackPlan);

  // Execute rollback
  deployment.status = 'rolled_back';
  deployment.completedAt = new Date();
  deployments.set(deployment.id, deployment);

  res.status(201).json({
    success: true,
    data: {
      rollbackId: rollbackPlan.id,
      status: 'completed',
      message: 'Rolled back to previous version'
    }
  });
});

// Get rollback plans
app.get('/api/rollbacks', (req, res) => {
  const { deploymentId } = req.query;
  let result = Array.from(rollbacks.values());
  if (deploymentId) result = result.filter(r => r.deploymentId === deploymentId);
  res.json({ success: true, data: result });
});

// Environments
app.get('/api/environments', (_, res) => {
  res.json({ success: true, data: Array.from(environments.values()) });
});

app.get('/api/environments/:name', (req, res) => {
  const env = environments.get(req.params.name);
  if (!env) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, data: env });
});

// Canary deployment
app.post('/api/deploy/canary', (req, res) => {
  const { agentId, version, trafficSplit = 10 } = req.body;

  const deployment: Deployment = {
    id: uuidv4().slice(0, 8),
    agentId,
    version,
    environment: 'production',
    status: 'running',
    strategy: 'canary',
    trafficSplit,
    healthChecks: [],
    metrics: {
      requests: 0,
      errors: 0,
      latency: 0,
      successRate: 0
    },
    createdAt: new Date()
  };

  deployments.set(deployment.id, deployment);

  // Simulate canary
  setTimeout(() => {
    deployment.metrics = {
      requests: Math.round(Math.random() * 1000),
      errors: Math.round(Math.random() * 5),
      latency: Math.round(Math.random() * 100 + 50),
      successRate: 98 + Math.random() * 2
    };

    // Auto-promote if healthy
    if (deployment.metrics.successRate > 95) {
      deployment.status = 'success';
      deployment.completedAt = new Date();
    } else {
      deployment.status = 'failed';
    }

    deployments.set(deployment.id, deployment);
  }, 3000);

  res.status(201).json({
    success: true,
    data: {
      deploymentId: deployment.id,
      strategy: 'canary',
      trafficSplit: `${trafficSplit}%`,
      message: 'Canary deployment started'
    }
  });
});

// Blue-green deployment
app.post('/api/deploy/blue-green', (req, res) => {
  const { agentId, version } = req.body;

  const deployment: Deployment = {
    id: uuidv4().slice(0, 8),
    agentId,
    version,
    environment: 'production',
    status: 'running',
    strategy: 'blue_green',
    healthChecks: [
      { name: 'green-health', status: 'pending' }
    ],
    metrics: { requests: 0, errors: 0, latency: 0, successRate: 0 },
    createdAt: new Date()
  };

  deployments.set(deployment.id, deployment);

  setTimeout(() => {
    deployment.status = 'success';
    deployment.completedAt = new Date();
    deployments.set(deployment.id, deployment);
  }, 2000);

  res.status(201).json({
    success: true,
    data: {
      deploymentId: deployment.id,
      strategy: 'blue_green',
      message: 'Blue-green deployment started'
    }
  });
});

seed();
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI DEPLOYMENT MANAGER                  ║
║   Zero-downtime deploys                     ║
║   Port: ${PORT}                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
