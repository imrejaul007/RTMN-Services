/**
 * HOJAI Environments
 * dev → staging → production promotion
 * Port: 4595
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4595;

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

type Environment = 'development' | 'staging' | 'production';

interface Version {
  id: string;
  agentId: string;
  version: string;
  environment: Environment;
  prompt: string;
  workflow: string;
  config: Record<string, unknown>;
  status: 'draft' | 'testing' | 'approved' | 'deployed';
  metrics?: {
    successRate: number;
    avgLatency: number;
    usage: number;
  };
  createdAt: Date;
  deployedAt?: Date;
}

interface Promotion {
  id: string;
  versionId: string;
  fromEnv: Environment;
  toEnv: Environment;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface EnvironmentState {
  agentId: string;
  development: Version | null;
  staging: Version | null;
  production: Version | null;
}

const versions = new Map();
const promotions = new Map();
const states = new Map();

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-environments',
  status: 'healthy',
  port: PORT,
  tagline: 'dev → staging → production'
}));

// Create version
app.post('/api/versions', (req, res) => {
  const { agentId, version, prompt, workflow, config } = req.body;

  const v: Version = {
    id: uuidv4().slice(0, 8),
    agentId,
    version,
    environment: 'development',
    prompt,
    workflow,
    config: config || {},
    status: 'draft',
    createdAt: new Date()
  };

  versions.set(v.id, v);

  // Update state
  const state = states.get(agentId) || { agentId, development: null, staging: null, production: null };
  state.development = v;
  states.set(agentId, state);

  res.status(201).json({ success: true, data: v });
});

// Promote version
app.post('/api/promote', (req, res) => {
  const { versionId, toEnv, notes } = req.body;

  const version = versions.get(versionId);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  const promotion: Promotion = {
    id: uuidv4().slice(0, 8),
    versionId,
    fromEnv: version.environment,
    toEnv: toEnv as Environment,
    status: 'pending',
    notes,
    createdAt: new Date()
  };

  promotions.set(promotion.id, promotion);

  res.status(201).json({ success: true, data: promotion });
});

// Approve promotion
app.post('/api/promote/:id/approve', (req, res) => {
  const promotion = promotions.get(req.params.id);
  if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

  const { approvedBy } = req.body;

  promotion.status = 'approved';
  promotion.approvedBy = approvedBy || 'admin';
  promotions.set(promotion.id, promotion);

  // Execute promotion
  executePromotion(promotion);

  res.json({ success: true, message: 'Promotion approved' });
});

function executePromotion(promotion: Promotion) {
  const version = versions.get(promotion.versionId);
  if (!version) return;

  promotion.status = 'in_progress';

  // Update version environment
  const state = states.get(version.agentId) || { agentId: version.agentId, development: null, staging: null, production: null };

  if (promotion.toEnv === 'development') state.development = version;
  else if (promotion.toEnv === 'staging') state.staging = version;
  else if (promotion.toEnv === 'production') state.production = version;

  version.environment = promotion.toEnv;
  version.status = 'deployed';
  version.deployedAt = new Date();

  versions.set(version.id, version);
  states.set(version.agentId, state);

  promotion.status = 'completed';
  promotion.completedAt = new Date();
}

// Get environment state
app.get('/api/state/:agentId', (req, res) => {
  const state = states.get(req.params.agentId);
  if (!state) return res.status(404).json({ error: 'Agent not found' });
  res.json({ success: true, data: state });
});

// Get versions
app.get('/api/versions', (req, res) => {
  const { agentId, environment, status } = req.query;
  let result = Array.from(versions.values());

  if (agentId) result = result.filter(v => v.agentId === agentId);
  if (environment) result = result.filter(v => v.environment === environment);
  if (status) result = result.filter(v => v.status === status);

  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ success: true, data: result });
});

// Get promotions
app.get('/api/promotions', (req, res) => {
  const { agentId, status } = req.query;
  let result = Array.from(promotions.values());

  if (agentId) {
    const agentVersions = Array.from(versions.values())
      .filter(v => v.agentId === agentId)
      .map(v => v.id);
    result = result.filter(p => agentVersions.includes(p.versionId));
  }
  if (status) result = result.filter(p => p.status === status);

  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ success: true, data: result });
});

// Test in environment
app.post('/api/test', (req, res) => {
  const { versionId, testCases } = req.body;

  const version = versions.get(versionId);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  version.status = 'testing';

  // Simulate testing
  const results = testCases.map((tc: { input: Record<string, unknown>; expected: string }) => {
    const latency = Math.random() * 2 + 0.5;
    const success = Math.random() > 0.2;
    return {
      input: tc.input,
      passed: success,
      latency
    };
  });

  const passed = results.filter((r: { passed: boolean }) => r.passed).length;
  const successRate = (passed / results.length) * 100;

  version.metrics = {
    successRate,
    avgLatency: results.reduce((s: number, r: { latency: number }) => s + r.latency, 0) / results.length,
    usage: 0
  };

  version.status = 'approved';
  versions.set(version.id, version);

  res.json({
    success: true,
    data: {
      versionId: version.id,
      passed,
      failed: results.length - passed,
      successRate,
      results
    }
  });
});

// Quick promote (dev → staging → production)
app.post('/api/quick-promote', (req, res) => {
  const { versionId } = req.body;

  const version = versions.get(versionId);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  const steps = [];

  // Dev → Staging
  if (version.environment === 'development') {
    const p1: Promotion = {
      id: uuidv4().slice(0, 8),
      versionId,
      fromEnv: 'development',
      toEnv: 'staging',
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    };
    promotions.set(p1.id, p1);
    steps.push({ from: 'dev', to: 'staging', status: 'completed' });

    version.environment = 'staging';
    version.status = 'approved';
    versions.set(version.id, version);

    const state = states.get(version.agentId) || { agentId: version.agentId, development: null, staging: null, production: null };
    state.staging = version;
    states.set(version.agentId, state);
  }

  res.json({
    success: true,
    data: {
      versionId: version.id,
      steps
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI ENVIRONMENTS                          ║
║   dev → staging → production promotion       ║
║   Port: ${PORT}                                   ║
╚═══════════════════════════════════════════╝
  `);
});

export default app;
