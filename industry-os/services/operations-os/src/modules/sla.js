/**
 * Operations OS - SLA Management
 * Track and enforce Service Level Agreements
 */

const { db } = require('../db/database');

class SLAManager {
  constructor() {
    this.db = db;
    this.checkInterval = 60000; // 1 minute
  }

  /**
   * Create SLA definition
   */
  createSLA(data) {
    const id = this.db.generateId('SLA');

    const sla = {
      id,
      name: data.name,
      type: data.type || 'incident', // incident, approval, task, delivery
      entityType: data.entityType, // Which entity this applies to
      responseTime: data.responseTime || 3600000, // 1 hour default
      resolutionTime: data.resolutionTime || 86400000, // 1 day default
      conditions: data.conditions || {},
      priorityLevels: data.priorityLevels || {
        critical: { responseTime: 900000, resolutionTime: 14400000 }, // 15m, 4h
        high: { responseTime: 1800000, resolutionTime: 43200000 },    // 30m, 12h
        medium: { responseTime: 3600000, resolutionTime: 86400000 }, // 1h, 1d
        low: { responseTime: 14400000, resolutionTime: 259200000 }, // 4h, 3d
      },
      businessHours: data.businessHours || { start: 9, end: 18 }, // 9 AM to 6 PM
      excludeWeekends: data.excludeWeekends || false,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.db.set('slas', id, sla);
    return sla;
  }

  /**
   * Get SLA for an entity
   */
  getSLAForEntity(entityType, priority) {
    const slas = this.db.getAll('slas').filter(s => s.entityType === entityType);
    return slas.find(s => s.priorityLevels[priority]);
  }

  /**
   * Calculate SLA status for an entity
   */
  calculateSLAStatus(entity, sla, type = 'resolution') {
    if (!sla) return { tracked: false };

    const startTime = new Date(entity.reportedAt || entity.createdAt || entity.submittedAt);
    const now = Date.now();

    // Get time thresholds
    const priority = entity.severity || entity.priority || 'medium';
    const thresholds = sla.priorityLevels[priority] || {
      responseTime: sla.responseTime,
      resolutionTime: sla.resolutionTime,
    };

    const timeLimit = type === 'response' ? thresholds.responseTime : thresholds.resolutionTime;

    // Calculate elapsed time (considering business hours)
    let elapsed = this.calculateElapsedTime(startTime, now, sla);

    // Check if breached
    const breached = elapsed > timeLimit;
    const remaining = timeLimit - elapsed;

    // Calculate percentage
    const percentElapsed = Math.round((elapsed / timeLimit) * 100);

    return {
      tracked: true,
      elapsed,
      limit: timeLimit,
      remaining: Math.max(0, remaining),
      breached,
      percentElapsed,
      priority,
      responseDeadline: type === 'response' ? new Date(startTime.getTime() + thresholds.responseTime).toISOString() : null,
      resolutionDeadline: type === 'resolution' ? new Date(startTime.getTime() + thresholds.resolutionTime).toISOString() : null,
      status: breached ? 'breached' : remaining < timeLimit * 0.25 ? 'at_risk' : 'on_track',
    };
  }

  /**
   * Calculate elapsed time considering business hours
   */
  calculateElapsedTime(startTime, endTime, sla) {
    let elapsed = endTime - startTime;

    if (sla.businessHours && sla.businessHours.enabled) {
      // Recalculate only during business hours
      let current = new Date(startTime);
      let businessElapsed = 0;
      const end = new Date(endTime);

      while (current < end) {
        const hour = current.getHours();
        const day = current.getDay();

        // Skip weekends if configured
        if (sla.excludeWeekends && (day === 0 || day === 6)) {
          current.setDate(current.getDate() + 1);
          current.setHours(sla.businessHours.start);
          continue;
        }

        // Check if within business hours
        if (hour >= sla.businessHours.start && hour < sla.businessHours.end) {
          businessElapsed += 60000; // 1 minute
        }

        current.setTime(current.getTime() + 60000);
      }

      elapsed = businessElapsed;
    }

    return elapsed;
  }

  /**
   * Check for SLA breaches
   */
  checkBreaches() {
    const breaches = [];

    // Check incidents
    const incidents = this.db.getAll('incidents');
    incidents.forEach(incident => {
      if (incident.status === 'resolved') return;

      const sla = this.getSLAForEntity('incident', incident.severity);
      if (!sla) return;

      const responseStatus = this.calculateSLAStatus(incident, sla, 'response');
      const resolutionStatus = this.calculateSLAStatus(incident, sla, 'resolution');

      if (responseStatus.breached) {
        breaches.push({
          type: 'response_breach',
          entityType: 'incident',
          entityId: incident.id,
          title: incident.title,
          severity: incident.severity,
          sla: sla.name,
          deadline: responseStatus.responseDeadline,
          overdue: Math.abs(responseStatus.remaining),
        });
      }

      if (resolutionStatus.breached) {
        breaches.push({
          type: 'resolution_breach',
          entityType: 'incident',
          entityId: incident.id,
          title: incident.title,
          severity: incident.severity,
          sla: sla.name,
          deadline: resolutionStatus.resolutionDeadline,
          overdue: Math.abs(resolutionStatus.remaining),
        });
      }
    });

    // Check approvals
    const approvals = this.db.getAll('approvals');
    approvals.forEach(approval => {
      if (approval.status !== 'pending') return;

      const sla = this.getSLAForEntity('approval', 'medium');
      if (!sla) return;

      const status = this.calculateSLAStatus(approval, sla, 'resolution');

      if (status.breached) {
        breaches.push({
          type: 'approval_breach',
          entityType: 'approval',
          entityId: approval.id,
          title: `${approval.type} Approval`,
          sla: sla.name,
          deadline: status.resolutionDeadline,
          overdue: Math.abs(status.remaining),
        });
      }
    });

    return breaches;
  }

  /**
   * Get SLA dashboard metrics
   */
  getSLAMetrics() {
    const incidents = this.db.getAll('incidents');
    const approvals = this.db.getAll('approvals');
    const slas = this.db.getAll('slas');

    // Calculate metrics for incidents
    let totalIncidents = 0;
    let metSLA = 0;
    let breachedSLA = 0;

    incidents.forEach(incident => {
      const sla = this.getSLAForEntity('incident', incident.severity);
      if (!sla) return;

      totalIncidents++;
      const status = this.calculateSLAStatus(incident, sla, 'resolution');

      if (incident.status === 'resolved') {
        if (status.breached) {
          breachedSLA++;
        } else {
          metSLA++;
        }
      }
    });

    const incidentCompliance = totalIncidents > 0 ? Math.round((metSLA / totalIncidents) * 100) : 100;

    // Get all breaches
    const breaches = this.checkBreaches();

    return {
      slas: slas.filter(s => s.status === 'active').length,
      incidentSLA: {
        total: totalIncidents,
        met: metSLA,
        breached: breachedSLA,
        compliance: incidentCompliance,
      },
      currentBreaches: breaches.length,
      criticalBreaches: breaches.filter(b => b.severity === 'critical').length,
      recentBreaches: breaches.slice(0, 10),
    };
  }

  /**
   * Get trend data for SLA compliance
   */
  getSLATrends(days = 30) {
    const incidents = this.db.getAll('incidents');
    const since = new Date();
    since.setDate(since.getDate() - days);

    const dailyData = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayIncidents = incidents.filter(inc => {
        const created = new Date(inc.reportedAt || inc.createdAt);
        return created.toISOString().split('T')[0] === dateStr;
      });

      let met = 0;
      let breached = 0;

      dayIncidents.forEach(incident => {
        if (incident.status === 'resolved') {
          const sla = this.getSLAForEntity('incident', incident.severity);
          if (sla) {
            const status = this.calculateSLAStatus(incident, sla, 'resolution');
            if (status.breached) breached++;
            else met++;
          }
        }
      });

      const total = met + breached;

      dailyData.unshift({
        date: dateStr,
        total,
        met,
        breached,
        compliance: total > 0 ? Math.round((met / total) * 100) : 100,
      });
    }

    return dailyData;
  }
}

// Express routes
function registerSLARoutes(app) {
  const sla = new SLAManager();

  // Create SLA
  app.post('/api/slas', (req, res) => {
    const newSLA = sla.createSLA(req.body);
    res.status(201).json(newSLA);
  });

  // Get all SLAs
  app.get('/api/slas', (req, res) => {
    const { type, status } = req.query;
    let all = db.getAll('slas');

    if (type) all = all.filter(s => s.type === type);
    if (status) all = all.filter(s => s.status === status);

    res.json({ slas: all, total: all.length });
  });

  // Get SLA
  app.get('/api/slas/:id', (req, res) => {
    const slaDef = db.get('slas', req.params.id);
    if (!slaDef) return res.status(404).json({ error: 'SLA not found' });
    res.json(slaDef);
  });

  // Get SLA status for entity
  app.get('/api/slas/status/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const { priority } = req.query;

    let entity;
    switch (type) {
      case 'incident':
        entity = db.get('incidents', id);
        break;
      case 'approval':
        entity = db.get('approvals', id);
        break;
      case 'task':
        entity = db.get('tasks', id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    if (!entity) return res.status(404).json({ error: 'Entity not found' });

    const slaDef = sla.getSLAForEntity(type, priority || entity.severity || 'medium');
    const responseStatus = sla.calculateSLAStatus(entity, slaDef, 'response');
    const resolutionStatus = sla.calculateSLAStatus(entity, slaDef, 'resolution');

    res.json({
      entityType: type,
      entityId: id,
      sla: slaDef,
      response: responseStatus,
      resolution: resolutionStatus,
    });
  });

  // Get breaches
  app.get('/api/slas/breaches', (req, res) => {
    const breaches = sla.checkBreaches();
    res.json({ breaches, total: breaches.length });
  });

  // Get metrics
  app.get('/api/slas/metrics', (req, res) => {
    const metrics = sla.getSLAMetrics();
    res.json(metrics);
  });

  // Get trends
  app.get('/api/slas/trends', (req, res) => {
    const { days = 30 } = req.query;
    const trends = sla.getSLATrends(parseInt(days));
    res.json({ trends });
  });

  // Update SLA
  app.patch('/api/slas/:id', (req, res) => {
    const existing = db.get('slas', req.params.id);
    if (!existing) return res.status(404).json({ error: 'SLA not found' });

    const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    db.set('slas', req.params.id, updated);
    res.json(updated);
  });
}

module.exports = { SLAManager, registerSLARoutes };
