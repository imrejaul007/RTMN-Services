/**
 * RTMN Operations OS - Process Learning Module
 *
 * Implements: Observe → Learn → Automate
 *
 * This makes Operations OS smarter than competitors like Flowscope:
 * - Observe: Watch employee actions
 * - Learn: Build process patterns
 * - Automate: Create AI agents to execute
 * - Remember: Store in MemoryOS
 * - Twin: Create Process Digital Twin
 */

class ProcessLearning {
  constructor(db) {
    this.db = db;
    this.observations = new Map();
    this.patterns = new Map();
    this.learnedProcesses = new Map();
    this.automations = new Map();
  }

  // ============================================================
  // OBSERVE - Watch employee actions
  // ============================================================

  observe(action) {
    const observation = {
      id: `OBS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: action.userId || 'system',
      action: action.type,
      entity: action.entity,
      entityId: action.entityId,
      step: action.step,
      duration: action.duration || 0,
      outcome: action.outcome || 'unknown',
      context: action.context || {},
      metadata: action.metadata || {},
    };

    // Store observation
    this.observations.set(observation.id, observation);

    // Update entity observation count
    const entityKey = `${action.entity}-${action.entityId}`;
    const entityObs = this.db.entityObservations?.get(entityKey) || { count: 0, actions: [] };
    entityObs.count++;
    entityObs.actions.push(action.type);
    this.db.entityObservations = this.db.entityObservations || new Map();
    this.db.entityObservations.set(entityKey, entityObs);

    return observation;
  }

  // ============================================================
  // LEARN - Build process patterns from observations
  // ============================================================

  learn(processId, minObservations = 5) {
    const observations = Array.from(this.observations.values())
      .filter(o => o.entity === processId || o.entityId === processId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (observations.length < minObservations) {
      return {
        status: 'insufficient_data',
        message: `Need ${minObservations - observations.length} more observations`,
        observations: observations.length,
      };
    }

    // Analyze pattern
    const pattern = this.analyzePattern(observations);

    // Create learned process
    const learnedProcess = {
      id: `LEARNED-${processId}`,
      sourceId: processId,
      observations: observations.length,
      pattern,
      steps: this.extractSteps(observations),
      avgDuration: this.calculateAvgDuration(observations),
      successRate: this.calculateSuccessRate(observations),
      commonPathways: this.findCommonPathways(observations),
      anomalies: this.detectAnomalies(observations),
      confidence: Math.min(0.95, 0.5 + (observations.length * 0.05)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.learnedProcesses.set(processId, learnedProcess);
    this.patterns.set(processId, pattern);

    return {
      status: 'learned',
      process: learnedProcess,
    };
  }

  analyzePattern(observations) {
    const actions = observations.map(o => o.action);
    const steps = observations.map(o => o.step).filter(Boolean);
    const outcomes = observations.map(o => o.outcome);

    // Count action frequencies
    const actionFreq = {};
    actions.forEach(a => { actionFreq[a] = (actionFreq[a] || 0) + 1; });

    // Identify common sequence
    const sequence = [];
    let currentStep = null;
    observations.forEach(o => {
      if (o.step && o.step !== currentStep) {
        sequence.push({ step: o.step, action: o.action });
        currentStep = o.step;
      }
    });

    return {
      actionFrequency: actionFreq,
      sequence,
      totalObservations: observations.length,
      dateRange: {
        start: observations[0]?.timestamp,
        end: observations[observations.length - 1]?.timestamp,
      },
    };
  }

  extractSteps(observations) {
    const steps = [];
    const stepMap = new Map();

    observations.forEach(o => {
      if (o.step) {
        if (!stepMap.has(o.step)) {
          stepMap.set(o.step, {
            name: o.step,
            occurrences: 0,
            avgDuration: 0,
            totalDuration: 0,
            outcomes: [],
          });
        }
        const step = stepMap.get(o.step);
        step.occurrences++;
        step.totalDuration += o.duration || 0;
        step.outcomes.push(o.outcome);
      }
    });

    stepMap.forEach((step, name) => {
      step.avgDuration = step.totalDuration / step.occurrences;
      step.successRate = step.outcomes.filter(o => o === 'success').length / step.outcomes.length;
      steps.push(step);
    });

    return steps;
  }

  calculateAvgDuration(observations) {
    const durations = observations.filter(o => o.duration > 0).map(o => o.duration);
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  calculateSuccessRate(observations) {
    const outcomes = observations.map(o => o.outcome);
    const success = outcomes.filter(o => o === 'success').length;
    return success / outcomes.length;
  }

  findCommonPathways(observations) {
    const pathways = [];
    let currentPath = [];

    observations.forEach(o => {
      currentPath.push(o.action);
      if (o.outcome === 'success' || o.outcome === 'complete') {
        pathways.push([...currentPath]);
        currentPath = [];
      }
    });

    // Find most common pathway
    const pathwayFreq = {};
    pathways.forEach(p => {
      const key = p.join(' → ');
      pathwayFreq[key] = (pathwayFreq[key] || 0) + 1;
    });

    return Object.entries(pathwayFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pathway, count]) => ({ pathway, count }));
  }

  detectAnomalies(observations) {
    const anomalies = [];
    const durations = observations.map(o => o.duration).filter(d => d > 0);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const stdDev = Math.sqrt(durations.reduce((s, d) => s + Math.pow(d - avg, 2), 0) / durations.length);

    observations.forEach(o => {
      if (o.duration > avg + (2 * stdDev)) {
        anomalies.push({
          type: 'slow',
          observationId: o.id,
          duration: o.duration,
          expected: avg,
          deviation: `${((o.duration - avg) / avg * 100).toFixed(0)}%`,
        });
      }
    });

    return anomalies;
  }

  // ============================================================
  // AUTOMATE - Create automation from learned process
  // ============================================================

  automate(processId, config = {}) {
    const learnedProcess = this.learnedProcesses.get(processId);
    if (!learnedProcess) {
      return { error: 'Process not yet learned. Run learn() first.' };
    }

    const automation = {
      id: `AUTO-${processId}-${Date.now()}`,
      sourceProcess: processId,
      status: 'active',
      createdAt: new Date().toISOString(),
      config: {
        trigger: config.trigger || 'manual',
        schedule: config.schedule || null,
        conditions: config.conditions || [],
        actions: config.actions || this.generateActions(learnedProcess),
        onSuccess: config.onSuccess || 'log',
        onFailure: config.onFailure || 'alert',
      },
      stats: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        avgDuration: 0,
      },
      ml: {
        confidence: learnedProcess.confidence,
        predictions: [],
      },
    };

    this.automations.set(automation.id, automation);

    return {
      status: 'automated',
      automation,
      recommendations: this.getAutomationRecommendations(learnedProcess),
    };
  }

  generateActions(learnedProcess) {
    const actions = [];
    learnedProcess.steps.forEach((step, i) => {
      actions.push({
        order: i + 1,
        name: step.name,
        type: 'process_step',
        retry: 3,
        timeout: step.avgDuration * 1.5,
        conditions: [],
      });
    });
    return actions;
  }

  getAutomationRecommendations(learnedProcess) {
    const recommendations = [];

    // High variance steps
    learnedProcess.steps.forEach(step => {
      if (step.avgDuration > 300000) { // > 5 min
        recommendations.push({
          type: 'optimize',
          step: step.name,
          message: `Consider automating "${step.name}" - takes ${(step.avgDuration / 60000).toFixed(0)} min on average`,
        });
      }
    });

    // Low success rate steps
    learnedProcess.steps.forEach(step => {
      if (step.successRate < 0.8) {
        recommendations.push({
          type: 'improve',
          step: step.name,
          message: `"${step.name}" has ${((1 - step.successRate) * 100).toFixed(0)}% failure rate - needs review`,
        });
      }
    });

    // Automation candidates
    if (learnedProcess.confidence > 0.8) {
      recommendations.push({
        type: 'candidate',
        message: `Process is ${(learnedProcess.confidence * 100).toFixed(0)}% learned - ready for full automation`,
      });
    }

    return recommendations;
  }

  // ============================================================
  // EXECUTE - Run automation
  // ============================================================

  execute(automationId, context = {}) {
    const automation = this.automations.get(automationId);
    if (!automation) {
      return { error: 'Automation not found' };
    }

    const execution = {
      id: `EXEC-${Date.now()}`,
      automationId,
      status: 'running',
      startedAt: new Date().toISOString(),
      context,
      steps: automation.config.actions.map(a => ({
        name: a.name,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        error: null,
      })),
    };

    // Execute steps
    let currentStep = 0;
    const executeStep = () => {
      if (currentStep >= execution.steps.length) {
        execution.status = 'completed';
        execution.completedAt = new Date().toISOString();
        automation.stats.totalRuns++;
        automation.stats.successfulRuns++;
        return execution;
      }

      const step = execution.steps[currentStep];
      step.status = 'running';
      step.startedAt = new Date().toISOString();

      // Simulate step execution
      setTimeout(() => {
        step.status = 'success';
        step.completedAt = new Date().toISOString();
        currentStep++;
        executeStep();
      }, 100);
    };

    executeStep();
    return execution;
  }

  // ============================================================
  // CONTINUOUS LEARNING - Update patterns over time
  // ============================================================

  updateLearning(processId) {
    const learnedProcess = this.learnedProcesses.get(processId);
    if (!learnedProcess) return { error: 'Process not learned yet' };

    // Re-analyze with new data
    const result = this.learn(processId, 1);
    if (result.status === 'learned') {
      const updatedProcess = result.process;
      updatedProcess.id = learnedProcess.id;
      updatedProcess.createdAt = learnedProcess.createdAt;
      updatedProcess.updatedAt = new Date().toISOString();
      updatedProcess.version = (learnedProcess.version || 1) + 1;

      // Update confidence based on consistency
      updatedProcess.confidence = Math.min(0.98, updatedProcess.confidence + 0.01);

      this.learnedProcesses.set(processId, updatedProcess);

      return {
        status: 'updated',
        process: updatedProcess,
        improvements: this.suggestImprovements(updatedProcess),
      };
    }

    return result;
  }

  suggestImprovements(process) {
    const improvements = [];

    // Check for repetitive manual steps
    process.steps.forEach(step => {
      if (step.avgDuration > 600000 && step.successRate > 0.95) { // > 10 min, high success
        improvements.push({
          type: 'automation_candidate',
          step: step.name,
          reason: 'Repetitive high-duration task',
          estimatedSavings: `${(step.avgDuration / 60000 * 5).toFixed(0)} min per execution`,
        });
      }
    });

    // Check for bottleneck steps
    const avgDuration = process.avgDuration;
    process.steps.forEach(step => {
      if (step.avgDuration > avgDuration * 2) {
        improvements.push({
          type: 'bottleneck',
          step: step.name,
          reason: 'Takes longer than average',
          suggestion: 'Consider parallel processing or automation',
        });
      }
    });

    return improvements;
  }

  // ============================================================
  // PUBLIC METHODS
  // ============================================================

  getObservations(processId) {
    return Array.from(this.observations.values())
      .filter(o => o.entity === processId || o.entityId === processId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getLearnedProcesses() {
    return Array.from(this.learnedProcesses.values());
  }

  getAutomations() {
    return Array.from(this.automations.values()).map(a => ({
      id: a.id,
      sourceProcess: a.sourceProcess,
      status: a.status,
      stats: a.stats,
    }));
  }

  getProcessInsights(processId) {
    const learned = this.learnedProcesses.get(processId);
    const automations = Array.from(this.automations.values())
      .filter(a => a.sourceProcess === processId);

    return {
      processId,
      learned: learned ? true : false,
      confidence: learned?.confidence || 0,
      observations: this.observations.size,
      automations: automations.length,
      insights: learned ? this.suggestImprovements(learned) : [],
    };
  }
}

// ============================================================
// EXPRESS ROUTES
// ============================================================

function registerProcessLearningRoutes(app, db) {
  const learning = new ProcessLearning(db);

  // Observe action
  app.post('/api/learning/observe', (req, res) => {
    const observation = learning.observe(req.body);
    res.status(201).json(observation);
  });

  // Batch observe
  app.post('/api/learning/observe/batch', (req, res) => {
    const { actions } = req.body;
    const observations = actions.map(a => learning.observe(a));
    res.status(201).json({ observations, count: observations.length });
  });

  // Learn process
  app.post('/api/learning/learn/:processId', (req, res) => {
    const result = learning.learn(req.params.processId, req.body.minObservations || 5);
    res.json(result);
  });

  // Get learned processes
  app.get('/api/learning/processes', (req, res) => {
    const processes = learning.getLearnedProcesses();
    res.json({ processes, total: processes.length });
  });

  // Get process insights
  app.get('/api/learning/insights/:processId', (req, res) => {
    const insights = learning.getProcessInsights(req.params.processId);
    res.json(insights);
  });

  // Automate process
  app.post('/api/learning/automate/:processId', (req, res) => {
    const result = learning.automate(req.params.processId, req.body);
    res.json(result);
  });

  // Get automations
  app.get('/api/learning/automations', (req, res) => {
    const automations = learning.getAutomations();
    res.json({ automations, total: automations.length });
  });

  // Execute automation
  app.post('/api/learning/execute/:automationId', (req, res) => {
    const result = learning.execute(req.params.automationId, req.body.context);
    res.json(result);
  });

  // Update learning
  app.post('/api/learning/update/:processId', (req, res) => {
    const result = learning.updateLearning(req.params.processId);
    res.json(result);
  });

  // Get observations
  app.get('/api/learning/observations/:processId', (req, res) => {
    const observations = learning.getObservations(req.params.processId);
    res.json({ observations, total: observations.length });
  });

  // Dashboard
  app.get('/api/learning/dashboard', (req, res) => {
    const processes = learning.getLearnedProcesses();
    const automations = learning.getAutomations();

    res.json({
      totalObservations: Array.from(learning.observations.values()).length,
      learnedProcesses: processes.length,
      activeAutomations: automations.filter(a => a.status === 'active').length,
      avgConfidence: processes.length > 0
        ? processes.reduce((s, p) => s + p.confidence, 0) / processes.length
        : 0,
      processes: processes.map(p => ({
        id: p.id,
        confidence: p.confidence,
        observations: p.observations,
        steps: p.steps.length,
      })),
    });
  });

  return learning;
}

module.exports = { ProcessLearning, registerProcessLearningRoutes };
