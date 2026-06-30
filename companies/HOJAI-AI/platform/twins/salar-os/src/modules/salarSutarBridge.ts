/**
 * Salar OS - SUTAR Bridge Module (v2.0)
 *
 * Bridges Salar's workforce intelligence to SUTAR's decision engine.
 *
 * Integration flow:
 * SUTAR needs workforce → Salar provides → SUTAR executes → Outcome → Salar learns
 *
 * Canonical: All agents are managed by Salar, operated by SUTAR.
 */

import { Router, Request, Response } from 'express';
import { createLogger } from '@rtmn/shared/lib/logger';

const logger = createLogger('salarSutarBridge');

const router = Router();

// ============================================================================
// SERVICE URLs (configurable via env)
// ============================================================================

const SUTAR_DECISION_URL = process.env.SUTAR_DECISION_URL || 'http://localhost:4240';
const SUTAR_INTENT_BUS_URL = process.env.SUTAR_INTENT_BUS_URL || 'http://localhost:4154';
const SUTAR_GOAL_OS_URL = process.env.SUTAR_GOAL_OS_URL || 'http://localhost:4242';
const SUTAR_ECONOMY_URL = process.env.SUTAR_ECONOMY_URL || 'http://localhost:4294';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// ============================================================================
// HELPERS
// ============================================================================

async function callSutar(url: string, method: string, body?: any): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (INTERNAL_TOKEN) {
    headers['x-internal-token'] = INTERNAL_TOKEN;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (error: any) {
    logger.error(`[SUTAR Bridge] Failed to call ${url}:`, error.message);
    return { ok: false, status: 0, data: null, error: error.message };
  }
}

// ============================================================================
// BRIDGE 1: WORKFORCE DECISION
// ============================================================================

/**
 * POST /sutar/bridge/workforce-decision
 *
 * Called by SUTAR Decision Engine when it needs workforce intelligence.
 */
router.post('/bridge/workforce-decision', async (req: Request, res: Response) => {
  try {
    const {
      decisionId,
      context,
      requiredCapabilities,
      requiredCapacity,
      constraints,
      deadline,
      budget,
      preferHuman,
      allowHybrid,
      taskType,
    } = req.body;

    logger.info(`[SUTAR Bridge] Workforce decision request: ${decisionId}`);

    // Import the capability registry and twin modules
    const { CapabilityMapping } = await import('./capabilityRegistry.js');
    const { AgentTwin } = await import('./agentTwin.js');
    const { HumanTwin } = await import('./hybridTwin.js');

    // Find matching capability mappings
    const capabilityMappings = await CapabilityMapping.find({
      capabilityId: { $in: requiredCapabilities || [] },
      status: 'ACTIVE',
    }).lean();

    // Group by entity
    const entityScores = new Map<string, any>();
    for (const mapping of capabilityMappings) {
      if (!entityScores.has(mapping.entityId)) {
        entityScores.set(mapping.entityId, {
          entityId: mapping.entityId,
          entityType: mapping.entityType,
          capabilities: [],
          totalConfidence: 0,
        });
      }
      const entry = entityScores.get(mapping.entityId)!;
      entry.capabilities.push({
        capabilityId: mapping.capabilityId,
        level: mapping.level,
        confidence: mapping.metrics?.confidence || 0.5,
      });
      entry.totalConfidence += mapping.metrics?.confidence || 0.5;
    }

    // Get detailed entity info
    const candidates = [];
    for (const [entityId, entry] of entityScores) {
      if (entry.entityType === 'AGENT') {
        const agent = await AgentTwin.findOne({ agentId: entityId }).lean();
        if (agent && agent.health?.status === 'ACTIVE') {
          candidates.push({
            type: 'AGENT',
            corpId: agent.agentId,
            name: agent.name,
            twinId: agent.twinId,
            matchScore: entry.totalConfidence / entry.capabilities.length,
            capabilities: entry.capabilities,
            cost: agent.cost?.perTask || 0.01,
            trust: agent.trust?.overallScore || 0.5,
            capacity: agent.capacity?.availableCapacity || 1.0,
          });
        }
      } else if (entry.entityType === 'HUMAN') {
        const human = await HumanTwin.findOne({ corpId: entityId }).lean();
        if (human && human.health?.status === 'ACTIVE') {
          candidates.push({
            type: 'HUMAN',
            corpId: human.corpId,
            name: human.name,
            twinId: human.twinId,
            matchScore: entry.totalConfidence / entry.capabilities.length,
            capabilities: entry.capabilities,
            cost: 0, // Humans have salary, not per-task
            trust: 0.9, // Default high trust for humans
            capacity: human.capacity?.availableHours / 40 || 1.0,
          });
        }
      }
    }

    // Sort by match score
    candidates.sort((a, b) => b.matchScore - a.matchScore);

    // Determine capability coverage
    const coveredCapabilities = new Set(entry.capabilities.map((c: any) => c.capabilityId) for (const [, entry] of entityScores));
    const capabilityCoverage = (coveredCapabilities.size / (requiredCapabilities?.length || 1)) * 100;

    // Build response
    const response = {
      decisionId,
      requestId: `salar-${Date.now()}`,
      recommendations: candidates.slice(0, 5),
      summary: {
        totalCandidates: candidates.length,
        humanCount: candidates.filter((c: any) => c.type === 'HUMAN').length,
        agentCount: candidates.filter((c: any) => c.type === 'AGENT').length,
        hybridRecommended: allowHybrid && candidates.length >= 2,
        capabilityCoverage: `${capabilityCoverage.toFixed(0)}%`,
      },
      confidence: {
        workforceFound: candidates.length > 0 ? Math.min(0.95, candidates.length * 0.1 + 0.5) : 0,
        capabilityMatch: capabilityCoverage / 100,
        capacityAvailable: candidates.some((c: any) => c.capacity > 0) ? 0.85 : 0.5,
      },
      risks: candidates.length === 0 ? ['No matching workforce found'] : [],
      suggestedActions: candidates.length === 0 ? ['Consider training new workforce', 'Expand capability search'] : [],
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    logger.error('[SUTAR Bridge] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BRIDGE_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 2: ASSIGNMENT EXECUTION
// ============================================================================

/**
 * POST /sutar/bridge/assignment-execute
 *
 * Called by SUTAR to execute workforce assignment.
 */
router.post('/bridge/assignment-execute', async (req: Request, res: Response) => {
  try {
    const {
      assignmentId,
      decisionId,
      workforce,
      task,
      deadline,
    } = req.body;

    logger.info(`[SUTAR Bridge] Assignment execution: ${assignmentId}`);

    // Import modules
    const { AgentTwin } = await import('./agentTwin.js');
    const { HumanTwin } = await import('./hybridTwin.js');

    // Record assignment for each workforce entity
    const workforceResults = [];
    for (const w of workforce || []) {
      if (w.type === 'AGENT' || w.type === 'agent') {
        // Update agent capacity
        await AgentTwin.updateOne(
          { agentId: w.corpId },
          {
            $inc: { 'capacity.currentTasks': 1 },
            $set: { 'health.status': 'ACTIVE' },
          }
        );
        workforceResults.push({
          corpId: w.corpId,
          type: 'AGENT',
          notified: true,
          assignmentId,
        });
      } else if (w.type === 'HUMAN' || w.type === 'human') {
        // Update human capacity
        await HumanTwin.updateOne(
          { corpId: w.corpId },
          {
            $inc: { 'capacity.currentTasks': 1 },
            $set: { 'health.status': 'ACTIVE' },
          }
        );
        workforceResults.push({
          corpId: w.corpId,
          type: 'HUMAN',
          notified: true,
          assignmentId,
        });
      }
    }

    // Notify SUTAR Intent Bus about assignment
    await callSutar(
      `${SUTAR_INTENT_BUS_URL}/api/intents`,
      'POST',
      {
        intent: 'workforce.assigned',
        source: 'salar-os',
        payload: {
          assignmentId,
          decisionId,
          workforce: workforceResults,
          task,
          deadline,
        },
      }
    );

    res.json({
      success: true,
      data: {
        assignmentId,
        status: 'ASSIGNED',
        workforce: workforceResults,
      },
    });
  } catch (error: any) {
    logger.error('[SUTAR Bridge] Assignment error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ASSIGNMENT_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 3: OUTCOME LEARNING
// ============================================================================

/**
 * POST /sutar/bridge/outcome
 *
 * Called by SUTAR when execution completes (success or failure).
 * This is how Salar learns and updates workforce intelligence.
 */
router.post('/bridge/outcome', async (req: Request, res: Response) => {
  try {
    const {
      assignmentId,
      decisionId,
      outcome,
      quality,
      duration,
      errors,
      feedback,
      workforce,
    } = req.body;

    logger.info(`[SUTAR Bridge] Outcome received: ${assignmentId} - ${outcome}`);

    // Import modules
    const { AgentTwin } = await import('./agentTwin.js');
    const { HumanTwin } = await import('./hybridTwin.js');
    const { CapabilityMapping } = await import('./capabilityRegistry.js');

    // Update each workforce entity based on outcome
    for (const w of workforce || []) {
      if (w.type === 'AGENT' || w.type === 'agent') {
        const agent = await AgentTwin.findOne({ agentId: w.corpId });
        if (agent) {
          // Update performance metrics
          const isSuccess = outcome === 'SUCCESS' || outcome === 'completed';
          agent.performance.totalTasks = (agent.performance.totalTasks || 0) + 1;
          if (isSuccess) {
            agent.performance.successfulTasks = (agent.performance.successfulTasks || 0) + 1;
          } else {
            agent.performance.failedTasks = (agent.performance.failedTasks || 0) + 1;
          }
          agent.performance.successRate = agent.performance.successfulTasks / agent.performance.totalTasks;

          if (duration) {
            agent.performance.avgResponseTime = (
              (agent.performance.avgResponseTime * (agent.performance.totalTasks - 1) + duration)
            ) / agent.performance.totalTasks;
          }

          if (quality) {
            agent.performance.avgQuality = (
              (agent.performance.avgQuality * (agent.performance.totalTasks - 1) + quality)
            ) / agent.performance.totalTasks;
          }

          // Update cost tracking
          agent.cost.monthlySpend = (agent.cost.monthlySpend || 0) + (agent.cost.perTask || 0.01);

          // Release capacity
          agent.capacity.currentTasks = Math.max(0, (agent.capacity.currentTasks || 0) - 1);
          agent.capacity.availableCapacity = Math.max(0,
            (agent.capacity.maxConcurrentTasks - agent.capacity.currentTasks) / agent.capacity.maxConcurrentTasks
          );

          await agent.save();

          // Update capability confidence based on outcome
          if (w.capabilities) {
            for (const cap of w.capabilities) {
              await CapabilityMapping.updateOne(
                { entityId: w.corpId, capabilityId: cap.capabilityId },
                {
                  $inc: {
                    'metrics.evidenceCount': 1,
                    'metrics.successfulOutcomes': isSuccess ? 1 : 0,
                  },
                  $set: {
                    'metrics.lastVerified': new Date(),
                  },
                }
              );

              // Adjust confidence based on outcome
              const adjustment = isSuccess ? 0.05 : -0.1;
              await CapabilityMapping.updateOne(
                { entityId: w.corpId, capabilityId: cap.capabilityId },
                {
                  $inc: { 'metrics.confidence': adjustment },
                }
              );
            }
          }
        }
      } else if (w.type === 'HUMAN' || w.type === 'human') {
        const human = await HumanTwin.findOne({ corpId: w.corpId });
        if (human) {
          human.performance.totalTasks = (human.performance.totalTasks || 0) + 1;
          if (outcome === 'SUCCESS' || outcome === 'completed') {
            human.performance.successfulTasks = (human.performance.successfulTasks || 0) + 1;
          }
          human.performance.efficiency = (
            (human.performance.efficiency * (human.performance.totalTasks - 1) + (quality || 0.8))
          ) / human.performance.totalTasks;
          human.capacity.currentTasks = Math.max(0, (human.capacity.currentTasks || 0) - 1);
          await human.save();
        }
      }
    }

    // Record outcome for ML training pipeline
    // (Could also push to mlTrainingPipeline)

    res.json({
      success: true,
      data: {
        outcomeRecorded: true,
        learningApplied: true,
        workforceUpdated: workforce?.length || 0,
      },
    });
  } catch (error: any) {
    logger.error('[SUTAR Bridge] Outcome error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'OUTCOME_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 4: CAPABILITY CHECK
// ============================================================================

/**
 * POST /sutar/bridge/capability-check
 *
 * Check if specific capabilities exist in workforce.
 */
router.post('/bridge/capability-check', async (req: Request, res: Response) => {
  try {
    const { capabilities, orgId } = req.body;

    const { CapabilityMapping } = await import('./capabilityRegistry.js');

    const coverage = [];
    for (const cap of capabilities || []) {
      const mappings = await CapabilityMapping.find({
        capabilityId: cap,
        status: 'ACTIVE',
      }).lean();

      coverage.push({
        capability: cap,
        available: mappings.length > 0,
        count: mappings.length,
        agents: mappings.filter((m: any) => m.entityType === 'AGENT').length,
        humans: mappings.filter((m: any) => m.entityType === 'HUMAN').length,
        avgConfidence: mappings.length > 0
          ? mappings.reduce((sum: number, m: any) => sum + (m.metrics?.confidence || 0.5), 0) / mappings.length
          : 0,
      });
    }

    res.json({
      success: true,
      data: {
        capabilities,
        coverage,
        allAvailable: coverage.every((c: any) => c.available),
        gaps: coverage.filter((c: any) => !c.available).map((c: any) => c.capability),
      },
    });
  } catch (error: any) {
    logger.error('[SUTAR Bridge] Capability check error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CAPABILITY_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 5: CAPACITY CHECK
// ============================================================================

/**
 * POST /sutar/bridge/capacity-check
 *
 * Check if workforce has capacity for additional work.
 */
router.post('/bridge/capacity-check', async (req: Request, res: Response) => {
  try {
    const { additionalWorkload, teamIds, timeframe } = req.body;

    const { AgentTwin } = await import('./agentTwin.js');
    const { HumanTwin } = await import('./hybridTwin.js');

    const agents = await AgentTwin.find({
      'health.status': 'ACTIVE',
      ...(teamIds ? { agentId: { $in: teamIds } } : {}),
    }).lean();

    const humans = await HumanTwin.find({
      'health.status': 'ACTIVE',
      ...(teamIds ? { corpId: { $in: teamIds } } : {}),
    }).lean();

    // Calculate capacity metrics
    const agentCapacity = agents.reduce(
      (sum: number, a: any) => sum + (a.capacity?.availableCapacity || 0),
      0
    ) / (agents.length || 1);

    const humanCapacity = humans.reduce(
      (sum: number, h: any) => sum + ((h.capacity?.availableHours || 40) / 40),
      0
    ) / (humans.length || 1);

    const totalCapacity = (agentCapacity + humanCapacity) / 2;
    const currentUtilization = 1 - totalCapacity;
    const canAccept = totalCapacity >= (additionalWorkload || 10) / 100;

    res.json({
      success: true,
      data: {
        currentUtilization: (currentUtilization * 100).toFixed(1) + '%',
        additionalWorkload,
        canAccept,
        recommendations: !canAccept
          ? ['Consider adding more workforce', 'Redistribute tasks']
          : [],
        details: {
          agentCount: agents.length,
          humanCount: humans.length,
          avgAgentCapacity: (agentCapacity * 100).toFixed(1) + '%',
          avgHumanCapacity: (humanCapacity * 100).toFixed(1) + '%',
        },
      },
    });
  } catch (error: any) {
    logger.error('[SUTAR Bridge] Capacity check error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CAPACITY_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 6: AGENT DETAILS
// ============================================================================

/**
 * GET /sutar/bridge/agent/:corpId
 *
 * Get agent details for SUTAR.
 */
router.get('/bridge/agent/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;

    const { AgentTwin } = await import('./agentTwin.js');
    const agent = await AgentTwin.findOne({ agentId: corpId }).lean();

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.json({
      success: true,
      data: {
        agentId: agent.agentId,
        twinId: agent.twinId,
        name: agent.name,
        type: agent.identity?.type || 'SPECIALIZED',
        status: agent.health?.status || 'ACTIVE',
        capabilities: agent.capabilities || [],
        trust: {
          score: agent.trust?.overallScore || 0.5,
          level: agent.trust?.riskLevel || 'LOW',
        },
        performance: {
          successRate: agent.performance?.successRate || 0,
          avgResponseTime: agent.performance?.avgResponseTime || 0,
          avgQuality: agent.performance?.avgQuality || 0,
        },
        capacity: {
          availableCapacity: agent.capacity?.availableCapacity || 1.0,
          maxConcurrentTasks: agent.capacity?.maxConcurrentTasks || 5,
          currentTasks: agent.capacity?.currentTasks || 0,
        },
        cost: agent.cost || {},
      },
    });
  } catch (error: any) {
    logger.error('[SUTAR Bridge] Agent fetch error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'AGENT_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 7: SIMULATION
// ============================================================================

/**
 * POST /sutar/bridge/simulation
 *
 * Workforce simulation for SUTAR's SimulationOS.
 */
router.post('/bridge/simulation', async (req: Request, res: Response) => {
  try {
    const { scenario, currentWorkforce, proposedChanges } = req.body;

    const { AgentTwin } = await import('./agentTwin.js');

    // Get current workforce state
    const agentIds = currentWorkforce?.agents || [];
    const currentAgents = await AgentTwin.find({
      agentId: { $in: agentIds },
    }).lean();

    const currentCapacity = currentAgents.reduce(
      (sum: number, a: any) => sum + (a.capacity?.availableCapacity || 0),
      0
    ) / (currentAgents.length || 1);

    // Calculate impact of proposed changes
    const changes = proposedChanges || {};
    const capacityChange = (changes.addAgents ? 0.2 : 0) + (changes.removeAgents ? -0.2 : 0);
    const costChange = (changes.addAgents ? 0.02 : 0) + (changes.removeAgents ? -0.02 : 0);
    const performanceChange = (changes.upgradeAgents ? 0.1 : 0);

    res.json({
      success: true,
      data: {
        scenario,
        current: {
          agentCount: currentAgents.length,
          avgCapacity: (currentCapacity * 100).toFixed(1) + '%',
        },
        impact: {
          capacityChange: ((currentCapacity + capacityChange) * 100).toFixed(1) + '%',
          costChange: (costChange * 100).toFixed(1) + '%',
          performanceChange: (performanceChange * 100).toFixed(1) + '%',
        },
        recommendations: [
          capacityChange < 0 ? 'Warning: Reducing capacity' : 'Capacity looks good',
          performanceChange > 0 ? 'Upgrade recommended for better performance' : '',
        ].filter(Boolean),
      },
    });
  } catch (error: any) {
    logger.error('[SUTAR Bridge] Simulation error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SIMULATION_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 8: WORKFLOW STATE
// ============================================================================

/**
 * POST /sutar/bridge/workflow-state
 *
 * Get current workflow state for workforce.
 */
router.post('/bridge/workflow-state', async (req: Request, res: Response) => {
  try {
    const { workforceIds } = req.body;

    const { AgentTwin } = await import('./agentTwin.js');
    const { HumanTwin } = await import('./hybridTwin.js');

    const states = [];

    for (const id of workforceIds || []) {
      const agent = await AgentTwin.findOne({ agentId: id }).lean();
      if (agent) {
        states.push({
          entityId: id,
          type: 'AGENT',
          currentTasks: agent.capacity?.currentTasks || 0,
          capacity: agent.capacity?.availableCapacity || 1.0,
          status: agent.health?.status || 'ACTIVE',
          successRate: agent.performance?.successRate || 0,
        });
        continue;
      }

      const human = await HumanTwin.findOne({ corpId: id }).lean();
      if (human) {
        states.push({
          entityId: id,
          type: 'HUMAN',
          currentTasks: human.capacity?.currentTasks || 0,
          capacity: (human.capacity?.availableHours || 40) / 40,
          status: human.health?.status || 'ACTIVE',
        });
      }
    }

    res.json({
      success: true,
      data: {
        states,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('[SUTAR Bridge] Workflow state error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'STATE_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// BRIDGE 9: CALLBACK REGISTRATION
// ============================================================================

/**
 * POST /sutar/bridge/register-callback
 *
 * Register Salar as a callback for SUTAR decisions.
 */
router.post('/bridge/register-callback', async (req: Request, res: Response) => {
  try {
    const callbackUrl = process.env.SALAR_CALLBACK_URL || 'http://localhost:4710/sutar/bridge';

    // Register with SUTAR Decision Engine
    const result = await callSutar(
      `${SUTAR_DECISION_URL}/api/webhooks`,
      'POST',
      {
        url: callbackUrl,
        events: [
          'workforce.needed',
          'assignment.completed',
          'assignment.failed',
          'workflow.state_changed',
        ],
        source: 'salar-os',
      }
    );

    res.json({
      success: true,
      data: {
        registered: result.ok,
        callbackUrl,
        sutarWebhookId: result.data?.webhookId,
        events: [
          'workforce.needed',
          'assignment.completed',
          'assignment.failed',
          'workflow.state_changed',
        ],
      },
    });
  } catch (error: any) {
    logger.error('[SUTAR Bridge] Registration error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REGISTRATION_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /sutar/bridge/health
 *
 * Check bridge health.
 */
router.get('/bridge/health', async (req: Request, res: Response) => {
  try {
    const [sutarHealth, corpidHealth] = await Promise.all([
      callSutar(`${SUTAR_DECISION_URL}/health`, 'GET'),
      callSutar(`${process.env.CORPID_SERVICE_URL || 'http://localhost:4702'}/health`, 'GET'),
    ]);

    res.json({
      success: true,
      data: {
        status: 'ok',
        connectedTo: {
          sutar: sutarHealth.ok ? 'connected' : 'disconnected',
          corpid: corpidHealth.ok ? 'connected' : 'disconnected',
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'HEALTH_ERROR', message: error.message },
    });
  }
});

export { router as salarSutarBridgeRouter };
export default router;
