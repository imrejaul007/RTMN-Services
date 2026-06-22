/**
 * Reasoning Engine
 *
 * Port: 4795
 *
 * Plan-and-Execute loop for complex Genie requests.
 *
 * The runtime/genie /api/ask endpoint used to do: intent → route → call specialist → return.
 * One step. That works for "what's on my calendar?" but not for:
 *   - "Plan me a Tokyo trip under $3K with my wife, focused on food, add to calendar"
 *   - "I just got paid. Move $500 to savings, pay the Visa bill, what's left?"
 *   - "I'm burned out. Look at my last 2 weeks of sleep and meetings and tell me what to cut"
 *
 * Those need:
 *   1. Decomposition into sub-tasks (the LLM plans)
 *   2. Tool selection per sub-task (the registry)
 *   3. Sequential or parallel execution (the runtime)
 *   4. Re-planning when a tool fails (the re-planner)
 *   5. Synthesis into one coherent answer (the synthesizer)
 *
 * The loop:
 *   1. PLAN  — LLM reads question + tool catalog, returns { steps: [{tool, args, dependsOn}] }
 *   2. EXECUTE — run steps in dependency order, parallel where possible
 *   3. REPLAN (if any step failed) — LLM gets the partial results + errors, returns a new plan
 *   4. SYNTHESIZE — LLM gets question + plan + all results, returns the final answer
 *
 * The runtime does NOT replace the intent engine. It sits ABOVE it:
 *   - Intent Engine: "which specialist handles this?" (Phase 1)
 *   - Reasoning Engine: "how do I solve this multi-step request?" (Phase 2)
 *
 * Routes:
 *   POST /api/reason         — main entry point: plan + execute + synthesize
 *   POST /api/reason/plan    — only the planning step (debugging/observability)
 *   POST /api/reason/execute — execute a pre-made plan (for testing)
 *   GET  /api/reason/tools   — list available tools
 *   GET  /api/reason/stats   — usage stats (plans made, replans, success rate)
 *   GET  /health
 *   GET  /ready
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'node:crypto';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { createLogger } from '@rtmn/shared/lib/logger';
import { createLLMClient, withStructuredOutput } from '@rtmn/shared/lib/llm';
import {
  TOOLS,
  TOOLS_BY_NAME,
  toolsForPrompt,
  getTool,
  listTools,
  listCategories,
} from '../lib/tool-registry.js';

const PORT = parseInt(process.env.PORT || '4795', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const MEMORY_SUBSTRATE_URL = process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791';

const log = createLogger('reasoning-engine');

// Usage stats
const stats = new PersistentMap('reasoning-stats', { serviceName: 'reasoning-engine' });

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const sendErr = (res, s, code, msg) => res.status(s).json({ success: false, error: { code, message: msg }, meta: { timestamp: new Date().toISOString() } });

// ============================================================================
// TOOL EXECUTOR
// Calls the actual Genie service for a given tool invocation.
// Never throws — returns { ok, data, error } so the planner can reason about failures.
// ============================================================================
async function executeTool(toolName, args, userId) {
  const tool = getTool(toolName);
  if (!tool) return { ok: false, error: `unknown tool: ${toolName}` };

  // URL comes from the tool's service — the executor maps service name → URL
  const serviceUrl = getServiceUrl(tool.service);
  if (!serviceUrl) return { ok: false, error: `service not configured: ${tool.service}` };

  const url = `${serviceUrl}${tool.path}`;
  const opts = {
    method: tool.method,
    headers: { 'content-type': 'application/json', 'x-internal-token': INTERNAL_TOKEN },
    timeout: 8000,
  };
  if (tool.method !== 'GET' && args) opts.body = JSON.stringify({ ...args, userId });

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeout);
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(t);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, data };
    return { ok: true, data: data?.data || data, raw: data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Service URL registry — same env defaults as runtime/genie
function getServiceUrl(service) {
  const env = {
    'genie-shopping-agent': process.env.GENIE_SHOPPING_URL || 'http://localhost:4728',
    'genie-calendar-service': process.env.GENIE_CALENDAR_URL || 'http://localhost:4709',
    'genie-money-os': process.env.GENIE_MONEY_URL || 'http://localhost:4724',
    'genie-wellness-os': process.env.GENIE_WELLNESS_URL || 'http://localhost:4723',
    'genie-relationship-os': process.env.GENIE_RELATIONSHIP_URL || 'http://localhost:4747',
    'genie-learning-os': process.env.GENIE_LEARNING_URL || 'http://localhost:4765',
    'genie-goal-os': process.env.GENIE_GOAL_URL || 'http://localhost:4763',
    'genie-universal-search': process.env.GENIE_SEARCH_URL || 'http://localhost:4713',
    'genie-serendipity-service': process.env.GENIE_SERENDIPITY_URL || 'http://localhost:4714',
    'genie-conversation': process.env.GENIE_RUNTIME_URL || 'http://localhost:7100',
    'memory-substrate': process.env.MEMORY_SUBSTRATE_URL || 'http://localhost:4791',
    'morning-briefing-v2': process.env.MORNING_BRIEFING_V2_URL || 'http://localhost:4794',
    'reflection-engine': process.env.REFLECTION_ENGINE_URL || 'http://localhost:4796',
    'proactive-engine': process.env.PROACTIVE_ENGINE_URL || 'http://localhost:4797',
    'intent-engine': process.env.INTENT_ENGINE_URL || 'http://localhost:4792',
  };
  return env[service] || null;
}

// ============================================================================
// PLANNER
// Asks the LLM to decompose the user's request into a sequence of tool calls.
// ============================================================================
async function planRequest({ question, userContext, availableCategories, conversationHistory = [] }) {
  const llm = createLLMClient({ provider: process.env.LLM_PROVIDER || 'anthropic' });

  const toolCatalog = toolsForPrompt({ categories: availableCategories });

  const planSchema = {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique step id like "step_1"' },
            tool: { type: 'string', description: 'Tool name from the catalog' },
            args: { type: 'object', description: 'Arguments for the tool' },
            dependsOn: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of steps that must complete first',
            },
            reasoning: { type: 'string', description: 'One sentence: why this step?' },
          },
          required: ['id', 'tool', 'reasoning'],
        },
      },
      reasoning: { type: 'string', description: 'Overall plan: why these steps in this order?' },
      expectedOutcome: { type: 'string', description: 'What the final answer should look like' },
    },
    required: ['steps', 'reasoning'],
  };

  const systemPrompt = `You are the planning layer for Genie, a personal AI assistant. Your job: given a user's request, decompose it into a sequence of tool calls.

Available tools:
${toolCatalog}

Rules:
1. Use ONLY tools from the catalog. Never invent a tool.
2. Each step must have a unique id, a tool, args, and reasoning.
3. Use dependsOn when a step needs results from a previous step.
4. Prefer parallel steps (no dependsOn) when the tools are independent.
5. Limit to 1-7 steps. If the request is too vague, ask for clarification via ask_genie_conversation.
6. If the request is a simple single-intent question, return ONE step.
7. Read-only tools (get_*) first, write tools (create_*, add_*, log_*, update_*) last.
8. Always end with a synthesis step if the user wants a coherent answer.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-4).map(m => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: userContext
        ? `User context: ${userContext}\n\nRequest: ${question}`
        : question,
    },
  ];

  const plan = await withStructuredOutput(llm, planSchema, { messages });

  // Validate the plan
  const validated = (plan.steps || []).map(step => {
    const tool = getTool(step.tool);
    return {
      id: step.id,
      tool: step.tool,
      toolExists: !!tool,
      args: step.args || {},
      dependsOn: step.dependsOn || [],
      reasoning: step.reasoning || '',
      costTier: tool?.costTier || 1,
      latencyTier: tool?.latencyTier || 1,
    };
  });

  return {
    steps: validated,
    reasoning: plan.reasoning || '',
    expectedOutcome: plan.expectedOutcome || '',
  };
}

// ============================================================================
// EXECUTOR
// Runs a plan in dependency order. Parallel where possible.
// ============================================================================
async function executePlan(plan, userId, options = {}) {
  const { maxSteps = 7, timeoutMs = 30000 } = options;
  const results = {};
  const errors = {};
  const executed = new Set();

  const ready = (step) => step.dependsOn.every(d => executed.has(d));
  const remaining = [...plan.steps];

  const start = Date.now();

  while (remaining.length > 0 && executed.size < maxSteps) {
    if (Date.now() - start > timeoutMs) {
      log.warn('Plan execution timeout', { executed: executed.size, remaining: remaining.length });
      break;
    }

    // Find all steps ready to run in parallel
    const batch = remaining.filter(ready);
    if (batch.length === 0) {
      // No steps ready but some remain — circular dependency or invalid plan
      log.warn('Plan has unresolvable dependencies', { remaining: remaining.map(s => s.id) });
      break;
    }

    // Run batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (step) => {
        const result = await executeTool(step.tool, step.args, userId);
        return { step, result };
      })
    );

    for (const { step, result } of batchResults) {
      executed.add(step.id);
      // Remove from remaining
      const idx = remaining.findIndex(s => s.id === step.id);
      if (idx >= 0) remaining.splice(idx, 1);
      // Store
      if (result.ok) {
        results[step.id] = { tool: step.tool, args: step.args, data: result.data, reasoning: step.reasoning };
      } else {
        errors[step.id] = { tool: step.tool, args: step.args, error: result.error, reasoning: step.reasoning };
      }
    }
  }

  return { results, errors, executedSteps: [...executed] };
}

// ============================================================================
// RE-PLANNER
// When a step fails, ask the LLM for a new plan given the partial results.
// ============================================================================
async function replan({ originalQuestion, failedPlan, results, errors }) {
  const llm = createLLMClient({ provider: process.env.LLM_PROVIDER || 'anthropic' });
  const toolCatalog = toolsForPrompt();

  const replanSchema = {
    type: 'object',
    properties: {
      shouldReplan: { type: 'boolean', description: 'False if the failure is unrecoverable; true if a new plan can succeed' },
      newSteps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tool: { type: 'string' },
            args: { type: 'object' },
            dependsOn: { type: 'array', items: { type: 'string' } },
            reasoning: { type: 'string' },
          },
          required: ['id', 'tool', 'reasoning'],
        },
      },
      reasoning: { type: 'string' },
    },
    required: ['shouldReplan', 'reasoning'],
  };

  const messages = [
    {
      role: 'system',
      content: `You are the re-planner. Some steps in a plan failed. Decide: should we try a different approach, or should we just synthesize what we have?

Available tools:
${toolCatalog}

If you generate new steps, use only tools from the catalog.`,
    },
    {
      role: 'user',
      content: `Original request: ${originalQuestion}

Successful results so far:
${JSON.stringify(results, null, 2).slice(0, 2000)}

Failed steps:
${JSON.stringify(errors, null, 2).slice(0, 1500)}

Decide: should we replan, or just synthesize the partial results?`,
    },
  ];

  return await withStructuredOutput(llm, replanSchema, { messages });
}

// ============================================================================
// SYNTHESIZER
// Turns a plan + results into a final natural-language answer.
// ============================================================================
async function synthesize({ question, plan, results, errors }) {
  // If there's only one step and no errors, just return its data
  if (plan.steps.length === 1 && Object.keys(errors).length === 0) {
    const onlyStep = plan.steps[0];
    const onlyResult = results[onlyStep.id];
    if (onlyResult?.data && typeof onlyResult.data === 'object') {
      return formatSingleToolResult(onlyStep.tool, onlyResult.data);
    }
  }

  const llm = createLLMClient({ provider: process.env.LLM_PROVIDER || 'anthropic' });

  const messages = [
    {
      role: 'system',
      content: `You are the synthesis layer for Genie. Given the user's question, the plan that was executed, and the results, produce a warm, concise final answer.

Rules:
- Be specific. Reference actual data from the results, not generic platitudes.
- Be honest. If something failed, mention it briefly.
- Use the user's tone (casual vs formal) based on their question.
- If asked to plan/do something, the answer should reflect what was actually done.
- Length: 2-5 sentences for simple requests, more for complex ones. Use bullet points when listing things.`,
    },
    {
      role: 'user',
      content: `Question: ${question}

Plan: ${plan.reasoning}

Results:
${JSON.stringify(results, null, 2).slice(0, 3000)}

${Object.keys(errors).length > 0 ? `\nNote: Some steps failed.\n${JSON.stringify(errors, null, 2).slice(0, 1000)}` : ''}`,
    },
  ];

  try {
    const result = await llm.complete({ messages, maxTokens: 800 });
    return result.text.trim();
  } catch (e) {
    // LLM unavailable — return a structured fallback
    return formatFallback(plan, results, errors);
  }
}

function formatSingleToolResult(toolName, data) {
  // Humanize common single-tool results
  if (toolName === 'get_today_calendar' || toolName === 'get_upcoming_events') {
    const events = data.events || data.items || [];
    if (events.length === 0) return 'You have nothing scheduled.';
    return events.slice(0, 5).map(e => `• ${e.title || e.summary || 'Untitled'} (${e.startTime || e.start || 'time TBD'})`).join('\n');
  }
  if (toolName === 'get_active_goals') {
    const goals = data.goals || data.items || [];
    if (goals.length === 0) return "You don't have any active goals right now.";
    return goals.map(g => `• ${g.title}${g.progress ? ` (${g.progress}%)` : ''}`).join('\n');
  }
  if (toolName === 'get_relationships_due') {
    const people = data.people || data.items || data.due || [];
    if (people.length === 0) return "You're up to date with everyone.";
    return people.map(p => `• ${p.name} (${p.reason || 'overdue'})`).join('\n');
  }
  if (toolName === 'get_budget_snapshot') {
    return `Budget snapshot: ${JSON.stringify(data).slice(0, 300)}`;
  }
  if (toolName === 'get_wellness_today') {
    return `Wellness today: ${JSON.stringify(data).slice(0, 300)}`;
  }
  if (toolName === 'get_user_context' || toolName === 'search_memories') {
    const facts = data.facts || data.items || data.memories || [];
    if (facts.length === 0) return "I don't have anything matching that in memory yet.";
    return facts.slice(0, 5).map(f => `• ${typeof f === 'string' ? f : f.content || JSON.stringify(f)}`).join('\n');
  }
  // Generic
  return JSON.stringify(data, null, 2).slice(0, 500);
}

function formatFallback(plan, results, errors) {
  const parts = [];
  for (const [id, result] of Object.entries(results)) {
    parts.push(`From ${result.tool}: ${formatSingleToolResult(result.tool, result.data)}`);
  }
  if (Object.keys(errors).length > 0) {
    parts.push(`\nNote: ${Object.keys(errors).length} step(s) couldn't complete.`);
  }
  return parts.join('\n\n') || 'I had trouble completing that request.';
}

// ============================================================================
// ROUTES
// ============================================================================
app.get('/health', (req, res) => send(res, 200, {
  status: 'healthy',
  service: 'reasoning-engine',
  port: PORT,
  version: '1.0.0',
  tools_available: TOOLS.length,
  categories: listCategories().length,
}));
app.get('/ready', (req, res) => send(res, 200, { ready: true }));

app.get('/api/reason/tools', (req, res) => send(res, 200, {
  total: TOOLS.length,
  categories: listCategories(),
  tools: listTools(),
}));

// === MAIN ENTRY: plan + execute + synthesize ===
app.post('/api/reason', requireAuth, async (req, res) => {
  const { question, userId, userContext = '', conversationHistory = [], maxSteps = 7 } = req.body;
  if (!question) return sendErr(res, 400, 'VALIDATION', 'question is required');
  if (!userId) return sendErr(res, 400, 'VALIDATION', 'userId is required');

  const requestId = `rsn_${crypto.randomBytes(6).toString('hex')}`;
  log.info(`reasoning started: ${requestId}`, { question: question.slice(0, 100) });

  const t0 = Date.now();

  // 1. PLAN
  let plan;
  try {
    plan = await planRequest({ question, userContext, conversationHistory });
  } catch (e) {
    log.error('planning failed', { error: e.message });
    return sendErr(res, 500, 'PLANNING_FAILED', e.message);
  }

  // 2. EXECUTE
  const { results, errors, executedSteps } = await executePlan(plan, userId, { maxSteps });

  // 3. REPLAN (if there were errors and we have room for more steps)
  let replannedPlan = null;
  if (Object.keys(errors).length > 0 && executedSteps.length < maxSteps * 2) {
    try {
      const replanResult = await replan({ originalQuestion: question, failedPlan: plan, results, errors });
      if (replanResult.shouldReplan && replanResult.newSteps?.length > 0) {
        const newPlan = {
          steps: replanResult.newSteps.map(s => ({ ...s, toolExists: !!getTool(s.tool), costTier: 1, latencyTier: 1 })),
          reasoning: replanResult.reasoning,
          expectedOutcome: '',
        };
        const replanExec = await executePlan(newPlan, userId, { maxSteps: 3 });
        // Merge in new results
        Object.assign(results, replanExec.results);
        Object.assign(errors, replanExec.errors);
        replannedPlan = newPlan;
      }
    } catch (e) {
      log.warn('replan failed, continuing with partial results', { error: e.message });
    }
  }

  // 4. SYNTHESIZE
  const finalPlan = replannedPlan || plan;
  const answer = await synthesize({ question, plan: finalPlan, results, errors });

  const elapsed = Date.now() - t0;
  log.info(`reasoning done: ${requestId}`, {
    elapsed_ms: elapsed,
    steps_planned: plan.steps.length,
    steps_executed: executedSteps.length,
    steps_succeeded: Object.keys(results).length,
    steps_failed: Object.keys(errors).length,
    replanned: !!replannedPlan,
  });

  // Stats
  stats.set(`${Date.now()}-${requestId}`, {
    requestId,
    userId,
    question: question.slice(0, 200),
    elapsed_ms: elapsed,
    steps_planned: plan.steps.length,
    steps_succeeded: Object.keys(results).length,
    steps_failed: Object.keys(errors).length,
    replanned: !!replannedPlan,
    timestamp: new Date().toISOString(),
  });

  send(res, 200, {
    requestId,
    question,
    answer,
    plan: {
      reasoning: plan.reasoning,
      steps: plan.steps.map(s => ({ id: s.id, tool: s.tool, reasoning: s.reasoning, succeeded: !!results[s.id] })),
      expectedOutcome: plan.expectedOutcome,
    },
    replanned: !!replannedPlan,
    results: Object.fromEntries(
      Object.entries(results).map(([k, v]) => [k, { tool: v.tool, data_summary: summarize(v.data) }])
    ),
    errors: Object.fromEntries(
      Object.entries(errors).map(([k, v]) => [k, { tool: v.tool, error: v.error }])
    ),
    elapsed_ms: elapsed,
  });
});

function summarize(data) {
  if (!data) return null;
  if (Array.isArray(data)) return `${data.length} items`;
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    return `{${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}}`;
  }
  return String(data).slice(0, 100);
}

// === DEBUG: plan only ===
app.post('/api/reason/plan', requireAuth, async (req, res) => {
  const { question, userContext = '', conversationHistory = [] } = req.body;
  if (!question) return sendErr(res, 400, 'VALIDATION', 'question is required');
  try {
    const plan = await planRequest({ question, userContext, conversationHistory });
    send(res, 200, { plan });
  } catch (e) {
    sendErr(res, 500, 'PLANNING_FAILED', e.message);
  }
});

// === DEBUG: execute pre-made plan ===
app.post('/api/reason/execute', requireAuth, async (req, res) => {
  const { plan, userId } = req.body;
  if (!plan?.steps) return sendErr(res, 400, 'VALIDATION', 'plan with steps is required');
  if (!userId) return sendErr(res, 400, 'VALIDATION', 'userId is required');
  const result = await executePlan(plan, userId);
  send(res, 200, result);
});

// === STATS ===
app.get('/api/reason/stats', requireAuth, (req, res) => {
  const all = [...stats.values()];
  const recent = all.slice(-100);
  send(res, 200, {
    total: all.length,
    avgElapsedMs: recent.length ? Math.round(recent.reduce((a, r) => a + r.elapsed_ms, 0) / recent.length) : 0,
    avgSteps: recent.length ? (recent.reduce((a, r) => a + r.steps_planned, 0) / recent.length).toFixed(1) : 0,
    successRate: recent.length ? (recent.filter(r => r.steps_failed === 0).length / recent.length * 100).toFixed(1) : 0,
    replanRate: recent.length ? (recent.filter(r => r.replanned).length / recent.length * 100).toFixed(1) : 0,
  });
});

requireEnv(['PORT'], { allowDev: true });

const server = app.listen(PORT, () => {
  log.info(`reasoning-engine listening on :${PORT}`);
  log.info(`tools registered: ${TOOLS.length} across ${listCategories().length} categories`);
});

installGracefulShutdown(server, 'reasoning-engine');

export default app;
