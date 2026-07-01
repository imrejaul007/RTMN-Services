/**
 * Operations OS - Process Registry Module
 * Central repository for all company processes with full metadata
 */

const { db } = require('../db/database');

class ProcessRegistry {
  constructor() {
    this.db = db;
  }

  /**
   * Create a new process in the registry
   */
  createProcess(data) {
    const id = this.db.generateId('PROC');

    const process = {
      id,
      name: data.name,
      description: data.description || '',
      category: data.category || 'general',
      owner: data.owner || null,
      ownerRole: data.ownerRole || null,
      status: data.status || 'draft', // draft, active, archived
      version: 1,
      inputs: data.inputs || [],
      outputs: data.outputs || [],
      stakeholders: data.stakeholders || [],
      systems: data.systems || [], // ERP, CRM, etc.
      kpis: data.kpis || [],
      risks: data.risks || [],
      compliance: data.compliance || [], // ISO, SOC2, etc.
      relatedProcesses: data.relatedProcesses || [],
      departments: data.departments || [],
      estimatedDuration: data.estimatedDuration || 0, // in minutes
      frequency: data.frequency || 'ad-hoc', // daily, weekly, monthly, quarterly, ad-hoc
      priority: data.priority || 'medium',
      automationLevel: data.automationLevel || 'manual', // manual, partial, full
      steps: data.steps || [],
      versionHistory: [{
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: data.createdBy,
        changes: 'Initial version',
      }],
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.userId,
    };

    this.db.set('processes', id, process);
    return process;
  }

  /**
   * Update a process
   */
  updateProcess(id, updates) {
    const process = this.db.get('processes', id);
    if (!process) return null;

    const oldVersion = process.version;
    const newVersion = oldVersion + 1;

    // Track version history
    const versionEntry = {
      version: newVersion,
      createdAt: new Date().toISOString(),
      createdBy: updates.userId,
      changes: Object.keys(updates).filter(k => k !== 'userId').join(', '),
      previousValues: {},
    };

    Object.keys(updates).forEach(key => {
      if (key !== 'userId' && process[key] !== undefined) {
        versionEntry.previousValues[key] = process[key];
      }
    });

    const updated = {
      ...process,
      ...updates,
      version: newVersion,
      versionHistory: [...(process.versionHistory || []), versionEntry],
      updatedAt: new Date().toISOString(),
    };

    this.db.set('processes', id, updated);
    return updated;
  }

  /**
   * Add step to process
   */
  addStep(processId, stepData) {
    const process = this.db.get('processes', processId);
    if (!process) return null;

    const step = {
      id: this.db.generateId('STEP'),
      processId,
      ...stepData,
      order: process.steps.length + 1,
      type: stepData.type || 'task', // start, task, gateway, approval, automation, end
      createdAt: new Date().toISOString(),
    };

    this.db.set('processSteps', step.id, step);

    // Update process steps
    process.steps.push(step.id);
    this.updateProcess(processId, { steps: process.steps });

    return step;
  }

  /**
   * Get process with full details
   */
  getProcessWithDetails(id) {
    const process = this.db.get('processes', id);
    if (!process) return null;

    // Get steps
    const steps = (process.steps || [])
      .map(stepId => this.db.get('processSteps', stepId))
      .filter(Boolean);

    // Get related processes
    const related = (process.relatedProcesses || [])
      .map(relId => this.db.get('processes', relId))
      .filter(Boolean);

    // Get execution history
    const executions = this.db.getAll('sopExecutions')
      .filter(exec => exec.processId === id)
      .slice(-10); // Last 10 executions

    return {
      ...process,
      steps,
      relatedProcesses: related,
      recentExecutions: executions,
      stats: this.calculateStats(id),
    };
  }

  /**
   * Calculate process statistics
   */
  calculateStats(processId) {
    const executions = this.db.getAll('sopExecutions')
      .filter(exec => exec.processId === processId);

    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }

    const successful = executions.filter(e => e.status === 'completed');
    const durations = executions
      .filter(e => e.duration)
      .map(e => e.duration);

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful.length,
      successRate: Math.round((successful.length / executions.length) * 100),
      avgDuration: durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
    };
  }

  /**
   * Get processes by category
   */
  getByCategory(category) {
    return this.db.query('processes', { category });
  }

  /**
   * Get processes by department
   */
  getByDepartment(department) {
    const all = this.db.getAll('processes');
    return all.filter(p => p.departments?.includes(department));
  }

  /**
   * Search processes
   */
  search(query) {
    const all = this.db.getAll('processes');
    const term = query.toLowerCase();

    return all.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.owner?.toLowerCase().includes(term)
    );
  }

  /**
   * Get process hierarchy
   */
  getHierarchy() {
    const all = this.db.getAll('processes');

    const categories = {};

    all.forEach(process => {
      const cat = process.category || 'uncategorized';
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push({
        id: process.id,
        name: process.name,
        status: process.status,
        version: process.version,
        owner: process.owner,
      });
    });

    return categories;
  }

  /**
   * Archive a process
   */
  archive(id) {
    return this.updateProcess(id, { status: 'archived' });
  }

  /**
   * Clone a process
   */
  clone(id, newName) {
    const original = this.db.get('processes', id);
    if (!original) return null;

    const cloned = this.createProcess({
      ...original,
      id: undefined,
      name: newName || `${original.name} (Copy)`,
      status: 'draft',
      version: 1,
      versionHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return cloned;
  }
}

// Express routes
function registerProcessRegistryRoutes(app) {
  const registry = new ProcessRegistry();

  // Create process
  app.post('/api/processes', (req, res) => {
    const process = registry.createProcess({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(process);
  });

  // Get all processes
  app.get('/api/processes', (req, res) => {
    const { category, department, status, search } = req.query;

    let processes = db.getAll('processes');

    if (category) processes = processes.filter(p => p.category === category);
    if (department) processes = processes.filter(p => p.departments?.includes(department));
    if (status) processes = processes.filter(p => p.status === status);
    if (search) processes = registry.search(search);

    res.json({ processes, total: processes.length });
  });

  // Get process with details
  app.get('/api/processes/:id', (req, res) => {
    const process = registry.getProcessWithDetails(req.params.id);
    if (!process) return res.status(404).json({ error: 'Process not found' });
    res.json(process);
  });

  // Update process
  app.patch('/api/processes/:id', (req, res) => {
    const process = registry.updateProcess(req.params.id, {
      ...req.body,
      userId: req.user?.userId,
    });
    if (!process) return res.status(404).json({ error: 'Process not found' });
    res.json(process);
  });

  // Archive process
  app.post('/api/processes/:id/archive', (req, res) => {
    const process = registry.archive(req.params.id);
    if (!process) return res.status(404).json({ error: 'Process not found' });
    res.json(process);
  });

  // Clone process
  app.post('/api/processes/:id/clone', (req, res) => {
    const { newName } = req.body;
    const process = registry.clone(req.params.id, newName);
    if (!process) return res.status(404).json({ error: 'Process not found' });
    res.status(201).json(process);
  });

  // Add step
  app.post('/api/processes/:id/steps', (req, res) => {
    const step = registry.addStep(req.params.id, req.body);
    if (!step) return res.status(404).json({ error: 'Process not found' });
    res.status(201).json(step);
  });

  // Get hierarchy
  app.get('/api/processes/hierarchy', (req, res) => {
    const hierarchy = registry.getHierarchy();
    res.json(hierarchy);
  });

  // Get by category
  app.get('/api/processes/category/:category', (req, res) => {
    const processes = registry.getByCategory(req.params.category);
    res.json({ processes, total: processes.length });
  });

  // Get by department
  app.get('/api/processes/department/:department', (req, res) => {
    const processes = registry.getByDepartment(req.params.department);
    res.json({ processes, total: processes.length });
  });
}

module.exports = { ProcessRegistry, registerProcessRegistryRoutes };
