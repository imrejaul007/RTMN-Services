/**
 * PolicyOS — Incident Response Automation (Phase P4)
 *
 * Automated incident lifecycle:
 * 1. DETECT — policy violations, SLA breaches, anomalies, manual reports
 * 2. TRIAGE — severity classification, assignment, initial response
 * 3. ESCALATE — chain-of-command escalation with timeouts
 * 4. RESOLVE — remediation, runbook execution, stakeholder notification
 * 5. POST-MORTEM — timeline reconstruction, root cause, action items
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// ── Severity & Priority ───────────────────────────────────────────────

export const INCIDENT_SEVERITY = {
  P1_CRITICAL: 'P1_CRITICAL',   // Complete outage, data loss, security breach
  P2_HIGH: 'P2_HIGH',           // Major degradation, customer impact
  P3_MEDIUM: 'P3_MEDIUM',       // Minor degradation, workaround available
  P4_LOW: 'P4_LOW',             // Cosmetic issue, low impact
};

export const INCIDENT_STATUS = {
  DETECTED: 'detected',
  TRIAGED: 'triaged',
  INVESTIGATING: 'investigating',
  IDENTIFIED: 'identified',
  MONITORING: 'monitoring',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
};

export const INCIDENT_CATEGORY = {
  OUTAGE: 'outage',
  DEGRADATION: 'degradation',
  SECURITY: 'security',
  DATA_LOSS: 'data_loss',
  PERFORMANCE: 'performance',
  POLICY_VIOLATION: 'policy_violation',
  SLA_BREACH: 'sla_breach',
  COMPLIANCE: 'compliance',
  CONFIG_ERROR: 'config_error',
  EXTERNAL_DEPENDENCY: 'external_dependency',
  OTHER: 'other',
};

// ── SLA Targets (in minutes) ──────────────────────────────────────────

const SLA_TARGETS = {
  P1_CRITICAL: { acknowledge: 15, resolve: 240,  status: 'critical' },
  P2_HIGH:     { acknowledge: 60,  resolve: 480,  status: 'high' },
  P3_MEDIUM:   { acknowledge: 240, resolve: 1440, status: 'medium' },
  P4_LOW:      { acknowledge: 480, resolve: 2880, status: 'low' },
};

// ── Escalation Chain ───────────────────────────────────────────────

const DEFAULT_ESCALATION_CHAIN = [
  { level: 0, role: 'on_call_engineer', timeoutMin: 15 },
  { level: 1, role: 'team_lead', timeoutMin: 30 },
  { level: 2, role: 'engineering_manager', timeoutMin: 60 },
  { level: 3, role: 'director', timeoutMin: 120 },
  { level: 4, role: 'vp_engineering', timeoutMin: 240 },
  { level: 5, role: 'cto', timeoutMin: 480 },
];

// ── Incident Store ──────────────────────────────────────────────────

const _events = new EventEmitter();
let _incidents = new Map();
let _idCounter = 0;

export function _resetIncidentState() {
  _incidents = new Map();
  _idCounter = 0;
}

function newId() {
  return `inc-${String(++_idCounter).padStart(4, '0')}`;
}

function now() {
  return new Date().toISOString();
}

function minutesSince(ts) {
  return Math.round((Date.now() - new Date(ts).getTime()) / 60000);
}

// ── Incident Creation ───────────────────────────────────────────────

/**
 * Create a new incident.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.description]
 * @param {string} [opts.severity]  P1_CRITICAL | P2_HIGH | P3_MEDIUM | P4_LOW
 * @param {string} [opts.category]
 * @param {string} [opts.source]  policy_violation | sla_breach | monitoring | manual | external
 * @param {object} [opts.context]  { policyId, tenantId, userId, ... }
 * @param {string} [opts.assignee]
 */
export function createIncident(opts) {
  const id = newId();
  const severity = opts.severity || INCIDENT_SEVERITY.P3_MEDIUM;
  const sla = SLA_TARGETS[severity] || SLA_TARGETS.P3_MEDIUM;

  const incident = {
    id,
    title: opts.title,
    description: opts.description || '',
    severity,
    status: INCIDENT_STATUS.DETECTED,
    category: opts.category || INCIDENT_CATEGORY.OTHER,
    source: opts.source || 'manual',
    context: opts.context || {},
    assignee: opts.assignee || null,
    reporter: opts.reporter || 'system',
    tenantId: opts.tenantId || opts.context?.tenantId || null,
    createdAt: now(),
    updatedAt: now(),
    acknowledgedAt: null,
    resolvedAt: null,
    closedAt: null,
    sla: {
      acknowledgeBy: new Date(Date.now() + sla.acknowledge * 60000).toISOString(),
      resolveBy: new Date(Date.now() + sla.resolve * 60000).toISOString(),
      acknowledgeTargetMin: sla.acknowledge,
      resolveTargetMin: sla.resolve,
    },
    breach: {
      acknowledgeBreached: false,
      resolveBreached: false,
    },
    escalation: {
      currentLevel: 0,
      chain: DEFAULT_ESCALATION_CHAIN,
      history: [],
    },
    timeline: [
      {
        id: uuidv4(),
        type: 'created',
        timestamp: now(),
        actor: opts.reporter || 'system',
        message: `Incident created: ${opts.title}`,
      },
    ],
    runbooks: [],
    actionItems: [],
    postMortem: null,
    tags: opts.tags || [],
    stakeholderEmails: opts.stakeholderEmails || [],
  };

  _incidents.set(id, incident);
  _events.emit('incident:created', incident);
  return incident;
}

/**
 * Create incident from a policy violation.
 */
export function createIncidentFromViolation(violation, context = {}) {
  let severity = INCIDENT_SEVERITY.P3_MEDIUM;
  let category = INCIDENT_CATEGORY.POLICY_VIOLATION;

  if (violation.severity === 'critical') {
    severity = INCIDENT_SEVERITY.P1_CRITICAL;
    category = INCIDENT_CATEGORY.SECURITY;
  } else if (violation.severity === 'error') {
    severity = INCIDENT_SEVERITY.P2_HIGH;
  }

  return createIncident({
    title: `Policy Violation: ${violation.category || 'unknown'}`,
    description: `Policy ${violation.policyId || 'unknown'} flagged: ${violation.message || JSON.stringify(violation)}`,
    severity,
    category,
    source: 'policy_violation',
    context: { ...context, violation },
  });
}

// ── Incident Operations ─────────────────────────────────────────────

export function getIncident(id) {
  return _incidents.get(id) || null;
}

export function listIncidents({ status, severity, assignee, tenantId, limit = 50 } = {}) {
  let list = [..._incidents.values()];

  if (status) list = list.filter(i => i.status === status);
  if (severity) list = list.filter(i => i.severity === severity);
  if (assignee) list = list.filter(i => i.assignee === assignee);
  if (tenantId) list = list.filter(i => i.tenantId === tenantId);

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list.slice(0, limit);
}

export function updateIncident(id, updates) {
  const incident = _incidents.get(id);
  if (!incident) return null;

  const changed = [];
  for (const [key, val] of Object.entries(updates)) {
    if (incident[key] !== val) {
      changed.push(key);
      incident[key] = val;
    }
  }

  if (changed.length > 0) {
    incident.updatedAt = now();
    _events.emit('incident:updated', { id, changed });
  }

  return incident;
}

export function addTimelineEntry(id, entry) {
  const incident = _incidents.get(id);
  if (!incident) return null;

  const timelineEntry = {
    id: uuidv4(),
    timestamp: now(),
    actor: entry.actor || 'system',
    type: entry.type || 'comment',
    message: entry.message || '',
  };

  incident.timeline.push(timelineEntry);
  incident.updatedAt = now();
  _events.emit('incident:entry', { id, entry: timelineEntry });

  return timelineEntry;
}

// ── Triage ─────────────────────────────────────────────────────

/**
 * Assign and triage an incident.
 */
export function triageIncident(id, { assignee, severity, category, note }) {
  const incident = _incidents.get(id);
  if (!incident) return null;

  const wasDetected = incident.status === INCIDENT_STATUS.DETECTED;
  incident.assignee = assignee || incident.assignee;
  if (severity && severity !== incident.severity) {
    incident.severity = severity;
    // Recalculate SLA
    const sla = SLA_TARGETS[severity] || SLA_TARGETS.P3_MEDIUM;
    incident.sla = {
      acknowledgeBy: new Date(Date.now() + sla.acknowledge * 60000).toISOString(),
      resolveBy: new Date(Date.now() + sla.resolve * 60000).toISOString(),
      acknowledgeTargetMin: sla.acknowledge,
      resolveTargetMin: sla.resolve,
    };
  }
  if (category) incident.category = category;

  if (wasDetected) {
    incident.status = INCIDENT_STATUS.TRIAGED;
    incident.acknowledgedAt = now();
  }

  if (note) {
    incident.timeline.push({
      id: uuidv4(),
      timestamp: now(),
      actor: assignee || 'system',
      type: 'triage',
      message: note,
    });
  }

  incident.updatedAt = now();
  _events.emit('incident:triaged', incident);
  return incident;
}

// ── Escalation ─────────────────────────────────────────────────

/**
 * Escalate incident to next level in chain.
 */
export function escalateIncident(id) {
  const incident = _incidents.get(id);
  if (!incident) return null;

  const chain = incident.escalation.chain;
  const nextLevel = incident.escalation.currentLevel + 1;

  if (nextLevel >= chain.length) {
    // Already at max escalation
    return { incident, escalated: false, reason: 'max_level' };
  }

  const level = chain[nextLevel];
  const prevLevel = chain[incident.escalation.currentLevel];

  incident.escalation.currentLevel = nextLevel;
  incident.escalation.history.push({
    level: nextLevel,
    role: level.role,
    escalatedAt: now(),
    reason: 'no_response',
    previousLevel: nextLevel - 1,
  });

  incident.timeline.push({
    id: uuidv4(),
    timestamp: now(),
    actor: 'system',
    type: 'escalated',
    message: `Escalated from ${prevLevel.role} to ${level.role} (level ${nextLevel})`,
  });

  incident.updatedAt = now();
  _events.emit('incident:escalated', { incident, level: nextLevel, role: level.role });

  return { incident, escalated: true, level: nextLevel, role: level.role };
}

// ── Resolution ────────────────────────────────────────────────

/**
 * Resolve an incident.
 */
export function resolveIncident(id, { resolution, runbookId, note }) {
  const incident = _incidents.get(id);
  if (!incident) return null;

  incident.status = INCIDENT_STATUS.RESOLVED;
  incident.resolvedAt = now();
  incident.resolution = {
    summary: resolution || '',
    runbookId: runbookId || null,
    resolvedBy: note || 'system',
    resolvedAt: now(),
  };

  incident.timeline.push({
    id: uuidv4(),
    timestamp: now(),
    actor: note || 'system',
    type: 'resolved',
    message: resolution || 'Incident resolved',
  });

  incident.updatedAt = now();
  _events.emit('incident:resolved', incident);
  return incident;
}

/**
 * Close an incident (after resolved).
 */
export function closeIncident(id, { note } = {}) {
  const incident = _incidents.get(id);
  if (!incident) return null;

  incident.status = INCIDENT_STATUS.CLOSED;
  incident.closedAt = now();
  incident.timeline.push({
    id: uuidv4(),
    timestamp: now(),
    actor: note || 'system',
    type: 'closed',
    message: 'Incident closed',
  });

  incident.updatedAt = now();
  _events.emit('incident:closed', incident);
  return incident;
}

// ── SLA Checking ───────────────────────────────────────────────

/**
 * Check SLA status for all open incidents.
 * Returns incidents that are breaching or approaching breach.
 */
export function checkSLABreach(incidentId) {
  const incident = incidentId ? _incidents.get(incidentId) : null;
  const toCheck = incident ? [incident] : [..._incidents.values()];

  const breaching = [];
  const approaching = [];

  for (const inc of toCheck) {
    if ([INCIDENT_STATUS.RESOLVED, INCIDENT_STATUS.CLOSED].includes(inc.status)) continue;

    const nowMs = Date.now();

    // Acknowledge SLA
    if (!inc.acknowledgedAt) {
      const ackBy = new Date(inc.sla.acknowledgeBy).getTime();
      const remaining = Math.round((ackBy - nowMs) / 60000);
      if (remaining <= 0) {
        if (!inc.breach.acknowledgeBreached) {
          inc.breach.acknowledgeBreached = true;
          breaching.push({ incident: inc, type: 'acknowledge', remainingMin: remaining });
          _events.emit('incident:sla_breach', { incident: inc, type: 'acknowledge' });
        }
      } else if (remaining <= 30) {
        approaching.push({ incident: inc, type: 'acknowledge', remainingMin: remaining });
      }
    }

    // Resolution SLA
    const resBy = new Date(inc.sla.resolveBy).getTime();
    const resRemaining = Math.round((resBy - nowMs) / 60000);
    if (resRemaining <= 0) {
      if (!inc.breach.resolveBreached) {
        inc.breach.resolveBreached = true;
        breaching.push({ incident: inc, type: 'resolve', remainingMin: resRemaining });
        _events.emit('incident:sla_breach', { incident: inc, type: 'resolve' });
      }
    } else if (resRemaining <= 60) {
      approaching.push({ incident: inc, type: 'resolve', remainingMin: resRemaining });
    }
  }

  return { breaching, approaching };
}

// ── SLA Dashboard ─────────────────────────────────────────────

export function getSLADashboard({ tenantId } = {}) {
  const nowMs = Date.now();
  let incidents = [..._incidents.values()];

  if (tenantId) incidents = incidents.filter(i => i.tenantId === tenantId);

  const active = incidents.filter(i =>
    ![INCIDENT_STATUS.CLOSED, INCIDENT_STATUS.CANCELLED].includes(i.status)
  );
  const resolved = incidents.filter(i => i.status === INCIDENT_STATUS.RESOLVED);

  // Calculate SLA metrics
  const calcMetrics = (list) => {
    if (list.length === 0) return { count: 0, ackCompliance: 100, resCompliance: 100, avgAckMin: 0, avgResMin: 0 };
    let ackOk = 0, resOk = 0, ackTotal = 0, resTotal = 0, ackSum = 0, resSum = 0;

    for (const i of list) {
      const ackMin = i.acknowledgedAt ? minutesSince(i.createdAt) : null;
      const resMin = i.resolvedAt ? minutesSince(i.createdAt) : null;
      const targetAck = i.sla.acknowledgeTargetMin;
      const targetRes = i.sla.resolveTargetMin;

      if (ackMin !== null) { ackSum += ackMin; ackTotal++; if (ackMin <= targetAck) ackOk++; }
      if (resMin !== null) { resSum += resMin; resTotal++; if (resMin <= targetRes) resOk++; }
    }

    return {
      count: list.length,
      ackCompliance: ackTotal > 0 ? Math.round(ackOk / ackTotal * 100) : 100,
      resCompliance: resTotal > 0 ? Math.round(resOk / resTotal * 100) : 100,
      avgAckMin: ackTotal > 0 ? Math.round(ackSum / ackTotal) : 0,
      avgResMin: resTotal > 0 ? Math.round(resSum / resTotal) : 0,
    };
  };

  const bySeverity = {};
  for (const sev of Object.values(INCIDENT_SEVERITY)) {
    const list = active.filter(i => i.severity === sev);
    const resList = resolved.filter(i => i.severity === sev);
    bySeverity[sev] = {
      active: list.length,
      resolved: resList.length,
      metrics: calcMetrics([...list, ...resList]),
    };
  }

  return {
    total: { active: active.length, resolved: resolved.length },
    bySeverity,
    overall: calcMetrics([...active, ...resolved]),
    openBreaching: checkSLABreach().breaching.length,
    openApproaching: checkSLABreach().approaching.length,
  };
}

// ── Runbook Linkage ───────────────────────────────────────────

export function linkRunbook(incidentId, { runbookId, runbookName, runbookUrl, stepId }) {
  const incident = _incidents.get(incidentId);
  if (!incident) return null;

  const link = {
    runbookId,
    runbookName: runbookName || runbookId,
    runbookUrl: runbookUrl || null,
    linkedAt: now(),
    completedAt: null,
    stepId: stepId || null,
  };

  incident.runbooks.push(link);
  incident.timeline.push({
    id: uuidv4(),
    timestamp: now(),
    actor: 'system',
    type: 'runbook_linked',
    message: `Runbook linked: ${runbookName || runbookId}`,
  });

  incident.updatedAt = now();
  return incident;
}

// ── Post-Mortem ───────────────────────────────────────────────

export function createPostMortem(incidentId, { summary, rootCause, impact, actionItems }) {
  const incident = _incidents.get(incidentId);
  if (!incident) return null;

  incident.postMortem = {
    id: uuidv4(),
    createdAt: now(),
    summary: summary || '',
    rootCause: rootCause || '',
    impact: impact || '',
    actionItems: (actionItems || []).map(item => ({
      id: uuidv4(),
      task: item.task || item,
      owner: item.owner || null,
      dueDate: item.dueDate || null,
      status: 'open',
    })),
    status: 'draft',
    completedAt: null,
  };

  incident.timeline.push({
    id: uuidv4(),
    timestamp: now(),
    actor: 'system',
    type: 'postmortem_created',
    message: 'Post-mortem created',
  });

  incident.updatedAt = now();
  return incident;
}

// ── Statistics ────────────────────────────────────────────────

export function getIncidentStats({ tenantId, from, to } = {}) {
  let list = [..._incidents.values()];

  if (tenantId) list = list.filter(i => i.tenantId === tenantId);
  if (from) list = list.filter(i => new Date(i.createdAt) >= new Date(from));
  if (to) list = list.filter(i => new Date(i.createdAt) <= new Date(to));

  const byStatus = {};
  for (const s of Object.values(INCIDENT_STATUS)) {
    byStatus[s] = list.filter(i => i.status === s).length;
  }

  const bySeverity = {};
  for (const sev of Object.values(INCIDENT_SEVERITY)) {
    bySeverity[sev] = list.filter(i => i.severity === sev).length;
  }

  const byCategory = {};
  for (const cat of Object.values(INCIDENT_CATEGORY)) {
    byCategory[cat] = list.filter(i => i.category === cat).length;
  }

  const resolved = list.filter(i => i.status === INCIDENT_STATUS.RESOLVED);
  const mttr = resolved.length > 0
    ? Math.round(resolved.reduce((s, i) => s + minutesSince(i.createdAt), 0) / resolved.length)
    : 0;

  const breached = list.filter(i => i.breach.resolveBreached || i.breach.acknowledgeBreached);
  const slaCompliance = list.length > 0
    ? Math.round((list.length - breached.length) / list.length * 100)
    : 100;

  return {
    total: list.length,
    byStatus,
    bySeverity,
    byCategory,
    mttr_minutes: mttr,
    slaCompliance,
    resolutionRate: list.length > 0 ? Math.round(resolved.length / list.length * 100) : 0,
  };
}

// ── Events ────────────────────────────────────────────────────

export function onIncidentEvent(event, handler) {
  _events.on(event, handler);
  return () => _events.off(event, handler);
}

export { _events };

export default {
  createIncident,
  createIncidentFromViolation,
  getIncident,
  listIncidents,
  updateIncident,
  addTimelineEntry,
  triageIncident,
  escalateIncident,
  resolveIncident,
  closeIncident,
  checkSLABreach,
  getSLADashboard,
  linkRunbook,
  createPostMortem,
  getIncidentStats,
  onIncidentEvent,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  INCIDENT_CATEGORY,
};
