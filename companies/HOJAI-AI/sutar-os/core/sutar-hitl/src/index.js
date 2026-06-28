/**
 * SUTAR OS — Human-in-the-Loop (HITL) Service
 *
 * Approval gates that pause autonomous agent actions for human review,
 * escalation paths, delegation, override capabilities, and audit trails.
 *
 * Endpoints:
 *   POST /api/gates               — Create an approval gate
 *   GET  /api/gates               — List pending gates
 *   GET  /api/gates/:gateId       — Get gate details
 *   POST /api/gates/:gateId/approve — Approve a gate
 *   POST /api/gates/:gateId/reject  — Reject a gate
 *   POST /api/gates/:gateId/escalate — Escalate a gate
 *   POST /api/gates/:gateId/delegate — Delegate to another approver
 *   POST /api/gates/:gateId/override — Override (requires role)
 *   GET  /api/audit              — Human decision audit trail
 *   GET  /api/delegations         — Active delegations
 *   POST /api/delegations         — Create delegation
 *   GET  /api/escalations         — Active escalations
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());

setupSecurity(app, { serviceName: 'sutar-hitl' });

const PORT = process.env.HITL_PORT || 4607;

// ---------- In-Memory Stores ----------
const gates = new Map();
const auditTrail = [];
const delegations = new Map();
const escalations = new Map();

// ---------- Gate Thresholds ----------
const AUTO_APPROVE_THRESHOLDS = {
  value_usd: 1000,           // Auto-approve deals under $1K
  risk_score: 0.2,           // Auto-approve low-risk actions
  contract_value: 5000,       // Auto-approve contracts under $5K
  data_access_level: 'internal', // Auto-approve internal data only
};

// ---------- Gate Management ----------
function createGate(params) {
  const gateId = uuidv4();
  const value = params.value || 0;
  const riskScore = params.riskScore || 0.5;

  // Auto-approve logic
  const autoApprove =
    value < AUTO_APPROVE_THRESHOLDS.value_usd &&
    riskScore < AUTO_APPROVE_THRESHOLDS.risk_score &&
    (params.dataAccessLevel || 'internal') === 'internal';

  const gate = {
    gateId,
    requestId: params.requestId || uuidv4(),
    agentId: params.agentId,
    action: params.action,
    description: params.description,
    value,
    currency: params.currency || 'USD',
    riskScore,
    riskFactors: params.riskFactors || [],
    status: autoApprove ? 'auto_approved' : 'pending',
    priority: determinePriority(value, riskScore, params.urgency),
    approvers: params.approvers || ['default_approver'],
    currentApprover: null,
    deadline: params.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h default
    slaHours: params.slaHours || 24,
    createdAt: new Date().toISOString(),
    autoApprovedAt: autoApprove ? new Date().toISOString() : null,
    approvedAt: null,
    rejectedAt: null,
    escalatedAt: null,
    decidedBy: null,
    decisionNotes: null,
    metadata: params.metadata || {},
    relatedGates: params.relatedGates || [],
  };

  gates.set(gateId, gate);

  if (autoApprove) {
    logAuditEvent({
      actor: 'system',
      actorType: 'agent',
      action: 'gate_auto_approved',
      resource: 'hitl_gate',
      resourceId: gateId,
      outcome: 'success',
      metadata: { reason: 'below_thresholds', value, riskScore },
    });
  } else {
    gate.currentApprover = gate.approvers[0];
    logAuditEvent({
      actor: 'system',
      actorType: 'agent',
      action: 'gate_created_pending_approval',
      resource: 'hitl_gate',
      resourceId: gateId,
      outcome: 'success',
      metadata: { value, riskScore, priority: gate.priority },
    });
  }

  return gate;
}

function determinePriority(value, riskScore, urgency) {
  if (urgency === 'critical') return 'critical';
  if (urgency === 'high') return 'high';
  if (value > 100000 || riskScore > 0.8) return 'high';
  if (value > 50000 || riskScore > 0.5) return 'medium';
  return 'low';
}

function approveGate(gateId, params) {
  const gate = gates.get(gateId);
  if (!gate) return { error: 'Gate not found' };
  if (gate.status !== 'pending') return { error: 'Gate is not pending approval', status: gate.status };

  gate.status = 'approved';
  gate.approvedAt = new Date().toISOString();
  gate.decidedBy = params.approverId || params.approverEmail || 'human_unknown';
  gate.decisionNotes = params.notes || null;

  logAuditEvent({
    actor: gate.decidedBy,
    actorType: 'human',
    action: 'gate_approved',
    resource: 'hitl_gate',
    resourceId: gateId,
    outcome: 'success',
    metadata: {
      value: gate.value,
      action: gate.action,
      notes: gate.decisionNotes,
      timeToDecideHours: Math.round((new Date(gate.approvedAt).getTime() - new Date(gate.createdAt).getTime()) / (1000 * 60 * 60)),
    },
  });

  return gate;
}

function rejectGate(gateId, params) {
  const gate = gates.get(gateId);
  if (!gate) return { error: 'Gate not found' };
  if (gate.status !== 'pending') return { error: 'Gate is not pending approval', status: gate.status };

  gate.status = 'rejected';
  gate.rejectedAt = new Date().toISOString();
  gate.decidedBy = params.approverId || params.approverEmail || 'human_unknown';
  gate.decisionNotes = params.notes || null;
  gate.rejectionReason = params.reason || 'not_specified';

  logAuditEvent({
    actor: gate.decidedBy,
    actorType: 'human',
    action: 'gate_rejected',
    resource: 'hitl_gate',
    resourceId: gateId,
    outcome: 'success',
    metadata: {
      value: gate.value,
      action: gate.action,
      reason: gate.rejectionReason,
      notes: gate.decisionNotes,
    },
  });

  return gate;
}

function escalateGate(gateId, params) {
  const gate = gates.get(gateId);
  if (!gate) return { error: 'Gate not found' };
  if (gate.status !== 'pending') return { error: 'Gate is not pending', status: gate.status };

  gate.status = 'escalated';
  gate.escalatedAt = new Date().toISOString();
  gate.escalatedBy = params.escalatorId || 'system';
  gate.escalationReason = params.reason || 'manual_escalation';
  gate.escalatedTo = params.escalateTo || 'senior_approver';

  const escalationId = uuidv4();
  const escalation = {
    escalationId,
    gateId,
    reason: gate.escalationReason,
    escalatedTo: gate.escalatedTo,
    escalatedBy: gate.escalatedBy,
    escalatedAt: gate.escalatedAt,
    slaHours: params.slaHours || 4,
    status: 'active',
  };
  escalations.set(escalationId, escalation);

  logAuditEvent({
    actor: gate.escalatedBy,
    actorType: 'human',
    action: 'gate_escalated',
    resource: 'hitl_gate',
    resourceId: gateId,
    outcome: 'success',
    metadata: { reason: gate.escalationReason, escalateTo: gate.escalatedTo },
  });

  return { gate, escalation };
}

function delegateGate(gateId, params) {
  const gate = gates.get(gateId);
  if (!gate) return { error: 'Gate not found' };

  const delegationId = uuidv4();
  const delegation = {
    delegationId,
    gateId,
    fromApprover: gate.currentApprover,
    toApprover: params.toApprover,
    reason: params.reason || 'delegation',
    delegatedAt: new Date().toISOString(),
    expiresAt: params.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    active: true,
  };
  delegations.set(delegationId, delegation);
  gate.currentApprover = params.toApprover;

  logAuditEvent({
    actor: delegation.fromApprover,
    actorType: 'human',
    action: 'gate_delegated',
    resource: 'hitl_gate',
    resourceId: gateId,
    outcome: 'success',
    metadata: { toApprover: params.toApprover, reason: params.reason },
  });

  return { gate, delegation };
}

function overrideGate(gateId, params) {
  const gate = gates.get(gateId);
  if (!gate) return { error: 'Gate not found' };

  // Override requires elevated role
  const allowedRoles = ['admin', 'security_officer', 'compliance_officer'];
  const userRole = params.role || 'user';
  if (!allowedRoles.includes(userRole)) {
    logAuditEvent({
      actor: params.overrideBy || 'unknown',
      actorType: 'human',
      action: 'gate_override_denied',
      resource: 'hitl_gate',
      resourceId: gateId,
      outcome: 'failure',
      metadata: { attemptedRole: userRole, requiredRoles: allowedRoles },
    });
    return { error: 'Insufficient role for override', required: allowedRoles };
  }

  gate.status = params.decision || 'approved';
  gate.approvedAt = new Date().toISOString();
  gate.decidedBy = params.overrideBy || 'admin_override';
  gate.decisionNotes = params.notes || 'override_executed';
  gate.overridden = true;
  gate.originalStatus = gate.status === 'approved' ? 'rejected' : 'pending';

  logAuditEvent({
    actor: gate.decidedBy,
    actorType: 'human',
    action: 'gate_overridden',
    resource: 'hitl_gate',
    resourceId: gateId,
    outcome: 'success',
    metadata: {
      originalStatus: gate.originalStatus,
      overrideReason: params.reason,
      role: userRole,
    },
  });

  return gate;
}

// ---------- Delegation Management ----------
function createDelegation(params) {
  const delegationId = uuidv4();
  const delegation = {
    delegationId,
    fromApprover: params.fromApprover,
    toApprover: params.toApprover,
    reason: params.reason || 'delegation',
    scope: params.scope || 'all',
    active: true,
    createdAt: new Date().toISOString(),
    expiresAt: params.expiresAt || new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString(), // 7 days
  };
  delegations.set(delegationId, delegation);
  return delegation;
}

function revokeDelegation(delegationId) {
  const delegation = delegations.get(delegationId);
  if (!delegation) return { error: 'Delegation not found' };
  delegation.active = false;
  delegation.revokedAt = new Date().toISOString();
  return delegation;
}

// ---------- Audit Trail ----------
function logAuditEvent(params) {
  const event = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    actor: params.actor,
    actorType: params.actorType || 'unknown',
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
    outcome: params.outcome,
    metadata: params.metadata || {},
  };
  auditTrail.push(event);
  return event;
}

function getAuditTrail(params) {
  let events = [...auditTrail];
  if (params.actor) events = events.filter(e => e.actor === params.actor);
  if (params.action) events = events.filter(e => e.action === params.action);
  if (params.resource) events = events.filter(e => e.resource === params.resource);
  if (params.from) events = events.filter(e => e.timestamp >= params.from);
  if (params.to) events = events.filter(e => e.timestamp <= params.to);
  if (params.actorType) events = events.filter(e => e.actorType === params.actorType);
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const limit = Math.min(params.limit || 100, 1000);
  return { total: auditTrail.length, returned: Math.min(events.length, limit), events: events.slice(0, limit) };
}

// ---------- Routes ----------
app.post('/api/gates', requireAuth, (req, res) => {
  const gate = createGate(req.body);
  res.status(201).json(gate);
});

app.get('/api/gates', requireAuth, (req, res) => {
  const { status, priority, approver, limit } = req.query;
  let list = Array.from(gates.values());
  if (status) list = list.filter(g => g.status === status);
  if (priority) list = list.filter(g => g.priority === priority);
  if (approver) list = list.filter(g => g.approvers.includes(approver) || g.currentApprover === approver);
  list.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
  });
  const pageSize = Math.min(parseInt(limit) || 100, 1000);
  res.json({ total: list.length, returned: Math.min(list.length, pageSize), gates: list.slice(0, pageSize) });
});

app.get('/api/gates/:gateId', requireAuth, (req, res) => {
  const gate = gates.get(req.params.gateId);
  if (!gate) return res.status(404).json({ error: 'Gate not found' });
  res.json(gate);
});

app.post('/api/gates/:gateId/approve', requireAuth, (req, res) => {
  const result = approveGate(req.params.gateId, req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/gates/:gateId/reject', requireAuth, (req, res) => {
  const result = rejectGate(req.params.gateId, req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/gates/:gateId/escalate', requireAuth, (req, res) => {
  const result = escalateGate(req.params.gateId, req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/gates/:gateId/delegate', requireAuth, (req, res) => {
  const result = delegateGate(req.params.gateId, req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/gates/:gateId/override', requireAuth, (req, res) => {
  const result = overrideGate(req.params.gateId, req.body);
  if (result.error) return res.status(403).json(result);
  res.json(result);
});

app.get('/api/audit', requireAuth, (req, res) => {
  res.json(getAuditTrail(req.query));
});

app.get('/api/delegations', requireAuth, (req, res) => {
  const { active, fromApprover, toApprover } = req.query;
  let list = Array.from(delegations.values());
  if (active !== undefined) list = list.filter(d => d.active === (active === 'true'));
  if (fromApprover) list = list.filter(d => d.fromApprover === fromApprover);
  if (toApprover) list = list.filter(d => d.toApprover === toApprover);
  res.json({ total: list.length, delegations: list });
});

app.post('/api/delegations', requireAuth, (req, res) => {
  const delegation = createDelegation(req.body);
  res.status(201).json(delegation);
});

app.delete('/api/delegations/:delegationId', requireAuth, (req, res) => {
  const result = revokeDelegation(req.params.delegationId);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.get('/api/escalations', requireAuth, (req, res) => {
  const { status } = req.query;
  let list = Array.from(escalations.values());
  if (status) list = list.filter(e => e.status === status);
  res.json({ total: list.length, escalations: list });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sutar-hitl',
    port: PORT,
    layer: 'Human-in-the-Loop',
    pendingGates: Array.from(gates.values()).filter(g => g.status === 'pending').length,
    totalGates: gates.size,
    auditEvents: auditTrail.length,
    activeDelegations: Array.from(delegations.values()).filter(d => d.active).length,
    activeEscalations: Array.from(escalations.values()).filter(e => e.status === 'active').length,
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[sutar-hitl] listening on :${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });