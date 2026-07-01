/**
 * Operations OS - Automation Engine
 * Workflow automation, agent orchestration, and RPA
 */

const { db } = require('../db/database');

class AutomationEngine {
  constructor() {
    this.db = db;
  }

  /**
   * Create automation workflow
   */
  createWorkflow(data) {
    const id = this.db.generateId('WF');

    const workflow = {
      id,
      name: data.name,
      description: data.description || '',
      type: data.type || 'automation', // automation, approval, integration
      category: data.category || 'general',
      status: 'draft', // draft, active, paused, inactive
      trigger: data.trigger || {
        type: 'manual', // manual, scheduled, event, webhook
        config: {},
      },
      steps: data.steps || [],
      conditions: data.conditions || [],
      actions: data.actions || [],
      errorHandling: data.errorHandling || {
        onError: 'stop', // stop, skip, retry
        maxRetries: 3,
        retryDelay: 5000,
      },
      schedule: data.schedule || null,
      executions: [],
      metrics: {
        totalRuns: 0,
        successRuns: 0,
        failedRuns: 0,
        avgDuration: 0,
        lastRun: null,
      },
      owner: data.owner || data.userId,
      department: data.department || null,
      tags: data.tags || [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('automations', id, workflow);
    return workflow;
  }

  /**
   * Add step to workflow
   */
  addStep(workflowId, stepData) {
    const workflow = this.db.get('automations', workflowId);
    if (!workflow) return null;

    const step = {
      id: this.db.generateId('STEP'),
      workflowId,
      name: stepData.name,
      description: stepData.description || '',
      type: stepData.type || 'action', // trigger, action, condition, approval, wait, loop, transform, http
      order: workflow.steps.length,
      config: stepData.config || {},
      retry: stepData.retry || { maxAttempts: 1, delay: 0 },
      timeout: stepData.timeout || 30000,
      onSuccess: stepData.onSuccess || 'next',
      onFailure: stepData.onFailure || 'stop',
      createdAt: new Date().toISOString(),
    };

    workflow.steps.push(step);
    this.db.set('automations', workflowId, workflow);

    return step;
  }

  /**
   * Add condition
   */
  addCondition(workflowId, conditionData) {
    const workflow = this.db.get('automations', workflowId);
    if (!workflow) return null;

    const condition = {
      id: this.db.generateId('COND'),
      workflowId,
      name: conditionData.name,
      field: conditionData.field,
      operator: conditionData.operator || 'equals', // equals, not_equals, contains, greater_than, less_than, in, not_in
      value: conditionData.value,
      logic: conditionData.logic || 'and', // and, or
      thenSteps: conditionData.thenSteps || [],
      elseSteps: conditionData.elseSteps || [],
    };

    workflow.conditions.push(condition);
    this.db.set('automations', workflowId, workflow);

    return condition;
  }

  /**
   * Execute workflow
   */
  async execute(workflowId, inputData = {}) {
    const workflow = this.db.get('automations', workflowId);
    if (!workflow) return null;

    const execution = {
      id: this.db.generateId('EXEC'),
      workflowId,
      workflowName: workflow.name,
      status: 'running', // running, completed, failed, cancelled
      input: inputData,
      output: null,
      steps: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      duration: 0,
      error: null,
    };

    try {
      let context = { ...inputData };
      let stepIndex = 0;

      while (stepIndex < workflow.steps.length) {
        const step = workflow.steps[stepIndex];
        const stepResult = await this.executeStep(step, context);

        execution.steps.push({
          stepId: step.id,
          stepName: step.name,
          status: stepResult.success ? 'completed' : 'failed',
          output: stepResult.output,
          duration: stepResult.duration,
        });

        if (!stepResult.success) {
          if (step.onFailure === 'stop') {
            execution.status = 'failed';
            execution.error = stepResult.error;
            break;
          } else if (step.onFailure === 'skip') {
            stepIndex++;
            continue;
          }
        }

        if (stepResult.output) {
          context = { ...context, ...stepResult.output };
        }

        stepIndex++;
      }

      if (execution.status !== 'failed') {
        execution.status = 'completed';
        execution.output = context;
      }

    } catch (err) {
      execution.status = 'failed';
      execution.error = err.message;
    }

    execution.completedAt = new Date().toISOString();
    execution.duration = new Date(execution.completedAt) - new Date(execution.startedAt);

    // Update workflow metrics
    workflow.metrics.totalRuns++;
    if (execution.status === 'completed') {
      workflow.metrics.successRuns++;
    } else {
      workflow.metrics.failedRuns++;
    }
    workflow.metrics.lastRun = execution.startedAt;
    workflow.metrics.avgDuration = (
      (workflow.metrics.avgDuration * (workflow.metrics.totalRuns - 1) + execution.duration) /
      workflow.metrics.totalRuns
    );
    this.db.set('automations', workflowId, workflow);

    // Store execution
    this.db.set('automationExecutions', execution.id, execution);

    return execution;
  }

  /**
   * Execute a single step
   */
  async executeStep(step, context) {
    const startTime = Date.now();
    const result = { success: true, output: {}, duration: 0 };

    try {
      switch (step.type) {
        case 'http':
          result.output = await this.executeHTTP(step.config);
          break;
        case 'transform':
          result.output = this.executeTransform(step.config, context);
          break;
        case 'condition':
          result.success = this.evaluateCondition(step.config, context);
          break;
        case 'wait':
          await this.executeWait(step.config);
          break;
        case 'approval':
          result.output = await this.executeApproval(step.config, context);
          break;
        case 'ai_agent':
          result.output = await this.executeAIAgent(step.config, context);
          break;
        case 'action':
        default:
          result.output = step.config.output || {};
      }
    } catch (err) {
      result.success = false;
      result.error = err.message;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Execute HTTP request
   */
  async executeHTTP(config) {
    const { method, url, headers, body } = config;

    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    return {
      status: response.status,
      data,
      success: response.ok,
    };
  }

  /**
   * Execute data transform
   */
  executeTransform(config, context) {
    const { mapping } = config;
    const output = {};

    if (mapping) {
      Object.entries(mapping).forEach(([key, value]) => {
        // Support simple expressions
        if (typeof value === 'string' && value.startsWith('$')) {
          const path = value.slice(1);
          output[key] = this.getNestedValue(context, path);
        } else {
          output[key] = value;
        }
      });
    }

    return output;
  }

  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Evaluate condition
   */
  evaluateCondition(config, context) {
    const { field, operator, value } = config;
    const fieldValue = this.getNestedValue(context, field);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(value);
      case 'greater_than':
        return fieldValue > value;
      case 'less_than':
        return fieldValue < value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Execute wait
   */
  async executeWait(config) {
    const { duration, unit = 'ms' } = config;
    const ms = unit === 'ms' ? duration : duration * 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute approval
   */
  async executeApproval(config, context) {
    const { approvers, timeout } = config;

    // Create approval request
    const approval = {
      id: this.db.generateId('APR'),
      type: 'workflow_approval',
      status: 'pending',
      approvers,
      timeout,
      context,
      createdAt: new Date().toISOString(),
    };

    // In real implementation, this would send notifications
    return { approvalId: approval.id, status: 'pending' };
  }

  /**
   * Execute AI agent
   */
  async executeAIAgent(config, context) {
    const { agent, prompt, input } = config;

    // Placeholder for AI agent execution
    // In real implementation, this would call AI agent service
    return {
      agent,
      result: `AI agent ${agent} would process: ${prompt}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get workflow metrics
   */
  getMetrics(workflowId) {
    const workflow = this.db.get('automations', workflowId);
    if (!workflow) return null;

    return {
      workflowId,
      workflowName: workflow.name,
      status: workflow.status,
      ...workflow.metrics,
      successRate: workflow.metrics.totalRuns > 0
        ? Math.round(workflow.metrics.successRuns / workflow.metrics.totalRuns * 100)
        : 0,
      recentExecutions: workflow.executions?.slice(-10) || [],
    };
  }

  /**
   * Schedule workflow
   */
  schedule(workflowId, schedule) {
    const workflow = this.db.get('automations', workflowId);
    if (!workflow) return null;

    workflow.schedule = {
      ...schedule,
      nextRun: this.calculateNextRun(schedule),
      lastRun: null,
      status: 'scheduled',
    };

    workflow.status = 'active';
    this.db.set('automations', workflowId, workflow);

    return workflow;
  }

  /**
   * Calculate next run time
   */
  calculateNextRun(schedule) {
    const now = new Date();
    const { frequency, interval, time } = schedule;

    let nextRun = new Date(now);

    switch (frequency) {
      case 'hourly':
        nextRun.setHours(nextRun.getHours() + (interval || 1));
        break;
      case 'daily':
        nextRun.setDate(nextRun.getDate() + (interval || 1));
        if (time) {
          const [hours, minutes] = time.split(':');
          nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7 * (interval || 1));
        if (time) {
          const [hours, minutes] = time.split(':');
          nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + (interval || 1));
        if (time) {
          const [hours, minutes] = time.split(':');
          nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        break;
    }

    return nextRun.toISOString();
  }

  /**
   * Get automation dashboard
   */
  getDashboard() {
    const automations = this.db.getAll('automations');

    const summary = {
      total: automations.length,
      active: automations.filter(a => a.status === 'active').length,
      paused: automations.filter(a => a.status === 'paused').length,
      totalExecutions: 0,
      totalSuccess: 0,
      totalFailed: 0,
      avgSuccessRate: 0,
    };

    let totalRuns = 0;
    let totalSuccess = 0;

    automations.forEach(a => {
      totalRuns += a.metrics.totalRuns;
      totalSuccess += a.metrics.successRuns;
    });

    summary.totalExecutions = totalRuns;
    summary.totalSuccess = totalSuccess;
    summary.totalFailed = totalRuns - totalSuccess;
    summary.avgSuccessRate = totalRuns > 0
      ? Math.round(totalSuccess / totalRuns * 100)
      : 0;

    return {
      summary,
      topByRuns: automations
        .sort((a, b) => b.metrics.totalRuns - a.metrics.totalRuns)
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          name: a.name,
          runs: a.metrics.totalRuns,
          successRate: a.metrics.totalRuns > 0
            ? Math.round(a.metrics.successRuns / a.metrics.totalRuns * 100)
            : 0,
        })),
      recentFailures: this.db.getAll('automationExecutions')
        .filter(e => e.status === 'failed')
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
        .slice(0, 5),
    };
  }
}

// Express routes
function registerAutomationRoutes(app) {
  const automation = new AutomationEngine();

  // ============ WORKFLOWS ============

  // Create workflow
  app.post('/api/automation/workflows', (req, res) => {
    const workflow = automation.createWorkflow({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(workflow);
  });

  // Get all workflows
  app.get('/api/automation/workflows', (req, res) => {
    const { status, type, category } = req.query;
    let workflows = db.getAll('automations');

    if (status) workflows = workflows.filter(w => w.status === status);
    if (type) workflows = workflows.filter(w => w.type === type);
    if (category) workflows = workflows.filter(w => w.category === category);

    res.json({ workflows, total: workflows.length });
  });

  // Get workflow
  app.get('/api/automation/workflows/:id', (req, res) => {
    const workflow = db.get('automations', req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  });

  // Update workflow
  app.patch('/api/automation/workflows/:id', (req, res) => {
    const existing = db.get('automations', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });

    const updated = {
      ...existing,
      ...req.body,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    db.set('automations', req.params.id, updated);
    res.json(updated);
  });

  // Add step
  app.post('/api/automation/workflows/:id/steps', (req, res) => {
    const step = automation.addStep(req.params.id, req.body);
    if (!step) return res.status(404).json({ error: 'Workflow not found' });
    res.status(201).json(step);
  });

  // Add condition
  app.post('/api/automation/workflows/:id/conditions', (req, res) => {
    const condition = automation.addCondition(req.params.id, req.body);
    if (!condition) return res.status(404).json({ error: 'Workflow not found' });
    res.status(201).json(condition);
  });

  // Execute workflow
  app.post('/api/automation/workflows/:id/execute', async (req, res) => {
    const execution = await automation.execute(req.params.id, req.body);
    if (!execution) return res.status(404).json({ error: 'Workflow not found' });
    res.json(execution);
  });

  // Get execution
  app.get('/api/automation/executions/:id', (req, res) => {
    const execution = db.get('automationExecutions', req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    res.json(execution);
  });

  // Get workflow executions
  app.get('/api/automation/workflows/:id/executions', (req, res) => {
    const executions = db.getAll('automationExecutions')
      .filter(e => e.workflowId === req.params.id)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, 50);
    res.json({ executions, total: executions.length });
  });

  // Schedule workflow
  app.post('/api/automation/workflows/:id/schedule', (req, res) => {
    const workflow = automation.schedule(req.params.id, req.body);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  });

  // Pause workflow
  app.post('/api/automation/workflows/:id/pause', (req, res) => {
    const workflow = db.get('automations', req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    workflow.status = 'paused';
    if (workflow.schedule) {
      workflow.schedule.status = 'paused';
    }
    db.set('automations', req.params.id, workflow);
    res.json(workflow);
  });

  // Resume workflow
  app.post('/api/automation/workflows/:id/resume', (req, res) => {
    const workflow = db.get('automations', req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    workflow.status = 'active';
    if (workflow.schedule) {
      workflow.schedule.status = 'scheduled';
    }
    db.set('automations', req.params.id, workflow);
    res.json(workflow);
  });

  // Get metrics
  app.get('/api/automation/workflows/:id/metrics', (req, res) => {
    const metrics = automation.getMetrics(req.params.id);
    if (!metrics) return res.status(404).json({ error: 'Workflow not found' });
    res.json(metrics);
  });

  // Get dashboard
  app.get('/api/automation/dashboard', (req, res) => {
    const dashboard = automation.getDashboard();
    res.json(dashboard);
  });

  // Delete workflow
  app.delete('/api/automation/workflows/:id', (req, res) => {
    const workflow = db.get('automations', req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    workflow.status = 'inactive';
    db.set('automations', req.params.id, workflow);
    res.json({ success: true });
  });
}

module.exports = { AutomationEngine, registerAutomationRoutes };
