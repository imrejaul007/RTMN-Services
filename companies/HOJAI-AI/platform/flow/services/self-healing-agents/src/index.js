/**
 * FlowOS Self-Healing Agents
 * Auto-recovery and optimization for agent workflows
 * Port: 5366
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5366;
app.use(cors());
app.use(express.json());

const storage = { failures: new Map(), recoveries: new Map(), agents: new Map() };

app.get('/health', (_, res) => res.json({
  status: 'ok', service: 'self-healing', port: PORT,
  failures: storage.failures.size, recoveries: storage.recoveries.size
}));

// Detect failure
app.post('/api/failures', (req, res) => {
  const { agentId, workflowId, error, severity = 'medium' } = req.body || {};
  if (!agentId) return res.status(400).json({ error: 'agentId required' });

  const failure = {
    id: 'fail_' + crypto.randomUUID().slice(0, 8),
    agentId, workflowId, error, severity,
    status: 'detected',
    createdAt: new Date().toISOString()
  };
  storage.failures.set(failure.id, failure);

  // Auto-heal
  const recovery = autoHeal(failure);
  storage.recoveries.set(recovery.id, recovery);

  res.status(201).json({ failure, recovery });
});

// Get failures
app.get('/api/failures', (req, res) => {
  const failures = Array.from(storage.failures.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ count: failures.length, failures });
});

// Get recoveries
app.get('/api/recoveries', (req, res) => {
  const recoveries = Array.from(storage.recoveries.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ count: recoveries.length, recoveries });
});

function autoHeal(failure) {
  const strategies = {
    retry: { action: 'retry', maxAttempts: 3 },
    restart: { action: 'restart', service: 'agent-runtime' },
    rollback: { action: 'rollback', checkpoint: 'last-known-good' },
    failover: { action: 'failover', target: 'backup-agent' }
  };

  const strategy = failure.severity === 'high' ? strategies.failover
    : failure.severity === 'medium' ? strategies.restart
    : strategies.retry;

  return {
    id: 'rec_' + crypto.randomUUID().slice(0, 8),
    failureId: failure.id,
    strategy: strategy.action,
    status: 'applied',
    appliedAt: new Date().toISOString()
  };
}

app.get('/ready', (_, res) => res.json({ ready: true }));
app.listen(PORT, () => console.log(`[self-healing] :${PORT}`));
export { app };
