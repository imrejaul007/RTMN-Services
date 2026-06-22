import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('salarSutarBridge');
/**
 * Salar OS - Sutar Bridge Module
 *
 * Bridges Salar's workforce intelligence to Sutar's decision engine
 *
 * Integration flow:
 * Sutar needs workforce → Salar provides → Sutar executes → Outcome → Salar learns
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Sutar Decision Engine
const SUTAR_DECISION_URL = process.env.SUTAR_DECISION_URL || 'http://localhost:4240';

// ============================================================================
// WORKFORCE DECISION BRIDGE
// ============================================================================

/**
 * POST /sutar/bridge/workforce-decision
 *
 * Called by Sutar Decision Engine when it needs workforce intelligence.
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

    logger.info(`[Salar-Sutar Bridge] Workforce decision request: ${decisionId}`);

    // Import the capability registry and twin modules
    // In production, these would be imported
    const workforceResult = await findWorkforce({
      capabilities: requiredCapabilities,
      capacity: requiredCapacity,
      budget,
      preferHuman,
      allowHybrid,
    });

    // Build Sutar-compatible response
    const response = {
      decisionId,
      requestId: `salar-${Date.now()}`,

      // Workforce recommendations
      recommendations: workforceResult.candidates.slice(0, 5),

      // Summary
      summary: {
        totalCandidates: workforceResult.candidates.length,
        humanCount: workforceResult.candidates.filter(c => c.type === 'HUMAN').length,
        agentCount: workforceResult.candidates.filter(c => c.type === 'AGENT').length,
        hybridRecommended: workforceResult.hybridTeam !== null,
      },

      // Confidence scores
      confidence: {
        workforceFound: workforceResult.candidates.length > 0 ? 0.85 : 0.0,
        capabilityMatch: workforceResult.capabilityCoverage,
        capacityAvailable: workforceResult.capacityAvailable,
      },

      // Risks
      risks: workforceResult.risks || [],

      // Next steps
      suggestedActions: workforceResult.suggestedActions || [],
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    logger.error('[Salar-Sutar Bridge] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'BRIDGE_ERROR', message: error.message },
    });
  }
});

/**
 * POST /sutar/bridge/assignment-execute
 *
 * Called by Sutar to execute workforce assignment.
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

    logger.info(`[Salar-Sutar Bridge] Assignment execution: ${assignmentId}`);

    // Record assignment in Salar
    const assignment = {
      assignmentId,
      decisionId,
      workforce,
      task,
      status: 'ASSIGNED',
      assignedAt: new Date(),
      deadline,
    };

    // In production: Save to database, update capacity, etc.

    // Notify assigned workforce
    // For humans:通知 system
    // For agents: Create task in agent queue

    res.json({
      success: true,
      data: {
        assignmentId,
        status: 'ASSIGNED',
        workforce: workforce.map((w: any) => ({
          corpId: w.corpId,
          type: w.type,
          notified: true,
        })),
      },
    });
  } catch (error: any) {
    logger.error('[Salar-Sutar Bridge] Assignment error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'ASSIGNMENT_ERROR', message: error.message },
    });
  }
});

/**
 * POST /sutar/bridge/outcome
 *
 * Called by Sutar when execution completes (success or failure).
 * This is how Salar learns.
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

    logger.info(`[Salar-Sutar Bridge] Outcome received: ${assignmentId} - ${outcome}`);

    // Record outcome for learning
    await recordOutcome({
      assignmentId,
      decisionId,
      outcome,
      quality,
      duration,
      errors,
      feedback,
      workforce,
    });

    // Update workforce state
    await updateWorkforceState({
      workforce,
      outcome,
      quality,
    });

    res.json({
      success: true,
      data: {
        outcomeRecorded: true,
        learningApplied: true,
      },
    });
  } catch (error: any) {
    logger.error('[Salar-Sutar Bridge] Outcome error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'OUTCOME_ERROR', message: error.message },
    });
  }
});

/**
 * POST /sutar/bridge/capability-check
 *
 * Check if specific capabilities exist in workforce.
 */
router.post('/bridge/capability-check', async (req: Request, res: Response) => {
  try {
    const { capabilities, orgId } = req.body;

    // Query capability registry
    const capabilityCheck = await checkCapabilities(capabilities);

    res.json({
      success: true,
      data: {
        capabilities,
        coverage: capabilityCheck,
        allAvailable: capabilityCheck.every((c: any) => c.available),
        gaps: capabilityCheck.filter((c: any) => !c.available).map((c: any) => c.capability),
      },
    });
  } catch (error: any) {
    logger.error('[Salar-Sutar Bridge] Capability check error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CAPABILITY_ERROR', message: error.message },
    });
  }
});

/**
 * POST /sutar/bridge/capacity-check
 *
 * Check if workforce has capacity for additional work.
 */
router.post('/bridge/capacity-check', async (req: Request, res: Response) => {
  try {
    const { additionalWorkload, teamIds, timeframe } = req.body;

    // Query capacity engine
    const capacity = await checkCapacity(additionalWorkload, teamIds, timeframe);

    res.json({
      success: true,
      data: {
        currentUtilization: capacity.utilizationRate,
        additionalWorkload,
        canAccept: capacity.canAccept,
        recommendations: capacity.recommendations,
      },
    });
  } catch (error: any) {
    logger.error('[Salar-Sutar Bridge] Capacity check error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CAPACITY_ERROR', message: error.message },
    });
  }
});

/**
 * GET /sutar/bridge/agent/:corpId
 *
 * Get agent details for Sutar.
 */
router.get('/bridge/agent/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;

    // Query agent twin
    const agent = await getAgentTwin(corpId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error: any) {
    logger.error('[Salar-Sutar Bridge] Agent fetch error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'AGENT_ERROR', message: error.message },
    });
  }
});

/**
 * POST /sutar/bridge/simulation
 *
 * Workforce simulation for Sutar's SimulationOS.
 */
router.post('/bridge/simulation', async (req: Request, res: Response) => {
  try {
    const { scenario, currentWorkforce, proposedChanges } = req.body;

    // Run workforce simulation
    const simulation = await simulateWorkforce({
      scenario,
      currentWorkforce,
      proposedChanges,
    });

    res.json({
      success: true,
      data: simulation,
    });
  } catch (error: any) {
    logger.error('[Salar-Sutar Bridge] Simulation error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SIMULATION_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// WORKFLOW STATE BRIDGE
// ============================================================================

/**
 * POST /sutar/bridge/workflow-state
 *
 * Get current workflow state for workforce.
 */
router.post('/bridge/workflow-state', async (req: Request, res: Response) => {
  try {
    const { workforceIds } = req.body;

    // Get state for each workforce entity
    const states = await Promise.all(
      (workforceIds || []).map(async (id: string) => {
        return await getWorkforceState(id);
      })
    );

    res.json({
      success: true,
      data: {
        states,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('[Salar-Sutar Bridge] Workflow state error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'STATE_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// SUTAR CALLBACK REGISTRATION
// ============================================================================

/**
 * POST /sutar/bridge/register-callback
 *
 * Register Salar as a callback for Sutar decisions.
 */
router.post('/bridge/register-callback', async (req: Request, res: Response) => {
  try {
    const callbackUrl = process.env.SALAR_CALLBACK_URL || 'http://localhost:4710/sutar/bridge';

    // In production: Register with Sutar Decision Engine
    // POST to SUTAR_DECISION_URL/webhooks

    res.json({
      success: true,
      data: {
        registered: true,
        callbackUrl,
        events: [
          'workforce.needed',
          'assignment.completed',
          'assignment.failed',
          'workflow.state_changed',
        ],
      },
    });
  } catch (error: any) {
    logger.error('[Salar-Sutar Bridge] Registration error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'REGISTRATION_ERROR', message: error.message },
    });
  }
});

/**
 * GET /sutar/bridge/health
 *
 * Check bridge health.
 */
router.get('/bridge/health', async (req: Request, res: Response) => {
  try {
    // Check connections
    const health = {
      status: 'ok',
      connectedTo: {
        sutar: await checkSutarHealth(),
        corpid: await checkCorpIdHealth(),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(health);
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

async function findWorkforce(params: {
  capabilities?: string[];
  capacity?: number;
  budget?: number;
  preferHuman?: boolean;
  allowHybrid?: boolean;
}): Promise<any> {
  // This would query the capability registry, agent twin, and human twin
  // For now, return mock data

  return {
    candidates: [
      {
        type: 'HUMAN',
        corpId: 'CI-IND-XXXXX',
        name: 'Employee',
        matchScore: 0.85,
        capabilities: params.capabilities?.map(c => ({ name: c, confidence: 0.8 })) || [],
        cost: 0,
      },
      {
        type: 'AGENT',
        corpId: 'CI-AGT-XXXXX',
        name: 'AI Agent',
        matchScore: 0.78,
        capabilities: params.capabilities?.map(c => ({ name: c, trust: 0.7 })) || [],
        cost: 0.02,
      },
    ],
    hybridTeam: params.allowHybrid ? {
      humans: ['CI-IND-XXXXX'],
      agents: ['CI-AGT-XXXXX'],
    } : null,
    capabilityCoverage: 0.85,
    capacityAvailable: 0.75,
    risks: [],
    suggestedActions: [],
  };
}

async function checkCapabilities(capabilities: string[]): Promise<any[]> {
  // Mock implementation
  return capabilities.map(cap => ({
    capability: cap,
    available: true,
    count: Math.floor(Math.random() * 10) + 1,
    avgConfidence: 0.75,
  }));
}

async function checkCapacity(workload: number, teamIds: string[], timeframe: string): Promise<any> {
  // Mock implementation
  return {
    utilizationRate: 0.7,
    canAccept: workload <= 50,
    recommendations: workload > 50 ? ['Consider redistributing work'] : [],
  };
}

async function getAgentTwin(corpId: string): Promise<any> {
  // Mock implementation
  return {
    corpId,
    name: 'AI Agent',
    type: 'SPECIALIZED',
    status: 'ACTIVE',
    trust: 0.85,
    performance: {
      successRate: 0.92,
      avgResponseTime: 500,
    },
  };
}

async function recordOutcome(params: any): Promise<void> {
  logger.info('[Salar-Sutar Bridge] Recording outcome:', params);
  // Store outcome for learning
}

async function updateWorkforceState(params: { workforce: any[]; outcome: string; quality?: number }): Promise<void> {
  logger.info('[Salar-Sutar Bridge] Updating workforce state:', params);
  // Update agent twin and human twin
}

async function simulateWorkforce(params: any): Promise<any> {
  return {
    scenario: params.scenario,
    results: {
      capacityChange: params.proposedChanges?.addAgents ? 0.5 : 0,
      costChange: params.proposedChanges?.addAgents ? 0.02 : 0,
    },
    recommendations: ['Simulation complete'],
  };
}

async function getWorkforceState(id: string): Promise<any> {
  return {
    entityId: id,
    currentTasks: 2,
    capacity: 0.75,
    status: 'AVAILABLE',
  };
}

async function checkSutarHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${SUTAR_DECISION_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function checkCorpIdHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.CORPID_SERVICE_URL || 'http://localhost:4702'}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export { router as salarSutarBridgeRouter };
export default router;
