/**
 * PolicyOS — Approval Engine Routes
 *
 * Handles multi-step approval workflows for policies that require human sign-off
 * before being enforced.
 */

import { v4 as uuidv4 } from 'uuid';

const APPROVAL_STRATEGIES = ['single', 'multi', 'sequential', 'parallel', 'emergency'];
const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'cancelled', 'expired'];

export function registerApprovalRoutes(app, {
  policies,
  approvals,
  auditLog,
  customAuth,
  writeLimiter,
}) {

  // POST /api/approvals — create approval request
  app.post('/api/approvals', customAuth, writeLimiter, (req, res) => {
    const body = req.body || {};
    const { policyId, requesterId, resource, amount, strategy, metadata = {} } = body;
    if (!policyId || !requesterId) {
      return res.status(400).json({ error: 'policyId and requesterId are required' });
    }
    const policy = policies.get(policyId);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    const strat = strategy || (policy.approvals && policy.approvals.strategy) || 'single';
    if (!APPROVAL_STRATEGIES.includes(strat)) {
      return res.status(400).json({ error: `strategy must be one of: ${APPROVAL_STRATEGIES.join(', ')}` });
    }
    const approvers = (policy.approvals && policy.approvals.requiredApprovers) || [];
    const id = `apr-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const approval = {
      id,
      policyId,
      requesterId,
      resource: resource || null,
      amount: typeof amount === 'number' ? amount : null,
      strategy: strat,
      status: 'pending',
      requiredApprovers: approvers,
      decisions: [],
      timeline: [{ event: 'created', at: now, actor: requesterId }],
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    if (strat === 'single' && approvers.length === 0) {
      approval.requiredApprovers = ['u-admin'];
    }
    approvals.set(id, approval);
    auditLog({
      type: 'approval.created',
      approvalId: id,
      actor: requesterId,
      details: { policyId, strategy: strat, amount },
    });
    res.status(201).json(approval);
  });

  // POST /api/approvals/:id/decide
  app.post('/api/approvals/:id/decide', customAuth, writeLimiter, (req, res) => {
    const body = req.body || {};
    const { approverId, decision, comment } = body;
    if (!approverId || !decision) return res.status(400).json({ error: 'approverId and decision are required' });
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
    }
    const approval = approvals.get(req.params.id);
    if (!approval) return res.status(404).json({ error: 'Approval not found' });
    if (approval.status !== 'pending') {
      return res.status(400).json({ error: `Approval is in status '${approval.status}'` });
    }
    const now = new Date().toISOString();
    const decEntry = { approverId, decision, comment: comment || '', at: now };
    approval.decisions.push(decEntry);
    approval.timeline.push({ event: `decision:${decision}`, at: now, actor: approverId, comment: comment || '' });
    approval.updatedAt = now;

    const strat = approval.strategy;
    const approvers = approval.requiredApprovers || [];
    const approves = approval.decisions.filter((d) => d.decision === 'approve').map((d) => d.approverId);
    const rejects = approval.decisions.filter((d) => d.decision === 'reject').map((d) => d.approverId);

    if (rejects.length > 0 && strat !== 'parallel') {
      approval.status = 'rejected';
    } else {
      switch (strat) {
        case 'single':
          if (approves.length >= 1) approval.status = 'approved';
          else if (rejects.length >= 1) approval.status = 'rejected';
          break;
        case 'multi':
          if (rejects.length >= 1) approval.status = 'rejected';
          else if (approves.length >= approvers.length && approvers.length > 0) approval.status = 'approved';
          else if (approvers.length === 0 && approves.length >= 2) approval.status = 'approved';
          break;
        case 'sequential':
          if (rejects.length >= 1) {
            approval.status = 'rejected';
          } else {
            const ordered = approval.decisions.filter((d) => d.decision === 'approve').map((d) => d.approverId);
            let prefixOk = true;
            for (let i = 0; i < ordered.length; i++) {
              if (ordered[i] !== approvers[i]) { prefixOk = false; break; }
            }
            if (prefixOk && ordered.length >= approvers.length && approvers.length > 0) {
              approval.status = 'approved';
            }
          }
          break;
        case 'parallel':
          if (rejects.length >= 1) approval.status = 'rejected';
          else if (approves.length >= approvers.length && approvers.length > 0) approval.status = 'approved';
          else if (approvers.length === 0 && approves.length >= 2) approval.status = 'approved';
          break;
        case 'emergency':
          if (rejects.length >= 1) approval.status = 'rejected';
          else if (approves.length >= 1) approval.status = 'approved';
          break;
      }
    }

    auditLog({
      type: 'approval.decided',
      approvalId: approval.id,
      actor: approverId,
      details: { decision, status: approval.status, strategy: strat },
    });
    res.json(approval);
  });

  // GET /api/approvals/:id
  app.get('/api/approvals/:id', (req, res) => {
    const approval = approvals.get(req.params.id);
    if (!approval) return res.status(404).json({ error: 'Approval not found' });
    res.json(approval);
  });

  // GET /api/approvals
  app.get('/api/approvals', (req, res) => {
    const { status, strategy, requesterId } = req.query;
    let result = Array.from(approvals.values());
    if (status) result = result.filter((a) => a.status === status);
    if (strategy) result = result.filter((a) => a.strategy === strategy);
    if (requesterId) result = result.filter((a) => a.requesterId === requesterId);
    res.json({ count: result.length, approvals: result });
  });
}

export { APPROVAL_STRATEGIES, APPROVAL_STATUSES };
