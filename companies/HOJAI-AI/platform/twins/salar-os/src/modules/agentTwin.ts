import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('agentTwin');
/**
 * Salar OS - Agent Twin Module
 *
 * Digital twin representation for AI agents
 *
 * This is the missing piece - the Agent Twin layer that makes:
 * - Human + Agent + Hybrid workforce possible
 * - Workforce simulation possible
 * - Autonomous execution possible
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, model } from 'mongoose';
import { randomBytes } from 'crypto';

const router = Router();

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

// Agent Twin Schema
const agentTwinSchema = new Schema({
  twinId: { type: String, required: true, unique: true, index: true },
  agentId: { type: String, required: true, index: true },  // CorpID (CI-AGT-XXXXX)
  name: { type: String, required: true },

  // Core Identity
  identity: {
    type: { type: String, enum: ['SPECIALIZED', 'GENERALIST', 'ORCHESTRATOR'] },
    version: String,
    description: String,
    owner: String,  // CorpID of owner
    department: String,
    createdAt: Date,
  },

  // Capabilities (from Capability Registry)
  capabilities: [{
    capabilityId: String,
    name: String,
    level: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'MASTER'] },
    confidence: Number,
    evidenceCount: Number,
  }],

  // Performance State (real-time)
  performance: {
    totalTasks: { type: Number, default: 0 },
    successfulTasks: { type: Number, default: 0 },
    failedTasks: { type: Number, default: 0 },
    successRate: Number,
    avgResponseTime: Number,       // ms
    avgAccuracy: Number,           // 0-1
    avgQuality: Number,            // 0-1
    totalCost: Number,
    totalRevenue: Number,
    lastTaskAt: Date,
    lastErrorAt: Date,
    uptimePercent: Number,
  },

  // Trust State
  trust: {
    overallScore: Number,          // 0-1
    humanRating: Number,          // 0-5
    humanRatings: [{
      rating: Number,
      comment: String,
      ratedBy: String,
      ratedAt: Date,
    }],
    automatedScore: Number,
    verificationLevel: Number,    // 0-5
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    lastVerified: Date,
  },

  // Capacity State
  capacity: {
    maxConcurrentTasks: Number,
    currentTasks: { type: Number, default: 0 },
    availableCapacity: Number,    // 0-1
    hoursAvailable: Number,
    schedule: mongoose.Schema.Types.Mixed,
  },

  // Cost State
  cost: {
    perTask: Number,
    perHour: Number,
    perToken: Number,
    monthlyBudget: Number,
    monthlySpend: Number,
    currency: { type: String, default: 'USD' },
  },

  // Relationships
  relationships: [{
    type: { type: String, enum: ['OWNS', 'MANAGES', 'USES', 'DELEGATES_TO', 'COORDINATES_WITH', 'REPLACES'] },
    targetTwinId: String,
    targetAgentId: String,
    strength: Number,
    since: Date,
  }],

  // Human-Team Assignment
  team: {
    teamId: String,
    teamName: String,
    humanManager: String,        // CorpID of human manager
    collaborationMode: { type: String, enum: ['AUTONOMOUS', 'SUPERVISED', 'HYBRID'] },
  },

  // Hybrid Capabilities
  hybridStrengths: [{
    withHuman: String,          // What this agent does better with humans
    scenario: String,
    effectiveness: Number,    // 0-1
  }],

  // Health & Status
  health: {
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'DEGRADED', 'MAINTENANCE', 'DEPRECATED'] },
    healthScore: Number,       // 0-1
    issues: [String],
    recommendations: [String],
  },

  // Learning State
  learning: {
    lastLearned: Date,
    skillsImproved: [String],
    patternsLearned: Number,
    accuracyImprovement: Number,
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

agentTwinSchema.index({ 'performance.totalTasks': -1 });
agentTwinSchema.index({ 'trust.overallScore': -1 });
agentTwinSchema.index({ 'health.status': 1 });
agentTwinSchema.index({ 'identity.type': 1 });

const AgentTwin = model('AgentTwin', agentTwinSchema);

// Agent Interaction Log
const interactionLogSchema = new Schema({
  logId: { type: String, required: true, unique: true, index: true },
  twinId: { type: String, required: true, index: true },
  agentId: { type: String, required: true },

  // Interaction details
  type: { type: String, enum: ['TASK', 'HANDOVER', 'COLLABORATION', 'FEEDBACK', 'ERROR'] },
  task: {
    taskId: String,
    description: String,
    requiredCapabilities: [String],
    outcome: { type: String, enum: ['SUCCESS', 'PARTIAL', 'FAILED'] },
  },

  // Performance
  performance: {
    duration: Number,           // ms
    quality: Number,          // 0-1
    accuracy: Number,         // 0-1
    cost: Number,
  },

  // Context
  context: {
    humanInvolved: Boolean,
    humanId: String,
    teamId: String,
    sessionId: String,
  },

  // Feedback
  feedback: {
    provided: Boolean,
    rating: Number,
    comment: String,
  },

  // Timestamps
  startedAt: Date,
  completedAt: Date,
}, { timestamps: true });

interactionLogSchema.index({ twinId: 1, createdAt: -1 });
interactionLogSchema.index({ 'task.outcome': 1 });

const InteractionLog = model('InteractionLog', interactionLogSchema);

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'AGT'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Create Agent Twin
 * POST /agent-twin
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      agentId,
      name,
      type,
      version,
      description,
      owner,
      department,
      capabilities,
    } = req.body;

    if (!agentId || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'agentId and name are required' },
      });
    }

    // Check if already exists
    const existing = await AgentTwin.findOne({ agentId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Agent Twin already exists' },
      });
    }

    const twin = new AgentTwin({
      twinId: generateId('TWIN'),
      agentId,
      name,
      identity: {
        type: type || 'SPECIALIZED',
        version,
        description,
        owner,
        department,
        createdAt: new Date(),
      },
      capabilities: capabilities || [],
      performance: {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
      },
      trust: {
        overallScore: 0.5,
        humanRating: 0,
        automatedScore: 0.5,
        verificationLevel: 0,
        riskLevel: 'LOW',
      },
      capacity: {
        maxConcurrentTasks: 5,
        currentTasks: 0,
        availableCapacity: 1.0,
        hoursAvailable: 24 * 7,
      },
      health: {
        status: 'ACTIVE',
        healthScore: 1.0,
      },
    });

    await twin.save();

    res.status(201).json({
      success: true,
      data: {
        twinId: twin.twinId,
        agentId: twin.agentId,
        name: twin.name,
      },
    });
  } catch (error) {
    logger.error('Error creating agent twin:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create agent twin' },
    });
  }
});

/**
 * Get Agent Twin by agentId
 * GET /agent-twin/:agentId
 */
router.get('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const twin = await AgentTwin.findOne({ agentId }).lean();

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent Twin not found' },
      });
    }

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    logger.error('Error fetching agent twin:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch agent twin' },
    });
  }
});

/**
 * Update Agent Twin
 * PATCH /agent-twin/:agentId
 */
router.patch('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;

    const twin = await AgentTwin.findOneAndUpdate(
      { agentId },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent Twin not found' },
      });
    }

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    logger.error('Error updating agent twin:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update agent twin' },
    });
  }
});

/**
 * Record task completion
 * POST /agent-twin/:agentId/task
 */
router.post('/:agentId/task', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const {
      taskId,
      description,
      outcome,
      duration,
      quality,
      accuracy,
      cost,
      humanInvolved,
      humanId,
    } = req.body;

    const twin = await AgentTwin.findOne({ agentId });
    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent Twin not found' },
      });
    }

    // Update performance
    twin.performance.totalTasks++;
    if (outcome === 'SUCCESS') twin.performance.successfulTasks++;
    if (outcome === 'FAILED') twin.performance.failedTasks++;

    twin.performance.successRate = twin.performance.successfulTasks / twin.performance.totalTasks;
    twin.performance.totalCost += cost || 0;

    // Update capacity
    twin.capacity.currentTasks = Math.max(0, twin.capacity.currentTasks - 1);
    twin.capacity.availableCapacity = 1 - (twin.capacity.currentTasks / twin.capacity.maxConcurrentTasks);

    twin.performance.lastTaskAt = new Date();
    twin.updatedAt = new Date();

    await twin.save();

    // Log interaction
    const log = new InteractionLog({
      logId: generateId('LOG'),
      twinId: twin.twinId,
      agentId,
      type: 'TASK',
      task: {
        taskId,
        description,
        outcome,
      },
      performance: {
        duration,
        quality,
        accuracy,
        cost,
      },
      context: {
        humanInvolved,
        humanId,
      },
      startedAt: new Date(Date.now() - (duration || 0)),
      completedAt: new Date(),
    });

    await log.save();

    res.json({
      success: true,
      data: {
        twinId: twin.twinId,
        performance: twin.performance,
        capacity: twin.capacity,
      },
    });
  } catch (error) {
    logger.error('Error recording task:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record task' },
    });
  }
});

/**
 * Get agent performance metrics
 * GET /agent-twin/:agentId/metrics
 */
router.get('/:agentId/metrics', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { period } = req.query;

    const twin = await AgentTwin.findOne({ agentId }).lean();
    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent Twin not found' },
      });
    }

    // Get recent interactions
    const timeFilter: any = {};
    if (period) {
      const periods: Record<string, number> = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      timeFilter.createdAt = { $gte: new Date(Date.now() - (periods[period as string] || periods.month)) };
    }

    const recentLogs = await InteractionLog.find({
      agentId,
      ...timeFilter,
    }).lean();

    const total = recentLogs.length;
    const successful = recentLogs.filter(l => l.task?.outcome === 'SUCCESS').length;
    const failed = recentLogs.filter(l => l.task?.outcome === 'FAILED').length;
    const avgDuration = total > 0
      ? recentLogs.reduce((sum, l) => sum + (l.performance?.duration || 0), 0) / total
      : 0;
    const avgQuality = total > 0
      ? recentLogs.filter(l => l.performance?.quality).reduce((sum, l) => sum + (l.performance?.quality || 0), 0) / total
      : 0;
    const totalCost = recentLogs.reduce((sum, l) => sum + (l.performance?.cost || 0), 0);

    res.json({
      success: true,
      data: {
        twinId: twin.twinId,
        agentId: twin.agentId,
        name: twin.name,
        period: period || 'all',
        performance: {
          totalTasks: total,
          successfulTasks: successful,
          failedTasks: failed,
          successRate: total > 0 ? successful / total : 0,
          avgDurationMs: Math.round(avgDuration),
          avgQuality: Math.round(avgQuality * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
        },
        trust: twin.trust,
        capacity: twin.capacity,
        health: twin.health,
      },
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch metrics' },
    });
  }
});

/**
 * Get all agent twins
 * GET /agent-twin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, sortBy } = req.query;

    const filter: any = {};
    if (status) filter['health.status'] = status;
    if (type) filter['identity.type'] = type;

    let sort: any = { 'performance.totalTasks': -1 };
    if (sortBy === 'trust') sort = { 'trust.overallScore': -1 };
    if (sortBy === 'health') sort = { 'health.healthScore': -1 };

    const twins = await AgentTwin.find(filter).sort(sort).lean();

    res.json({
      success: true,
      data: {
        items: twins.map(t => ({
          twinId: t.twinId,
          agentId: t.agentId,
          name: t.name,
          type: t.identity?.type,
          status: t.health?.status,
          performance: {
            totalTasks: t.performance?.totalTasks,
            successRate: t.performance?.successRate,
          },
          trust: t.trust?.overallScore,
          health: t.health?.healthScore,
        })),
        total: twins.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching agent twins:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch agent twins' },
    });
  }
});

/**
 * Find best agents for task
 * POST /agent-twin/find
 */
router.post('/find', async (req: Request, res: Response) => {
  try {
    const { capabilities, minTrust, maxCost, preferType, allowHybrid } = req.body;

    // Get all active agents
    const agents = await AgentTwin.find({
      'health.status': 'ACTIVE',
    }).lean();

    // Score each agent
    const scored = agents.map(agent => {
      let score = 0;
      const matchedCapabilities = [];

      // Capability matching
      if (capabilities && capabilities.length > 0) {
        for (const cap of capabilities) {
          const match = agent.capabilities?.find(
            c => c.name?.toLowerCase().includes(cap.toLowerCase()) ||
                 c.capabilityId?.toLowerCase().includes(cap.toLowerCase())
          );
          if (match) {
            matchedCapabilities.push(match);
            score += (match.confidence || 0.5) * 20;
          }
        }
        score -= capabilities.length * 5; // Penalty for missing capabilities
      }

      // Trust factor
      score += (agent.trust?.overallScore || 0.5) * 15;

      // Performance factor
      score += (agent.performance?.successRate || 0.5) * 10;

      // Cost factor (lower is better)
      if (maxCost && agent.cost?.perTask) {
        if (agent.cost.perTask <= maxCost) {
          score += 10 * (1 - agent.cost.perTask / maxCost);
        } else {
          score -= 20;
        }
      }

      // Type preference
      if (preferType && agent.identity?.type === preferType) {
        score += 15;
      }

      // Availability
      score += (agent.capacity?.availableCapacity || 0) * 5;

      return {
        twinId: agent.twinId,
        agentId: agent.agentId,
        name: agent.name,
        type: agent.identity?.type,
        score: Math.round(score * 100) / 100,
        matchedCapabilities,
        trust: agent.trust?.overallScore,
        performance: agent.performance,
        cost: agent.cost,
        capacity: agent.capacity,
      };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Hybrid recommendation
    let hybridRecommendation = null;
    if (allowHybrid && scored.length >= 2) {
      const best = scored[0];
      const bestHuman = { name: 'Human Manager', type: 'HUMAN' }; // Would query human registry
      hybridRecommendation = {
        description: 'Hybrid team recommended for optimal results',
        agent: best,
        human: bestHuman,
        reason: 'Agent handles tasks, human provides oversight',
      };
    }

    res.json({
      success: true,
      data: {
        agents: scored.slice(0, 10),
        total: scored.length,
        hybridRecommendation,
      },
    });
  } catch (error) {
    logger.error('Error finding agents:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to find agents' },
    });
  }
});

/**
 * Add relationship
 * POST /agent-twin/:agentId/relationship
 */
router.post('/:agentId/relationship', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { type, targetAgentId, strength } = req.body;

    const twin = await AgentTwin.findOne({ agentId });
    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent Twin not found' },
      });
    }

    twin.relationships.push({
      type,
      targetAgentId,
      strength: strength || 0.5,
      since: new Date(),
    });

    await twin.save();

    res.json({
      success: true,
      data: {
        relationshipCount: twin.relationships.length,
      },
    });
  } catch (error) {
    logger.error('Error adding relationship:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add relationship' },
    });
  }
});

/**
 * Get health status
 * GET /agent-twin/health
 */
router.get('/health/summary', async (req: Request, res: Response) => {
  try {
    const [byStatus, avgMetrics] = await Promise.all([
      AgentTwin.aggregate([
        { $group: { _id: '$health.status', count: { $sum: 1 } } },
      ]),
      AgentTwin.aggregate([
        {
          $group: {
            _id: null,
            avgHealth: { $avg: '$health.healthScore' },
            avgTrust: { $avg: '$trust.overallScore' },
            avgSuccessRate: { $avg: '$performance.successRate' },
            totalTasks: { $sum: '$performance.totalTasks' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        avgMetrics: avgMetrics[0] || null,
      },
    });
  } catch (error) {
    logger.error('Error fetching health:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch health' },
    });
  }
});

/**
 * Simulation: What if agent is removed?
 * GET /agent-twin/simulate/:agentId/impact
 */
router.get('/simulate/:agentId/impact', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const twin = await AgentTwin.findOne({ agentId }).lean();
    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent Twin not found' },
      });
    }

    // Calculate impact
    const impact = {
      capabilitiesLost: twin.capabilities?.map(c => c.name) || [],
      avgTasksPerWeek: twin.performance?.totalTasks || 0,
      costReplaced: twin.cost?.perTask || 0,
      trustImpact: twin.trust?.overallScore || 0.5,

      // Find replacement candidates
      replacementCandidates: await AgentTwin.find({
        agentId: { $ne: agentId },
        'health.status': 'ACTIVE',
        'capabilities.name': { $in: twin.capabilities?.map(c => c.name) || [] },
      }).limit(3).lean(),

      // Calculate capacity gap
      capacityGap: twin.capacity?.currentTasks || 0,
    };

    res.json({
      success: true,
      data: impact,
    });
  } catch (error) {
    logger.error('Error simulating impact:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to simulate impact' },
    });
  }
});

export { router as agentTwinRouter, AgentTwin, InteractionLog };
export default router;
