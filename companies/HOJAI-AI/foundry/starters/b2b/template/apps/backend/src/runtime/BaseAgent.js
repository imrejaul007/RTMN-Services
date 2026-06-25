/**
 * BaseAgent — vanilla-JS agent runtime for HOJAI Foundry starters.
 *
 * Mirrors the role of `@hojai/sutar`'s `AgentClient` in plain JS so that
 * starter apps can use the same shape without bundling TypeScript or
 * adding runtime build steps. Two execution modes:
 *
 *   1. **local mode** (default) — runs the synchronous `strategy`
 *      function passed to the constructor. This is what the
 *      `npx hojai create` starter ships with: a deterministic stub
 *      function per agent so the app boots end-to-end with zero
 *      infrastructure.
 *
 *   2. **remote mode** — when `HOJAI_SUTAR_URL` (or `baseUrl` in
 *      opts) is set, the BaseAgent forwards `run()` calls to the
 *      SUTAR merchant-agents service via `fetch()` and returns its
 *      task response. `HOJAI_API_KEY` is sent as a Bearer token.
 *
 * Usage:
 *
 *   import { BaseAgent } from '../runtime/BaseAgent.js';
 *
 *   const ceo = new BaseAgent({
 *     name: 'CEO',
 *     description: 'Orchestrator. Routes work to other agents.',
 *     strategy: ({ goal }) => ({ decision: goal ? `route:${goal}` : 'route:sales' })
 *   });
 *
 *   const result = await ceo.run({ goal: 'rfq' });
 *   // → { agent: 'CEO', output: { decision: 'route:rfq' }, success: true, latencyMs: 0.4, source: 'local' }
 *
 * To go live:
 *
 *   process.env.HOJAI_SUTAR_URL = 'http://localhost:4851';   // SUTAR merchant-agents port
 *   process.env.HOJAI_API_KEY   = '<your-corp-id-jwt>';
 *
 *   const ceo = new BaseAgent({
 *     name: 'CEO',
 *     description: 'Orchestrator',
 *     type: 'merchant',
 *     businessId: 'biz-1',
 *     businessName: 'My Business',
 *     industry: 'marketplace',
 *     strategy: ({ goal }) => ({ decision: `route:${goal}` })
 *   });
 *
 *   const result = await ceo.run({ goal: 'rfq' });
 *   // → { agent: 'CEO', output: { taskId, status, ... }, success: true, source: 'remote' }
 *
 * Designed to be **tree-shakeable and side-effect-free** so it can be
 * dropped into any starter without bundler config.
 */

const DEFAULT_TIMEOUT_MS = 8000;

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class BaseAgent {
  /**
   * @param {object} opts
   * @param {string} opts.name                    Agent display name (e.g. 'Sales').
   * @param {string} [opts.description]
   * @param {string} [opts.type='merchant']       SUTAR agent type — matches `AgentType` in @hojai/sutar.
   * @param {string} [opts.businessId]            Required when HOJAI_SUTAR_URL is set.
   * @param {string} [opts.businessName]
   * @param {string} [opts.industry]
   * @param {string[]} [opts.capabilities=[]]
   * @param {Function} [opts.strategy]            Local fallback. Receives the input body, returns the output.
   * @param {string} [opts.baseUrl]               Override HOJAI_SUTAR_URL.
   * @param {string} [opts.apiKey]                Override HOJAI_API_KEY.
   * @param {number} [opts.timeoutMs=8000]
   */
  constructor(opts) {
    if (!opts || typeof opts !== 'object') {
      throw new Error('BaseAgent: opts object is required');
    }
    if (!opts.name || typeof opts.name !== 'string') {
      throw new Error('BaseAgent: opts.name is required');
    }

    this.name = opts.name;
    this.description = opts.description || '';
    this.type = opts.type || 'merchant';
    this.businessId = opts.businessId;
    this.businessName = opts.businessName;
    this.industry = opts.industry;
    this.capabilities = Array.isArray(opts.capabilities) ? opts.capabilities : [];
    this.strategy = typeof opts.strategy === 'function' ? opts.strategy : null;
    this.baseUrl = opts.baseUrl || process.env.HOJAI_SUTAR_URL || '';
    this.apiKey = opts.apiKey || process.env.HOJAI_API_KEY || '';
    this.timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
    this.id = null;
    this.stats = { totalTasks: 0, successCount: 0, failureCount: 0, totalLatencyMs: 0 };
  }

  /** True if this agent will dispatch to a remote SUTAR service. */
  isRemote() {
    return Boolean(this.baseUrl && this.businessId);
  }

  /**
   * Run the agent.
   * @param {object} body                         Free-form input. Forwarded to either the local strategy or the remote task API.
   * @param {object} [opts]
   * @param {string} [opts.taskType='invoke']     Remote task type (e.g. 'negotiate-rfq').
   * @returns {Promise<{agent: string, output: any, success: boolean, latencyMs: number, source: 'local'|'remote'}>}
   */
  async run(body, opts) {
    const started = nowMs();
    const input = body && typeof body === 'object' ? body : {};

    if (this.isRemote()) {
      try {
        const output = await this.runRemote(input, opts);
        this.record(true, nowMs() - started);
        return { agent: this.name, output, success: true, latencyMs: Math.round(nowMs() - started), source: 'remote' };
      } catch (err) {
        this.record(false, nowMs() - started);
        if (this.strategy) {
          // Graceful degradation: remote failed → fall back to local strategy
          const output = this.strategy(input);
          return { agent: this.name, output, success: true, latencyMs: Math.round(nowMs() - started), source: 'local', fallbackReason: err.message };
        }
        return { agent: this.name, output: { error: err.message }, success: false, latencyMs: Math.round(nowMs() - started), source: 'remote' };
      }
    }

    if (!this.strategy) {
      throw new Error(`BaseAgent(${this.name}): no strategy function and HOJAI_SUTAR_URL not set`);
    }
    const output = this.strategy(input);
    this.record(true, nowMs() - started);
    return { agent: this.name, output, success: true, latencyMs: Math.round(nowMs() - started), source: 'local' };
  }

  record(success, latencyMs) {
    this.stats.totalTasks += 1;
    this.stats.totalLatencyMs += latencyMs;
    if (success) this.stats.successCount += 1; else this.stats.failureCount += 1;
  }

  /** Lazily register this agent with the SUTAR merchant-agents service. */
  async ensureRegistered() {
    if (!this.isRemote()) return null;
    if (this.id) return this.id;
    const url = this.baseUrl.replace(/\/$/, '') + '/api/merchants';
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        type: this.type,
        businessId: this.businessId,
        businessName: this.businessName || this.businessId,
        industry: this.industry || 'unknown',
        capabilities: this.capabilities
      })
    }, this.timeoutMs);
    if (!res.ok) throw new Error(`register failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    this.id = body.id || body.agentId || null;
    return this.id;
  }

  async runRemote(input, opts = {}) {
    const agentId = await this.ensureRegistered();
    const taskType = opts.taskType || 'invoke';
    const url = this.baseUrl.replace(/\/$/, '') + `/api/merchants/${encodeURIComponent(agentId)}/tasks`;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ type: taskType, input })
    }, this.timeoutMs);
    if (!res.ok) throw new Error(`task failed: ${res.status} ${await res.text()}`);
    return await res.json();
  }

  headers() {
    const h = { 'content-type': 'application/json', 'accept': 'application/json' };
    if (this.apiKey) h['authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  describe() {
    return {
      name: this.name,
      description: this.description,
      type: this.type,
      mode: this.isRemote() ? 'remote' : 'local',
      capabilities: this.capabilities,
      stats: { ...this.stats }
    };
  }
}

/**
 * Registry — convenience helper for the common pattern in starter apps.
 *
 *   const registry = createAgentRegistry();
 *   registry.register(new BaseAgent({ name: 'CEO', strategy: CEORun }));
 *   ...
 *   const result = await registry.run('CEO', { goal: 'rfq' });
 */
export function createAgentRegistry() {
  const agents = new Map();

  return {
    register(agent) {
      if (!(agent instanceof BaseAgent)) {
        throw new Error('registry.register: expected a BaseAgent instance');
      }
      agents.set(agent.name, agent);
      return this;
    },
    list() {
      return Array.from(agents.values()).map(a => a.describe());
    },
    get(name) {
      return agents.get(name) || null;
    },
    async run(name, body, opts) {
      const agent = agents.get(name);
      if (!agent) throw new Error(`unknown agent: ${name}`);
      return agent.run(body, opts);
    }
  };
}