/**
 * OperationsOS - Process Mining & Analytics
 *
 * Process intelligence for Operations OS
 * Inspired by: Celonis + SAP Signavio + Appian
 *
 * Modules:
 * - Process Mining
 * - Bottleneck Detection
 * - Automation Discovery
 * - Compliance Tracking
 * - Simulation Engine
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface ProcessEvent {
  id: string;
  processId: string;
  caseId: string;
  activity: string;
  timestamp: Date;
  resource?: string;
  duration?: number; // ms
  metadata?: Record<string, any>;
}

export interface Process {
  id: string;
  name: string;
  description: string;
  type: 'procurement' | 'hr' | 'sales' | 'support' | 'finance' | 'operations';
  stages: ProcessStage[];
  metrics: ProcessMetrics;
  status: 'active' | 'optimizing' | 'monitored';
  createdAt: Date;
}

export interface ProcessStage {
  id: string;
  name: string;
  order: number;
  avgDuration: number;
  throughput: number;
  defects: number;
  automationPotential: number;
}

export interface ProcessMetrics {
  totalCases: number;
  avgCycleTime: number;
  avgProcessingTime: number;
  defects: number;
  automationPotential: number;
  efficiency: number;
  bottlenecks: string[];
}

export interface Bottleneck {
  id: string;
  processId: string;
  stage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  benchmark: number;
  impact: number; // % delay caused
  recommendation: string;
  roi?: { cost: number; savings: number };
}

export interface ProcessTwin {
  id: string;
  processId: string;
  currentState: ProcessState;
  health: number;
  optimization: OptimizationRecommendation[];
  lastUpdated: Date;
}

export interface ProcessState {
  active: number;
  queued: number;
  completed: number;
  blocked: number;
  avgWaitTime: number;
  efficiency: number;
}

export interface OptimizationRecommendation {
  type: 'automation' | 'rerouting' | 'resourcing' | 'restructuring';
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  roi?: { investment: number; return: number; payback: string };
  automated?: boolean;
}

// ============================================================
// STORAGE
// ============================================================

const processes = new Map<string, Process>();
const processEvents = new Map<string, ProcessEvent[]>();
const bottlenecks = new Map<string, Bottleneck[]>();
const twins = new Map<string, ProcessTwin>();

// ============================================================
// PROCESS ROUTES
// ============================================================

router.post('/processes', async (req, res) => {
  try {
    const process: Process = {
      id: crypto.randomUUID(),
      name: req.body.name || 'Process',
      description: req.body.description || '',
      type: req.body.type || 'operations',
      stages: req.body.stages || [],
      metrics: {
        totalCases: 0,
        avgCycleTime: 0,
        avgProcessingTime: 0,
        defects: 0,
        automationPotential: 0,
        efficiency: 100,
        bottlenecks: [],
      },
      status: 'active',
      createdAt: new Date(),
    };

    processes.set(process.id, process);
    processEvents.set(process.id, []);

    res.status(201).json({ success: true, process });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/processes', async (req, res) => {
  try {
    const { type, status } = req.query;
    let result = Array.from(processes.values());

    if (type) result = result.filter(p => p.type === type);
    if (status) result = result.filter(p => p.status === status);

    res.json({ success: true, processes: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/processes/:id', async (req, res) => {
  try {
    const process = processes.get(req.params.id);
    if (!process) {
      return res.status(404).json({ success: false, error: 'Process not found' });
    }

    const events = processEvents.get(process.id) || [];
    const twin = twins.get(process.id);

    res.json({ success: true, process, events: events.length, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// EVENT TRACKING
// ============================================================

router.post('/processes/:id/events', async (req, res) => {
  try {
    const { caseId, activity, resource, duration, metadata } = req.body;

    const event: ProcessEvent = {
      id: crypto.randomUUID(),
      processId: req.params.id,
      caseId,
      activity,
      timestamp: new Date(),
      resource,
      duration,
      metadata,
    };

    const events = processEvents.get(req.params.id) || [];
    events.push(event);
    processEvents.set(req.params.id, events);

    // Update process metrics
    updateProcessMetrics(req.params.id);

    res.status(201).json({ success: true, event });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/processes/:id/cases/:caseId/timeline', async (req, res) => {
  try {
    const events = processEvents.get(req.params.id) || [];
    const caseEvents = events
      .filter(e => e.caseId === req.params.caseId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    res.json({ success: true, events: caseEvents, count: caseEvents.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// BOTTLENECK ANALYSIS
// ============================================================

router.get('/processes/:id/bottlenecks', async (req, res) => {
  try {
    let bottlenecks = this.bottlenecks.get(req.params.id) || [];

    if (bottlenecks.length === 0) {
      bottlenecks = generateBottlenecks(req.params.id);
      this.bottlenecks.set(req.params.id, bottlenecks);
    }

    res.json({ success: true, bottlenecks, count: bottlenecks.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/processes/:id/bottlenecks/analyze', async (req, res) => {
  try {
    const process = processes.get(req.params.id);
    if (!process) {
      return res.status(404).json({ success: false, error: 'Process not found' });
    }

    // Simulate AI analysis
    const bottlenecks = analyzeBottlenecks(process);

    bottlenecks.set(req.params.id, bottlenecks);

    res.json({ success: true, bottlenecks, count: bottlenecks.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// TWIN ENDPOINTS
// ============================================================

router.get('/processes/:id/twin', async (req, res) => {
  try {
    let twin = twins.get(req.params.id);

    if (!twin) {
      const process = processes.get(req.params.id);
      twin = createProcessTwin(req.params.id, process);
      twins.set(req.params.id, twin);
    }

    res.json({ success: true, twin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/processes/:id/twin/optimize', async (req, res) => {
  try {
    const process = processes.get(req.params.id);
    const recommendations = generateOptimizations(process);

    res.json({ success: true, recommendations, count: recommendations.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// SIMULATION
// ============================================================

router.post('/processes/:id/simulate', async (req, res) => {
  try {
    const { changes, duration } = req.body;

    // Simulate process with changes
    const simulation = runSimulation(req.params.id, changes, duration);

    res.json({ success: true, simulation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/processes/:id/kpis', async (req, res) => {
  try {
    const process = processes.get(req.params.id);
    const events = processEvents.get(req.params.id) || [];

    const kpis = calculateKPIs(process, events);

    res.json({ success: true, kpis });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function updateProcessMetrics(processId: string): void {
  const process = processes.get(processId);
  const events = processEvents.get(processId) || [];

  if (!process) return;

  // Calculate metrics from events
  process.metrics.totalCases = new Set(events.map(e => e.caseId)).size;

  if (events.length > 1) {
    const durations = events
      .filter(e => e.duration)
      .map(e => e.duration!);

    process.metrics.avgProcessingTime = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Estimate cycle time
    process.metrics.avgCycleTime = process.metrics.avgProcessingTime * 1.5;
  }

  // Estimate automation potential
  process.metrics.automationPotential = estimateAutomationPotential(process);

  // Identify bottlenecks
  process.metrics.bottlenecks = identifyBottlenecks(process, events);

  processes.set(processId, process);
}

function estimateAutomationPotential(process: Process): number {
  // Simple heuristic
  let potential = 0;

  if (process.type === 'procurement') potential = 75;
  if (process.type === 'hr') potential = 60;
  if (process.type === 'finance') potential = 80;
  if (process.type === 'support') potential = 50;

  return potential + Math.floor(Math.random() * 15);
}

function identifyBottlenecks(process: Process, events: ProcessEvent[]): string[] {
  const bottlenecks: string[] = [];

  if (process.metrics.avgCycleTime > 10000) {
    bottlenecks.push('High cycle time');
  }
  if (process.metrics.defects > 5) {
    bottlenecks.push('Quality issues');
  }
  if (process.metrics.automationPotential < 50) {
    bottlenecks.push('Low automation');
  }

  return bottlenecks;
}

function generateBottlenecks(processId: string): Bottleneck[] {
  return [
    {
      id: crypto.randomUUID(),
      processId,
      stage: 'Review',
      severity: 'high',
      metric: 'Wait Time',
      value: 48, // hours
      benchmark: 4,
      impact: 35,
      recommendation: 'Automate approval for amounts < 50000',
      roi: { cost: 50000, savings: 200000 },
    },
    {
      id: crypto.randomUUID(),
      processId,
      stage: 'Processing',
      severity: 'medium',
      metric: 'Error Rate',
      value: 8,
      benchmark: 2,
      impact: 15,
      recommendation: 'Add validation rules',
    },
  ];
}

function analyzeBottlenecks(process: Process): Bottleneck[] {
  return generateBottlenecks(process.id);
}

function createProcessTwin(processId: string, process?: Process): ProcessTwin {
  return {
    id: crypto.randomUUID(),
    processId,
    currentState: {
      active: process?.metrics?.totalCases || 0,
      queued: 0,
      completed: 0,
      blocked: 0,
      avgWaitTime: 24,
      efficiency: process?.metrics?.efficiency || 85,
    },
    health: 78,
    optimization: [],
    lastUpdated: new Date(),
  };
}

function generateOptimizations(process?: Process): OptimizationRecommendation[] {
  return [
    {
      type: 'automation',
      description: 'Auto-approve low-value invoices',
      effort: 'low',
      impact: 'high',
      roi: { investment: 10000, return: 50000, payback: '2 months' },
      automated: false,
    },
    {
      type: 'rerouting',
      description: 'Route exceptions to senior reviewer',
      effort: 'medium',
      impact: 'medium',
    },
    {
      type: 'restructuring',
      description: 'Parallel processing for approvals',
      effort: 'high',
      impact: 'high',
    },
  ];
}

function runSimulation(
  processId: string,
  changes?: Record<string, any>,
  duration?: number
): any {
  const events = processEvents.get(processId) || [];

  return {
    current: {
      avgCycleTime: 48,
      efficiency: 78,
      throughput: 120,
    },
    simulated: {
      avgCycleTime: changes?.automation ? 28 : 48,
      efficiency: changes?.automation ? 92 : 78,
      throughput: changes?.automation ? 180 : 120,
    },
    improvement: {
      cycleTime: changes?.automation ? '-42%' : '0%',
      efficiency: changes?.automation ? '+18%' : '0%',
      throughput: changes?.automation ? '+50%' : '0%',
    },
  };
}

function calculateKPIs(process: any, events: ProcessEvent[]): any {
  return {
    cycleTime: process?.metrics?.avgCycleTime || 0,
    throughput: events.length,
    defects: process?.metrics?.defects || 0,
    automationPotential: process?.metrics?.automationPotential || 0,
    efficiency: process?.metrics?.efficiency || 0,
    bottlenecks: process?.metrics?.bottlenecks?.length || 0,
  };
}

export default router;
</parameter>
