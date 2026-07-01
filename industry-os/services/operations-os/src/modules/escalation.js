/**
 * Operations OS - Escalation Engine
 * Automatic escalation based on time, priority, and rules
 */

const { db } = require('../db/database');

class EscalationEngine {
  constructor() {
    this.db = db;
    this.escalationTimers = new Map();
    this.checkInterval = 60000; // 1 minute

    // Default escalation thresholds (in milliseconds)
    this.defaultThresholds = {
      low: { 1: 86400000, 2: 172800000, 3: 259200000 },      // 1d, 2d, 3d
      medium: { 1: 14400000, 2: 86400000, 3: 172800000 },    // 4h, 1d, 2d
      high: { 1: 3600000, 2: 14400000, 3: 86400000 },       // 1h, 4h, 1d
      critical: { 1: 900000, 2: 1800000, 3: 3600000 },      // 15m, 30m, 1h
    };

    // Escalation roles
    this.roles = {
      1: 'manager',
      2: 'director',
      3: 'executive',
    };
  }

  /**
   * Start escalation monitoring
   */
  start() {
    console.log('⚡ Escalation engine started');
    this.checkAllEscalations();
    this.interval = setInterval(() => this.checkAllEscalations(), this.checkInterval);
  }

  /**
   * Stop escalation monitoring
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('⚡ Escalation engine stopped');
    }
  }

  /**
   * Check all items for escalation
   */
  async checkAllEscalations() {
    // Check incidents
    const incidents = this.db.getAll('incidents');
    for (const incident of incidents) {
      if (incident.status !== 'resolved') {
        await this.checkIncidentEscalation(incident);
      }
    }

    // Check approvals
    const approvals = this.db.getAll('approvals');
    for (const approval of approvals) {
      if (approval.status === 'pending') {
        await this.checkApprovalEscalation(approval);
      }
    }

    // Check tasks
    const tasks = this.db.getAll('tasks');
    for (const task of tasks) {
      if (task.status !== 'completed') {
        await this.checkTaskEscalation(task);
      }
    }
  }

  /**
   * Check incident escalation
   */
  async checkIncidentEscalation(incident) {
    const age = Date.now() - new Date(incident.reportedAt).getTime();
    const thresholds = this.getThresholds(incident.severity);

    for (const level of [1, 2, 3]) {
      if (age >= thresholds[level] && (!incident.escalationLevel || incident.escalationLevel < level)) {
        await this.escalateIncident(incident, level);
      }
    }
  }

  /**
   * Escalate an incident
   */
  async escalateIncident(incident, level) {
    const role = this.roles[level];
    const escalation = {
      id: this.db.generateId('ESC'),
      entityType: 'incident',
      entityId: incident.id,
      level,
      role,
      timestamp: new Date().toISOString(),
      action: this.getEscalationAction(level),
    };

    // Update incident
    incident.escalationLevel = level;
    incident.escalatedAt = escalation.timestamp;
    incident.escalationHistory = incident.escalationHistory || [];
    incident.escalationHistory.push(escalation);

    this.db.set('incidents', incident.id, incident);

    // Notify appropriate people (placeholder)
    await this.notifyEscalation(incident, level, role);

    console.log(`⚡ Incident ${incident.id} escalated to ${role}`);

    return escalation;
  }

  /**
   * Check approval escalation
   */
  async checkApprovalEscalation(approval) {
    const age = Date.now() - new Date(approval.submittedAt).getTime();
    const thresholds = this.getApprovalThresholds(approval.type);

    for (const level of [1, 2, 3]) {
      if (age >= thresholds[level] && (!approval.escalationLevel || approval.escalationLevel < level)) {
        await this.escalateApproval(approval, level);
      }
    }
  }

  /**
   * Escalate an approval
   */
  async escalateApproval(approval, level) {
    const role = this.roles[level];
    const escalation = {
      id: this.db.generateId('ESC'),
      entityType: 'approval',
      entityId: approval.id,
      level,
      role,
      timestamp: new Date().toISOString(),
    };

    approval.escalationLevel = level;
    approval.escalatedAt = escalation.timestamp;
    approval.escalationHistory = approval.escalationHistory || [];
    approval.escalationHistory.push(escalation);

    this.db.set('approvals', approval.id, approval);

    await this.notifyEscalation(approval, level, role);

    console.log(`⚡ Approval ${approval.id} escalated to ${role}`);

    return escalation;
  }

  /**
   * Check task escalation
   */
  async checkTaskEscalation(task) {
    if (!task.dueDate) return;

    const now = Date.now();
    const dueDate = new Date(task.dueDate).getTime();
    const overdue = now - dueDate;

    // Overdue by more than 1 day
    if (overdue >= 86400000 && task.status !== 'completed') {
      if (!task.overdueEscalation || Date.now() - new Date(task.overdueEscalation).getTime() > 86400000) {
        await this.escalateTask(task);
        task.overdueEscalation = new Date().toISOString();
        this.db.set('tasks', task.id, task);
      }
    }
  }

  /**
   * Escalate a task
   */
  async escalateTask(task) {
    const escalation = {
      id: this.db.generateId('ESC'),
      entityType: 'task',
      entityId: task.id,
      timestamp: new Date().toISOString(),
      reason: 'overdue',
    };

    task.escalationHistory = task.escalationHistory || [];
    task.escalationHistory.push(escalation);

    await this.notifyEscalation(task, 1, 'manager');

    console.log(`⚡ Task ${task.id} overdue escalation`);

    return escalation;
  }

  /**
   * Get thresholds for severity
   */
  getThresholds(severity) {
    return this.defaultThresholds[severity?.toLowerCase()] || this.defaultThresholds.medium;
  }

  /**
   * Get approval thresholds
   */
  getApprovalThresholds(type) {
    // Different thresholds based on approval type
    const multipliers = {
      expense: 2,    // Expenses escalate faster
      purchase: 1.5,  // Purchases escalate medium
      leave: 0.5,    // Leave approvals are slower
      default: 1,
    };

    const mult = multipliers[type?.toLowerCase()] || 1;
    const base = this.defaultThresholds.medium;

    return {
      1: base[1] * mult,
      2: base[2] * mult,
      3: base[3] * mult,
    };
  }

  /**
   * Get escalation action description
   */
  getEscalationAction(level) {
    const actions = {
      1: 'Manager notification',
      2: 'Director escalation',
      3: 'Executive alert',
    };
    return actions[level];
  }

  /**
   * Notify about escalation
   */
  async notifyEscalation(entity, level, role) {
    // Placeholder - integrate with notification service
    const notification = {
      type: 'escalation',
      entityType: entity.entityType || 'unknown',
      entityId: entity.id,
      level,
      role,
      timestamp: new Date().toISOString(),
    };

    // In production: Send to notification service
    console.log(`📧 Notification: ${JSON.stringify(notification)}`);

    return notification;
  }

  /**
   * Get escalation history
   */
  getEscalationHistory(filters = {}) {
    const incidents = this.db.getAll('incidents');
    const approvals = this.db.getAll('approvals');
    const tasks = this.db.getAll('tasks');

    const history = [];

    incidents.forEach(i => {
      if (i.escalationHistory) {
        i.escalationHistory.forEach(e => {
          history.push({ ...e, entityType: 'incident', entityId: i.id, title: i.title });
        });
      }
    });

    approvals.forEach(a => {
      if (a.escalationHistory) {
        a.escalationHistory.forEach(e => {
          history.push({ ...e, entityType: 'approval', entityId: a.id, title: a.type });
        });
      }
    });

    tasks.forEach(t => {
      if (t.escalationHistory) {
        t.escalationHistory.forEach(e => {
          history.push({ ...e, entityType: 'task', entityId: t.id, title: t.title });
        });
      }
    });

    // Sort by timestamp
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return history;
  }

  /**
   * Get items pending escalation
   */
  getPendingEscalations() {
    const incidents = this.db.getAll('incidents').filter(i => i.status !== 'resolved');
    const approvals = this.db.getAll('approvals').filter(a => a.status === 'pending');
    const tasks = this.db.getAll('tasks').filter(t => t.status !== 'completed');

    return {
      incidents: incidents.filter(i => !i.escalationLevel || i.escalationLevel < 3),
      approvals: approvals.filter(a => !a.escalationLevel || a.escalationLevel < 3),
      overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()),
    };
  }
}

// Express routes
function registerEscalationRoutes(app) {
  const engine = new EscalationEngine();

  // Start engine on app start
  app.on('ready', () => engine.start());
  app.on('close', () => engine.stop());

  // Health check
  app.get('/api/escalation/status', (req, res) => {
    const pending = engine.getPendingEscalations();
    res.json({
      engine: 'active',
      pending: {
        incidents: pending.incidents.length,
        approvals: pending.approvals.length,
        overdueTasks: pending.overdueTasks.length,
      },
    });
  });

  // Get pending escalations
  app.get('/api/escalation/pending', (req, res) => {
    const pending = engine.getPendingEscalations();
    res.json(pending);
  });

  // Get escalation history
  app.get('/api/escalation/history', (req, res) => {
    const { entityType, since } = req.query;
    let history = engine.getEscalationHistory();

    if (entityType) {
      history = history.filter(h => h.entityType === entityType);
    }

    if (since) {
      const sinceDate = new Date(since);
      history = history.filter(h => new Date(h.timestamp) >= sinceDate);
    }

    res.json({ history, total: history.length });
  });

  // Manual escalation
  app.post('/api/escalation/escalate/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { level } = req.body;

    let entity;
    switch (type) {
      case 'incident':
        entity = db.get('incidents', id);
        if (entity) await engine.escalateIncident(entity, level || 1);
        break;
      case 'approval':
        entity = db.get('approvals', id);
        if (entity) await engine.escalateApproval(entity, level || 1);
        break;
      case 'task':
        entity = db.get('tasks', id);
        if (entity) await engine.escalateTask(entity);
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json({ success: true, entity });
  });

  // Update thresholds
  app.patch('/api/escalation/thresholds', (req, res) => {
    const { thresholds } = req.body;
    if (thresholds) {
      Object.assign(engine.defaultThresholds, thresholds);
    }
    res.json({ thresholds: engine.defaultThresholds });
  });
}

module.exports = { EscalationEngine, registerEscalationRoutes };
