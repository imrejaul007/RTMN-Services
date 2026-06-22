// ============================================================================
// SUTAR Policy OS - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z, ZodError } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type PolicyStatus = 'draft' | 'active' | 'archived' | 'superseded';
export type PolicyCategory = 'compliance' | 'security' | 'business' | 'operational';
export type RuleOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'regex' | 'exists' | 'not_exists';
export type RuleLogic = 'AND' | 'OR';
export type AuditAction = 'created' | 'updated' | 'deleted' | 'enforced' | 'rule_added' | 'rule_removed' | 'versioned' | 'validated';

export interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  field: string;
  operator: RuleOperator;
  value: any;
  logic?: RuleLogic;
  priority?: number;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  status: PolicyStatus;
  version: number;
  rules: PolicyRule[];
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  snapshot: Policy;
  createdBy: string;
  createdAt: string;
  changeReason?: string;
}

export interface AuditEntry {
  id: string;
  policyId: string;
  version?: number;
  action: AuditAction;
  actor: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
}

export interface EnforcementResult {
  policyId: string;
  policyName: string;
  enforced: boolean;
  matchedRules: string[];
  violatedRules: string[];
  action: 'allow' | 'deny' | 'warn' | 'flag';
  reason: string;
  timestamp: string;
}

export interface ValidationRequest {
  context: Record<string, any>;
  categories?: PolicyCategory[];
  policyIds?: string[];
  action?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// ============================================================================
// Zod Schemas
// ============================================================================

const RuleOperatorSchema = z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in', 'contains', 'not_contains', 'regex', 'exists', 'not_exists']);
const RuleLogicSchema = z.enum(['AND', 'OR']);
const PolicyCategorySchema = z.enum(['compliance', 'security', 'business', 'operational']);
const PolicyStatusSchema = z.enum(['draft', 'active', 'archived', 'superseded']);

const PolicyRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  field: z.string().min(1).max(200),
  operator: RuleOperatorSchema,
  value: z.any(),
  logic: RuleLogicSchema.optional(),
  priority: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
});

const CreatePolicySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(''),
  category: PolicyCategorySchema,
  status: PolicyStatusSchema.optional().default('draft'),
  rules: z.array(PolicyRuleSchema).optional().default([]),
  metadata: z.record(z.any()).optional().default({}),
  createdBy: z.string().optional().default('system'),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
});

const UpdatePolicySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: PolicyStatusSchema.optional(),
  rules: z.array(PolicyRuleSchema).optional(),
  metadata: z.record(z.any()).optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
});

const AddRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  field: z.string().min(1).max(200),
  operator: RuleOperatorSchema,
  value: z.any(),
  logic: RuleLogicSchema.optional(),
  priority: z.number().int().min(0).optional(),
  enabled: z.boolean().optional().default(true),
});

const EnforcePolicySchema = z.object({
  context: z.record(z.any()),
  action: z.string().optional().default('check'),
  overridePolicyId: z.string().optional(),
});

const ValidateSchema = z.object({
  context: z.record(z.any()),
  categories: z.array(PolicyCategorySchema).optional(),
  policyIds: z.array(z.string()).optional(),
  action: z.string().optional(),
});

// ============================================================================
// In-Memory Stores
// ============================================================================

const policies = new Map<string, Policy>();
const policyVersions = new Map<string, PolicyVersion[]>();
const auditTrail = new Map<string, AuditEntry[]>();

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4254;
const START_TIME = Date.now();
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const DECISION_ENGINE_URL = process.env.DECISION_ENGINE_URL || 'http://localhost:4240';
const CONTRACT_OS_URL = process.env.CONTRACT_OS_URL || 'http://localhost:4190';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// Create Express App
// ============================================================================

const app = express();

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later', timestamp: new Date().toISOString() },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { success: false, error: 'Too many API requests, please try again later', timestamp: new Date().toISOString() },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use('/api/', apiLimiter);

// Structured logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();

  _res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL,
      method: req.method,
      path: req.path,
      status: _res.statusCode,
      duration: `${duration}ms`,
      requestId: req.headers['x-request-id'],
      ip: req.ip,
    };

    if (LOG_LEVEL === 'debug' || _res.statusCode >= 400) {
      console.log(JSON.stringify(logEntry));
    } else if (LOG_LEVEL === 'info') {
      console.log(JSON.stringify({ ...logEntry, level: undefined }));
    }
  });

  next();
});

// ============================================================================
// Helper Functions
// ============================================================================

function apiResponse<T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

function handleZodError(error: ZodError): string {
  return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
}

function getRequestId(req: Request): string {
  return req.headers['x-request-id'] as string || uuidv4();
}

function addAuditEntry(policyId: string, action: AuditAction, actor: string, details: Record<string, any>, req: Request): AuditEntry {
  const entry: AuditEntry = {
    id: `audit-${uuidv4()}`,
    policyId,
    action,
    actor,
    details,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || 'unknown',
  };

  const entries = auditTrail.get(policyId) || [];
  entries.push(entry);
  auditTrail.set(policyId, entries);

  return entry;
}

function createPolicyVersion(policy: Policy, createdBy: string, changeReason?: string): PolicyVersion {
  const versions = policyVersions.get(policy.id) || [];
  const version: PolicyVersion = {
    id: `version-${uuidv4()}`,
    policyId: policy.id,
    version: policy.version,
    snapshot: JSON.parse(JSON.stringify(policy)),
    createdBy,
    createdAt: new Date().toISOString(),
    changeReason,
  };
  versions.push(version);
  policyVersions.set(policy.id, versions);
  return version;
}

// ============================================================================
// Rule Evaluation
// ============================================================================

function evaluateCondition(fieldValue: any, operator: RuleOperator, targetValue: any): boolean {
  switch (operator) {
    case 'eq':
      return fieldValue === targetValue;
    case 'ne':
      return fieldValue !== targetValue;
    case 'gt':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue > targetValue;
    case 'lt':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue < targetValue;
    case 'gte':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue >= targetValue;
    case 'lte':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue <= targetValue;
    case 'in':
      return Array.isArray(targetValue) && targetValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(targetValue) && !targetValue.includes(fieldValue);
    case 'contains':
      return typeof fieldValue === 'string' && typeof targetValue === 'string' && fieldValue.includes(targetValue);
    case 'not_contains':
      return typeof fieldValue === 'string' && typeof targetValue === 'string' && !fieldValue.includes(targetValue);
    case 'regex':
      try {
        return typeof fieldValue === 'string' && new RegExp(targetValue).test(fieldValue);
      } catch {
        return false;
      }
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;
    default:
      return false;
  }
}

function evaluateRules(rules: PolicyRule[], context: Record<string, any>): { matched: PolicyRule[]; violated: PolicyRule[] } {
  const matched: PolicyRule[] = [];
  const violated: PolicyRule[] = [];

  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sortedRules) {
    if (rule.enabled === false) continue;

    const fieldValue = context[rule.field];
    const result = evaluateCondition(fieldValue, rule.operator, rule.value);

    if (result) {
      matched.push(rule);
    } else {
      violated.push(rule);
    }
  }

  return { matched, violated };
}

// ============================================================================
// External Service Integration
// ============================================================================

async function checkDecisionEngineHealth(): Promise<{ status: string; latencyMs: number; message: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${DECISION_ENGINE_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { status: 'pass', latencyMs: Date.now() - start, message: 'DecisionEngine connected' };
    }

    return { status: 'warn', latencyMs: Date.now() - start, message: `DecisionEngine returned ${response.status}` };
  } catch {
    return { status: 'fail', latencyMs: Date.now() - start, message: 'DecisionEngine unreachable' };
  }
}

async function checkContractOSHealth(): Promise<{ status: string; latencyMs: number; message: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${CONTRACT_OS_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { status: 'pass', latencyMs: Date.now() - start, message: 'ContractOS connected' };
    }

    return { status: 'warn', latencyMs: Date.now() - start, message: `ContractOS returned ${response.status}` };
  } catch {
    return { status: 'fail', latencyMs: Date.now() - start, message: 'ContractOS unreachable' };
  }
}

async function notifyDecisionEngine(policy: Policy, action: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch(`${DECISION_ENGINE_URL}/api/v1/policies/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy, action }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[POLICY] Notified DecisionEngine: ${action} for policy ${policy.id}`);
  } catch (error) {
    console.warn(`[POLICY] Failed to notify DecisionEngine: ${error}`);
  }
}

async function notifyContractOS(policy: Policy, action: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch(`${CONTRACT_OS_URL}/api/v1/policies/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy, action }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[POLICY] Notified ContractOS: ${action} for policy ${policy.id}`);
  } catch (error) {
    console.warn(`[POLICY] Failed to notify ContractOS: ${error}`);
  }
}

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'sutar-policy-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);
  const decisionEngineHealth = await checkDecisionEngineHealth();
  const contractOSHealth = await checkContractOSHealth();

  const checks: Record<string, any> = {
    decisionEngine: decisionEngineHealth,
    contractOS: contractOSHealth,
    policies: {
      status: 'pass',
      message: `Loaded ${policies.size} policies`,
    },
  };

  const allPassing = Object.values(checks).every(c => c.status === 'pass' || c.status === 'warn');
  const anyFailing = Object.values(checks).some(c => c.status === 'fail');

  res.status(anyFailing ? 503 : 200).json({
    status: allPassing && !anyFailing ? 'healthy' : anyFailing ? 'unhealthy' : 'degraded',
    service: 'sutar-policy-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime,
    checks,
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// ============================================================================
// API Endpoints - Service Info
// ============================================================================

app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-policy-os',
    description: 'Policy OS - Policy management, enforcement, and audit',
    version: '1.0.0',
    port: PORT,
    environment: ENVIRONMENT,
    features: [
      'Policy CRUD operations',
      'Policy rules and conditions',
      'Policy categories (compliance, security, business, operational)',
      'Policy versioning',
      'Policy enforcement',
      'Policy audit trail',
      'Decision Engine integration (port 4240)',
      'Contract OS integration (port 4190)',
    ],
    endpoints: {
      policies: 'GET/POST /api/v1/policies',
      policyById: 'GET/PUT/DELETE /api/v1/policies/:id',
      policyRules: 'POST /api/v1/policies/:id/rules',
      policyEnforce: 'POST /api/v1/policies/:id/enforce',
      policyAudit: 'GET /api/v1/policies/:id/audit',
      categories: 'GET /api/v1/policies/categories',
      validate: 'POST /api/v1/policies/validate',
    },
    integrations: {
      decisionEngine: DECISION_ENGINE_URL,
      contractOS: CONTRACT_OS_URL,
    },
  }));
});

// ============================================================================
// API Endpoints - Policy CRUD
// ============================================================================

// List/Create policies
app.get('/api/v1/policies', (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const { status, category, limit = 50, offset = 0 } = req.query;

  let result = Array.from(policies.values());

  if (status) {
    result = result.filter(p => p.status === status);
  }
  if (category) {
    result = result.filter(p => p.category === category);
  }

  result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json(apiResponse(true, {
    policies: result,
    total,
    limit: Number(limit),
    offset: Number(offset),
  }, undefined, requestId));
});

app.post('/api/v1/policies', async (req: Request, res: Response) => {
  const requestId = getRequestId(req);

  try {
    const validationResult = CreatePolicySchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${handleZodError(validationResult.error)}`,
        requestId
      ));
      return;
    }

    const data = validationResult.data;
    const policyId = `policy-${uuidv4()}`;

    const policy: Policy = {
      id: policyId,
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
      version: 1,
      rules: (data.rules || []).map((r: any) => ({
        id: `rule-${uuidv4()}`,
        name: r.name,
        description: r.description,
        field: r.field,
        operator: r.operator,
        value: r.value,
        logic: r.logic || 'AND',
        priority: r.priority || 0,
        enabled: r.enabled !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      metadata: data.metadata || {},
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo,
    };

    policies.set(policyId, policy);
    createPolicyVersion(policy, data.createdBy, 'Initial creation');
    addAuditEntry(policyId, 'created', data.createdBy, { name: policy.name, category: policy.category }, req);

    console.log(`[POLICY] Created: ${policyId} - ${policy.name}`);

    // Notify integrations
    await Promise.all([
      notifyDecisionEngine(policy, 'created'),
      notifyContractOS(policy, 'created'),
    ]);

    res.status(201).json(apiResponse(true, policy, undefined, requestId));
  } catch (error) {
    console.error(`[POLICY] Create error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// Get/Update/Delete policy by ID
app.get('/api/v1/policies/:id', (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const policy = policies.get(req.params.id);

  if (!policy) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found', requestId));
    return;
  }

  res.json(apiResponse(true, policy, undefined, requestId));
});

app.put('/api/v1/policies/:id', async (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const policy = policies.get(req.params.id);

  if (!policy) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found', requestId));
    return;
  }

  try {
    const validationResult = UpdatePolicySchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${handleZodError(validationResult.error)}`,
        requestId
      ));
      return;
    }

    const data = validationResult.data;
    const previousVersion = policy.version;

    if (data.name) policy.name = data.name;
    if (data.description !== undefined) policy.description = data.description;
    if (data.status) policy.status = data.status;
    if (data.rules) {
      policy.rules = data.rules.map((r: any) => ({
        id: `rule-${uuidv4()}`,
        name: r.name,
        description: r.description,
        field: r.field,
        operator: r.operator,
        value: r.value,
        logic: r.logic || 'AND',
        priority: r.priority || 0,
        enabled: r.enabled !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    if (data.metadata) policy.metadata = { ...policy.metadata, ...data.metadata };
    if (data.effectiveFrom) policy.effectiveFrom = data.effectiveFrom;
    if (data.effectiveTo) policy.effectiveTo = data.effectiveTo;

    policy.version += 1;
    policy.updatedAt = new Date().toISOString();

    policies.set(policy.id, policy);
    createPolicyVersion(policy, 'system', `Updated from version ${previousVersion}`);
    addAuditEntry(policy.id, 'updated', 'system', {
      previousVersion,
      newVersion: policy.version,
      changes: Object.keys(data),
    }, req);

    console.log(`[POLICY] Updated: ${policy.id} to version ${policy.version}`);

    // Notify integrations
    await Promise.all([
      notifyDecisionEngine(policy, 'updated'),
      notifyContractOS(policy, 'updated'),
    ]);

    res.json(apiResponse(true, policy, undefined, requestId));
  } catch (error) {
    console.error(`[POLICY] Update error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

app.delete('/api/v1/policies/:id', async (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const policy = policies.get(req.params.id);

  if (!policy) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found', requestId));
    return;
  }

  const actor = req.headers['x-actor'] as string || 'system';

  addAuditEntry(policy.id, 'deleted', actor, { name: policy.name, version: policy.version }, req);
  policies.delete(policy.id);

  console.log(`[POLICY] Deleted: ${req.params.id}`);

  // Notify integrations
  await Promise.all([
    notifyDecisionEngine(policy, 'deleted'),
    notifyContractOS(policy, 'deleted'),
  ]);

  res.json(apiResponse(true, { id: req.params.id, deleted: true }, undefined, requestId));
});

// ============================================================================
// API Endpoints - Policy Rules
// ============================================================================

app.post('/api/v1/policies/:id/rules', (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const policy = policies.get(req.params.id);

  if (!policy) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found', requestId));
    return;
  }

  try {
    const validationResult = AddRuleSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${handleZodError(validationResult.error)}`,
        requestId
      ));
      return;
    }

    const data = validationResult.data;
    const rule: PolicyRule = {
      id: `rule-${uuidv4()}`,
      name: data.name,
      description: data.description,
      field: data.field,
      operator: data.operator,
      value: data.value,
      logic: data.logic || 'AND',
      priority: data.priority || 0,
      enabled: data.enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    policy.rules.push(rule);
    policy.updatedAt = new Date().toISOString();
    policies.set(policy.id, policy);

    addAuditEntry(policy.id, 'rule_added', 'system', { ruleId: rule.id, ruleName: rule.name }, req);

    console.log(`[POLICY] Rule added to ${policy.id}: ${rule.name}`);

    res.status(201).json(apiResponse(true, rule, undefined, requestId));
  } catch (error) {
    console.error(`[POLICY] Add rule error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

app.delete('/api/v1/policies/:id/rules/:ruleId', (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const policy = policies.get(req.params.id);

  if (!policy) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found', requestId));
    return;
  }

  const ruleIndex = policy.rules.findIndex(r => r.id === req.params.ruleId);

  if (ruleIndex === -1) {
    res.status(404).json(apiResponse(false, undefined, 'Rule not found', requestId));
    return;
  }

  const rule = policy.rules[ruleIndex];
  policy.rules.splice(ruleIndex, 1);
  policy.updatedAt = new Date().toISOString();
  policies.set(policy.id, policy);

  addAuditEntry(policy.id, 'rule_removed', 'system', { ruleId: rule.id, ruleName: rule.name }, req);

  console.log(`[POLICY] Rule removed from ${policy.id}: ${rule.name}`);

  res.json(apiResponse(true, { ruleId: req.params.ruleId, removed: true }, undefined, requestId));
});

// ============================================================================
// API Endpoints - Policy Enforcement
// ============================================================================

app.post('/api/v1/policies/:id/enforce', (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const policy = policies.get(req.params.id);

  if (!policy) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found', requestId));
    return;
  }

  try {
    const validationResult = EnforcePolicySchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${handleZodError(validationResult.error)}`,
        requestId
      ));
      return;
    }

    const { context, action: enforceAction } = validationResult.data;

    // Check if policy is active
    if (policy.status !== 'active') {
      res.json(apiResponse(true, {
        policyId: policy.id,
        policyName: policy.name,
        enforced: false,
        matchedRules: [],
        violatedRules: [],
        action: 'warn' as const,
        reason: `Policy is ${policy.status}, not active`,
        timestamp: new Date().toISOString(),
      }, undefined, requestId));
      return;
    }

    // Check effective dates
    const now = new Date();
    if (policy.effectiveFrom && new Date(policy.effectiveFrom) > now) {
      res.json(apiResponse(true, {
        policyId: policy.id,
        policyName: policy.name,
        enforced: false,
        matchedRules: [],
        violatedRules: [],
        action: 'warn' as const,
        reason: 'Policy effective date has not started',
        timestamp: new Date().toISOString(),
      }, undefined, requestId));
      return;
    }

    if (policy.effectiveTo && new Date(policy.effectiveTo) < now) {
      res.json(apiResponse(true, {
        policyId: policy.id,
        policyName: policy.name,
        enforced: false,
        matchedRules: [],
        violatedRules: [],
        action: 'warn' as const,
        reason: 'Policy effective date has ended',
        timestamp: new Date().toISOString(),
      }, undefined, requestId));
      return;
    }

    const { matched, violated } = evaluateRules(policy.rules, context);

    let enforcementAction: 'allow' | 'deny' | 'warn' | 'flag' = 'allow';
    let reason = 'All rules passed';

    if (violated.length > 0) {
      enforcementAction = 'deny';
      reason = `Violated rules: ${violated.map(r => r.name).join(', ')}`;
    } else if (matched.length === 0 && policy.rules.length > 0) {
      enforcementAction = 'flag';
      reason = 'No rules matched the context';
    }

    const result: EnforcementResult = {
      policyId: policy.id,
      policyName: policy.name,
      enforced: true,
      matchedRules: matched.map(r => r.id),
      violatedRules: violated.map(r => r.id),
      action: enforcementAction,
      reason,
      timestamp: new Date().toISOString(),
    };

    addAuditEntry(policy.id, 'enforced', 'system', {
      context,
      result,
      action: enforceAction,
    }, req);

    console.log(`[POLICY] Enforced ${policy.id}: ${enforcementAction} - ${reason}`);

    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    console.error(`[POLICY] Enforce error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// ============================================================================
// API Endpoints - Policy Audit Trail
// ============================================================================

app.get('/api/v1/policies/:id/audit', (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const policy = policies.get(req.params.id);

  if (!policy) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found', requestId));
    return;
  }

  const { limit = 100, offset = 0, action } = req.query;
  let entries = auditTrail.get(req.params.id) || [];

  if (action) {
    entries = entries.filter(e => e.action === action);
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = entries.length;
  entries = entries.slice(Number(offset), Number(offset) + Number(limit));

  res.json(apiResponse(true, {
    policyId: req.params.id,
    entries,
    total,
    limit: Number(limit),
    offset: Number(offset),
  }, undefined, requestId));
});

// ============================================================================
// API Endpoints - Policy Categories
// ============================================================================

app.get('/api/v1/policies/categories', (_req: Request, res: Response) => {
  const categories = [
    {
      id: 'compliance',
      name: 'Compliance',
      description: 'Regulatory and compliance policies',
      color: '#4CAF50',
    },
    {
      id: 'security',
      name: 'Security',
      description: 'Security and access control policies',
      color: '#F44336',
    },
    {
      id: 'business',
      name: 'Business',
      description: 'Business logic and workflow policies',
      color: '#2196F3',
    },
    {
      id: 'operational',
      name: 'Operational',
      description: 'Operational and process policies',
      color: '#FF9800',
    },
  ];

  const counts = {
    compliance: Array.from(policies.values()).filter(p => p.category === 'compliance').length,
    security: Array.from(policies.values()).filter(p => p.category === 'security').length,
    business: Array.from(policies.values()).filter(p => p.category === 'business').length,
    operational: Array.from(policies.values()).filter(p => p.category === 'operational').length,
  };

  res.json(apiResponse(true, {
    categories: categories.map(c => ({
      ...c,
      policyCount: counts[c.id as keyof typeof counts] || 0,
    })),
  }));
});

// ============================================================================
// API Endpoints - Policy Validation
// ============================================================================

app.post('/api/v1/policies/validate', (req: Request, res: Response) => {
  const requestId = getRequestId(req);

  try {
    const validationResult = ValidateSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json(apiResponse(
        false,
        undefined,
        `Validation error: ${handleZodError(validationResult.error)}`,
        requestId
      ));
      return;
    }

    const { context, categories, policyIds, action } = validationResult.data;

    let applicablePolicies = Array.from(policies.values()).filter(p => p.status === 'active');

    if (categories && categories.length > 0) {
      applicablePolicies = applicablePolicies.filter(p => categories.includes(p.category));
    }

    if (policyIds && policyIds.length > 0) {
      applicablePolicies = applicablePolicies.filter(p => policyIds.includes(p.id));
    }

    const results: EnforcementResult[] = [];

    for (const policy of applicablePolicies) {
      // Check effective dates
      const now = new Date();
      if (policy.effectiveFrom && new Date(policy.effectiveFrom) > now) continue;
      if (policy.effectiveTo && new Date(policy.effectiveTo) < now) continue;

      const { matched, violated } = evaluateRules(policy.rules, context);

      let enforcementAction: 'allow' | 'deny' | 'warn' | 'flag' = 'allow';
      let reason = 'All rules passed';

      if (violated.length > 0) {
        enforcementAction = 'deny';
        reason = `Violated rules: ${violated.map(r => r.name).join(', ')}`;
      } else if (matched.length === 0 && policy.rules.length > 0) {
        enforcementAction = 'flag';
        reason = 'No rules matched the context';
      }

      results.push({
        policyId: policy.id,
        policyName: policy.name,
        enforced: true,
        matchedRules: matched.map(r => r.id),
        violatedRules: violated.map(r => r.id),
        action: enforcementAction,
        reason,
        timestamp: new Date().toISOString(),
      });
    }

    const deniedPolicies = results.filter(r => r.action === 'deny');
    const allowedPolicies = results.filter(r => r.action === 'allow');

    addAuditEntry('bulk-validation', 'validated', 'system', {
      context,
      categories,
      policyIds,
      action,
      totalPolicies: applicablePolicies.length,
      deniedCount: deniedPolicies.length,
      allowedCount: allowedPolicies.length,
    }, req);

    console.log(`[POLICY] Validated ${applicablePolicies.length} policies: ${deniedPolicies.length} denied`);

    res.json(apiResponse(true, {
      context,
      results,
      summary: {
        totalPolicies: applicablePolicies.length,
        allowed: allowedPolicies.length,
        denied: deniedPolicies.length,
        flagged: results.filter(r => r.action === 'flag').length,
        warnings: results.filter(r => r.action === 'warn').length,
        overallAction: deniedPolicies.length > 0 ? 'deny' : allowedPolicies.length > 0 ? 'allow' : 'flag',
      },
    }, undefined, requestId));
  } catch (error) {
    console.error(`[POLICY] Validate error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// ============================================================================
// API Endpoints - Policy Versions
// ============================================================================

app.get('/api/v1/policies/:id/versions', (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const policy = policies.get(req.params.id);

  if (!policy) {
    res.status(404).json(apiResponse(false, undefined, 'Policy not found', requestId));
    return;
  }

  const versions = policyVersions.get(req.params.id) || [];

  res.json(apiResponse(true, {
    policyId: req.params.id,
    currentVersion: policy.version,
    versions: versions.sort((a, b) => b.version - a.version),
  }, undefined, requestId));
});

app.get('/api/v1/policies/:id/versions/:version', (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  const versions = policyVersions.get(req.params.id) || [];
  const versionNum = parseInt(req.params.version);

  const version = versions.find(v => v.version === versionNum);

  if (!version) {
    res.status(404).json(apiResponse(false, undefined, 'Version not found', requestId));
    return;
  }

  res.json(apiResponse(true, version, undefined, requestId));
});

// ============================================================================
// Legacy Endpoints
// ============================================================================

app.post('/api/v1/intent', async (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  try {
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, payload);
    res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'received' }, undefined, requestId));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e), requestId));
  }
});

app.post('/api/v1/event', async (req: Request, res: Response) => {
  const requestId = getRequestId(req);
  try {
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, data);
    res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }, undefined, requestId));
  } catch (e) {
    res.status(400).json(apiResponse(false, undefined, String(e), requestId));
  }
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid JSON body'));
    return;
  }

  res.status(500).json(apiResponse(false, undefined, 'Internal server error'));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);

  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================================
// Start Server
// ============================================================================

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           SUTAR POLICY OS - Layer 4                            ║
║           "Rules and Governance"                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:        RUNNING                                        ║
║  Port:          ${PORT}                                          ║
║  Environment:   ${ENVIRONMENT.padEnd(42)}║
║  DecisionEngine: ${DECISION_ENGINE_URL.padEnd(38)}║
║  ContractOS:     ${CONTRACT_OS_URL.padEnd(38)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                    ║
║    GET/POST    /api/v1/policies         - List/Create policies  ║
║    GET/PUT/DELETE /api/v1/policies/:id   - Get/Update/Delete    ║
║    POST        /api/v1/policies/:id/rules - Add rules          ║
║    POST        /api/v1/policies/:id/enforce - Enforce policy    ║
║    GET         /api/v1/policies/:id/audit - Audit trail        ║
║    GET         /api/v1/policies/categories - List categories  ║
║    POST        /api/v1/policies/validate - Validate policies   ║
║    GET         /api/v1/policies/:id/versions - Version history ║
║    GET         /health                   - Health check        ║
║    GET         /health/ready             - Readiness check     ║
║    GET         /health/live              - Liveness check     ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
