import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('aiEmployeeSeeder');
/**
 * Salar OS - AI Employee Registry Seeder
 *
 * Seeds the Agent Registry with all 232 AI Employees
 * and creates Agent Twins automatically.
 */

import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';

// Import models (initialized later to avoid circular deps)
let AgentTwin: any;
let Capability: any;
let CapabilityMapping: any;

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

const CATEGORY_MAP: Record<string, string> = {
  // L1 Assistants
  'research-assistant': 'L1_ASSISTANT',
  'executive-assistant': 'L1_ASSISTANT',
  'writing-assistant': 'L1_ASSISTANT',
  'meeting-assistant': 'L1_ASSISTANT',
  'legal-assistant': 'L1_ASSISTANT',
  'data-analyst': 'L1_ASSISTANT',
  'admin-assistant': 'L1_ASSISTANT',
  'personal-assistant': 'L1_ASSISTANT',

  // L2 Specialists
  'sdr-agent': 'L2_SPECIALIST',
  'ai-support-agent': 'L2_SPECIALIST',
  'marketing-agent': 'L2_SPECIALIST',
  'appointment-setter': 'L2_SPECIALIST',
  'proposal-agent': 'L2_SPECIALIST',
  'followup-agent': 'L2_SPECIALIST',
  'renewal-agent': 'L2_SPECIALIST',
  'seo-agent': 'L2_SPECIALIST',
  'ads-agent': 'L2_SPECIALIST',
  'social-agent': 'L2_SPECIALIST',
  'interview-agent': 'L2_SPECIALIST',
  'onboarding-agent': 'L2_SPECIALIST',
  'sales-agent': 'L2_SPECIALIST',
  'support-agent': 'L2_SPECIALIST',
  'content-agent': 'L2_SPECIALIST',

  // L3 Autonomous
  'accountant-ai': 'L3_AUTONOMOUS',
  'accounting-ai': 'L3_AUTONOMOUS',
  'receptionist-ai': 'L3_AUTONOMOUS',
  'insurance-agent': 'L3_AUTONOMOUS',
  'travel-agent': 'L3_AUTONOMOUS',
  'logistics-agent': 'L3_AUTONOMOUS',
  'warehouse-manager': 'L3_AUTONOMOUS',
  'warehouse-coordinator': 'L3_AUTONOMOUS',
  'supply-chain-agent': 'L3_AUTONOMOUS',
  'procurement-agent': 'L3_AUTONOMOUS',
  'quality-auditor': 'L3_AUTONOMOUS',
  'collections-agent': 'L3_AUTONOMOUS',
  'compliance-officer': 'L3_AUTONOMOUS',
  'risk-manager': 'L3_AUTONOMOUS',

  // L4 Managers
  'ops-manager': 'L4_MANAGER',
  'ops-manager-ai': 'L4_MANAGER',

  // Hospitality
  'hotel-revenue-manager': 'HOSPITALITY',
  'concierge-ai': 'HOSPITALITY',
  'kitchen-manager': 'HOSPITALITY',
  'host-ai': 'HOSPITALITY',
  'ai-waiter': 'HOSPITALITY',
  'ai-receptionist': 'HOSPITALITY',
  'ai-front-desk': 'HOSPITALITY',
  'front-desk': 'HOSPITALITY',
  'waiter': 'HOSPITALITY',

  // Healthcare
  'clinic-growth-consultant': 'HEALTHCARE',
  'care-manager': 'HEALTHCARE',
  'claims-processor': 'HEALTHCARE',
  'pharmacist-ai': 'HEALTHCARE',
  'doctor-assistant': 'HEALTHCARE',
  'nurse-assistant': 'HEALTHCARE',
  'fitness-trainer': 'HEALTHCARE',
  'nutrition-coach': 'HEALTHCARE',

  // Marketing
  'social-media-manager': 'MARKETING',
  'seo-specialist': 'MARKETING',
  'content-strategist': 'MARKETING',
  'brand-voice-guard': 'MARKETING',
  'competitive-analyst': 'MARKETING',

  // Sales
  'sales-coach': 'SALES',
  'territory-planner': 'SALES',
  'account-executive': 'SALES',
  'account-manager': 'SALES',
  'sdr-agent': 'SALES',

  // Engineering
  'backend-architect': 'ENGINEERING',
  'backend-developer': 'ENGINEERING',
  'frontend-developer': 'ENGINEERING',
  'fullstack-developer': 'ENGINEERING',
  'mobile-developer': 'ENGINEERING',
  'security-engineer': 'ENGINEERING',
  'devops-engineer': 'ENGINEERING',
  'data-engineer': 'ENGINEERING',
  'ml-engineer': 'ENGINEERING',

  // Generic
  'analyst-ai': 'GENERIC',
  'assistant-ai': 'GENERIC',
  'architect-ai': 'GENERIC',
  'developer-ai': 'GENERIC',
  'engineer-ai': 'GENERIC',
  'manager-ai': 'GENERIC',
  'designer-ai': 'GENERIC',
  'specialist-ai': 'GENERIC',

  // REZ
  'merchant-cfo': 'REZ',
  'community-manager': 'REZ',
  'creator-manager': 'REZ',
  'attribution-analyst': 'REZ',
  'brand-manager': 'REZ',
};

// ============================================================================
// CAPABILITY TEMPLATES
// ============================================================================

const CAPABILITY_TEMPLATES: Record<string, { name: string; keywords: string[] }[]> = {
  L1_ASSISTANT: [
    { name: 'Research', keywords: ['research', 'search', 'find'] },
    { name: 'Writing', keywords: ['writing', 'draft', 'document'] },
    { name: 'Scheduling', keywords: ['schedule', 'calendar'] },
  ],
  L2_SPECIALIST: [
    { name: 'Sales', keywords: ['sales', 'lead', 'prospect'] },
    { name: 'Marketing', keywords: ['marketing', 'campaign', 'ads'] },
    { name: 'Support', keywords: ['support', 'ticket', 'issue'] },
  ],
  L3_AUTONOMOUS: [
    { name: 'Accounting', keywords: ['accounting', 'finance'] },
    { name: 'Operations', keywords: ['operations', 'logistics'] },
    { name: 'Compliance', keywords: ['compliance', 'audit'] },
  ],
  L4_MANAGER: [
    { name: 'Operations Management', keywords: ['manage', 'coordinate'] },
    { name: 'Team Leadership', keywords: ['lead', 'team'] },
    { name: 'Strategic Planning', keywords: ['strategy', 'planning'] },
  ],
  HOSPITALITY: [
    { name: 'Guest Services', keywords: ['guest', 'service'] },
    { name: 'Hotel Operations', keywords: ['hotel', 'housekeeping'] },
    { name: 'Revenue Management', keywords: ['revenue', 'booking'] },
  ],
  HEALTHCARE: [
    { name: 'Patient Care', keywords: ['patient', 'care', 'health'] },
    { name: 'Clinical Operations', keywords: ['clinic', 'treatment'] },
    { name: 'Health Administration', keywords: ['claims', 'insurance'] },
  ],
  MARKETING: [
    { name: 'Social Media', keywords: ['social', 'media', 'content'] },
    { name: 'SEO', keywords: ['seo', 'search', 'optimization'] },
    { name: 'Content Marketing', keywords: ['content', 'writing'] },
  ],
  SALES: [
    { name: 'Sales Coaching', keywords: ['sales', 'coaching'] },
    { name: 'Lead Generation', keywords: ['lead', 'prospecting'] },
    { name: 'Account Management', keywords: ['account', 'management'] },
  ],
  ENGINEERING: [
    { name: 'Backend Development', keywords: ['backend', 'server', 'api'] },
    { name: 'Frontend Development', keywords: ['frontend', 'react'] },
    { name: 'DevOps', keywords: ['devops', 'docker', 'kubernetes'] },
  ],
  REZ: [
    { name: 'REZ Ecosystem', keywords: ['rez', 'merchant', 'ecommerce'] },
    { name: 'Platform Operations', keywords: ['platform', 'operations'] },
  ],
  GENERIC: [
    { name: 'AI Operations', keywords: ['ai', 'automate', 'intelligent'] },
    { name: 'Data Analysis', keywords: ['data', 'analytics'] },
  ],
};

// ============================================================================
// HELPERS
// ============================================================================

function generateId(length: number = 6): string {
  return randomBytes(length).toString('hex').toUpperCase();
}

function getAgentType(category: string): string {
  if (category.startsWith('L1_')) return 'SPECIALIZED';
  if (category.startsWith('L2_')) return 'SPECIALIZED';
  if (category.startsWith('L3_')) return 'AUTONOMOUS';
  if (category.startsWith('L4_')) return 'ORCHESTRATOR';
  return 'GENERALIST';
}

function getCapabilities(category: string, name: string): { name: string; keywords: string[] }[] {
  const templates = CAPABILITY_TEMPLATES[category] || CAPABILITY_TEMPLATES.GENERIC;
  return templates.map(t => ({ name: t.name, keywords: t.keywords }));
}

// ============================================================================
// SEED FUNCTION
// ============================================================================

interface SeedResult {
  success: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function seedAllAgents(models: {
  AgentTwin: any;
  Capability: any;
  CapabilityMapping: any;
}): Promise<SeedResult> {
  const result: SeedResult = {
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const fs = await import('fs');
  const path = await import('path');
  const employeesDir = '/Users/rejaulkarim/Documents/ReZ Full App/employees';

  if (!fs.existsSync(employeesDir)) {
    result.errors.push('Employees directory not found');
    return result;
  }

  const directories = fs.readdirSync(employeesDir).filter(d => {
    const stat = fs.statSync(path.join(employeesDir, d));
    return stat.isDirectory();
  });

  logger.info(`\n🔄 Seeding AI Employees (${directories.length} found)...`);

  for (let i = 0; i < directories.length; i++) {
    const dir = directories[i];
    const name = dir.replace(/-/g, ' ').replace(/_/g, ' ');
    const normalizedDir = dir.toLowerCase().replace(/-/g, '_');
    const category = CATEGORY_MAP[normalizedDir] || 'GENERIC';
    const agentType = getAgentType(category);
    const corpId = `CI-AGT-${generateId(6)}`;

    try {
      // Check if already exists
      const existing = await models.AgentTwin.findOne({
        $or: [
          { 'identity.name': new RegExp(`^${name}$`, 'i') },
          { agentId: corpId }
        ]
      });

      if (existing) {
        result.skipped++;
        continue;
      }

      // Create Agent Twin
      const twin = new models.AgentTwin({
        twinId: `TWIN-${generateId(8)}`,
        agentId: corpId,
        name: name,
        identity: {
          type: agentType,
          version: '1.0.0',
          description: `${agentType.toLowerCase()} agent for ${category.toLowerCase()} operations`,
          owner: 'CI-ORG-HOAJAI',
          department: category,
          createdAt: new Date(),
        },
        capabilities: [],
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
        health: {
          status: 'ACTIVE',
          healthScore: 1.0,
          issues: [],
          recommendations: [],
        },
      });

      await twin.save();
      result.success++;

      if ((i + 1) % 20 === 0) {
        logger.info(`   Progress: ${i + 1}/${directories.length}`);
      }

    } catch (error: any) {
      result.failed++;
      if (result.errors.length < 10) {
        result.errors.push(`${name}: ${error.message}`);
      }
    }
  }

  return result;
}

// ============================================================================
// ROUTES
// ============================================================================

const router = Router();

/**
 * Seed all AI employees
 * POST /seed/agents
 */
router.post('/agents', async (_req: Request, res: Response) => {
  try {
    // Import models dynamically
    const { AgentTwin } = await import('./agentTwin.js');
    const { Capability } = await import('./capabilityRegistry.js');
    const { CapabilityMapping } = await import('./capabilityRegistry.js');

    const result = await seedAllAgents({ AgentTwin, Capability, CapabilityMapping });

    res.json({
      success: true,
      data: {
        seeded: result.success,
        skipped: result.skipped,
        failed: result.failed,
        errors: result.errors.slice(0, 10),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SEED_ERROR', message: error.message },
    });
  }
});

/**
 * Get seed status
 * GET /seed/status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const { AgentTwin } = await import('./agentTwin.js');
    const { Capability, CapabilityMapping } = await import('./capabilityRegistry.js');

    const [agents, capabilities, mappings] = await Promise.all([
      AgentTwin.countDocuments(),
      Capability.countDocuments(),
      CapabilityMapping.countDocuments({ entityType: 'AGENT' }),
    ]);

    res.json({
      success: true,
      data: {
        agents,
        capabilities,
        agentMappings: mappings,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'STATUS_ERROR', message: error.message },
    });
  }
});

export { router as seederRouter, seedAllAgents };
export default router;
