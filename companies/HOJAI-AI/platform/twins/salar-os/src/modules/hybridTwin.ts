import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('hybridTwin');
/**
 * Salar OS - Hybrid Twin Module
 *
 * Digital twin representation for Human + Agent hybrid teams
 *
 * This is the differentiator - nobody else has this:
 * - Human Twin
 * - Agent Twin
 * - Hybrid Twin
 * all in one platform
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, model } from 'mongoose';
import { randomBytes } from 'crypto';

const router = Router();

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

// Hybrid Team Twin Schema
const hybridTeamTwinSchema = new Schema({
  twinId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },

  // Team Composition
  composition: {
    humans: [{
      corpId: String,
      name: String,
      role: String,           // LEAD, MEMBER, ADVISOR
      capacityAllocation: Number,  // 0-1, how much of their time
    }],
    agents: [{
      agentId: String,       // CorpID (CI-AGT-XXXXX)
      twinId: String,
      name: String,
      role: String,           // EXECUTE, SUPPORT, MONITOR
      taskAllocation: Number,  // 0-1
    }],
  },

  // Capabilities (combined)
  capabilities: [{
    capabilityId: String,
    name: String,
    providedBy: [{
      type: { type: String, enum: ['HUMAN', 'AGENT'] },
      entityId: String,
      strength: Number,    // 0-1
    }],
  }],

  // Performance State
  performance: {
    totalTasks: { type: Number, default: 0 },
    successfulTasks: { type: Number, default: 0 },
    hybridTasks: { type: Number, default: 0 },  // Tasks with both human + agent
    avgCompletionTime: Number,
    avgQuality: Number,
    humanContribution: Number,  // 0-1, % of work done by humans
    agentContribution: Number,  // 0-1, % of work done by agents
  },

  // Effectiveness Metrics
  effectiveness: {
    // Why hybrid?
    hybridAdvantage: Number,   // How much better is hybrid vs solo?
    optimalRatio: String,      // "2:1" (humans:agents)
    redundancyScore: Number,   // How many can cover if one fails?
    fallbackScore: Number,     // How well can team handle agent failures?
  },

  // Relationships
  relationships: {
    supervisor: String,         // Human who oversees
    coordinator: String,       // Who coordinates human-agent work
    escalationPath: [String],   // CorpIDs to escalate to
  },

  // Team State
  state: {
    currentTasks: Number,
    availableCapacity: Number,
    utilizationRate: Number,
    collaborationScore: Number,  // How well do humans and agents work together?
    healthStatus: { type: String, enum: ['HEALTHY', 'STRAINED', 'OVERLOADED', 'OPTIMAL'] },
  },

  // Task Patterns
  patterns: [{
    taskType: String,
    optimalConfig: {
      humans: Number,
      agents: Number,
      avgTime: Number,
      avgQuality: Number,
    },
    frequency: Number,  // How often does this pattern occur?
  }],

  // Trust & Governance
  trust: {
    humanTrustInAgent: Number,    // Humans trust agents
    agentTrustInHuman: Number,    // Agents "trust" humans
    overallTeamTrust: Number,
  },

  // Health & Status
  health: {
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'RESTRUCTURING'] },
    healthScore: Number,
    issues: [String],
    recommendations: [String],
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

hybridTeamTwinSchema.index({ 'performance.totalTasks': -1 });
hybridTeamTwinSchema.index({ 'state.healthStatus': 1 });

const HybridTeamTwin = model('HybridTeamTwin', hybridTeamTwinSchema);

// Human Twin Schema (simplified)
const humanTwinSchema = new Schema({
  twinId: { type: String, required: true, unique: true, index: true },
  corpId: { type: String, required: true, index: true },  // CI-IND-XXXXX
  name: { type: String, required: true },

  // Employment
  employment: {
    role: String,
    department: String,
    managerId: String,
    tenure: Number,  // months
  },

  // Skills & Capabilities
  skills: [{
    capabilityId: String,
    name: String,
    level: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'MASTER'] },
    confidence: Number,
  }],

  // AI Collaboration
  aiCollaboration: {
    comfortLevel: Number,    // 0-1, how comfortable with AI
    preferredTasks: [String], // Tasks they prefer to do themselves
    delegatedTasks: [String], // Tasks they delegate to AI
    trustInAI: Number,
  },

  // Performance
  performance: {
    totalTasks: { type: Number, default: 0 },
    successfulTasks: { type: Number, default: 0 },
    avgQuality: Number,
    efficiency: Number,      // Tasks per hour
    collaborationScore: Number, // How well they work with agents
  },

  // Capacity
  capacity: {
    hoursPerWeek: Number,
    availableHours: Number,
    utilizationRate: Number,
    burnoutRisk: Number,      // 0-1
  },

  // Agent Partnerships
  agentPartners: [{
    agentId: String,
    twinId: String,
    relationshipStrength: Number,  // 0-1
    tasksDelegated: Number,
    successRate: Number,
  }],

  // Health
  health: {
    status: { type: String, enum: ['ACTIVE', 'ON_LEAVE', 'OFFBOARDED'] },
    healthScore: Number,
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

humanTwinSchema.index({ corpId: 1 });
humanTwinSchema.index({ 'employment.department': 1 });

const HumanTwin = model('HumanTwin', humanTwinSchema);

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'HT'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

// ============================================================================
// HYBRID TEAM ROUTES
// ============================================================================

/**
 * Create Hybrid Team Twin
 * POST /hybrid-team
 */
router.post('/hybrid-team', async (req: Request, res: Response) => {
  try {
    const {
      name,
      humans,
      agents,
      supervisor,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name is required' },
      });
    }

    const twin = new HybridTeamTwin({
      twinId: generateId('HT'),
      name,
      composition: {
        humans: humans || [],
        agents: agents || [],
      },
      relationships: {
        supervisor,
        escalationPath: [supervisor].filter(Boolean),
      },
      state: {
        currentTasks: 0,
        availableCapacity: 1.0,
        utilizationRate: 0,
        collaborationScore: 0.5,
        healthStatus: 'HEALTHY',
      },
      effectiveness: {
        hybridAdvantage: 0,
        optimalRatio: '1:1',
        redundancyScore: 0.5,
        fallbackScore: 0.5,
      },
      trust: {
        humanTrustInAgent: 0.7,
        agentTrustInHuman: 0.9,
        overallTeamTrust: 0.8,
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
        name: twin.name,
        humans: twin.composition.humans.length,
        agents: twin.composition.agents.length,
      },
    });
  } catch (error) {
    logger.error('Error creating hybrid team:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create hybrid team' },
    });
  }
});

/**
 * Get Hybrid Team Twin
 * GET /hybrid-team/:id
 */
router.get('/hybrid-team/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const twin = await HybridTeamTwin.findOne({ twinId: id }).lean();

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Hybrid Team not found' },
      });
    }

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    logger.error('Error fetching hybrid team:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch hybrid team' },
    });
  }
});

/**
 * Find optimal hybrid team for task
 * POST /hybrid-team/find-optimal
 */
router.post('/hybrid-team/find-optimal', async (req: Request, res: Response) => {
  try {
    const {
      taskType,
      requiredCapabilities,
      deadline,
      budget,
      preferHuman,
    } = req.body;

    // Get all hybrid teams
    const teams = await HybridTeamTwin.find({ 'health.status': 'ACTIVE' }).lean();

    // Score each team
    const scored = teams.map(team => {
      let score = 0;
      const matchedCapabilities = [];

      // Capability match
      if (requiredCapabilities) {
        for (const cap of requiredCapabilities) {
          const match = team.capabilities?.find(c =>
            c.name?.toLowerCase().includes(cap.toLowerCase())
          );
          if (match) {
            matchedCapabilities.push(cap);
            score += 15;
          }
        }
        // Penalty for missing capabilities
        score -= (requiredCapabilities.length - matchedCapabilities.length) * 10;
      }

      // Team health
      score += (team.state?.collaborationScore || 0.5) * 20;

      // Capacity
      score += (team.state?.availableCapacity || 0) * 15;

      // Budget (if agents have cost)
      if (budget) {
        const estimatedCost = (team.composition?.agents?.length || 0) * 0.02; // Placeholder
        if (estimatedCost <= budget) score += 10;
        else score -= 20;
      }

      // Preference for human-heavy teams
      if (preferHuman) {
        const humanRatio = (team.composition?.humans?.length || 0) /
          ((team.composition?.humans?.length || 0) + (team.composition?.agents?.length || 0) || 1);
        score += humanRatio * 10;
      }

      return {
        twinId: team.twinId,
        name: team.name,
        score: Math.round(score * 100) / 100,
        matchedCapabilities,
        capabilityCoverage: requiredCapabilities?.length
          ? matchedCapabilities.length / requiredCapabilities.length
          : 1,
        composition: team.composition,
        health: team.state?.healthStatus,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: {
        optimal: scored[0] || null,
        alternatives: scored.slice(1, 5),
        total: scored.length,
      },
    });
  } catch (error) {
    logger.error('Error finding optimal team:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to find optimal team' },
    });
  }
});

/**
 * Assign task to hybrid team
 * POST /hybrid-team/:id/task
 */
router.post('/hybrid-team/:id/task', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { taskId, taskType, humanContribution, agentContribution } = req.body;

    const team = await HybridTeamTwin.findOne({ twinId: id });
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Hybrid Team not found' },
      });
    }

    // Update state
    team.state.currentTasks++;
    team.state.utilizationRate = Math.min(1, team.state.currentTasks / 10); // Placeholder

    // Update performance
    team.performance.totalTasks++;
    if (humanContribution && agentContribution) {
      team.performance.hybridTasks++;
      team.performance.humanContribution =
        (team.performance.humanContribution * 0.9 + humanContribution * 0.1);
      team.performance.agentContribution =
        (team.performance.agentContribution * 0.9 + agentContribution * 0.1);
    }

    team.updatedAt = new Date();
    await team.save();

    res.json({
      success: true,
      data: {
        twinId: team.twinId,
        taskId,
        state: team.state,
      },
    });
  } catch (error) {
    logger.error('Error assigning task:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to assign task' },
    });
  }
});

/**
 * Get all hybrid teams
 * GET /hybrid-team
 */
router.get('/hybrid-team', async (req: Request, res: Response) => {
  try {
    const { status, sortBy } = req.query;

    const filter: any = {};
    if (status) filter['health.status'] = status;

    let sort: any = { 'performance.totalTasks': -1 };
    if (sortBy === 'health') sort = { 'health.healthScore': -1 };
    if (sortBy === 'collaboration') sort = { 'state.collaborationScore': -1 };

    const teams = await HybridTeamTwin.find(filter).sort(sort).lean();

    res.json({
      success: true,
      data: {
        items: teams.map(t => ({
          twinId: t.twinId,
          name: t.name,
          humans: t.composition?.humans?.length || 0,
          agents: t.composition?.agents?.length || 0,
          performance: t.performance,
          health: t.health?.status,
          collaboration: t.state?.collaborationScore,
        })),
        total: teams.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching hybrid teams:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch hybrid teams' },
    });
  }
});

// ============================================================================
// HUMAN TWIN ROUTES
// ============================================================================

/**
 * Create Human Twin
 * POST /human-twin
 */
router.post('/human-twin', async (req: Request, res: Response) => {
  try {
    const {
      corpId,
      name,
      role,
      department,
      managerId,
      skills,
    } = req.body;

    if (!corpId || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'corpId and name are required' },
      });
    }

    const existing = await HumanTwin.findOne({ corpId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Human Twin already exists' },
      });
    }

    const twin = new HumanTwin({
      twinId: generateId('HU'),
      corpId,
      name,
      employment: {
        role,
        department,
        managerId,
        tenure: 0,
      },
      skills: skills || [],
      aiCollaboration: {
        comfortLevel: 0.5,
        trustInAI: 0.5,
      },
      performance: {
        totalTasks: 0,
        successfulTasks: 0,
      },
      capacity: {
        hoursPerWeek: 40,
        availableHours: 40,
        utilizationRate: 0,
        burnoutRisk: 0,
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
        corpId: twin.corpId,
        name: twin.name,
      },
    });
  } catch (error) {
    logger.error('Error creating human twin:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create human twin' },
    });
  }
});

/**
 * Get Human Twin
 * GET /human-twin/:id
 */
router.get('/human-twin/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Try by corpId first
    let twin = await HumanTwin.findOne({ corpId: id }).lean();
    if (!twin) {
      // Try by twinId
      twin = await HumanTwin.findOne({ twinId: id }).lean();
    }

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Human Twin not found' },
      });
    }

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    logger.error('Error fetching human twin:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch human twin' },
    });
  }
});

/**
 * Update Human Twin
 * PATCH /human-twin/:id
 */
router.patch('/human-twin/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const twin = await HumanTwin.findOneAndUpdate(
      { $or: [{ corpId: id }, { twinId: id }] },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Human Twin not found' },
      });
    }

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    logger.error('Error updating human twin:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update human twin' },
    });
  }
});

/**
 * Delegate task to AI
 * POST /human-twin/:id/delegate
 */
router.post('/human-twin/:id/delegate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentId, taskId, taskDescription } = req.body;

    const twin = await HumanTwin.findOne({ $or: [{ corpId: id }, { twinId: id }] });
    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Human Twin not found' },
      });
    }

    // Add/update agent partnership
    const existingPartner = twin.agentPartners?.find(p => p.agentId === agentId);
    if (existingPartner) {
      existingPartner.tasksDelegated++;
    } else {
      if (!twin.agentPartners) twin.agentPartners = [];
      twin.agentPartners.push({
        agentId,
        relationshipStrength: 0.5,
        tasksDelegated: 1,
        successRate: 0,
      });
    }

    twin.aiCollaboration.delegatedTasks.push(taskDescription);
    twin.updatedAt = new Date();
    await twin.save();

    res.json({
      success: true,
      data: {
        twinId: twin.twinId,
        delegatedTo: agentId,
        totalDelegated: twin.agentPartners.reduce((sum, p) => sum + p.tasksDelegated, 0),
      },
    });
  } catch (error) {
    logger.error('Error delegating task:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delegate task' },
    });
  }
});

/**
 * Get all human twins
 * GET /human-twin
 */
router.get('/human-twin', async (req: Request, res: Response) => {
  try {
    const { department, status, aiComfort } = req.query;

    const filter: any = {};
    if (department) filter['employment.department'] = department;
    if (status) filter['health.status'] = status;
    if (aiComfort) {
      filter['aiCollaboration.comfortLevel'] = { $gte: parseFloat(aiComfort as string) };
    }

    const twins = await HumanTwin.find(filter)
      .sort({ 'performance.successfulTasks': -1 })
      .lean();

    res.json({
      success: true,
      data: {
        items: twins.map(t => ({
          twinId: t.twinId,
          corpId: t.corpId,
          name: t.name,
          role: t.employment?.role,
          department: t.employment?.department,
          aiComfort: t.aiCollaboration?.comfortLevel,
          agentPartners: t.agentPartners?.length || 0,
          performance: t.performance,
          health: t.health?.status,
        })),
        total: twins.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching human twins:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch human twins' },
    });
  }
});

// ============================================================================
// WORKFORCE TWIN NETWORK
// ============================================================================

/**
 * Get complete Workforce Twin Network
 * GET /network
 */
router.get('/network', async (req: Request, res: Response) => {
  try {
    const [humanTwins, agentTwins, hybridTeams] = await Promise.all([
      HumanTwin.find({ 'health.status': 'ACTIVE' }).lean(),
      // Would query AgentTwin collection
      [],
      HybridTeamTwin.find({ 'health.status': 'ACTIVE' }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          humans: humanTwins.length,
          agents: 0, // Would come from AgentTwin
          hybridTeams: hybridTeams.length,
          totalEntities: humanTwins.length + hybridTeams.length,
        },
        capabilities: {
          // Would aggregate from HumanTwin + AgentTwin
          totalSkills: humanTwins.reduce((sum, t) => sum + (t.skills?.length || 0), 0),
        },
        collaboration: {
          avgAIComfort: humanTwins.reduce((sum, t) => sum + (t.aiCollaboration?.comfortLevel || 0), 0) / (humanTwins.length || 1),
          totalDelegations: humanTwins.reduce((sum, t) => sum + (t.agentPartners?.reduce((s, p) => s + p.tasksDelegated, 0) || 0), 0),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching network:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch network' },
    });
  }
});

/**
 * Simulation: What if we add more agents?
 * POST /network/simulate
 */
router.post('/network/simulate', async (req: Request, res: Response) => {
  try {
    const { scenario, addAgents, removeAgents, addHumans } = req.body;

    const simulation = {
      scenario,
      changes: {
        agentsAdded: addAgents || 0,
        agentsRemoved: removeAgents || 0,
        humansAdded: addHumans || 0,
      },
      impacts: {
        capacityChange: 0,
        costChange: 0,
        collaborationImpact: 0,
      },
      recommendations: [] as string[],
    };

    // Calculate capacity impact
    if (addAgents) {
      simulation.impacts.capacityChange += addAgents * 0.5; // Each agent adds 50% capacity
      simulation.impacts.costChange += addAgents * 0.02; // Each agent costs ~$0.02/task
    }

    // Generate recommendations
    if (simulation.impacts.capacityChange > 0.5) {
      simulation.recommendations.push('Consider restructuring hybrid teams');
    }
    if (simulation.impacts.costChange > 0.1) {
      simulation.recommendations.push('Review agent cost allocation');
    }

    res.json({
      success: true,
      data: simulation,
    });
  } catch (error) {
    logger.error('Error simulating:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to simulate' },
    });
  }
});

export {
  router as hybridTwinRouter,
  HybridTeamTwin,
  HumanTwin,
};
export default router;
