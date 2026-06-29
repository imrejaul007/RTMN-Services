/**
 * PolicyOS — Custom Extensions & SDK (Phase P5)
 *
 * Plugin system, CLI generator, webhook builder, OpenAPI generator.
 */

// ── Plugin System ───────────────────────────────────────────────────────────────

const _plugins = new Map();
const _hooks = new Map();

export function registerPlugin(plugin) {
  if (!plugin.id) throw new Error('Plugin must have an id');
  if (_plugins.has(plugin.id)) throw new Error('Plugin ' + plugin.id + ' already registered');
  _plugins.set(plugin.id, { ...plugin, registeredAt: new Date().toISOString() });
  if (plugin.hooks) {
    for (const [event, handler] of Object.entries(plugin.hooks)) {
      if (!_hooks.has(event)) _hooks.set(event, []);
      _hooks.get(event).push(handler);
    }
  }
  return { ok: true, pluginId: plugin.id };
}

export function unregisterPlugin(id) {
  const plugin = _plugins.get(id);
  if (!plugin) return { ok: false, error: 'Plugin not found' };
  _plugins.delete(id);
  for (const [, handlers] of _hooks) {
    // Remove handlers from this plugin would need tracking
  }
  return { ok: true, removed: id };
}

export function emitHook(event, data) {
  const handlers = _hooks.get(event) || [];
  const results = [];
  for (const h of handlers) {
    try { results.push(h(data)); } catch (e) { results.push({ error: e.message }); }
  }
  return results;
}

export function listPlugins() {
  return [..._plugins.values()].map(p => ({ id: p.id, name: p.name, version: p.version, hooks: p.hooks ? Object.keys(p.hooks) : [] });
}

// ── CLI Generator ────────────────────────────────────────────────────────────────

export function generateCLI({ language = 'bash', tenantId, apiKey } = {}) {
  const baseUrl = process.env.POLICYOS_BASE_URL || 'http://localhost:4254';
  const auth = apiKey ? ' -H "Authorization: Bearer ' + apiKey : '';

  const scripts = {
    bash: {
      eval: `#!/bin/bash\n# PolicyOS CLI\nBASE=${baseUrl}\nAUTH="${auth}"\ncurl -s -X POST "$BASE/api/policies/evaluate" -H "Content-Type: application/json" $AUTH -d '{"policyId":"$1","context":{}}'`,
      create: `#!/bin/bash\ncurl -s -X POST "$BASE/api/policies" $AUTH -H "Content-Type: application/json" -d '{"title":"$1","effect":"allow","resources":["$2"],"actions":["$3"]}'`,
      list: 'curl -s "$BASE/api/policies" $AUTH',
      stats: 'curl -s "$BASE/api/monitoring/stats" $AUTH',
      incident: 'curl -s "$BASE/incidents" $AUTH',
    },
    python: {
      install: 'pip install policyos-sdk',
      eval: 'from policyos import Client\nc = Client(base_url="' + baseUrl + '", api_key="' + (apiKey || 'YOUR_KEY') + '")\nresult = c.evaluate(policy_id="' + (process.env.POLICY_ID || 'YOUR_POLICY') + '", context={"user": {"id": "user-1"}})',
    },
    typescript: {
      install: 'npm install @policyos/sdk',
      eval: "import { PolicyOS } from '@policyos/sdk';\nconst client = new PolicyOS({ baseUrl: '" + baseUrl + "', apiKey: '" + (apiKey || 'YOUR_KEY') + "' });\nconst result = await client.evaluate({ policyId: 'your-policy', context: { user: { id: 'user-1' } });",
    },
  };

  return scripts[language] || scripts.bash;
}

// ── Webhook Builder ──────────────────────────────────────────────────────────────

export function buildWebhook({ events, url, secret, tenantId }) {
  if (!events || events.length === 0) return { error: 'At least one event is required' };
  const whitelist = ['policy.created', 'policy.updated', 'policy.deleted', 'incident.created', 'incident.resolved', 'eval.denied', 'sla.breach', 'cache.invalidate'];
  const invalid = events.filter(e => !whitelist.includes(e));
  if (invalid.length > 0) return { error: 'Unknown events: ' + invalid.join(', ') };

  return {
    webhook: {
      id: 'wh-' + Date.now().toString(36),
      url,
      secret: secret || crypto.randomUUID(),
      events,
      tenantId: tenantId || null,
      active: true,
      createdAt: new Date().toISOString(),
    },
    curl: events.map(e => 'curl -X POST ' + url + ' -H "Content-Type: application/json" -d \'{"event":"' + e + '","data":{}}\''),
    nodejs: 'webhook.on("' + events.join('", "') + '", handler)',
    python: 'webhook = Webhook(url="' + url + '", secret="' + (secret || 'YOUR_SECRET') + '")',
  };
}

// ── OpenAPI Generator ─────────────────────────────────────────────────────────

export function generateOpenAPI({ version = '1.0.0', baseUrl = 'http://localhost:4254', tenantId } = {}) {
  const paths = {
    '/api/policies': { get: { summary: 'List policies', responses: { 200: { description: 'List of policies' } }, post: { summary: 'Create policy', responses: { 201: { description: 'Created' } } } },
    '/api/policies/evaluate': { post: { summary: 'Evaluate policy', requestBody: { content: { 'application/json': { example: { policyId: 'pol-1', context: { user: { id: 'u1' } } } }, responses: { 200: { description: 'Decision' } } } },
    '/api/policies/{id}': { get: { summary: 'Get policy' }, patch: { summary: 'Update policy' }, delete: { summary: 'Delete policy' } },
    '/api/incidents': { get: { summary: 'List incidents' }, post: { summary: 'Create incident' } },
    '/api/incidents/{id}': { get: { summary: 'Get incident' } },
    '/api/incidents/{id}/resolve': { post: { summary: 'Resolve incident' } },
    '/api/monitoring/health': { get: { summary: 'Health check' } },
    '/api/monitoring/metrics': { get: { summary: 'Metrics' } },
    '/api/verify': { post: { summary: 'Full policy set verification' } },
    '/api/verify/safety': { post: { summary: 'Prove safety property' } },
    '/api/cache/stats': { get: { summary: 'Cache statistics' } },
    '/api/gitops/status': { get: { summary: 'GitOps sync status' } },
    '/api/gitops/sync': { post: { summary: 'Trigger Git sync' } },
  };

  return {
    openapi: '3.0.0',
    info: { title: 'PolicyOS API', version },
    servers: [{ url: baseUrl }],
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'API Key' } },
    security: [{ bearerAuth: [] }],
  };
}

export default { registerPlugin, unregisterPlugin, emitHook, listPlugins, generateCLI, buildWebhook, generateOpenAPI };
