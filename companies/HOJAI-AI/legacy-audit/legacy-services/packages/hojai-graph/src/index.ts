/**
 * HOJAI Unified Graph
 *
 * Single API for all entity relationships.
 * Connects humans, AI employees, customers, merchants, and more.
 *
 * Port: 4810
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

const PORT = parseInt(process.env.PORT || '4810', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-graph';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

// Entity types supported
const ENTITY_TYPES = [
  'human',           // Human employees
  'ai_employee',      // AI workers
  'customer',         // Customers
  'merchant',         // Merchants
  'supplier',         // Suppliers
  'organization',     // Companies
  'department',       // Departments
  'team',            // Teams
  'product',         // Products
  'service',         // Services
  'document',        // Documents
  'workflow',        // Workflows
  'task',           // Tasks
  'meeting',        // Meetings
  'project',         // Projects
  // Company-specific entity types
  'company_policy',   // Company policies
  'sop',             // Standard Operating Procedures
  'contract',         // Contracts
  'roadmap',          // Product/strategy roadmaps
  'decision',         // Decisions made
  'goal',             // Goals
  'okr',              // Objectives and Key Results
  'milestone',        // Milestones
  'product_feature',  // Product features
  'competitor',       // Competitors
  'investor',         // Investors
  'brand',            // Brands
  'campaign',         // Marketing campaigns
  'meeting_note',     // Meeting notes
  'action_item'       // Action items
] as const;

type EntityType = typeof ENTITY_TYPES[number];

// Relationship types
const RELATIONSHIP_TYPES = [
  'works_with',
  'reports_to',
  'owns',
  'created',
  'approved',
  'referred',
  'purchased',
  'sold',
  'manages',
  'member_of',
  'depends_on',
  'collaborates_with',
  'supersedes',
  'related_to',
  // Company-specific relationships
  'aligned_to',
  'supports',
  'blocks',
  'escalated_to',
  'reported_by',
  'owned_by',
  'deadline_of',
  'budgets_for',
  'sponsors',
  'mentors',
  'delegates_to',
  'challenges',
  'validates',
  'duplicates'
] as const;

type RelationshipType = typeof RELATIONSHIP_TYPES[number];

// Graph Schema
const NodeSchema = new mongoose.Schema({
  entityId: { type: String, required: true, index: true },
  entityType: { type: String, enum: ENTITY_TYPES, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  // AI extraction metadata
  confidenceScore: { type: Number, min: 0, max: 1, default: null },
  extractedFrom: { type: String, default: null },
  // Temporal validity
  validFrom: { type: Date, default: null },
  validTo: { type: Date, default: null },
  // Status tracking
  status: { type: String, enum: ['active', 'inactive', 'archived', 'draft'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for fast lookups
NodeSchema.index({ tenantId: 1, entityType: 1, entityId: 1 }, { unique: true });
NodeSchema.index({ tenantId: 1, name: 'text' });
NodeSchema.index({ tenantId: 1, entityType: 1, status: 1 });
NodeSchema.index({ tenantId: 1, validFrom: 1, validTo: 1 });

const EdgeSchema = new mongoose.Schema({
  edgeId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true, index: true },
  sourceId: { type: String, required: true },
  sourceType: { type: String, enum: ENTITY_TYPES, required: true },
  targetId: { type: String, required: true },
  targetType: { type: String, enum: ENTITY_TYPES, required: true },
  relationship: { type: String, enum: RELATIONSHIP_TYPES, required: true, index: true },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  weight: { type: Number, default: 1.0 },
  // AI extraction metadata
  confidenceScore: { type: Number, min: 0, max: 1, default: null },
  // Temporal validity
  validFrom: { type: Date, default: null },
  validTo: { type: Date, default: null },
  // Status tracking
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for relationship queries
EdgeSchema.index({ tenantId: 1, sourceId: 1, relationship: 1 });
EdgeSchema.index({ tenantId: 1, targetId: 1, relationship: 1 });
EdgeSchema.index({ tenantId: 1, sourceType: 1, targetType: 1, relationship: 1 });
EdgeSchema.index({ tenantId: 1, validFrom: 1, validTo: 1 });

const Node = mongoose.model('Node', NodeSchema);
const Edge = mongoose.model('Edge', EdgeSchema);

// Validation schemas
const CreateNodeSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(ENTITY_TYPES),
  name: z.string().min(1),
  properties: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

const CreateEdgeSchema = z.object({
  sourceId: z.string().min(1),
  sourceType: z.enum(ENTITY_TYPES),
  targetId: z.string().min(1),
  targetType: z.enum(ENTITY_TYPES),
  relationship: z.enum(RELATIONSHIP_TYPES),
  properties: z.record(z.any()).optional(),
  weight: z.number().min(0).max(1).optional()
});

const QuerySchema = z.object({
  entityType: z.enum(ENTITY_TYPES).optional(),
  relationship: z.enum(RELATIONSHIP_TYPES).optional(),
  depth: z.number().min(1).max(5).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(50)
});

// ============================================
// COMPANY-SPECIFIC VALIDATION SCHEMAS
// ============================================

// Company Policy Schema
const CompanyPolicySchema = z.object({
  entityId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['hr', 'security', 'compliance', 'operations', 'finance', 'legal', 'other']).optional(),
  version: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
  properties: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// SOP Schema
const SOPsSchema = z.object({
  entityId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  department: z.string().optional(),
  version: z.string().optional(),
  steps: z.array(z.object({
    order: z.number(),
    title: z.string(),
    description: z.string(),
    responsible: z.string().optional()
  })).optional(),
  properties: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// Contract Schema
const ContractSchema = z.object({
  entityId: z.string().min(1),
  name: z.string().min(1),
  counterparty: z.string().optional(),
  type: z.enum(['vendor', 'customer', 'partner', 'employee', 'nda', 'license', 'other']).optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  renewalType: z.enum(['auto', 'manual', 'none']).optional(),
  properties: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// Goal Schema
const GoalSchema = z.object({
  entityId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['company', 'department', 'team', 'individual']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  targetDate: z.string().datetime().optional(),
  ownerId: z.string().optional(),
  ownerType: z.enum(ENTITY_TYPES).optional(),
  properties: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// OKR Schema
const OKRSchema = z.object({
  entityId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  objective: z.string().optional(),
  keyResults: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    targetValue: z.number(),
    currentValue: z.number().optional(),
    unit: z.string().optional(),
    confidence: z.number().min(0).max(1).optional()
  })).optional(),
  period: z.enum(['q1', 'q2', 'q3', 'q4', 'annual']).optional(),
  year: z.number().optional(),
  ownerId: z.string().optional(),
  ownerType: z.enum(ENTITY_TYPES).optional(),
  properties: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// Competitor Schema
const CompetitorSchema = z.object({
  entityId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  website: z.string().url().optional(),
  market: z.string().optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  marketShare: z.number().optional(),
  properties: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

// Subgraph Query Schema
const SubgraphSchema = z.object({
  rootId: z.string().min(1),
  rootType: z.enum(ENTITY_TYPES),
  depth: z.number().min(1).max(5).optional().default(2),
  includeTypes: z.array(z.enum(ENTITY_TYPES)).optional(),
  excludeTypes: z.array(z.enum(ENTITY_TYPES)).optional(),
  includeRelationships: z.array(z.enum(RELATIONSHIP_TYPES)).optional(),
  excludeRelationships: z.array(z.enum(RELATIONSHIP_TYPES)).optional()
});

// Path Query Schema
const PathQuerySchema = z.object({
  sourceId: z.string().min(1),
  sourceType: z.enum(ENTITY_TYPES),
  targetId: z.string().min(1),
  targetType: z.enum(ENTITY_TYPES),
  maxDepth: z.number().min(1).max(10).optional().default(5),
  relationshipFilter: z.array(z.enum(RELATIONSHIP_TYPES)).optional()
});

// Influence Analysis Schema
const InfluenceSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(ENTITY_TYPES),
  depth: z.number().min(1).max(5).optional().default(3),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('both')
});

// Cascade Impact Schema
const CascadeSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(ENTITY_TYPES),
  maxDepth: z.number().min(1).max(5).optional().default(3),
  includeRiskScore: z.boolean().optional().default(true)
});

// Similarity Schema
const SimilaritySchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(ENTITY_TYPES),
  limit: z.number().min(1).max(20).optional().default(5),
  similarityCriteria: z.enum(['profile', 'neighbors', 'both']).optional().default('both')
});

// Entity Extraction Schema
const ExtractSchema = z.object({
  text: z.string().min(1),
  entityTypes: z.array(z.enum(ENTITY_TYPES)).optional(),
  linkToExisting: z.boolean().optional().default(true),
  minConfidence: z.number().min(0).max(1).optional().default(0.5)
});

// Auto-link Schema
const LinkSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(ENTITY_TYPES),
  candidateTypes: z.array(z.enum(ENTITY_TYPES)).optional(),
  relationshipTypes: z.array(z.enum(RELATIONSHIP_TYPES)).optional(),
  threshold: z.number().min(0).max(1).optional().default(0.7)
});

// Suggest Relationships Schema
const SuggestSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(ENTITY_TYPES),
  limit: z.number().min(1).max(20).optional().default(10)
});

// Analyze Schema
const AnalyzeSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(ENTITY_TYPES),
  analysisType: z.enum(['health', 'network', 'both']).optional().default('both')
});

// Auth middleware
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header', code: 'AUTH_REQUIRED' });
  }

  try {
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).tenantId = decoded.tenantId || decoded.tenant_id;
    (req as any).userId = decoded.sub;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', code: 'AUTH_INVALID' });
  }
}

// Health
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-graph',
    version: '1.0.0',
    entities: ENTITY_TYPES.length,
    relationships: RELATIONSHIP_TYPES.length
  });
});

// ============================================
// NODE OPERATIONS
// ============================================

// Create entity
app.post('/api/nodes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = CreateNodeSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const node = new Node({
      ...data,
      tenantId
    });

    await node.save();

    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Entity already exists', code: 'DUPLICATE' });
    }
    console.error('Create node error:', error);
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// Batch create nodes
app.post('/api/nodes/batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { nodes } = req.body;
    const tenantId = (req as any).tenantId;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ error: 'nodes must be an array', code: 'VALIDATION_ERROR' });
    }

    const operations = nodes.map((node: any) => ({
      insertOne: {
        document: { ...node, tenantId }
      }
    }));

    const result = await Node.bulkWrite(operations);

    res.json({
      success: true,
      data: {
        inserted: result.insertedCount,
        existing: nodes.length - result.insertedCount
      }
    });
  } catch (error: any) {
    console.error('Batch create error:', error);
    res.status(500).json({ error: error.message, code: 'BATCH_ERROR' });
  }
});

// Get node
app.get('/api/nodes/:entityType/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const tenantId = (req as any).tenantId;

    const node = await Node.findOne({ tenantId, entityType, entityId });

    if (!node) {
      return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
    }

    res.json({ success: true, data: node });
  } catch (error: any) {
    console.error('Get node error:', error);
    res.status(500).json({ error: error.message, code: 'GET_ERROR' });
  }
});

// Search nodes
app.get('/api/nodes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, q, limit = 50, skip = 0 } = req.query;
    const tenantId = (req as any).tenantId;

    const filter: any = { tenantId };
    if (entityType) filter.entityType = entityType;
    if (q) filter.name = { $regex: q, $options: 'i' };

    const nodes = await Node.find(filter)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .sort({ updatedAt: -1 });

    const total = await Node.countDocuments(filter);

    res.json({
      success: true,
      data: nodes,
      pagination: { total, limit: parseInt(limit as string), skip: parseInt(skip as string) }
    });
  } catch (error: any) {
    console.error('Search nodes error:', error);
    res.status(500).json({ error: error.message, code: 'SEARCH_ERROR' });
  }
});

// Update node
app.patch('/api/nodes/:entityType/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const tenantId = (req as any).tenantId;
    const { name, properties, metadata } = req.body;

    const node = await Node.findOneAndUpdate(
      { tenantId, entityType, entityId },
      { $set: { ...(name && { name }), ...(properties && { properties }), ...(metadata && { metadata }), updatedAt: new Date() } },
      { new: true }
    );

    if (!node) {
      return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
    }

    res.json({ success: true, data: node });
  } catch (error: any) {
    console.error('Update node error:', error);
    res.status(500).json({ error: error.message, code: 'UPDATE_ERROR' });
  }
});

// Delete node
app.delete('/api/nodes/:entityType/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const tenantId = (req as any).tenantId;

    // Delete node and all connected edges
    await Node.deleteOne({ tenantId, entityType, entityId });
    await Edge.deleteMany({
      tenantId,
      $or: [{ sourceId: entityId }, { targetId: entityId }]
    });

    res.json({ success: true, deleted: true });
  } catch (error: any) {
    console.error('Delete node error:', error);
    res.status(500).json({ error: error.message, code: 'DELETE_ERROR' });
  }
});

// ============================================
// RELATIONSHIP OPERATIONS
// ============================================

// Create relationship
app.post('/api/relationships', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = CreateEdgeSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const edgeId = uuid();

    const edge = new Edge({
      ...data,
      edgeId,
      tenantId
    });

    await edge.save();

    res.status(201).json({ success: true, data: edge });
  } catch (error: any) {
    console.error('Create relationship error:', error);
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// Batch create relationships
app.post('/api/relationships/batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { relationships } = req.body;
    const tenantId = (req as any).tenantId;

    if (!Array.isArray(relationships)) {
      return res.status(400).json({ error: 'relationships must be an array', code: 'VALIDATION_ERROR' });
    }

    const edges = relationships.map((rel: any) => ({
      ...rel,
      edgeId: uuid(),
      tenantId
    }));

    const result = await Edge.insertMany(edges);

    res.json({
      success: true,
      data: { inserted: result.length }
    });
  } catch (error: any) {
    console.error('Batch create relationships error:', error);
    res.status(500).json({ error: error.message, code: 'BATCH_ERROR' });
  }
});

// Get relationships for entity
app.get('/api/relationships/:entityType/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { type, direction, limit = 50 } = req.query;
    const tenantId = (req as any).tenantId;

    let filter: any = { tenantId };

    if (direction === 'incoming') {
      filter.targetId = entityId;
      filter.targetType = entityType;
    } else if (direction === 'outgoing') {
      filter.sourceId = entityId;
      filter.sourceType = entityType;
    } else {
      filter.$or = [
        { sourceId: entityId, sourceType: entityType },
        { targetId: entityId, targetType: entityType }
      ];
    }

    if (type) filter.relationship = type;

    const edges = await Edge.find(filter)
      .limit(parseInt(limit as string))
      .sort({ createdAt: -1 });

    res.json({ success: true, data: edges });
  } catch (error: any) {
    console.error('Get relationships error:', error);
    res.status(500).json({ error: error.message, code: 'GET_ERROR' });
  }
});

// Delete relationship
app.delete('/api/relationships/:edgeId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { edgeId } = req.params;
    const tenantId = (req as any).tenantId;

    await Edge.deleteOne({ tenantId, edgeId });

    res.json({ success: true, deleted: true });
  } catch (error: any) {
    console.error('Delete relationship error:', error);
    res.status(500).json({ error: error.message, code: 'DELETE_ERROR' });
  }
});

// ============================================
// GRAPH TRAVERSAL
// ============================================

// Traverse graph from entity
app.post('/api/graph/traverse', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sourceId, sourceType, relationship, depth = 1, limit = 50 } = req.body;
    const tenantId = (req as any).tenantId;

    const visited = new Set<string>();
    const results: any[] = [];
    const queue: Array<{ id: string, type: string, level: number }> = [
      { id: sourceId, type: sourceType, level: 0 }
    ];

    while (queue.length > 0 && results.length < limit) {
      const current = queue.shift()!;

      if (visited.has(`${current.type}:${current.id}`)) continue;
      visited.add(`${current.type}:${current.id}`);

      // Get current node
      const node = await Node.findOne({ tenantId, entityType: current.type, entityId: current.id });
      if (node) results.push({ ...node.toObject(), level: current.level });

      if (current.level >= depth) continue;

      // Get connected edges
      const edges = await Edge.find({
        tenantId,
        $or: [
          { sourceId: current.id, sourceType: current.type },
          { targetId: current.id, targetType: current.type }
        ],
        ...(relationship && { relationship })
      }).limit(limit);

      for (const edge of edges) {
        const isSource = edge.sourceId === current.id;
        const nextId = isSource ? edge.targetId : edge.sourceId;
        const nextType = isSource ? edge.targetType : edge.sourceType;

        if (!visited.has(`${nextType}:${nextId}`)) {
          queue.push({ id: nextId, type: nextType, level: current.level + 1 });
        }
      }
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Traverse error:', error);
    res.status(500).json({ error: error.message, code: 'TRAVERSE_ERROR' });
  }
});

// Get ego network (entity + direct connections)
app.get('/api/graph/ego/:entityType/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 50 } = req.query;
    const tenantId = (req as any).tenantId;

    // Get the central node
    const center = await Node.findOne({ tenantId, entityType, entityId });
    if (!center) {
      return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
    }

    // Get all direct connections
    const edges = await Edge.find({
      tenantId,
      $or: [
        { sourceId: entityId, sourceType: entityType },
        { targetId: entityId, targetType: entityType }
      ]
    }).limit(parseInt(limit as string));

    // Get connected nodes
    const connectedIds = edges.map(e =>
      e.sourceId === entityId ? { id: e.targetId, type: e.targetType } : { id: e.sourceId, type: e.sourceType }
    );

    const connectedNodes = await Node.find({
      tenantId,
      $or: connectedIds.map(c => ({ entityId: c.id, entityType: c.type }))
    });

    res.json({
      success: true,
      data: {
        center,
        connections: connectedNodes,
        relationships: edges
      }
    });
  } catch (error: any) {
    console.error('Ego network error:', error);
    res.status(500).json({ error: error.message, code: 'EGO_ERROR' });
  }
});

// ============================================
// UNIFIED QUERY
// ============================================

// Query across entity types
app.post('/api/query', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, relationship, targetType, filters, limit = 50 } = req.body;
    const tenantId = (req as any).tenantId;

    let filter: any = { tenantId };

    if (entityType) filter.sourceType = entityType;
    if (targetType) filter.targetType = targetType;
    if (relationship) filter.relationship = relationship;

    const edges = await Edge.find(filter).limit(limit);

    // Get all related nodes
    const allIds = edges.flatMap(e => [
      { entityId: e.sourceId, entityType: e.sourceType },
      { entityId: e.targetId, entityType: e.targetType }
    ]);

    const nodes = await Node.find({
      tenantId,
      $or: allIds
    });

    const nodeMap = new Map(nodes.map(n => [`${n.entityType}:${n.entityId}`, n]));

    const results = edges.map(edge => ({
      edge,
      source: nodeMap.get(`${edge.sourceType}:${edge.sourceId}`),
      target: nodeMap.get(`${edge.targetType}:${edge.targetId}`)
    }));

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message, code: 'QUERY_ERROR' });
  }
});

// ============================================
// AI EMPLOYEE SPECIFIC
// ============================================

// Register AI employee
app.post('/api/ai-employees', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { aiEmployeeId, name, role, department, managerId, skills } = req.body;
    const tenantId = (req as any).tenantId;

    // Create AI employee node
    const node = new Node({
      entityId: aiEmployeeId,
      entityType: 'ai_employee',
      tenantId,
      name,
      properties: { role, department, skills, level: 1, xp: 0 }
    });

    await node.save();

    // Link to manager if provided
    if (managerId) {
      const edge = new Edge({
        edgeId: uuid(),
        tenantId,
        sourceId: aiEmployeeId,
        sourceType: 'ai_employee',
        targetId: managerId,
        targetType: 'ai_employee',
        relationship: 'reports_to',
        properties: { type: 'manager' }
      });
      await edge.save();
    }

    // Add to department
    if (department) {
      const deptEdge = new Edge({
        edgeId: uuid(),
        tenantId,
        sourceId: aiEmployeeId,
        sourceType: 'ai_employee',
        targetId: department,
        targetType: 'department',
        relationship: 'member_of'
      });
      await deptEdge.save();
    }

    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    console.error('Register AI employee error:', error);
    res.status(400).json({ error: error.message, code: 'ERROR' });
  }
});

// Get AI team
app.get('/api/ai-employees/team/:department', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { department } = req.params;
    const tenantId = (req as any).tenantId;

    // Get department node
    const dept = await Node.findOne({
      tenantId,
      entityType: 'department',
      entityId: department
    });

    if (!dept) {
      return res.status(404).json({ error: 'Department not found', code: 'NOT_FOUND' });
    }

    // Get all members
    const memberEdges = await Edge.find({
      tenantId,
      targetType: 'department',
      targetId: department,
      relationship: 'member_of'
    });

    const memberIds = memberEdges.map(e => ({
      entityId: e.sourceId,
      entityType: e.sourceType
    }));

    const members = await Node.find({
      tenantId,
      $or: memberIds
    });

    // Get hierarchy
    const hierarchies = await Edge.find({
      tenantId,
      sourceId: { $in: members.map(m => m.entityId) },
      relationship: 'reports_to'
    });

    res.json({
      success: true,
      data: {
        department: dept,
        members,
        hierarchies
      }
    });
  } catch (error: any) {
    console.error('Get AI team error:', error);
    res.status(500).json({ error: error.message, code: 'ERROR' });
  }
});

// ============================================
// COMPANY KNOWLEDGE ROUTES
// ============================================

// Company Policies

// Create company policy
app.post('/api/company/policies', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = CompanyPolicySchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const node = new Node({
      entityId: data.entityId,
      entityType: 'company_policy',
      tenantId,
      name: data.name,
      properties: {
        description: data.description,
        category: data.category,
        version: data.version,
        effectiveDate: data.effectiveDate
      },
      metadata: data.metadata,
      validFrom: data.effectiveDate ? new Date(data.effectiveDate) : new Date()
    });

    await node.save();

    // Link to department if applicable
    if (data.properties?.departmentId) {
      const edge = new Edge({
        edgeId: uuid(),
        tenantId,
        sourceId: data.entityId,
        sourceType: 'company_policy',
        targetId: data.properties.departmentId,
        targetType: 'department',
        relationship: 'owned_by'
      });
      await edge.save();
    }

    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Policy already exists', code: 'DUPLICATE' });
    }
    console.error('Create policy error:', error);
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// List company policies
app.get('/api/company/policies', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, q, limit = 50, skip = 0 } = req.query;
    const tenantId = (req as any).tenantId;

    const filter: any = { tenantId, entityType: 'company_policy' };
    if (category) filter['properties.category'] = category;
    if (q) filter.name = { $regex: q as string, $options: 'i' };

    const policies = await Node.find(filter)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .sort({ updatedAt: -1 });

    const total = await Node.countDocuments(filter);

    res.json({
      success: true,
      data: policies,
      pagination: { total, limit: parseInt(limit as string), skip: parseInt(skip as string) }
    });
  } catch (error: any) {
    console.error('List policies error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// SOPs

// Create SOP
app.post('/api/company/sops', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = SOPsSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const node = new Node({
      entityId: data.entityId,
      entityType: 'sop',
      tenantId,
      name: data.name,
      properties: {
        description: data.description,
        department: data.department,
        version: data.version,
        steps: data.steps
      },
      metadata: data.metadata
    });

    await node.save();

    // Link to department
    if (data.department) {
      const edge = new Edge({
        edgeId: uuid(),
        tenantId,
        sourceId: data.entityId,
        sourceType: 'sop',
        targetId: data.department,
        targetType: 'department',
        relationship: 'owned_by'
      });
      await edge.save();
    }

    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'SOP already exists', code: 'DUPLICATE' });
    }
    console.error('Create SOP error:', error);
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// List SOPs
app.get('/api/company/sops', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { department, q, limit = 50, skip = 0 } = req.query;
    const tenantId = (req as any).tenantId;

    const filter: any = { tenantId, entityType: 'sop' };
    if (department) filter['properties.department'] = department;
    if (q) filter.name = { $regex: q as string, $options: 'i' };

    const sops = await Node.find(filter)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .sort({ updatedAt: -1 });

    const total = await Node.countDocuments(filter);

    res.json({
      success: true,
      data: sops,
      pagination: { total, limit: parseInt(limit as string), skip: parseInt(skip as string) }
    });
  } catch (error: any) {
    console.error('List SOPs error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// Contracts

// Create contract
app.post('/api/company/contracts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = ContractSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const node = new Node({
      entityId: data.entityId,
      entityType: 'contract',
      tenantId,
      name: data.name,
      properties: {
        counterparty: data.counterparty,
        type: data.type,
        value: data.value,
        currency: data.currency || 'USD',
        startDate: data.startDate,
        endDate: data.endDate,
        renewalType: data.renewalType
      },
      metadata: data.metadata,
      validFrom: data.startDate ? new Date(data.startDate) : undefined,
      validTo: data.endDate ? new Date(data.endDate) : undefined
    });

    await node.save();

    // Link counterparty if applicable
    if (data.counterparty) {
      const edge = new Edge({
        edgeId: uuid(),
        tenantId,
        sourceId: data.entityId,
        sourceType: 'contract',
        targetId: data.counterparty,
        targetType: data.type === 'vendor' ? 'supplier' : data.type === 'customer' ? 'customer' : 'organization',
        relationship: 'related_to'
      });
      await edge.save();
    }

    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Contract already exists', code: 'DUPLICATE' });
    }
    console.error('Create contract error:', error);
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// List contracts
app.get('/api/company/contracts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { type, status, q, limit = 50, skip = 0 } = req.query;
    const tenantId = (req as any).tenantId;

    const filter: any = { tenantId, entityType: 'contract' };
    if (type) filter['properties.type'] = type;
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q as string, $options: 'i' };

    const contracts = await Node.find(filter)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .sort({ 'properties.endDate': 1, updatedAt: -1 });

    const total = await Node.countDocuments(filter);

    res.json({
      success: true,
      data: contracts,
      pagination: { total, limit: parseInt(limit as string), skip: parseInt(skip as string) }
    });
  } catch (error: any) {
    console.error('List contracts error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// ============================================
// GOAL / OKR ROUTES
// ============================================

// Create goal
app.post('/api/goals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = GoalSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const node = new Node({
      entityId: data.entityId,
      entityType: 'goal',
      tenantId,
      name: data.name,
      properties: {
        description: data.description,
        type: data.type,
        priority: data.priority,
        targetDate: data.targetDate,
        ownerId: data.ownerId,
        ownerType: data.ownerType
      },
      metadata: data.metadata,
      validFrom: data.targetDate ? new Date(data.targetDate) : undefined
    });

    await node.save();

    // Link owner if specified
    if (data.ownerId && data.ownerType) {
      const edge = new Edge({
        edgeId: uuid(),
        tenantId,
        sourceId: data.entityId,
        sourceType: 'goal',
        targetId: data.ownerId,
        targetType: data.ownerType,
        relationship: 'owned_by'
      });
      await edge.save();
    }

    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Goal already exists', code: 'DUPLICATE' });
    }
    console.error('Create goal error:', error);
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// List goals
app.get('/api/goals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { type, priority, ownerId, status, q, limit = 50, skip = 0 } = req.query;
    const tenantId = (req as any).tenantId;

    const filter: any = { tenantId, entityType: 'goal' };
    if (type) filter['properties.type'] = type;
    if (priority) filter['properties.priority'] = priority;
    if (ownerId) filter['properties.ownerId'] = ownerId;
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q as string, $options: 'i' };

    const goals = await Node.find(filter)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .sort({ 'properties.priority': 1, 'properties.targetDate': 1 });

    const total = await Node.countDocuments(filter);

    res.json({
      success: true,
      data: goals,
      pagination: { total, limit: parseInt(limit as string), skip: parseInt(skip as string) }
    });
  } catch (error: any) {
    console.error('List goals error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// Align goal to strategy
app.post('/api/goals/:id/align', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { strategyId, strategyType, alignmentType = 'aligned_to' } = req.body;
    const tenantId = (req as any).tenantId;

    if (!strategyId || !strategyType) {
      return res.status(400).json({ error: 'strategyId and strategyType are required', code: 'VALIDATION_ERROR' });
    }

    const goal = await Node.findOne({ tenantId, entityType: 'goal', entityId: id });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found', code: 'NOT_FOUND' });
    }

    const edge = new Edge({
      edgeId: uuid(),
      tenantId,
      sourceId: id,
      sourceType: 'goal',
      targetId: strategyId,
      targetType: strategyType,
      relationship: alignmentType
    });

    await edge.save();

    res.status(201).json({ success: true, data: edge });
  } catch (error: any) {
    console.error('Align goal error:', error);
    res.status(500).json({ error: error.message, code: 'ALIGN_ERROR' });
  }
});

// Create OKR
app.post('/api/okrs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = OKRSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const node = new Node({
      entityId: data.entityId,
      entityType: 'okr',
      tenantId,
      name: data.name,
      properties: {
        description: data.description,
        objective: data.objective,
        keyResults: data.keyResults,
        period: data.period,
        year: data.year,
        ownerId: data.ownerId,
        ownerType: data.ownerType
      },
      metadata: data.metadata
    });

    await node.save();

    // Link owner
    if (data.ownerId && data.ownerType) {
      const edge = new Edge({
        edgeId: uuid(),
        tenantId,
        sourceId: data.entityId,
        sourceType: 'okr',
        targetId: data.ownerId,
        targetType: data.ownerType,
        relationship: 'owned_by'
      });
      await edge.save();
    }

    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'OKR already exists', code: 'DUPLICATE' });
    }
    console.error('Create OKR error:', error);
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// List OKRs
app.get('/api/okrs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { period, year, ownerId, status, q, limit = 50, skip = 0 } = req.query;
    const tenantId = (req as any).tenantId;

    const filter: any = { tenantId, entityType: 'okr' };
    if (period) filter['properties.period'] = period;
    if (year) filter['properties.year'] = parseInt(year as string);
    if (ownerId) filter['properties.ownerId'] = ownerId;
    if (status) filter.status = status;
    if (q) filter.name = { $regex: q as string, $options: 'i' };

    const okrs = await Node.find(filter)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .sort({ 'properties.year': -1, 'properties.period': -1 });

    const total = await Node.countDocuments(filter);

    res.json({
      success: true,
      data: okrs,
      pagination: { total, limit: parseInt(limit as string), skip: parseInt(skip as string) }
    });
  } catch (error: any) {
    console.error('List OKRs error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// ============================================
// COMPETITOR ROUTES
// ============================================

// Create competitor
app.post('/api/competitors', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = CompetitorSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const node = new Node({
      entityId: data.entityId,
      entityType: 'competitor',
      tenantId,
      name: data.name,
      properties: {
        description: data.description,
        website: data.website,
        market: data.market,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        marketShare: data.marketShare
      },
      metadata: data.metadata
    });

    await node.save();

    res.status(201).json({ success: true, data: node });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Competitor already exists', code: 'DUPLICATE' });
    }
    console.error('Create competitor error:', error);
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// List competitors
app.get('/api/competitors', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { market, q, limit = 50, skip = 0 } = req.query;
    const tenantId = (req as any).tenantId;

    const filter: any = { tenantId, entityType: 'competitor' };
    if (market) filter['properties.market'] = market;
    if (q) filter.name = { $regex: q as string, $options: 'i' };

    const competitors = await Node.find(filter)
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .sort({ 'properties.marketShare': -1, name: 1 });

    const total = await Node.countDocuments(filter);

    res.json({
      success: true,
      data: competitors,
      pagination: { total, limit: parseInt(limit as string), skip: parseInt(skip as string) }
    });
  } catch (error: any) {
    console.error('List competitors error:', error);
    res.status(500).json({ error: error.message, code: 'LIST_ERROR' });
  }
});

// Link competitor product
app.post('/api/competitors/:id/products', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { productId, productName, comparison } = req.body;
    const tenantId = (req as any).tenantId;

    const competitor = await Node.findOne({ tenantId, entityType: 'competitor', entityId: id });
    if (!competitor) {
      return res.status(404).json({ error: 'Competitor not found', code: 'NOT_FOUND' });
    }

    // Create or find product
    let productNode;
    if (productId) {
      productNode = await Node.findOne({ tenantId, entityType: 'product', entityId: productId });
    }

    if (!productNode && productName) {
      productNode = new Node({
        entityId: productId || uuid(),
        entityType: 'product',
        tenantId,
        name: productName,
        properties: { competitor: id }
      });
      await productNode.save();
    }

    // Link competitor to product
    const edge = new Edge({
      edgeId: uuid(),
      tenantId,
      sourceId: id,
      sourceType: 'competitor',
      targetId: productNode!.entityId,
      targetType: 'product',
      relationship: 'owns',
      properties: { comparison }
    });

    await edge.save();

    res.status(201).json({ success: true, data: edge });
  } catch (error: any) {
    console.error('Link competitor product error:', error);
    res.status(500).json({ error: error.message, code: 'LINK_ERROR' });
  }
});

// Get competitive analysis
app.get('/api/competitors/:id/analysis', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    const competitor = await Node.findOne({ tenantId, entityType: 'competitor', entityId: id });
    if (!competitor) {
      return res.status(404).json({ error: 'Competitor not found', code: 'NOT_FOUND' });
    }

    // Get competitor products
    const productEdges = await Edge.find({
      tenantId,
      sourceId: id,
      sourceType: 'competitor',
      relationship: 'owns'
    });

    const productIds = productEdges.map(e => ({ entityId: e.targetId, entityType: 'product' }));
    const products = await Node.find({ tenantId, $or: productIds });

    // Get all competitors for comparison
    const allCompetitors = await Node.find({
      tenantId,
      entityType: 'competitor'
    });

    // Build analysis
    const analysis = {
      competitor,
      products,
      totalProducts: products.length,
      marketShare: competitor.properties?.marketShare || 0,
      strengths: competitor.properties?.strengths || [],
      weaknesses: competitor.properties?.weaknesses || [],
      market: competitor.properties?.market || null,
      competitiveLandscape: allCompetitors.map(c => ({
        name: c.name,
        marketShare: c.properties?.marketShare || 0,
        productCount: c.entityId === id ? products.length : undefined
      })).filter(c => c.marketShare > 0 || c.productCount !== undefined)
    };

    res.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error('Competitor analysis error:', error);
    res.status(500).json({ error: error.message, code: 'ANALYSIS_ERROR' });
  }
});

// ============================================
// ADVANCED GRAPH ROUTES
// ============================================

// Get subgraph for entity cluster
app.post('/api/graph/subgraph', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = SubgraphSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const visited = new Set<string>();
    const nodes: any[] = [];
    const edges: any[] = [];
    const queue: Array<{ id: string, type: string, level: number }> = [
      { id: data.rootId, type: data.rootType, level: 0 }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.type}:${current.id}`;

      if (visited.has(key)) continue;
      visited.add(key);

      // Get node
      const node = await Node.findOne({ tenantId, entityType: current.type, entityId: current.id });
      if (node) {
        // Apply type filters
        if (!data.includeTypes || data.includeTypes.includes(current.type as any)) {
          if (!data.excludeTypes || !data.excludeTypes.includes(current.type as any)) {
            nodes.push({ ...node.toObject(), level: current.level });
          }
        }
      }

      if (current.level >= data.depth) continue;

      // Get connected edges with filters
      const edgeFilter: any = {
        tenantId,
        $or: [
          { sourceId: current.id, sourceType: current.type },
          { targetId: current.id, targetType: current.type }
        ]
      };

      if (data.includeRelationships) {
        edgeFilter.relationship = { $in: data.includeRelationships };
      }
      if (data.excludeRelationships) {
        edgeFilter.relationship = { $nin: data.excludeRelationships, ...(edgeFilter.relationship || {}) };
      }

      const connectedEdges = await Edge.find(edgeFilter);

      for (const edge of connectedEdges) {
        // Apply relationship filters
        if (data.includeRelationships && !data.includeRelationships.includes(edge.relationship as any)) continue;
        if (data.excludeRelationships && data.excludeRelationships.includes(edge.relationship as any)) continue;

        if (!edges.find(e => e.edgeId === edge.edgeId)) {
          edges.push(edge);
        }

        const isSource = edge.sourceId === current.id;
        const nextId = isSource ? edge.targetId : edge.sourceId;
        const nextType = isSource ? edge.targetType : edge.sourceType;

        if (!visited.has(`${nextType}:${nextId}`)) {
          queue.push({ id: nextId, type: nextType, level: current.level + 1 });
        }
      }
    }

    res.json({
      success: true,
      data: {
        nodes,
        edges,
        stats: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          maxDepth: data.depth
        }
      }
    });
  } catch (error: any) {
    console.error('Subgraph error:', error);
    res.status(500).json({ error: error.message, code: 'SUBGRAPH_ERROR' });
  }
});

// Find shortest path between entities
app.post('/api/graph/path', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = PathQuerySchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    // BFS for shortest path
    const visited = new Map<string, { id: string, type: string, edge: any }>();
    const queue: Array<{ id: string, type: string }> = [
      { id: data.sourceId, type: data.sourceType }
    ];

    visited.set(`${data.sourceType}:${data.sourceId}`, { id: data.sourceId, type: data.sourceType, edge: null });

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.id === data.targetId && current.type === data.targetType) {
        // Reconstruct path
        const path: any[] = [];
        let key = `${current.type}:${current.id}`;
        while (visited.get(key)?.edge) {
          const entry = visited.get(key)!;
          path.unshift({
            nodeId: entry.id,
            nodeType: entry.type,
            relationship: entry.edge.relationship,
            properties: entry.edge.properties
          });
          key = entry.edge.sourceId === entry.id
            ? `${entry.edge.targetType}:${entry.edge.targetId}`
            : `${entry.edge.sourceType}:${entry.edge.sourceId}`;
        }
        path.unshift({ nodeId: current.id, nodeType: current.type });

        return res.json({
          success: true,
          data: {
            path,
            length: path.length - 1,
            edges: path.length - 1
          }
        });
      }

      if (visited.size > data.maxDepth * 100) break; // Safety limit

      // Get edges
      const edgeFilter: any = {
        tenantId,
        $or: [
          { sourceId: current.id, sourceType: current.type },
          { targetId: current.id, targetType: current.type }
        ]
      };

      if (data.relationshipFilter) {
        edgeFilter.relationship = { $in: data.relationshipFilter };
      }

      const edges = await Edge.find(edgeFilter).limit(50);

      for (const edge of edges) {
        const isSource = edge.sourceId === current.id;
        const nextId = isSource ? edge.targetId : edge.sourceId;
        const nextType = isSource ? edge.targetType : edge.sourceType;
        const nextKey = `${nextType}:${nextId}`;

        if (!visited.has(nextKey)) {
          visited.set(nextKey, { id: nextId, type: nextType, edge });
          queue.push({ id: nextId, type: nextType });
        }
      }
    }

    res.json({
      success: true,
      data: {
        path: null,
        message: 'No path found within max depth'
      }
    });
  } catch (error: any) {
    console.error('Path finding error:', error);
    res.status(500).json({ error: error.message, code: 'PATH_ERROR' });
  }
});

// Influence/Impact analysis
app.post('/api/graph/influence', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = InfluenceSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const visited = new Set<string>();
    const influenceMap = new Map<string, { id: string, type: string, score: number, path: string[] }>();
    const queue: Array<{ id: string, type: string, level: number, path: string[] }> = [
      { id: data.entityId, type: data.entityType, level: 0, path: [] }
    ];

    influenceMap.set(`${data.entityType}:${data.entityId}`, {
      id: data.entityId,
      type: data.entityType,
      score: 1.0,
      path: []
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.type}:${current.id}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (current.level >= data.depth) continue;

      // Get edges based on direction
      const edgeFilter: any = { tenantId };
      if (data.direction === 'outgoing') {
        edgeFilter.sourceId = current.id;
        edgeFilter.sourceType = current.type;
      } else if (data.direction === 'incoming') {
        edgeFilter.targetId = current.id;
        edgeFilter.targetType = current.type;
      } else {
        edgeFilter.$or = [
          { sourceId: current.id, sourceType: current.type },
          { targetId: current.id, targetType: current.type }
        ];
      }

      const edges = await Edge.find(edgeFilter);

      for (const edge of edges) {
        const isSource = edge.sourceId === current.id;
        const nextId = isSource ? edge.targetId : edge.sourceId;
        const nextType = isSource ? edge.targetType : edge.sourceType;
        const nextKey = `${nextType}:${nextId}`;

        // Calculate influence score based on weight and path
        const parentScore = influenceMap.get(key)?.score || 1.0;
        const edgeWeight = edge.weight || 1.0;
        const newScore = parentScore * edgeWeight * 0.8; // Decay factor

        if (!visited.has(nextKey)) {
          const existing = influenceMap.get(nextKey);
          if (!existing || existing.score < newScore) {
            influenceMap.set(nextKey, {
              id: nextId,
              type: nextType,
              score: newScore,
              path: [...current.path, edge.relationship]
            });
          }
          queue.push({
            id: nextId,
            type: nextType,
            level: current.level + 1,
            path: [...current.path, edge.relationship]
          });
        }
      }
    }

    // Get full node details for influenced entities
    const influencedEntities = Array.from(influenceMap.values())
      .filter(e => !(e.id === data.entityId && e.type === data.entityType))
      .sort((a, b) => b.score - a.score);

    const nodeIds = influencedEntities.map(e => ({ entityId: e.id, entityType: e.type }));
    const nodes = await Node.find({ tenantId, $or: nodeIds });
    const nodeMap = new Map(nodes.map(n => [`${n.entityType}:${n.entityId}`, n]));

    const results = influencedEntities.map(e => ({
      ...e,
      node: nodeMap.get(`${e.type}:${e.id}`)
    }));

    // Calculate key influencers (top 20%)
    const topInfluencers = results.slice(0, Math.ceil(results.length * 0.2));

    res.json({
      success: true,
      data: {
        sourceEntity: { id: data.entityId, type: data.entityType },
        totalInfluenced: results.length,
        maxDepth: data.depth,
        direction: data.direction,
        influenceScore: influenceMap.get(`${data.entityType}:${data.entityId}`)?.score || 0,
        keyInfluencers: topInfluencers,
        allInfluenced: results.slice(0, 50) // Limit response size
      }
    });
  } catch (error: any) {
    console.error('Influence analysis error:', error);
    res.status(500).json({ error: error.message, code: 'INFLUENCE_ERROR' });
  }
});

// Cascade impact analysis
app.post('/api/graph/cascade', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = CascadeSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    const visited = new Set<string>();
    const cascadeMap = new Map<string, { id: string, type: string, dependencies: number, riskScore: number, path: any[] }>();
    const queue: Array<{ id: string, type: string, level: number, path: any[] }> = [
      { id: data.entityId, type: data.entityType, level: 0, path: [] }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.type}:${current.id}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (current.level >= data.maxDepth) continue;

      // Find what depends on this entity
      const dependsOnEdges = await Edge.find({
        tenantId,
        targetId: current.id,
        targetType: current.type,
        relationship: { $in: ['depends_on', 'aligned_to', 'supports', 'member_of'] }
      });

      // Find what this entity blocks
      const blockedByEdges = await Edge.find({
        tenantId,
        targetId: current.id,
        targetType: current.type,
        relationship: 'blocks'
      });

      const totalDependencies = dependsOnEdges.length + blockedByEdges.length;
      const riskScore = Math.min(1, totalDependencies * 0.15 + current.level * 0.1);

      cascadeMap.set(key, {
        id: current.id,
        type: current.type,
        dependencies: totalDependencies,
        riskScore,
        path: current.path
      });

      // Process dependent entities
      for (const edge of dependsOnEdges) {
        if (!visited.has(`${edge.sourceType}:${edge.sourceId}`)) {
          queue.push({
            id: edge.sourceId,
            type: edge.sourceType,
            level: current.level + 1,
            path: [...current.path, { relationship: 'depends_on', entity: edge.sourceId }]
          });
        }
      }

      for (const edge of blockedByEdges) {
        if (!visited.has(`${edge.sourceType}:${edge.sourceId}`)) {
          queue.push({
            id: edge.sourceId,
            type: edge.sourceType,
            level: current.level + 1,
            path: [...current.path, { relationship: 'blocks', entity: edge.sourceId }]
          });
        }
      }
    }

    const cascadeResults = Array.from(cascadeMap.values())
      .filter(e => !(e.id === data.entityId && e.type === data.entityType))
      .sort((a, b) => b.riskScore - a.riskScore);

    // Get node details
    const nodeIds = cascadeResults.map(e => ({ entityId: e.id, entityType: e.type }));
    const nodes = await Node.find({ tenantId, $or: nodeIds });
    const nodeMap = new Map(nodes.map(n => [`${n.entityType}:${n.entityId}`, n]));

    const results = cascadeResults.map(e => ({
      ...e,
      node: nodeMap.get(`${e.type}:${e.id}`)
    }));

    // Calculate overall impact score
    const avgRiskScore = cascadeResults.length > 0
      ? cascadeResults.reduce((sum, e) => sum + e.riskScore, 0) / cascadeResults.length
      : 0;

    res.json({
      success: true,
      data: {
        sourceEntity: { id: data.entityId, type: data.entityType },
        cascadeImpact: results,
        summary: {
          totalAffected: cascadeResults.length,
          avgRiskScore: Math.round(avgRiskScore * 100) / 100,
          criticalEntities: cascadeResults.filter(e => e.riskScore >= 0.7).length,
          highRiskEntities: cascadeResults.filter(e => e.riskScore >= 0.5 && e.riskScore < 0.7).length,
          maxDepth: data.maxDepth
        }
      }
    });
  } catch (error: any) {
    console.error('Cascade analysis error:', error);
    res.status(500).json({ error: error.message, code: 'CASCADE_ERROR' });
  }
});

// Find similar entities
app.post('/api/graph/similarity', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = SimilaritySchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    // Get the source entity
    const sourceNode = await Node.findOne({
      tenantId,
      entityType: data.entityType,
      entityId: data.entityId
    });

    if (!sourceNode) {
      return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
    }

    const similarities: Array<{ entity: any; score: number; matchType: string; commonNeighbors: any[] }> = [];

    // Get neighbors of source
    const sourceEdges = await Edge.find({
      tenantId,
      $or: [
        { sourceId: data.entityId, sourceType: data.entityType },
        { targetId: data.entityId, targetType: data.entityType }
      ]
    });

    const sourceNeighborIds = new Set<string>();
    sourceEdges.forEach(e => {
      if (e.sourceId !== data.entityId) sourceNeighborIds.add(`${e.sourceType}:${e.sourceId}`);
      if (e.targetId !== data.entityId) sourceNeighborIds.add(`${e.targetType}:${e.targetId}`);
    });

    // Find candidate entities
    const candidateFilter: any = {
      tenantId,
      entityType: data.entityType,
      entityId: { $ne: data.entityId }
    };

    const candidates = await Node.find(candidateFilter).limit(100);

    for (const candidate of candidates) {
      const candidateKey = `${candidate.entityType}:${candidate.entityId}`;

      // Profile similarity
      let profileScore = 0;
      if (data.similarityCriteria === 'profile' || data.similarityCriteria === 'both') {
        const sourceProps = sourceNode.properties || {};
        const candidateProps = candidate.properties || {};

        const allKeys = new Set([...Object.keys(sourceProps), ...Object.keys(candidateProps)]);
        let matchCount = 0;

        for (const key of allKeys) {
          if (JSON.stringify(sourceProps[key]) === JSON.stringify(candidateProps[key])) {
            matchCount++;
          }
        }

        profileScore = allKeys.size > 0 ? matchCount / allKeys.size : 0;
      }

      // Neighbor similarity
      let neighborScore = 0;
      if (data.similarityCriteria === 'neighbors' || data.similarityCriteria === 'both') {
        const candidateEdges = await Edge.find({
          tenantId,
          $or: [
            { sourceId: candidate.entityId, sourceType: candidate.entityType },
            { targetId: candidate.entityId, targetType: candidate.entityType }
          ]
        });

        const candidateNeighbors = new Set<string>();
        candidateEdges.forEach(e => {
          if (e.sourceId !== candidate.entityId) candidateNeighbors.add(`${e.sourceType}:${e.sourceId}`);
          if (e.targetId !== candidate.entityId) candidateNeighbors.add(`${e.targetType}:${e.targetId}`);
        });

        // Calculate Jaccard similarity
        const intersection = [...sourceNeighborIds].filter(n => candidateNeighbors.has(n)).length;
        const union = new Set([...sourceNeighborIds, ...candidateNeighbors]).size;
        neighborScore = union > 0 ? intersection / union : 0;

        // Find common neighbors
        const commonNeighborKeys = [...sourceNeighborIds].filter(n => candidateNeighbors.has(n));
        const commonNeighborNodes = await Node.find({
          tenantId,
          $or: commonNeighborKeys.map(k => {
            const [type, id] = k.split(':');
            return { entityType: type, entityId: id };
          })
        });
      }

      const finalScore = data.similarityCriteria === 'profile'
        ? profileScore
        : data.similarityCriteria === 'neighbors'
          ? neighborScore
          : (profileScore + neighborScore) / 2;

      if (finalScore > 0) {
        similarities.push({
          entity: candidate,
          score: Math.round(finalScore * 100) / 100,
          matchType: data.similarityCriteria,
          commonNeighbors: []
        });
      }
    }

    // Sort by score and return top results
    const sortedSimilarities = similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, data.limit);

    res.json({
      success: true,
      data: {
        sourceEntity: { id: data.entityId, type: data.entityType, name: sourceNode.name },
        totalCandidates: candidates.length,
        similarEntities: sortedSimilarities,
        criteria: data.similarityCriteria
      }
    });
  } catch (error: any) {
    console.error('Similarity analysis error:', error);
    res.status(500).json({ error: error.message, code: 'SIMILARITY_ERROR' });
  }
});

// ============================================
// AI-POWERED ROUTES
// ============================================

// Extract entities from text
app.post('/api/extract', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = ExtractSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    // AI-powered entity extraction (simulated for now - in production, integrate with LLM)
    const extractedEntities: Array<{
      name: string;
      type: EntityType;
      confidence: number;
      matchedExisting: boolean;
      existingEntity?: any;
    }> = [];

    // Keyword-based extraction patterns
    const patterns: Record<string, { types: EntityType[]; keywords: string[] }> = {
      human: { types: ['human'], keywords: ['employee', 'founder', 'ceo', 'cto', 'manager', 'director', 'vp', 'head of'] },
      ai_employee: { types: ['ai_employee'], keywords: ['ai', 'bot', 'assistant', 'agent'] },
      customer: { types: ['customer'], keywords: ['customer', 'client', 'user'] },
      organization: { types: ['organization'], keywords: ['company', 'inc', 'llc', 'corp', 'startup'] },
      product: { types: ['product'], keywords: ['product', 'feature', 'module'] },
      project: { types: ['project'], keywords: ['project', 'initiative'] },
      goal: { types: ['goal'], keywords: ['goal', 'objective', 'target'] },
      milestone: { types: ['milestone'], keywords: ['milestone', 'deadline', 'launch'] },
      competitor: { types: ['competitor'], keywords: ['competitor', 'rival', 'competing'] },
      contract: { types: ['contract'], keywords: ['contract', 'agreement', 'sla', 'nda'] },
      meeting: { types: ['meeting'], keywords: ['meeting', 'call', 'sync', 'standup'] },
      decision: { types: ['decision'], keywords: ['decision', 'decided', 'approved'] },
      campaign: { types: ['campaign'], keywords: ['campaign', 'marketing', 'promotion'] }
    };

    const textLower = data.text.toLowerCase();
    const processedNames = new Set<string>();

    // Extract entities based on patterns
    for (const [, config] of Object.entries(patterns)) {
      if (data.entityTypes && !data.entityTypes.some(t => config.types.includes(t))) continue;

      for (const keyword of config.keywords) {
        const regex = new RegExp(`(?<=^|\\s)(${keyword})\\s+([A-Z][a-zA-Z\\s]+?)(?=\\s|$|,|\\.)`, 'gi');
        let match;

        while ((match = regex.exec(data.text)) !== null) {
          const name = match[2].trim();
          if (name.length > 2 && !processedNames.has(name.toLowerCase())) {
            processedNames.add(name.toLowerCase());

            // Check if entity already exists
            let matchedExisting = false;
            let existingEntity = null;

            if (data.linkToExisting) {
              existingEntity = await Node.findOne({
                tenantId,
                entityType: { $in: config.types },
                name: { $regex: new RegExp(`^${name}$`, 'i') }
              });

              if (existingEntity) {
                matchedExisting = true;
              }
            }

            // Calculate confidence based on match quality
            const confidence = matchedExisting ? 0.95 : 0.6 + Math.random() * 0.3;

            if (confidence >= data.minConfidence) {
              extractedEntities.push({
                name,
                type: config.types[0],
                confidence: Math.round(confidence * 100) / 100,
                matchedExisting,
                existingEntity
              });
            }
          }
        }
      }
    }

    // Extract proper nouns (potential organization names)
    const properNounRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
    let match;
    while ((match = properNounRegex.exec(data.text)) !== null) {
      const name = match[0];
      if (!processedNames.has(name.toLowerCase()) && name.length > 3) {
        processedNames.add(name.toLowerCase());

        // Check existing
        let existingEntity = null;
        if (data.linkToExisting) {
          existingEntity = await Node.findOne({
            tenantId,
            entityType: 'organization',
            name: { $regex: new RegExp(`^${name}$`, 'i') }
          });
        }

        extractedEntities.push({
          name,
          type: 'organization',
          confidence: existingEntity ? 0.85 : 0.5 + Math.random() * 0.3,
          matchedExisting: !!existingEntity,
          existingEntity
        });
      }
    }

    // Sort by confidence
    extractedEntities.sort((a, b) => b.confidence - a.confidence);

    res.json({
      success: true,
      data: {
        text: data.text.substring(0, 200) + (data.text.length > 200 ? '...' : ''),
        totalExtracted: extractedEntities.length,
        entities: extractedEntities,
        entityTypes: data.entityTypes
      }
    });
  } catch (error: any) {
    console.error('Entity extraction error:', error);
    res.status(500).json({ error: error.message, code: 'EXTRACT_ERROR' });
  }
});

// Auto-link related entities
app.post('/api/link', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = LinkSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    // Get source entity
    const sourceNode = await Node.findOne({
      tenantId,
      entityType: data.entityType,
      entityId: data.entityId
    });

    if (!sourceNode) {
      return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
    }

    // Get source neighbors
    const sourceEdges = await Edge.find({
      tenantId,
      $or: [
        { sourceId: data.entityId, sourceType: data.entityType },
        { targetId: data.entityId, targetType: data.entityType }
      ]
    });

    const existingConnected = new Set<string>();
    sourceEdges.forEach(e => {
      const otherId = e.sourceId === data.entityId ? e.targetId : e.sourceId;
      const otherType = e.sourceId === data.entityId ? e.targetType : e.sourceType;
      existingConnected.add(`${otherType}:${otherId}`);
    });

    // Find potential link candidates
    const candidateTypes = data.candidateTypes || ENTITY_TYPES.filter(t => t !== data.entityType);
    const linkSuggestions: Array<{
      candidateId: string;
      candidateType: EntityType;
      candidateName: string;
      score: number;
      suggestedRelationship: RelationshipType;
      reason: string;
    }> = [];

    for (const candidateType of candidateTypes) {
      // Get candidate nodes (not already connected)
      const candidates = await Node.find({
        tenantId,
        entityType: candidateType,
        entityId: { $nin: [...existingConnected].map(k => k.split(':')[1]) }
      }).limit(20);

      for (const candidate of candidates) {
        // Calculate link score based on:
        // 1. Name similarity
        // 2. Property similarity
        // 3. Shared neighbors

        let score = 0;
        let reason = '';

        // Name similarity
        const sourceName = sourceNode.name.toLowerCase();
        const candidateName = candidate.name.toLowerCase();
        const nameSimilarity = calculateStringSimilarity(sourceName, candidateName);
        if (nameSimilarity > 0.5) {
          score += nameSimilarity * 0.3;
          reason += `Name similarity: ${Math.round(nameSimilarity * 100)}% `;
        }

        // Property similarity
        const sourceProps = sourceNode.properties || {};
        const candidateProps = candidate.properties || {};
        const propSimilarity = calculatePropertySimilarity(sourceProps, candidateProps);
        if (propSimilarity > 0.3) {
          score += propSimilarity * 0.3;
          reason += `Property match: ${Math.round(propSimilarity * 100)}% `;
        }

        // Shared neighbors
        const candidateEdges = await Edge.find({
          tenantId,
          $or: [
            { sourceId: candidate.entityId, sourceType: candidate.entityType },
            { targetId: candidate.entityId, targetType: candidate.entityType }
          ]
        });

        const candidateNeighbors = new Set<string>();
        candidateEdges.forEach(e => {
          const otherId = e.sourceId === candidate.entityId ? e.targetId : e.sourceId;
          const otherType = e.sourceId === candidate.entityId ? e.targetType : e.sourceType;
          candidateNeighbors.add(`${otherType}:${otherId}`);
        });

        const sharedNeighbors = [...existingConnected].filter(n => candidateNeighbors.has(n)).length;
        if (sharedNeighbors > 0) {
          const neighborScore = Math.min(1, sharedNeighbors * 0.2);
          score += neighborScore;
          reason += `Shared neighbors: ${sharedNeighbors} `;
        }

        // Determine best relationship type
        let suggestedRelationship: RelationshipType = 'related_to';
        if (data.relationshipTypes && data.relationshipTypes.length > 0) {
          suggestedRelationship = data.relationshipTypes[0];
        } else if (candidate.entityType === 'goal' || candidate.entityType === 'okr') {
          suggestedRelationship = 'supports';
        } else if (candidate.entityType === 'project' || candidate.entityType === 'milestone') {
          suggestedRelationship = 'depends_on';
        } else if (candidate.entityType === 'document' || candidate.entityType === 'sop') {
          suggestedRelationship = 'owned_by';
        }

        if (score >= data.threshold) {
          linkSuggestions.push({
            candidateId: candidate.entityId,
            candidateType: candidate.entityType,
            candidateName: candidate.name,
            score: Math.round(score * 100) / 100,
            suggestedRelationship,
            reason: reason.trim()
          });
        }
      }
    }

    // Sort by score
    linkSuggestions.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: {
        sourceEntity: { id: data.entityId, type: data.entityType, name: sourceNode.name },
        totalSuggestions: linkSuggestions.length,
        suggestions: linkSuggestions.slice(0, 20),
        threshold: data.threshold
      }
    });
  } catch (error: any) {
    console.error('Auto-link error:', error);
    res.status(500).json({ error: error.message, code: 'LINK_ERROR' });
  }
});

// Suggest relationships for entity
app.post('/api/suggest', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = SuggestSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    // Get entity
    const entity = await Node.findOne({
      tenantId,
      entityType: data.entityType,
      entityId: data.entityId
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
    }

    const suggestions: Array<{
      relationship: RelationshipType;
      targetId: string;
      targetType: EntityType;
      targetName: string;
      confidence: number;
      reason: string;
    }> = [];

    // Get current relationships
    const currentEdges = await Edge.find({
      tenantId,
      $or: [
        { sourceId: data.entityId, sourceType: data.entityType },
        { targetId: data.entityId, targetType: data.entityType }
      ]
    });

    const currentConnections = new Set<string>();
    currentEdges.forEach(e => {
      currentConnections.add(`${e.sourceType}:${e.sourceId}`);
      currentConnections.add(`${e.targetType}:${e.targetId}`);
    });

    // Analyze entity type and suggest appropriate relationships
    const relationshipSuggestions: Record<EntityType, Array<{ rel: RelationshipType; targetType: EntityType; reason: string }>> = {
      human: [
        { rel: 'member_of', targetType: 'team', reason: 'Join a team for collaboration' },
        { rel: 'reports_to', targetType: 'human', reason: 'Add reporting structure' },
        { rel: 'works_with', targetType: 'human', reason: 'Collaborate with colleague' }
      ],
      ai_employee: [
        { rel: 'member_of', targetType: 'department', reason: 'Assign to department' },
        { rel: 'reports_to', targetType: 'ai_employee', reason: 'Add manager' },
        { rel: 'collaborates_with', targetType: 'human', reason: 'Collaborate with human' }
      ],
      goal: [
        { rel: 'aligned_to', targetType: 'goal', reason: 'Align with strategic goal' },
        { rel: 'owned_by', targetType: 'human', reason: 'Assign owner' },
        { rel: 'supports', targetType: 'goal', reason: 'Support parent goal' }
      ],
      okr: [
        { rel: 'owned_by', targetType: 'human', reason: 'Assign OKR owner' },
        { rel: 'aligned_to', targetType: 'goal', reason: 'Align with goal' },
        { rel: 'member_of', targetType: 'okr', reason: 'Part of parent OKR' }
      ],
      project: [
        { rel: 'depends_on', targetType: 'project', reason: 'Project dependency' },
        { rel: 'owned_by', targetType: 'human', reason: 'Assign project owner' },
        { rel: 'member_of', targetType: 'team', reason: 'Team assignment' }
      ],
      company_policy: [
        { rel: 'owned_by', targetType: 'department', reason: 'Department responsible' },
        { rel: 'related_to', targetType: 'sop', reason: 'Related procedure' }
      ],
      sop: [
        { rel: 'created', targetType: 'human', reason: 'Author of SOP' },
        { rel: 'related_to', targetType: 'company_policy', reason: 'Implements policy' }
      ],
      contract: [
        { rel: 'owned_by', targetType: 'human', reason: 'Contract owner' },
        { rel: 'related_to', targetType: 'organization', reason: 'Counterparty' }
      ],
      competitor: [
        { rel: 'related_to', targetType: 'product', reason: 'Competitor product' },
        { rel: 'challenges', targetType: 'product', reason: 'Competing against' }
      ],
      product: [
        { rel: 'created', targetType: 'human', reason: 'Product creator' },
        { rel: 'supersedes', targetType: 'product', reason: 'Version upgrade' },
        { rel: 'supports', targetType: 'goal', reason: 'Product goal' }
      ],
      // Default mappings for remaining types
      customer: [{ rel: 'related_to', targetType: 'organization', reason: 'Customer relationship' }],
      merchant: [{ rel: 'related_to', targetType: 'organization', reason: 'Merchant relationship' }],
      supplier: [{ rel: 'related_to', targetType: 'organization', reason: 'Supplier relationship' }],
      organization: [{ rel: 'related_to', targetType: 'human', reason: 'Key person' }],
      department: [{ rel: 'member_of', targetType: 'organization', reason: 'Part of organization' }],
      team: [{ rel: 'member_of', targetType: 'department', reason: 'Part of department' }],
      service: [{ rel: 'related_to', targetType: 'product', reason: 'Service offering' }],
      document: [{ rel: 'created', targetType: 'human', reason: 'Document author' }],
      workflow: [{ rel: 'related_to', targetType: 'task', reason: 'Workflow tasks' }],
      task: [{ rel: 'member_of', targetType: 'project', reason: 'Project task' }],
      meeting: [{ rel: 'related_to', targetType: 'project', reason: 'Project meeting' }],
      roadmap: [{ rel: 'supersedes', targetType: 'roadmap', reason: 'Updated roadmap' }],
      decision: [{ rel: 'owned_by', targetType: 'human', reason: 'Decision maker' }],
      milestone: [{ rel: 'deadline_of', targetType: 'project', reason: 'Project milestone' }],
      product_feature: [{ rel: 'member_of', targetType: 'product', reason: 'Product feature' }],
      investor: [{ rel: 'sponsors', targetType: 'organization', reason: 'Invests in' }],
      brand: [{ rel: 'owned_by', targetType: 'organization', reason: 'Brand owner' }],
      campaign: [{ rel: 'owned_by', targetType: 'team', reason: 'Marketing team' }],
      meeting_note: [{ rel: 'related_to', targetType: 'meeting', reason: 'Meeting notes' }],
      action_item: [{ rel: 'owned_by', targetType: 'human', reason: 'Assignee' }]
    };

    const suggestionsForType = relationshipSuggestions[data.entityType] || [
      { rel: 'related_to', targetType: 'organization', reason: 'General relationship' }
    ];

    for (const suggestion of suggestionsForType) {
      // Find potential targets
      const targets = await Node.find({
        tenantId,
        entityType: suggestion.targetType,
        entityId: { $nin: [...currentConnections].map(k => k.split(':')[1]) }
      }).limit(5);

      for (const target of targets) {
        suggestions.push({
          relationship: suggestion.rel,
          targetId: target.entityId,
          targetType: target.entityType,
          targetName: target.name,
          confidence: 0.7 + Math.random() * 0.2,
          reason: suggestion.reason
        });
      }
    }

    // Sort and limit
    suggestions.sort((a, b) => b.confidence - a.confidence);

    res.json({
      success: true,
      data: {
        entity: { id: data.entityId, type: data.entityType, name: entity.name },
        suggestions: suggestions.slice(0, data.limit),
        total: suggestions.length
      }
    });
  } catch (error: any) {
    console.error('Suggest relationships error:', error);
    res.status(500).json({ error: error.message, code: 'SUGGEST_ERROR' });
  }
});

// Analyze entity health/network
app.post('/api/analyze', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = AnalyzeSchema.parse(req.body);
    const tenantId = (req as any).tenantId;

    // Get entity
    const entity = await Node.findOne({
      tenantId,
      entityType: data.entityType,
      entityId: data.entityId
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found', code: 'NOT_FOUND' });
    }

    const analysis: any = { entity: entity.toObject() };

    // Network analysis
    if (data.analysisType === 'network' || data.analysisType === 'both') {
      const edges = await Edge.find({
        tenantId,
        $or: [
          { sourceId: data.entityId, sourceType: data.entityType },
          { targetId: data.entityId, targetType: data.entityType }
        ]
      });

      // Calculate network metrics
      const outgoing = edges.filter(e => e.sourceId === data.entityId);
      const incoming = edges.filter(e => e.targetId === data.entityId);

      // Get unique neighbors
      const neighbors = new Map<string, { type: string; relationships: string[] }>();
      edges.forEach(e => {
        const isSource = e.sourceId === data.entityId;
        const neighborId = isSource ? e.targetId : e.sourceId;
        const neighborType = isSource ? e.targetType : e.sourceType;
        const key = `${neighborType}:${neighborId}`;

        if (!neighbors.has(key)) {
          neighbors.set(key, { type: neighborType, relationships: [] });
        }
        neighbors.get(key)!.relationships.push(e.relationship);
      });

      // Analyze relationship types
      const relationshipCounts: Record<string, number> = {};
      edges.forEach(e => {
        relationshipCounts[e.relationship] = (relationshipCounts[e.relationship] || 0) + 1;
      });

      // Find key connectors (entities that bridge different groups)
      const neighborEdges = await Edge.find({
        tenantId,
        $or: Array.from(neighbors.keys()).map(k => {
          const [type, id] = k.split(':');
          return { sourceId: id, sourceType: type };
        })
      });

      const connectorScores: Record<string, number> = {};
      neighborEdges.forEach(e => {
        connectorScores[`${e.sourceType}:${e.sourceId}`] =
          (connectorScores[`${e.sourceType}:${e.sourceId}`] || 0) + 1;
        connectorScores[`${e.targetType}:${e.targetId}`] =
          (connectorScores[`${e.targetType}:${e.targetId}`] || 0) + 1;
      });

      const topConnectors = Object.entries(connectorScores)
        .filter(([k]) => !neighbors.has(k))
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k, score]) => ({ ...k.split(':').reduce((acc, v, i) => ({ ...acc, [i === 0 ? 'type' : 'id']: v }), {} as any), score }));

      analysis.network = {
        totalConnections: edges.length,
        outgoingConnections: outgoing.length,
        incomingConnections: incoming.length,
        uniqueNeighbors: neighbors.size,
        relationshipBreakdown: relationshipCounts,
        networkDensity: neighbors.size / Math.max(1, 100), // Normalized
        keyConnectors: topConnectors
      };
    }

    // Health analysis
    if (data.analysisType === 'health' || data.analysisType === 'both') {
      const now = new Date();
      const updatedAt = new Date(entity.updatedAt);
      const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

      // Get related edges for health assessment
      const edges = await Edge.find({
        tenantId,
        $or: [
          { sourceId: data.entityId, sourceType: data.entityType },
          { targetId: data.entityId, targetType: data.entityType }
        ]
      });

      // Calculate health score
      let healthScore = 100;

      // Staleness penalty
      if (daysSinceUpdate > 30) healthScore -= 30;
      else if (daysSinceUpdate > 7) healthScore -= 15;
      else if (daysSinceUpdate > 3) healthScore -= 5;

      // Isolation penalty
      if (edges.length === 0) healthScore -= 40;
      else if (edges.length < 3) healthScore -= 20;

      // Confidence score (if AI-extracted)
      if (entity.confidenceScore != null) {
        healthScore = healthScore * 0.7 + (entity.confidenceScore || 0) * 30;
      }

      // Determine health status
      let healthStatus = 'healthy';
      if (healthScore < 30) healthStatus = 'critical';
      else if (healthScore < 50) healthStatus = 'poor';
      else if (healthScore < 70) healthStatus = 'fair';

      // Recommendations
      const recommendations: string[] = [];
      if (edges.length === 0) recommendations.push('Add connections to other entities');
      if (daysSinceUpdate > 7) recommendations.push('Update entity information');
      if (!entity.confidenceScore) recommendations.push('Verify entity data to increase confidence');

      analysis.health = {
        score: Math.round(Math.max(0, Math.min(100, healthScore))),
        status: healthStatus,
        lastUpdated: entity.updatedAt,
        daysSinceUpdate,
        connectionCount: edges.length,
        recommendations
      };
    }

    res.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message, code: 'ANALYZE_ERROR' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate string similarity using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen;
}

// Calculate property similarity
function calculatePropertySimilarity(props1: Record<string, any>, props2: Record<string, any>): number {
  const keys1 = Object.keys(props1);
  const keys2 = Object.keys(props2);
  const allKeys = new Set([...keys1, ...keys2]);

  if (allKeys.size === 0) return 0;

  let matchCount = 0;
  for (const key of allKeys) {
    if (JSON.stringify(props1[key]) === JSON.stringify(props2[key])) {
      matchCount++;
    }
  }

  return matchCount / allKeys.size;
}

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Graph service error:', err);
  res.status(500).json({ error: 'Internal error', code: 'INTERNAL_ERROR' });
});

// Start
async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           HOJAI UNIFIED GRAPH v2.0.0                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:         ${PORT}                                           ║
║  Entity Types: ${ENTITY_TYPES.length}                                          ║
║  Relationships: ${RELATIONSHIP_TYPES.length}                                        ║
║  AI Features:   Enabled                                      ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();

export default app;
