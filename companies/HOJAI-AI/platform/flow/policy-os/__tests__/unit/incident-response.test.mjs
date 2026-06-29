/**
 * PolicyOS — Incident Response Service Tests (Phase P4)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const {
  createIncident,
  createIncidentFromViolation,
  getIncident,
  listIncidents,
  triageIncident,
  escalateIncident,
  resolveIncident,
  closeIncident,
  checkSLABreach,
  getSLADashboard,
  getIncidentStats,
  _resetIncidentState,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  INCIDENT_CATEGORY,
} = await import('../../src/services/incident-response.js');

beforeEach(() => { _resetIncidentState(); });

// ── Creation ────────────────────────────────────────────────────────────

describe('createIncident', () => {
  it('creates incident with required fields', () => {
    const inc = createIncident({ title: 'API is down', severity: 'P1_CRITICAL' });
    assert.strictEqual(inc.title, 'API is down');
    assert.strictEqual(inc.severity, 'P1_CRITICAL');
    assert.strictEqual(inc.status, 'detected');
    assert.ok(inc.id.startsWith('inc-'));
    assert.strictEqual(typeof inc.sla.acknowledgeBy, 'string');
    assert.strictEqual(typeof inc.sla.resolveBy, 'string');
  });

  it('defaults severity to P3_MEDIUM', () => {
    const inc = createIncident({ title: 'Minor issue' });
    assert.strictEqual(inc.severity, 'P3_MEDIUM');
  });

  it('calculates SLA targets based on severity', () => {
    const p1 = createIncident({ title: 'P1', severity: 'P1_CRITICAL' });
    const p4 = createIncident({ title: 'P4', severity: 'P4_LOW' });
    // P1 acknowledge SLA (15 min) should be much shorter than P4 (480 min)
    const p1Ack = new Date(p1.sla.acknowledgeBy).getTime();
    const p4Ack = new Date(p4.sla.acknowledgeBy).getTime();
    assert.ok(p1Ack < p4Ack, 'P1 SLA should be tighter than P4');
  });

  it('creates incident from policy violation', () => {
    const violation = {
      severity: 'critical',
      category: 'unauthorized_access',
      policyId: 'pol-42',
      message: 'User accessed restricted resource',
    };
    const inc = createIncidentFromViolation(violation);
    assert.strictEqual(inc.severity, 'P1_CRITICAL');
    assert.strictEqual(inc.category, 'security');
    assert.strictEqual(inc.source, 'policy_violation');
  });
});

// ── Retrieval ────────────────────────────────────────────────────────────

describe('getIncident / listIncidents', () => {
  it('gets incident by ID', () => {
    const inc = createIncident({ title: 'Test' });
    const found = getIncident(inc.id);
    assert.strictEqual(found.id, inc.id);
  });

  it('returns null for unknown ID', () => {
    assert.strictEqual(getIncident('inc-9999'), null);
  });

  it('lists all incidents', () => {
    createIncident({ title: 'One' });
    createIncident({ title: 'Two' });
    const list = listIncidents();
    assert.strictEqual(list.length, 2);
  });

  it('filters by status', () => {
    const inc = createIncident({ title: 'Test' });
    triageIncident(inc.id, { assignee: 'engineer' });
    const active = listIncidents({ status: 'triaged' });
    assert.strictEqual(active.length, 1);
    assert.strictEqual(active[0].id, inc.id);
  });

  it('filters by severity', () => {
    createIncident({ title: 'P1', severity: 'P1_CRITICAL' });
    createIncident({ title: 'P3', severity: 'P3_MEDIUM' });
    const p1s = listIncidents({ severity: 'P1_CRITICAL' });
    assert.strictEqual(p1s.length, 1);
  });
});

// ── Triage ─────────────────────────────────────────────────────────────

describe('triageIncident', () => {
  it('sets assignee and status to TRIAGED', () => {
    const inc = createIncident({ title: 'Test' });
    const updated = triageIncident(inc.id, { assignee: 'alice', note: 'Investigating' });
    assert.strictEqual(updated.status, 'triaged');
    assert.strictEqual(updated.assignee, 'alice');
    assert.strictEqual(updated.acknowledgedAt !== null, true);
  });

  it('recovers SLA on severity change', () => {
    const inc = createIncident({ title: 'Test', severity: 'P3_MEDIUM' });
    const updated = triageIncident(inc.id, { severity: 'P1_CRITICAL' });
    // P1 acknowledge SLA should be tighter than P3
    const p1Ack = new Date(updated.sla.acknowledgeBy).getTime();
    const p3Ack = new Date(inc.sla.acknowledgeBy).getTime();
    assert.ok(p1Ack < p3Ack);
  });
});

// ── Escalation ────────────────────────────────────────────────────────

describe('escalateIncident', () => {
  it('escalates to next level', () => {
    const inc = createIncident({ title: 'Test' });
    triageIncident(inc.id, { assignee: 'engineer' });
    const result = escalateIncident(inc.id);
    assert.strictEqual(result.escalated, true);
    assert.strictEqual(result.level, 1);
    assert.strictEqual(result.role, 'team_lead');
  });

  it('returns false at max level', () => {
    const inc = createIncident({ title: 'Test' });
    triageIncident(inc.id, { assignee: 'eng' });
    // Escalate 6 times to hit max
    for (let i = 0; i < 7; i++) {
      escalateIncident(inc.id);
    }
    const result = escalateIncident(inc.id);
    assert.strictEqual(result.escalated, false);
    assert.strictEqual(result.reason, 'max_level');
  });
});

// ── Resolution ──────────────────────────────────────────────────────

describe('resolveIncident', () => {
  it('resolves incident', () => {
    const inc = createIncident({ title: 'Test' });
    const updated = resolveIncident(inc.id, { resolution: 'Fixed by restarting service' });
    assert.strictEqual(updated.status, 'resolved');
    assert.strictEqual(updated.resolvedAt !== null, true);
    assert.strictEqual(updated.resolution.summary, 'Fixed by restarting service');
  });
});

describe('closeIncident', () => {
  it('closes resolved incident', () => {
    const inc = createIncident({ title: 'Test' });
    resolveIncident(inc.id, { resolution: 'Done' });
    const updated = closeIncident(inc.id, { note: 'Customer confirmed' });
    assert.strictEqual(updated.status, 'closed');
    assert.strictEqual(updated.closedAt !== null, true);
  });
});

// ── SLA Checking ────────────────────────────────────────────────────

describe('checkSLABreach', () => {
  it('detects no breaches on fresh incident', () => {
    const inc = createIncident({ title: 'New', severity: 'P1_CRITICAL' });
    const { breaching, approaching } = checkSLABreach(inc.id);
    assert.strictEqual(breaching.length, 0);
    assert.strictEqual(approaching.length, 0);
  });
});

// ── SLA Dashboard ────────────────────────────────────────────────

describe('getSLADashboard', () => {
  it('returns dashboard with counts', () => {
    createIncident({ title: 'P1', severity: 'P1_CRITICAL' });
    createIncident({ title: 'P3', severity: 'P3_MEDIUM' });
    const dashboard = getSLADashboard();
    assert.strictEqual(dashboard.total.active, 2);
    assert.ok(dashboard.bySeverity);
  });
});

// ── Incident Stats ───────────────────────────────────────────────

describe('getIncidentStats', () => {
  it('counts by status and severity', () => {
    createIncident({ title: 'P1' });
    createIncident({ title: 'P2' });
    const stats = getIncidentStats();
    assert.strictEqual(stats.total, 2);
    assert.ok(typeof stats.byStatus === 'object');
    assert.ok(typeof stats.bySeverity === 'object');
    assert.ok(typeof stats.mttr_minutes === 'number');
    assert.ok(typeof stats.slaCompliance === 'number');
  });
});

// ── Constants ───────────────────────────────────────────────────

describe('Constants', () => {
  it('exports severity levels', () => {
    assert.strictEqual(INCIDENT_SEVERITY.P1_CRITICAL, 'P1_CRITICAL');
    assert.strictEqual(INCIDENT_SEVERITY.P2_HIGH, 'P2_HIGH');
    assert.strictEqual(INCIDENT_SEVERITY.P3_MEDIUM, 'P3_MEDIUM');
    assert.strictEqual(INCIDENT_SEVERITY.P4_LOW, 'P4_LOW');
  });

  it('exports all status values', () => {
    assert.strictEqual(INCIDENT_STATUS.DETECTED, 'detected');
    assert.strictEqual(INCIDENT_STATUS.RESOLVED, 'resolved');
    assert.strictEqual(INCIDENT_STATUS.CLOSED, 'closed');
  });
});
