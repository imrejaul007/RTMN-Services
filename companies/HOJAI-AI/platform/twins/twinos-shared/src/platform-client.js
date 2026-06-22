/**
 * Platform client for HOJAI AI services.
 *
 * Thin wrappers around the 6 core platform services that TwinOS twins
 * integrate with. Each method is non-blocking (fire-and-forget) by
 * default — twin write paths should not block on platform-service calls.
 *
 * Services wrapped:
 *   - CorpID (4702)             — identity, auth, user profiles
 *   - MemoryOS (4703)            — memories, knowledge graph
 *   - TwinMemoryBridge (4704)    — twin↔memory partition bindings
 *   - GoalOS (4242)              — goals, objectives, KPIs
 *   - SkillOS (4743)             — skills, capabilities, marketplace
 *   - PolicyOS (4254)            — policies, RBAC, audit
 *   - AIIntelligence (4881)      — AI inference (sentiment, intent, etc.)
 *
 * Usage:
 *   import { platform } from '@rtmn/twinos-shared/src/platform-client.js';
 *   await platform.corpid.getUser(userId);
 *   platform.memory.recordEvent('order.placed', { orderId, amount });  // fire-and-forget
 *   platform.goals.assignGoal(goalId, twinId);
 */

const DEFAULTS = {
  corpid:    process.env.CORPID_URL    || 'http://localhost:4702',
  memory:    process.env.MEMORY_URL    || 'http://localhost:4703',
  bridge:    process.env.BRIDGE_URL    || 'http://localhost:4704',
  goals:     process.env.GOALS_URL     || 'http://localhost:4242',
  skills:    process.env.SKILLS_URL    || 'http://localhost:4743',
  policy:    process.env.POLICY_URL    || 'http://localhost:4254',
  intel:     process.env.INTEL_URL     || 'http://localhost:4881',
};

const DEFAULT_TIMEOUT_MS = parseInt(process.env.PLATFORM_TIMEOUT_MS || '3000', 10);

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

// Domain calls to platform services (MemoryOS, bridge, policy, etc.)
// need an auth token. We use the same base64-JSON format that
// @rtmn/shared/auth's createAuthMiddleware accepts (see event-publisher.js).
const DEFAULT_TOKEN = process.env.PLATFORM_TOKEN || null;
function getServiceToken() {
  if (DEFAULT_TOKEN) return DEFAULT_TOKEN;
  try {
    const payload = {
      sub: process.env.SERVICE_NAME || 'twin-service',
      role: 'service',
      source: 'platform-client',
      iat: Date.now(),
      exp: Date.now() + 5 * 60 * 1000,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  } catch (err) {
    return null;
  }
}

async function call(url, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (options.token || DEFAULT_TOKEN) {
    headers['Authorization'] = `Bearer ${options.token || DEFAULT_TOKEN}`;
  } else {
    // Auto-mint a service-level base64-JSON token (matches the
    // event-publisher pattern). Required because MemoryOS, twin-memory-bridge,
    // and event-bus all require auth on write paths.
    const serviceToken = getServiceToken();
    if (serviceToken) {
      headers['Authorization'] = `Bearer ${serviceToken}`;
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: errText.slice(0, 200) };
    }
    const body = await res.json().catch(() => ({}));
    return { ok: true, status: res.status, data: body };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, error: 'timeout' };
    }
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

/** Fire-and-forget: logs but never throws. */
function callAsync(url, options) {
  call(url, options).catch((err) => {
    console.warn(`[platform-client] uncaught: ${url} message=${err.message}`);
  });
}

// ---------------------------------------------------------------------------
// CorpID (4702) — identity, users, businesses
// ---------------------------------------------------------------------------

export const corpid = {
  baseUrl: DEFAULTS.corpid,

  async getUser(userId, opts = {}) {
    return call(`${this.baseUrl}/api/users/${userId}`, { method: 'GET', ...opts });
  },

  async getBusiness(businessId, opts = {}) {
    return call(`${this.baseUrl}/api/businesses/${businessId}`, { method: 'GET', ...opts });
  },

  async listUsers(query = {}, opts = {}) {
    const qs = new URLSearchParams(query).toString();
    return call(`${this.baseUrl}/api/users${qs ? '?' + qs : ''}`, { method: 'GET', ...opts });
  },

  /** Fire-and-forget: record that a user took an action. */
  recordActivity(userId, action, metadata = {}, opts = {}) {
    callAsync(`${this.baseUrl}/api/users/${userId}/activity`, {
      method: 'POST',
      body: JSON.stringify({ action, metadata, timestamp: new Date().toISOString() }),
      ...opts,
    });
  },
};

// ---------------------------------------------------------------------------
// MemoryOS (4703) — memories, knowledge graph
// ---------------------------------------------------------------------------

export const memory = {
  baseUrl: DEFAULTS.memory,

  async recordMemory(record, opts = {}) {
    return call(`${this.baseUrl}/api/memories`, {
      method: 'POST',
      body: JSON.stringify(record),
      ...opts,
    });
  },

  async queryMemories(query, opts = {}) {
    return call(`${this.baseUrl}/api/memories/query`, {
      method: 'POST',
      body: JSON.stringify(query),
      ...opts,
    });
  },

  async getMemory(memoryId, opts = {}) {
    return call(`${this.baseUrl}/api/memories/${memoryId}`, { method: 'GET', ...opts });
  },

  /** Fire-and-forget: record a domain event as a memory. */
  recordEvent(eventType, payload, twinId = null, opts = {}) {
    // MemoryOS restricts `type` to a fixed enum (identity, preference,
    // knowledge, experience, relationship, conversation, decision,
    // event, workflow, goal, financial, shopping, health, learning, ai).
    // We always use 'event' for domain-event memories and stash the
    // specific eventType in tags so it can still be searched.
    callAsync(`${this.baseUrl}/api/memories`, {
      method: 'POST',
      body: JSON.stringify({
        kind: 'episodic',
        type: 'event',
        twinId,
        content: JSON.stringify(payload),
        tags: [eventType.split('.')[0], eventType],
        timestamp: new Date().toISOString(),
        metadata: { eventType, source: 'platform-client' },
      }),
      ...opts,
    });
  },
};

// ---------------------------------------------------------------------------
// TwinMemoryBridge (4704) — twin↔memory partition bindings
// ---------------------------------------------------------------------------

export const bridge = {
  baseUrl: DEFAULTS.bridge,

  async bind(twinId, partitionId, kind = 'episodic', opts = {}) {
    return call(`${this.baseUrl}/api/twins/${twinId}/bind`, {
      method: 'POST',
      body: JSON.stringify({ partitionId, kind }),
      ...opts,
    });
  },

  async getBinding(twinId, kind = null, opts = {}) {
    const path = kind ? `/api/twins/${twinId}/binding/${kind}` : `/api/twins/${twinId}/binding`;
    return call(`${this.baseUrl}${path}`, { method: 'GET', ...opts });
  },

  async unbind(twinId, kind = null, opts = {}) {
    const path = kind ? `/api/twins/${twinId}/bind/${kind}` : `/api/twins/${twinId}/bind`;
    return call(`${this.baseUrl}${path}`, { method: 'DELETE', ...opts });
  },

  async listBindings(twinId = null, opts = {}) {
    const url = twinId
      ? `${this.baseUrl}/api/twins/${twinId}/binding`
      : `${this.baseUrl}/api/bindings`;
    return call(url, { method: 'GET', ...opts });
  },

  /** Fire-and-forget: bind a newly-created twin to a default memory partition. */
  autoBind(twinId, kind = 'episodic', partitionId = null, opts = {}) {
    callAsync(`${this.baseUrl}/api/twins/${twinId}/bind`, {
      method: 'POST',
      body: JSON.stringify({ partitionId, kind }),
      ...opts,
    });
  },
};

// ---------------------------------------------------------------------------
// GoalOS (4242) — goals, objectives, KPIs
// ---------------------------------------------------------------------------

export const goals = {
  baseUrl: DEFAULTS.goals,

  async listGoals(query = {}, opts = {}) {
    const qs = new URLSearchParams(query).toString();
    return call(`${this.baseUrl}/api/goals${qs ? '?' + qs : ''}`, { method: 'GET', ...opts });
  },

  async getGoal(goalId, opts = {}) {
    return call(`${this.baseUrl}/api/goals/${goalId}`, { method: 'GET', ...opts });
  },

  async createGoal(goal, opts = {}) {
    return call(`${this.baseUrl}/api/goals`, {
      method: 'POST',
      body: JSON.stringify(goal),
      ...opts,
    });
  },

  async updateGoal(goalId, updates, opts = {}) {
    return call(`${this.baseUrl}/api/goals/${goalId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      ...opts,
    });
  },

  /** Fire-and-forget: track progress on a goal. */
  recordProgress(goalId, progress, metadata = {}, opts = {}) {
    callAsync(`${this.baseUrl}/api/goals/${goalId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ progress, metadata, timestamp: new Date().toISOString() }),
      ...opts,
    });
  },
};

// ---------------------------------------------------------------------------
// SkillOS (4743) — skills, capabilities, marketplace
// ---------------------------------------------------------------------------

export const skills = {
  baseUrl: DEFAULTS.skills,

  async listSkills(query = {}, opts = {}) {
    const qs = new URLSearchParams(query).toString();
    return call(`${this.baseUrl}/api/skills${qs ? '?' + qs : ''}`, { method: 'GET', ...opts });
  },

  async getSkill(skillId, opts = {}) {
    return call(`${this.baseUrl}/api/skills/${skillId}`, { method: 'GET', ...opts });
  },

  async executeSkill(skillId, input, opts = {}) {
    return call(`${this.baseUrl}/api/skills/${skillId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ input }),
      ...opts,
    });
  },

  async getMarketplace(query = {}, opts = {}) {
    const qs = new URLSearchParams(query).toString();
    return call(`${this.baseUrl}/api/marketplace${qs ? '?' + qs : ''}`, { method: 'GET', ...opts });
  },
};

// ---------------------------------------------------------------------------
// PolicyOS (4254) — policies, RBAC, audit
// ---------------------------------------------------------------------------

export const policy = {
  baseUrl: DEFAULTS.policy,

  async listPolicies(query = {}, opts = {}) {
    const qs = new URLSearchParams(query).toString();
    return call(`${this.baseUrl}/api/policies${qs ? '?' + qs : ''}`, { method: 'GET', ...opts });
  },

  async getPolicy(policyId, opts = {}) {
    return call(`${this.baseUrl}/api/policies/${policyId}`, { method: 'GET', ...opts });
  },

  async evaluatePolicy(policyId, context, opts = {}) {
    return call(`${this.baseUrl}/api/policies/${policyId}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({ context }),
      ...opts,
    });
  },

  async checkPermission(userId, action, resource, opts = {}) {
    return call(`${this.baseUrl}/api/permissions/check`, {
      method: 'POST',
      body: JSON.stringify({ userId, action, resource }),
      ...opts,
    });
  },

  /** Fire-and-forget: log an audit event. */
  audit(action, resource, metadata = {}, opts = {}) {
    callAsync(`${this.baseUrl}/api/audit`, {
      method: 'POST',
      body: JSON.stringify({ action, resource, metadata, timestamp: new Date().toISOString() }),
      ...opts,
    });
  },
};

// ---------------------------------------------------------------------------
// AI Intelligence (4881) — sentiment, intent, prediction
// ---------------------------------------------------------------------------

export const intel = {
  baseUrl: DEFAULTS.intel,

  async analyzeSentiment(text, opts = {}) {
    return call(`${this.baseUrl}/api/analyze/sentiment`, {
      method: 'POST',
      body: JSON.stringify({ text }),
      ...opts,
    });
  },

  async detectIntent(text, opts = {}) {
    return call(`${this.baseUrl}/api/analyze/intent`, {
      method: 'POST',
      body: JSON.stringify({ text }),
      ...opts,
    });
  },

  async retrieve(query, opts = {}) {
    return call(`${this.baseUrl}/api/retrieve`, {
      method: 'POST',
      body: JSON.stringify({ query }),
      ...opts,
    });
  },

  async predict(model, input, opts = {}) {
    return call(`${this.baseUrl}/api/predict`, {
      method: 'POST',
      body: JSON.stringify({ model, input }),
      ...opts,
    });
  },
};

// ---------------------------------------------------------------------------
// Aggregate export
// ---------------------------------------------------------------------------

export const platform = {
  corpid,
  memory,
  bridge,
  goals,
  skills,
  policy,
  intel,
};

export default platform;
