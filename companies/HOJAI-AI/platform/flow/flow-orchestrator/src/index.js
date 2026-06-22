/**
 * Flow Orchestrator (port 4244)
 *
 * The central orchestration layer in the HOJAI AI architecture.
 *
 * Architecture (per the audit):
 *
 *   Consumers                    This Service                Foundation
 *   ─────────                    ────────────                ──────────
 *   Genie          ──┐                                       TwinOS     (4705)
 *   CoPilot        ──┤                                       MemoryOS   (4703)
 *   SUTAR          ──┼──►  Flow Orchestrator (4244)  ──►     SkillOS    (4743)
 *   Products       ──┤                                       PolicyOS   (4254)
 *   Agents         ──┘                                       Intelligence (4881)
 *
 * Why this layer exists:
 *   Before this, consumers (Genie, CoPilot, SUTAR, products, agents) had to
 *   call TwinOS, MemoryOS, SkillOS, PolicyOS, Intelligence directly. That
 *   meant every consumer had to know the wiring, the ordering, and the
 *   failure modes of all five foundation services.
 *
 *   With Flow Orchestrator:
 *     - Consumers send one intent to one service
 *     - The orchestrator resolves the right Twin(s), pulls their memory,
 *       calls Intelligence, gates with PolicyOS, executes Skill(s), and
 *       returns the result
 *     - Foundation services stay simple and single-purpose
 *
 * Capabilities:
 *   - Plans: named DAG of steps (TwinResolve → MemoryPull → Intelligence →
 *            PolicyGate → SkillExec → MemoryWrite)
 *   - Executions: an instance of a plan run for one twin or request
 *   - Templates: pre-built plans (e.g. "answer-question", "decide-and-act",
 *            "simulate-then-recommend", "negotiate-and-execute")
 *   - Step Library: the registry of step types the orchestrator knows how
 *            to run (twin.resolve, memory.read, memory.write, intelligence.call,
 *            policy.check, skill.execute, hook.pre, hook.post,
 *            parallel, condition, fan-out, fan-in)
 *   - Audit: every execution is recorded with timing, inputs, outputs,
 *            and which foundation service handled each step
 *   - Retries: per-step retry config with exponential backoff
 *   - Flow Learning: feedback collection + aggregated insights
 *   - Flow Analytics: plan/step/bottleneck analytics
 *   - Webhook hooks: hook.pre / hook.post deliver real HTTP POSTs
 *   - Plan Versioning: snapshot, list, rollback
 *
 * Port: 4244
 * Pattern: in-memory + Express 5
 */

import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
// Phase A: import goal subscriber (event-bus → flow-orchestrator wiring)
import { registerGoalSubscriber, handleGoalEvent, subscriberState, replayGoalEvent } from './subscribers/goal-subscriber.js';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.FLOW_ORCHESTRATOR_PORT || 4244;

// =============================================================================
// POLICY FAIL MODE (fail-CLOSED by default)
// =============================================================================
// When PolicyOS is unreachable or returns an error, the policy.check step
// must NOT silently fail-open. This is a security control. The default
// mode is 'closed' — any error DENIES the action.
//
// Per-step override: pass `step.policyFailMode: 'open' | 'closed' | 'cached'`.
// Global default override: set POLICYOS_FAIL_MODE env var.
//
//   - 'closed' (default): deny on error. Production-safe.
//   - 'open': allow on error. ONLY for local dev / known-safe flows.
//   - 'cached': use last-known decision if it was made within POLICY_CACHE_TTL_MS.
const POLICY_FAIL_MODE = process.env.POLICYOS_FAIL_MODE || 'closed';
const POLICY_CACHE_TTL_MS = Number(process.env.POLICY_CACHE_TTL_MS) || 5 * 60 * 1000; // 5 min
const policyDecisionCache = new Map(); // policyId -> { allowed, checkedAt, error }
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// HTTP CLIENT FOR FOUNDATION CALLS
// =============================================================================
// Node 20+ has built-in fetch with timeouts. We wrap it so a foundation
// service being down does not take down the whole plan — we degrade to a
// recorded failure for that step and let the orchestrator continue or fail
// the execution based on its policy.

async function callFoundation(url, opts = {}, timeoutMs = 1500) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = text; }
    return { ok: r.ok, status: r.status, body };
  } catch (err) {
    return { ok: false, status: 0, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(t);
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// =============================================================================
// IN-MEMORY STORES
// =============================================================================

const plans = new Map();          // planId -> plan definition
const executions = new Map();     // executionId -> execution record
const templates = new Map();      // templateName -> plan template
const stepRegistry = new Map();   // stepType -> { handler, schema }
const audit = [];                 // global audit log
const feedback = new Map();       // executionId -> [feedback records]
const planVersions = new Map();   // planId -> [{ version, snapshot, createdAt }]
const webhookDeliveries = [];     // global webhook delivery log
const stepRetryCounters = new Map(); // executionId:stepIndex:attempt -> count (debug)

// =============================================================================
// FOUNDATION ENDPOINTS (overridable via env)
// =============================================================================
// Consumers should override these to point at their actual foundation services.
const FOUNDATION = {
  twinOS:       process.env.TWINOS_URL       || 'http://localhost:4705',
  memoryOS:     process.env.MEMORYOS_URL     || 'http://localhost:4703',
  skillOS:      process.env.SKILLOS_URL      || 'http://localhost:4743',
  policyOS:     process.env.POLICYOS_URL     || 'http://localhost:4254',
  intelligence: process.env.INTELLIGENCE_URL || 'http://localhost:4881',
};

// =============================================================================
// STEP LIBRARY
// =============================================================================
// Each step type knows how to execute itself against a context object.
// The orchestrator passes the mutable `ctx` between steps; each step can
// read or extend it. This is the small, well-defined set of primitives
// needed to compose almost any consumer flow.

const stepHandlers = {
  // twin.resolve  ─ fetch the twin(s) for an entity and stash on ctx
  'twin.resolve': async (step, ctx) => {
    const twinId = step.twinId || ctx.twinId;
    if (!twinId) throw new Error('twin.resolve requires twinId in step or ctx');
    // Real call to TwinOS; fall back to a local stub if the foundation is down
    const r = await callFoundation(`${FOUNDATION.twinOS}/api/twins/${encodeURIComponent(twinId)}`);
    if (r.ok) {
      ctx.twin = r.body;
      return { twinId, ok: true, source: 'twinos' };
    }
    ctx.twin = ctx.twin || { id: twinId, resolvedBy: 'flow-orchestrator (offline)' };
    return { twinId, ok: true, source: 'fallback', foundationError: r.error || r.status };
  },

  // memory.read  ─ pull recent or relevant memory for a twin
  'memory.read': async (step, ctx) => {
    const twinId = step.twinId || ctx.twinId;
    const kind = step.kind || 'episodic';
    // Prefer the Twin-Memory Bridge (Architecture v2) — twin owns its memory.
    // Fall back to MemoryOS if the bridge is not available.
    const bridge = await callFoundation(`${FOUNDATION.twinOS.replace(':4705', ':4704')}/api/twins/${encodeURIComponent(twinId)}/memory?kind=${kind}`);
    if (bridge.ok) {
      ctx.memory = ctx.memory || {};
      ctx.memory[kind] = bridge.body;
      return { twinId, kind, count: bridge.body.count ?? 0, source: 'twin-memory-bridge' };
    }
    const direct = await callFoundation(`${FOUNDATION.memoryOS}/api/memories/timeline/${encodeURIComponent(twinId)}?kind=${kind}`);
    if (direct.ok) {
      ctx.memory = ctx.memory || {};
      ctx.memory[kind] = direct.body;
      return { twinId, kind, count: direct.body.count ?? 0, source: 'memoryos' };
    }
    // Offline stub
    ctx.memory = ctx.memory || {};
    ctx.memory[kind] = ctx.memory[kind] || { items: [], fetchedAt: new Date().toISOString() };
    return { twinId, kind, count: ctx.memory[kind].items.length, source: 'fallback' };
  },

  // memory.write  ─ write a new memory record back for a twin
  'memory.write': async (step, ctx) => {
    const twinId = step.twinId || ctx.twinId;
    const record = step.record || { content: ctx.output || ctx.result, kind: step.kind || 'experience' };
    // Write through the Twin-Memory Bridge (Architecture v2) so the binding
    // is enforced. If the bridge is down, fall back to a local audit-only
    // recording so the orchestrator still completes.
    const bridgeUrl = `${FOUNDATION.twinOS.replace(':4705', ':4704')}/api/twins/${encodeURIComponent(twinId)}/memory/record`;
    const r = await callFoundation(bridgeUrl, { method: 'POST', body: JSON.stringify({ kind: step.kind || 'experience', record }) });
    ctx.memoryWritten = ctx.memoryWritten || [];
    ctx.memoryWritten.push({ twinId, record, writtenAt: new Date().toISOString(), source: r.ok ? 'twin-memory-bridge' : 'local' });
    return { written: r.ok, count: ctx.memoryWritten.length, source: r.ok ? 'twin-memory-bridge' : 'local' };
  },

  // intelligence.call  ─ invoke the AI brain for analysis, decision, etc.
  'intelligence.call': async (step, ctx) => {
    const task = step.task || 'analyze';
    const input = step.inputKey ? ctx[step.inputKey] : (step.input || ctx.input);
    // Call ai-intelligence (4881) — the central AI routing brain.
    const r = await callFoundation(`${FOUNDATION.intelligence}/api/intelligence/${encodeURIComponent(task)}`, {
      method: 'POST',
      body: JSON.stringify({ input, context: ctx }),
    });
    ctx.intelligence = ctx.intelligence || {};
    if (r.ok && r.body) {
      ctx.intelligence[task] = r.body;
      return { task, ok: true, source: 'ai-intelligence' };
    }
    // Offline stub — record what we would have asked
    ctx.intelligence[task] = { task, input, completedAt: new Date().toISOString(), offline: true };
    return { task, ok: true, source: 'fallback', foundationError: r.error || r.status };
  },

  // policy.check  ─ gate the action through a policy rule
  //
  // Fail-CLOSED by default. If PolicyOS is unreachable or returns a malformed
  // response, the step DENIES the action (throws an error) UNLESS the caller
  // has explicitly opted into 'open' or 'cached' mode via step.policyFailMode
  // (or the global POLICYOS_FAIL_MODE env var).
  //
  //   step.policyFailMode: 'closed' (default) | 'open' | 'cached'
  //   step.policyCacheTtlMs: override the cache TTL (for 'cached' mode)
  //
  // The reason we fail-CLOSED:
  //   PolicyOS is a security boundary. If we can't reach it, we cannot know
  //   whether the action is safe to perform. Defaulting to "allow" creates
  //   a silent privilege-escalation path during PolicyOS outages.
  'policy.check': async (step, ctx) => {
    const policyId = step.policyId || step.policy || 'default-allow';
    const failMode = step.policyFailMode || POLICY_FAIL_MODE;
    const cacheTtlMs = step.policyCacheTtlMs ?? POLICY_CACHE_TTL_MS;

    const r = await callFoundation(`${FOUNDATION.policyOS}/api/policies/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ policyId, context: ctx }),
    });

    // Happy path: PolicyOS answered with a real decision
    if (r.ok && r.body && typeof r.body.allowed === 'boolean') {
      const allowed = r.body.allowed;
      // Refresh the cache with the live decision (used by 'cached' mode)
      policyDecisionCache.set(policyId, {
        allowed,
        checkedAt: Date.now(),
        error: null,
      });
      ctx.policy = ctx.policy || {};
      ctx.policy[policyId] = {
        allowed,
        checkedAt: new Date().toISOString(),
        source: 'policyos',
      };
      if (!allowed) {
        throw new Error(`policy.check denied: ${policyId}`);
      }
      return { policyId, allowed, source: 'policyos' };
    }

    // Error path: PolicyOS did not return a usable decision
    const errorInfo = {
      ok: r.ok,
      status: r.status,
      error: r.error,
      body: r.body,
    };

    // Update the cache slot with the error so 'cached' mode can see it
    const previous = policyDecisionCache.get(policyId);
    policyDecisionCache.set(policyId, {
      allowed: previous ? previous.allowed : null,
      checkedAt: previous ? previous.checkedAt : null,
      error: errorInfo,
    });

    if (failMode === 'open') {
      // OPT-IN dev mode. Logs a warning. Never use in production.
      console.warn(`[policy.check] FAIL-OPEN (step.policyFailMode='open'): PolicyOS unreachable for '${policyId}': ${r.error || r.status}`);
      ctx.policy = ctx.policy || {};
      ctx.policy[policyId] = {
        allowed: step.deny ? false : true,
        checkedAt: new Date().toISOString(),
        source: 'fallback-open',
        policyosError: errorInfo,
      };
      const allowed = step.deny ? false : true;
      if (!allowed) {
        throw new Error(`policy.check denied: ${policyId}`);
      }
      return { policyId, allowed, source: 'fallback-open', policyosError: errorInfo };
    }

    if (failMode === 'cached') {
      // Use the last-known decision if it was made within the TTL.
      if (previous && previous.allowed !== null && previous.checkedAt) {
        const age = Date.now() - previous.checkedAt;
        if (age <= cacheTtlMs) {
          console.warn(`[policy.check] FAIL-CACHED (age=${age}ms, ttl=${cacheTtlMs}ms): using cached decision for '${policyId}': allowed=${previous.allowed}`);
          ctx.policy = ctx.policy || {};
          ctx.policy[policyId] = {
            allowed: previous.allowed,
            checkedAt: new Date(previous.checkedAt).toISOString(),
            source: 'cache',
            cacheAgeMs: age,
            policyosError: errorInfo,
          };
          if (!previous.allowed) {
            throw new Error(`policy.check denied (cached): ${policyId}`);
          }
          return { policyId, allowed: previous.allowed, source: 'cache', cacheAgeMs: age, policyosError: errorInfo };
        }
      }
      // Cache miss or expired → fall through to fail-closed
      console.warn(`[policy.check] FAIL-CACHED miss/expired for '${policyId}' (no usable cached decision) → defaulting to CLOSED`);
    }

    // Default: 'closed' (also 'cached' fallthrough)
    console.warn(`[policy.check] FAIL-CLOSED (mode=${failMode}): PolicyOS unreachable for '${policyId}': ${r.error || r.status}`);
    ctx.policy = ctx.policy || {};
    ctx.policy[policyId] = {
      allowed: false,
      checkedAt: new Date().toISOString(),
      source: 'fail-closed',
      policyosError: errorInfo,
    };
    throw new Error(`policy.check FAIL-CLOSED: PolicyOS unreachable for '${policyId}' (${r.error || 'status ' + r.status})`);
  },

  // skill.execute  ─ run a skill from the SkillOS catalog
  'skill.execute': async (step, ctx) => {
    const skillId = step.skillId;
    if (!skillId) throw new Error('skill.execute requires skillId');
    const r = await callFoundation(`${FOUNDATION.skillOS}/api/skills/${encodeURIComponent(skillId)}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input: step.input || ctx.input }),
    });
    ctx.skillsRun = ctx.skillsRun || [];
    if (r.ok && r.body) {
      ctx.skillsRun.push({ skillId, ranAt: new Date().toISOString(), result: r.body, source: 'skillos' });
      return { skillId, ok: true, source: 'skillos' };
    }
    ctx.skillsRun.push({ skillId, ranAt: new Date().toISOString(), source: 'fallback' });
    return { skillId, ok: true, source: 'fallback', foundationError: r.error || r.status };
  },

  // hook.pre / hook.post  ─ user-defined extension point with optional HTTP delivery
  'hook.pre': async (step, ctx) => {
    ctx.hooks = ctx.hooks || { pre: [], post: [] };
    const entry = { name: step.name, ranAt: new Date().toISOString() };
    ctx.hooks.pre.push(entry);
    const delivery = await deliverWebhook(step, ctx, 'pre');
    if (delivery) entry.delivery = delivery;
    return { hook: 'pre', name: step.name, ...(delivery ? { delivery } : {}) };
  },
  'hook.post': async (step, ctx) => {
    ctx.hooks = ctx.hooks || { pre: [], post: [] };
    const entry = { name: step.name, ranAt: new Date().toISOString() };
    ctx.hooks.post.push(entry);
    const delivery = await deliverWebhook(step, ctx, 'post');
    if (delivery) entry.delivery = delivery;
    return { hook: 'post', name: step.name, ...(delivery ? { delivery } : {}) };
  },

  // parallel  ─ run multiple branches concurrently
  'parallel': async (step, ctx) => {
    if (!step.branches || !Array.isArray(step.branches) || step.branches.length === 0) {
      throw new Error('parallel step requires non-empty branches[]');
    }
    ctx.parallel = ctx.parallel || [];
    const results = await Promise.all(
      step.branches.map(async (branch) => {
        const branchCtx = { ...ctx, _branchName: branch.name };
        const trace = [];
        let branchError = null;
        for (const s of branch.steps || []) {
          const handler = stepHandlers[s.type];
          if (!handler) throw new Error(`unknown step type in branch: ${s.type}`);
          try {
            const r = await handler(s, branchCtx);
            trace.push({ type: s.type, ok: true, result: r });
          } catch (err) {
            trace.push({ type: s.type, ok: false, error: err.message });
            branchError = err;
            break;
          }
        }
        return {
          branch: branch.name,
          ok: !branchError,
          trace,
          error: branchError ? branchError.message : null,
        };
      })
    );
    const allOk = results.every((r) => r.ok);
    ctx.parallel.push({ at: new Date().toISOString(), results });
    return { ok: allOk, branches: results.length, allOk };
  },

  // condition  ─ evaluate an expression and run one of two branches
  'condition': async (step, ctx) => {
    if (!step.if) throw new Error('condition step requires `if` expression');
    const cond = evaluateExpr(step.if, ctx);
    const branch = cond ? (step.then || []) : (step.else || []);
    ctx.conditions = ctx.conditions || [];
    const trace = [];
    for (const s of branch) {
      const handler = stepHandlers[s.type];
      if (!handler) throw new Error(`unknown step type in condition branch: ${s.type}`);
      const r = await handler(s, ctx);
      trace.push({ type: s.type, ok: true, result: r });
    }
    ctx.conditions.push({ at: new Date().toISOString(), evaluated: cond, ranBranch: cond ? 'then' : 'else' });
    return { condition: cond, ran: cond ? 'then' : 'else', steps: trace.length };
  },

  // fan-out  ─ run to[] for each item in the source step's output
  'fan-out': async (step, ctx) => {
    if (!step.source) throw new Error('fan-out step requires `source` step ref');
    if (!step.to || !Array.isArray(step.to)) throw new Error('fan-out step requires `to` array of step templates');
    const sourceOutput = resolveRef(step.source, ctx);
    if (!Array.isArray(sourceOutput)) {
      throw new Error(`fan-out source "${step.source}" did not resolve to an array (got ${typeof sourceOutput})`);
    }
    ctx.fanOut = ctx.fanOut || [];
    const branchResults = [];
    for (let i = 0; i < sourceOutput.length; i += 1) {
      const itemCtx = { ...ctx, _fanOutItem: sourceOutput[i], _fanOutIndex: i };
      const trace = [];
      for (const s of step.to) {
        const handler = stepHandlers[s.type];
        if (!handler) throw new Error(`unknown step type in fan-out: ${s.type}`);
        const r = await handler(s, itemCtx);
        trace.push({ type: s.type, ok: true, result: r });
      }
      branchResults.push({ index: i, item: sourceOutput[i], trace });
    }
    ctx.fanOut.push({ at: new Date().toISOString(), count: sourceOutput.length, source: step.source });
    return { count: sourceOutput.length, source: step.source };
  },

  // fan-in  ─ combine outputs from multiple sources
  'fan-in': async (step, ctx) => {
    if (!step.sources || !Array.isArray(step.sources)) throw new Error('fan-in step requires `sources` array of refs');
    const combine = step.combine || 'merge';
    const outputs = step.sources.map((ref) => resolveRef(ref, ctx));
    let combined;
    if (combine === 'concat') {
      combined = [];
      for (const o of outputs) {
        if (Array.isArray(o)) combined.push(...o);
        else if (o !== undefined) combined.push(o);
      }
    } else {
      // merge: shallow-merge objects, append arrays
      combined = {};
      for (const o of outputs) {
        if (!o || typeof o !== 'object') continue;
        for (const [k, v] of Object.entries(o)) {
          if (Array.isArray(v) && Array.isArray(combined[k])) {
            combined[k] = combined[k].concat(v);
          } else {
            combined[k] = v;
          }
        }
      }
    }
    ctx.fanIn = ctx.fanIn || [];
    ctx.fanIn.push({ at: new Date().toISOString(), sources: step.sources, combine });
    // Also stash on the standard key referenced by name if provided
    if (step.name) ctx[step.name] = combined;
    return { combine, sources: step.sources.length, resultKeys: Object.keys(combined || {}) };
  },

  // debug.fail  ─ test-only step that fails the first N times it's called
  // (Used by e2e tests to verify retry behavior.)
  'debug.fail': async (step, ctx) => {
    ctx._debugFailCount = (ctx._debugFailCount || 0) + 1;
    const failTimes = step.failTimes ?? 1;
    if (ctx._debugFailCount <= failTimes) {
      throw new Error(`debug.fail (attempt ${ctx._debugFailCount}/${failTimes})`);
    }
    return { ok: true, attempts: ctx._debugFailCount };
  },
};

// =============================================================================
// EXPRESSION EVALUATOR (for condition steps)
// =============================================================================
// Supports simple dotted-path lookups: e.g. "ctx.twin.id", "ctx.value > 5",
// "ctx.user.role === 'admin'". For safety we use a constrained evaluator
// rather than eval(). The grammar is intentionally tiny.

function evaluateExpr(expr, ctx) {
  // Trim
  const e = String(expr).trim();
  // === / !== equality
  const eqMatch = e.match(/^(.+?)\s*(===|==|!==|!=)\s*(.+)$/);
  if (eqMatch) {
    const lhs = evaluateValue(eqMatch[1].trim(), ctx);
    const rhs = parseLiteral(eqMatch[3].trim());
    if (eqMatch[2] === '===' || eqMatch[2] === '==') return lhs === rhs;
    return lhs !== rhs;
  }
  // && / || boolean
  if (e.includes('&&')) {
    return e.split('&&').map((p) => evaluateValue(p.trim(), ctx)).every(Boolean);
  }
  if (e.includes('||')) {
    return e.split('||').map((p) => evaluateValue(p.trim(), ctx)).some(Boolean);
  }
  // Comparison
  const cmpMatch = e.match(/^(.+?)\s*(>=|<=|>|<)\s*(.+)$/);
  if (cmpMatch) {
    const lhs = Number(evaluateValue(cmpMatch[1].trim(), ctx));
    const rhs = Number(parseLiteral(cmpMatch[3].trim()));
    switch (cmpMatch[2]) {
      case '>': return lhs > rhs;
      case '<': return lhs < rhs;
      case '>=': return lhs >= rhs;
      case '<=': return lhs <= rhs;
    }
  }
  // Truthiness
  return Boolean(evaluateValue(e, ctx));
}

function evaluateValue(token, ctx) {
  const t = token.trim();
  // Boolean literals
  if (t === 'true') return true;
  if (t === 'false') return false;
  // null
  if (t === 'null') return null;
  // Quoted string
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  // Numeric literal
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  // Dotted path: ctx.x.y
  if (t.startsWith('ctx.')) {
    const path = t.slice(4).split('.');
    let cur = ctx;
    for (const p of path) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }
  // Direct dotted path
  if (t.includes('.')) {
    const path = t.split('.');
    let cur = ctx;
    for (const p of path) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }
  // Bare identifier → ctx[t]
  return ctx[t];
}

function parseLiteral(token) {
  const t = token.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

// =============================================================================
// REF RESOLVER (for fan-out / fan-in source refs)
// =============================================================================
// Supports "ctx.array.path", "ctx.var", "varname", or "ctx" (whole ctx).

function resolveRef(ref, ctx) {
  const t = String(ref).trim();
  if (t === 'ctx') return ctx;
  if (t.startsWith('ctx.')) {
    return evaluateValue(t, ctx);
  }
  return evaluateValue(t, ctx);
}

// =============================================================================
// WEBHOOK DELIVERY (for hook.pre / hook.post)
// =============================================================================
// If a hook step includes `url`, we POST the step+ctx payload to that URL
// and record the delivery outcome. Delivery failures are recorded but do
// not abort the plan (a hook is best-effort by design).

async function deliverWebhook(step, ctx, phase) {
  if (!step.url) return null;
  const payload = {
    hook: phase,
    name: step.name || null,
    step,
    ctx: safeCtxForWebhook(ctx),
    at: new Date().toISOString(),
  };
  const start = Date.now();
  const result = await callFoundation(step.url, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, step.timeoutMs || 3000);
  const delivery = {
    url: step.url,
    ok: result.ok,
    status: result.status,
    durationMs: Date.now() - start,
    error: result.error || null,
    at: new Date().toISOString(),
  };
  webhookDeliveries.push(delivery);
  if (webhookDeliveries.length > 2000) webhookDeliveries.splice(0, webhookDeliveries.length - 2000);
  return delivery;
}

function safeCtxForWebhook(ctx) {
  // Avoid sending huge traces; keep the essentials.
  const out = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (k === 'trace' || k === 'memoryWritten' || k === 'skillsRun') continue;
    out[k] = v;
  }
  return out;
}

// =============================================================================
// TEMPLATES (pre-built plans)
// =============================================================================
// These are the canonical flows most consumers want. They can be cloned,
// customised, and stored as plans.

function seedTemplates() {
  // 1) answer-question: pull twin → read memory → call intelligence → answer
  templates.set('answer-question', {
    name: 'answer-question',
    description: 'Resolve a twin, pull its memory, ask Intelligence for an answer.',
    steps: [
      { type: 'twin.resolve' },
      { type: 'memory.read', kind: 'semantic' },
      { type: 'intelligence.call', task: 'answer' },
      { type: 'memory.write', kind: 'experience' },
    ],
  });

  // 2) decide-and-act: twin → memory → decision → policy gate → skill
  templates.set('decide-and-act', {
    name: 'decide-and-act',
    description: 'Twin decides what to do, gated by policy, executed via skill.',
    steps: [
      { type: 'twin.resolve' },
      { type: 'memory.read', kind: 'episodic' },
      { type: 'intelligence.call', task: 'decide' },
      { type: 'policy.check' },
      { type: 'skill.execute', skillId: '__fromDecision__' },
      { type: 'memory.write', kind: 'decision' },
    ],
  });

  // 3) simulate-then-recommend: twin → simulation → recommend
  templates.set('simulate-then-recommend', {
    name: 'simulate-then-recommend',
    description: 'Run a what-if via SimulationOS then have Intelligence recommend.',
    steps: [
      { type: 'twin.resolve' },
      { type: 'memory.read', kind: 'experience' },
      { type: 'intelligence.call', task: 'simulate' },
      { type: 'intelligence.call', task: 'recommend' },
      { type: 'memory.write', kind: 'knowledge' },
    ],
  });

  // 4) negotiate-and-execute: twin → contract → negotiation → execute
  templates.set('negotiate-and-execute', {
    name: 'negotiate-and-execute',
    description: 'For SUTAR agents — twin proposes, negotiates, executes, logs.',
    steps: [
      { type: 'twin.resolve' },
      { type: 'policy.check', policyId: 'sutar-safety' },
      { type: 'intelligence.call', task: 'negotiate' },
      { type: 'skill.execute', skillId: 'contract-execute' },
      { type: 'memory.write', kind: 'decision' },
    ],
  });

  // 5) personal-assistant: a minimal Genie flow
  templates.set('personal-assistant', {
    name: 'personal-assistant',
    description: 'Genie flow — twin → memory → intelligence → memory write.',
    steps: [
      { type: 'hook.pre', name: 'genie-context-load' },
      { type: 'twin.resolve' },
      { type: 'memory.read', kind: 'personal' },
      { type: 'intelligence.call', task: 'chat' },
      { type: 'memory.write', kind: 'experience' },
      { type: 'hook.post', name: 'genie-context-save' },
    ],
  });
}
seedTemplates();

// =============================================================================
// EXECUTION ENGINE
// =============================================================================
// Supports per-step retry config:
//   step.retry = { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 }
// On failure, we wait backoffMs * (multiplier ^ (attempt-1)) and try again,
// up to maxAttempts total tries. After maxAttempts we record the failure
// and propagate.

function delayFor(attempt, cfg) {
  const base = cfg.backoffMs ?? 1000;
  const mult = cfg.backoffMultiplier ?? 2;
  return base * Math.pow(mult, attempt - 1);
}

async function runPlan(plan, ctx, executionId) {
  const startTime = Date.now();
  const trace = [];
  let stepIndex = 0;

  for (const step of plan.steps || []) {
    const handler = stepHandlers[step.type];
    if (!handler) {
      throw new Error(`unknown step type: ${step.type}`);
    }
    const stepStart = Date.now();
    const retryCfg = step.retry || {};
    const maxAttempts = retryCfg.maxAttempts ?? 1;
    let attempt = 0;
    let result = null;
    let lastError = null;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        result = await handler(step, ctx);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (attempt >= maxAttempts) break;
        const wait = delayFor(attempt, retryCfg);
        await sleep(wait);
      }
    }

    if (lastError) {
      trace.push({
        index: stepIndex,
        type: step.type,
        ok: false,
        attempts: attempt,
        durationMs: Date.now() - stepStart,
        error: lastError.message,
      });
      const rec = executions.get(executionId);
      if (rec) {
        rec.status = 'failed';
        rec.failedAt = new Date().toISOString();
        rec.error = lastError.message;
        rec.trace = trace;
        rec.durationMs = Date.now() - startTime;
      }
      throw lastError;
    }

    trace.push({
      index: stepIndex,
      type: step.type,
      ok: true,
      attempts: attempt,
      durationMs: Date.now() - stepStart,
      result,
    });
    stepIndex += 1;
  }

  const rec = executions.get(executionId);
  if (rec) {
    rec.status = 'completed';
    rec.completedAt = new Date().toISOString();
    rec.durationMs = Date.now() - startTime;
    rec.trace = trace;
    rec.output = ctx.output || ctx.intelligence || ctx.skillsRun || ctx;
  }
  return rec;
}

// =============================================================================
// HELPERS
// =============================================================================

function auditLog(entry) {
  audit.push({ id: uuidv4(), at: new Date().toISOString(), ...entry });
  if (audit.length > 5000) audit.splice(0, audit.length - 5000);
}

function ensureStepTypeAllowed(type) {
  // Validate that the step type is registered. For composite types
  // (parallel, condition, fan-out, fan-in) we still validate inner steps
  // when the plan is created.
  return Boolean(stepHandlers[type]);
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'flow-orchestrator',
    version: '1.1.1',
    port: PORT,
    foundation: FOUNDATION,
    policyFailMode: POLICY_FAIL_MODE,
    policyCacheSize: policyDecisionCache.size,
    counts: {
      plans: plans.size,
      templates: templates.size,
      executions: executions.size,
      completedExecutions: Array.from(executions.values()).filter((e) => e.status === 'completed').length,
      failedExecutions: Array.from(executions.values()).filter((e) => e.status === 'failed').length,
      runningExecutions: Array.from(executions.values()).filter((e) => e.status === 'running').length,
      stepTypes: Object.keys(stepHandlers).length,
      auditEntries: audit.length,
      webhookDeliveries: webhookDeliveries.length,
      feedbackRecords: Array.from(feedback.values()).reduce((a, b) => a + b.length, 0),
    },
    capabilities: [
      'plan-create', 'plan-list', 'plan-get', 'plan-version', 'plan-rollback', 'plan-list-versions',
      'execution-run', 'execution-list', 'execution-get', 'execution-feedback',
      'template-list', 'template-instantiate',
      'step-registry-list',
      'foundation-list', 'foundation-set',
      'analytics-plans', 'analytics-steps', 'analytics-bottlenecks',
      'audit-aggregated',
      'plan-learn',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Policy decision cache (debug) ──────────────────────────────────────────
// Inspect or clear the cached policy decisions used by 'cached' fail mode.
app.get('/api/policy-cache', (_req, res) => {
  const now = Date.now();
  const entries = Array.from(policyDecisionCache.entries()).map(([policyId, entry]) => ({
    policyId,
    allowed: entry.allowed,
    checkedAt: entry.checkedAt ? new Date(entry.checkedAt).toISOString() : null,
    ageMs: entry.checkedAt ? now - entry.checkedAt : null,
    hasError: !!entry.error,
  }));
  res.json({
    failMode: POLICY_FAIL_MODE,
    cacheTtlMs: POLICY_CACHE_TTL_MS,
    size: policyDecisionCache.size,
    entries,
  });
});

app.delete('/api/policy-cache',requireAuth,  (_req, res) => {
  const size = policyDecisionCache.size;
  policyDecisionCache.clear();
  res.json({ cleared: size });
});

// ── Plans ──────────────────────────────────────────────────────────────────

app.post('/api/plans',requireAuth,  (req, res) => {
  const { name, description, steps } = req.body || {};
  if (!name || !Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: 'name and non-empty steps[] required' });
  }
  for (const s of steps) {
    if (!stepHandlers[s.type]) {
      return res.status(400).json({ error: `unknown step type: ${s.type}` });
    }
    // For composite types, validate inner step types
    if (s.type === 'parallel' && Array.isArray(s.branches)) {
      for (const branch of s.branches) {
        for (const inner of branch.steps || []) {
          if (!stepHandlers[inner.type]) {
            return res.status(400).json({ error: `unknown step type in branch: ${inner.type}` });
          }
        }
      }
    }
    if (s.type === 'condition') {
      for (const inner of [...(s.then || []), ...(s.else || [])]) {
        if (!stepHandlers[inner.type]) {
          return res.status(400).json({ error: `unknown step type in condition branch: ${inner.type}` });
        }
      }
    }
    if (s.type === 'fan-out' && Array.isArray(s.to)) {
      for (const inner of s.to) {
        if (!stepHandlers[inner.type]) {
          return res.status(400).json({ error: `unknown step type in fan-out: ${inner.type}` });
        }
      }
    }
  }
  const id = uuidv4();
  const plan = {
    id, name, description: description || '', steps,
    version: 1,
    createdAt: new Date().toISOString(),
    createdBy: req.header('x-tenant') || 'system',
  };
  plans.set(id, plan);
  planVersions.set(id, [{ version: 1, snapshot: JSON.parse(JSON.stringify(plan)), createdAt: plan.createdAt, label: 'initial' }]);
  auditLog({ kind: 'plan-created', planId: id, name });
  res.status(201).json(plan);
});

app.get('/api/plans', requireAuth, (_req, res) => {
  res.json({ plans: Array.from(plans.values()) });
});

app.get('/api/plans/:id', requireAuth, (req, res) => {
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'plan not found' });
  res.json(plan);
});

app.delete('/api/plans/:id',requireAuth,  (req, res) => {
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'plan not found' });
  plans.delete(req.params.id);
  planVersions.delete(req.params.id);
  res.status(204).end();
});

// ── Plan Versioning ────────────────────────────────────────────────────────
// Snapshot, list, and rollback. We keep full snapshots in-memory.

app.post('/api/plans/:id/version',requireAuth,  (req, res) => {
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'plan not found' });
  const versions = planVersions.get(req.params.id) || [];
  const next = (versions[versions.length - 1]?.version || 0) + 1;
  const snapshot = JSON.parse(JSON.stringify(plan));
  const entry = {
    version: next,
    snapshot,
    createdAt: new Date().toISOString(),
    label: (req.body && req.body.label) || `version-${next}`,
  };
  versions.push(entry);
  planVersions.set(req.params.id, versions);
  auditLog({ kind: 'plan-versioned', planId: req.params.id, version: next });
  res.status(201).json(entry);
});

app.get('/api/plans/:id/versions', requireAuth, (req, res) => {
  const versions = planVersions.get(req.params.id);
  if (!versions) return res.status(404).json({ error: 'plan not found' });
  res.json({ planId: req.params.id, versions: versions.map((v) => ({ version: v.version, label: v.label, createdAt: v.createdAt, name: v.snapshot.name, stepCount: v.snapshot.steps.length })) });
});

app.post('/api/plans/:id/rollback',requireAuth,  (req, res) => {
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'plan not found' });
  const { version } = req.body || {};
  if (!version) return res.status(400).json({ error: 'version required' });
  const versions = planVersions.get(req.params.id) || [];
  const target = versions.find((v) => v.version === version);
  if (!target) return res.status(404).json({ error: `version ${version} not found` });
  // Restore the snapshot in-place; mark as new version for traceability.
  const restored = JSON.parse(JSON.stringify(target.snapshot));
  restored.restoredFrom = version;
  restored.restoredAt = new Date().toISOString();
  plans.set(req.params.id, restored);
  const next = (versions[versions.length - 1]?.version || 0) + 1;
  versions.push({ version: next, snapshot: JSON.parse(JSON.stringify(restored)), createdAt: restored.restoredAt, label: `rollback-to-${version}` });
  planVersions.set(req.params.id, versions);
  auditLog({ kind: 'plan-rolled-back', planId: req.params.id, version });
  res.json(restored);
});

// ── Templates ──────────────────────────────────────────────────────────────

app.get('/api/templates', (_req, res) => {
  res.json({ templates: Array.from(templates.values()) });
});

app.get('/api/templates/:name', (req, res) => {
  const t = templates.get(req.params.name);
  if (!t) return res.status(404).json({ error: 'template not found' });
  res.json(t);
});

// Instantiate a template into a saved plan
app.post('/api/templates/:name/instantiate',requireAuth,  (req, res) => {
  const t = templates.get(req.params.name);
  if (!t) return res.status(404).json({ error: 'template not found' });
  const { name, description, stepsOverride } = req.body || {};
  const id = uuidv4();
  const plan = {
    id,
    name: name || `${t.name}-${Date.now()}`,
    description: description || t.description,
    steps: Array.isArray(stepsOverride) && stepsOverride.length > 0 ? stepsOverride : t.steps,
    templateSource: t.name,
    version: 1,
    createdAt: new Date().toISOString(),
    createdBy: req.header('x-tenant') || 'system',
  };
  plans.set(id, plan);
  planVersions.set(id, [{ version: 1, snapshot: JSON.parse(JSON.stringify(plan)), createdAt: plan.createdAt, label: 'initial' }]);
  auditLog({ kind: 'template-instantiated', templateName: t.name, planId: id });
  res.status(201).json(plan);
});

// ── Executions ─────────────────────────────────────────────────────────────

app.post('/api/executions',requireAuth,  async (req, res) => {
  const { planId, templateName, twinId, context } = req.body || {};

  let plan;
  if (planId) plan = plans.get(planId);
  else if (templateName) {
    const t = templates.get(templateName);
    if (t) plan = { id: null, name: t.name, description: t.description, steps: t.steps };
  }
  if (!plan) {
    return res.status(400).json({ error: 'planId or templateName required and must resolve' });
  }

  const id = uuidv4();
  const execution = {
    id,
    planId: plan.id,
    planName: plan.name,
    twinId: twinId || null,
    status: 'running',
    startedAt: new Date().toISOString(),
    requestedBy: req.header('x-tenant') || 'system',
  };
  executions.set(id, execution);
  auditLog({ kind: 'execution-started', executionId: id, planName: plan.name, twinId });

  // Run async; respond immediately with the id so caller can poll.
  runPlan(plan, { ...(context || {}), twinId: execution.twinId }, id)
    .then((rec) => auditLog({ kind: 'execution-completed', executionId: id, status: rec.status, durationMs: rec.durationMs }))
    .catch((err) => auditLog({ kind: 'execution-failed', executionId: id, error: err.message }));

  res.status(202).json({ executionId: id, status: 'running' });
});

// Run-and-wait variant — useful for synchronous consumers (Genie, CoPilot).
// Polling is fine too; both endpoints share the same engine.
app.post('/api/executions/sync',requireAuth,  async (req, res) => {
  const { planId, templateName, twinId, context, timeoutMs = 8000 } = req.body || {};
  let plan;
  if (planId) plan = plans.get(planId);
  else if (templateName) {
    const t = templates.get(templateName);
    if (t) plan = { id: null, name: t.name, description: t.description, steps: t.steps };
  }
  if (!plan) return res.status(400).json({ error: 'planId or templateName required and must resolve' });

  const id = uuidv4();
  const execution = {
    id,
    planId: plan.id,
    planName: plan.name,
    twinId: twinId || null,
    status: 'running',
    startedAt: new Date().toISOString(),
    requestedBy: req.header('x-tenant') || 'system',
  };
  executions.set(id, execution);

  try {
    const final = await Promise.race([
      runPlan(plan, { ...(context || {}), twinId }, id),
      new Promise((_, rej) => setTimeout(() => rej(new Error('execution timed out')), timeoutMs)),
    ]);
    res.json(final);
  } catch (err) {
    const rec = executions.get(id);
    res.status(500).json({ ...(rec || execution), error: err.message });
  }
});

app.get('/api/executions', requireAuth, (_req, res) => {
  res.json({ executions: Array.from(executions.values()).slice(-200) });
});

app.get('/api/executions/:id', requireAuth, (req, res) => {
  const e = executions.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'execution not found' });
  res.json(e);
});

// ── Flow Learning: feedback + insights ─────────────────────────────────────

app.post('/api/executions/:id/feedback',requireAuth,  (req, res) => {
  const exec = executions.get(req.params.id);
  if (!exec) return res.status(404).json({ error: 'execution not found' });
  const { outcome, notes } = req.body || {};
  const allowed = ['success', 'partial', 'failure'];
  if (!allowed.includes(outcome)) {
    return res.status(400).json({ error: `outcome must be one of: ${allowed.join(', ')}` });
  }
  const record = {
    id: uuidv4(),
    executionId: req.params.id,
    planId: exec.planId,
    planName: exec.planName,
    outcome,
    notes: notes || '',
    at: new Date().toISOString(),
    recordedBy: req.header('x-tenant') || 'system',
  };
  const list = feedback.get(req.params.id) || [];
  list.push(record);
  feedback.set(req.params.id, list);
  auditLog({ kind: 'feedback-recorded', executionId: req.params.id, outcome });
  res.status(201).json(record);
});

app.get('/api/plans/:id/learn', requireAuth, (req, res) => {
  if (!plans.has(req.params.id) && req.params.id !== 'null') {
    // Allow template-based plans where planId may be 'null'
  }
  const plan = plans.get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'plan not found' });

  // Aggregate feedback for all executions of this plan
  const allFeedback = [];
  for (const [execId, list] of feedback.entries()) {
    const e = executions.get(execId);
    if (e && e.planId === req.params.id) {
      allFeedback.push(...list);
    }
  }

  // Aggregate execution outcomes
  const planExecutions = Array.from(executions.values()).filter((e) => e.planId === req.params.id);
  const total = planExecutions.length;
  const completed = planExecutions.filter((e) => e.status === 'completed').length;
  const failed = planExecutions.filter((e) => e.status === 'failed').length;
  const successRate = total ? completed / total : 0;
  const avgDurationMs = total
    ? planExecutions.reduce((s, e) => s + (e.durationMs || 0), 0) / total
    : 0;

  // Tally feedback outcomes
  const byOutcome = { success: 0, partial: 0, failure: 0 };
  for (const f of allFeedback) {
    if (byOutcome[f.outcome] !== undefined) byOutcome[f.outcome] += 1;
  }

  // Common failure modes from step traces + feedback notes
  const failureMap = new Map();
  for (const e of planExecutions) {
    if (e.status === 'failed' && e.error) {
      const key = `${e.trace?.[e.trace.length - 1]?.type || 'unknown'}: ${e.error}`;
      failureMap.set(key, (failureMap.get(key) || 0) + 1);
    }
  }
  const commonFailures = Array.from(failureMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => ({ message, count }));

  // Suggested improvements (heuristic)
  const suggestions = [];
  if (total && successRate < 0.8) {
    suggestions.push('Success rate below 80% — review failing steps and consider adding retries with backoff.');
  }
  if (avgDurationMs > 5000) {
    suggestions.push(`Average duration is ${Math.round(avgDurationMs)}ms — consider parallelizing independent steps.`);
  }
  if (byOutcome.failure > 0) {
    suggestions.push(`${byOutcome.failure} negative feedback record(s) — review feedback notes.`);
  }
  const slowStepMap = new Map();
  for (const e of planExecutions) {
    for (const t of e.trace || []) {
      const cur = slowStepMap.get(t.type) || { total: 0, count: 0, max: 0 };
      cur.total += t.durationMs || 0;
      cur.count += 1;
      cur.max = Math.max(cur.max, t.durationMs || 0);
      slowStepMap.set(t.type, cur);
    }
  }
  const slowestStep = Array.from(slowStepMap.entries())
    .map(([type, v]) => ({ type, avgMs: v.total / v.count, maxMs: v.max, samples: v.count }))
    .sort((a, b) => b.avgMs - a.avgMs)[0];
  if (slowestStep && slowestStep.avgMs > 1000) {
    suggestions.push(`Step "${slowestStep.type}" averages ${Math.round(slowestStep.avgMs)}ms — consider a longer timeout or caching.`);
  }

  res.json({
    planId: req.params.id,
    planName: plan.name,
    totalExecutions: total,
    completedExecutions: completed,
    failedExecutions: failed,
    successRate: Number(successRate.toFixed(3)),
    avgDurationMs: Math.round(avgDurationMs),
    feedback: { total: allFeedback.length, byOutcome, records: allFeedback },
    commonFailures,
    suggestions,
    slowestStep: slowestStep || null,
  });
});

// ── Flow Analytics ─────────────────────────────────────────────────────────

app.get('/api/analytics/plans', requireAuth, (_req, res) => {
  const stats = [];
  for (const plan of plans.values()) {
    const exs = Array.from(executions.values()).filter((e) => e.planId === plan.id);
    const total = exs.length;
    const completed = exs.filter((e) => e.status === 'completed').length;
    const failed = exs.filter((e) => e.status === 'failed').length;
    const successRate = total ? completed / total : 0;
    const avgDurationMs = total
      ? exs.reduce((s, e) => s + (e.durationMs || 0), 0) / total
      : 0;
    stats.push({
      planId: plan.id,
      planName: plan.name,
      totalExecutions: total,
      completed,
      failed,
      successRate: Number(successRate.toFixed(3)),
      avgDurationMs: Math.round(avgDurationMs),
      stepCount: plan.steps.length,
    });
  }
  res.json({ plans: stats });
});

app.get('/api/analytics/steps', requireAuth, (_req, res) => {
  const byType = new Map();
  for (const e of executions.values()) {
    for (const t of e.trace || []) {
      const cur = byType.get(t.type) || { count: 0, okCount: 0, failCount: 0, totalMs: 0, maxMs: 0 };
      cur.count += 1;
      if (t.ok) cur.okCount += 1; else cur.failCount += 1;
      cur.totalMs += t.durationMs || 0;
      cur.maxMs = Math.max(cur.maxMs, t.durationMs || 0);
      byType.set(t.type, cur);
    }
  }
  const steps = Array.from(byType.entries()).map(([type, v]) => ({
    type,
    count: v.count,
    okCount: v.okCount,
    failCount: v.failCount,
    successRate: v.count ? Number((v.okCount / v.count).toFixed(3)) : 0,
    avgLatencyMs: v.count ? Math.round(v.totalMs / v.count) : 0,
    maxLatencyMs: v.maxMs,
  }));
  res.json({ steps });
});

app.get('/api/analytics/bottlenecks', requireAuth, (_req, res) => {
  // Top-N slowest steps (by average duration) across all executions
  const byType = new Map();
  for (const e of executions.values()) {
    for (const t of e.trace || []) {
      const cur = byType.get(t.type) || { total: 0, count: 0, max: 0 };
      cur.total += t.durationMs || 0;
      cur.count += 1;
      cur.max = Math.max(cur.max, t.durationMs || 0);
      byType.set(t.type, cur);
    }
  }
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const bottlenecks = Array.from(byType.entries())
    .map(([type, v]) => ({
      type,
      avgMs: v.count ? Math.round(v.total / v.count) : 0,
      maxMs: v.max,
      samples: v.count,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, limit);
  res.json({ bottlenecks });
});

// ── Step Registry ──────────────────────────────────────────────────────────

app.get('/api/step-registry', (_req, res) => {
  const out = Object.keys(stepHandlers).map((type) => ({
    type,
    foundation: stepFoundation(type),
    description: stepDescription(type),
  }));
  res.json({ stepTypes: out });
});

function stepFoundation(type) {
  if (type.startsWith('twin.')) return 'TwinOS';
  if (type.startsWith('memory.')) return 'MemoryOS';
  if (type.startsWith('skill.')) return 'SkillOS';
  if (type.startsWith('policy.')) return 'PolicyOS';
  if (type.startsWith('intelligence.')) return 'Intelligence';
  if (type.startsWith('hook.')) return 'user-defined';
  if (type === 'parallel') return 'composite';
  if (type === 'condition') return 'composite';
  if (type === 'fan-out') return 'composite';
  if (type === 'fan-in') return 'composite';
  if (type === 'debug.fail') return 'test-only';
  return 'unknown';
}

function stepDescription(type) {
  return ({
    'twin.resolve': 'Resolve a twin and stash it on the execution context',
    'memory.read': 'Read memory for a twin (kind: episodic, semantic, personal, ...)',
    'memory.write': 'Write a memory record back for a twin',
    'intelligence.call': 'Call the AI intelligence layer for analysis/decision/answer',
    'policy.check': 'Gate the flow through a policy rule (throws if denied)',
    'skill.execute': 'Execute a registered skill by id',
    'hook.pre': 'Pre-step user-defined hook (delivers HTTP POST if step.url is set)',
    'hook.post': 'Post-step user-defined hook (delivers HTTP POST if step.url is set)',
    'parallel': 'Run multiple branches concurrently (Promise.all)',
    'condition': 'Evaluate an expression; run then- or else-branch',
    'fan-out': 'Run a step template for each item in a source array',
    'fan-in': 'Combine outputs from multiple sources (merge|concat)',
    'debug.fail': 'Test-only step that fails the first N times (verifies retry)',
  })[type] || '';
}

// ── Foundation registry ────────────────────────────────────────────────────

app.get('/api/foundation', (_req, res) => {
  res.json(FOUNDATION);
});

app.put('/api/foundation/:key',requireAuth,  (req, res) => {
  const allowed = Object.keys(FOUNDATION);
  if (!allowed.includes(req.params.key)) {
    return res.status(400).json({ error: `unknown foundation key; allowed: ${allowed.join(',')}` });
  }
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url string required' });
  FOUNDATION[req.params.key] = url;
  auditLog({ kind: 'foundation-set', key: req.params.key, url });
  res.json({ ok: true, foundation: FOUNDATION });
});

// ── Audit ──────────────────────────────────────────────────────────────────
// Supports both a simple list and aggregation queries via query params.

app.get('/api/audit', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);

  // Aggregation mode
  if (req.query.aggregate) {
    const groups = new Map();
    for (const e of audit) {
      const key = e[req.query.aggregate] ?? 'unknown';
      const cur = groups.get(key) || { count: 0, firstAt: e.at, lastAt: e.at };
      cur.count += 1;
      if (e.at < cur.firstAt) cur.firstAt = e.at;
      if (e.at > cur.lastAt) cur.lastAt = e.at;
      groups.set(key, cur);
    }
    return res.json({ aggregate: req.query.aggregate, groups: Array.from(groups.entries()).map(([k, v]) => ({ key: k, ...v })) });
  }

  // Filter by kind
  let entries = audit;
  if (req.query.kind) {
    entries = entries.filter((e) => e.kind === req.query.kind);
  }
  res.json({ entries: entries.slice(-limit) });
});

// =============================================================================
// 404 + error handling
// =============================================================================

// Phase A: webhook endpoint that event-bus calls when `goal.created` fires.
// We acknowledge immediately (200) so event-bus doesn't retry; if the goal
// handling fails, we log to subscriberState.lastError for ops to inspect.
// Phase A: webhook endpoint that event-bus calls when `goal.created` fires.
// No requireAuth — event-bus signs payloads with HMAC-SHA256
// (X-Event-Bus-Signature header). For now we trust the localhost event-bus.
// TODO(prod): verify HMAC signature here.
app.post('/api/_internal/goal-webhook', async (req, res) => {
  try {
    const result = await handleGoalEvent(req.body);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[flow-orchestrator/goal-webhook] failed:', err.message);
    // Return 500 so event-bus retries per its retryPolicy
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Phase A: ops endpoint to inspect the subscriber's state
app.get('/api/_internal/goal-subscriber/status', (_req, res) => {
  res.json({
    ...subscriberState,
    eventCount: subscriberState.eventCount,
    recentEvents: subscriberState.recentEvents.slice(0, 20),
  });
});

// Phase A: manual replay of a specific event from event-bus
app.post('/api/_internal/goal-subscriber/replay/:eventId',requireAuth,  async (req, res) => {
  const result = await replayGoalEvent(req.params.eventId);
  res.json(result);
});

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[flow-orchestrator]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// =============================================================================
// START
// =============================================================================

let isShuttingDown = false;
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[flow-orchestrator] listening on :${PORT} (foundation: ${JSON.stringify(FOUNDATION)})`);
  // Phase A: register goal.created subscriber (non-blocking)
  registerGoalSubscriber().catch((err) => {
    console.warn('[flow-orchestrator] goal subscriber registration failed (non-fatal):', err.message);
  });
});
installGracefulShutdown(server);

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`[flow-orchestrator] Received ${signal}, flushing state...`);
  try {
    const flushStart = Date.now();
    // The flow-orchestrator uses many in-memory Maps, but only those
    // backed by PersistentStore need flushing. Flush the known ones.
    const stores = [
      plans, executions, templates, audit, feedback,
      planVersions, webhookDeliveries, stepRetryCounters, policyDecisionCache,
    ].filter(s => s && typeof s.flush === 'function');
    await Promise.all(stores.map(s => s.flush().catch(() => {})));
    // eslint-disable-next-line no-console
    console.log(`[flow-orchestrator] Flushed state in ${Date.now() - flushStart}ms`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[flow-orchestrator] Flush error:`, err.message);
  }
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log(`[flow-orchestrator] HTTP server closed, exiting`);
    process.exit(0);
  });
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.warn(`[flow-orchestrator] Forced exit after 5s shutdown grace period`);
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[flow-orchestrator] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});

export default app;
