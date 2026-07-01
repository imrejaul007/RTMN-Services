# OperationsOS Phase-Wise Build Plan

**Date:** July 2, 2026  
**Total Duration:** 20 weeks (5 months)  
**Goal:** Fill all gaps and make OperationsOS match the spec

---

## Phase 0: Production Hardening (2 weeks)

**Goal:** Make the existing code production-ready

### 0.1 Database Layer (1 week)

```javascript
// Add PostgreSQL persistence
// File: src/db/postgres.js

const { Pool } = require('pg');

class OpsDatabase {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async query(text, params) {
    const start = Date.now();
    const res = await this.pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text, duration, rows: res.rowCount });
    return res;
  }
}

// Tables to create:
// - projects, tasks, subtasks, dependencies
// - processes, sop_executions, sop_versions
// - approvals, approval_chains
// - incidents, incident_updates
// - risks, risk_mitigations
// - resources, bookings
// - quality_audits, capas
// - changes, change_approvals
// - knowledge_articles
// - plans, plan_objectives
// - deliveries, milestones
// - employees, departments
```

### 0.2 TwinOS Sync (1 week)

```javascript
// File: src/integrations/twinos-sync.js

class TwinOSSync {
  constructor() {
    this.twinosUrl = process.env.TWINOS_URL || 'http://localhost:4705';
  }

  async syncTwin(twin) {
    // Sync to central TwinOS
    await fetch(`${this.twinosUrl}/api/twins`, {
      method: 'POST',
      body: JSON.stringify(twin),
    });
  }

  async syncAllTwins() {
    // Sync Process Twin
    await this.syncTwin(this.twins.get('TWIN-PROCESS'));
    // Sync Project Twin
    await this.syncTwin(this.twins.get('TWIN-PROJECT'));
    // ... etc
  }
}
```

### 0.3 MemoryOS Integration (1 week)

```javascript
// File: src/integrations/memoryos.js

class MemoryOSIntegration {
  async storeLearning(processId, learning) {
    await fetch(`${this.memoryUrl}/api/memories`, {
      method: 'POST',
      body: {
        entityId: processId,
        type: 'process_learning',
        data: learning,
      }
    });
  }
}
```

### 0.4 Test Coverage (1 week)

```bash
# Add vitest tests for:
# - Process learning (observe, learn, automate)
# - Twin sync
# - AI agent methods
# - CRUD operations
```

**Deliverables:**
- PostgreSQL tables + connection pool
- TwinOS sync to central TwinOS (4705)
- MemoryOS integration
- 50+ unit tests

---

## Phase 1: WorkOS Completion (4 weeks)

**Goal:** Full task/project management with dependencies

### 1.1 Task Dependencies

```javascript
// File: src/modules/taskDependencies.js

app.post('/api/tasks/:id/dependencies', (req, res) => {
  const { dependsOn, type } = req.body;
  // types: blocks, blocked_by, related_to
  // Implement topological sort for Gantt
});

app.get('/api/tasks/dependencies', (req, res) => {
  // Return dependency graph for Gantt view
});

app.get('/api/tasks/:id/critical-path', (req, res) => {
  // Calculate critical path using CPM
});
```

### 1.2 Subtasks

```javascript
// File: src/modules/subtasks.js

app.post('/api/tasks/:id/subtasks', (req, res) => {
  const { title, assignee, dueDate } = req.body;
  // Create subtask linked to parent
});

app.get('/api/tasks/:id/subtasks', (req, res) => {
  const subtasks = Array.from(db.subtasks.values())
    .filter(s => s.parentTaskId === req.params.id);
  res.json({ subtasks });
});
```

### 1.3 Gantt & Kanban Views

```javascript
// File: src/modules/views.js

app.get('/api/views/gantt', (req, res) => {
  // Return tasks with start/end dates for Gantt
  const tasks = Array.from(db.tasks.values()).map(t => ({
    id: t.id,
    title: t.title,
    start: t.startDate || t.dueDate - 7 days,
    end: t.dueDate,
    progress: t.progress || 0,
    dependencies: getDependencies(t.id),
    assignee: t.assignee,
  }));
  res.json({ gantt: tasks });
});

app.get('/api/views/kanban', (req, res) => {
  // Return tasks grouped by status
  const columns = ['backlog', 'todo', 'in_progress', 'review', 'done'];
  const board = {};
  columns.forEach(col => {
    board[col] = Array.from(db.tasks.values())
      .filter(t => t.status === col);
  });
  res.json({ board });
});
```

### 1.4 Sprint Planning

```javascript
// File: src/modules/sprints.js

const sprints = new Map();

app.post('/api/sprints', (req, res) => {
  const { name, startDate, endDate, goals } = req.body;
  const sprint = {
    id: `SPRINT${Date.now()}`,
    name, startDate, endDate, goals,
    tasks: [],
    velocity: 0,
    status: 'planning',
  };
  sprints.set(sprint.id, sprint);
  res.json(sprint);
});

app.post('/api/sprints/:id/tasks', (req, res) => {
  // Add task to sprint
});
```

### 1.5 OKR System

```javascript
// File: src/modules/okr.js

const okrs = new Map();

app.post('/api/okrs', (req, res) => {
  const { objective, keyResults, department, quarter } = req.body;
  const okr = {
    id: `OKR${Date.now()}`,
    objective,
    keyResults: keyResults.map(kr => ({
      ...kr,
      current: 0,
      status: 'in_progress',
    })),
    department,
    quarter,
    owner: req.user.userId,
  };
  okrs.set(okr.id, okr);
  res.json(okr);
});

app.patch('/api/okrs/:id/kr/:krId', (req, res) => {
  // Update key result progress
});
```

**Deliverables:**
- Task dependencies with topological sort
- Subtask hierarchy
- Gantt chart endpoint
- Kanban board endpoint
- Sprint planning
- OKR tracking

---

## Phase 2: ProcessOS Enhancement (4 weeks)

**Goal:** BPMN designer, process mining, Kaizen

### 2.1 Process Registry

```javascript
// File: src/modules/processRegistry.js

app.post('/api/processes', (req, res) => {
  const { name, category, owner, inputs, outputs, kpis, risks, systems } = req.body;
  const process = {
    id: `PROC${Date.now()}`,
    name, category, owner,
    inputs, outputs,
    kpis: kpis || [],
    risks: risks || [],
    systems: systems || [],
    version: 1,
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
  db.processes.set(process.id, process);
  res.json(process);
});

app.get('/api/processes/:id', (req, res) => {
  // Return full process with all metadata
});
```

### 2.2 BPMN Designer (Simplified)

```javascript
// File: src/modules/bpmn.js

app.post('/api/processes/:id/steps', (req, res) => {
  const { name, type, nextSteps, conditions, assignee, sla } = req.body;
  // types: start, task, gateway, approval, automation, end
  // Store BPMN-like flow
});

app.get('/api/processes/:id/flow', (req, res) => {
  // Return process flow for visualization
  const steps = db.processSteps.filter(s => s.processId === req.params.id);
  res.json({ flow: buildFlow(steps) });
});
```

### 2.3 Process Mining

```javascript
// File: src/modules/processMining.js

class ProcessMining {
  analyzeLogs(processId) {
    const logs = this.getLogs(processId);
    
    // Calculate cycle time
    const cycleTimes = logs.map(log => 
      new Date(log.completedAt) - new Date(log.startedAt)
    );
    
    // Find bottlenecks
    const bottlenecks = this.detectBottlenecks(logs);
    
    // Calculate rework rate
    const rework = this.calculateRework(logs);
    
    return {
      avgCycleTime: avg(cycleTimes),
      medianCycleTime: median(cycleTimes),
      bottlenecks,
      reworkRate: rework,
      compliance: this.calculateCompliance(logs),
    };
  }
}
```

### 2.4 Kaizen Engine

```javascript
// File: src/modules/kaizen.js

app.post('/api/processes/:id/kaizen', (req, res) => {
  // Analyze process and suggest improvements
  const analysis = processMining.analyzeLogs(req.params.id);
  const suggestions = [];
  
  if (analysis.cycleTime > threshold) {
    suggestions.push({
      type: 'speed',
      message: 'Consider parallel processing for steps A and B',
      estimatedSavings: '2 hours',
    });
  }
  
  res.json({ suggestions });
});
```

**Deliverables:**
- Process registry with full metadata
- BPMN-like step definitions
- Process mining (cycle time, bottlenecks, rework)
- Kaizen improvement suggestions

---

## Phase 3: ExecutionOS Enhancement (4 weeks)

**Goal:** Command center, escalations, SLA tracking

### 3.1 Real-Time Command Center

```javascript
// File: src/modules/commandCenter.js

app.get('/api/command-center/live', (req, res) => {
  // SSE endpoint for real-time updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  const sendUpdate = () => {
    const health = calculateHealth(db);
    res.write(`data: ${JSON.stringify(health)}\n\n`);
  };
  
  // Send updates every 30 seconds
  const interval = setInterval(sendUpdate, 30000);
  
  req.on('close', () => clearInterval(interval));
});
```

### 3.2 Escalation Engine

```javascript
// File: src/modules/escalation.js

class EscalationEngine {
  checkEscalations() {
    const overdueItems = this.getOverdueItems();
    
    overdueItems.forEach(item => {
      const age = Date.now() - new Date(item.createdAt);
      const thresholds = [3600000, 86400000, 172800000]; // 1h, 24h, 48h
      
      if (age > thresholds[0] && item.escalationLevel < 1) {
        this.escalate(item, 1, 'manager');
      }
      if (age > thresholds[1] && item.escalationLevel < 2) {
        this.escalate(item, 2, 'director');
      }
      if (age > thresholds[2] && item.escalationLevel < 3) {
        this.escalate(item, 3, 'executive');
      }
    });
  }
  
  escalate(item, level, role) {
    // Send notification, update item
  }
}
```

### 3.3 SLA Management

```javascript
// File: src/modules/sla.js

app.post('/api/slas', (req, res) => {
  const { name, type, responseTime, resolutionTime, conditions } = req.body;
  const sla = {
    id: `SLA${Date.now()}`,
    name, type,
    responseTime, // milliseconds
    resolutionTime,
    conditions,
  };
  db.slas.set(sla.id, sla);
  res.json(sla);
});

app.get('/api/slas/breaches', (req, res) => {
  // Find items violating SLAs
  const breaches = this.calculateBreaches();
  res.json({ breaches });
});
```

### 3.4 Runbook Execution

```javascript
// File: src/modules/runbooks.js

app.post('/api/runbooks/:id/execute', async (req, res) => {
  const runbook = db.runbooks.get(req.params.id);
  const execution = {
    id: `EXEC-${Date.now()}`,
    runbookId: runbook.id,
    status: 'running',
    startedAt: new Date().toISOString(),
    steps: [],
  };
  
  for (const step of runbook.steps) {
    const result = await this.executeStep(step);
    execution.steps.push(result);
    if (!result.success) {
      execution.status = 'failed';
      break;
    }
  }
  
  res.json(execution);
});
```

**Deliverables:**
- Real-time SSE command center
- Automatic escalation engine
- SLA timers and breach tracking
- Runbook execution engine

---

## Phase 4: PlanningOS Enhancement (4 weeks)

**Goal:** Forecasting, scenario planning, what-if

### 4.1 Demand Forecasting

```javascript
// File: src/modules/demandForecast.js

class DemandForecast {
  async forecast(demandType, periods = 12) {
    const historicalData = await this.getHistoricalData(demandType);
    
    // Simple moving average + trend
    const forecast = this.calculateForecast(historicalData, periods);
    
    return {
      forecast: forecast.values,
      confidence: forecast.confidence,
      seasonality: this.detectSeasonality(historicalData),
    };
  }
}
```

### 4.2 Scenario Planning

```javascript
// File: src/modules/scenarioPlanning.js

app.post('/api/scenarios', (req, res) => {
  const { name, type, assumptions, variables } = req.body;
  const scenario = {
    id: `SCEN${Date.now()}`,
    name, type, assumptions, variables,
    results: this.runScenario(assumptions),
  };
  db.scenarios.set(scenario.id, scenario);
  res.json(scenario);
});

app.post('/api/scenarios/compare', (req, res) => {
  const { scenarioIds } = req.body;
  const comparisons = scenarioIds.map(id => db.scenarios.get(id));
  res.json({ comparisons });
});
```

### 4.3 What-If Engine

```javascript
// File: src/modules/whatIf.js

app.post('/api/whatif', (req, res) => {
  const { change, scope } = req.body;
  
  // Clone current state
  const hypothetical = cloneState(scope);
  
  // Apply change
  hypothetical = applyChange(hypothetical, change);
  
  // Calculate impact
  const impact = calculateImpact(hypothetical);
  
  res.json({
    original: getCurrentState(scope),
    hypothetical: impact,
    delta: calculateDelta(impact),
  });
});
```

### 4.4 Capacity Simulation

```javascript
// File: src/modules/capacitySimulation.js

app.post('/api/capacity/simulate', (req, res) => {
  const { resources, demand, constraints } = req.body;
  
  // Run simulation with Monte Carlo
  const results = this.monteCarloSimulation(resources, demand, constraints);
  
  res.json({
    results,
    probabilityOfSuccess: results.success / results.iterations,
    recommendations: generateRecommendations(results),
  });
});
```

**Deliverables:**
- Demand forecasting
- Scenario planning with comparison
- What-if analysis engine
- Capacity simulation (Monte Carlo)

---

## Phase 5: AnalyticsOS + AI (4 weeks)

**Goal:** Full analytics, LLM integration for AI agents

### 5.1 KPI Registry

```javascript
// File: src/modules/kpiRegistry.js

app.post('/api/kpis', (req, res) => {
  const { name, category, formula, target, owner, frequency } = req.body;
  const kpi = {
    id: `KPI${Date.now()}`,
    name, category, formula, target, owner, frequency,
    current: null,
    history: [],
  };
  db.kpis.set(kpi.id, kpi);
  res.json(kpi);
});

app.get('/api/kpis/dashboard', (req, res) => {
  const kpis = Array.from(db.kpis.values());
  const values = kpis.map(kpi => ({
    ...kpi,
    current: calculateKPI(kpi),
  }));
  res.json({ kpis: values });
});
```

### 5.2 Root Cause Analysis

```javascript
// File: src/modules/rootCause.js

class RootCauseAnalyzer {
  async analyze(effect) {
    // Use 5 Whys methodology
    let cause = effect;
    const chain = [cause];
    
    for (let i = 0; i < 5; i++) {
      const nextCause = await this.findRootCause(cause);
      if (!nextCause || nextCause === cause) break;
      chain.push(nextCause);
      cause = nextCause;
    }
    
    return {
      chain,
      rootCause: chain[chain.length - 1],
      recommendations: await this.generateFixes(chain),
    };
  }
}
```

### 5.3 LLM Integration for AI Agents

```javascript
// File: src/ai/llmClient.js

class LLMClient {
  constructor() {
    this.openai = new OpenAI(process.env.OPENAI_API_KEY);
  }
  
  async complete(prompt, system) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });
    return response.choices[0].message.content;
  }
}

// File: src/ai/operationsAgents.js - Update AI Planner

async createPlan(data) {
  const prompt = `Create a detailed plan for: ${data.objective}`;
  const plan = await llm.complete(prompt, PLAN_SYSTEM_PROMPT);
  return JSON.parse(plan);
}
```

### 5.4 Prediction Models

```javascript
// File: src/modules/predictions.js

class PredictionEngine {
  predictAttrition(employees) {
    // Simple prediction based on factors
    return employees.map(emp => ({
      employeeId: emp.id,
      riskScore: calculateRiskScore(emp),
      factors: identifyFactors(emp),
      recommendations: generateRecommendations(emp),
    }));
  }
  
  predictProjectOutcome(project) {
    const velocity = getTeamVelocity(project.team);
    const remaining = 100 - project.progress;
    const daysRemaining = daysBetween(project.endDate, new Date());
    const requiredVelocity = remaining / daysRemaining;
    
    return {
      onTrack: velocity >= requiredVelocity,
      confidence: calculateConfidence(project),
      riskFactors: identifyRisks(project),
    };
  }
}
```

**Deliverables:**
- KPI registry with target tracking
- Root cause analysis (5 Whys)
- LLM integration for AI agents
- Prediction models (attrition, project outcome)

---

## Phase 6: External Integrations (2 weeks)

**Goal:** Connect to ERP, CRM, HRMS, IoT

### 6.1 Integration Hub

```javascript
// File: src/integrations/hub.js

class IntegrationHub {
  async connect(system, config) {
    const connector = this.getConnector(system);
    await connector.authenticate(config);
    this.connectors.set(system, connector);
  }
  
  async syncData(system, entity) {
    const connector = this.connectors.get(system);
    return connector.fetch(entity);
  }
}

const hub = new IntegrationHub();

// Register connectors
hub.registerConnector('salesforce', new SalesforceConnector());
hub.registerConnector('workday', new WorkdayConnector());
hub.registerConnector('servicenow', new ServiceNowConnector());
```

### 6.2 Event Bus

```javascript
// File: src/events/bus.js

class EventBus {
  publish(event) {
    this.subscribers.forEach(sub => {
      if (sub.matches(event.type)) {
        sub.handler(event);
      }
    });
  }
  
  subscribe(pattern, handler) {
    this.subscribers.push({ pattern, handler });
  }
}

// Subscribe to external events
eventBus.subscribe('salesforce.deal_won', async (event) => {
  // Create project for new deal
  await createProjectFromDeal(event.data);
});

eventBus.subscribe('workday.employee_offboarded', async (event) => {
  // Start offboarding process
  await triggerOffboarding(event.data.employeeId);
});
```

**Deliverables:**
- Integration hub with Salesforce, Workday, ServiceNow
- Event bus for cross-system orchestration
- Sample event handlers

---

## Summary Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 0 | 2 weeks | Production hardening (DB, TwinOS, MemoryOS) |
| Phase 1 | 4 weeks | WorkOS (Dependencies, Gantt, Kanban, OKRs) |
| Phase 2 | 4 weeks | ProcessOS (Registry, BPMN, Mining, Kaizen) |
| Phase 3 | 4 weeks | ExecutionOS (Command Center, Escalations, SLA) |
| Phase 4 | 4 weeks | PlanningOS (Forecasting, Scenarios, What-If) |
| Phase 5 | 4 weeks | Analytics + AI (KPIs, Root Cause, LLM) |
| Phase 6 | 2 weeks | Integrations (ERP, CRM, HRMS) |
| **Total** | **24 weeks** | **~6 months** |

---

## Quick Wins (4 weeks)

If timeline is constrained, prioritize:

1. **Week 1-2:** PostgreSQL + TwinOS sync (Phase 0)
2. **Week 2-3:** Task dependencies + Gantt + Kanban (Phase 1.1-1.3)
3. **Week 3-4:** Escalation engine + SLA tracking (Phase 3.2-3.3)

This gives immediate operational value in 4 weeks.

---

## Files to Create

| Phase | New Files |
|-------|-----------|
| Phase 0 | `src/db/postgres.js`, `src/integrations/twinos-sync.js`, `src/integrations/memoryos.js` |
| Phase 1 | `src/modules/taskDependencies.js`, `src/modules/views.js`, `src/modules/sprints.js`, `src/modules/okr.js` |
| Phase 2 | `src/modules/processRegistry.js`, `src/modules/bpmn.js`, `src/modules/processMining.js`, `src/modules/kaizen.js` |
| Phase 3 | `src/modules/commandCenter.js`, `src/modules/escalation.js`, `src/modules/sla.js`, `src/modules/runbooks.js` |
| Phase 4 | `src/modules/demandForecast.js`, `src/modules/scenarioPlanning.js`, `src/modules/whatIf.js`, `src/modules/capacitySimulation.js` |
| Phase 5 | `src/modules/kpiRegistry.js`, `src/modules/rootCause.js`, `src/ai/llmClient.js`, `src/modules/predictions.js` |
| Phase 6 | `src/integrations/hub.js`, `src/events/bus.js` |

---

*Plan Date: July 2, 2026*
