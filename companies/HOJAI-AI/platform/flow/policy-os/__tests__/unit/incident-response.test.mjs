/**
 * PolicyOS — Incident Response Service Tests (Phase P4)
 * Resets singleton state before each test.
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
} = await import('../../src/services/incident-response.js');

beforeEach(() => { _resetIncidentState(); });

describe('createIncident', () => {
  it('creates incident with required fields', () => {
    const inc = createIncident({ title: 'API is down', severity: 'P1_CRITICAL' });
    assert.strictEqual(inc.title, 'API is down');
    assert.strictEqual(inc.severity, 'P1_CRITICAL');
    assert.strictEqual(inc.status, INCIDENT_STATUS.DETECTED);
    assert.ok(inc.id.startsWith('inc-'));
  });

  it('defaults severity to P3_MEDIUM', () => {
    const inc = createIncident({ title: 'Minor issue' });
    assert.strictEqual(inc.severity, 'P3_MEDIUM');
  });

  it('creates incident from policy violation', () => {
    const violation = {
      severity: 'critical',
      category: 'unauthorized_access',
      policyId: 'pol-42',
    };
    const inc = createIncidentFromViolation(violation);
    assert.strictEqual(inc.severity, 'P1_CRITICAL');
    assert.strictEqual(inc.category, 'security');
  });
});

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
    assert.strictEqual(listIncidents().length, 2);
  });
});

describe('triageIncident', () => {
  it('sets assignee and status to TRIAGED', () => {
    const inc = createIncident({ title: 'Test' });
    const updated = triageIncident(inc.id, { assignee: 'alice' });
    assert.strictEqual(updated.status, INCIDENT_STATUS.TRIAGED);
    assert.strictEqual(updated.assignee, 'alice');
  });
});

describe('escalateIncident', () => {
  it('escalates to next level', () => {
    const inc = createIncident({ title: 'Test' });
    triageIncident(inc.id, { assignee: 'engineer' });
    const result = escalateIncident(inc.id);
    assert.strictEqual(result.escalated, true);
    assert.strictEqual(result.level, 1);
  });
});

describe('resolveIncident', () => {
  it('resolves incident', () => {
    const inc = createIncident({ title: 'Test' });
    const updated = resolveIncident(inc.id, { resolution: 'Fixed' });
    assert.strictEqual(updated.status, INCIDENT_STATUS.RESOLVED);
    assert.ok(updated.resolvedAt);
  });
});

describe('checkSLABreach', () => {
  it('returns object with breaching/approaching arrays', () => {
    const inc = createIncident({ title: 'New' });
    const result = checkSLABreach(inc.id);
    assert.ok(Array.isArray(result.breaching));
    assert.ok(Array.isArray(result.approaching));
  });
});

describe('getSLADashboard', () => {
  it('returns dashboard with counts', () => {
    createIncident({ title: 'P1', severity: 'P1_CRITICAL' });
    const dashboard = getSLADashboard();
    assert.strictEqual(dashboard.total.active, 1);
  });
});

describe('getIncidentStats', () => {
  it('counts by status and severity', () => {
    createIncident({ title: 'P1' });
    createIncident({ title: 'P3', severity: 'P3_MEDIUM' });
    const stats = getIncidentStats();
    assert.strictEqual(stats.total, 2);
    assert.ok(typeof stats.mttr_minutes, 'number');
  });
});

describe('constants', () => {
  it('exports severity levels', () => {
    assert.strictEqual(INCIDENT_SEVERITY.P1_CRITICAL, 'P1_CRITICAL');
    assert.strictEqual(INCIDENT_SEVERITY.P2_HIGH, 'P2_HIGH');
  });
});
