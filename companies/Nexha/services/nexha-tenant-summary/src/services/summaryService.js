/**
 * summaryService — fan-out aggregator for tenant summary (ADR-0011 Phase 13).
 *
 * Talks to 8 upstream services in parallel via the Hub and merges the
 * results into a single response. No state of its own (read-only).
 *
 * The 8 services it fans out to are the 8 ADR-0010 services:
 *   1. nexha-business-directory       (4360)  → directory entries
 *   2. nexha-acp-messaging            (4340)  → message threads
 *   3. nexha-mission-planner          (4362)  → missions
 *   4. nexha-partner-graph            (4363)  → partner relationships
 *   5. nexha-commerce-runtime         (4364)  → orders / cart / payments
 *   6. sutar-tenant-instances         (4141)  → SUTAR instances
 *   7. industry-tenant-instances      (4365)  → industry OS instances
 *   8. nexha-provisioning-engine      (4385)  → provisioning plans
 *
 * Plus, optionally, nexha-hooks-sdk (4386) → webhook subscriptions count.
 *
 * Each upstream call has a short timeout (3s). Failures are isolated —
 * one slow service does NOT block the rest. The result includes an
 * `errors` map so the caller knows what was missed.
 */

const DEFAULT_HUB_URL = process.env.RTMN_HUB_URL || 'http://localhost:4399';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.UPSTREAM_TIMEOUT_MS || '3000', 10);

// Each fan-out target describes how to call it via the Hub.
//   service   — the upstream service key in the Hub
//   path      — the path template (with :tenantId placeholder)
//   method    — HTTP method
//   transform — optional function to reshape the response into the summary shape
const FANOUT_TARGETS = [
  {
    key: 'directory',
    label: 'Business Directory entries',
    service: 'nexha-business-directory',
    path: '/api/nexha/nexha-business-directory/api/v1/companies?tenantId=:tenantId&limit=10',
    method: 'GET',
    transform: (data) => ({
      total: data?.total ?? (data?.companies?.length ?? 0),
      companies: (data?.companies || []).slice(0, 10).map((c) => ({
        companyId: c.companyId || c._id,
        name: c.name,
        industry: c.industry,
        trustScore: c.trustScore,
      })),
    }),
  },
  {
    key: 'messaging',
    label: 'ACP message threads',
    service: 'nexha-acp-messaging',
    path: '/api/nexha/nexha-acp-messaging/api/threads?tenantId=:tenantId&limit=10',
    method: 'GET',
    transform: (data) => ({
      total: data?.total ?? (data?.threads?.length ?? 0),
      threads: (data?.threads || []).slice(0, 10).map((t) => ({
        threadId: t.threadId || t._id,
        subject: t.subject,
        status: t.status,
        lastMessageAt: t.lastMessageAt,
      })),
    }),
  },
  {
    key: 'missions',
    label: 'Missions',
    service: 'nexha-mission-planner',
    path: '/api/nexha/nexha-mission-planner/api/missions?tenantId=:tenantId&limit=10',
    method: 'GET',
    transform: (data) => ({
      total: data?.total ?? (data?.missions?.length ?? 0),
      missions: (data?.missions || []).slice(0, 10).map((m) => ({
        missionId: m.missionId || m._id,
        name: m.name,
        status: m.status,
        progress: m.progress,
      })),
    }),
  },
  {
    key: 'partners',
    label: 'Partner relationships',
    service: 'nexha-partner-graph',
    path: '/api/nexha/nexha-partner-graph/api/partners?tenantId=:tenantId&limit=10',
    method: 'GET',
    transform: (data) => ({
      total: data?.total ?? (data?.partners?.length ?? 0),
      partners: (data?.partners || []).slice(0, 10).map((p) => ({
        partnerId: p.partnerId || p._id,
        name: p.name,
        relationship: p.relationship,
        trustLevel: p.trustLevel,
      })),
    }),
  },
  {
    key: 'commerce',
    label: 'Commerce activity',
    service: 'nexha-commerce-runtime',
    path: '/api/nexha/nexha-commerce-runtime/api/orders?tenantId=:tenantId&limit=10',
    method: 'GET',
    transform: (data) => ({
      total: data?.total ?? (data?.orders?.length ?? 0),
      orders: (data?.orders || []).slice(0, 10).map((o) => ({
        orderId: o.orderId || o._id,
        status: o.status,
        totalCents: o.totalCents,
        createdAt: o.createdAt,
      })),
    }),
  },
  {
    key: 'sutarInstances',
    label: 'SUTAR instances',
    service: 'sutar-tenant-instances',
    path: '/api/sutar/sutar-tenant-instances/api/instances?tenantId=:tenantId&limit=10',
    method: 'GET',
    transform: (data) => ({
      total: data?.total ?? (data?.instances?.length ?? 0),
      instances: (data?.instances || []).slice(0, 10).map((i) => ({
        instanceId: i.instanceId || i._id,
        status: i.status,
        isolationLevel: i.isolationLevel,
        region: i.region,
      })),
    }),
  },
  {
    key: 'industryInstances',
    label: 'Industry OS instances',
    service: 'industry-tenant-instances',
    path: '/api/nexha/industry-tenant-instances/api/instances?tenantId=:tenantId&limit=10',
    method: 'GET',
    transform: (data) => ({
      total: data?.total ?? (data?.instances?.length ?? 0),
      instances: (data?.instances || []).slice(0, 10).map((i) => ({
        instanceId: i.instanceId || i._id,
        industry: i.industry,
        status: i.status,
        isolationLevel: i.isolationLevel,
      })),
    }),
  },
  {
    key: 'provisioningPlans',
    label: 'Provisioning plans',
    service: 'nexha-provisioning-engine',
    path: '/api/nexha/nexha-provisioning-engine/api/plans?tenantId=:tenantId&limit=10',
    method: 'GET',
    transform: (data) => ({
      total: data?.total ?? (data?.plans?.length ?? 0),
      plans: (data?.plans || []).slice(0, 10).map((p) => ({
        planId: p.planId || p._id,
        targetKind: p.targetKind,
        status: p.status,
        createdAt: p.createdAt,
      })),
    }),
  },
  {
    key: 'webhooks',
    label: 'Webhook subscriptions',
    service: 'nexha-hooks-sdk',
    path: '/api/nexha/nexha-hooks-sdk/api/subscriptions?tenantId=:tenantId&limit=10',
    method: 'GET',
    transform: (data) => ({
      total: data?.total ?? (data?.subscriptions?.length ?? 0),
      subscriptions: (data?.subscriptions || []).slice(0, 10).map((s) => ({
        subscriptionId: s.subscriptionId || s._id,
        targetUrl: s.targetUrl,
        status: s.status,
        eventTypes: s.eventTypes,
      })),
    }),
  },
];

/**
 * Replace :tenantId in a path template.
 */
function fillPath(template, tenantId) {
  return template.replaceAll(':tenantId', encodeURIComponent(tenantId));
}

/**
 * Fetch with timeout (uses AbortController). Returns parsed JSON on
 * success, throws on failure.
 */
async function fetchJson(url, { method = 'GET', headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method, headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Core: build the tenant summary by fanning out to all configured
 * upstream services in parallel.
 *
 * @param {object} opts
 * @param {string} opts.tenantId    — required
 * @param {object} [opts.hubUrl]    — override hub URL (defaults to env or localhost:4399)
 * @param {object} [opts.headers]   — extra headers (e.g. Authorization, x-internal-token)
 * @param {number} [opts.timeoutMs] — per-call timeout in ms
 * @param {object} [opts.fetcher]   — injectable fetch (for tests). Defaults to global fetch.
 */
async function buildSummary({ tenantId, hubUrl = DEFAULT_HUB_URL, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, fetcher } = {}) {
  if (!tenantId) {
    throw Object.assign(new Error('tenantId required'), { statusCode: 400, code: 'BAD_REQUEST' });
  }

  const fetchImpl = fetcher || ((url, init) => fetchJson(url, { ...init, timeoutMs }));

  // Run all fan-outs in parallel; isolate failures.
  const results = await Promise.allSettled(
    FANOUT_TARGETS.map(async (target) => {
      const url = `${hubUrl}${fillPath(target.path, tenantId)}`;
      try {
        const data = await fetchImpl(url, { method: target.method, headers });
        return { key: target.key, label: target.label, ok: true, data: target.transform(data) };
      } catch (err) {
        return {
          key: target.key,
          label: target.label,
          ok: false,
          error: { message: err.message, code: err.name === 'AbortError' ? 'TIMEOUT' : 'UPSTREAM_ERROR' },
        };
      }
    })
  );

  // Shape into summary object.
  const sections = {};
  const errors = {};
  let okCount = 0;
  let errorCount = 0;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const { key, ok, data, error, label } = r.value;
      sections[key] = { label, ...(ok ? { data } : { error }) };
      if (ok) okCount++;
      else { errorCount++; errors[key] = error; }
    } else {
      // Should not happen — we caught inside the map — but be defensive.
      errorCount++;
    }
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    hubUrl,
    summary: {
      totalSources: FANOUT_TARGETS.length,
      okCount,
      errorCount,
      health: errorCount === 0 ? 'healthy' : okCount === 0 ? 'degraded' : 'partial',
    },
    sections,
    errors: errorCount > 0 ? errors : undefined,
  };
}

/**
 * Build a lightweight health summary by checking /health on each
 * upstream service. Useful for the operator dashboard.
 */
async function checkUpstreams({ hubUrl = DEFAULT_HUB_URL, timeoutMs = 2000, fetcher } = {}) {
  const fetchImpl = fetcher || ((url, init) => fetchJson(url, { ...init, timeoutMs }));

  const checks = await Promise.allSettled(
    FANOUT_TARGETS.map(async (target) => {
      try {
        await fetchImpl(`${hubUrl}/api/services/${target.service}/health`, { method: 'GET' });
        return { key: target.key, label: target.label, ok: true };
      } catch (err) {
        return { key: target.key, label: target.label, ok: false, error: err.message };
      }
    })
  );

  const upstreams = {};
  for (const r of checks) {
    if (r.status === 'fulfilled') {
      const { key, ...rest } = r.value;
      upstreams[key] = rest;
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    upstreams,
    summary: {
      total: FANOUT_TARGETS.length,
      up: Object.values(upstreams).filter((u) => u.ok).length,
      down: Object.values(upstreams).filter((u) => !u.ok).length,
    },
  };
}

export {
  buildSummary,
  checkUpstreams,
  FANOUT_TARGETS,
  fillPath,
  fetchJson,
};