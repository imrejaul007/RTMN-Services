import { createLogger } from '@rtmn/shared/lib/logger';
const logger = createLogger('capabilityRegistry');
/**
 * Salar OS - Capability Registry
 *
 * Maps capabilities to humans, agents, and teams
 *
 * Core question: "Who can do what?"
 */

import { Router, Request, Response } from 'express';
import mongoose, { Schema, model } from 'mongoose';
import { randomBytes } from 'crypto';

const router = Router();

// ============================================================================
// MONGODB SCHEMAS
// ============================================================================

// Capability Schema (Master capability definitions)
const capabilitySchema = new Schema({
  capabilityId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: [
      'TECHNICAL',      // Coding, DevOps, Data
      'BUSINESS',       // Sales, Marketing, Finance
      'OPERATIONS',     // Logistics, Supply Chain
      'CREATIVE',       // Design, Writing, Content
      'ANALYTICS',      // Data Analysis, BI
      'SUPPORT',       // Customer Service, Success
      'HR',            // Recruiting, Training
      'LEADERSHIP',    // Management, Strategy
      'DOMAIN',        // Industry-specific (Healthcare, Hospitality)
    ],
    required: true,
    index: true,
  },
  description: String,
  keywords: [String],
  difficulty: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] },

  // Dependencies
  prerequisites: [String],  // Other capability IDs
  relatedCapabilities: [String],

  // Industry applicability
  industries: [String],

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

capabilitySchema.index({ name: 'text', keywords: 'text', description: 'text' });

const Capability = model('Capability', capabilitySchema);

// Capability Mapping Schema (Who has what capability)
const capabilityMappingSchema = new Schema({
  mappingId: { type: String, required: true, unique: true, index: true },
  capabilityId: { type: String, required: true, index: true },
  entityType: {
    type: String,
    enum: ['HUMAN', 'AGENT', 'TEAM', 'ORGANIZATION'],
    required: true,
  },
  entityId: { type: String, required: true, index: true },  // CorpID or Team ID

  // Proficiency level
  level: {
    type: String,
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'MASTER'],
    required: true,
  },

  // Metrics
  metrics: {
    confidence: Number,      // 0-1, how confident we are
    evidenceCount: Number,   // Number of evidence sources
    lastVerified: Date,
    avgOutcome: Number,     // Success rate from completed tasks
  },

  // Evidence
  evidence: [{
    type: {
      type: String,
      enum: ['CERTIFICATION', 'COURSE', 'PROJECT', 'PEER_REVIEW', 'SYSTEM_OBSERVED', 'SELF_DECLARED'],
    },
    sourceId: String,
    sourceName: String,
    weight: Number,          // 0-1, how much this evidence supports the claim
    verifiedAt: Date,
  }],

  // Capacity (for workload calculation)
  capacity: {
    hoursPerWeek: Number,   // Max hours per week for this capability
    currentLoad: Number,     // Currently allocated hours
    available: Number,      // Available hours
  },

  // Cost (for agents)
  costPerTask: Number,      // Average cost per task
  costPerHour: Number,

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'DEPRECATED'],
    default: 'ACTIVE',
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

capabilityMappingSchema.index({ entityId: 1, capabilityId: 1 }, { unique: true });
capabilityMappingSchema.index({ capabilityId: 1, level: 1 });
capabilityMappingSchema.index({ entityType: 1, entityId: 1 });

const CapabilityMapping = model('CapabilityMapping', capabilityMappingSchema);

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'CAP'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

// ============================================================================
// CAPABILITY DEFINITIONS (Master List)
// ============================================================================

const MASTER_CAPABILITIES = [
  // TECHNICAL
  { name: 'Python', category: 'TECHNICAL', keywords: ['python', 'django', 'flask'], difficulty: 'ADVANCED' },
  { name: 'JavaScript', category: 'TECHNICAL', keywords: ['javascript', 'node', 'react'], difficulty: 'ADVANCED' },
  { name: 'TypeScript', category: 'TECHNICAL', keywords: ['typescript', 'angular', 'vue'], difficulty: 'ADVANCED' },
  { name: 'Java', category: 'TECHNICAL', keywords: ['java', 'spring', 'hibernate'], difficulty: 'ADVANCED' },
  { name: 'Go', category: 'TECHNICAL', keywords: ['golang', 'go'], difficulty: 'ADVANCED' },
  { name: 'Rust', category: 'TECHNICAL', keywords: ['rust', 'systems'], difficulty: 'EXPERT' },
  { name: 'Database Design', category: 'TECHNICAL', keywords: ['sql', 'mongodb', 'postgresql'], difficulty: 'ADVANCED' },
  { name: 'DevOps', category: 'TECHNICAL', keywords: ['docker', 'kubernetes', 'ci/cd', 'aws'], difficulty: 'ADVANCED' },
  { name: 'Machine Learning', category: 'TECHNICAL', keywords: ['ml', 'ai', 'tensorflow', 'pytorch'], difficulty: 'EXPERT' },
  { name: 'Cloud Architecture', category: 'TECHNICAL', keywords: ['aws', 'gcp', 'azure', 'architecture'], difficulty: 'EXPERT' },
  { name: 'Security', category: 'TECHNICAL', keywords: ['security', 'cybersecurity', 'penetration'], difficulty: 'EXPERT' },
  { name: 'Mobile Development', category: 'TECHNICAL', keywords: ['ios', 'android', 'react native', 'flutter'], difficulty: 'ADVANCED' },
  { name: 'API Design', category: 'TECHNICAL', keywords: ['rest', 'graphql', 'api', 'backend'], difficulty: 'ADVANCED' },
  { name: 'Frontend Development', category: 'TECHNICAL', keywords: ['react', 'vue', 'angular', 'html', 'css'], difficulty: 'INTERMEDIATE' },
  { name: 'Backend Development', category: 'TECHNICAL', keywords: ['backend', 'server', 'api', 'node'], difficulty: 'ADVANCED' },
  { name: 'Data Engineering', category: 'TECHNICAL', keywords: ['data', 'etl', 'pipeline', 'spark'], difficulty: 'ADVANCED' },

  // BUSINESS
  { name: 'Sales Strategy', category: 'BUSINESS', keywords: ['sales', 'strategy', 'pipeline'], difficulty: 'ADVANCED' },
  { name: 'Lead Generation', category: 'BUSINESS', keywords: ['lead', 'prospecting', 'outreach'], difficulty: 'INTERMEDIATE' },
  { name: 'Negotiation', category: 'BUSINESS', keywords: ['negotiation', 'deal', 'contract'], difficulty: 'EXPERT' },
  { name: 'Financial Analysis', category: 'BUSINESS', keywords: ['finance', 'analysis', 'modeling'], difficulty: 'ADVANCED' },
  { name: 'Accounting', category: 'BUSINESS', keywords: ['accounting', 'bookkeeping', 'tax'], difficulty: 'ADVANCED' },
  { name: 'Marketing', category: 'BUSINESS', keywords: ['marketing', 'campaign', 'brand'], difficulty: 'INTERMEDIATE' },
  { name: 'SEO', category: 'BUSINESS', keywords: ['seo', 'search', 'optimization'], difficulty: 'INTERMEDIATE' },
  { name: 'Content Marketing', category: 'BUSINESS', keywords: ['content', 'writing', 'blog'], difficulty: 'INTERMEDIATE' },
  { name: 'Product Management', category: 'BUSINESS', keywords: ['product', 'roadmap', 'strategy'], difficulty: 'ADVANCED' },
  { name: 'Business Development', category: 'BUSINESS', keywords: ['bd', 'partnerships', 'growth'], difficulty: 'ADVANCED' },
  { name: 'Customer Success', category: 'BUSINESS', keywords: ['customer', 'success', 'retention'], difficulty: 'INTERMEDIATE' },

  // OPERATIONS
  { name: 'Project Management', category: 'OPERATIONS', keywords: ['project', 'pmp', 'scrum', 'agile'], difficulty: 'INTERMEDIATE' },
  { name: 'Supply Chain', category: 'OPERATIONS', keywords: ['supply', 'chain', 'logistics'], difficulty: 'ADVANCED' },
  { name: 'Quality Assurance', category: 'OPERATIONS', keywords: ['qa', 'testing', 'quality'], difficulty: 'INTERMEDIATE' },
  { name: 'Process Optimization', category: 'OPERATIONS', keywords: ['process', 'optimization', 'efficiency'], difficulty: 'ADVANCED' },
  { name: 'Inventory Management', category: 'OPERATIONS', keywords: ['inventory', 'stock', 'warehouse'], difficulty: 'INTERMEDIATE' },
  { name: 'Logistics', category: 'OPERATIONS', keywords: ['logistics', 'shipping', 'delivery'], difficulty: 'INTERMEDIATE' },

  // CREATIVE
  { name: 'UI Design', category: 'CREATIVE', keywords: ['ui', 'design', 'figma', 'interface'], difficulty: 'ADVANCED' },
  { name: 'UX Design', category: 'CREATIVE', keywords: ['ux', 'user', 'experience', 'research'], difficulty: 'ADVANCED' },
  { name: 'Graphic Design', category: 'CREATIVE', keywords: ['graphic', 'design', 'branding', 'logo'], difficulty: 'INTERMEDIATE' },
  { name: 'Video Production', category: 'CREATIVE', keywords: ['video', 'production', 'editing'], difficulty: 'INTERMEDIATE' },
  { name: 'Copywriting', category: 'CREATIVE', keywords: ['copy', 'writing', 'copywriting'], difficulty: 'INTERMEDIATE' },
  { name: 'Brand Strategy', category: 'CREATIVE', keywords: ['brand', 'strategy', 'identity'], difficulty: 'ADVANCED' },

  // ANALYTICS
  { name: 'Data Analysis', category: 'ANALYTICS', keywords: ['data', 'analysis', 'analytics'], difficulty: 'INTERMEDIATE' },
  { name: 'Business Intelligence', category: 'ANALYTICS', keywords: ['bi', 'dashboard', 'reporting'], difficulty: 'ADVANCED' },
  { name: 'Statistical Analysis', category: 'ANALYTICS', keywords: ['statistics', 'r', 'sas'], difficulty: 'ADVANCED' },
  { name: 'A/B Testing', category: 'ANALYTICS', keywords: ['testing', 'experiments', 'optimization'], difficulty: 'INTERMEDIATE' },
  { name: 'Data Visualization', category: 'ANALYTICS', keywords: ['visualization', 'tableau', 'charts'], difficulty: 'INTERMEDIATE' },

  // SUPPORT
  { name: 'Customer Support', category: 'SUPPORT', keywords: ['support', 'service', 'help'], difficulty: 'BEGINNER' },
  { name: 'Technical Support', category: 'SUPPORT', keywords: ['technical', 'support', 'troubleshooting'], difficulty: 'INTERMEDIATE' },
  { name: 'Sales Support', category: 'SUPPORT', keywords: ['sales', 'support', 'sdr'], difficulty: 'INTERMEDIATE' },
  { name: 'HR Support', category: 'SUPPORT', keywords: ['hr', 'recruiting', 'onboarding'], difficulty: 'INTERMEDIATE' },

  // HR
  { name: 'Recruiting', category: 'HR', keywords: ['recruiting', 'hiring', 'talent'], difficulty: 'INTERMEDIATE' },
  { name: 'Training', category: 'HR', keywords: ['training', 'learning', 'development'], difficulty: 'INTERMEDIATE' },
  { name: 'Performance Management', category: 'HR', keywords: ['performance', 'review', 'feedback'], difficulty: 'ADVANCED' },
  { name: 'Compensation', category: 'HR', keywords: ['compensation', 'salary', 'benefits'], difficulty: 'ADVANCED' },

  // LEADERSHIP
  { name: 'Team Leadership', category: 'LEADERSHIP', keywords: ['leadership', 'team', 'management'], difficulty: 'EXPERT' },
  { name: 'Strategic Planning', category: 'LEADERSHIP', keywords: ['strategy', 'planning', 'roadmap'], difficulty: 'EXPERT' },
  { name: 'Change Management', category: 'LEADERSHIP', keywords: ['change', 'management', 'transformation'], difficulty: 'EXPERT' },
  { name: 'Executive Leadership', category: 'LEADERSHIP', keywords: ['executive', 'ceo', 'cfo', 'cto'], difficulty: 'MASTER' },

  // DOMAIN
  { name: 'Healthcare Operations', category: 'DOMAIN', keywords: ['healthcare', 'medical', 'hospital'], difficulty: 'EXPERT' },
  { name: 'E-commerce Operations', category: 'DOMAIN', keywords: ['ecommerce', 'shopify', 'commerce'], difficulty: 'ADVANCED' },
  { name: 'Financial Services', category: 'DOMAIN', keywords: ['finance', 'banking', 'fintech'], difficulty: 'EXPERT' },
  { name: 'Hospitality Management', category: 'DOMAIN', keywords: ['hotel', 'restaurant', 'hospitality'], difficulty: 'ADVANCED' },
  { name: 'Real Estate', category: 'DOMAIN', keywords: ['real estate', 'property', 'realtor'], difficulty: 'ADVANCED' },
  { name: 'Manufacturing', category: 'DOMAIN', keywords: ['manufacturing', 'production', 'factory'], difficulty: 'ADVANCED' },
];

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Initialize master capabilities
 * POST /capabilities/init
 */
router.post('/init', async (req: Request, res: Response) => {
  try {
    const results = [];

    for (const cap of MASTER_CAPABILITIES) {
      const existing = await Capability.findOne({ name: cap.name });
      if (!existing) {
        const capability = new Capability({
          capabilityId: generateId('CAP'),
          ...cap,
        });
        await capability.save();
        results.push({ name: cap.name, status: 'created' });
      } else {
        results.push({ name: cap.name, status: 'exists' });
      }
    }

    res.json({
      success: true,
      data: {
        total: MASTER_CAPABILITIES.length,
        created: results.filter(r => r.status === 'created').length,
        existing: results.filter(r => r.status === 'exists').length,
      },
    });
  } catch (error) {
    logger.error('Error initializing capabilities:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to initialize capabilities' },
    });
  }
});

/**
 * Get all capabilities
 * GET /capabilities
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, difficulty } = req.query;

    const filter: any = {};
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      filter.$text = { $search: search as string };
    }

    const capabilities = await Capability.find(filter).lean();

    res.json({
      success: true,
      data: {
        items: capabilities,
        total: capabilities.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching capabilities:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch capabilities' },
    });
  }
});

/**
 * Get capability by ID
 * GET /capabilities/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const capability = await Capability.findOne({ capabilityId: id }).lean();

    if (!capability) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Capability not found' },
      });
    }

    // Get all mappings for this capability
    const mappings = await CapabilityMapping.find({ capabilityId: id }).lean();

    res.json({
      success: true,
      data: {
        ...capability,
        mappings: mappings.length,
        providers: {
          humans: mappings.filter(m => m.entityType === 'HUMAN').length,
          agents: mappings.filter(m => m.entityType === 'AGENT').length,
          teams: mappings.filter(m => m.entityType === 'TEAM').length,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching capability:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch capability' },
    });
  }
});

/**
 * Search capabilities
 * GET /capabilities/search
 */
router.get('/search/query', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Query is required' },
      });
    }

    const capabilities = await Capability.find({
      $or: [
        { name: { $regex: q as string, $options: 'i' } },
        { keywords: { $in: [(q as string).toLowerCase()] } },
        { description: { $regex: q as string, $options: 'i' } },
      ],
    }).limit(20).lean();

    res.json({
      success: true,
      data: {
        items: capabilities,
        total: capabilities.length,
        query: q,
      },
    });
  } catch (error) {
    logger.error('Error searching capabilities:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to search capabilities' },
    });
  }
});

// ============================================================================
// CAPABILITY MAPPINGS
// ============================================================================

/**
 * Map capability to entity (Human, Agent, Team)
 * POST /mappings
 */
router.post('/mappings', async (req: Request, res: Response) => {
  try {
    const {
      capabilityId,
      entityType,
      entityId,
      level,
      evidence,
      capacity,
      costPerTask,
    } = req.body;

    if (!capabilityId || !entityType || !entityId || !level) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      });
    }

    // Check if mapping already exists
    const existing = await CapabilityMapping.findOne({ capabilityId, entityId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Capability already mapped to this entity' },
      });
    }

    const mapping = new CapabilityMapping({
      mappingId: generateId('MAP'),
      capabilityId,
      entityType,
      entityId,
      level,
      metrics: {
        confidence: calculateInitialConfidence(evidence),
        evidenceCount: evidence?.length || 0,
        lastVerified: new Date(),
      },
      evidence: evidence || [],
      capacity: capacity || { hoursPerWeek: 40, currentLoad: 0, available: 40 },
      costPerTask: costPerTask || 0,
      status: 'ACTIVE',
    });

    await mapping.save();

    res.status(201).json({
      success: true,
      data: {
        mappingId: mapping.mappingId,
        capabilityId,
        entityId,
        level,
      },
    });
  } catch (error) {
    logger.error('Error creating capability mapping:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create mapping' },
    });
  }
});

/**
 * Get capabilities for an entity
 * GET /mappings/:entityType/:entityId
 */
router.get('/mappings/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;

    const mappings = await CapabilityMapping.find({
      entityType: entityType.toUpperCase(),
      entityId,
      status: 'ACTIVE',
    }).lean();

    // Enrich with capability details
    const enriched = await Promise.all(
      mappings.map(async (m) => {
        const capability = await Capability.findOne({ capabilityId: m.capabilityId }).lean();
        return {
          ...m,
          capability: capability || null,
        };
      })
    );

    res.json({
      success: true,
      data: {
        items: enriched,
        total: enriched.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching mappings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch mappings' },
    });
  }
});

/**
 * Find entities by capability
 * POST /mappings/find
 */
router.post('/mappings/find', async (req: Request, res: Response) => {
  try {
    const { capabilities, entityType, minLevel, minConfidence } = req.body;

    if (!capabilities || !Array.isArray(capabilities)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'capabilities array is required' },
      });
    }

    const filter: any = {
      capabilityId: { $in: capabilities },
      status: 'ACTIVE',
    };
    if (entityType) filter.entityType = entityType.toUpperCase();
    if (minLevel) filter.level = { $in: ['INTERMEDIATE', 'ADVANCED', 'EXPERT', 'MASTER'] };
    if (minConfidence) filter['metrics.confidence'] = { $gte: minConfidence };

    const mappings = await CapabilityMapping.find(filter).lean();

    // Group by entity
    const entityMap = new Map();
    for (const mapping of mappings) {
      if (!entityMap.has(mapping.entityId)) {
        entityMap.set(mapping.entityId, {
          entityId: mapping.entityId,
          entityType: mapping.entityType,
          capabilities: [],
          totalConfidence: 0,
        });
      }
      const entry = entityMap.get(mapping.entityId);
      entry.capabilities.push(mapping);
      entry.totalConfidence += mapping.metrics?.confidence || 0;
    }

    // Filter to entities with ALL required capabilities
    const qualified = Array.from(entityMap.values())
      .filter(e => e.capabilities.length >= capabilities.length)
      .sort((a, b) => b.totalConfidence - a.totalConfidence);

    res.json({
      success: true,
      data: {
        qualified,
        totalQualified: qualified.length,
        totalCapabilities: capabilities.length,
      },
    });
  } catch (error) {
    logger.error('Error finding by capability:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to find entities' },
    });
  }
});

/**
 * Update capability mapping
 * PATCH /mappings/:id
 */
router.patch('/mappings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const mapping = await CapabilityMapping.findOneAndUpdate(
      { mappingId: id },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Mapping not found' },
      });
    }

    res.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    logger.error('Error updating mapping:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update mapping' },
    });
  }
});

/**
 * Add evidence to capability mapping
 * POST /mappings/:id/evidence
 */
router.post('/mappings/:id/evidence', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, sourceId, sourceName, weight } = req.body;

    const mapping = await CapabilityMapping.findOne({ mappingId: id });
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Mapping not found' },
      });
    }

    mapping.evidence.push({
      type,
      sourceId,
      sourceName,
      weight: weight || 0.5,
      verifiedAt: new Date(),
    });

    mapping.metrics.evidenceCount = mapping.evidence.length;
    mapping.metrics.confidence = calculateConfidence(mapping.evidence);
    mapping.metrics.lastVerified = new Date();
    mapping.updatedAt = new Date();

    await mapping.save();

    res.json({
      success: true,
      data: {
        evidenceCount: mapping.metrics.evidenceCount,
        confidence: mapping.metrics.confidence,
      },
    });
  } catch (error) {
    logger.error('Error adding evidence:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add evidence' },
    });
  }
});

// ============================================================================
// WORKFORCE CAPABILITY MATRIX
// ============================================================================

/**
 * Get workforce capability matrix
 * GET /matrix
 */
router.get('/matrix/workforce', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.query;

    // Get all capabilities
    const capabilities = await Capability.find().lean();

    // Get all active mappings
    const mappings = await CapabilityMapping.find({ status: 'ACTIVE' }).lean();

    // Build matrix
    const matrix = {
      capabilities: capabilities.map(c => ({
        id: c.capabilityId,
        name: c.name,
        category: c.category,
        difficulty: c.difficulty,
      })),
      entities: [] as any[],
    };

    // Group mappings by entity
    const entityMap = new Map();
    for (const mapping of mappings) {
      if (!entityMap.has(mapping.entityId)) {
        entityMap.set(mapping.entityId, {
          entityId: mapping.entityId,
          entityType: mapping.entityType,
          capabilities: [],
          totalConfidence: 0,
        });
      }
      const entry = entityMap.get(mapping.entityId);
      entry.capabilities.push({
        capabilityId: mapping.capabilityId,
        level: mapping.level,
        confidence: mapping.metrics?.confidence || 0,
      });
      entry.totalConfidence += mapping.metrics?.confidence || 0;
    }

    matrix.entities = Array.from(entityMap.values())
      .sort((a, b) => b.totalConfidence - a.totalConfidence);

    res.json({
      success: true,
      data: matrix,
    });
  } catch (error) {
    logger.error('Error fetching workforce matrix:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch matrix' },
    });
  }
});

/**
 * Get capability gaps
 * GET /gaps
 */
router.get('/gaps/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { requiredCapabilities } = req.query;

    const required = requiredCapabilities
      ? (requiredCapabilities as string).split(',')
      : [];

    // Get capability coverage
    const mappings = await CapabilityMapping.find({
      entityId: { $regex: `^${orgId}` },
      status: 'ACTIVE',
    }).lean();

    const coverage = new Map();

    for (const capability of required) {
      const mapped = mappings.filter(m => m.capabilityId === capability);
      coverage.set(capability, {
        required: true,
        mappedCount: mapped.length,
        avgConfidence: mapped.length > 0
          ? mapped.reduce((sum, m) => sum + (m.metrics?.confidence || 0), 0) / mapped.length
          : 0,
        level: mapped.length > 0 ? 'COVERED' : 'GAP',
      });
    }

    const gaps = Array.from(coverage.entries())
      .filter(([_, c]) => c.level === 'GAP')
      .map(([id, _]) => id);

    res.json({
      success: true,
      data: {
        totalRequired: required.length,
        covered: required.length - gaps.length,
        gaps: gaps.length,
        coverage: Object.fromEntries(coverage),
      },
    });
  } catch (error) {
    logger.error('Error analyzing gaps:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to analyze gaps' },
    });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function calculateInitialConfidence(evidence: any[]): number {
  if (!evidence || evidence.length === 0) return 0.3;

  const totalWeight = evidence.reduce((sum, e) => sum + (e.weight || 0.5), 0);
  return Math.min(totalWeight / evidence.length + 0.2, 0.95);
}

function calculateConfidence(evidence: any[]): number {
  if (evidence.length === 0) return 0.3;

  const weights = {
    CERTIFICATION: 0.95,
    COURSE: 0.8,
    PROJECT: 0.7,
    PEER_REVIEW: 0.6,
    SYSTEM_OBSERVED: 0.65,
    SELF_DECLARED: 0.3,
  };

  let totalWeight = 0;
  let maxWeight = 0;

  for (const e of evidence) {
    const base = weights[e.type as keyof typeof weights] || 0.5;
    const weight = base * (e.weight || 0.5);
    totalWeight += weight;
    maxWeight = Math.max(maxWeight, weight);
  }

  // Blend max weight with average
  const avgWeight = totalWeight / evidence.length;
  return Math.min(maxWeight * 0.6 + avgWeight * 0.4, 0.99);
}

export { router as capabilityRouter, Capability, CapabilityMapping };
export default router;
