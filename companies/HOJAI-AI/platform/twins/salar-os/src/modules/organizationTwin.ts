import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('organizationTwin');
/**
 * Salar OS - Organization Twin Module
 *
 * Digital twin representation for organizations
 * Complements Employee Twin and Agent Twin
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, model } from 'mongoose';
import { randomBytes } from 'crypto';

const router = Router();

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

// Organization Twin Schema
const organizationTwinSchema = new Schema({
  twinId: { type: String, required: true, unique: true, index: true },
  corpId: { type: String, required: true, index: true },  // CI-BIZ-XXXXX

  // Basic Info
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['STARTUP', 'SME', 'ENTERPRISE', 'CORPORATION', 'CONGLOMERATE'],
    required: true,
  },
  industry: String,
  size: {
    type: String,
    enum: ['MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE'],
  },
  founded: Date,
  headquarters: String,

  // Structure
  structure: {
    departments: [{
      id: String,
      name: String,
      headId: String,  // CorpID of head
      parentId: String,
      employeeCount: Number,
    }],
    teams: [{
      id: String,
      name: String,
      departmentId: String,
      leadId: String,
      memberCount: Number,
    }],
  },

  // Workforce
  workforce: {
    totalEmployees: { type: Number, default: 0 },
    totalAgents: { type: Number, default: 0 },
    activeEmployees: { type: Number, default: 0 },
    activeAgents: { type: Number, default: 0 },
  },

  // Capabilities
  capabilities: {
    technical: [{
      name: String,
      maturity: { type: String, enum: ['NONE', 'BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] },
      coverage: Number,  // 0-1
    }],
    business: [{
      name: String,
      maturity: String,
      coverage: Number,
    }],
    domain: [{
      name: String,
      maturity: String,
      coverage: Number,
    }],
  },

  // Skill Map
  skillMap: {
    totalSkills: { type: Number, default: 0 },
    coveredSkills: { type: Number, default: 0 },
    missingSkills: { type: Number, default: 0 },
    coveragePercent: Number,
    criticalGaps: [{
      skill: String,
      severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      impact: String,
    }],
  },

  // Capacity
  capacity: {
    totalCapacity: Number,
    utilizedCapacity: Number,
    availableCapacity: Number,
    utilizationRate: Number,
    agentCapacity: Number,
    humanCapacity: Number,
  },

  // Performance
  performance: {
    productivityScore: Number,    // 0-100
    efficiencyScore: Number,
    innovationScore: Number,
    retentionRate: Number,
    employeeSatisfaction: Number,
  },

  // Health
  health: {
    status: { type: String, enum: ['HEALTHY', 'AT_RISK', 'CRITICAL'] },
    score: Number,  // 0-100
    issues: [String],
    recommendations: [String],
  },

  // Hierarchy
  hierarchy: {
    parentId: String,  // Parent organization
    subsidiaries: [String],  // Child organizations
    partners: [{
      corpId: String,
      name: String,
      type: { type: String, enum: ['SUPPLIER', 'CUSTOMER', 'INVESTOR', 'ALLIANCE'] },
    }],
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

organizationTwinSchema.index({ 'workforce.totalEmployees': -1 });
organizationTwinSchema.index({ 'health.score': -1 });
organizationTwinSchema.index({ 'skillMap.coveragePercent': -1 });

const OrganizationTwin = model('OrganizationTwin', organizationTwinSchema);

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'ORG'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Create Organization Twin
 * POST /organization-twin
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      corpId,
      name,
      type,
      industry,
      size,
      departments,
      headquarters,
    } = req.body;

    if (!corpId || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'corpId and name required' },
      });
    }

    const existing = await OrganizationTwin.findOne({ corpId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Organization Twin already exists' },
      });
    }

    const twin = new OrganizationTwin({
      twinId: generateId('TWIN'),
      corpId,
      name,
      type: type || 'SME',
      industry: industry || 'Technology',
      size: size || 'MEDIUM',
      headquarters,
      structure: {
        departments: departments || [],
        teams: [],
      },
      workforce: {
        totalEmployees: 0,
        totalAgents: 0,
        activeEmployees: 0,
        activeAgents: 0,
      },
      capabilities: {
        technical: [],
        business: [],
        domain: [],
      },
      skillMap: {
        totalSkills: 0,
        coveredSkills: 0,
        missingSkills: 0,
        coveragePercent: 0,
        criticalGaps: [],
      },
      capacity: {
        totalCapacity: 0,
        utilizedCapacity: 0,
        availableCapacity: 0,
        utilizationRate: 0,
        agentCapacity: 0,
        humanCapacity: 0,
      },
      performance: {
        productivityScore: 50,
        efficiencyScore: 50,
        innovationScore: 50,
        retentionRate: 0.8,
        employeeSatisfaction: 0.7,
      },
      health: {
        status: 'HEALTHY',
        score: 70,
        issues: [],
        recommendations: [],
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
  } catch (error: any) {
    logger.error('Error creating organization twin:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get Organization Twin
 * GET /organization-twin/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let twin = await OrganizationTwin.findOne({ twinId: id }).lean();
    if (!twin) {
      twin = await OrganizationTwin.findOne({ corpId: id }).lean();
    }

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization Twin not found' },
      });
    }

    res.json({
      success: true,
      data: twin,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Update Organization Twin
 * PATCH /organization-twin/:id
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const twin = await OrganizationTwin.findOneAndUpdate(
      { $or: [{ twinId: id }, { corpId: id }] },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization Twin not found' },
      });
    }

    res.json({
      success: true,
      data: twin,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Add department
 * POST /organization-twin/:id/department
 */
router.post('/:id/department', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, headId, parentId } = req.body;

    const twin = await OrganizationTwin.findOne(
      { $or: [{ twinId: id }, { corpId: id }] }
    );

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization Twin not found' },
      });
    }

    const deptId = `DEPT-${randomBytes(3).toString('hex').toUpperCase()}`;

    twin.structure.departments.push({
      id: deptId,
      name,
      headId,
      parentId,
      employeeCount: 0,
    });

    await twin.save();

    res.json({
      success: true,
      data: {
        departmentId: deptId,
        name,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Update workforce counts
 * POST /organization-twin/:id/workforce
 */
router.post('/:id/workforce', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { totalEmployees, totalAgents, activeEmployees, activeAgents } = req.body;

    const twin = await OrganizationTwin.findOneAndUpdate(
      { $or: [{ twinId: id }, { corpId: id }] },
      {
        $set: {
          'workforce.totalEmployees': totalEmployees,
          'workforce.totalAgents': totalAgents,
          'workforce.activeEmployees': activeEmployees,
          'workforce.activeAgents': activeAgents,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization Twin not found' },
      });
    }

    res.json({
      success: true,
      data: {
        workforce: twin.workforce,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Update skill map
 * POST /organization-twin/:id/skills
 */
router.post('/:id/skills', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { totalSkills, coveredSkills, missingSkills, criticalGaps } = req.body;

    const coveragePercent = totalSkills > 0 ? (coveredSkills / totalSkills) * 100 : 0;

    const twin = await OrganizationTwin.findOneAndUpdate(
      { $or: [{ twinId: id }, { corpId: id }] },
      {
        $set: {
          'skillMap.totalSkills': totalSkills,
          'skillMap.coveredSkills': coveredSkills,
          'skillMap.missingSkills': missingSkills,
          'skillMap.coveragePercent': coveragePercent,
          'skillMap.criticalGaps': criticalGaps || [],
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!twin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization Twin not found' },
      });
    }

    res.json({
      success: true,
      data: {
        skillMap: twin.skillMap,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get organization comparison
 * POST /organization-twin/compare
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { orgIds } = req.body;

    if (!orgIds || !Array.isArray(orgIds)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'orgIds array required' },
      });
    }

    const organizations = await OrganizationTwin.find({
      $or: [
        { twinId: { $in: orgIds } },
        { corpId: { $in: orgIds } },
      ],
    }).lean();

    // Calculate comparison metrics
    const comparison = {
      organizations: organizations.map(org => ({
        twinId: org.twinId,
        corpId: org.corpId,
        name: org.name,
        workforce: org.workforce,
        skillMap: org.skillMap,
        health: org.health,
        performance: org.performance,
      })),
      metrics: {
        largestWorkforce: null,
        highestSkillCoverage: null,
        healthiest: null,
        mostProductive: null,
      },
    };

    if (organizations.length > 0) {
      comparison.metrics.largestWorkforce = organizations.sort(
        (a, b) => (b.workforce?.totalEmployees || 0) - (a.workforce?.totalEmployees || 0)
      )[0].name;

      comparison.metrics.highestSkillCoverage = organizations.sort(
        (a, b) => (b.skillMap?.coveragePercent || 0) - (a.skillMap?.coveragePercent || 0)
      )[0].name;

      comparison.metrics.healthiest = organizations.sort(
        (a, b) => (b.health?.score || 0) - (a.health?.score || 0)
      )[0].name;

      comparison.metrics.mostProductive = organizations.sort(
        (a, b) => (b.performance?.productivityScore || 0) - (a.performance?.productivityScore || 0)
      )[0].name;
    }

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Get all organizations
 * GET /organization-twin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, industry, sortBy } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (industry) filter.industry = industry;

    let sort: any = { 'health.score': -1 };
    if (sortBy === 'workforce') sort = { 'workforce.totalEmployees': -1 };
    if (sortBy === 'skills') sort = { 'skillMap.coveragePercent': -1 };

    const organizations = await OrganizationTwin.find(filter)
      .select('twinId corpId name type industry workforce skillMap health')
      .sort(sort)
      .lean();

    res.json({
      success: true,
      data: {
        items: organizations,
        total: organizations.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message },
    });
  }
});

/**
 * Sync from CorpID Business entities
 * POST /organization-twin/sync-corpid
 */
router.post('/sync-corpid', async (req: Request, res: Response) => {
  try {
    const CORPID_URL = process.env.CORPID_SERVICE_URL || 'http://localhost:4702';
    const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

    // Fetch business entities from CorpID
    const response = await fetch(`${CORPID_URL}/entities?entityType=BUSINESS`, {
      headers: { 'x-internal-token': INTERNAL_TOKEN },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from CorpID');
    }

    const data = await response.json();
    const businesses = data.data?.items || [];

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const business of businesses) {
      try {
        const existing = await OrganizationTwin.findOne({ corpId: business.corpId });

        if (existing) {
          existing.name = business.name || existing.name;
          existing.industry = business.industry || existing.industry;
          await existing.save();
          results.updated++;
        } else {
          const twin = new OrganizationTwin({
            twinId: generateId('TWIN'),
            corpId: business.corpId,
            name: business.name || 'Unknown',
            type: 'SME',
            industry: business.industry || 'Technology',
            structure: { departments: [], teams: [] },
            workforce: { totalEmployees: 0, totalAgents: 0, activeEmployees: 0, activeAgents: 0 },
            capabilities: { technical: [], business: [], domain: [] },
            skillMap: { totalSkills: 0, coveredSkills: 0, missingSkills: 0, coveragePercent: 0, criticalGaps: [] },
            capacity: { totalCapacity: 0, utilizedCapacity: 0, availableCapacity: 0, utilizationRate: 0, agentCapacity: 0, humanCapacity: 0 },
            performance: { productivityScore: 50, efficiencyScore: 50, innovationScore: 50, retentionRate: 0.8, employeeSatisfaction: 0.7 },
            health: { status: 'HEALTHY', score: 70, issues: [], recommendations: [] },
          });
          await twin.save();
          results.created++;
        }
      } catch (error) {
        results.skipped++;
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message },
    });
  }
});

export { router as organizationTwinRouter, OrganizationTwin };
export default router;
