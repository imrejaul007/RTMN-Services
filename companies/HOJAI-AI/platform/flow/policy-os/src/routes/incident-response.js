/**
 * PolicyOS — Incident Response Routes (Phase P4)
 *
 * Endpoints:
 *  POST /api/incidents            — create incident
 *  GET  /api/incidents           — list incidents
 *  GET  /api/incidents/:id       — get one
 *  PATCH /api/incidents/:id     — update
 *  POST /api/incidents/:id/triage — triage
 *  POST /api/incidents/:id/escalate — escalate
 *  POST /api/incidents/:id/resolve — resolve
 *  POST /api/incidents/:id/close  — close
 *  GET  /api/incidents/:id/timeline — timeline
 *  POST /api/incidents/:id/timeline — add entry
 *  POST /api/incidents/:id/runbook — link runbook
 *  POST /api/incidents/:id/postmortem — create post-mortem
 *  GET  /api/incidents/stats     — statistics
 *  GET  /api/incidents/sla       — SLA dashboard
 *  GET  /api/incidents/sla/check — check SLA breaches
 */

import {
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
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  INCIDENT_CATEGORY,
} from '../services/incident-response.js';

export function registerIncidentResponseRoutes(app, {
  policies,
  customAuth,
  writeLimiter,
}) {

  // ── POST /api/incidents ───────────────────────────────────────────────

  app.post('/api/incidents', customAuth, writeLimiter, (req, res) => {
    const { title, description, severity, category, source, context, assignee, tags, stakeholderEmails } = req.body || {};

    if (!title) return res.status(400).json({ error: 'title is required' });

    const incident = createIncident({
      title,
      description,
      severity,
      category,
      source,
      context: { ...context, userId: req.auth?.userId, tenantId: req.auth?.tenantId },
      assignee,
      tags,
      stakeholderEmails,
      reporter: req.auth?.userId || 'api',
    });

    res.status(201).json(incident);
  });

  // ── POST /api/incidents/from-violation ───────────────────────────────

  app.post('/api/incidents/from-violation', customAuth, writeLimiter, (req, res) => {
    const { violation, context } = req.body || {};
    if (!violation) return res.status(400).json({ error: 'violation is required' });

    const incident = createIncidentFromViolation(violation, {
      ...context,
      userId: req.auth?.userId,
      tenantId: req.auth?.tenantId,
    });

    res.status(201).json(incident);
  });

  // ── GET /api/incidents ───────────────────────────────────────────────

  app.get('/api/incidents', customAuth, (req, res) => {
    const { status, severity, assignee, tenantId, limit = 50 } = req.query;
    const incidents = listIncidents({ status, severity, assignee, tenantId, limit: parseInt(limit) });
    res.json({ count: incidents.length, incidents });
  });

  // ── GET /api/incidents/stats ─────────────────────────────────────────

  app.get('/api/incidents/stats', customAuth, (req, res) => {
    const { tenantId, from, to } = req.query;
    const stats = getIncidentStats({ tenantId, from, to });
    res.json(stats);
  });

  // ── GET /api/incidents/sla ────────────────────────────────────────────

  app.get('/api/incidents/sla', customAuth, (req, res) => {
    const { tenantId } = req.query;
    const dashboard = getSLADashboard({ tenantId });
    res.json(dashboard);
  });

  // ── GET /api/incidents/sla/check ───────────────────────────────

  app.get('/api/incidents/sla/check', customAuth, (req, res) => {
    const { incidentId } = req.query;
    const result = checkSLABreach(incidentId);
    res.json(result);
  });

  // ── GET /api/incidents/:id ────────────────────────────────────────

  app.get('/api/incidents/:id', customAuth, (req, res) => {
    const incident = getIncident(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  });

  // ── PATCH /api/incidents/:id ───────────────────────────────

  app.patch('/api/incidents/:id', customAuth, writeLimiter, (req, res) => {
    const { title, description, severity, category, assignee, tags } = req.body || {};
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (severity !== undefined) updates.severity = severity;
    if (category !== undefined) updates.category = category;
    if (assignee !== undefined) updates.assignee = assignee;
    if (tags !== undefined) updates.tags = tags;

    const incident = updateIncident(req.params.id, updates);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  });

  // ── POST /api/incidents/:id/triage ────────────────────────────

  app.post('/api/incidents/:id/triage', customAuth, writeLimiter, (req, res) => {
    const { assignee, severity, category, note } = req.body || {};
    const incident = triageIncident(req.params.id, { assignee, severity, category, note });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  });

  // ── POST /api/incidents/:id/escalate ───────────────────────

  app.post('/api/incidents/:id/escalate', customAuth, writeLimiter, (req, res) => {
    const result = escalateIncident(req.params.id);
    if (!result) return res.status(404).json({ error: 'Incident not found' });
    res.json(result);
  });

  // ── POST /api/incidents/:id/resolve ──────────────────────────

  app.post('/api/incidents/:id/resolve', customAuth, writeLimiter, (req, res) => {
    const { resolution, runbookId, note } = req.body || {};
    const incident = resolveIncident(req.params.id, { resolution, runbookId, note });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  });

  // ── POST /api/incidents/:id/close ──────────────────────────

  app.post('/api/incidents/:id/close', customAuth, writeLimiter, (req, res) => {
    const { note } = req.body || {};
    const incident = closeIncident(req.params.id, { note });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  });

  // ── GET /api/incidents/:id/timeline ───────────────────────

  app.get('/api/incidents/:id/timeline', customAuth, (req, res) => {
    const incident = getIncident(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ count: incident.timeline.length, entries: incident.timeline });
  });

  // ── POST /api/incidents/:id/timeline ────────────────────

  app.post('/api/incidents/:id/timeline', customAuth, writeLimiter, (req, res) => {
    const { message, type = 'comment', actor } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message is required' });

    const entry = addTimelineEntry(req.params.id, {
      message,
      type,
      actor: actor || req.auth?.userId || 'api',
    });
    if (!entry) return res.status(404).json({ error: 'Incident not found' });
    res.status(201).json(entry);
  });

  // ── POST /api/incidents/:id/runbook ───────────────────────

  app.post('/api/incidents/:id/runbook', customAuth, writeLimiter, (req, res) => {
    const { runbookId, runbookName, runbookUrl } = req.body || {};
    if (!runbookId) return res.status(400).json({ error: 'runbookId is required' });

    const incident = linkRunbook(req.params.id, { runbookId, runbookName, runbookUrl });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  });

  // ── POST /api/incidents/:id/postmortem ─────────────────

  app.post('/api/incidents/:id/postmortem', customAuth, writeLimiter, (req, res) => {
    const { summary, rootCause, impact, actionItems } = req.body || {};
    const incident = createPostMortem(req.params.id, { summary, rootCause, impact, actionItems });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.status(201).json(incident);
  });
}
