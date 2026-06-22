/**
 * Salar OS - Integration Scripts
 *
 * Scripts to connect:
 * 1. CorpPerks employees to Human Twins
 * 2. Marketplace agents to Agent Registry
 * 3. AI Employees to Agent Registry
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ============================================================================
// CORPPERKS EMPLOYEE INTEGRATION
// ============================================================================

/**
 * Sync CorpPerks employees to Human Twins
 * POST /integrations/corpperks/sync
 */
router.post('/integrations/corpperks/sync', async (req: Request, res: Response) => {
  try {
    const { employees } = req.body;

    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'employees array required' },
      });
    }

    const { HumanTwin } = await import('./hybridTwin.js');
    const { CapabilityMapping } = await import('./capabilityRegistry.js');

    const result = {
      success: 0,
      skipped: 0,
      failed: 0,
    };

    for (const emp of employees) {
      try {
        // Check if already exists
        const existing = await HumanTwin.findOne({ corpId: emp.corpId });
        if (existing) {
          result.skipped++;
          continue;
        }

        // Create Human Twin
        const twin = new HumanTwin({
          twinId: `HU-${emp.corpId.split('-').pop()}`,
          corpId: emp.corpId,
          name: `${emp.firstName} ${emp.lastName}`,
          employment: {
            role: emp.designation || 'Employee',
            department: emp.department || 'General',
            managerId: emp.managerId,
            tenure: 0,
          },
          aiCollaboration: {
            comfortLevel: 0.5,
            trustInAI: 0.5,
            preferredTasks: [],
            delegatedTasks: [],
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

        // Create skill mappings
        if (emp.skills && Array.isArray(emp.skills)) {
          for (const skill of emp.skills) {
            const mapping = new CapabilityMapping({
              mappingId: `MAP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              capabilityId: skill.skillId || skill,
              entityType: 'HUMAN',
              entityId: emp.corpId,
              level: skill.level || 'INTERMEDIATE',
              metrics: {
                confidence: skill.confidence || 0.5,
                evidenceCount: 0,
                lastVerified: new Date(),
              },
              status: 'ACTIVE',
            });
            await mapping.save();
          }
        }

        result.success++;
      } catch (error) {
        result.failed++;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTEGRATION_ERROR', message: error.message },
    });
  }
});

/**
 * Sync all CorpPerks employees (from CorpPerks API)
 * POST /integrations/corpperks/sync-all
 */
router.post('/integrations/corpperks/sync-all', async (req: Request, res: Response) => {
  try {
    const CORPPERKS_URL = process.env.CORPPERKS_URL || 'http://localhost:4006';
    const { employees } = req.body;

    if (!employees) {
      // Fetch from CorpPerks API
      const response = await fetch(`${CORPPERKS_URL}/api/employees`, {
        headers: {
          'x-internal-token': process.env.INTERNAL_TOKEN,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch employees from CorpPerks');
      }

      const data = await response.json();
      // Handle the response format
      const empList = data.data || data.employees || data.items || [];
      req.body.employees = empList;
    }

    // Delegate to sync endpoint
    return router.handle(req, res);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTEGRATION_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// MARKETPLACE INTEGRATION
// ============================================================================

/**
 * Sync marketplace agents to Agent Registry
 * POST /integrations/marketplace/sync
 */
router.post('/integrations/marketplace/sync', async (req: Request, res: Response) => {
  try {
    const { agents } = req.body;

    if (!agents || !Array.isArray(agents)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'agents array required' },
      });
    }

    const { AgentTwin } = await import('./agentTwin.js');

    const result = {
      success: 0,
      skipped: 0,
      failed: 0,
    };

    for (const agent of agents) {
      try {
        // Check if already exists
        const existing = await AgentTwin.findOne({ agentId: agent.corpId });
        if (existing) {
          result.skipped++;
          continue;
        }

        // Create Agent Twin
        const twin = new AgentTwin({
          twinId: `TWIN-${agent.corpId.split('-').pop()}`,
          agentId: agent.corpId,
          name: agent.name,
          identity: {
            type: 'SPECIALIZED',
            version: '1.0.0',
            description: agent.description || `${agent.name} agent`,
            owner: 'CI-ORG-HOAJAI',
            department: agent.industry || 'General',
            createdAt: new Date(),
          },
          capabilities: (agent.capabilities || []).map((c: string) => ({
            name: c,
            level: 'INTERMEDIATE',
            confidence: 0.5,
          })),
          performance: {
            totalTasks: 0,
            successfulTasks: 0,
            failedTasks: 0,
            successRate: 0,
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
            hoursAvailable: 168,
          },
          cost: {
            perTask: agent.pricePerTask || 0.01,
            perHour: agent.pricePerMonth ? agent.pricePerMonth / 160 : 0.05,
            monthlyBudget: 0,
            monthlySpend: 0,
            currency: 'INR',
          },
          health: {
            status: 'ACTIVE',
            healthScore: 1.0,
            issues: [],
            recommendations: [],
          },
        });

        await twin.save();
        result.success++;
      } catch (error) {
        result.failed++;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTEGRATION_ERROR', message: error.message },
    });
  }
});

/**
 * Sync from HOJAI Marketplace (port 4860)
 * POST /integrations/marketplace/sync-4860
 */
router.post('/integrations/marketplace/sync-4860', async (req: Request, res: Response) => {
  try {
    const MARKETPLACE_URL = process.env.MARKETPLACE_URL || 'http://localhost:4860';

    // Fetch agents from marketplace
    const response = await fetch(`${MARKETPLACE_URL}/api/agents`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from marketplace');
    }

    const data = await response.json();
    const agents = data.data || data.agents || [];

    // Transform and sync
    const transformedAgents = agents.map((agent: any) => ({
      corpId: `CI-AGT-MKT-${agent.id || agent.agentId}`,
      name: agent.name || agent.templateName,
      description: agent.description || agent.templateDescription,
      industry: agent.industry,
      capabilities: agent.capabilities || agent.skills || [],
      pricePerTask: agent.pricing?.perTask || 0.01,
      pricePerMonth: agent.pricing?.monthly || 0,
    }));

    // Delegate to sync endpoint
    req.body.agents = transformedAgents;
    return router.handle(req, res);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'MARKETPLACE_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// HYBRID TEAM CREATION
// ============================================================================

/**
 * Create hybrid team from humans and agents
 * POST /integrations/hybrid-team
 */
router.post('/integrations/hybrid-team', async (req: Request, res: Response) => {
  try {
    const { name, humans, agents, supervisor, orgId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name is required' },
      });
    }

    const { HybridTeamTwin } = await import('./hybridTwin.js');

    const twin = new HybridTeamTwin({
      twinId: `HT-${Date.now()}`,
      name,
      composition: {
        humans: humans || [],
        agents: agents || [],
      },
      relationships: {
        supervisor,
        escalationPath: supervisor ? [supervisor] : [],
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
        optimalRatio: `${humans?.length || 0}:${agents?.length || 0}`,
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
        humans: humans?.length || 0,
        agents: agents?.length || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTEGRATION_ERROR', message: error.message },
    });
  }
});

/**
 * Auto-create hybrid teams based on capability matching
 * POST /integrations/hybrid-team/auto
 */
router.post('/integrations/hybrid-team/auto', async (req: Request, res: Response) => {
  try {
    const { capability, orgId } = req.body;

    if (!capability) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'capability is required' },
      });
    }

    const { HumanTwin, AgentTwin, HybridTeamTwin } = await import('./hybridTwin.js');

    // Find humans with this capability
    const humans = await HumanTwin.find({
      'skills.name': { $regex: capability, $options: 'i' },
      'health.status': 'ACTIVE',
    }).limit(3).lean();

    // Find agents with this capability
    const agents = await AgentTwin.find({
      'capabilities.name': { $regex: capability, $options: 'i' },
      'health.status': 'ACTIVE',
    }).limit(3).lean();

    if (humans.length === 0 && agents.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No matching humans or agents found' },
      });
    }

    // Create hybrid team
    const twin = new HybridTeamTwin({
      twinId: `HT-${Date.now()}`,
      name: `${capability} Hybrid Team`,
      composition: {
        humans: humans.map(h => ({
          corpId: h.corpId,
          name: h.name,
          role: 'MEMBER',
        })),
        agents: agents.map(a => ({
          agentId: a.agentId,
          name: a.name,
          role: 'EXECUTE',
        })),
      },
      relationships: {
        supervisor: humans[0]?.corpId,
        escalationPath: humans[0]?.corpId ? [humans[0].corpId] : [],
      },
      state: {
        currentTasks: 0,
        availableCapacity: 1.0,
        utilizationRate: 0,
        collaborationScore: 0.5,
        healthStatus: 'HEALTHY',
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
        humans: humans.length,
        agents: agents.length,
        capability,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTEGRATION_ERROR', message: error.message },
    });
  }
});

// ============================================================================
// NETWORK STATUS
// ============================================================================

/**
 * Get full network status
 * GET /integrations/network
 */
router.get('/integrations/network', async (_req: Request, res: Response) => {
  try {
    const { HumanTwin, HybridTeamTwin } = await import('./hybridTwin.js');
    const { AgentTwin } = await import('./agentTwin.js');
    const { Capability, CapabilityMapping } = await import('./capabilityRegistry.js');

    const [
      humanCount,
      agentCount,
      hybridCount,
      capabilityCount,
      humanMappings,
      agentMappings,
    ] = await Promise.all([
      HumanTwin.countDocuments({ 'health.status': 'ACTIVE' }),
      AgentTwin.countDocuments({ 'health.status': 'ACTIVE' }),
      HybridTeamTwin.countDocuments({ 'health.status': 'ACTIVE' }),
      Capability.countDocuments(),
      CapabilityMapping.countDocuments({ entityType: 'HUMAN', status: 'ACTIVE' }),
      CapabilityMapping.countDocuments({ entityType: 'AGENT', status: 'ACTIVE' }),
    ]);

    res.json({
      success: true,
      data: {
        network: {
          status: 'ACTIVE',
          entities: {
            humans: humanCount,
            agents: agentCount,
            hybridTeams: hybridCount,
            total: humanCount + agentCount + hybridCount,
          },
          capabilities: {
            defined: capabilityCount,
            humanMappings,
            agentMappings,
            totalMappings: humanMappings + agentMappings,
          },
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'NETWORK_ERROR', message: error.message },
    });
  }
});

export { router as integrationRouter };
export default router;
