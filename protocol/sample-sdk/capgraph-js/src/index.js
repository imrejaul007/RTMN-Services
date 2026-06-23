/**
 * @rtmn/capgraph — Capability Graph client (v0.1.0)
 *
 * Reference: ../../specs/CAPABILITY-GRAPH.md
 *
 * Pure JS, zero dependencies. Use as a building block for a Capability
 * Graph adapter that talks to the real (or stub) registry. The 4 verbs
 * follow the spec exactly:
 *   - fetchAgent(agentId)            → get agent by id
 *   - searchCapabilities(query)     → fuzzy/semantic search
 *   - registerAgent(agent)          → publish/upsert an agent
 *   - reportTrustSignal(signal)     → submit a trust signal
 *
 * All HTTP via the injectable `fetchImpl` (default: global fetch).
 */

const DEFAULT_TIMEOUT_MS = 5000;

class CapgraphError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'CapgraphError';
    this.status = status;
    this.body = body;
  }
}

async function withTimeout(promise, ms) {
  let to;
  const timeout = new Promise((_, reject) => {
    to = setTimeout(() => reject(new CapgraphError(`request timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(to);
  }
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl   e.g. "https://graph.nexha.io"
 * @param {string} [opts.token]   bearer token (for the closed impl)
 * @param {typeof fetch} [opts.fetchImpl]  injectable fetch (for tests / Node < 18)
 * @param {number} [opts.timeoutMs]
 */
export function createClient(opts) {
  if (!opts?.baseUrl) throw new CapgraphError('baseUrl is required');

  const baseUrl = opts.baseUrl.replace(/\/$/, '');
  const token = opts.token;
  const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!fetchImpl) {
    throw new CapgraphError('no fetch implementation available; pass opts.fetchImpl');
  }

  async function call(method, path, body) {
    const url = `${baseUrl}${path}`;
    const headers = { 'Accept': 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const init = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);

    const res = await withTimeout(fetchImpl(url, init), timeoutMs);
    const text = await res.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      throw new CapgraphError(
        `capgraph ${method} ${path} → ${res.status}`,
        { status: res.status, body: parsed },
      );
    }
    return parsed;
  }

  return {
    baseUrl,
    /**
     * Fetch one agent by id.
     * @param {string} agentId
     */
    async fetchAgent(agentId) {
      if (!agentId) throw new CapgraphError('agentId is required');
      return call('GET', `/v1/agents/${encodeURIComponent(agentId)}`);
    },

    /**
     * Search for capabilities matching the query.
     * @param {object} q
     * @param {string} q.q              free-text query
     * @param {string[]} [q.tags]       capability tags (AND)
     * @param {number} [q.minTrust]     0..100
     * @param {string} [q.industry]     industry code
     * @param {number} [q.limit]        default 20
     * @param {string} [q.cursor]       pagination cursor
     */
    async searchCapabilities(q = {}) {
      if (typeof q !== 'object') throw new CapgraphError('q must be an object');
      const qs = new URLSearchParams();
      if (q.q) qs.set('q', q.q);
      if (Array.isArray(q.tags)) qs.set('tags', q.tags.join(','));
      if (q.minTrust !== undefined) qs.set('minTrust', String(q.minTrust));
      if (q.industry) qs.set('industry', q.industry);
      if (q.limit !== undefined) qs.set('limit', String(q.limit));
      if (q.cursor) qs.set('cursor', q.cursor);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return call('GET', `/v1/capabilities/search${suffix}`);
    },

    /**
     * Register or upsert an agent.
     * @param {object} agent
     * @param {string} agent.id
     * @param {string} agent.name
     * @param {string[]} agent.capabilities
     * @param {string} [agent.industry]
     * @param {string} [agent.endpoint]
     */
    async registerAgent(agent) {
      if (!agent?.id) throw new CapgraphError('agent.id is required');
      if (!agent?.name) throw new CapgraphError('agent.name is required');
      if (!Array.isArray(agent.capabilities)) {
        throw new CapgraphError('agent.capabilities must be an array');
      }
      return call('POST', '/v1/agents', agent);
    },

    /**
     * Report a trust signal for an agent.
     * @param {object} signal
     * @param {string} signal.agentId
     * @param {string} signal.kind      'delivery' | 'quality' | 'dispute' | 'compliance'
     * @param {number} signal.score     0..100
     * @param {string} [signal.evidenceRef]
     * @param {string} [signal.reporterDid]
     */
    async reportTrustSignal(signal) {
      if (!signal?.agentId) throw new CapgraphError('signal.agentId is required');
      if (!signal?.kind) throw new CapgraphError('signal.kind is required');
      if (typeof signal.score !== 'number' || signal.score < 0 || signal.score > 100) {
        throw new CapgraphError('signal.score must be a number 0..100');
      }
      return call('POST', '/v1/trust-signals', signal);
    },
  };
}

export { CapgraphError };
