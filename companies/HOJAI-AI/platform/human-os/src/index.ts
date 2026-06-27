/**
 * HumanOS - Human-in-the-Loop and Approval Workflows
 * Port: 4871
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4871;
const START_TIME = Date.now();
app.use(helmet()); app.use(cors()); app.use(express.json());

// ============ TYPES ============

interface Approval {
  id: string;
  type: string;
  title: string;
  description: string;
  requester: string;
  approvers: string[];
  currentApprover: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  amount?: number;
  riskLevel: 'low' | 'medium' | 'high';
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  history: { action: string; user: string; timestamp: string; note?: string }[];
}

interface Delegation {
  id: string;
  from: string;
  to: string;
  scope: string[];
  startDate: string;
  endDate: string;
  active: boolean;
  revokedAt?: string;
}

interface TakeoverRequest {
  id: string;
  agentId: string;
  reason: string;
  context: Record<string, unknown>;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  requestedBy: string;
  acceptedBy?: string;
  completedAt?: string;
  createdAt: string;
}

interface Escalation {
  id: string;
  approvalId: string;
  from: string;
  to: string;
  reason: string;
  escalatedAt: string;
  resolvedAt?: string;
  status: 'pending' | 'resolved';
}

// ============ STORES ============

const approvals = new Map<string, Approval>();
const delegations = new Map<string, Delegation>();
const takeovers = new Map<string, TakeoverRequest>();
const escalations = new Map<string, Escalation>();

// ============ HEALTH ============

app.get('/health', (_req, res) => res.json({
  status: 'ok', service: 'human-os', uptime: Math.floor((Date.now() - START_TIME) / 1000),
  approvals: approvals.size, delegations: delegations.size, takeovers: takeovers.size,
}));
app.get('/ready', (_req, res) => res.json({ ready: true }));

// ============ APPROVALS ============

app.get('/api/approvals', (req, res) => {
  let result = Array.from(approvals.values());
  if (req.query.status) result = result.filter(a => a.status === req.query.status);
  if (req.query.priority) result = result.filter(a => a.priority === req.query.priority);
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ total: result.length, approvals: result });
});

app.get('/api/approvals/:id', (req, res) => {
  const approval = approvals.get(req.params.id);
  if (!approval) return res.status(404).json({ error: 'Approval not found' });
  res.json(approval);
});

app.post('/api/approvals', (req, res) => {
  const { type, title, description, requester, approvers, priority, amount, deadline } = req.body;
  if (!type || !title || !requester || !approvers?.length) {
    return res.status(400).json({ error: 'type, title, requester, approvers required' });
  }

  const riskLevel = amount ? (amount > 10000 ? 'high' : amount > 1000 ? 'medium' : 'low') : 'low';
  const id = uuidv4();
  const now = new Date().toISOString();

  const approval: Approval = {
    id, type, title, description: description || '', requester,
    approvers, currentApprover: approvers[0],
    status: 'pending', priority: priority || 'medium', riskLevel,
    amount, deadline,
    createdAt: now, updatedAt: now,
    history: [{ action: 'created', user: requester, timestamp: now }],
  };

  approvals.set(id, approval);
  res.status(201).json(approval);
});

app.post('/api/approvals/:id/approve', (req, res) => {
  const approval = approvals.get(req.params.id);
  if (!approval) return res.status(404).json({ error: 'Approval not found' });
  if (approval.status !== 'pending') return res.status(400).json({ error: 'Approval not pending' });

  const { user, note } = req.body;
  const now = new Date().toISOString();
  const currentIndex = approval.approvers.indexOf(approval.currentApprover);

  if (currentIndex === approval.approvers.length - 1) {
    // Last approver - complete
    approval.status = 'approved';
    approval.approvedAt = now;
    approval.history.push({ action: 'approved', user: user || 'unknown', timestamp: now, note });
  } else {
    // Move to next approver
    approval.currentApprover = approval.approvers[currentIndex + 1];
    approval.history.push({ action: 'approved', user: user || 'unknown', timestamp: now, note });
  }

  approval.updatedAt = now;
  res.json(approval);
});

app.post('/api/approvals/:id/reject', (req, res) => {
  const approval = approvals.get(req.params.id);
  if (!approval) return res.status(404).json({ error: 'Approval not found' });
  if (approval.status !== 'pending') return res.status(400).json({ error: 'Approval not pending' });

  const { user, reason } = req.body;
  const now = new Date().toISOString();

  approval.status = 'rejected';
  approval.rejectedAt = now;
  approval.updatedAt = now;
  approval.history.push({ action: 'rejected', user: user || 'unknown', timestamp: now, note: reason });

  res.json(approval);
});

app.post('/api/approvals/:id/escalate', (req, res) => {
  const approval = approvals.get(req.params.id);
  if (!approval) return res.status(404).json({ error: 'Approval not found' });

  const { to, reason } = req.body;
  const now = new Date().toISOString();

  // Add escalation record
  const escalation: Escalation = {
    id: uuidv4(), approvalId: approval.id, from: approval.currentApprover, to, reason, escalatedAt: now, status: 'pending',
  };
  escalations.set(escalation.id, escalation);

  // Update approval
  approval.status = 'escalated';
  approval.currentApprover = to;
  approval.updatedAt = now;
  approval.history.push({ action: 'escalated', user: 'system', timestamp: now, note: reason });

  res.json({ approval, escalation });
});

app.get('/api/approvals/pending', (req, res) => {
  const { approver } = req.query;
  const pending = Array.from(approvals.values()).filter(a =>
    a.status === 'pending' && a.currentApprover === approver
  );
  res.json({ total: pending.length, approvals: pending });
});

// ============ DELEGATIONS ============

app.get('/api/delegations', (req, res) => {
  const { active, from } = req.query;
  let result = Array.from(delegations.values());
  if (active === 'true') result = result.filter(d => d.active && d.startDate <= new Date().toISOString() && d.endDate >= new Date().toISOString());
  if (from) result = result.filter(d => d.from === from);
  res.json({ total: result.length, delegations: result });
});

app.post('/api/delegations', (req, res) => {
  const { from, to, scope, startDate, endDate } = req.body;
  if (!from || !to || !startDate || !endDate) return res.status(400).json({ error: 'from, to, startDate, endDate required' });

  const id = uuidv4();
  delegations.set(id, { id, from, to, scope: scope || ['*'], startDate, endDate, active: true });
  res.status(201).json(delegations.get(id));
});

app.post('/api/delegations/:id/revoke', (req, res) => {
  const delegation = delegations.get(req.params.id);
  if (!delegation) return res.status(404).json({ error: 'Delegation not found' });

  delegation.active = false;
  delegation.revokedAt = new Date().toISOString();
  res.json(delegation);
});

// ============ TAKEOVER ============

app.get('/api/takeovers', (req, res) => {
  let result = Array.from(takeovers.values());
  if (req.query.status) result = result.filter(t => t.status === req.query.status);
  res.json({ total: result.length, takeovers: result });
});

app.post('/api/takeover/request', (req, res) => {
  const { agentId, reason, context, requestedBy } = req.body;
  if (!agentId || !reason || !requestedBy) return res.status(400).json({ error: 'agentId, reason, requestedBy required' });

  const id = uuidv4();
  const takeover: TakeoverRequest = { id, agentId, reason, context: context || {}, status: 'pending', requestedBy, createdAt: new Date().toISOString() };
  takeovers.set(id, takeover);
  res.status(201).json(takeover);
});

app.post('/api/takeover/:id/accept', (req, res) => {
  const takeover = takeovers.get(req.params.id);
  if (!takeover) return res.status(404).json({ error: 'Takeover not found' });
  if (takeover.status !== 'pending') return res.status(400).json({ error: 'Takeover not pending' });

  const { acceptedBy } = req.body;
  takeover.status = 'accepted';
  takeover.acceptedBy = acceptedBy;
  res.json(takeover);
});

app.post('/api/takeover/:id/complete', (req, res) => {
  const takeover = takeovers.get(req.params.id);
  if (!takeover) return res.status(404).json({ error: 'Takeover not found' });
  if (takeover.status !== 'accepted') return res.status(400).json({ error: 'Takeover not accepted' });

  const { result } = req.body;
  takeover.status = 'completed';
  takeover.completedAt = new Date().toISOString();
  res.json({ takeover, result });
});

// ============ STATS ============

app.get('/api/stats', (_req, res) => {
  const all = Array.from(approvals.values());
  res.json({
    totalApprovals: all.length,
    pending: all.filter(a => a.status === 'pending').length,
    approved: all.filter(a => a.status === 'approved').length,
    rejected: all.filter(a => a.status === 'rejected').length,
    escalated: all.filter(a => a.status === 'escalated').length,
    activeDelegations: Array.from(delegations.values()).filter(d => d.active).length,
    pendingTakeovers: Array.from(takeovers.values()).filter(t => t.status === 'pending').length,
  });
});

app.listen(PORT, () => console.log(`[human-os] listening on :${PORT}`));
export default app;
