import { createLogger } from '@rtmn/shared/lib/logger';

const logger = createLogger('salar-sutar-integration');
/**
 * Salar OS - Sutar Decision Engine Integration
 *
 * Bridges Salar's workforce intelligence to Sutar's autonomous decision-making
 *
 * Flow:
 * Sutar needs workforce → Salar provides recommendations → Sutar decides → Execution
 *
 * NOTE: This module is currently ORPHANED — not imported by src/index.ts.
 * It is kept here for reference; the active SUTAR bridge is modules/salarSutarBridge.ts.
 */

import express, { Request, Response } from 'express';

// Sutar Decision Engine URL
const SUTAR_URL = process.env.SUTAR_URL || 'http://localhost:4240';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

/**
 * Salar-Sutar Integration Routes
 */
export function salarSutarRoutes(app: express.Express) {

  // ========================================================================
  // WORKFORCE DECISION ENDPOINTS
  // ========================================================================

  /**
   * POST /sutar/workforce-decision
   *
   * Called by Sutar when it needs workforce intelligence for a decision.
   *
   * Input: Decision context from Sutar
   * Output: Workforce recommendations
   */
  app.post('/sutar/workforce-decision', async (req: Request, res: Response) => {
    try {
      const {
        decisionId,
        decisionType,
        domain,
        task,
        requiredSkills,
        requiredCapacity,
        constraints,
        preferredAgentType,
        allowHybrid
      } = req.body;

      // Query Salar for workforce recommendations
      const workforceResponse = await findWorkforce({
        task,
        requiredSkills,
        requiredCapacity,
        preferredAgentType,
        allowHybrid,
      });

      // Build Sutar-compatible response
      const response = {
        decisionId,
        workforceRecommendations: workforceResponse.candidates,
        summary: {
          totalCandidates: workforceResponse.totalCandidates,
          humanCount: workforceResponse.humanCount,
          agentCount: workforceResponse.agentCount,
          hybridRecommended: !!workforceResponse.hybridRecommendation,
        },
        risks: workforceResponse.candidates.length === 0 ? ['No qualified workforce found'] : [],
        confidence: workforceResponse.candidates.length > 0 ? 0.85 : 0.0,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error: any) {
      logger.error('Sutar workforce decision error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /sutar/workforce-match
   *
   * Match workforce to specific task requirements.
   */
  app.post('/sutar/workforce-match', async (req: Request, res: Response) => {
    try {
      const {
        task,
        skills,
        capacity,
        deadline,
        budget,
        agentType,
      } = req.body;

      // Use the workforce find logic
      const matches = await findWorkforce({
        task,
        requiredSkills: skills,
        requiredCapacity: capacity,
        preferredAgentType: agentType,
        allowHybrid: true,
      });

      res.json({
        success: true,
        data: {
          task,
          matches: matches.candidates,
          totalMatches: matches.totalCandidates,
          hybridTeam: matches.hybridRecommendation,
          estimatedCompletion: deadline,
          estimatedCost: calculateEstimatedCost(matches.candidates),
        },
      });
    } catch (error: any) {
      logger.error('Sutar workforce match error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /sutar/skill-availability
   *
   * Check if specific skills are available in workforce.
   */
  app.post('/sutar/skill-availability', async (req: Request, res: Response) => {
    try {
      const { skills, orgId, teamIds } = req.body;

      const availability = await checkSkillAvailability(skills, orgId, teamIds);

      res.json({
        success: true,
        data: availability,
      });
    } catch (error: any) {
      logger.error('Skill availability error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /sutar/capacity-check
   *
   * Check if workforce has capacity for additional work.
   */
  app.post('/sutar/capacity-check', async (req: Request, res: Response) => {
    try {
      const {
        orgId,
        teamIds,
        additionalWorkload,
        timeframe,
      } = req.body;

      const capacity = await checkCapacity(orgId, teamIds, additionalWorkload, timeframe);

      res.json({
        success: true,
        data: capacity,
      });
    } catch (error: any) {
      logger.error('Capacity check error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * GET /sutar/best-workforce/:taskType
   *
   * Get best workforce configuration for a task type.
   */
  app.get('/sutar/best-workforce/:taskType', async (req: Request, res: Response) => {
    try {
      const { taskType } = req.params;
      const { orgId } = req.query;

      const bestConfig = getBestWorkforceConfig(taskType as string, orgId as string);

      res.json({
        success: true,
        data: bestConfig,
      });
    } catch (error: any) {
      logger.error('Best workforce error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  // ========================================================================
  // SUTAR DECISION SYNC
  // ========================================================================

  /**
   * POST /sutar/decision-executed
   *
   * Receive notification from Sutar when a decision is executed.
   * Updates workforce state in Salar.
   */
  app.post('/sutar/decision-executed', async (req: Request, res: Response) => {
    try {
      const {
        decisionId,
        workforceAssigned,
        outcome,
        executedBy,
        executedAt,
      } = req.body;

      // Update workforce assignment
      await recordWorkforceAssignment({
        decisionId,
        workforceAssigned,
        outcome,
        executedBy,
        executedAt: new Date(executedAt),
      });

      res.json({
        success: true,
        data: { recorded: true },
      });
    } catch (error: any) {
      logger.error('Decision executed callback error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  /**
   * POST /sutar/decision-outcome
   *
   * Receive outcome of a decision for learning.
   */
  app.post('/sutar/decision-outcome', async (req: Request, res: Response) => {
    try {
      const {
        decisionId,
        outcome,
        quality,
        timeTaken,
        errors,
        feedback,
      } = req.body;

      // Record outcome for learning
      await recordDecisionOutcome({
        decisionId,
        outcome,
        quality,
        timeTaken,
        errors,
        feedback,
      });

      res.json({
        success: true,
        data: { outcomeRecorded: true },
      });
    } catch (error: any) {
      logger.error('Decision outcome error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  // ========================================================================
  // CAPABILITY MAPPING
  // ========================================================================

  /**
   * GET /sutar/capabilities/:domain
   *
   * Get available capabilities for a domain.
   */
  app.get('/sutar/capabilities/:domain', async (req: Request, res: Response) => {
    try {
      const { domain } = req.params;

      const capabilities = getCapabilitiesForDomain(domain);

      res.json({
        success: true,
        data: capabilities,
      });
    } catch (error: any) {
      logger.error('Capabilities error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });
}

// ============================================================================
// HELPERS
// ============================================================================

interface WorkforceParams {
  task?: string;
  requiredSkills?: string[];
  requiredCapacity?: number;
  preferredAgentType?: string;
  allowHybrid?: boolean;
}

interface WorkforceResult {
  candidates: any[];
  totalCandidates: number;
  humanCount: number;
  agentCount: number;
  hybridRecommendation: any | null;
}

async function findWorkforce(params: WorkforceParams): Promise<WorkforceResult> {
  // In production, this would call the actual Salar workforce find endpoint
  // For now, return mock data

  return {
    candidates: [
      {
        type: 'HUMAN',
        corpId: 'CI-IND-XXXXX',
        name: 'Employee',
        matchScore: 0.85,
        skills: params.requiredSkills?.map(s => ({ skill: s, confidence: 0.8 })) || [],
        cost: 0,
      },
      {
        type: 'AGENT',
        corpId: 'CI-AGT-XXXXX',
        name: 'AI Agent',
        matchScore: 0.78,
        capabilities: params.requiredSkills?.map(s => ({ name: s, trust: 0.7 })) || [],
        cost: 0.02,
      },
    ],
    totalCandidates: 2,
    humanCount: 1,
    agentCount: 1,
    hybridRecommendation: {
      description: 'Hybrid team recommended',
      human: { name: 'Employee', corpId: 'CI-IND-XXXXX' },
      agent: { name: 'AI Agent', corpId: 'CI-AGT-XXXXX' },
    },
  };
}

async function checkSkillAvailability(skills: string[], orgId?: string, teamIds?: string[]) {
  return {
    skills,
    availability: skills.map(skill => ({
      skill,
      available: true,
      count: Math.floor(Math.random() * 10) + 1,
      avgConfidence: 0.75,
      providers: [
        { type: 'HUMAN', count: Math.floor(Math.random() * 5) },
        { type: 'AGENT', count: Math.floor(Math.random() * 3) },
      ],
    })),
    allAvailable: true,
    missingSkills: [],
  };
}

async function checkCapacity(orgId: string, teamIds: string[], workload: number, timeframe: string) {
  return {
    orgId,
    requestedWorkload: workload,
    timeframe,
    availableCapacity: 50,
    usedCapacity: 35,
    utilizationRate: 0.7,
    canAcceptWork: workload <= 50,
    recommendations: workload > 50 ? ['Consider redistributing work', 'May need additional workforce'] : [],
  };
}

function getBestWorkforceConfig(taskType: string, orgId?: string) {
  const configs: Record<string, any> = {
    'development': {
      taskType,
      recommendedTeam: {
        humans: ['Developer', 'Tech Lead', 'QA Engineer'],
        agents: ['Code Review Agent', 'CI/CD Agent'],
        ratio: '2:1',
      },
      skillRequirements: ['coding', 'testing', 'deployment'],
      automationLevel: 3,
    },
    'support': {
      taskType,
      recommendedTeam: {
        humans: ['Support Manager', 'Support Agent'],
        agents: ['AI Support Agent', 'FAQ Agent'],
        ratio: '1:2',
      },
      skillRequirements: ['communication', 'problem_solving', 'product_knowledge'],
      automationLevel: 4,
    },
    'sales': {
      taskType,
      recommendedTeam: {
        humans: ['Sales Manager', 'Account Executive'],
        agents: ['Lead Qualification Agent', 'Follow-up Agent'],
        ratio: '1:3',
      },
      skillRequirements: ['communication', 'negotiation', 'product_knowledge'],
      automationLevel: 3,
    },
  };

  return configs[taskType] || {
    taskType,
    recommendedTeam: {
      humans: ['Manager'],
      agents: ['AI Assistant'],
      ratio: '1:1',
    },
    automationLevel: 2,
  };
}

function calculateEstimatedCost(candidates: any[]): number {
  return candidates.reduce((sum, c) => sum + (c.cost || 0), 0);
}

async function recordWorkforceAssignment(data: {
  decisionId: string;
  workforceAssigned: any[];
  outcome: string;
  executedBy: string;
  executedAt: Date;
}): Promise<void> {
  logger.info('Recording workforce assignment:', data);
  // In production, store in database
}

async function recordDecisionOutcome(data: {
  decisionId: string;
  outcome: string;
  quality?: number;
  timeTaken?: number;
  errors?: string[];
  feedback?: string;
}): Promise<void> {
  logger.info('Recording decision outcome:', data);
  // In production, store in database and update learning models
}

function getCapabilitiesForDomain(domain: string) {
  const domainCapabilities: Record<string, any> = {
    'procurement': [
      { name: 'Supplier Research', keywords: ['supplier', 'vendor', 'procurement'] },
      { name: 'Price Negotiation', keywords: ['negotiation', 'price', 'cost'] },
      { name: 'Quality Assurance', keywords: ['quality', 'inspection', 'standards'] },
    ],
    'sales': [
      { name: 'Lead Generation', keywords: ['lead', 'prospect', 'sales'] },
      { name: 'Proposal Generation', keywords: ['proposal', 'quote', 'bid'] },
      { name: 'Follow-up Automation', keywords: ['followup', 'nurture', 'email'] },
    ],
    'operations': [
      { name: 'Process Automation', keywords: ['automation', 'workflow', 'process'] },
      { name: 'Scheduling', keywords: ['schedule', 'calendar', 'resource'] },
      { name: 'Inventory Management', keywords: ['inventory', 'stock', 'warehouse'] },
    ],
    'hr': [
      { name: 'Resume Screening', keywords: ['resume', 'screening', 'candidate'] },
      { name: 'Interview Scheduling', keywords: ['interview', 'scheduling', 'calendar'] },
      { name: 'Onboarding', keywords: ['onboarding', 'training', 'setup'] },
    ],
  };

  return domainCapabilities[domain] || [];
}

export default salarSutarRoutes;
