/**
 * PolicyOS — Condition Templates (Phase 2.2)
 *
 * Reusable condition templates that can be instantiated with parameters
 * to generate policy conditions without writing raw condition JSON.
 */

import { v4 as uuidv4 } from 'uuid';

export function registerConditionTemplateRoutes(app, { auditLog, customAuth }) {

  // ── Template store (in-memory, seed data) ────────────────────────────────

  const templates = new Map();

  // Seed standard templates
  function seedTemplates() {
    const seeds = [
      {
        id: 'tpl-high-value-transaction',
        name: 'High Value Transaction',
        description: 'Matches transactions above a monetary threshold',
        parameters: [
          { name: 'threshold', type: 'number', description: 'Minimum amount to match', default: 10000 },
          { name: 'currency', type: 'string', description: 'Currency code', default: 'USD' },
        ],
        template: {
          'context.amount': { gt: { type: 'param', name: 'threshold' } },
          'context.currency': { eq: { type: 'param', name: 'currency' } },
        },
        category: 'financial',
        tags: ['threshold', 'amount', 'transaction'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl-low-trust-user',
        name: 'Low Trust User',
        description: 'Matches users below a trust score threshold',
        parameters: [
          { name: 'minScore', type: 'number', description: 'Minimum trust score', default: 50 },
        ],
        template: {
          'context.user.trustScore': { lt: { type: 'param', name: 'minScore' } },
        },
        category: 'security',
        tags: ['trust', 'risk', 'security'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl-department-restriction',
        name: 'Department Restriction',
        description: 'Restricts access to specific departments',
        parameters: [
          { name: 'allowedDepartments', type: 'array', description: 'List of allowed department names', default: ['IT', 'Finance', 'Operations'] },
        ],
        template: {
          'context.department': { in: { type: 'param', name: 'allowedDepartments' } },
        },
        category: 'access',
        tags: ['department', 'access-control', 'rbac'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl-time-window',
        name: 'Time Window Restriction',
        description: 'Allows actions only within specific business hours',
        parameters: [
          { name: 'startHour', type: 'number', description: 'Start hour (0-23)', default: 9 },
          { name: 'endHour', type: 'number', description: 'End hour (0-23)', default: 18 },
          { name: 'days', type: 'array', description: 'Days of week', default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
        ],
        template: {
          'environment.time.hour': { gte: { type: 'param', name: 'startHour' }, lte: { type: 'param', name: 'endHour' } },
          'environment.time.dayOfWeek': { in: { type: 'param', name: 'days' } },
        },
        category: 'security',
        tags: ['time', 'business-hours', 'access-control'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl-vip-override',
        name: 'VIP Override',
        description: 'Matches VIP users regardless of other conditions',
        parameters: [
          { name: 'vipAttribute', type: 'string', description: 'Path to VIP flag', default: 'context.user.attributes.vip' },
        ],
        template: {
          'context.user.attributes.vip': { eq: true },
        },
        category: 'business',
        tags: ['vip', 'override', 'exception'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tpl-risk-level',
        name: 'Risk Level Check',
        description: 'Matches actions by their inherent risk level',
        parameters: [
          { name: 'maxRisk', type: 'string', description: 'Maximum allowed risk level', default: 'medium', allowedValues: ['low', 'medium', 'high', 'critical'] },
        ],
        template: {
          'action.risk': { in: { type: 'param', name: 'riskLevels' } },
        },
        category: 'security',
        tags: ['risk', 'security', 'risk-level'],
        createdAt: new Date().toISOString(),
      },
    ];

    for (const t of seeds) {
      templates.set(t.id, t);
    }
  }
  seedTemplates();

  // ── Parameter resolver ────────────────────────────────────────────────────

  /** Recursively resolve {type:'param', name:'x'} placeholders in a template. */
  function resolveTemplate(template, params) {
    if (template === null || typeof template !== 'object') return template;
    if (Array.isArray(template)) return template.map((v) => resolveTemplate(v, params));
    if (typeof template === 'object') {
      // Check for {type:'param', name:'x'}
      if (template.type === 'param' && typeof template.name === 'string') {
        return params[template.name] ?? null;
      }
      const result = {};
      for (const [k, v] of Object.entries(template)) {
        result[k] = resolveTemplate(v, params);
      }
      return result;
    }
    return template;
  }

  /** Extract param values from params object and also add derived risk levels. */
  function buildParams(raw) {
    const p = { ...raw };
    // Auto-derive riskLevels from maxRisk if template uses it
    if (raw.maxRisk) {
      const levels = ['low', 'medium', 'high', 'critical'];
      const idx = levels.indexOf(raw.maxRisk);
      if (idx >= 0) p.riskLevels = levels.slice(0, idx + 1);
    }
    return p;
  }

  // ── Endpoints ─────────────────────────────────────────────────────────────

  // POST /api/condition-templates — create a template
  app.post('/api/condition-templates', customAuth, (req, res) => {
    const body = req.body || {};
    if (!body.id || !body.name || !body.template) {
      return res.status(400).json({ error: 'id, name, and template are required' });
    }
    if (templates.has(body.id)) {
      return res.status(409).json({ error: `Template '${body.id}' already exists` });
    }
    const template = {
      id: body.id,
      name: body.name,
      description: body.description || '',
      parameters: Array.isArray(body.parameters) ? body.parameters : [],
      template: body.template,
      category: body.category || 'general',
      tags: Array.isArray(body.tags) ? body.tags : [],
      createdAt: new Date().toISOString(),
    };
    templates.set(template.id, template);
    auditLog({ type: 'condition-template.created', actor: req.auth?.sub || 'unknown', details: { id: body.id, name: body.name } });
    res.status(201).json(template);
  });

  // GET /api/condition-templates — list all templates
  app.get('/api/condition-templates', (req, res) => {
    const { category, tag } = req.query;
    let list = Array.from(templates.values());
    if (category) list = list.filter((t) => t.category === category);
    if (tag) list = list.filter((t) => t.tags?.includes(tag));
    res.json({ count: list.length, templates: list });
  });

  // GET /api/condition-templates/:id — get one template
  app.get('/api/condition-templates/:id', (req, res) => {
    const t = templates.get(req.params.id);
    if (!t) return res.status(404).json({ error: `Template '${req.params.id}' not found` });
    res.json(t);
  });

  // POST /api/condition-templates/:id/instantiate — fill in parameters
  app.post('/api/condition-templates/:id/instantiate', customAuth, (req, res) => {
    const t = templates.get(req.params.id);
    if (!t) return res.status(404).json({ error: `Template '${req.params.id}' not found` });
    const rawParams = req.body || {};

    // Merge defaults with provided params
    const params = {};
    for (const p of t.parameters) {
      params[p.name] = rawParams[p.name] !== undefined ? rawParams[p.name] : p.default;
    }

    const resolved = resolveTemplate(t.template, buildParams(params));

    // Validate required params
    const missing = [];
    for (const p of t.parameters) {
      if (params[p.name] === undefined || params[p.name] === null) {
        missing.push(p.name);
      }
    }

    auditLog({ type: 'condition-template.instantiated', actor: req.auth?.sub || 'unknown', details: { templateId: t.id, params } });
    res.json({
      templateId: t.id,
      name: t.name,
      parameters: params,
      missingParameters: missing,
      condition: resolved,
    });
  });

  // DELETE /api/condition-templates/:id — delete a template
  app.delete('/api/condition-templates/:id', customAuth, (req, res) => {
    if (!templates.has(req.params.id)) {
      return res.status(404).json({ error: `Template '${req.params.id}' not found` });
    }
    templates.delete(req.params.id);
    auditLog({ type: 'condition-template.deleted', actor: req.auth?.sub || 'unknown', details: { id: req.params.id } });
    res.json({ ok: true });
  });
}
