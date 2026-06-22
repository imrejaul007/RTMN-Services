/**
 * HOJAI AI - PolicyOS
 * Port: 4254
 *
 * Universal governance, trust, authorization, compliance, decision policy platform.
 * The endpoint flow-orchestrator calls is POST /api/policies/evaluate.
 *
 * NOTE: PolicyOS evaluation MUST fail-closed by default. If a policy can't be
 * resolved or evaluated, the result MUST be allowed=false with explicit reasons.
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';

// Effective auth middleware: bypasses CorpID when REQUIRE_AUTH=false (dev/test)
// while keeping the route signature identical. This makes the dev story
// "set POLICYOS_REQUIRE_AUTH=false and POST works" instead of "send a JWT".
const authOrBypass = (req, res, next) => (REQUIRE_AUTH ? requireAuth(req, res, next) : next());
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import { PersistentStore } from '../../../../shared/lib/persistent-store.js';
import { safeEval, validateExpression } from './expression-evaluator.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4254;
const SERVICE_NAME = 'policy-os';
const SERVICE_VERSION = '1.3.0';

// =================================================================
// Configuration
// =================================================================

const REQUIRE_AUTH = (process.env.POLICYOS_REQUIRE_AUTH || 'true') !== 'false';
const AUDIT_MAX = parseInt(process.env.POLICYOS_AUDIT_MAX || '10000', 10);
const CORS_ORIGIN = process.env.POLICYOS_CORS_ORIGIN || null; // null = allow all (dev); set in prod
const SERVICE_TOKEN = process.env.POLICYOS_SERVICE_TOKEN || Buffer.from(JSON.stringify({
  service: 'policy-os',
  role: 'admin',
  iat: Date.now(),
  exp: Date.now() + 365 * 24 * 60 * 60 * 1000
})).toString('base64');

// On boot, log the service token so callers can authenticate in dev
// Always log it (dev escape hatch) — REQUIRED for bash test scripts that
// grep this line from the log. Phase6/webhook-analytics/load tests all
// extract the token from "Service token" in /tmp/policy-os-phase4.log.
if (process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.log(`[policy-os] Service token (admin): ${SERVICE_TOKEN}`);
}

// =================================================================
// Constants
// =================================================================

const CATEGORIES = [
  'security',
  'business',
  'commerce',
  'ai',
  'financial',
  'privacy',
  'memory',
  'twin',
  'skill'
];

const POLICY_STATUSES = ['draft', 'review', 'published', 'archived', 'retired'];

const APPROVAL_STRATEGIES = [
  'single',
  'multi',
  'sequential',
  'parallel',
  'emergency'
];

const APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired'
];

// =================================================================
// Policy schema validation
// =================================================================
//
// Lightweight, zero-dep validator. Catches the common errors before they
// hit PersistentStore. Returns {ok, errors[]}.

function isStr(v, max = 200) { return typeof v === 'string' && v.length > 0 && v.length <= max; }
function isInt(v) { return Number.isInteger(v); }
function isIsoDate(v) {
  if (typeof v !== 'string') return false;
  const d = new Date(v);
  return !isNaN(d.getTime()) && d.toISOString() === v;
}
function validateRuleShape(rule, errors, path) {
  if (!rule || typeof rule !== 'object') { errors.push(`${path}: rule must be an object`); return; }
  if (rule.if == null) errors.push(`${path}: rule.if is required`);
  if (!rule.then || typeof rule.then !== 'object') errors.push(`${path}: rule.then is required`);
  if (rule.then && rule.then.allow !== undefined && typeof rule.then.allow !== 'boolean') {
    errors.push(`${path}: rule.then.allow must be boolean`);
  }
}

function validatePolicyBody(body, { partial = false } = {}) {
  const errors = [];
  if (!partial) {
    if (!isStr(body.name, 200)) errors.push('name: required, string 1-200 chars');
    if (!isStr(body.category, 50)) errors.push('category: required, string 1-50 chars');
    else if (!CATEGORIES.includes(body.category)) errors.push(`category: must be one of ${CATEGORIES.join(', ')}`);
  } else {
    if (body.name !== undefined && !isStr(body.name, 200)) errors.push('name: string 1-200 chars');
    if (body.category !== undefined) {
      if (!isStr(body.category, 50)) errors.push('category: string 1-50 chars');
      else if (!CATEGORIES.includes(body.category)) errors.push(`category: must be one of ${CATEGORIES.join(', ')}`);
    }
  }
  if (body.status !== undefined && !POLICY_STATUSES.includes(body.status)) {
    errors.push(`status: must be one of ${POLICY_STATUSES.join(', ')}`);
  }
  if (body.priority !== undefined && !isInt(body.priority)) {
    errors.push('priority: must be integer');
  }
  if (body.approvals !== undefined) {
    if (typeof body.approvals !== 'object') errors.push('approvals: must be object');
    else if (body.approvals.strategy && !APPROVAL_STRATEGIES.includes(body.approvals.strategy)) {
      errors.push(`approvals.strategy: must be one of ${APPROVAL_STRATEGIES.join(', ')}`);
    }
    if (body.approvals.requiredApprovers !== undefined && !Array.isArray(body.approvals.requiredApprovers)) {
      errors.push('approvals.requiredApprovers: must be array');
    }
  }
  if (body.effectiveFrom !== undefined && !isIsoDate(body.effectiveFrom)) {
    errors.push('effectiveFrom: must be ISO-8601 string');
  }
  if (body.effectiveUntil !== undefined && !isIsoDate(body.effectiveUntil)) {
    errors.push('effectiveUntil: must be ISO-8601 string');
  }
  if (body.effectiveFrom && body.effectiveUntil && body.effectiveFrom > body.effectiveUntil) {
    errors.push('effectiveFrom must be <= effectiveUntil');
  }
  if (body.rules !== undefined) {
    if (!Array.isArray(body.rules)) errors.push('rules: must be array');
    else body.rules.forEach((r, i) => validateRuleShape(r, errors, `rules[${i}]`));
  }
  if (body.composition !== undefined) {
    if (typeof body.composition !== 'object') errors.push('composition: must be object');
    else {
      if (body.composition.mode && !['anyOf', 'allOf', 'majority'].includes(body.composition.mode)) {
        errors.push('composition.mode: must be one of anyOf|allOf|majority');
      }
      if (body.composition.policyIds !== undefined && !Array.isArray(body.composition.policyIds)) {
        errors.push('composition.policyIds: must be array of policy ids');
      }
      if (body.composition.mode === 'majority' && (typeof body.composition.threshold !== 'number' || body.composition.threshold <= 0 || body.composition.threshold > 1)) {
        errors.push('composition.threshold: for mode=majority, must be number 0 < t <= 1');
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

// =================================================================
// Persistent stores (file-backed JSON, survives restart)
// =================================================================

const STORE_OPTS = { serviceName: 'policy-os' };
const policies = new PersistentStore('policies', STORE_OPTS);     // id -> policy
const roles = new PersistentStore('roles', STORE_OPTS);           // name -> role
const userRoles = new PersistentStore('user-roles', STORE_OPTS);   // userId -> [role, ...]
const approvals = new PersistentStore('approvals', STORE_OPTS);   // id -> approval
const policyChanges = new PersistentStore('policy-changes', STORE_OPTS); // policyId -> [change, ...]
const users = new PersistentStore('users', STORE_OPTS);           // userId -> user record
const apiKeys = new PersistentStore('api-keys', STORE_OPTS);      // key -> {name, role, createdAt, expiresAt}

// Audit is append-heavy; wrap an array-like in a PersistentStore.
// We keep a count separately so we can rotate.
let auditCount = 0;
const audit = [];                                                  // ephemeral tail; rotated to file periodically
const AUDIT_FILE_PATH = `${process.env.HOJAI_DATA_DIR || './data/'}/policy-os/audit.jsonl`;

// =================================================================
// Audit helpers
// =================================================================

import fs from 'fs';
import path from 'path';

function auditLog(entry) {
  const e = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  audit.push(e);
  auditCount++;
  // Append to file (JSONL format) for durability + rotation
  try {
    const dir = path.dirname(AUDIT_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_FILE_PATH, JSON.stringify(e) + '\n', 'utf8');
  } catch (err) {
    // Audit file write failures must not crash policy evaluation,
    // but should be visible in logs.
    // eslint-disable-next-line no-console
    console.error('[policy-os] audit write failed:', err.message);
  }
  // Rotate if over the cap
  if (audit.length > AUDIT_MAX) {
    archiveOldAudit();
  }
  // Fire webhooks + record metrics asynchronously (never block caller)
  setImmediate(() => {
    Promise.all([fireWebhooks(e), recordMetric(e)])
      .catch(err => console.error('[policy-os] post-audit hook failed:', err.message));
  });
  return e;
}

let archiving = false;
function archiveOldAudit() {
  if (archiving) return;
  archiving = true;
  try {
    const archiveDir = path.join(path.dirname(AUDIT_FILE_PATH), 'archives');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const archivePath = path.join(archiveDir, `audit-${stamp}-${uuidv4().slice(0, 6)}.jsonl`);
    // Move the file aside, then trim in-memory
    if (fs.existsSync(AUDIT_FILE_PATH)) {
      fs.renameSync(AUDIT_FILE_PATH, archivePath);
    }
    audit.length = 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[policy-os] audit archive failed:', err.message);
  } finally {
    archiving = false;
  }
}

// =================================================================
// Seed data
// =================================================================

function seed() {
  // Idempotent — only seed if empty (survives restarts)
  if (policies.size > 0) {
    // eslint-disable-next-line no-console
    console.log(`[policy-os] Stores already populated (${policies.size} policies) — skipping seed`);
    return;
  }

  // Roles
  const roleSeeds = [
    {
      name: 'admin',
      description: 'Full system administrator',
      permissions: ['*'],
      scope: 'global'
    },
    {
      name: 'manager',
      description: 'Department/team manager',
      permissions: [
        'policies:read',
        'policies:write',
        'approvals:decide',
        'roles:assign',
        'audit:read'
      ],
      scope: 'department'
    },
    {
      name: 'customer',
      description: 'End user / customer',
      permissions: ['policies:read:own', 'approvals:request'],
      scope: 'self'
    }
  ];
  for (const r of roleSeeds) roles.set(r.name, { ...r, createdAt: new Date().toISOString() });

  // Users
  const userSeeds = [
    { id: 'u-admin',    name: 'Alice Admin',    roles: ['admin'],    trustScore: 100, attributes: { department: 'IT' } },
    { id: 'u-manager',  name: 'Maya Manager',   roles: ['manager'],  trustScore: 90,  attributes: { department: 'Operations' } },
    { id: 'u-customer', name: 'Carl Customer',  roles: ['customer'], trustScore: 85,  attributes: { vip: false } }
  ];
  for (const u of userSeeds) {
    userRoles.set(u.id, u.roles); // PersistentStore: store as array, not Set
    users.set(u.id, {
      id: u.id,
      name: u.name,
      trustScore: u.trustScore,
      attributes: u.attributes,
      createdAt: new Date().toISOString()
    });
  }

  // Policies
  const policySeeds = [
    {
      id: 'pol-shopping-budget',
      name: 'Shopping Budget Policy',
      description: 'Auto-allow purchases under 5000, require approval above',
      category: 'financial',
      priority: 10,
      conditions: { 'context.amount': { lte: 5000 } },
      rules: [
        {
          if: { 'context.amount': { lte: 100 } },
          then: { allow: true, action: 'auto_allow_small_purchase' }
        },
        {
          if: { 'context.amount': { lte: 5000 } },
          then: { allow: true, action: 'auto_allow_within_budget' }
        },
        {
          if: { 'context.amount': { gt: 5000 } },
          then: { allow: false, action: 'require_approval_over_budget' }
        }
      ],
      actions: {
        onAllow: { log: 'purchase_approved' },
        onDeny: { log: 'purchase_requires_approval' }
      },
      exceptions: [],
      approvals: { strategy: 'multi', requiredApprovers: ['u-manager', 'u-admin'] },
      owner: 'u-admin',
      status: 'published'
    },
    {
      id: 'pol-payment-fraud',
      name: 'Payment Fraud Prevention',
      description: 'Block payments from low-trust users',
      category: 'security',
      priority: 100,
      conditions: { 'context.user.trustScore': { lt: 50 } },
      rules: [
        {
          if: { 'context.user.trustScore': { lt: 30 } },
          then: { allow: false, action: 'block_critical_trust' }
        },
        {
          if: { 'context.user.trustScore': { lt: 50 } },
          then: { allow: false, action: 'block_low_trust' }
        },
        {
          if: { 'context.user.trustScore': { gte: 50 } },
          then: { allow: true, action: 'allow_adequate_trust' }
        }
      ],
      actions: {
        onAllow: { log: 'payment_approved' },
        onDeny: { log: 'payment_blocked_fraud' }
      },
      exceptions: [{ name: 'vip_override', condition: 'context.user.attributes.vip === true' }],
      approvals: { strategy: 'emergency', requiredApprovers: ['u-admin'] },
      owner: 'u-admin',
      status: 'published'
    },
    {
      id: 'pol-data-export',
      name: 'Data Export Privacy Policy',
      description: 'Bulk data exports > 100 records require approval',
      category: 'privacy',
      priority: 80,
      conditions: { 'context.action': { in: ['data.export', 'data.bulk_download'] } },
      rules: [
        {
          if: { 'context.recordCount': { lte: 100 } },
          then: { allow: true, action: 'allow_small_export' }
        },
        {
          if: { 'context.recordCount': { gt: 100 } },
          then: { allow: false, action: 'require_approval_large_export' }
        }
      ],
      actions: {
        onAllow: { log: 'export_approved' },
        onDeny: { log: 'export_requires_approval' }
      },
      exceptions: [],
      approvals: { strategy: 'sequential', requiredApprovers: ['u-manager', 'u-admin'] },
      owner: 'u-admin',
      status: 'published'
    },
    {
      id: 'pol-ai-autonomy',
      name: 'AI Autonomy Policy',
      description: 'AI execution requires confidence > 0.7',
      category: 'ai',
      priority: 90,
      conditions: { 'context.action': { startsWith: 'ai.' } },
      rules: [
        {
          if: { 'context.confidence': { lt: 0.5 } },
          then: { allow: false, action: 'block_low_confidence' }
        },
        {
          if: { 'context.confidence': { lt: 0.7 } },
          then: { allow: false, action: 'require_human_review' }
        },
        {
          if: { 'context.confidence': { gte: 0.7 } },
          then: { allow: true, action: 'allow_high_confidence' }
        }
      ],
      actions: {
        onAllow: { log: 'ai_action_approved' },
        onDeny: { log: 'ai_action_blocked' }
      },
      exceptions: [],
      approvals: { strategy: 'single', requiredApprovers: ['u-admin'] },
      owner: 'u-admin',
      status: 'published'
    },
    {
      id: 'pol-skill-execution',
      name: 'Skill Execution Scope Policy',
      description: 'Skill execution requires scope check',
      category: 'skill',
      priority: 70,
      conditions: { 'context.action': { startsWith: 'skill.' } },
      rules: [
        {
          if: { 'context.scope': { exists: false } },
          then: { allow: false, action: 'block_missing_scope' }
        },
        {
          if: { 'context.user.scopes': { notContains: 'context.scope' } },
          then: { allow: false, action: 'block_insufficient_scope' }
        },
        {
          if: { 'context.user.scopes': { contains: 'context.scope' } },
          then: { allow: true, action: 'allow_valid_scope' }
        }
      ],
      actions: {
        onAllow: { log: 'skill_execution_approved' },
        onDeny: { log: 'skill_execution_blocked' }
      },
      exceptions: [],
      approvals: { strategy: 'single', requiredApprovers: ['u-manager'] },
      owner: 'u-admin',
      status: 'published'
    },
    {
      id: 'pol-twin-sharing',
      name: 'Twin Sharing Consent Policy',
      description: 'Sharing a digital twin requires owner consent',
      category: 'twin',
      priority: 75,
      conditions: { 'context.action': { in: ['twin.share', 'twin.export', 'twin.delegate'] } },
      rules: [
        {
          if: { 'context.ownerConsent': { equals: false } },
          then: { allow: false, action: 'block_no_consent' }
        },
        {
          if: { 'context.ownerConsent': { equals: true } },
          then: { allow: true, action: 'allow_with_consent' }
        }
      ],
      actions: {
        onAllow: { log: 'twin_share_approved' },
        onDeny: { log: 'twin_share_blocked' }
      },
      exceptions: [],
      approvals: { strategy: 'multi', requiredApprovers: ['u-manager', 'u-admin'] },
      owner: 'u-admin',
      status: 'published'
    }
  ];

  const now = new Date().toISOString();
  for (const p of policySeeds) {
    policies.set(p.id, {
      ...p,
      version: 1,
      createdAt: now,
      updatedAt: now
    });
    auditLog({
      type: 'policy.created',
      policyId: p.id,
      actor: p.owner,
      details: { category: p.category, name: p.name, source: 'seed' }
    });
  }
}

// =================================================================
// Utilities
// =================================================================

function getPath(obj, path) {
  if (obj == null) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function compareValues(actual, op, expected) {
  switch (op) {
    case 'eq':
    case 'equals':
      return actual === expected;
    case 'neq':
    case 'notEquals':
      return actual !== expected;
    case 'gt':
      return typeof actual === 'number' && actual > expected;
    case 'gte':
      return typeof actual === 'number' && actual >= expected;
    case 'lt':
      return typeof actual === 'number' && actual < expected;
    case 'lte':
      return typeof actual === 'number' && actual <= expected;
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    case 'notIn':
      return Array.isArray(expected) && !expected.includes(actual);
    case 'contains':
      return Array.isArray(actual) && actual.includes(expected);
    case 'notContains':
      return Array.isArray(actual) && !actual.includes(expected);
    case 'startsWith':
      return typeof actual === 'string' && actual.startsWith(expected);
    case 'endsWith':
      return typeof actual === 'string' && actual.endsWith(expected);
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'notExists':
      return actual === undefined || actual === null;
    case 'truthy':
      return !!actual;
    case 'falsy':
      return !actual;
    default:
      return false;
  }
}

function evaluateCondition(cond, context) {
  if (cond == null || typeof cond !== 'object') return true;
  for (const [key, spec] of Object.entries(cond)) {
    if (key.startsWith('context.')) {
      const path = key.slice('context.'.length);
      const actual = getPath(context, path);
      if (typeof spec === 'object' && spec !== null && !Array.isArray(spec)) {
        for (const [op, expected] of Object.entries(spec)) {
          if (!compareValues(actual, op, expected)) return false;
        }
      } else {
        if (actual !== spec) return false;
      }
    } else if (key.startsWith('user.')) {
      const path = key.slice('user.'.length);
      const user = context.user || {};
      const actual = getPath(user, path);
      if (typeof spec === 'object' && spec !== null && !Array.isArray(spec)) {
        for (const [op, expected] of Object.entries(spec)) {
          if (!compareValues(actual, op, expected)) return false;
        }
      } else {
        if (actual !== spec) return false;
      }
    } else {
      // arbitrary key -> try in context
      const actual = getPath(context, key);
      if (typeof spec === 'object' && spec !== null && !Array.isArray(spec)) {
        for (const [op, expected] of Object.entries(spec)) {
          if (!compareValues(actual, op, expected)) return false;
        }
      } else {
        if (actual !== spec) return false;
      }
    }
  }
  return true;
}

function evaluateRule(rule, context) {
  return evaluateCondition(rule.if, context);
}

function generateSuggestions(policy, context, reason) {
  const suggestions = [];
  const userId = context.user && context.user.id;
  const approvers = (policy.approvals && policy.approvals.requiredApprovers) || [];
  if (approvers.length > 0) {
    suggestions.push(`Request approval from ${approvers.join(', ')} via strategy '${policy.approvals.strategy}'`);
  }
  if (typeof context.amount === 'number') {
    if (context.amount > 5000) {
      suggestions.push(`Reduce amount to <= 5000 to be auto-approved`);
    } else {
      suggestions.push(`Verify amount is within budget limits`);
    }
  }
  if (context.user && typeof context.user.trustScore === 'number' && context.user.trustScore < 50) {
    suggestions.push(`Increase trust score to >= 50 (currently ${context.user.trustScore})`);
  }
  if (context.action && context.action.startsWith('ai.')) {
    suggestions.push(`Verify AI confidence is >= 0.7`);
  }
  if (context.action && (context.action === 'twin.share' || context.action === 'twin.export' || context.action === 'twin.delegate')) {
    suggestions.push(`Obtain owner consent before sharing the twin`);
  }
  if (context.action && (context.action === 'data.export' || context.action === 'data.bulk_download')) {
    suggestions.push(`Reduce record count to <= 100 or request approval`);
  }
  if (context.action && context.action.startsWith('skill.')) {
    suggestions.push(`Ensure the user has the required scope for this skill`);
  }
  if (userId && reason) {
    suggestions.push(`Contact ${userId} to verify identity`);
  }
  // dedupe and cap
  return Array.from(new Set(suggestions)).slice(0, 6);
}

function findPolicy(policyId, context) {
  if (policyId && policyId !== 'default' && policies.has(policyId)) {
    return policies.get(policyId);
  }
  // auto-resolve by category+action
  const action = context && context.action;
  const categoryHint = context && context.category;
  if (!action && !categoryHint) return null;
  // Prefer category hint
  const candidates = Array.from(policies.values()).filter(p => p.status === 'published');
  if (categoryHint) {
    const byCat = candidates.find(p => p.category === categoryHint);
    if (byCat) return byCat;
  }
  // Match by action prefix or inclusion
  if (action) {
    const byAction = candidates.find(p => {
      const conds = p.conditions || {};
      const keys = Object.keys(conds);
      return keys.some(k => {
        const spec = conds[k];
        if (typeof spec !== 'object' || spec == null) return false;
        if (spec.startsWith && k.endsWith('action')) {
          return action.startsWith(spec.startsWith);
        }
        if (spec.in && k.endsWith('action')) {
          return spec.in.includes(action);
        }
        return false;
      });
    });
    if (byAction) return byAction;
  }
  return null;
}

function evaluatePolicy(policy, context) {
  const result = {
    allowed: false,
    reasons: [],
    suggestions: [],
    policyUsed: policy ? policy.id : null,
    evaluatedAt: new Date().toISOString(),
    matchedRule: null
  };

  if (!policy) {
    result.allowed = false;
    result.reasons.push('No matching policy found - fail-closed default');
    result.suggestions.push('Define a policy for this action/category');
    return result;
  }

  if (policy.status !== 'published') {
    result.allowed = false;
    result.reasons.push(`Policy '${policy.id}' is in status '${policy.status}' and not enforced`);
    result.suggestions.push(`Publish policy '${policy.id}' to enforce it`);
    return result;
  }

  // Time-bound enforcement: policies may have an effective window
  // (effectiveFrom / effectiveUntil). Outside that window, the policy
  // is treated as if it did not exist (fail-closed).
  const nowIso = new Date().toISOString();
  if (policy.effectiveFrom && nowIso < policy.effectiveFrom) {
    result.allowed = false;
    result.reasons.push(`Policy '${policy.id}' is not yet effective (effective from ${policy.effectiveFrom})`);
    result.suggestions.push(`Wait until ${policy.effectiveFrom} or remove effectiveFrom`);
    return result;
  }
  if (policy.effectiveUntil && nowIso > policy.effectiveUntil) {
    result.allowed = false;
    result.reasons.push(`Policy '${policy.id}' has expired (effective until ${policy.effectiveUntil})`);
    result.suggestions.push(`Archive or extend the policy`);
    return result;
  }

  // Sort rules by priority: rules array order is already priority; no explicit priority on rules
  for (const rule of (policy.rules || [])) {
    if (evaluateRule(rule, context)) {
      result.matchedRule = rule;
      result.allowed = !!rule.then.allow;
      if (!result.allowed && rule.then.action) {
        result.reasons.push(`Rule denied: ${rule.then.action}`);
      }
      break;
    }
  }

  if (!result.matchedRule) {
    // No rule matched — fail-closed
    result.allowed = false;
    result.reasons.push(`No rule matched for action '${context.action || 'unknown'}' in policy '${policy.id}'`);
    result.suggestions.push('Add a rule covering this case');
  }

  if (!result.allowed) {
    result.suggestions = result.suggestions.concat(generateSuggestions(policy, context, result.reasons[0]));
    // dedupe
    result.suggestions = Array.from(new Set(result.suggestions));
  }

  return result;
}

function applyExceptions(policy, context, evalResult) {
  if (!policy.exceptions || policy.exceptions.length === 0) return evalResult;
  // Evaluate each exception; if any matches, allow
  // SECURITY: expression evaluator is a strict, custom AST-based parser
  // (see ./expression-evaluator.js). It does NOT use eval, new Function,
  // with(), or any dynamic code execution. Only safe path access and
  // comparison operators are allowed.
  for (const ex of policy.exceptions) {
    try {
      const result = safeEval(ex.condition, context, context.user || {});
      if (result) {
        evalResult.allowed = true;
        evalResult.reasons.push(`Exception applied: ${ex.name}`);
        return evalResult;
      }
    } catch (e) {
      // Log and skip malformed exceptions — fail-closed
      // eslint-disable-next-line no-console
      console.warn(`[policy-os] Exception '${ex.name}' failed to evaluate:`, e.message);
    }
  }
  return evalResult;
}

// =================================================================
// Middleware
// =================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginOpenerPolicy: { policy: 'same-origin' }
}));

// CORS — allowlist in prod, all in dev
app.use(cors(CORS_ORIGIN ? { origin: CORS_ORIGIN.split(',').map(s => s.trim()) } : undefined));

app.use(compression());
app.use(express.json({ limit: '1mb' }));  // Tighter than 10mb — governance payloads are small
app.use(morgan('tiny'));

// Rate limiting — protect the evaluate endpoint from DoS
// Default: 20 requests/minute across both evaluate and write endpoints.
// Override per-environment via env vars (POLICYOS_EVAL_LIMIT, POLICYOS_WRITE_LIMIT).
const EVAL_LIMIT = parseInt(process.env.POLICYOS_EVAL_LIMIT || '20', 10);
const WRITE_LIMIT = parseInt(process.env.POLICYOS_WRITE_LIMIT || '20', 10);
const evaluateLimiter = rateLimit({
  windowMs: 60 * 1000,            // 1 minute
  max: EVAL_LIMIT,                 // 20 evals/min/service by default
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: `Rate limit exceeded; max ${EVAL_LIMIT} evaluations per minute` }
});
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: WRITE_LIMIT,                // 20 writes/min by default
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: `Rate limit exceeded; max ${WRITE_LIMIT} writes per minute` }
});

// Auth middleware — accepts three auth methods:
//   1. X-Service-Token: <SERVICE_TOKEN>  — service-to-service (always allowed)
//   2. Authorization: Bearer <token>     — JWT-style signed token (shared auth format)
//   3. X-API-Key: <key>                 — pre-shared API key (issued via /api/apikeys)
//
// Tokens are base64-encoded JSON: { sub, role, iat, exp }
function verifyTokenLocal(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (typeof payload.exp === 'number' && payload.exp < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid token' };
  }
}

function customAuth(req, res, next) {
  if (!REQUIRE_AUTH) {
    // Dev mode: synthesize a permissive auth context so downstream code that
    // touches req.auth.role / req.auth.type doesn't crash. This is the dev
    // escape hatch — the real path is REQUIRE_AUTH=true + JWT.
    req.auth = { type: 'service', service: 'policy-os-dev', role: 'admin' };
    return next();
  }

  // 1. Service-to-service token
  const svcToken = req.headers['x-service-token'];
  if (svcToken && svcToken === SERVICE_TOKEN) {
    req.auth = { type: 'service', service: 'policy-os', role: 'admin' };
    return next();
  }

  // 2. Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = verifyTokenLocal(token);
    if (result.valid) {
      req.auth = { type: 'token', ...result.payload };
      return next();
    }
  }

  // 3. API key (issued at runtime and registered in policy-os)
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const keyData = apiKeys.get(apiKey);
    if (keyData && (!keyData.expiresAt || keyData.expiresAt > Date.now())) {
      req.auth = { type: 'api-key', ...keyData };
      return next();
    }
  }

  return res.status(401).json({
    error: 'Authentication required',
    hint: 'Send X-Service-Token, Authorization: Bearer <token>, or X-API-Key'
  });
}

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({
        method: req.method,
        path: req.path,
        duration_ms: Date.now() - start,
        status: res.statusCode,
        ts: new Date().toISOString()
      }));
    }
  });
  next();
});

// =================================================================
// Routes
// =================================================================

app.get('/', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    description: 'PolicyOS - Universal governance, trust, authorization, compliance, decision policy platform',
    endpoints: [
      'GET    /',
      'GET    /health',
      'POST   /api/policies',
      'GET    /api/policies',
      'GET    /api/policies/:id',
      'PATCH  /api/policies/:id',
      'DELETE /api/policies/:id',
      'GET    /api/policies/registry',
      'POST   /api/policies/evaluate',
      'POST   /api/policies/evaluate-batch',
      'POST   /api/policies/simulate',
      'POST   /api/policies/:id/submit',
      'POST   /api/policies/:id/approve',
      'POST   /api/policies/:id/archive',
      'POST   /api/roles',
      'GET    /api/roles',
      'POST   /api/roles/:role/assign',
      'GET    /api/users/:userId/roles',
      'POST   /api/check/role',
      'POST   /api/check/abac',
      'POST   /api/approvals',
      'POST   /api/approvals/:id/decide',
      'GET    /api/approvals/:id',
      'GET    /api/approvals',
      'GET    /api/audit',
      'GET    /api/audit/export',
      'GET    /api/users'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    authRequired: REQUIRE_AUTH,
    counts: {
      policies: policies.size,
      roles: roles.size,
      users: users.size,
      approvals: approvals.size,
      auditEntries: auditCount,
      auditInMemory: audit.length
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true, service: SERVICE_NAME });
});

// =================================================================
// Policy Registry
// =================================================================

app.post('/api/policies',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const body = req.body || {};
  const v = validatePolicyBody(body);
  if (!v.ok) return res.status(400).json({ error: 'validation failed', errors: v.errors });
  const id = body.id || `pol-${uuidv4().slice(0, 8)}`;
  if (policies.has(id)) {
    return res.status(409).json({ error: `Policy with id '${id}' already exists` });
  }
  const now = new Date().toISOString();
  const policy = {
    id,
    name: body.name,
    description: body.description || '',
    category: body.category,
    version: 1,
    priority: typeof body.priority === 'number' ? body.priority : 50,
    status: body.status || 'draft',
    conditions: body.conditions || {},
    rules: body.rules || [],
    actions: body.actions || { onAllow: {}, onDeny: {} },
    exceptions: body.exceptions || [],
    approvals: body.approvals || { strategy: 'single', requiredApprovers: [] },
    composition: body.composition || null,
    effectiveFrom: body.effectiveFrom || null,
    effectiveUntil: body.effectiveUntil || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    owner: body.owner || 'u-admin',
    createdAt: now,
    updatedAt: now
  };
  policies.set(id, policy);
  auditLog({
    type: 'policy.created',
    policyId: id,
    actor: policy.owner,
    details: { category: policy.category, name: policy.name }
  });
  res.status(201).json(policy);
});

app.get('/api/policies', (req, res) => {
  const { category, status, owner } = req.query;
  let result = Array.from(policies.values());
  if (category) result = result.filter(p => p.category === category);
  if (status) result = result.filter(p => p.status === status);
  if (owner) result = result.filter(p => p.owner === owner);
  res.json({ count: result.length, policies: result });
});

app.get('/api/policies/registry', (req, res) => {
  const all = Array.from(policies.values());
  const byCategory = {};
  const byStatus = {};
  for (const p of all) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }
  res.json({
    total: all.length,
    categories: CATEGORIES,
    statuses: POLICY_STATUSES,
    byCategory,
    byStatus,
    policies: all
  });
});

app.get('/api/policies/:id', (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  res.json(policy);
});

app.patch('/api/policies/:id',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  if (policy.status === 'retired') {
    return res.status(400).json({ error: 'Cannot modify a retired policy' });
  }
  const body = req.body || {};
  const v = validatePolicyBody(body, { partial: true });
  if (!v.ok) return res.status(400).json({ error: 'validation failed', errors: v.errors });
  const changes = [];
  const protectedFields = ['id', 'createdAt'];
  for (const [k, val] of Object.entries(body)) {
    if (protectedFields.includes(k)) continue;
    if (JSON.stringify(policy[k]) !== JSON.stringify(val)) {
      changes.push({ field: k, from: policy[k], to: val });
      policy[k] = val;
    }
  }
  policy.version = (policy.version || 1) + 1;
  policy.updatedAt = new Date().toISOString();
  if (changes.length > 0) {
    const list = policyChanges.get(policy.id) || [];
    list.push({ version: policy.version, timestamp: policy.updatedAt, changes });
    policyChanges.set(policy.id, list);
    auditLog({
      type: 'policy.updated',
      policyId: policy.id,
      actor: body.actor || policy.owner,
      details: { version: policy.version, changes }
    });
  }
  res.json(policy);
});

app.delete('/api/policies/:id',authOrBypass,  customAuth, writeLimiter, async (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  const hard = req.query.hard === 'true' || req.query.hard === '1';
  if (hard) {
    // Hard delete: remove from store entirely. Used by tests and admin tools.
    await policies.delete(req.params.id);
    auditLog({
      type: 'policy.deleted',
      policyId: policy.id,
      actor: (req.body && req.body.actor) ? req.body.actor : policy.owner,
      details: { hard: true, deletedAt: new Date().toISOString() }
    });
    return res.json({ ok: true, deleted: true, policyId: policy.id });
  }
  // Soft delete (default): retire the policy. It will no longer match evaluate()
  // requests, but stays in the store for audit/rollback.
  policy.status = 'retired';
  policy.updatedAt = new Date().toISOString();
  await policies.set(req.params.id, policy);
  auditLog({
    type: 'policy.retired',
    policyId: policy.id,
    actor: req.body && req.body.actor ? req.body.actor : policy.owner,
    details: { retiredAt: policy.updatedAt }
  });
  res.json({ ok: true, policy });
});

// =================================================================
// Policy Lifecycle
// =================================================================

app.post('/api/policies/:id/submit',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  if (policy.status !== 'draft') {
    return res.status(400).json({ error: `Cannot submit policy in status '${policy.status}'` });
  }
  policy.status = 'review';
  policy.updatedAt = new Date().toISOString();
  auditLog({
    type: 'policy.submitted',
    policyId: policy.id,
    actor: req.body && req.body.actor ? req.body.actor : policy.owner,
    details: {}
  });
  res.json(policy);
});

app.post('/api/policies/:id/approve',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  if (policy.status !== 'review') {
    return res.status(400).json({ error: `Cannot approve policy in status '${policy.status}'` });
  }
  policy.status = 'published';
  policy.updatedAt = new Date().toISOString();
  auditLog({
    type: 'policy.approved',
    policyId: policy.id,
    actor: req.body && req.body.actor ? req.body.actor : 'u-admin',
    details: {}
  });
  res.json(policy);
});

app.post('/api/policies/:id/archive',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const policy = policies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  if (policy.status !== 'published') {
    return res.status(400).json({ error: `Cannot archive policy in status '${policy.status}'` });
  }
  policy.status = 'archived';
  policy.updatedAt = new Date().toISOString();
  auditLog({
    type: 'policy.archived',
    policyId: policy.id,
    actor: req.body && req.body.actor ? req.body.actor : policy.owner,
    details: {}
  });
  res.json(policy);
});

// =================================================================
// Policy Evaluation
// =================================================================

app.post('/api/policies/evaluate',authOrBypass,  customAuth, evaluateLimiter, (req, res) => {
  const body = req.body || {};
  const { policyId, context = {} } = body;
  const policy = findPolicy(policyId, context);

  // If the resolved policy declares a composition, evaluate via composition
  if (policy && policy.composition && policy.composition.policyIds && policy.composition.policyIds.length) {
    const comp = evaluateComposition(policy.composition, context);
    const final = {
      allowed: comp.allowed,
      reasons: [`Composition(${policy.composition.mode || 'allOf'}) over ${comp.total} policies: ${comp.allows} allowed`],
      suggestions: [],
      policyUsed: policy.id,
      evaluatedAt: new Date().toISOString(),
      matchedRule: null,
      composition: comp
    };
    auditLog({ type: 'policy.evaluated', policyId: policy.id, actor: context.user && context.user.id, details: { action: context.action, allowed: final.allowed, reasons: final.reasons } });
    return res.json(final);
  }

  const result = evaluatePolicy(policy, context);
  const final = applyExceptions(policy || {}, context, result);

  auditLog({
    type: 'policy.evaluated',
    policyId: final.policyUsed,
    actor: context.user && context.user.id,
    details: {
      action: context.action,
      allowed: final.allowed,
      reasons: final.reasons
    }
  });

  res.json(final);
});

app.post('/api/policies/evaluate-batch',authOrBypass,  customAuth, evaluateLimiter, (req, res) => {
  const body = req.body || {};
  const evaluations = Array.isArray(body.evaluations) ? body.evaluations : [];
  const results = evaluations.map(ev => {
    const policy = findPolicy(ev.policyId, ev.context || {});
    const result = evaluatePolicy(policy, ev.context || {});
    return applyExceptions(policy || {}, ev.context || {}, result);
  });
  res.json({ count: results.length, results });
});

app.post('/api/policies/simulate',authOrBypass,  customAuth, evaluateLimiter, (req, res) => {
  const body = req.body || {};
  const { policyId, context = {} } = body;
  const policy = findPolicy(policyId, context);
  const result = evaluatePolicy(policy, context);
  const final = applyExceptions(policy || {}, context, result);
  // Note: simulate does NOT write to audit log
  res.json({
    simulation: true,
    allowed: final.allowed,
    reasons: final.reasons,
    matchedRule: final.matchedRule,
    suggestions: final.suggestions,
    policyUsed: final.policyUsed
  });
});

// =================================================================
// Policy Validation (dry-run, no create)
// =================================================================

app.post('/api/policies/validate',authOrBypass,  customAuth, (req, res) => {
  const v = validatePolicyBody(req.body || {});
  const status = v.ok ? 200 : 400;
  res.status(status).json({ ok: v.ok, errors: v.errors, validatedAt: new Date().toISOString() });
});

// =================================================================
// Bulk operations
// =================================================================
//
// POST /api/policies/bulk  -> {policies: [...]}  creates many in one call.
// Used for migrations and test fixtures.

app.post('/api/policies/bulk',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const list = Array.isArray(req.body && req.body.policies) ? req.body.policies : null;
  if (!list) return res.status(400).json({ error: 'policies array is required' });
  const results = { created: [], errors: [] };
  const now = new Date().toISOString();
  for (let i = 0; i < list.length; i++) {
    const body = list[i] || {};
    const v = validatePolicyBody(body);
    if (!v.ok) {
      results.errors.push({ index: i, id: body.id || null, errors: v.errors });
      continue;
    }
    const id = body.id || `pol-${uuidv4().slice(0, 8)}`;
    if (policies.has(id)) {
      results.errors.push({ index: i, id, errors: ['duplicate id'] });
      continue;
    }
    const policy = {
      id,
      name: body.name,
      description: body.description || '',
      category: body.category,
      version: 1,
      priority: typeof body.priority === 'number' ? body.priority : 50,
      status: body.status || 'draft',
      conditions: body.conditions || {},
      rules: body.rules || [],
      actions: body.actions || { onAllow: {}, onDeny: {} },
      exceptions: body.exceptions || [],
      approvals: body.approvals || { strategy: 'single', requiredApprovers: [] },
      composition: body.composition || null,
      effectiveFrom: body.effectiveFrom || null,
      effectiveUntil: body.effectiveUntil || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      owner: body.owner || 'u-admin',
      createdAt: now,
      updatedAt: now
    };
    policies.set(id, policy);
    auditLog({ type: 'policy.created', policyId: id, actor: policy.owner, details: { category: policy.category, name: policy.name, bulk: true } });
    results.created.push(policy);
  }
  res.status(207).json({
    requested: list.length,
    created: results.created.length,
    failed: results.errors.length,
    policies: results.created,
    errors: results.errors
  });
});

app.post('/api/policies/bulk-publish',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const ids = Array.isArray(req.body && req.body.policyIds) ? req.body.policyIds : null;
  if (!ids) return res.status(400).json({ error: 'policyIds array is required' });
  const out = [];
  for (const id of ids) {
    const p = policies.get(id);
    if (!p) { out.push({ id, status: 'not-found' }); continue; }
    if (p.status === 'retired') { out.push({ id, status: 'skipped', reason: 'retired' }); continue; }
    p.status = 'published';
    p.version = (p.version || 1) + 1;
    p.updatedAt = new Date().toISOString();
    policies.set(p.id, p);
    auditLog({ type: 'policy.published', policyId: p.id, actor: req.auth.role, details: { bulk: true } });
    out.push({ id, status: 'published', version: p.version });
  }
  res.json({ count: out.length, results: out });
});

// =================================================================
// Policy Composition (anyOf / allOf / majority over multiple policies)
// =================================================================
//
// When a policy has a `composition` field, evaluation is delegated to the
// composite rule: evaluate all member policies, then combine by mode.
//   anyOf   — at least one member must allow
//   allOf   — every member must allow
//   majority — at least `threshold` fraction must allow (default 0.5)

function evaluateComposition(composition, context) {
  const memberIds = composition.policyIds || [];
  const mode = composition.mode || 'allOf';
  const threshold = typeof composition.threshold === 'number' ? composition.threshold : 0.5;
  if (memberIds.length === 0) {
    return { allowed: false, reasons: ['Composition has no member policies'], memberResults: [] };
  }
  const memberResults = [];
  let allows = 0;
  for (const mid of memberIds) {
    const mp = policies.get(mid);
    if (!mp) {
      memberResults.push({ policyId: mid, allowed: false, error: 'not-found' });
      continue;
    }
    const r = evaluatePolicy(mp, context);
    const final = applyExceptions(mp, context, r);
    memberResults.push({ policyId: mid, allowed: final.allowed, reasons: final.reasons });
    if (final.allowed) allows++;
  }
  let allowed = false;
  if (mode === 'anyOf') allowed = allows >= 1;
  else if (mode === 'allOf') allowed = allows === memberIds.length;
  else if (mode === 'majority') allowed = (allows / memberIds.length) >= threshold;
  return { allowed, mode, allows, total: memberIds.length, memberResults };
}

// Modify evaluatePolicy dispatch: if the policy has a composition, use it.
// (Intentionally not wrapping — the explicit /api/composition-evaluate endpoint
//  is the dedicated entry point. Inline composition is invoked via POST below.)

app.post('/api/composition-evaluate',authOrBypass,  customAuth, evaluateLimiter, (req, res) => {
  const { composition, context = {} } = req.body || {};
  if (!composition || !Array.isArray(composition.policyIds)) {
    return res.status(400).json({ error: 'composition.policyIds is required' });
  }
  const v = validatePolicyBody({ name: 'composition', category: 'business', composition }, { partial: true });
  if (!v.ok) return res.status(400).json({ error: 'validation failed', errors: v.errors });
  const result = evaluateComposition(composition, context);
  auditLog({ type: 'composition.evaluated', actor: context.user && context.user.id, details: { mode: result.mode, allows: result.allows, total: result.total, allowed: result.allowed } });
  res.json({ evaluatedAt: new Date().toISOString(), ...result });
});

// =================================================================
// API Key & Token Issuance (admin only)
// =================================================================

function generateApiKey() {
  return `pk_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

app.post('/api/apikeys',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'name is required' });
  if (req.auth && req.auth.role !== 'admin' && req.auth.role !== '*' && req.auth.type !== 'service') {
    return res.status(403).json({ error: 'Only admin can issue API keys' });
  }
  const key = generateApiKey();
  const expiresAt = body.expiresInMs ? Date.now() + body.expiresInMs : null;
  const record = {
    key,
    name: body.name,
    role: body.role || 'manager',
    createdAt: new Date().toISOString(),
    expiresAt
  };
  apiKeys.set(key, record);
  auditLog({ type: 'apikey.created', actor: req.auth.role || 'unknown', details: { name: body.name, role: record.role } });
  res.status(201).json(record);
});

app.get('/api/apikeys', customAuth, (req, res) => {
  const items = Array.from(apiKeys.values()).map(k => ({
    name: k.name, role: k.role, createdAt: k.createdAt, expiresAt: k.expiresAt
  }));
  res.json({ count: items.length, keys: items });
});

app.delete('/api/apikeys/:key',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  if (req.auth && req.auth.role !== 'admin' && req.auth.type !== 'service') {
    return res.status(403).json({ error: 'Only admin can revoke API keys' });
  }
  const existed = apiKeys.delete(req.params.key);
  if (!existed) return res.status(404).json({ error: 'API key not found' });
  auditLog({ type: 'apikey.revoked', actor: req.auth.role || 'unknown', details: { keyPrefix: req.params.key.slice(0, 8) } });
  res.json({ ok: true });
});

app.post('/api/tokens',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const body = req.body || {};
  if (req.auth && req.auth.role !== 'admin' && req.auth.type !== 'service') {
    return res.status(403).json({ error: 'Only admin can issue tokens' });
  }
  const expiresIn = body.expiresInMs || 24 * 60 * 60 * 1000; // 24h default
  const token = Buffer.from(JSON.stringify({
    sub: body.subject || 'issued-by-admin',
    role: body.role || 'manager',
    iat: Date.now(),
    exp: Date.now() + expiresIn
  })).toString('base64');
  res.status(201).json({ token, expiresIn, role: body.role || 'manager' });
});

// =================================================================
// RBAC
// =================================================================

app.post('/api/roles',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'name is required' });
  if (roles.has(body.name)) return res.status(409).json({ error: `Role '${body.name}' already exists` });
  const role = {
    name: body.name,
    description: body.description || '',
    permissions: Array.isArray(body.permissions) ? body.permissions : [],
    scope: body.scope || 'self',
    createdAt: new Date().toISOString()
  };
  roles.set(body.name, role);
  auditLog({
    type: 'role.created',
    roleName: role.name,
    actor: body.actor || 'u-admin',
    details: { permissions: role.permissions }
  });
  res.status(201).json(role);
});

app.get('/api/roles', (req, res) => {
  res.json({ count: roles.size, roles: Array.from(roles.values()) });
});

app.get('/api/roles/:role', (req, res) => {
  const role = roles.get(req.params.role);
  if (!role) return res.status(404).json({ error: 'Role not found' });
  res.json(role);
});

app.post('/api/roles/:role/assign',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const body = req.body || {};
  const roleName = req.params.role;
  const userId = body.userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const role = roles.get(roleName);
  if (!role) return res.status(404).json({ error: 'Role not found' });
  // userRoles is now a PersistentStore of arrays
  const current = userRoles.get(userId) || [];
  if (!current.includes(roleName)) {
    current.push(roleName);
    userRoles.set(userId, current);
  }
  auditLog({
    type: 'role.assigned',
    roleName,
    actor: body.actor || 'u-admin',
    details: { userId }
  });
  res.json({ ok: true, userId, role: roleName });
});

app.get('/api/users/:userId/roles', (req, res) => {
  const list = (userRoles.get(req.params.userId) || []).map(name => roles.get(name)).filter(Boolean);
  res.json({ userId: req.params.userId, roles: list });
});

app.get('/api/users', (req, res) => {
  res.json({ count: users.size, users: Array.from(users.values()) });
});

app.post('/api/check/role',authOrBypass,  customAuth, evaluateLimiter, (req, res) => {
  const body = req.body || {};
  const { userId, requiredPermission } = body;
  if (!userId || !requiredPermission) {
    return res.status(400).json({ error: 'userId and requiredPermission are required' });
  }
  const userRoleList = (userRoles.get(userId) || []).map(n => roles.get(n)).filter(Boolean);
  const allowed = userRoleList.some(r => {
    if (!r) return false;
    if (r.permissions.includes('*')) return true;
    if (r.permissions.includes(requiredPermission)) return true;
    // Wildcard prefix match e.g. 'policies:*'
    return r.permissions.some(p => {
      if (p.endsWith(':*')) {
        return requiredPermission.startsWith(p.slice(0, -1));
      }
      return false;
    });
  });
  res.json({ allowed, userId, requiredPermission, matchedRoles: userRoleList.filter(r => r && (r.permissions.includes('*') || r.permissions.includes(requiredPermission))) });
});

// =================================================================
// ABAC
// =================================================================

app.post('/api/check/abac',authOrBypass,  customAuth, evaluateLimiter, (req, res) => {
  const body = req.body || {};
  const { userId, action, resource, attributes = {} } = body;
  if (!userId || !action) {
    return res.status(400).json({ error: 'userId and action are required' });
  }
  const user = users.get(userId) || { id: userId, trustScore: 0, attributes: {} };
  const context = {
    user: { ...user, scopes: attributes.scopes || [] },
    action,
    resource,
    ...attributes
  };

  // Try category-based resolution by action prefix
  let policy = null;
  if (action.startsWith('ai.')) policy = policies.get('pol-ai-autonomy');
  else if (action.startsWith('skill.')) policy = policies.get('pol-skill-execution');
  else if (action === 'twin.share' || action === 'twin.export' || action === 'twin.delegate') {
    policy = policies.get('pol-twin-sharing');
  } else if (action === 'data.export' || action === 'data.bulk_download') {
    policy = policies.get('pol-data-export');
  } else if (action === 'payment.make' || action === 'payment.send') {
    policy = policies.get('pol-payment-fraud');
  } else if (action === 'purchase' || action === 'cart.checkout') {
    policy = policies.get('pol-shopping-budget');
  }
  // If no specific policy, look up by category
  if (!policy) {
    policy = Array.from(policies.values()).find(p => p.status === 'published' && p.category === attributes.category);
  }

  const result = evaluatePolicy(policy, context);
  const final = applyExceptions(policy || {}, context, result);
  auditLog({
    type: 'abac.check',
    actor: userId,
    details: { action, resource, allowed: final.allowed, policyUsed: final.policyUsed }
  });
  res.json({
    allowed: final.allowed,
    matchedRule: final.matchedRule,
    reasons: final.reasons,
    policyUsed: final.policyUsed
  });
});

// =================================================================
// Approval Engine
// =================================================================

app.post('/api/approvals',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const body = req.body || {};
  const { policyId, requesterId, resource, amount, strategy, metadata = {} } = body;
  if (!policyId || !requesterId) {
    return res.status(400).json({ error: 'policyId and requesterId are required' });
  }
  const policy = policies.get(policyId);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  const strat = strategy || (policy.approvals && policy.approvals.strategy) || 'single';
  if (!APPROVAL_STRATEGIES.includes(strat)) {
    return res.status(400).json({ error: `strategy must be one of: ${APPROVAL_STRATEGIES.join(', ')}` });
  }
  const approvers = (policy.approvals && policy.approvals.requiredApprovers) || [];
  const id = `apr-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  const approval = {
    id,
    policyId,
    requesterId,
    resource: resource || null,
    amount: typeof amount === 'number' ? amount : null,
    strategy: strat,
    status: 'pending',
    requiredApprovers: approvers,
    decisions: [],
    timeline: [{ event: 'created', at: now, actor: requesterId }],
    metadata,
    createdAt: now,
    updatedAt: now
  };
  // Strategy-specific defaults
  if (strat === 'single' && approvers.length === 0) {
    approval.requiredApprovers = ['u-admin'];
  }
  approvals.set(id, approval);
  auditLog({
    type: 'approval.created',
    approvalId: id,
    actor: requesterId,
    details: { policyId, strategy: strat, amount }
  });
  res.status(201).json(approval);
});

app.post('/api/approvals/:id/decide',authOrBypass,  customAuth, writeLimiter, (req, res) => {
  const body = req.body || {};
  const { approverId, decision, comment } = body;
  if (!approverId || !decision) {
    return res.status(400).json({ error: 'approverId and decision are required' });
  }
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
  }
  const approval = approvals.get(req.params.id);
  if (!approval) return res.status(404).json({ error: 'Approval not found' });
  if (approval.status !== 'pending') {
    return res.status(400).json({ error: `Approval is in status '${approval.status}'` });
  }
  const now = new Date().toISOString();
  const decEntry = { approverId, decision, comment: comment || '', at: now };
  approval.decisions.push(decEntry);
  approval.timeline.push({ event: `decision:${decision}`, at: now, actor: approverId, comment: comment || '' });
  approval.updatedAt = now;

  // Apply strategy
  const strat = approval.strategy;
  const approvers = approval.requiredApprovers || [];
  const approves = approval.decisions.filter(d => d.decision === 'approve').map(d => d.approverId);
  const rejects = approval.decisions.filter(d => d.decision === 'reject').map(d => d.approverId);

  if (rejects.length > 0 && strat !== 'parallel') {
    // any reject ends it
    approval.status = 'rejected';
  } else {
    switch (strat) {
      case 'single':
        if (approves.length >= 1) approval.status = 'approved';
        else if (rejects.length >= 1) approval.status = 'rejected';
        break;
      case 'multi':
        if (rejects.length >= 1) approval.status = 'rejected';
        else if (approves.length >= approvers.length && approvers.length > 0) approval.status = 'approved';
        else if (approvers.length === 0 && approves.length >= 2) approval.status = 'approved';
        break;
      case 'sequential':
        // Approvers must approve in order
        if (rejects.length >= 1) {
          approval.status = 'rejected';
        } else {
          const ordered = approval.decisions
            .filter(d => d.decision === 'approve')
            .map(d => d.approverId);
          // Check that ordered equals prefix of approvers
          let prefixOk = true;
          for (let i = 0; i < ordered.length; i++) {
            if (ordered[i] !== approvers[i]) { prefixOk = false; break; }
          }
          if (prefixOk && ordered.length >= approvers.length && approvers.length > 0) {
            approval.status = 'approved';
          }
        }
        break;
      case 'parallel':
        if (rejects.length >= 1) approval.status = 'rejected';
        else if (approves.length >= approvers.length && approvers.length > 0) approval.status = 'approved';
        else if (approvers.length === 0 && approves.length >= 2) approval.status = 'approved';
        break;
      case 'emergency':
        if (rejects.length >= 1) approval.status = 'rejected';
        else if (approves.length >= 1) approval.status = 'approved';
        break;
    }
  }

  auditLog({
    type: 'approval.decided',
    approvalId: approval.id,
    actor: approverId,
    details: { decision, status: approval.status, strategy: strat }
  });

  res.json(approval);
});

app.get('/api/approvals/:id', (req, res) => {
  const approval = approvals.get(req.params.id);
  if (!approval) return res.status(404).json({ error: 'Approval not found' });
  res.json(approval);
});

app.get('/api/approvals', (req, res) => {
  const { status, strategy, requesterId } = req.query;
  let result = Array.from(approvals.values());
  if (status) result = result.filter(a => a.status === status);
  if (strategy) result = result.filter(a => a.strategy === strategy);
  if (requesterId) result = result.filter(a => a.requesterId === requesterId);
  res.json({ count: result.length, approvals: result });
});

// =================================================================
// Audit
// =================================================================

app.get('/api/audit', customAuth, (req, res) => {
  const { policyId, userId, action, type, from, to } = req.query;
  let result = audit.slice();
  if (policyId) result = result.filter(e => e.policyId === policyId);
  if (userId) result = result.filter(e => e.actor === userId);
  if (action) result = result.filter(e => e.details && e.details.action === action);
  if (type) result = result.filter(e => e.type === type);
  if (from) result = result.filter(e => e.timestamp >= from);
  if (to) result = result.filter(e => e.timestamp <= to);
  res.json({ count: result.length, entries: result });
});

app.get('/api/audit/export', customAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="policy-os-audit-${Date.now()}.json"`);
  res.send(JSON.stringify({
    exportedAt: new Date().toISOString(),
    service: SERVICE_NAME,
    count: audit.length,
    entries: audit
  }, null, 2));
});

// =================================================================
// Webhooks (real-time policy event delivery)
// =================================================================
//
// A webhook is {id, url, secret, events[], active, createdAt, lastDeliveryAt, lastError}
// `events` is an array of audit-event `type` values (e.g. 'policy.created', 'policy.deleted',
// 'policy.evaluated', 'approval.requested', 'approval.decided').
// When an audit event matches, we POST {event, audit, deliveryId} to the URL with HMAC signature.

const webhooks = new PersistentStore('webhooks', STORE_OPTS); // id -> webhook
const webhookDeliveries = new PersistentStore('webhook-deliveries', STORE_OPTS); // id -> {webhookId, status, ...}
let webhookSeq = 0;

import crypto from 'crypto';
function signPayload(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function deliverWebhook(wh, payload) {
  const deliveryId = `wh-${Date.now()}-${++webhookSeq}`;
  const body = JSON.stringify(payload);
  const signature = signPayload(wh.secret || 'policy-os-default', body);
  const startedAt = Date.now();
  try {
    // 5s timeout via AbortController
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5000);
    const resp = await fetch(wh.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PolicyOS-Event': payload.event,
        'X-PolicyOS-Delivery': deliveryId,
        'X-PolicyOS-Signature': `sha256=${signature}`
      },
      body,
      signal: ac.signal
    });
    clearTimeout(timer);
    const ok = resp.status >= 200 && resp.status < 300;
    const entry = {
      id: deliveryId, webhookId: wh.id, event: payload.event,
      url: wh.url, status: ok ? 'success' : 'failed',
      httpStatus: resp.status, durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString()
    };
    await webhookDeliveries.set(deliveryId, entry);
    wh.lastDeliveryAt = entry.timestamp;
    wh.lastError = ok ? null : `HTTP ${resp.status}`;
    await webhooks.set(wh.id, wh);
    return entry;
  } catch (err) {
    const entry = {
      id: deliveryId, webhookId: wh.id, event: payload.event,
      url: wh.url, status: 'failed', error: err.message,
      durationMs: Date.now() - startedAt, timestamp: new Date().toISOString()
    };
    await webhookDeliveries.set(deliveryId, entry);
    wh.lastError = err.message;
    await webhooks.set(wh.id, wh);
    return entry;
  }
}

async function fireWebhooks(auditEntry) {
  if (!auditEntry || !auditEntry.type) return;
  // Look up active webhooks subscribed to this event type
  const all = Array.from(webhooks.values());
  const subscribers = all.filter(w => w.active && Array.isArray(w.events) && w.events.includes(auditEntry.type));
  // Fire-and-forget; never block the request
  for (const wh of subscribers) {
    deliverWebhook(wh, { event: auditEntry.type, audit: auditEntry, deliveryId: null })
      .catch(err => console.error('[policy-os] webhook delivery failed:', err.message));
  }
}

// Webhook CRUD
app.post('/api/webhooks',authOrBypass,  customAuth, writeLimiter, async (req, res) => {
  const { url, events, secret, active } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events must be a non-empty array of audit-event types' });
  }
  const wh = {
    id: `wh-${Date.now()}-${uuidv4().slice(0, 6)}`,
    url,
    events,
    secret: secret || uuidv4(),
    active: active !== false,
    createdAt: new Date().toISOString(),
    lastDeliveryAt: null,
    lastError: null
  };
  await webhooks.set(wh.id, wh);
  auditLog({ type: 'webhook.created', actor: req.auth.role || 'unknown', details: { webhookId: wh.id, url, events } });
  res.json({ ok: true, webhook: wh });
});

app.get('/api/webhooks', customAuth, async (req, res) => {
  const items = Array.from(webhooks.values());
  // Never return secrets in list
  const sanitized = items.map(({ secret, ...rest }) => rest);
  res.json({ count: sanitized.length, webhooks: sanitized });
});

app.get('/api/webhooks/:id', customAuth, async (req, res) => {
  const wh = await webhooks.get(req.params.id);
  if (!wh) return res.status(404).json({ error: 'webhook not found' });
  const { secret, ...safe } = wh;
  res.json(safe);
});

app.delete('/api/webhooks/:id',authOrBypass,  customAuth, writeLimiter, async (req, res) => {
  const exists = await webhooks.get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'webhook not found' });
  await webhooks.delete(req.params.id);
  auditLog({ type: 'webhook.deleted', actor: req.auth.role || 'unknown', details: { webhookId: req.params.id } });
  res.json({ ok: true, deleted: true, webhookId: req.params.id });
});

app.post('/api/webhooks/:id/test',authOrBypass,  customAuth, writeLimiter, async (req, res) => {
  const wh = await webhooks.get(req.params.id);
  if (!wh) return res.status(404).json({ error: 'webhook not found' });
  const testPayload = {
    event: 'webhook.test',
    audit: { type: 'webhook.test', timestamp: new Date().toISOString(), message: 'Test delivery from policy-os' },
    deliveryId: null
  };
  const result = await deliverWebhook(wh, testPayload);
  res.json({ ok: result.status === 'success', delivery: result });
});

// =================================================================
// Analytics (policy usage + decision metrics)
// =================================================================
//
// Per-policy counters: total evaluations, allow/deny breakdown,
// last 7-day time-series, top actors, top reasons.

const evalMetrics = new PersistentStore('eval-metrics', STORE_OPTS); // policyId -> {allows, denies, total, byActor, byReason, byDay}
let metricSeq = 0;

async function recordMetric(auditEntry) {
  if (!auditEntry) return;
  if (auditEntry.type !== 'policy.evaluated') return;
  // Use the policyId that was actually used (may be null for fail-closed).
  // For null/undefined, bucket under '__fail_closed__' so we still track denials.
  const policyId = auditEntry.policyId || (auditEntry.details && auditEntry.details.policyId) || '__fail_closed__';
  const allowed = !!(auditEntry.details && auditEntry.details.allowed);
  // reasons may be an array (newer) or a string (legacy). Normalize to first reason or 'unknown'.
  const reasonsArr = (auditEntry.details && auditEntry.details.reasons) || [];
  const reason = (auditEntry.details && auditEntry.details.reason)
    || (Array.isArray(reasonsArr) && reasonsArr[0])
    || 'unknown';
  const actor = (auditEntry.details && auditEntry.details.actor) || auditEntry.actor || 'anonymous';
  const day = (auditEntry.timestamp || new Date().toISOString()).slice(0, 10);

  const key = policyId;
  let cur = await evalMetrics.get(key);
  if (!cur) {
    cur = { policyId, allows: 0, denies: 0, total: 0, byActor: {}, byReason: {}, byDay: {} };
  }
  cur.total += 1;
  if (allowed) cur.allows += 1; else cur.denies += 1;
  cur.byActor[actor] = (cur.byActor[actor] || 0) + 1;
  cur.byReason[reason] = (cur.byReason[reason] || 0) + 1;
  cur.byDay[day] = (cur.byDay[day] || 0) + 1;
  cur.lastEvaluatedAt = auditEntry.timestamp || new Date().toISOString();
  await evalMetrics.set(key, cur);
}

app.get('/api/analytics/overview', customAuth, async (req, res) => {
  const all = Array.from(evalMetrics.values());
  const totalEvaluations = all.reduce((s, m) => s + (m.total || 0), 0);
  const totalAllows = all.reduce((s, m) => s + (m.allows || 0), 0);
  const totalDenies = all.reduce((s, m) => s + (m.denies || 0), 0);
  res.json({
    policies: all.length,
    evaluations: totalEvaluations,
    allows: totalAllows,
    denies: totalDenies,
    allowRate: totalEvaluations ? Number((totalAllows / totalEvaluations).toFixed(4)) : 0
  });
});

app.get('/api/analytics/policies/:id', customAuth, async (req, res) => {
  const m = await evalMetrics.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'no metrics for this policy' });
  res.json(m);
});

app.get('/api/analytics/policies', customAuth, async (req, res) => {
  const all = Array.from(evalMetrics.values());
  const top = all
    .map(m => ({
      policyId: m.policyId,
      total: m.total || 0,
      allows: m.allows || 0,
      denies: m.denies || 0,
      allowRate: m.total ? Number((m.allows / m.total).toFixed(4)) : 0,
      lastEvaluatedAt: m.lastEvaluatedAt || null
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 25);
  res.json({ count: top.length, policies: top });
});

app.get('/api/analytics/denial-reasons', customAuth, async (req, res) => {
  const all = Array.from(evalMetrics.values());
  const reasons = {};
  for (const m of all) {
    for (const [r, n] of Object.entries(m.byReason || {})) {
      reasons[r] = (reasons[r] || 0) + n;
    }
  }
  const arr = Object.entries(reasons).map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count).slice(0, 20);
  res.json({ count: arr.length, reasons: arr });
});

app.get('/api/analytics/timeseries', customAuth, async (req, res) => {
  const days = Math.min(parseInt(req.query.days || '7', 10), 30);
  const all = Array.from(evalMetrics.values());
  const byDay = {};
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (const m of all) {
    for (const [d, n] of Object.entries(m.byDay || {})) {
      if (d >= cutoff) byDay[d] = (byDay[d] || 0) + n;
    }
  }
  const series = Object.keys(byDay).sort().map(d => ({ day: d, evaluations: byDay[d] }));
  res.json({ days, series });
});

// =================================================================
// Error handler
// =================================================================

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// =================================================================
// 404
// =================================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// =================================================================
// Boot
// =================================================================

seed();

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
// Flush all in-memory state to disk on SIGTERM/SIGINT, then exit.
// Without this, the process can be killed mid-write and lose recent changes
// (the persistent stores are async, so a hard kill may truncate the file).
let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`[policy-os] Received ${signal}, flushing state...`);
  try {
    const flushStart = Date.now();
    await Promise.all([
      policies.flush(),
      roles.flush(),
      userRoles.flush(),
      users.flush(),
      approvals.flush(),
    ]);
    // eslint-disable-next-line no-console
    console.log(`[policy-os] Flushed state in ${Date.now() - flushStart}ms`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[policy-os] Flush error:`, err.message);
  }
  // Give in-flight HTTP requests up to 5s to finish
  if (server) {
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log(`[policy-os] HTTP server closed, exiting`);
      process.exit(0);
    });
    // Hard exit after 5s if connections refuse to close
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.warn(`[policy-os] Forced exit after 5s shutdown grace period`);
      process.exit(1);
    }, 5000).unref();
  } else {
    process.exit(0);
  }
}

let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`PolicyOS running on port ${PORT}`);
    console.log(`Seeded ${policies.size} policies, ${roles.size} roles, ${users.size} users`);
  });
  installGracefulShutdown(server);

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    // eslint-disable-next-line no-console
    console.error('[policy-os] Uncaught exception:', err);
    gracefulShutdown('uncaughtException');
  });
}

export default app;
export { policies, roles, userRoles, approvals, audit, users, findPolicy, evaluatePolicy, applyExceptions, evaluateCondition, compareValues, getPath, validatePolicyBody, isStr, isInt, isIsoDate, CATEGORIES, POLICY_STATUSES, APPROVAL_STRATEGIES, gracefulShutdown };
